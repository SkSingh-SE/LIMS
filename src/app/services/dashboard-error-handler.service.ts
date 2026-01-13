import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, retry, retryWhen, delayWhen, take, concat } from 'rxjs/operators';
import { ToastService } from './toast.service';

export interface ErrorContext {
  component: string;
  operation: string;
  userMessage?: string;
  technicalDetails?: any;
  retryable?: boolean;
  silent?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  exponentialBackoff: boolean;
  retryCondition?: (error: any) => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardErrorHandlerService {
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    delayMs: 1000,
    exponentialBackoff: true,
    retryCondition: (error) => this.isRetryableError(error)
  };

  constructor(private toastService: ToastService) {}

  /**
   * Handle API errors with comprehensive error processing
   */
  handleApiError<T>(
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>
  ): (source: Observable<T>) => Observable<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    
    return (source: Observable<T>): Observable<T> => {
      return source.pipe(
        retryWhen(errors => 
          errors.pipe(
            take(config.maxRetries),
            delayWhen((error, index) => {
              if (!config.retryCondition!(error)) {
                return throwError(() => error);
              }
              
              const delay = config.exponentialBackoff 
                ? config.delayMs * Math.pow(2, index)
                : config.delayMs;
              
              console.log(`Retrying ${context.operation} (attempt ${index + 1}/${config.maxRetries}) in ${delay}ms`);
              return timer(delay);
            })
          )
        ),
        catchError(error => {
          this.processError(error, context);
          return throwError(() => error);
        })
      );
    };
  }

  /**
   * Handle component-level errors
   */
  handleComponentError(error: any, context: ErrorContext): void {
    this.processError(error, context);
  }

  /**
   * Handle network failures with graceful degradation
   */
  handleNetworkFailure<T>(
    fallbackData?: T,
    context?: ErrorContext
  ): (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>): Observable<T> => {
      return source.pipe(
        catchError(error => {
          if (this.isNetworkError(error)) {
            const errorContext: ErrorContext = {
              component: context?.component || 'Unknown',
              operation: context?.operation || 'Network Operation',
              userMessage: 'Network connection issue detected. Using cached data.',
              technicalDetails: error,
              ...context
            };
            
            this.processError(error, errorContext);
            
            if (fallbackData !== undefined) {
              return of(fallbackData);
            }
          }
          
          return throwError(() => error);
        })
      );
    };
  }

  /**
   * Create error boundary for component operations
   */
  createErrorBoundary<T>(
    operation: () => Observable<T>,
    context: ErrorContext,
    fallbackValue?: T
  ): Observable<T> {
    try {
      return operation().pipe(
        catchError(error => {
          this.processError(error, context);
          
          if (fallbackValue !== undefined) {
            return of(fallbackValue);
          }
          
          return throwError(() => error);
        })
      );
    } catch (error) {
      this.processError(error, context);
      
      if (fallbackValue !== undefined) {
        return of(fallbackValue);
      }
      
      return throwError(() => error);
    }
  }

  /**
   * Process and categorize errors
   */
  private processError(error: any, context: ErrorContext): void {
    const errorInfo = this.categorizeError(error);
    
    // Log technical details
    console.error(`[${context.component}] ${context.operation} failed:`, {
      error: errorInfo,
      context,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly message if not silent
    if (!context.silent) {
      const userMessage = context.userMessage || this.getUserFriendlyMessage(errorInfo);
      this.toastService.show(userMessage, this.getToastType(errorInfo.severity));
    }

    // Report critical errors for monitoring
    if (errorInfo.severity === 'critical') {
      this.reportCriticalError(error, context);
    }
  }

  /**
   * Categorize error types and severity
   */
  private categorizeError(error: any): {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    code?: string | number;
    message: string;
    retryable: boolean;
  } {
    if (error instanceof HttpErrorResponse) {
      return this.categorizeHttpError(error);
    }

    if (error instanceof TypeError) {
      return {
        type: 'TypeError',
        severity: 'medium',
        message: error.message,
        retryable: false
      };
    }

    if (error instanceof ReferenceError) {
      return {
        type: 'ReferenceError',
        severity: 'high',
        message: error.message,
        retryable: false
      };
    }

    if (error?.name === 'ChunkLoadError') {
      return {
        type: 'ChunkLoadError',
        severity: 'medium',
        message: 'Failed to load application resources',
        retryable: true
      };
    }

    // Generic error
    return {
      type: 'UnknownError',
      severity: 'medium',
      message: error?.message || 'An unexpected error occurred',
      retryable: false
    };
  }

  /**
   * Categorize HTTP errors
   */
  private categorizeHttpError(error: HttpErrorResponse): {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    code: number;
    message: string;
    retryable: boolean;
  } {
    const status = error.status;
    
    if (status === 0) {
      return {
        type: 'NetworkError',
        severity: 'high',
        code: status,
        message: 'Network connection failed',
        retryable: true
      };
    }

    if (status >= 400 && status < 500) {
      const severity = status === 401 || status === 403 ? 'high' : 'medium';
      return {
        type: 'ClientError',
        severity,
        code: status,
        message: this.getHttpErrorMessage(status),
        retryable: status === 408 || status === 429 // Request Timeout or Too Many Requests
      };
    }

    if (status >= 500) {
      return {
        type: 'ServerError',
        severity: 'critical',
        code: status,
        message: 'Server error occurred',
        retryable: true
      };
    }

    return {
      type: 'HttpError',
      severity: 'medium',
      code: status,
      message: `HTTP error ${status}`,
      retryable: false
    };
  }

  /**
   * Get user-friendly HTTP error messages
   */
  private getHttpErrorMessage(status: number): string {
    const messages: { [key: number]: string } = {
      400: 'Invalid request data',
      401: 'Authentication required',
      403: 'Access denied',
      404: 'Resource not found',
      408: 'Request timeout',
      409: 'Data conflict occurred',
      422: 'Invalid data provided',
      429: 'Too many requests, please try again later',
      500: 'Internal server error',
      502: 'Service temporarily unavailable',
      503: 'Service unavailable',
      504: 'Request timeout'
    };

    return messages[status] || `HTTP error ${status}`;
  }

  /**
   * Get user-friendly error messages
   */
  private getUserFriendlyMessage(errorInfo: any): string {
    const messages: { [key: string]: string } = {
      'NetworkError': 'Connection problem. Please check your internet connection.',
      'ServerError': 'Server is experiencing issues. Please try again later.',
      'ClientError': 'There was a problem with your request.',
      'TypeError': 'Application error occurred. Please refresh the page.',
      'ChunkLoadError': 'Failed to load application. Please refresh the page.',
      'UnknownError': 'An unexpected error occurred. Please try again.'
    };

    return messages[errorInfo.type] || 'Something went wrong. Please try again.';
  }

  /**
   * Get toast notification type based on error severity
   */
  private getToastType(severity: string): 'error' | 'warning' | 'info' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof HttpErrorResponse) {
      const status = error.status;
      // Retry on network errors, server errors, and specific client errors
      return status === 0 || status >= 500 || status === 408 || status === 429;
    }

    // Retry on chunk load errors
    if (error?.name === 'ChunkLoadError') {
      return true;
    }

    return false;
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: any): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.status === 0;
    }
    
    return error?.name === 'NetworkError' || 
           error?.message?.includes('Network') ||
           error?.message?.includes('fetch');
  }

  /**
   * Report critical errors for monitoring
   */
  private reportCriticalError(error: any, context: ErrorContext): void {
    // In a real application, this would send to error monitoring service
    // like Sentry, LogRocket, or custom logging endpoint
    console.error('CRITICAL ERROR REPORTED:', {
      error,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Could also send to backend logging endpoint
    // this.http.post('/api/errors/report', { error, context }).subscribe();
  }

  /**
   * Create loading state error handler
   */
  handleLoadingStateError(
    setLoading: (loading: boolean) => void,
    setError: (error: string | null) => void
  ) {
    return (error: any) => {
      setLoading(false);
      setError(error?.message || 'Failed to load data');
      return throwError(() => error);
    };
  }

  /**
   * Handle skeleton loading error handler
   */
  handleSkeletonLoadingError<T>(
    fallbackData: T,
    context: ErrorContext
  ): (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>): Observable<T> => {
      return source.pipe(
        catchError(error => {
          this.processError(error, { ...context, silent: true });
          return of(fallbackData);
        })
      );
    };
  }

  /**
   * Validate component inputs and handle validation errors
   */
  validateComponentInputs(inputs: { [key: string]: any }, component: string): void {
    const errors: string[] = [];

    Object.entries(inputs).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        errors.push(`${key} is required`);
      }
    });

    if (errors.length > 0) {
      const context: ErrorContext = {
        component,
        operation: 'Input Validation',
        userMessage: 'Component configuration error',
        technicalDetails: { errors, inputs },
        retryable: false
      };

      this.handleComponentError(new Error(errors.join(', ')), context);
    }
  }
}