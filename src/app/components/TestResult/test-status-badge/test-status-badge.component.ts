import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Unified status badge component — used across 9+ list views.
 * Every status has a UNIQUE color so users can distinguish them at a glance.
 *
 * Usage: <app-test-status-badge [status]="item.status"></app-test-status-badge>
 */
@Component({
  selector: 'app-test-status-badge',
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngStyle]="getStyle()">
      {{ getDisplayLabel() }}
    </span>
  `,
  styles: [`
    .status-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-block;
      white-space: nowrap;
      letter-spacing: 0.2px;
    }
  `]
})
export class TestStatusBadgeComponent {
  @Input() status: string = 'Pending';

  // bg = background, fg = text color
  private static readonly statusMap: Record<string, { bg: string; fg: string; label: string }> = {

    // ==================== InwardStatus ====================
    'NOT_STARTED':                    { bg: '#E0E0E0', fg: '#616161', label: 'Not Started' },
    'INWARD_REGISTERED':              { bg: '#B3E5FC', fg: '#01579B', label: 'Inward Registered' },
    'INWARD_COMPLETED':               { bg: '#C8E6C9', fg: '#1B5E20', label: 'Inward Completed' },
    'UNDER_PLANNING':                 { bg: '#FFF9C4', fg: '#F57F17', label: 'Under Planning' },
    'UNDER_REVIEW':                   { bg: '#FFE0B2', fg: '#E65100', label: 'Under Review' },
    'REVIEW_COMPLETED':               { bg: '#26A69A', fg: '#FFFFFF', label: 'Review Completed' },
    'IN_PROGRESS':                    { bg: '#BBDEFB', fg: '#0D47A1', label: 'In Progress' },
    'PARTIALLY_COMPLETED':            { bg: '#FFE082', fg: '#FF6F00', label: 'Partially Completed' },
    'COMPLETED':                      { bg: '#A5D6A7', fg: '#1B5E20', label: 'Completed' },
    'REJECTED':                       { bg: '#FFCDD2', fg: '#B71C1C', label: 'Rejected' },
    'CANCELLED':                      { bg: '#CFD8DC', fg: '#263238', label: 'Cancelled' },

    // ==================== SampleStatus — Inward ====================
    'SAMPLE_INWARD_REGISTERED':       { bg: '#D1C4E9', fg: '#4527A0', label: 'Sample Registered' },
    'AWAITING_MISSING_INFORMATION':   { bg: '#FFCCBC', fg: '#BF360C', label: 'Awaiting Info' },

    // ==================== SampleStatus — Review ====================
    'UNDER_REVIEW_REQUEST':           { bg: '#FFE0B2', fg: '#E65100', label: 'Under Review' },
    'REQUEST_REJECTED':               { bg: '#EF9A9A', fg: '#C62828', label: 'Request Rejected' },
    'REQUEST_APPROVED':               { bg: '#81C784', fg: '#1B5E20', label: 'Request Approved' },

    // ==================== SampleStatus — Preparation ====================
    'PREPARATION_REQUIRED':           { bg: '#F8BBD0', fg: '#880E4F', label: 'Preparation Required' },
    'PREPARATION_IN_PROGRESS':        { bg: '#F48FB1', fg: '#880E4F', label: 'Preparation In Progress' },
    'PREPARATION_COMPLETED':          { bg: '#CE93D8', fg: '#4A148C', label: 'Preparation Completed' },

    // ==================== SampleStatus — PI & Advance ====================
    'PI_GENERATED':                   { bg: '#80DEEA', fg: '#006064', label: 'PI Generated' },
    'ADVANCE_PAYMENT_PENDING':        { bg: '#FFAB91', fg: '#BF360C', label: 'Advance Pending' },
    'ADVANCE_PAYMENT_COMPLETED':      { bg: '#80CBC4', fg: '#004D40', label: 'Advance Paid' },

    // ==================== SampleStatus — TPI ====================
    'TPI_WAITING_FOR_AGENT':          { bg: '#E1BEE7', fg: '#6A1B9A', label: 'TPI Waiting' },
    'TPI_IN_PROGRESS':                { bg: '#CE93D8', fg: '#4A148C', label: 'TPI In Progress' },
    'TPI_COMPLETED':                  { bg: '#B39DDB', fg: '#311B92', label: 'TPI Completed' },

    // ==================== SampleStatus — Testing ====================
    'TESTING_IN_PROGRESS':            { bg: '#90CAF9', fg: '#0D47A1', label: 'Testing In Progress' },
    'TESTING_COMPLETED':              { bg: '#66BB6A', fg: '#FFFFFF', label: 'Testing Completed' },

    // ==================== SampleStatus — Verification ====================
    'TESTING_UNDER_VERIFICATION':     { bg: '#FFF176', fg: '#F57F17', label: 'Under Verification' },
    'TESTING_VERIFICATION_REJECTED':  { bg: '#E57373', fg: '#FFFFFF', label: 'Verification Rejected' },
    'TESTING_VERIFIED':               { bg: '#4CAF50', fg: '#FFFFFF', label: 'Verified' },

    // ==================== SampleStatus — Reporting ====================
    'REPORT_GENERATION_IN_PROGRESS':  { bg: '#9FA8DA', fg: '#1A237E', label: 'Report Generating' },
    'REPORT_GENERATED':               { bg: '#7986CB', fg: '#FFFFFF', label: 'Report Generated' },
    'REPORT_UNDER_REVIEW':            { bg: '#FFD54F', fg: '#FF6F00', label: 'Report Under Review' },
    'REPORT_REJECTED_BY_INTERNAL':    { bg: '#EF5350', fg: '#FFFFFF', label: 'Report Rejected' },
    'REPORT_AMENDED_BY_INTERNAL':     { bg: '#FFB74D', fg: '#E65100', label: 'Internal Amendment' },
    'REPORT_AMENDED_REJECTED':        { bg: '#FF7043', fg: '#FFFFFF', label: 'Amendment Rejected' },
    'REPORT_AMENDMENT_APPROVED':      { bg: '#66BB6A', fg: '#FFFFFF', label: 'Amendment Approved' },

    // ==================== SampleStatus — Customer ====================
    'REPORT_SENT_FOR_CUSTOMER_REVIEW': { bg: '#4FC3F7', fg: '#01579B', label: 'Sent to Customer' },
    'CUSTOMER_REQUESTED_AMENDMENT':   { bg: '#FF8A65', fg: '#FFFFFF', label: 'Customer Amendment' },
    'AMENDMENT_IN_PROGRESS':          { bg: '#FFB300', fg: '#FFFFFF', label: 'Amendment In Progress' },
    'AMENDMENT_COMPLETED':            { bg: '#43A047', fg: '#FFFFFF', label: 'Amendment Completed' },

    // ==================== SampleStatus — Payment & Closure ====================
    'PAYMENT_PENDING':                { bg: '#FFCA28', fg: '#5D4037', label: 'Payment Pending' },
    'PAYMENT_COMPLETED':              { bg: '#2E7D32', fg: '#FFFFFF', label: 'Payment Completed' },
    'FINAL_REPORT_APPROVED':          { bg: '#388E3C', fg: '#FFFFFF', label: 'Report Approved' },
    'REPORT_DISPATCHED':              { bg: '#37474F', fg: '#FFFFFF', label: 'Dispatched' },
    'CASE_CLOSED':                    { bg: '#263238', fg: '#FFFFFF', label: 'Case Closed' },

    // ==================== SampleStatus — Cancelled ====================
    'SAMPLE_CANCELLED':               { bg: '#B0BEC5', fg: '#263238', label: 'Cancelled' },

    // ==================== TestResultHeader.Status ====================
    'Pending':                        { bg: '#EEEEEE', fg: '#616161', label: 'Pending' },
    'Started':                        { bg: '#B3E5FC', fg: '#01579B', label: 'Started' },
    'In-Progress':                    { bg: '#90CAF9', fg: '#0D47A1', label: 'In Progress' },
    'Completed':                      { bg: '#A5D6A7', fg: '#1B5E20', label: 'Completed' },
    'PendingVerification':            { bg: '#FFF176', fg: '#F57F17', label: 'Pending Verification' },
    'Verified':                       { bg: '#4CAF50', fg: '#FFFFFF', label: 'Verified' },
    'VerificationRejected':           { bg: '#E57373', fg: '#FFFFFF', label: 'Verification Rejected' },
    'Long-Term':                      { bg: '#B0BEC5', fg: '#37474F', label: 'Long-Term' },
    'Force Completed':                { bg: '#BCAAA4', fg: '#3E2723', label: 'Force Completed' },

    // ==================== ReportHeader.Status ====================
    'Report Generated':               { bg: '#7986CB', fg: '#FFFFFF', label: 'Report Generated' },
    'Under Amendment Review':         { bg: '#FFB74D', fg: '#E65100', label: 'Under Amendment Review' },
    'Send Back':                      { bg: '#FF8A65', fg: '#FFFFFF', label: 'Sent Back' },
    'Approved':                       { bg: '#388E3C', fg: '#FFFFFF', label: 'Approved' },

    // ==================== PreparationStatus ====================
    'Assigned':                       { bg: '#B3E5FC', fg: '#01579B', label: 'Assigned' },
    'InProgress':                     { bg: '#90CAF9', fg: '#0D47A1', label: 'In Progress' },
    'QCVerified':                     { bg: '#2E7D32', fg: '#FFFFFF', label: 'QC Verified' },

    // ==================== PlanStatus ====================
    'Draft':                          { bg: '#E0E0E0', fg: '#424242', label: 'Draft' },
    'Submitted':                      { bg: '#81D4FA', fg: '#01579B', label: 'Submitted' },
    'ReplanRequested':                { bg: '#FFAB91', fg: '#BF360C', label: 'Replan Requested' },

    // ==================== BillingStatus ====================
    'PRICE_DRAFTED':                  { bg: '#D7CCC8', fg: '#3E2723', label: 'Price Drafted' },
    'PRICE_SNAPSHOT':                 { bg: '#B0BEC5', fg: '#263238', label: 'Price Snapshot' },
    'INVOICE_GENERATED':              { bg: '#FFD54F', fg: '#E65100', label: 'Invoice Generated' },
    'PAYMENT_PARTIAL':                { bg: '#FFA726', fg: '#FFFFFF', label: 'Partial Payment' },
  };

  private static readonly defaultStyle = { bg: '#E0E0E0', fg: '#616161' };

  getStyle(): Record<string, string> {
    const entry = TestStatusBadgeComponent.statusMap[this.status] ?? TestStatusBadgeComponent.defaultStyle;
    return {
      'background-color': entry.bg,
      'color': entry.fg
    };
  }

  getDisplayLabel(): string {
    return TestStatusBadgeComponent.statusMap[this.status]?.label ?? this.status;
  }
}
