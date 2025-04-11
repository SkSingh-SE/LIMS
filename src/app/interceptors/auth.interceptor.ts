import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { LoaderService } from '../services/loader.service';

let unauthorizedCount = 0; // Track consecutive 401 responses
const unauthorizedLimit = 3;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  
  const authService = inject(AuthService);
  const router = inject(Router);
  const loaderService = inject(LoaderService);

  const token = authService.getUserData()?.token; // Retrieve token from service
  const excludedUrls = ['/api/Auth/login', '/api/Auth/forgot'];
  const excludeLoaderUrl = ['/api/Auth/login', '/api/Auth/forgot', '/api/DepartmentMaster/dropdown', '/api/DesignationMaster/dropdown', '/api/EmployeeMaster/dropdown'];
 
  const shouldExclude = excludedUrls.some(url => req.url.includes(url));

  let modifiedReq = req;
  if (token && !shouldExclude) {
    modifiedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  // Need to add list of API in which i don't want to show loader
  if (!excludeLoaderUrl.some(url => req.url.includes(url))) {
    loaderService.show();
  }

  return next(modifiedReq).pipe(
    tap(event => {
      // Log only final response
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
      }else{
        loaderService.hide();
      }
      return throwError(() => error);
    })
  );
};
