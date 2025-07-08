import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, tap, throwError } from 'rxjs';
import { LoaderService } from '../services/loader.service';

let unauthorizedCount = 0; // Track consecutive 401 responses
const unauthorizedLimit = 3;

const errorMessages: { [key: number]: string } = {
  0: 'Service Unavailable',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const router = inject(Router);
  const loaderService = inject(LoaderService);

  let token = authService.getUserData()?.token; // Retrieve token from service
  const excludedUrls = ['/api/Auth/login', 'api/Auth/refresh-token', '/api/Auth/forgot'];
  const excludeLoaderUrl = ['/api/Auth/login', '/api/Auth/forgot', '/api/DepartmentMaster/dropdown', '/api/DesignationMaster/dropdown', '/api/EmployeeMaster/dropdown'];

  const shouldExclude = excludedUrls.some(url => req.url.includes(url));

  const getErrorMessage = (error: HttpErrorResponse) => {
    if (error.status === 0) {
      return errorMessages[0];
    }
    if (error.error) {
      if (typeof error.error === 'string') {
        return error.error;
      }
      if (error.error.message) {
        return error.error.message;
      }
      if (typeof error.error === 'object') {
        return JSON.stringify(error.error);
      }
    }
    if (errorMessages[error.status]) {
      return errorMessages[error.status];
    }
    return 'An unexpected error occurred';
  };

  const handleRequest = (accessToken: any) => {
    const modifiedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` }
    });

    if (!excludeLoaderUrl.some(url => req.url.includes(url))) {
      loaderService.show();
    }

    return next(modifiedReq).pipe(
      tap(event => {
        if (event.type === HttpEventType.Response) {
          unauthorizedCount = 0;
          loaderService.hide();
          console.log(modifiedReq.url, 'returned a response with status', event.status);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        loaderService.hide();
        if (error.status === 401) {
          unauthorizedCount++; // Increment on 401 Unauthorized
          if (unauthorizedCount >= unauthorizedLimit) {
            unauthorizedCount = 0;
            authService.logout();
            router.navigate(['/login']);
          }
        }
        const message = getErrorMessage(error);
        // Attach errorMessage in a safe way without modifying HttpErrorResponse directly
        const enhancedError = Object.assign(error, { errorMessage: message });
        return throwError(() => enhancedError);
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
        loaderService.hide();
      const message = getErrorMessage(error);
      // Attach errorMessage in a safe way without modifying HttpErrorResponse directly
      const enhancedError = Object.assign(error, { errorMessage: message });
      return throwError(() => enhancedError);
      })
    );
  }

  // No token or excluded
  if (!excludeLoaderUrl.some(url => req.url.includes(req.url))) {
    loaderService.show();
  }

  // Token exists and not expiring
  if (token && !shouldExclude) {
    return handleRequest(token);
  }

  return next(req).pipe(
    tap(event => {
      // Log only final response
      if (event.type === HttpEventType.Response) {
        unauthorizedCount = 0;
        loaderService.hide();
        console.log(req.url, 'returned a response with status', event.status);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      loaderService.hide();
      if (error.status === 401) {
        unauthorizedCount++; // Increment on 401 Unauthorized
        if (unauthorizedCount >= unauthorizedLimit) {
          unauthorizedCount = 0;
          authService.logout();
          router.navigate(['/login']);
        }
      }
      const message = getErrorMessage(error);
      // Attach errorMessage in a safe way without modifying HttpErrorResponse directly
      const enhancedError = Object.assign(error, { errorMessage: message });
      return throwError(() => enhancedError);
    })
  );
};
