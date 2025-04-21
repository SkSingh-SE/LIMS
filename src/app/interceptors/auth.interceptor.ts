import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, tap, throwError } from 'rxjs';
import { LoaderService } from '../services/loader.service';

let unauthorizedCount = 0; // Track consecutive 401 responses
const unauthorizedLimit = 3;

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const router = inject(Router);
  const loaderService = inject(LoaderService);

  let token = authService.getUserData()?.token; // Retrieve token from service
  const excludedUrls = ['/api/Auth/login', 'api/Auth/refresh-token', '/api/Auth/forgot'];
  const excludeLoaderUrl = ['/api/Auth/login', '/api/Auth/forgot', '/api/DepartmentMaster/dropdown', '/api/DesignationMaster/dropdown', '/api/EmployeeMaster/dropdown'];

  const shouldExclude = excludedUrls.some(url => req.url.includes(url));


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
        if (error.status === 401) {
          unauthorizedCount++; // Increment on 401 Unauthorized
          loaderService.hide();
          if (unauthorizedCount >= unauthorizedLimit) {
            unauthorizedCount = 0;
            authService.logout();
            router.navigate(['/login']);
          }
        } else {
          loaderService.hide();
        }
        return throwError(() => error);
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
        console.error('Token refresh failed:', error);
        loaderService.hide();
        return throwError(() => error);
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
      if (error.status === 401) {
        unauthorizedCount++; // Increment on 401 Unauthorized
        loaderService.hide();
        if (unauthorizedCount >= unauthorizedLimit) {
          unauthorizedCount = 0;
          authService.logout();
          router.navigate(['/login']);
        }
      } else {
        loaderService.hide();
      }
      return throwError(() => error);
    })
  );
};
