import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../utility/permission/permission.service';

/**
 * Route guard: allows navigation when the user holds ANY of route.data['permissions'].
 * Routes without the data key stay open (auth-only). Backend [RequirePermission] remains the real gate.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const required = route.data?.['permissions'] as string[] | undefined;
  if (!required?.length) return true;
  const permissions = inject(PermissionService);
  return permissions.hasAny(required) ? true : inject(Router).createUrlTree(['/']);
};
