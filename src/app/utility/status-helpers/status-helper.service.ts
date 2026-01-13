import { Injectable } from '@angular/core';
import { InwardStatus } from '../status_flow/enums/inward-status.enum';
import { SampleStatus } from '../status_flow/enums/sample-status.enum';
import { BillingStatus } from '../status_flow/enums/billing-status.enum';

/**
 * Report Status Enum - matches backend
 */
export enum ReportStatus {
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_UNDER_REVIEW = 'REPORT_UNDER_REVIEW',
  REPORT_REJECTED_BY_INTERNAL = 'REPORT_REJECTED_BY_INTERNAL',
  FINAL_REPORT_APPROVED = 'FINAL_REPORT_APPROVED',
  AMENDMENT_IN_PROGRESS = 'AMENDMENT_IN_PROGRESS',
  AMENDMENT_COMPLETED = 'AMENDMENT_COMPLETED',
  REPORT_SENT_FOR_CUSTOMER_REVIEW = 'REPORT_SENT_FOR_CUSTOMER_REVIEW',
  CUSTOMER_REQUESTED_AMENDMENT = 'CUSTOMER_REQUESTED_AMENDMENT'
}

@Injectable({
  providedIn: 'root'
})
export class StatusHelperService {


  // ========== INWARD STATUS CHECKS ==========

  /**
   * Check if inward can be edited
   */
  canEditInward(status: string): boolean {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === InwardStatus.INWARD_REGISTERED ||
           statusUpper === InwardStatus.IN_PROGRESS;
  }

  /**
   * Check if inward can be deleted
   */
  canDeleteInward(status: string): boolean {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === InwardStatus.INWARD_REGISTERED ||
           statusUpper === InwardStatus.IN_PROGRESS ||
           statusUpper === InwardStatus.NOT_STARTED;
  }

  /**
   * Check if planning is allowed
   */
  canPlan(status: string): boolean {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === InwardStatus.INWARD_COMPLETED ||
           statusUpper === InwardStatus.COMPLETED ||
           statusUpper === SampleStatus.INWARD_COMPLETED;
  }

  // ========== BILLING STATUS CHECKS ==========

  /**
   * Check if PI can be generated
   */
  canGeneratePI(billingStatus: string): boolean {
    const statusUpper = (billingStatus || '').toUpperCase();
    return statusUpper === 'PENDING';
  }

  /**
   * Check if Final Invoice can be generated
   */
  canGenerateInvoice(billingStatus: string, reportStatus: string): boolean {
    const billingUpper = (billingStatus || '').toUpperCase();
    const reportUpper = (reportStatus || '').toUpperCase();

    // Invoice can only be generated after report approval AND when advance is paid
    return billingUpper === BillingStatus.ADVANCE_PAID &&
           reportUpper === ReportStatus.FINAL_REPORT_APPROVED;
  }

  /**
   * Check if invoice can be sent
   */
  canSendInvoice(billingStatus: string): boolean {
    const statusUpper = (billingStatus || '').toUpperCase();
    return statusUpper === BillingStatus.PI_GENERATED ||
           statusUpper === BillingStatus.INVOICE_GENERATED;
  }

  /**
   * Check if pricing is available (read-only)
   */
  hasPricing(billingStatus: string, reportStatus: string): boolean {
    const billingUpper = (billingStatus || '').toUpperCase();
    const reportUpper = (reportStatus || '').toUpperCase();

    // Pricing is available after report approval
    return reportUpper === ReportStatus.FINAL_REPORT_APPROVED &&
           (billingUpper === BillingStatus.PRICED ||
            billingUpper === BillingStatus.PI_GENERATED ||
            billingUpper === BillingStatus.ADVANCE_PAID ||
            billingUpper === BillingStatus.INVOICE_GENERATED);
  }

  // ========== REPORT STATUS CHECKS ==========

  /**
   * Check if report can be approved
   */
  canApproveReport(status: string): boolean {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === ReportStatus.REPORT_GENERATED ||
           statusUpper === ReportStatus.REPORT_UNDER_REVIEW;
  }

  /**
   * Check if report can be rejected
   */
  canRejectReport(status: string): boolean {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === ReportStatus.REPORT_GENERATED ||
           statusUpper === ReportStatus.REPORT_UNDER_REVIEW;
  }

  /**
   * Check if PDF can be generated
   */
  canGeneratePDF(status: string): boolean {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === ReportStatus.FINAL_REPORT_APPROVED ||
           statusUpper === 'COMPLETED' ||
           statusUpper === 'APPROVED';
  }

  /**
   * Check if pricing can be viewed (read-only)
   */
  canViewPricing(status: string): boolean {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === ReportStatus.FINAL_REPORT_APPROVED ||
           statusUpper === ReportStatus.AMENDMENT_IN_PROGRESS ||
           statusUpper === ReportStatus.AMENDMENT_COMPLETED;
  }

  /**
   * Check if report can be amended
   */
  canAmendReport(status: string): boolean {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === ReportStatus.FINAL_REPORT_APPROVED ||
           statusUpper === 'COMPLETED' ||
           statusUpper === 'APPROVED' ||
           statusUpper === 'REPORT_GENERATED';
  }

  /**
   * Check if report is in amendment process
   */
  isAmendmentInProgress(status: string): boolean {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === ReportStatus.AMENDMENT_IN_PROGRESS ||
           statusUpper === ReportStatus.CUSTOMER_REQUESTED_AMENDMENT;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Normalize status string to uppercase for comparison
   */
  normalizeStatus(status: string | null | undefined): string {
    return (status || '').toUpperCase().trim();
  }

  /**
   * Check if status matches any of the provided statuses
   */
  isStatus(status: string | null | undefined, ...allowedStatuses: string[]): boolean {
    const normalized = this.normalizeStatus(status);
    return allowedStatuses.some(s => this.normalizeStatus(s) === normalized);
  }
}

