import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ApiTrace {
  id: string;
  method: string;
  url: string;
  cleanUrl: string;
  status: number;
  statusText: string;
  startTime: number;
  responseReceivedTime?: number;
  renderCompletedTime?: number;
  networkDurationMs?: number;
  renderDurationMs?: number;
  totalDurationMs?: number;
  isCompleted: boolean;
  isCancelled?: boolean;
  isDuplicate: boolean;
  duplicateType?: 'in-flight' | 'rapid';
  duplicateCount: number;
  callerStack?: string;
  requestBodySummary?: string;
  timestamp: Date;
  isSlowNet: boolean;
  isSlowRender: boolean;
}

export type TraceFilter = 'all' | 'duplicates' | 'slow' | 'errors';

@Injectable({
  providedIn: 'root'
})
export class ApiProfilerService {
  private ngZone = inject(NgZone);

  // Active in-flight requests map: fingerprint => metadata
  private inFlightRequests = new Map<string, { id: string; startTime: number; count: number; stack: string }>();

  // Recent requests cache for detecting rapid burst duplicates (< 1500ms)
  private recentRequests = new Map<string, { timestamp: number; count: number }>();

  // Reactive traces stream (keeps last 100 traces)
  private tracesSubject = new BehaviorSubject<ApiTrace[]>([]);
  public traces$ = this.tracesSubject.asObservable();

  // Active in-flight count
  private activeCountSubject = new BehaviorSubject<number>(0);
  public activeCount$ = this.activeCountSubject.asObservable();

  // Total duplicates counter
  private duplicateCountSubject = new BehaviorSubject<number>(0);
  public duplicateCount$ = this.duplicateCountSubject.asObservable();

  // Banner expanded state (hidden/collapsed by default)
  private isExpandedSubject = new BehaviorSubject<boolean>(false);
  public isExpanded$ = this.isExpandedSubject.asObservable();

  // Thresholds
  public static readonly SLOW_NETWORK_THRESHOLD_MS = 600;
  public static readonly SLOW_RENDER_THRESHOLD_MS = 100;
  public static readonly MAX_TRACES_HISTORY = 100;
  public static readonly RAPID_DUPLICATE_WINDOW_MS = 1500;

  /**
   * Called by interceptor when an HTTP request initiates
   */
  startRequest(
    id: string,
    method: string,
    url: string,
    body?: any
  ): { isDuplicate: boolean; duplicateType?: 'in-flight' | 'rapid'; duplicateCount: number; callerStack?: string } {
    const cleanUrl = this.extractCleanUrl(url);
    const fingerprint = this.createFingerprint(method, url, body);
    const stack = this.captureCallerStack();

    let isDuplicate = false;
    let duplicateType: 'in-flight' | 'rapid' | undefined;
    let duplicateCount = 1;

    // Check 1: In-Flight Duplicate (Parallel simultaneous calls)
    const inFlight = this.inFlightRequests.get(fingerprint);
    if (inFlight) {
      inFlight.count++;
      isDuplicate = true;
      duplicateType = 'in-flight';
      duplicateCount = inFlight.count;
      this.duplicateCountSubject.next(this.duplicateCountSubject.value + 1);
    } else {
      // Check 2: Rapid Burst Duplicate (Repeated sequential call within 1.5s)
      const now = Date.now();
      const recent = this.recentRequests.get(fingerprint);
      if (recent && (now - recent.timestamp) < ApiProfilerService.RAPID_DUPLICATE_WINDOW_MS) {
        recent.count++;
        recent.timestamp = now;
        isDuplicate = true;
        duplicateType = 'rapid';
        duplicateCount = recent.count;
        this.duplicateCountSubject.next(this.duplicateCountSubject.value + 1);
      }

      this.inFlightRequests.set(fingerprint, {
        id,
        startTime: performance.now(),
        count: 1,
        stack
      });
    }

    this.activeCountSubject.next(this.inFlightRequests.size);

    const bodySummary = this.summarizeBody(body);

    const newTrace: ApiTrace = {
      id,
      method: method.toUpperCase(),
      url,
      cleanUrl,
      status: 0,
      statusText: 'Pending...',
      startTime: performance.now(),
      isCompleted: false,
      isCancelled: false,
      isDuplicate,
      duplicateType,
      duplicateCount,
      callerStack: inFlight?.stack || stack,
      requestBodySummary: bodySummary,
      timestamp: new Date(),
      isSlowNet: false,
      isSlowRender: false
    };

    const currentTraces = this.tracesSubject.value;
    const updated = [newTrace, ...currentTraces].slice(0, ApiProfilerService.MAX_TRACES_HISTORY);
    this.tracesSubject.next(updated);

    return { isDuplicate, duplicateType, duplicateCount, callerStack: stack };
  }

