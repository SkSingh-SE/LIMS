import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiProfilerService } from '../services/api-profiler.service';
import { tap, finalize } from 'rxjs';

let reqSeq = 0;

export const profilerInterceptor: HttpInterceptorFn = (req, next) => {
  const urlLower = req.url.toLowerCase();

  // Exclude WebSockets & SignalR heartbeats or static image assets to avoid noise
  if (urlLower.includes('/hubs/') || urlLower.includes('.svg') || urlLower.includes('.png') || urlLower.includes('.jpg')) {
    return next(req);
  }

  const profiler = inject(ApiProfilerService);
  const traceId = `trace_${++reqSeq}_${Date.now()}`;
  const startTime = performance.now();

  const { isDuplicate, duplicateCount, callerStack } = profiler.startRequest(
    traceId,
    req.method,
    req.urlWithParams,
    req.body
  );

  let isHandled = false;

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          isHandled = true;
          profiler.recordResponse(
            traceId,
            req.method,
            req.urlWithParams,
            event.status,
            event.statusText,
            startTime,
            req.body,
            isDuplicate,
            duplicateCount,
            callerStack
          );
        }
      },
      error: (error: HttpErrorResponse) => {
        isHandled = true;
        profiler.recordResponse(
          traceId,
          req.method,
          req.urlWithParams,
          error.status,
          error.statusText || 'Error',
          startTime,
          req.body,
          isDuplicate,
          duplicateCount,
          callerStack
        );
      }
    }),
    finalize(() => {
      // If request was aborted/cancelled by switchMap or component unsubscribe before next/error
      if (!isHandled) {
        profiler.recordCancellation(
          traceId,
          req.method,
          req.urlWithParams,
          startTime,
          req.body
        );
      }
    })
  );
};
