import { Injectable, inject, signal, effect } from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import {
  PerfApiMetric,
  PerfEventTransaction,
  PerfSummaryStats,
  PerfConfig,
  PerfStatus
} from './perf-models';

const DEFAULT_CONFIG: PerfConfig = {
  enabled: true,
  logToConsole: true,
  showFloatingHud: true,
  slowApiThresholdMs: 500,
  stuckApiThresholdMs: 2500,
  duplicateWindowMs: 3000,
  maxStoredTransactions: 50
};

@Injectable({
  providedIn: 'root'
})
export class PerfTraceService {
  private router = inject(Router);

  // Configuration Signal
  public config = signal<PerfConfig>(this.loadConfig());

  // State Signals
  public activeTransaction = signal<PerfEventTransaction | null>(null);
  public transactions = signal<PerfEventTransaction[]>([]);
  public isHudOpen = signal<boolean>(false);
  public isHudVisible = signal<boolean>(true);
  public selectedTransaction = signal<PerfEventTransaction | null>(null);

  // Tracking internals
  private pendingApis = new Map<string, PerfApiMetric>();
  private recentApiCache: { key: string; time: number; metric: PerfApiMetric }[] = [];
  private transactionCounter = 1;
  private apiCounter = 1;
  private eventDebounceTimer: any = null;
  private stuckCheckInterval: any = null;

  constructor() {
    this.initGlobalListeners();
    this.initRouterListener();
    this.initStuckApiMonitor();
    this.exposeGlobalConsoleHelper();
  }

  // ==========================================
  // 1. GLOBAL INTERACTION & ROUTER LISTENERS
  // ==========================================

