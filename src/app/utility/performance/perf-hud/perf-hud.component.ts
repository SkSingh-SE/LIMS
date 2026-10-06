import { Component, inject, computed, signal } from '@angular/core';
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
  public activeTab = signal<'traces' | 'duplicates' | 'slow' | 'settings'>('traces');
  public selectedTx = signal<PerfEventTransaction | null>(null);

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

  public selectTransaction(tx: PerfEventTransaction): void {
    this.selectedTx.set(tx);
  }

  public toggleExpand(): void {
    const next = !this.isExpanded();
    this.isExpanded.set(next);
    if (next && !this.selectedTx() && this.transactions().length > 0) {
      this.selectedTx.set(this.transactions()[0]);
    }
  }

  public closeExpand(): void {
    this.isExpanded.set(false);
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
