import { Injectable } from '@angular/core';
import { PermissionService } from '../permission/permission.service';

/**
 * Role Helper Service
 * Reuses existing PermissionService to check role-based access
 * Based on menu permissions - single source of truth
 */
@Injectable({
  providedIn: 'root'
})
export class RoleHelperService {

  constructor(private permissionService: PermissionService) { }

  // ========== ACCOUNTS ROLE CHECKS ==========
  // Based on menu permissions for Accounts-related actions

  /**
   * Check if user can generate PI
   * Uses permission: Accounts menu access or specific PI permission
   */
  canGeneratePI(): boolean {
    // Check for Accounts-related permissions
    return this.permissionService.hasAny([
      'CanReadAccount',
      'CanManageAccount',
      'CanGeneratePI',
      'CanManageInvoice'
    ]);
  }

  /**
   * Check if user can generate Final Invoice
   */
  canGenerateInvoice(): boolean {
    return this.permissionService.hasAny([
      'CanReadAccount',
      'CanManageAccount',
      'CanGenerateInvoice',
      'CanManageInvoice'
    ]);
  }

  /**
   * Check if user can manage invoices
   */
  canManageInvoice(): boolean {
    return this.permissionService.hasAny([
      'CanReadAccount',
      'CanManageAccount',
      'CanManageInvoice'
    ]);
  }

  /**
   * Check if user can view accounts
   */
  canViewAccounts(): boolean {
    return this.permissionService.hasAny([
      'CanReadAccount',
      'CanManageAccount'
    ]);
  }

  // ========== REPORTING ROLE CHECKS ==========

  /**
   * Check if user can approve reports
   */
  canApproveReport(): boolean {
    return this.permissionService.hasAny([
      'CanReadReporting',
      'CanManageReporting',
      'CanApproveReport'
    ]);
  }

  /**
   * Check if user can manage reporting
   */
  canManageReporting(): boolean {
    return this.permissionService.hasAny([
      'CanReadReporting',
      'CanManageReporting'
    ]);
  }

  /**
   * Check if user can create internal amendments
   */
  canCreateInternalAmendment(): boolean {
    // Internal amendments are typically Reporting role only
    return this.permissionService.hasAny([
      'CanReadReporting',
      'CanManageReporting',
      'CanAmendReport'
    ]);
  }

  /**
   * Check if user can request amendments
   */
  canRequestAmendment(): boolean {
    // Both Accounts and Reporting can request amendments
    return this.permissionService.hasAny([
      'CanReadReporting',
      'CanManageReporting',
      'CanReadAccount',
      'CanManageAccount',
      'CanAmendReport'
    ]);
  }

  // ========== TESTING ROLE CHECKS ==========

  /**
   * Check if user can perform tests
   */
  canPerformTests(): boolean {
    return this.permissionService.hasAny([
      'CanReadTesting',
      'CanManageTesting',
      'CanPerformTest'
    ]);
  }

  /**
   * Check if user can manage testing
   */
  canManageTesting(): boolean {
    return this.permissionService.hasAny([
      'CanReadTesting',
      'CanManageTesting'
    ]);
  }

  // ========== INWARD ROLE CHECKS ==========

  /**
   * Check if user can manage sample inward
   */
  canManageInward(): boolean {
    return this.permissionService.hasAny([
      'CanReadSampleInward',
      'CanManageSampleInward',
      'CanCreateSampleInward',
      'CanUpdateSampleInward'
    ]);
  }

  /**
   * Check if user can edit sample inward
   */
  canEditInward(): boolean {
    return this.permissionService.hasAny([
      'CanReadSampleInward',
      'CanManageSampleInward',
      'CanUpdateSampleInward'
    ]);
  }

  /**
   * Check if user can delete sample inward
   */
  canDeleteInward(): boolean {
    return this.permissionService.hasAny([
      'CanManageSampleInward',
      'CanDeleteSampleInward'
    ]);
  }

  // ========== GENERIC PERMISSION CHECKS ==========

  /**
   * Check if user has any of the specified permissions
   * Direct wrapper around PermissionService
   */
  hasPermission(permission: string): boolean {
    return this.permissionService.has(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    return this.permissionService.hasAny(permissions);
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    return this.permissionService.hasAll(permissions);
  }

  /**
   * Get all user permissions
   */
  getPermissions(): string[] {
    return this.permissionService.getPermissions();
  }
}

