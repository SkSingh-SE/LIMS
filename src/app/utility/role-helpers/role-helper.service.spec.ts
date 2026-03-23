import { TestBed } from '@angular/core/testing';
import { RoleHelperService } from './role-helper.service';
import { PermissionService } from '../permission/permission.service';

describe('RoleHelperService', () => {
  let service: RoleHelperService;
  let permissionService: PermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    permissionService = TestBed.inject(PermissionService);
    service = TestBed.inject(RoleHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========== ACCOUNTS ==========

  describe('canGeneratePI', () => {
    it('should return true when user has CanReadAccount', () => {
      permissionService.setPermissions(['CanReadAccount']);
      expect(service.canGeneratePI()).toBeTrue();
    });

    it('should return true when user has CanGeneratePI', () => {
      permissionService.setPermissions(['CanGeneratePI']);
      expect(service.canGeneratePI()).toBeTrue();
    });

    it('should return false when user has no relevant permissions', () => {
      permissionService.setPermissions(['CanReadTesting']);
      expect(service.canGeneratePI()).toBeFalse();
    });
  });

  describe('canGenerateInvoice', () => {
    it('should return true when user has CanGenerateInvoice', () => {
      permissionService.setPermissions(['CanGenerateInvoice']);
      expect(service.canGenerateInvoice()).toBeTrue();
    });

    it('should return true when user has CanManageAccount', () => {
      permissionService.setPermissions(['CanManageAccount']);
      expect(service.canGenerateInvoice()).toBeTrue();
    });

    it('should return false with no relevant permissions', () => {
      permissionService.setPermissions([]);
      expect(service.canGenerateInvoice()).toBeFalse();
    });
  });

  describe('canManageInvoice', () => {
    it('should return true with CanManageInvoice', () => {
      permissionService.setPermissions(['CanManageInvoice']);
      expect(service.canManageInvoice()).toBeTrue();
    });

    it('should return false without relevant permissions', () => {
      permissionService.setPermissions(['CanReadTesting']);
      expect(service.canManageInvoice()).toBeFalse();
    });
  });

  describe('canViewAccounts', () => {
    it('should return true with CanReadAccount', () => {
      permissionService.setPermissions(['CanReadAccount']);
      expect(service.canViewAccounts()).toBeTrue();
    });

    it('should return true with CanManageAccount', () => {
      permissionService.setPermissions(['CanManageAccount']);
      expect(service.canViewAccounts()).toBeTrue();
    });

    it('should return false without account permissions', () => {
      permissionService.setPermissions(['CanReadTesting']);
      expect(service.canViewAccounts()).toBeFalse();
    });
  });

  // ========== REPORTING ==========

  describe('canApproveReport', () => {
    it('should return true with CanApproveReport', () => {
      permissionService.setPermissions(['CanApproveReport']);
      expect(service.canApproveReport()).toBeTrue();
    });

    it('should return true with CanManageReporting', () => {
      permissionService.setPermissions(['CanManageReporting']);
      expect(service.canApproveReport()).toBeTrue();
    });

    it('should return false without reporting permissions', () => {
      permissionService.setPermissions([]);
      expect(service.canApproveReport()).toBeFalse();
    });
  });

  describe('canManageReporting', () => {
    it('should return true with CanManageReporting', () => {
      permissionService.setPermissions(['CanManageReporting']);
      expect(service.canManageReporting()).toBeTrue();
    });

    it('should return false without reporting permissions', () => {
      permissionService.setPermissions(['CanReadAccount']);
      expect(service.canManageReporting()).toBeFalse();
    });
  });

  describe('canCreateInternalAmendment', () => {
    it('should return true with CanAmendReport', () => {
      permissionService.setPermissions(['CanAmendReport']);
      expect(service.canCreateInternalAmendment()).toBeTrue();
    });

    it('should return true with CanReadReporting', () => {
      permissionService.setPermissions(['CanReadReporting']);
      expect(service.canCreateInternalAmendment()).toBeTrue();
    });
  });

  describe('canRequestAmendment', () => {
    it('should return true with CanReadAccount (accounts can request)', () => {
      permissionService.setPermissions(['CanReadAccount']);
      expect(service.canRequestAmendment()).toBeTrue();
    });

    it('should return true with CanReadReporting (reporting can request)', () => {
      permissionService.setPermissions(['CanReadReporting']);
      expect(service.canRequestAmendment()).toBeTrue();
    });

    it('should return false with unrelated permissions', () => {
      permissionService.setPermissions(['CanReadTesting']);
      expect(service.canRequestAmendment()).toBeFalse();
    });
  });

  // ========== TESTING ==========

  describe('canPerformTests', () => {
    it('should return true with CanPerformTest', () => {
      permissionService.setPermissions(['CanPerformTest']);
      expect(service.canPerformTests()).toBeTrue();
    });

    it('should return true with CanReadTesting', () => {
      permissionService.setPermissions(['CanReadTesting']);
      expect(service.canPerformTests()).toBeTrue();
    });

    it('should return false without testing permissions', () => {
      permissionService.setPermissions(['CanReadAccount']);
      expect(service.canPerformTests()).toBeFalse();
    });
  });

  describe('canManageTesting', () => {
    it('should return true with CanManageTesting', () => {
      permissionService.setPermissions(['CanManageTesting']);
      expect(service.canManageTesting()).toBeTrue();
    });
  });

  // ========== INWARD ==========

  describe('canManageInward', () => {
    it('should return true with CanCreateSampleInward', () => {
      permissionService.setPermissions(['CanCreateSampleInward']);
      expect(service.canManageInward()).toBeTrue();
    });

    it('should return true with CanManageSampleInward', () => {
      permissionService.setPermissions(['CanManageSampleInward']);
      expect(service.canManageInward()).toBeTrue();
    });
  });

  describe('canEditInward', () => {
    it('should return true with CanUpdateSampleInward', () => {
      permissionService.setPermissions(['CanUpdateSampleInward']);
      expect(service.canEditInward()).toBeTrue();
    });

    it('should return false without edit permissions', () => {
      permissionService.setPermissions(['CanDeleteSampleInward']);
      expect(service.canEditInward()).toBeFalse();
    });
  });

  describe('canDeleteInward', () => {
    it('should return true with CanDeleteSampleInward', () => {
      permissionService.setPermissions(['CanDeleteSampleInward']);
      expect(service.canDeleteInward()).toBeTrue();
    });

    it('should return true with CanManageSampleInward', () => {
      permissionService.setPermissions(['CanManageSampleInward']);
      expect(service.canDeleteInward()).toBeTrue();
    });

    it('should return false without delete permissions', () => {
      permissionService.setPermissions(['CanReadTesting']);
      expect(service.canDeleteInward()).toBeFalse();
    });
  });

  // ========== GENERIC ==========

  describe('hasPermission', () => {
    it('should delegate to permissionService.has', () => {
      permissionService.setPermissions(['TestPerm']);
      expect(service.hasPermission('TestPerm')).toBeTrue();
      expect(service.hasPermission('Other')).toBeFalse();
    });
  });

  describe('hasAnyPermission', () => {
    it('should delegate to permissionService.hasAny', () => {
      permissionService.setPermissions(['A', 'B']);
      expect(service.hasAnyPermission(['A', 'C'])).toBeTrue();
      expect(service.hasAnyPermission(['C', 'D'])).toBeFalse();
    });
  });

  describe('hasAllPermissions', () => {
    it('should delegate to permissionService.hasAll', () => {
      permissionService.setPermissions(['A', 'B', 'C']);
      expect(service.hasAllPermissions(['A', 'B'])).toBeTrue();
      expect(service.hasAllPermissions(['A', 'D'])).toBeFalse();
    });
  });

  describe('getPermissions', () => {
    it('should delegate to permissionService.getPermissions', () => {
      permissionService.setPermissions(['X', 'Y']);
      const perms = service.getPermissions();
      expect(perms).toEqual(jasmine.arrayContaining(['X', 'Y']));
    });
  });
});
