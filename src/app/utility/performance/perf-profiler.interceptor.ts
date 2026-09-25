import { HttpErrorResponse, HttpEvent, HttpEventType, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { PerfTraceService } from './perf-trace.service';
import { catchError, tap, throwError } from 'rxjs';

export const perfProfilerInterceptor: HttpInterceptorFn = (req, next) => {
  const perfTrace = inject(PerfTraceService);

  // Skip SignalR hubs and external static asset requests
  const urlLower = req.url.toLowerCase();
  if (urlLower.includes('/hubs/') || urlLower.endsWith('.svg') || urlLower.endsWith('.png')) {
    return next(req);
  }

  // Register API start
  const apiId = perfTrace.onRequestStart(req.method, req.urlWithParams);

  return next(req).pipe(
    tap((event: HttpEvent<any>) => {
      if (event instanceof HttpResponse) {
        // Calculate response size approx
        let size = 0;
        const contentLength = event.headers.get('content-length');
        if (contentLength) {
          size = parseInt(contentLength, 10);
        } else if (event.body) {
          try {
            size = JSON.stringify(event.body).length;
          } catch (_) {}
        }

        perfTrace.onRequestEnd(apiId, event.status, event.statusText || 'OK', size);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const errorMsg = typeof error.error === 'string' ? error.error : error.message;
      perfTrace.onRequestEnd(apiId, error.status || 0, error.statusText || 'Error', 0, errorMsg);
      return throwError(() => error);
    })
  );
};