  private initGlobalListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Capture User Clicks
    document.addEventListener('click', (event: MouseEvent) => {
      if (!this.config().enabled) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks inside the Perf HUD itself
      if (target.closest('.lims-perf-hud-container')) return;

      // Find meaningful interactive element
      const interactiveEl = target.closest(
        'button, a, input[type="button"], input[type="submit"], [role="button"], .nav-link, .nav-item, .dropdown-item, .page-link, .btn, .mat-tab-label, .tab-btn'
      ) as HTMLElement | null;

      if (interactiveEl) {
        const actionLabel = this.deriveElementLabel(interactiveEl);
        this.startTransaction(`Click: [${actionLabel}]`, 'click', actionLabel);
      }
    }, true);
  }

  private initRouterListener(): void {
    this.router.events.subscribe(event => {
      if (!this.config().enabled) return;

      if (event instanceof NavigationStart) {
        this.startTransaction(`Route: ${event.url}`, 'route', event.url);
      }
    });
  }

  private initStuckApiMonitor(): void {
    if (typeof window === 'undefined') return;

    // Check every 1s for stuck requests
    this.stuckCheckInterval = setInterval(() => {
      if (!this.config().enabled || this.pendingApis.size === 0) return;

      const now = performance.now();
      const threshold = this.config().stuckApiThresholdMs;

      this.pendingApis.forEach(api => {
        if (!api.isStuck && (now - api.startTime) > threshold) {
          api.isStuck = true;
          api.status = 0;
          api.statusText = 'Pending (Likely Stuck / Slow)';

          if (this.config().logToConsole) {
            console.warn(
              `%c⏳ [LIMS Perf] STUCK / SLOW API WARNING: ${api.method} ${api.cleanUrl} has been running for > ${(now - api.startTime).toFixed(0)}ms!`,
              'color: #ef4444; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px;'
            );
          }

          // Trigger UI update
          this.notifyActiveTransactionChange();
        }
      });
    }, 1000);
  }

  // ==========================================
  // 2. TRANSACTION LIFECYCLE MANAGEMENT
  // ==========================================

  public startTransaction(
    name: string,
    triggerType: 'click' | 'route' | 'input' | 'programmatic' = 'programmatic',
    targetElement?: string
  ): PerfEventTransaction {
    // If previous transaction has no pending APIs, close it out
    const current = this.activeTransaction();
    if (current && current.apis.length === 0 && !current.totalDuration) {
      this.finishTransaction(current);
    }

    const transaction: PerfEventTransaction = {
      id: `TX-${this.transactionCounter++}`,
      name,
      triggerType,
      targetElement,
      startTime: performance.now(),
      apis: [],
      duplicates: [],
      slowApis: [],
      stuckApis: [],
      recommendations: [],
      status: 'fast',
      timestamp: new Date()
    };

    this.activeTransaction.set(transaction);
    return transaction;
  }

  // ==========================================
  // 3. HTTP REQUEST & RESPONSE INTERCEPTION
  // ==========================================

  public onRequestStart(method: string, url: string): string {
    const cleanUrl = url.split('?')[0];
    const apiId = `API-${this.apiCounter++}`;
    const startTime = performance.now();

    let tx = this.activeTransaction();
    if (!tx) {
      tx = this.startTransaction(`Auto: ${method} ${cleanUrl.split('/').pop() || 'Request'}`, 'programmatic');
    }

    // Duplicate Detection
    const duplicateKey = `${method.toUpperCase()}:${url.toLowerCase()}`;
    const duplicateWindow = this.config().duplicateWindowMs;
    const now = Date.now();

    // Clean old cache entries
    this.recentApiCache = this.recentApiCache.filter(item => (now - item.time) < duplicateWindow);

    const matchIndex = this.recentApiCache.findIndex(item => item.key === duplicateKey);
    let isDuplicate = false;
    let duplicateCount = 1;

    if (matchIndex >= 0) {
      isDuplicate = true;
      duplicateCount = this.recentApiCache[matchIndex].metric.duplicateCount + 1;
      this.recentApiCache[matchIndex].metric.duplicateCount = duplicateCount;
      this.recentApiCache[matchIndex].time = now;
    }

    const metric: PerfApiMetric = {
      id: apiId,
      traceId: tx.id,
      url,
      cleanUrl,
      method: method.toUpperCase(),
      status: 0,
      startTime,
      isDuplicate,
      duplicateCount,
      isStuck: false,
      isSlow: false,
      timestamp: new Date()
    };

    if (!isDuplicate) {
      this.recentApiCache.push({ key: duplicateKey, time: now, metric });
    }

    this.pendingApis.set(apiId, metric);
    tx.apis.push(metric);

    if (isDuplicate) {
      tx.duplicates.push(metric);
    }

    this.notifyActiveTransactionChange();
    return apiId;
  }

  public onRequestEnd(
    apiId: string,
    status: number,
    statusText: string,
    responseSize?: number,
    errorMessage?: string
  ): void {
    const metric = this.pendingApis.get(apiId);
    if (!metric) return;

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.status = status;
    metric.statusText = statusText;
    metric.responseSize = responseSize;
    metric.errorMessage = errorMessage;
    metric.isStuck = false;

    // Check if Slow
    if (metric.duration > this.config().slowApiThresholdMs) {
      metric.isSlow = true;
    }

    this.pendingApis.delete(apiId);

    const tx = this.activeTransaction();
    if (tx) {
      if (metric.isSlow && !tx.slowApis.some(a => a.id === metric.id)) {
        tx.slowApis.push(metric);
      }

      // If all pending APIs for this transaction have completed, trigger Render measurement
      if (this.pendingApis.size === 0) {
        tx.apiEndTime = endTime;
        this.scheduleRenderMeasurement(tx);
      } else {
        this.notifyActiveTransactionChange();
      }
    }
  }

  // ==========================================
  // 4. POST-API BROWSER RENDER MEASUREMENT
  // ==========================================

  private scheduleRenderMeasurement(tx: PerfEventTransaction): void {
    if (this.eventDebounceTimer) {
      clearTimeout(this.eventDebounceTimer);
    }

    // Wait for Angular change detection and browser layout/paint cycle
    this.eventDebounceTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const renderEndTime = performance.now();
          tx.renderEndTime = renderEndTime;

          const apiStart = Math.min(...tx.apis.map(a => a.startTime), tx.startTime);
          const apiEnd = tx.apiEndTime || renderEndTime;

          tx.apiDuration = tx.apis.length > 0 ? (apiEnd - apiStart) : 0;
          tx.renderDuration = Math.max(0, renderEndTime - apiEnd);
          tx.totalDuration = renderEndTime - tx.startTime;

          // Count DOM elements rendered on page
          if (typeof document !== 'undefined') {
            tx.domNodeCount = document.querySelectorAll('*').length;
          }

          // Gap Analysis & Recommendations
          this.analyzeGapsAndFormulateRecommendations(tx);

          // Evaluate Status
          if (tx.stuckApis.length > 0) {
            tx.status = 'stuck';
          } else if (tx.totalDuration > 1000 || tx.slowApis.length > 0) {
            tx.status = 'slow';
          } else if (tx.totalDuration > 400 || tx.duplicates.length > 0) {
            tx.status = 'moderate';
          } else {
            tx.status = 'fast';
          }

          this.finishTransaction(tx);
        }, 0);
      });
    }, 100);
  }

  private finishTransaction(tx: PerfEventTransaction): void {
    // Add to transaction history
    const max = this.config().maxStoredTransactions;
    const currentList = this.transactions();
    const updated = [tx, ...currentList.slice(0, max - 1)];
    this.transactions.set(updated);

    // Auto-select latest
    if (!this.selectedTransaction()) {
      this.selectedTransaction.set(tx);
    }

    // Log to console if enabled
    if (this.config().logToConsole && tx.apis.length > 0) {
      this.logTransactionToConsole(tx);
    }

    this.activeTransaction.set(null);
  }

  // ==========================================
  // 5. GAP ANALYSIS & RECOMMENDATIONS ENGINE
  // ==========================================

  private analyzeGapsAndFormulateRecommendations(tx: PerfEventTransaction): void {
    tx.recommendations = [];

    // 1. Duplicate API calls
    if (tx.duplicates.length > 0) {
      const dupMap = new Map<string, number>();
      tx.duplicates.forEach(d => {
        dupMap.set(d.cleanUrl, (dupMap.get(d.cleanUrl) || 1) + 1);
      });

      dupMap.forEach((count, url) => {
        tx.recommendations.push(
          `🔁 Duplicate API: "${url}" was called ${count} times in parallel. Apply caching or RxJS shareReplay(1) to save ~${((count - 1) * 150).toFixed(0)}ms.`
        );
      });
    }

    // 2. Slow API queries (>500ms)
    if (tx.slowApis.length > 0) {
      tx.slowApis.forEach(s => {
        tx.recommendations.push(
          `⏳ Slow API: "${s.method} ${s.cleanUrl}" took ${s.duration?.toFixed(0)}ms. Check EF Core LINQ query, missing SQL indexes, or use AsNoTracking().`
        );
      });
    }

    // 3. Render Lag (>150ms)
    if (tx.renderDuration && tx.renderDuration > 150) {
      tx.recommendations.push(
        `🖥️ DOM Render Lag: Rendering took ${tx.renderDuration.toFixed(0)}ms for ${tx.domNodeCount || 0} nodes. Consider using trackBy in @for loops, FormArray patch optimizations, or ChangeDetectionStrategy.OnPush.`
      );
    }

    // 4. Waterfall Bottleneck (Serial vs Parallel)
    if (tx.apis.length >= 3) {
      const isSerial = this.checkIfWaterfall(tx.apis);
      if (isSerial) {
        tx.recommendations.push(
          `🌊 Waterfall Detected: ${tx.apis.length} API requests were executed sequentially. Use forkJoin([...]) to fire them concurrently.`
        );
      }
    }
  }

  private checkIfWaterfall(apis: PerfApiMetric[]): boolean {
    if (apis.length < 2) return false;
    let serialCount = 0;
    for (let i = 1; i < apis.length; i++) {
      const prev = apis[i - 1];
      const curr = apis[i];
      if (prev.endTime && curr.startTime >= prev.endTime - 20) {
        serialCount++;
      }
    }
    return serialCount >= (apis.length - 1) * 0.7;
  }

  // ==========================================
  // 6. CONSOLE LOGGING FORMATTER
  // ==========================================

  private logTransactionToConsole(tx: PerfEventTransaction): void {
    const statusIcon = tx.status === 'fast' ? '🟢' : tx.status === 'moderate' ? '🟡' : '🔴';
    const totalMs = tx.totalDuration ? tx.totalDuration.toFixed(1) : '0';
    const apiMs = tx.apiDuration ? tx.apiDuration.toFixed(1) : '0';
    const renderMs = tx.renderDuration ? tx.renderDuration.toFixed(1) : '0';

    console.groupCollapsed(
      `%c⚡ [LIMS Perf] ${statusIcon} ${tx.name} — Total: ${totalMs}ms (APIs: ${tx.apis.length} | Render: ${renderMs}ms)`,
      'color: #da261c; font-weight: bold; font-size: 11px;'
    );

    console.log(
      `%c⏱️ BREAKDOWN: Total: ${totalMs}ms | Network & APIs: ${apiMs}ms | DOM Render & Paint: ${renderMs}ms`,
      'font-weight: bold; color: #1e293b;'
    );

    if (tx.apis.length > 0) {
      console.log('%c🌐 HTTP API TRACE:', 'font-weight: bold; color: #2563eb;');
      console.table(
        tx.apis.map(a => ({
          Method: a.method,
          Endpoint: a.cleanUrl,
          Status: a.status,
          Duration: `${a.duration?.toFixed(1) || 0} ms`,
          Duplicate: a.isDuplicate ? `⚠️ Yes (${a.duplicateCount}x)` : 'No',
          Slow: a.isSlow ? '🔴 Slow' : '🟢 OK'
        }))
      );
    }

    if (tx.recommendations.length > 0) {
      console.log('%c💡 GAP ANALYSIS & RECOMMENDATIONS:', 'font-weight: bold; color: #d97706;');
      tx.recommendations.forEach(r => console.log(`  ${r}`));
    }

    console.groupEnd();
  }

  // ==========================================
  // 7. PUBLIC HELPER & EXPORT METHODS
  // ==========================================

  public getStats(): PerfSummaryStats {
    const list = this.transactions();
    const allApis = list.flatMap(t => t.apis);

    const totalEvents = list.length;
    const totalApis = allApis.length;
    const totalDuplicates = allApis.filter(a => a.isDuplicate).length;
    const totalSlowApis = allApis.filter(a => a.isSlow).length;
    const totalStuckApis = allApis.filter(a => a.isStuck).length;

    const avgApiDuration = totalApis > 0
      ? allApis.reduce((sum, a) => sum + (a.duration || 0), 0) / totalApis
      : 0;

    const completedEvents = list.filter(t => t.totalDuration);
    const avgTotalDuration = completedEvents.length > 0
      ? completedEvents.reduce((sum, t) => sum + (t.totalDuration || 0), 0) / completedEvents.length
      : 0;

    const avgRenderDuration = completedEvents.length > 0
      ? completedEvents.reduce((sum, t) => sum + (t.renderDuration || 0), 0) / completedEvents.length
      : 0;

    let slowestEndpoint: { url: string; duration: number } | undefined;
    if (allApis.length > 0) {
      const sorted = [...allApis].sort((a, b) => (b.duration || 0) - (a.duration || 0));
      slowestEndpoint = { url: sorted[0].cleanUrl, duration: sorted[0].duration || 0 };
    }

    return {
      totalEvents,
      totalApis,
      totalDuplicates,
      totalSlowApis,
      totalStuckApis,
      avgApiDuration,
      avgRenderDuration,
      avgTotalDuration,
      slowestEndpoint
    };
  }

  public exportCsv(): void {
    const allApis = this.transactions().flatMap(t =>
      t.apis.map(a => ({
        Event: t.name,
        EventTotalMs: t.totalDuration?.toFixed(1) || '',
        RenderMs: t.renderDuration?.toFixed(1) || '',
        Method: a.method,
        Endpoint: a.url,
        Status: a.status,
        DurationMs: a.duration?.toFixed(1) || '',
        IsDuplicate: a.isDuplicate ? 'Yes' : 'No',
        IsSlow: a.isSlow ? 'Yes' : 'No',
        Timestamp: a.timestamp.toISOString()
      }))
    );

    if (allApis.length === 0) {
      alert('No performance metrics recorded yet.');
      return;
    }

    const headers = Object.keys(allApis[0]).join(',');
    const rows = allApis.map(row => Object.values(row).map(v => `"${v}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lims_perf_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public exportJson(): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.transactions(), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lims_perf_trace_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  public clear(): void {
    this.transactions.set([]);
    this.selectedTransaction.set(null);
    this.pendingApis.clear();
    this.recentApiCache = [];
    console.log('%c[LIMS Perf] Performance history cleared.', 'color: #10b981;');
  }

  public toggleHud(visible?: boolean): void {
    const next = visible !== undefined ? visible : !this.isHudVisible();
    this.isHudVisible.set(next);
  }

  public toggleConsole(enable?: boolean): void {
    const current = this.config();
    const next = enable !== undefined ? enable : !current.logToConsole;
    this.updateConfig({ logToConsole: next });
    console.log(`%c[LIMS Perf] Console logging ${next ? 'ENABLED' : 'DISABLED'}.`, 'color: #3b82f6;');
  }

  public updateConfig(partial: Partial<PerfConfig>): void {
    const updated = { ...this.config(), ...partial };
    this.config.set(updated);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lims_perf_config', JSON.stringify(updated));
    }
  }

  private loadConfig(): PerfConfig {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('lims_perf_config');
      if (saved) {
        try { return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }; } catch (_) {}
      }
    }
    return DEFAULT_CONFIG;
  }

  private deriveElementLabel(el: HTMLElement): string {
    const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    if (text && text.length < 35) return text;
    const title = el.getAttribute('title') || el.getAttribute('aria-label');
    if (title) return title;
    const id = el.id;
    if (id) return `#${id}`;
    return el.tagName.toLowerCase();
  }

  private notifyActiveTransactionChange(): void {
    const tx = this.activeTransaction();
    if (tx) {
      this.activeTransaction.set({ ...tx });
    }
  }

  private exposeGlobalConsoleHelper(): void {
    if (typeof window === 'undefined') return;

    (window as any).limsPerf = {
      summary: () => {
        const stats = this.getStats();
        console.group('%c⚡ LIMS Performance Summary', 'color: #da261c; font-size: 13px; font-weight: bold;');
        console.table([
          { Metric: 'Total User Events', Value: stats.totalEvents },
          { Metric: 'Total API Requests', Value: stats.totalApis },
          { Metric: 'Duplicate API Calls', Value: stats.totalDuplicates },
          { Metric: 'Slow APIs (>500ms)', Value: stats.totalSlowApis },
          { Metric: 'Stuck APIs', Value: stats.totalStuckApis },
          { Metric: 'Avg API Duration', Value: `${stats.avgApiDuration.toFixed(1)} ms` },
          { Metric: 'Avg DOM Render Time', Value: `${stats.avgRenderDuration.toFixed(1)} ms` },
          { Metric: 'Avg Total Time to Interactive', Value: `${stats.avgTotalDuration.toFixed(1)} ms` },
          { Metric: 'Slowest Endpoint', Value: stats.slowestEndpoint ? `${stats.slowestEndpoint.url} (${stats.slowestEndpoint.duration.toFixed(0)}ms)` : 'N/A' }
        ]);
        console.groupEnd();
        return stats;
      },
      getDuplicates: () => {
        const dups = this.transactions().flatMap(t => t.duplicates);
        console.table(dups.map(d => ({ URL: d.url, Count: d.duplicateCount, Trace: d.traceId })));
        return dups;
      },
      getSlowApis: () => {
        const slow = this.transactions().flatMap(t => t.slowApis);
        console.table(slow.map(s => ({ Method: s.method, URL: s.cleanUrl, Duration: `${s.duration?.toFixed(0)} ms` })));
        return slow;
      },
      exportCsv: () => this.exportCsv(),
      exportJson: () => this.exportJson(),
      clear: () => this.clear(),
      toggleConsole: (val?: boolean) => this.toggleConsole(val),
      toggleHud: (val?: boolean) => this.toggleHud(val)
    };
  }
}
