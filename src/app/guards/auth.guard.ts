import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isTokenExpiring = authService.isTokenExpiringSoon();
  const userData = authService.getUserData();

  if (!userData) {
    router.navigate(['/login']);
    return of(false);
  }

  if (isTokenExpiring) {
    alert('Token is expiring soon, refreshing...');
    // If the token is about to expire, try to refresh it
    return authService.refreshToken(userData.token).pipe(
      map((newTokenData) => {
        if (newTokenData && newTokenData.token) {
          authService.saveUserData(newTokenData);
          return true;
        } else {
          authService.logout();
          router.navigate(['/login']);
          return false;
        }
      }),
      catchError((error) => {
        console.error('Token refresh failed in guard:', error);
        authService.logout();
        router.navigate(['/login']);
        return of(false);
      })
    );
  }

  // Token is valid and not expiring soon
  return of(true);
};
