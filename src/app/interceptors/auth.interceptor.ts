import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, finalize, switchMap, tap, throwError } from 'rxjs';
import { LoaderService } from '../services/loader.service';
import { ToastService } from '../services/toast.service';
import { BranchService } from '../services/branch.service';
import { extractErrorMessage } from '../utility/helper/error.helper';

let unauthorizedCount = 0; // Track consecutive 401 responses
const unauthorizedLimit = 3;

const errorMessages: { [key: number]: string } = {
  0: 'Unable to connect to the server. Please check your internet connection.',
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found. Please refresh and try again.',
  409: 'A conflict occurred. The record may have been modified by another user.',
  422: 'The submitted data is invalid. Please check and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'An unexpected server error occurred. Please try again or contact your administrator.',
  503: 'The server is temporarily unavailable. Please try again in a few minutes.',
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const router = inject(Router);
  const loaderService = inject(LoaderService);
  const toastService = inject(ToastService);

  const branchService = inject(BranchService);

  let token = authService.getUserData()?.token; // Retrieve token from service
  const selectedBranch = branchService.selectedBranch();
  const excludedUrls = ['/api/Auth/login', '/api/Auth/refresh-token', 'api/Auth/refresh-token', '/api/Auth/forgot'];
  const excludeLoaderUrl = [
    '/api/Auth/login',
    '/api/Auth/forgot',
    '/api/Auth/refresh-token',
    'api/Auth/refresh-token',
    '/api/GstValidator',
    '/api/ParameterUnitMaster/equivalents',
    '/hubs/',
    '/api/Notification/'
  ];

  const urlLower = req.url.toLowerCase();
  const isDropdownOrLookup = urlLower.includes('dropdown') ||
                             urlLower.includes('distinct-names') ||
                             urlLower.includes('search') ||
                             urlLower.includes('lookup');

  const shouldExcludeAuth = excludedUrls.some(url => req.url.includes(url));
  const shouldExcludeLoader = isDropdownOrLookup || excludeLoaderUrl.some(url => req.url.includes(url));

  const getErrorMessage = (error: HttpErrorResponse): string => {
    if (error.status === 0) {
      return errorMessages[0];
    }
    const fallback = errorMessages[error.status] || 'An unexpected error occurred. Please try again.';
    return extractErrorMessage(error, fallback);
  };

  // Auto-show toast for all API errors (except 401 which triggers logout or if X-Silent-Error is passed)
  const showErrorToast = (error: HttpErrorResponse, message: string, reqObj: any) => {
    if (error.status === 401) return; // handled by logout flow
    if (reqObj.headers.has('X-Silent-Error')) return; // bypassed by component
    toastService.show(message, 'error');
  };

  const handleRequest = (accessToken: any) => {
    const headers: { [name: string]: string } = {
      Authorization: `Bearer ${accessToken}`
    };
    if (selectedBranch) {
      if (selectedBranch.id) {
        headers['X-Branch-ID'] = selectedBranch.id.toString();
      }
      if (selectedBranch.code) {
        headers['X-Branch-Code'] = selectedBranch.code;
      }
    }

    const modifiedReq = req.clone({
      setHeaders: headers
    });

    let reqId: string | null = null;
    if (!shouldExcludeLoader) {
      reqId = loaderService.show();
    }

    return next(modifiedReq).pipe(
      tap(event => {
        if (event.type === HttpEventType.Response) {
          unauthorizedCount = 0;
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          unauthorizedCount++;
          if (unauthorizedCount >= unauthorizedLimit) {
            unauthorizedCount = 0;
            authService.logout();
            router.navigate(['/login']);
          }
        }
        const message = getErrorMessage(error);
        showErrorToast(error, message, modifiedReq);
        if (error.error && typeof error.error === 'object') {
          error.error.message = message;
        }
        const enhancedError = Object.assign(error, { errorMessage: message, message });
        return throwError(() => enhancedError);
      }),
      finalize(() => {
        if (reqId) {
          loaderService.hide(reqId);
        }
      })
    );
  };

  // If the token is expiring soon, refresh it before making the request
  if (token && !shouldExcludeAuth && authService.isTokenExpiringSoon()) {
    return authService.refreshToken(token).pipe(
      tap((response: any) => {
        if (response && response.token) {
          authService.saveUserData(response);
          token = response.token;
        } else {
          alert('Token refresh failed. Please log in again.');
          authService.logout();
          router.navigate(['/login']);
        }
      }),
      switchMap(() => handleRequest(token!)),
      catchError((error: HttpErrorResponse) => {
        const message = getErrorMessage(error);
        showErrorToast(error, message, req);
        if (error.error && typeof error.error === 'object') {
          error.error.message = message;
        }
        const enhancedError = Object.assign(error, { errorMessage: message, message });
        return throwError(() => enhancedError);
      })
    );
  }

  // Token exists and not expiring — handleRequest manages loader internally
  if (token && !shouldExcludeAuth) {
    return handleRequest(token);
  }

  // No token or excluded — show loader for non-excluded URLs
  let reqId: string | null = null;
  if (!shouldExcludeLoader) {
    reqId = loaderService.show();
  }

  const outgoingReq = selectedBranch?.code ? req.clone({ setHeaders: { 'X-Branch-Code': selectedBranch.code, 'X-Branch-ID': selectedBranch.id.toString() } }) : req;

  return next(outgoingReq).pipe(
    tap(event => {
      if (event.type === HttpEventType.Response) {
        unauthorizedCount = 0;
      }
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        unauthorizedCount++;
        if (unauthorizedCount >= unauthorizedLimit) {
          unauthorizedCount = 0;
          authService.logout();
          router.navigate(['/login']);
        }
      }
      const message = getErrorMessage(error);
      showErrorToast(error, message, outgoingReq);
      if (error.error && typeof error.error === 'object') {
        error.error.message = message;
      }
      const enhancedError = Object.assign(error, { errorMessage: message, message });
      return throwError(() => enhancedError);
    }),
    finalize(() => {
      if (reqId) {
        loaderService.hide(reqId);
      }
    })
  );
};
