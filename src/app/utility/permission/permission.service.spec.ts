import { TestBed } from '@angular/core/testing';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PermissionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========== setPermissions ==========

  describe('setPermissions', () => {
    it('should accept an array of strings', () => {
      service.setPermissions(['CanRead', 'CanWrite']);
      expect(service.getPermissions()).toEqual(jasmine.arrayContaining(['CanRead', 'CanWrite']));
      expect(service.getPermissions().length).toBe(2);
    });

    it('should accept a Set of strings', () => {
      service.setPermissions(new Set(['CanRead', 'CanDelete']));
      expect(service.getPermissions()).toEqual(jasmine.arrayContaining(['CanRead', 'CanDelete']));
    });

    it('should handle undefined by setting empty permissions', () => {
      service.setPermissions(['CanRead']);
      service.setPermissions(undefined);
      expect(service.getPermissions()).toEqual([]);
    });

    it('should handle empty array', () => {
      service.setPermissions([]);
      expect(service.getPermissions()).toEqual([]);
    });

    it('should handle empty Set', () => {
      service.setPermissions(new Set());
      expect(service.getPermissions()).toEqual([]);
    });

    it('should deduplicate when given a Set', () => {
      const perms = new Set(['CanRead', 'CanRead']);
      service.setPermissions(perms);
      expect(service.getPermissions().length).toBe(1);
    });

    it('should replace previous permissions', () => {
      service.setPermissions(['CanRead']);
      service.setPermissions(['CanWrite']);
      expect(service.has('CanRead')).toBeFalse();
      expect(service.has('CanWrite')).toBeTrue();
    });
  });

  // ========== getPermissions ==========

  describe('getPermissions', () => {
    it('should return empty array when no permissions are set', () => {
      expect(service.getPermissions()).toEqual([]);
    });

    it('should return array of all permissions', () => {
      service.setPermissions(['A', 'B', 'C']);
      const perms = service.getPermissions();
      expect(perms.length).toBe(3);
      expect(perms).toEqual(jasmine.arrayContaining(['A', 'B', 'C']));
    });
  });

  // ========== has ==========

  describe('has', () => {
    beforeEach(() => {
      service.setPermissions(['CanRead', 'CanWrite', 'CanDelete']);
    });

    it('should return true for an existing permission', () => {
      expect(service.has('CanRead')).toBeTrue();
    });

    it('should return false for a non-existing permission', () => {
      expect(service.has('CanAdmin')).toBeFalse();
    });

    it('should return false for undefined', () => {
      expect(service.has(undefined)).toBeFalse();
    });

    it('should return false for empty string', () => {
      expect(service.has('')).toBeFalse();
    });

    it('should be case-sensitive', () => {
      expect(service.has('canread')).toBeFalse();
      expect(service.has('CANREAD')).toBeFalse();
    });
  });

  // ========== hasAny ==========

  describe('hasAny', () => {
    beforeEach(() => {
      service.setPermissions(['CanRead', 'CanWrite']);
    });

    it('should return true if user has at least one permission', () => {
      expect(service.hasAny(['CanRead', 'CanAdmin'])).toBeTrue();
    });

    it('should return false if user has none of the permissions', () => {
      expect(service.hasAny(['CanAdmin', 'CanSuper'])).toBeFalse();
    });

    it('should return false for null', () => {
      expect(service.hasAny(null)).toBeFalse();
    });

    it('should return false for undefined', () => {
      expect(service.hasAny(undefined)).toBeFalse();
    });

    it('should return false for empty array', () => {
      expect(service.hasAny([])).toBeFalse();
    });
  });

  // ========== hasAll ==========

  describe('hasAll', () => {
    beforeEach(() => {
      service.setPermissions(['CanRead', 'CanWrite', 'CanDelete']);
    });

    it('should return true if user has all permissions', () => {
      expect(service.hasAll(['CanRead', 'CanWrite'])).toBeTrue();
    });

    it('should return false if user is missing one permission', () => {
      expect(service.hasAll(['CanRead', 'CanAdmin'])).toBeFalse();
    });

    it('should return false for null', () => {
      expect(service.hasAll(null)).toBeFalse();
    });

    it('should return false for undefined', () => {
      expect(service.hasAll(undefined)).toBeFalse();
    });

    it('should return false for empty array', () => {
      expect(service.hasAll([])).toBeFalse();
    });
  });

  // ========== permissionsChanged ==========

  describe('permissionsChanged', () => {
    it('should emit when permissions change', (done) => {
      const emissions: Set<string>[] = [];
      service.permissionsChanged.subscribe((perms) => {
        emissions.push(perms);
        if (emissions.length === 2) {
          // Second emission should have the new permissions
          expect(emissions[1].has('CanRead')).toBeTrue();
          done();
        }
      });
      service.setPermissions(['CanRead']);
    });

    it('should emit initial empty set on subscribe', (done) => {
      service.permissionsChanged.subscribe((perms) => {
        expect(perms.size).toBe(0);
        done();
      });
    });
  });
});
