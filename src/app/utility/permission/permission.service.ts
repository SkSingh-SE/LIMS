import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private perms$ = new BehaviorSubject<Set<string>>(new Set());
  private _isAdmin = false;

  setAdmin(isAdmin: boolean): void {
    this._isAdmin = isAdmin;
  }

  get isAdmin(): boolean {
    return this._isAdmin;
  }

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
    if (this._isAdmin) return true;
    if (!permission) return false;
    return this.perms$.value.has(permission);
  }

  hasAny(permissions?: string[] | null): boolean {
    if (this._isAdmin) return true;
    if (!permissions || permissions.length === 0) return false;
    return permissions.some(p => this.perms$.value.has(p));
  }

  hasAll(permissions?: string[] | null): boolean {
    if (this._isAdmin) return true;
    if (!permissions || permissions.length === 0) return false;
    return permissions.every(p => this.perms$.value.has(p));
  }

  // observable for permission changes
  get permissionsChanged() {
    return this.perms$.asObservable();
  }
}
