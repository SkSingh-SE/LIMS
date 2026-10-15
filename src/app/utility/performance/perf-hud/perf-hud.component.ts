import { Component, inject, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { PerfTraceService } from '../perf-trace.service';
import { PerfEventTransaction, PerfApiMetric, PerfSummaryStats } from '../perf-models';

@Component({
  selector: 'app-perf-hud',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './perf-hud.component.html',
  styleUrl: './perf-hud.component.css'
})
export class PerfHudComponent {
  public perfService = inject(PerfTraceService);

  public isExpanded = signal<boolean>(false);
  public isDocked = signal<boolean>(true);
  private wasDockedOnOpen = true;
  public activeTab = signal<'traces' | 'duplicates' | 'slow' | 'settings'>('traces');
  public selectedTx = signal<PerfEventTransaction | null>(null);
  public searchTerm = signal<string>('');
  public expandedApiId = signal<string | null>(null);
  public copiedId = signal<string | null>(null);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if (
      (event.altKey && event.key.toLowerCase() === 'p') ||
      (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p')
    ) {
      event.preventDefault();
      this.toggleExpand();
    }
  }

  // Draggable State Management
  public isPillDragging = false;
  public pillPosition = { x: 0, y: 0 };
  public drawerPosition = { x: 0, y: 0 };

  // Computed properties
  public config = this.perfService.config;
  public transactions = this.perfService.transactions;
  public isVisible = this.perfService.isHudVisible;

  public latestTransaction = computed(() => {
    const list = this.transactions();
    return list.length > 0 ? list[0] : null;
  });

  public stats = computed<PerfSummaryStats>(() => {
    return this.perfService.getStats();
  });

  public allDuplicates = computed<PerfApiMetric[]>(() => {
    return this.transactions().flatMap(t => t.duplicates);
  });

  public allSlowApis = computed<PerfApiMetric[]>(() => {
    return this.transactions().flatMap(t => t.slowApis);
  });

  public filteredApis = computed<PerfApiMetric[]>(() => {
    const tx = this.selectedTx();
    if (!tx) return [];
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return tx.apis;
    return tx.apis.filter(a =>
      a.cleanUrl.toLowerCase().includes(term) ||
      a.method.toLowerCase().includes(term) ||
      a.url.toLowerCase().includes(term)
    );
  });

  public toggleApiDetails(apiId: string): void {
    this.expandedApiId.set(this.expandedApiId() === apiId ? null : apiId);
  }

  public copyText(text?: string, id?: string): void {
    if (!text || !id) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedId.set(id);
      setTimeout(() => {
        if (this.copiedId() === id) this.copiedId.set(null);
      }, 1800);
    });
  }

  public clearSearch(): void {
    this.searchTerm.set('');
  }

  public selectTransaction(tx: PerfEventTransaction): void {
    this.selectedTx.set(tx);
    this.expandedApiId.set(null);
  }

  public toggleExpand(): void {
    const next = !this.isExpanded();
    this.isExpanded.set(next);
    if (next) {
      this.wasDockedOnOpen = this.isDocked();
      this.isDocked.set(false);
      if (!this.selectedTx() && this.transactions().length > 0) {
        this.selectedTx.set(this.transactions()[0]);
      }
    } else {
      // Return to previous state: docked arrow if it was docked before, else pill
      this.isDocked.set(this.wasDockedOnOpen);
    }
  }

  public showPill(): void {
    this.isDocked.set(false);
  }

  public hideToDock(): void {
    this.isDocked.set(true);
  }

  public closeExpand(): void {
    this.isExpanded.set(false);
    this.isDocked.set(this.wasDockedOnOpen);
  }

  public setTab(tab: 'traces' | 'duplicates' | 'slow' | 'settings'): void {
    this.activeTab.set(tab);
  }

  public clearData(): void {
    this.perfService.clear();
    this.selectedTx.set(null);
  }

  public exportCsv(): void {
    this.perfService.exportCsv();
  }

  public exportJson(): void {
    this.perfService.exportJson();
  }

  public toggleConsoleLog(): void {
    this.perfService.toggleConsole();
  }

  public getDurationBadgeClass(duration?: number): string {
    if (!duration) return 'perf-badge-default';
    if (duration < 300) return 'perf-badge-fast';
    if (duration < 800) return 'perf-badge-moderate';
    return 'perf-badge-slow';
  }

  public getMethodBadgeClass(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET': return 'perf-method-get';
      case 'POST': return 'perf-method-post';
      case 'PUT': return 'perf-method-put';
      case 'DELETE': return 'perf-method-delete';
      default: return 'perf-method-default';
    }
  }

  public onPillDragStart(): void {
    this.isPillDragging = true;
  }

  public onPillDragEnd(event: CdkDragEnd): void {
    const offset = event.source.getFreeDragPosition();
    this.pillPosition = { x: offset.x, y: offset.y };
    setTimeout(() => {
      this.isPillDragging = false;
    }, 100);
  }

  public onPillClick(): void {
    if (this.isPillDragging) {
      this.isPillDragging = false;
      return;
    }
    this.toggleExpand();
  }

  public onDrawerDragEnd(event: CdkDragEnd): void {
    const offset = event.source.getFreeDragPosition();
    this.drawerPosition = { x: offset.x, y: offset.y };
  }

  public resetPosition(): void {
    this.pillPosition = { x: 0, y: 0 };
    this.drawerPosition = { x: 0, y: 0 };
  }

  public formatMs(ms?: number): string {
    if (ms === undefined || ms === null) return '0 ms';
    return `${ms.toFixed(1)} ms`;
  }
}
