import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private perms$ = new BehaviorSubject<Set<string>>(new Set());
  private _isAdmin = false;

  constructor() {
    this.initFromStorage();
  }

  public initFromStorage(): void {
    try {
      const rawUser = localStorage.getItem('userData') || localStorage.getItem('user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        this._isAdmin = u?.isAdmin === true || (u?.role || '').toLowerCase() === 'admin';
      }
      const rawPerms = localStorage.getItem('lims_permissions');
      if (rawPerms) {
        const parsed = JSON.parse(rawPerms);
        if (Array.isArray(parsed)) {
          this.perms$.next(new Set(parsed));
          return;
        }
      }
      if (this._isAdmin) {
        this.perms$.next(this.perms$.value);
      }
    } catch (e) {
      console.error('Failed to init permissions from storage', e);
    }
  }

  setAdmin(isAdmin: boolean): void {
    this._isAdmin = isAdmin;
    this.perms$.next(this.perms$.value);
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

    try {
      localStorage.setItem('lims_permissions', JSON.stringify(Array.from(newPerms)));
    } catch {}

    this.perms$.next(newPerms);
  }

  clear(): void {
    this._isAdmin = false;
    this.perms$.next(new Set());
    try {
      localStorage.removeItem('lims_permissions');
    } catch {}
  }


  getPermissions(): string[] {
    return Array.from(this.perms$.value);
  }

  has(permission?: string): boolean {
    if (this._isAdmin) return true;
    if (!permission) return false;
    
    if (this.perms$.value.has(permission)) return true;
    
    if (permission.startsWith('CanRead') || permission.startsWith('CanCreate') || 
        permission.startsWith('CanUpdate') || permission.startsWith('CanDelete')) {
      const managePerm = permission.replace(/^Can(Read|Create|Update|Delete)/, 'CanManage');
      if (this.perms$.value.has(managePerm)) return true;
    }
    
    return false;
  }

  hasAny(permissions?: string[] | null): boolean {
    if (this._isAdmin) return true;
    if (!permissions || permissions.length === 0) return false;
    return permissions.some(p => this.has(p));
  }

  hasAll(permissions?: string[] | null): boolean {
    if (this._isAdmin) return true;
    if (!permissions || permissions.length === 0) return false;
    return permissions.every(p => this.has(p));
  }

  // observable for permission changes
  get permissionsChanged() {
    return this.perms$.asObservable();
  }
}
