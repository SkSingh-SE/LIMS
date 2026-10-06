import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ApiProfilerService, ApiTrace, TraceFilter } from '../../../services/api-profiler.service';
import { map } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';

@Component({
  selector: 'app-api-profiler-banner',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './api-profiler-banner.component.html',
  styleUrl: './api-profiler-banner.component.css'
})
export class ApiProfilerBannerComponent {
  public profiler = inject(ApiProfilerService);

  // Reactive filters
  public selectedFilter$ = new BehaviorSubject<TraceFilter>('all');
  public searchTerm$ = new BehaviorSubject<string>('');

  public expandedTraceId: string | null = null;
  public copiedId: string | null = null;
  private isDragging = false;

  public traces$: Observable<ApiTrace[]> = this.profiler.traces$;
  public isExpanded$: Observable<boolean> = this.profiler.isExpanded$;
  public activeCount$: Observable<number> = this.profiler.activeCount$;
  public duplicateCount$: Observable<number> = this.profiler.duplicateCount$;

  // Fully reactive filtered traces stream
  public filteredTraces$: Observable<ApiTrace[]> = combineLatest([
    this.traces$,
    this.selectedFilter$,
    this.searchTerm$
  ]).pipe(
    map(([traces, filter, search]) => {
      let result = traces;

      // Filter by category
      if (filter === 'duplicates') {
        result = result.filter(t => t.isDuplicate);
      } else if (filter === 'slow') {
        result = result.filter(t => (t.totalDurationMs ?? 0) > 500 || t.isSlowNet || t.isSlowRender);
      } else if (filter === 'errors') {
        result = result.filter(t => t.status >= 400 || (t.isCompleted && t.status === 0));
      }

      // Filter by search term
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        result = result.filter(t =>
          t.url.toLowerCase().includes(query) ||
          t.method.toLowerCase().includes(query) ||
          t.cleanUrl.toLowerCase().includes(query)
        );
      }

      return result;
    })
  );

  // Summary statistics computed from current traces
  public stats$ = this.traces$.pipe(
    map(traces => {
      const completed = traces.filter(t => t.isCompleted && !t.isCancelled);
      const totalCalls = traces.length;
      const duplicates = traces.filter(t => t.isDuplicate).length;
      const errors = traces.filter(t => t.status >= 400).length;

      let avgNet = 0;
      let avgRender = 0;
      let maxTotal = 0;

      if (completed.length > 0) {
        const totalNet = completed.reduce((acc, t) => acc + (t.networkDurationMs || 0), 0);
        const totalRender = completed.reduce((acc, t) => acc + (t.renderDurationMs || 0), 0);
        avgNet = Math.round(totalNet / completed.length);
        avgRender = Math.round(totalRender / completed.length);
        maxTotal = Math.max(...completed.map(t => t.totalDurationMs || 0));
      }

      return {
        totalCalls,
        duplicates,
        errors,
        avgNet,
        avgRender,
        maxTotal
      };
    })
  );

  /**
   * Keyboard shortcut (Alt + P or Ctrl + Shift + P) to toggle profiler anywhere
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if (
      (event.altKey && event.key.toLowerCase() === 'p') ||
      (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p')
    ) {
      event.preventDefault();
      this.toggleBanner();
    }
  }

  onDragStarted(): void {
    this.isDragging = true;
  }

  onDragEnded(): void {
    // Delay resetting isDragging so the release click does not fire toggleBanner
    setTimeout(() => {
      this.isDragging = false;
    }, 120);
  }

  toggleBanner(): void {
    if (this.isDragging) {
      return;
    }
    this.profiler.toggleExpanded();
  }

  closeBanner(): void {
    this.profiler.setExpanded(false);
  }

  clearTraces(): void {
    this.profiler.clearTraces();
    this.expandedTraceId = null;
  }

  setFilter(filter: TraceFilter): void {
    this.selectedFilter$.next(filter);
  }

  onSearchChange(term: string): void {
    this.searchTerm$.next(term);
  }

  clearSearch(): void {
    this.searchTerm$.next('');
  }

  toggleTraceDetails(traceId: string): void {
    this.expandedTraceId = this.expandedTraceId === traceId ? null : traceId;
  }

  copyText(text: string, id: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedId = id;
      setTimeout(() => {
        if (this.copiedId === id) this.copiedId = null;
      }, 1800);
    });
  }

  getMethodClass(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'badge-method-get';
      case 'POST':
        return 'badge-method-post';
      case 'PUT':
        return 'badge-method-put';
      case 'DELETE':
        return 'badge-method-delete';
      default:
        return 'badge-method-other';
    }
  }

  getStatusClass(trace: ApiTrace): string {
    if (trace.isCancelled) return 'badge-status-cancelled';
    if (!trace.isCompleted) return 'badge-status-pending';
    if (trace.status >= 200 && trace.status < 300) return 'badge-status-ok';
    if (trace.status >= 300 && trace.status < 400) return 'badge-status-redirect';
    if (trace.status >= 400 && trace.status < 500) return 'badge-status-warn';
    return 'badge-status-error';
  }

  trackByTraceId(index: number, trace: ApiTrace): string {
    return trace.id;
  }
}
