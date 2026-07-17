import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, finalize, switchMap, tap, throwError } from 'rxjs';
import { LoaderService } from '../services/loader.service';
import { ToastService } from '../services/toast.service';

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

  let token = authService.getUserData()?.token; // Retrieve token from service
  const excludedUrls = ['/api/Auth/login', 'api/Auth/refresh-token', '/api/Auth/forgot'];
  const excludeLoaderUrl = ['/api/Auth/login', '/api/Auth/forgot', '/api/GstValidator', '/api/ParameterUnitMaster/equivalents'];

  const isDropdownCall = req.url.includes('dropdown');
  const shouldExclude = excludedUrls.some(url => req.url.includes(url));

  const getErrorMessage = (error: HttpErrorResponse): string => {
    if (error.status === 0) {
      return errorMessages[0];
    }
    if (error.error) {
      if (typeof error.error === 'string') {
        return error.error;
      }
      // Handle: { message: "..." } or { Message: "..." }
      if (error.error.message) {
        return error.error.message;
      }
      if (error.error.Message) {
        return error.error.Message;
      }
      // Handle: { errors: { field: ["error"] } } (validation errors)
      if (error.error.errors) {
        const errors = error.error.errors;
        const messages = Object.keys(errors).map(key => `${key}: ${errors[key].join(', ')}`);
        return messages.join('; ');
      }
      // Handle: { title: "..." } (ASP.NET problem details)
      if (error.error.title) {
        return error.error.title;
      }
    }
    // Use user-friendly status message (before raw error.message which contains URLs)
    if (errorMessages[error.status]) {
      return errorMessages[error.status];
    }
    return 'An unexpected error occurred. Please try again.';
  };

  // Auto-show toast for all API errors (except 401 which triggers logout)
  const showErrorToast = (error: HttpErrorResponse, message: string) => {
    if (error.status === 401) return; // handled by logout flow
    const type = error.status === 400 ? 'warning' : 'error';
    toastService.show(message, type);
  };

  const handleRequest = (accessToken: any) => {
    const modifiedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` }
    });

    let showedLoader = false;
    if (!isDropdownCall && !excludeLoaderUrl.some(url => req.url.includes(url))) {
      loaderService.show();
      showedLoader = true;
    }

    let responseReceived = false;
    return next(modifiedReq).pipe(
      tap(event => {
        if (event.type === HttpEventType.Response) {
          responseReceived = true;
          unauthorizedCount = 0;
          console.log(modifiedReq.url, 'returned a response with status', event.status);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        responseReceived = true;
        if (error.status === 401) {
          unauthorizedCount++;
          if (unauthorizedCount >= unauthorizedLimit) {
            unauthorizedCount = 0;
            authService.logout();
            router.navigate(['/login']);
          }
        }
        const message = getErrorMessage(error);
        showErrorToast(error, message);
        if (error.error && typeof error.error === 'object') {
          error.error.message = message;
        }
        const enhancedError = Object.assign(error, { errorMessage: message, message });
        return throwError(() => enhancedError);
      }),
      finalize(() => {
        if (showedLoader) {
          loaderService.hide();
        }
      })
    );
  }

  // If the token is expiring soon, refresh it before making the request
  if (token && !shouldExclude && authService.isTokenExpiringSoon()) {
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
        showErrorToast(error, message);
        if (error.error && typeof error.error === 'object') {
          error.error.message = message;
        }
        const enhancedError = Object.assign(error, { errorMessage: message, message });
        return throwError(() => enhancedError);
      })
    );
  }

  // Token exists and not expiring — handleRequest manages loader internally
  if (token && !shouldExclude) {
    return handleRequest(token);
  }

  // No token or excluded — show loader for non-excluded URLs
  let showedLoader = false;
  if (!isDropdownCall && !excludeLoaderUrl.some(url => req.url.includes(url))) {
    loaderService.show();
    showedLoader = true;
  }

  return next(req).pipe(
    tap(event => {
      if (event.type === HttpEventType.Response) {
        unauthorizedCount = 0;
        console.log(req.url, 'returned a response with status', event.status);
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
      showErrorToast(error, message);
      if (error.error && typeof error.error === 'object') {
        error.error.message = message;
      }
      const enhancedError = Object.assign(error, { errorMessage: message, message });
      return throwError(() => enhancedError);
    }),
    finalize(() => {
      if (showedLoader) {
        loaderService.hide();
      }
    })
  );
};
