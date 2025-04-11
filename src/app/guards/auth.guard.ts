import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('Route:', route); 
  console.log('State:', state);

  if (authService.isLoggedIn()) {
    return true; 
  } else {
    router.navigate(['/login']); 
    return false;
  }
};
