import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export interface RoleBasedItem {
  allowedRoles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleFilterService {

  constructor(private authService: AuthService) {}

  /**
   * Filter array of items based on user roles
   */
  filterByUserRoles<T extends RoleBasedItem>(items: T[]): T[] {
    const userRoles = this.authService.getUserRoles();
    
    if (userRoles.length === 0) {
      console.warn('User has no roles assigned, filtering out all role-restricted content');
      return items.filter(item => !item.allowedRoles || item.allowedRoles.length === 0);
    }

    return items.filter(item => {
      // If item has no role restrictions, show to all users
      if (!item.allowedRoles || item.allowedRoles.length === 0) {
        return true;
      }
      
      // Check if user has any of the allowed roles
      return this.authService.hasAnyRole(item.allowedRoles);
    });
  }

  /**
   * Filter and aggregate items for multi-role users
   * Removes duplicates based on a key function
   */
  filterAndAggregateByRoles<T extends RoleBasedItem>(
    items: T[], 
    keyFn: (item: T) => string,
    aggregateFn?: (existing: T, duplicate: T) => T
  ): T[] {
    const filteredItems = this.filterByUserRoles(items);
    
    // Group by key to handle duplicates
    const itemMap = new Map<string, T>();
    
    filteredItems.forEach(item => {
      const key = keyFn(item);
      const existingItem = itemMap.get(key);
      
      if (!existingItem) {
        itemMap.set(key, item);
      } else if (aggregateFn) {
        // Use custom aggregation function
        itemMap.set(key, aggregateFn(existingItem, item));
      } else {
        // Default: keep first occurrence
        console.log(`Duplicate item found for key: ${key}, keeping first occurrence`);
      }
    });
    
    return Array.from(itemMap.values());
  }

  /**
   * Check if user can access specific content based on roles
   */
  canAccessContent(allowedRoles: string[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true; // No role restrictions
    }
    
    return this.authService.hasAnyRole(allowedRoles);
  }

  /**
   * Get role-based access summary for debugging
   */
  getRoleAccessSummary<T extends RoleBasedItem>(items: T[]): {
    totalItems: number;
    accessibleItems: number;
    userRoles: string[];
    restrictedItems: number;
  } {
    const userRoles = this.authService.getUserRoles();
    const accessibleItems = this.filterByUserRoles(items);
    
    return {
      totalItems: items.length,
      accessibleItems: accessibleItems.length,
      userRoles,
      restrictedItems: items.length - accessibleItems.length
    };
  }

  /**
   * Get items grouped by role requirements
   */
  groupItemsByRoles<T extends RoleBasedItem>(items: T[]): Map<string, T[]> {
    const roleGroups = new Map<string, T[]>();
    
    items.forEach(item => {
      const roleKey = item.allowedRoles.sort().join(',') || 'no-restrictions';
      
      if (!roleGroups.has(roleKey)) {
        roleGroups.set(roleKey, []);
      }
      
      roleGroups.get(roleKey)!.push(item);
    });
    
    return roleGroups;
  }

  /**
   * Validate role configuration for items
   */
  validateRoleConfiguration<T extends RoleBasedItem>(items: T[]): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    items.forEach((item, index) => {
      if (!item.allowedRoles) {
        issues.push(`Item at index ${index} has undefined allowedRoles`);
      } else if (!Array.isArray(item.allowedRoles)) {
        issues.push(`Item at index ${index} has non-array allowedRoles`);
      } else if (item.allowedRoles.some(role => typeof role !== 'string')) {
        issues.push(`Item at index ${index} has non-string roles in allowedRoles`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}