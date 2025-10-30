import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private perms$ = new BehaviorSubject<Set<string>>(new Set());

  setPermissions(perms: string[] | Set<string> | undefined) {
    let newPerms: Set<string>;

    if (Array.isArray(perms)) {
      newPerms = new Set(perms);
    } else if (perms instanceof Set) {
      newPerms = new Set(Array.from(perms).map(p => String(p)));
    } else {
      newPerms = new Set();
    }

    this.perms$.next(newPerms);
  }


  getPermissions(): string[] {
    return Array.from(this.perms$.value);
  }

  has(permission?: string): boolean {
    if (!permission) return false;
    return this.perms$.value.has(permission);
  }

  hasAny(permissions?: string[] | null): boolean {
    if (!permissions || permissions.length === 0) return false;
    return permissions.some(p => this.perms$.value.has(p));
  }

  hasAll(permissions?: string[] | null): boolean {
    if (!permissions || permissions.length === 0) return false;
    return permissions.every(p => this.perms$.value.has(p));
  }

  // observable for permission changes
  get permissionsChanged() {
    return this.perms$.asObservable();
  }
}
