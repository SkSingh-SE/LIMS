import { TestBed } from '@angular/core/testing';
import { StatusHelperService, ReportStatus } from './status-helper.service';

describe('StatusHelperService', () => {
  let service: StatusHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========== INWARD STATUS CHECKS ==========

  describe('canEditInward', () => {
    it('should return true for INWARD_REGISTERED', () => {
      expect(service.canEditInward('INWARD_REGISTERED')).toBeTrue();
    });

    it('should return true for IN_PROGRESS', () => {
      expect(service.canEditInward('IN_PROGRESS')).toBeTrue();
    });

    it('should be case-insensitive', () => {
      expect(service.canEditInward('inward_registered')).toBeTrue();
      expect(service.canEditInward('in_progress')).toBeTrue();
    });

    it('should return false for COMPLETED', () => {
      expect(service.canEditInward('COMPLETED')).toBeFalse();
    });

    it('should return false for CANCELLED', () => {
      expect(service.canEditInward('CANCELLED')).toBeFalse();
    });

    it('should handle null/undefined/empty', () => {
      expect(service.canEditInward('')).toBeFalse();
      expect(service.canEditInward(null as any)).toBeFalse();
      expect(service.canEditInward(undefined as any)).toBeFalse();
    });
  });

  describe('canDeleteInward', () => {
    it('should return true for INWARD_REGISTERED', () => {
      expect(service.canDeleteInward('INWARD_REGISTERED')).toBeTrue();
    });

    it('should return true for IN_PROGRESS', () => {
      expect(service.canDeleteInward('IN_PROGRESS')).toBeTrue();
    });

    it('should return true for NOT_STARTED', () => {
      expect(service.canDeleteInward('NOT_STARTED')).toBeTrue();
    });

    it('should return false for COMPLETED', () => {
      expect(service.canDeleteInward('COMPLETED')).toBeFalse();
    });

    it('should handle null/undefined', () => {
      expect(service.canDeleteInward(null as any)).toBeFalse();
      expect(service.canDeleteInward(undefined as any)).toBeFalse();
    });
  });

  describe('canPlan', () => {
    it('should return true for INWARD_COMPLETED', () => {
      expect(service.canPlan('INWARD_COMPLETED')).toBeTrue();
    });

    it('should return true for COMPLETED', () => {
      expect(service.canPlan('COMPLETED')).toBeTrue();
    });

    it('should return false for IN_PROGRESS', () => {
      expect(service.canPlan('IN_PROGRESS')).toBeFalse();
    });

    it('should return false for NOT_STARTED', () => {
      expect(service.canPlan('NOT_STARTED')).toBeFalse();
    });

    it('should be case-insensitive', () => {
      expect(service.canPlan('inward_completed')).toBeTrue();
    });
  });

  // ========== BILLING STATUS CHECKS ==========

  describe('canGeneratePI', () => {
    it('should return true for PENDING', () => {
      expect(service.canGeneratePI('PENDING')).toBeTrue();
    });

    it('should return false for PRICED', () => {
      expect(service.canGeneratePI('PRICED')).toBeFalse();
    });

    it('should return false for PI_GENERATED', () => {
      expect(service.canGeneratePI('PI_GENERATED')).toBeFalse();
    });

    it('should be case-insensitive', () => {
      expect(service.canGeneratePI('pending')).toBeTrue();
    });
  });

  describe('canGenerateInvoice', () => {
    it('should return true when billing is ADVANCE_PAID and report is FINAL_REPORT_APPROVED', () => {
      expect(service.canGenerateInvoice('ADVANCE_PAID', 'FINAL_REPORT_APPROVED')).toBeTrue();
    });

    it('should return false when billing is not ADVANCE_PAID', () => {
      expect(service.canGenerateInvoice('PENDING', 'FINAL_REPORT_APPROVED')).toBeFalse();
    });

    it('should return false when report is not approved', () => {
      expect(service.canGenerateInvoice('ADVANCE_PAID', 'REPORT_GENERATED')).toBeFalse();
    });

    it('should return false when both are wrong', () => {
      expect(service.canGenerateInvoice('PENDING', 'REPORT_GENERATED')).toBeFalse();
    });

    it('should be case-insensitive', () => {
      expect(service.canGenerateInvoice('advance_paid', 'final_report_approved')).toBeTrue();
    });
  });

  describe('canSendInvoice', () => {
    it('should return true for PI_GENERATED', () => {
      expect(service.canSendInvoice('PI_GENERATED')).toBeTrue();
    });

    it('should return true for INVOICE_GENERATED', () => {
      expect(service.canSendInvoice('INVOICE_GENERATED')).toBeTrue();
    });

    it('should return false for PENDING', () => {
      expect(service.canSendInvoice('PENDING')).toBeFalse();
    });

    it('should return false for ADVANCE_PAID', () => {
      expect(service.canSendInvoice('ADVANCE_PAID')).toBeFalse();
    });
  });

  describe('hasPricing', () => {
    it('should return true for PRICED billing + approved report', () => {
      expect(service.hasPricing('PRICED', 'FINAL_REPORT_APPROVED')).toBeTrue();
    });

    it('should return true for PI_GENERATED billing + approved report', () => {
      expect(service.hasPricing('PI_GENERATED', 'FINAL_REPORT_APPROVED')).toBeTrue();
    });

    it('should return true for ADVANCE_PAID + approved report', () => {
      expect(service.hasPricing('ADVANCE_PAID', 'FINAL_REPORT_APPROVED')).toBeTrue();
    });

    it('should return true for INVOICE_GENERATED + approved report', () => {
      expect(service.hasPricing('INVOICE_GENERATED', 'FINAL_REPORT_APPROVED')).toBeTrue();
    });

    it('should return false when report is not approved', () => {
      expect(service.hasPricing('PRICED', 'REPORT_GENERATED')).toBeFalse();
    });

    it('should return false for NO_PRICING even with approved report', () => {
      expect(service.hasPricing('NO_PRICING', 'FINAL_REPORT_APPROVED')).toBeFalse();
    });
  });

  // ========== REPORT STATUS CHECKS ==========

  describe('canApproveReport', () => {
    it('should return true for REPORT_GENERATED', () => {
      expect(service.canApproveReport('REPORT_GENERATED')).toBeTrue();
    });

    it('should return true for REPORT_UNDER_REVIEW', () => {
      expect(service.canApproveReport('REPORT_UNDER_REVIEW')).toBeTrue();
    });

    it('should return false for FINAL_REPORT_APPROVED', () => {
      expect(service.canApproveReport('FINAL_REPORT_APPROVED')).toBeFalse();
    });

    it('should return false for AMENDMENT_IN_PROGRESS', () => {
      expect(service.canApproveReport('AMENDMENT_IN_PROGRESS')).toBeFalse();
    });
  });

  describe('canRejectReport', () => {
    it('should return true for REPORT_GENERATED', () => {
      expect(service.canRejectReport('REPORT_GENERATED')).toBeTrue();
    });

    it('should return true for REPORT_UNDER_REVIEW', () => {
      expect(service.canRejectReport('REPORT_UNDER_REVIEW')).toBeTrue();
    });

    it('should return false for FINAL_REPORT_APPROVED', () => {
      expect(service.canRejectReport('FINAL_REPORT_APPROVED')).toBeFalse();
    });
  });

  describe('canGeneratePDF', () => {
    it('should return true for FINAL_REPORT_APPROVED', () => {
      expect(service.canGeneratePDF('FINAL_REPORT_APPROVED')).toBeTrue();
    });

    it('should return true for COMPLETED', () => {
      expect(service.canGeneratePDF('COMPLETED')).toBeTrue();
    });

    it('should return true for APPROVED', () => {
      expect(service.canGeneratePDF('APPROVED')).toBeTrue();
    });

    it('should return false for REPORT_GENERATED', () => {
      expect(service.canGeneratePDF('REPORT_GENERATED')).toBeFalse();
    });
  });

  describe('canViewPricing', () => {
    it('should return true for FINAL_REPORT_APPROVED', () => {
      expect(service.canViewPricing('FINAL_REPORT_APPROVED')).toBeTrue();
    });

    it('should return true for AMENDMENT_IN_PROGRESS', () => {
      expect(service.canViewPricing('AMENDMENT_IN_PROGRESS')).toBeTrue();
    });

    it('should return true for AMENDMENT_COMPLETED', () => {
      expect(service.canViewPricing('AMENDMENT_COMPLETED')).toBeTrue();
    });

    it('should return false for REPORT_GENERATED', () => {
      expect(service.canViewPricing('REPORT_GENERATED')).toBeFalse();
    });
  });

  describe('canAmendReport', () => {
    it('should return true for FINAL_REPORT_APPROVED', () => {
      expect(service.canAmendReport('FINAL_REPORT_APPROVED')).toBeTrue();
    });

    it('should return true for COMPLETED', () => {
      expect(service.canAmendReport('COMPLETED')).toBeTrue();
    });

    it('should return true for APPROVED', () => {
      expect(service.canAmendReport('APPROVED')).toBeTrue();
    });

    it('should return true for REPORT_GENERATED', () => {
      expect(service.canAmendReport('REPORT_GENERATED')).toBeTrue();
    });

    it('should return false for REPORT_UNDER_REVIEW', () => {
      expect(service.canAmendReport('REPORT_UNDER_REVIEW')).toBeFalse();
    });
  });

  describe('isAmendmentInProgress', () => {
    it('should return true for AMENDMENT_IN_PROGRESS', () => {
      expect(service.isAmendmentInProgress('AMENDMENT_IN_PROGRESS')).toBeTrue();
    });

    it('should return true for CUSTOMER_REQUESTED_AMENDMENT', () => {
      expect(service.isAmendmentInProgress('CUSTOMER_REQUESTED_AMENDMENT')).toBeTrue();
    });

    it('should return false for FINAL_REPORT_APPROVED', () => {
      expect(service.isAmendmentInProgress('FINAL_REPORT_APPROVED')).toBeFalse();
    });
  });

  // ========== UTILITY METHODS ==========

  describe('normalizeStatus', () => {
    it('should uppercase and trim', () => {
      expect(service.normalizeStatus('  pending  ')).toBe('PENDING');
    });

    it('should handle null', () => {
      expect(service.normalizeStatus(null)).toBe('');
    });

    it('should handle undefined', () => {
      expect(service.normalizeStatus(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(service.normalizeStatus('')).toBe('');
    });
  });

  describe('isStatus', () => {
    it('should return true if status matches any of the allowed statuses', () => {
      expect(service.isStatus('PENDING', 'PENDING', 'ACTIVE')).toBeTrue();
    });

    it('should be case-insensitive', () => {
      expect(service.isStatus('pending', 'PENDING')).toBeTrue();
    });

    it('should return false if status does not match', () => {
      expect(service.isStatus('REJECTED', 'PENDING', 'ACTIVE')).toBeFalse();
    });

    it('should handle null status', () => {
      expect(service.isStatus(null, 'PENDING')).toBeFalse();
    });

    it('should handle empty status against empty allowed', () => {
      expect(service.isStatus('', '')).toBeTrue();
    });
  });
});