  /**
   * Called by interceptor when response arrives
   */
  recordResponse(
    id: string,
    method: string,
    url: string,
    status: number,
    statusText: string,
    startTime: number,
    body?: any,
    isDuplicate = false,
    duplicateCount = 1,
    callerStack?: string
  ): void {
    const responseReceivedTime = performance.now();
    const networkDurationMs = Math.round(responseReceivedTime - startTime);
    const fingerprint = this.createFingerprint(method, url, body);

    this.inFlightRequests.delete(fingerprint);
    this.activeCountSubject.next(this.inFlightRequests.size);

    // Track in recent requests for rapid duplicate detection
    this.cleanExpiredRecentRequests();
    const recent = this.recentRequests.get(fingerprint);
    this.recentRequests.set(fingerprint, {
      timestamp: Date.now(),
      count: recent ? recent.count + 1 : 1
    });

    // Performance marks for DevTools Timeline
    const markBase = `API: ${method.toUpperCase()} ${this.extractCleanUrl(url)}`;
    if (typeof performance.mark === 'function') {
      try {
        performance.mark(`${markBase}-start`, { startTime });
        performance.mark(`${markBase}-response`, { startTime: responseReceivedTime });
        performance.measure(`${markBase} [Net]`, `${markBase}-start`, `${markBase}-response`);
      } catch {
        // Fallback for older browsers
      }
    }

    // Step 2: Measure Component Processing & DOM Render Time
    // Zone.js triggers change detection; requestAnimationFrame + setTimeout ensures DOM painting
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const renderCompletedTime = performance.now();
          const renderDurationMs = Math.round(renderCompletedTime - responseReceivedTime);
          const totalDurationMs = Math.round(renderCompletedTime - startTime);

          if (typeof performance.mark === 'function') {
            try {
              performance.mark(`${markBase}-rendered`, { startTime: renderCompletedTime });
              performance.measure(`${markBase} [UI Render]`, `${markBase}-response`, `${markBase}-rendered`);
              performance.measure(`${markBase} [Total E2E]`, `${markBase}-start`, `${markBase}-rendered`);
            } catch {
              // Ignore
            }
          }

          // Update trace in reactive subject
          this.ngZone.run(() => {
            const traces = this.tracesSubject.value.map(t => {
              if (t.id === id) {
                return {
                  ...t,
                  status,
                  statusText: statusText || (status >= 200 && status < 300 ? 'OK' : 'Failed'),
                  responseReceivedTime,
                  renderCompletedTime,
                  networkDurationMs,
                  renderDurationMs,
                  totalDurationMs,
                  isCompleted: true,
                  isSlowNet: networkDurationMs > ApiProfilerService.SLOW_NETWORK_THRESHOLD_MS,
                  isSlowRender: renderDurationMs > ApiProfilerService.SLOW_RENDER_THRESHOLD_MS
                };
              }
              return t;
            });
            this.tracesSubject.next(traces);
          });
        }, 0);
      });
    });
  }

  /**
   * Called by interceptor finalize() when a request was aborted/cancelled before response
   */
  recordCancellation(id: string, method: string, url: string, startTime: number, body?: any): void {
    const fingerprint = this.createFingerprint(method, url, body);
    this.inFlightRequests.delete(fingerprint);
    this.activeCountSubject.next(this.inFlightRequests.size);

    const now = performance.now();
    const duration = Math.round(now - startTime);

    const traces = this.tracesSubject.value.map(t => {
      if (t.id === id && !t.isCompleted) {
        return {
          ...t,
          status: 0,
          statusText: 'Cancelled / Aborted',
          isCompleted: true,
          isCancelled: true,
          networkDurationMs: duration,
          renderDurationMs: 0,
          totalDurationMs: duration
        };
      }
      return t;
    });
    this.tracesSubject.next(traces);
  }

  toggleExpanded(): void {
    this.isExpandedSubject.next(!this.isExpandedSubject.value);
  }

  setExpanded(state: boolean): void {
    this.isExpandedSubject.next(state);
  }

  clearTraces(): void {
    this.tracesSubject.next([]);
    this.duplicateCountSubject.next(0);
    this.recentRequests.clear();
  }

  private cleanExpiredRecentRequests(): void {
    const now = Date.now();
    for (const [key, value] of this.recentRequests.entries()) {
      if ((now - value.timestamp) > ApiProfilerService.RAPID_DUPLICATE_WINDOW_MS) {
        this.recentRequests.delete(key);
      }
    }
  }

  private createFingerprint(method: string, url: string, body?: any): string {
    const cleanUrl = url.split('?')[0].toLowerCase();
    const query = url.includes('?') ? url.split('?')[1] : '';
    let bodySnippet = '';
    if (body) {
      if (typeof body === 'string') {
        bodySnippet = body.slice(0, 120);
      } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
        bodySnippet = '[FormData]';
      } else {
        try {
          bodySnippet = JSON.stringify(body).slice(0, 120);
        } catch {
          bodySnippet = '[ComplexObject]';
        }
      }
    }
    return `${method.toUpperCase()}|${cleanUrl}|${query}|${bodySnippet}`;
  }

  private extractCleanUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname;
    } catch {
      return url.split('?')[0];
    }
  }

  private summarizeBody(body: any): string | undefined {
    if (!body) return undefined;
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      return '[FormData Upload]';
    }
    try {
      const str = typeof body === 'string' ? body : JSON.stringify(body);
      return str.length > 250 ? str.slice(0, 250) + '...' : str;
    } catch {
      return undefined;
    }
  }

  private captureCallerStack(): string {
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    const filtered = lines.filter(l => {
      const lower = l.toLowerCase();
      return (
        !lower.includes('api-profiler') &&
        !lower.includes('profilerservice') &&
        !lower.includes('profilerinterceptor') &&
        !lower.includes('auth.interceptor') &&
        !lower.includes('authinterceptor') &&
        !lower.includes('capturecallerstack') &&
        !lower.includes('startrequest') &&
        !lower.includes('node_modules') &&
        !lower.includes('rxjs') &&
        !lower.includes('zone.js') &&
        !lower.includes('httpclient') &&
        !lower.includes('httpinterceptor') &&
        !lower.includes('interceptinghandler')
      );
    });
    return filtered.slice(0, 4).map(l => l.trim()).join('\n') || 'Origin: Direct HTTP Client Call';
  }
}
