import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReportingService, ReportingPreview, WorkflowAction } from '../../../services/reporting.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';
import { environment } from '../../../../environments/environment';
import { StatusHelperService } from '../../../utility/status-helpers/status-helper.service';
import { RoleHelperService } from '../../../utility/role-helpers/role-helper.service';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';

@Component({
  selector: 'app-reporting-preview',
  templateUrl: './reporting-preview.component.html',
  styleUrl: './reporting-preview.component.css',
  imports: [CommonModule, RouterModule, FormsModule, TestStatusBadgeComponent, HasPermissionDirective]
})
export class ReportingPreviewComponent implements OnInit {
  baseUrl = environment.baseUrl;
  reportData: ReportingPreview | null = null;
  isLoading = signal(false);
  sampleId: string = '';

  // Collapsible sections
  expandedMechanicalTests: Set<string> = new Set();
  expandedChemicalTests: Set<string> = new Set();
  expandedLongTermTests: Set<string> = new Set();

  // Action panel
  showActionPanel = false;
  selectedAction: WorkflowAction | null = null;
  actionRemark: string = '';

  // internal flag to prevent double submits
  private submitting = false;
  pdfGenerating = false;

  // Pricing data (read-only, from backend)
  pricingData: any = null;
  hasPriceSnapshot = false;

  constructor(
    private route: ActivatedRoute,
    private reportingService: ReportingService,
    private router: Router,
    private statusHelper: StatusHelperService,
    private roleHelper: RoleHelperService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.sampleId = params.get('sampleId') || '';
      if (this.sampleId) {
        this.loadReportPreview(this.sampleId);
      }
    });
  }

  loadReportPreview(sampleId: string): void {
    this.isLoading.set(true);
    this.reportingService.getReportPreview(sampleId).subscribe({
      next: (data) => {
        this.reportData = this.normalizeReportPreview(data);
        // Extract pricing data if available (read-only after approval)
        this.pricingData = (data as any)?.pricing || (data as any)?.priceSnapshot || null;
        this.hasPriceSnapshot = !!this.pricingData || !!(data as any)?.hasPriceSnapshot || false;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading report preview:', error);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Normalize API payload so template can safely bind to properties.
   * - Ensure arrays are non-null
   * - Parse JSON strings inside long-term readings if necessary
   * - Provide sensible defaults for optional fields
   */
  private normalizeReportPreview(src: ReportingPreview): ReportingPreview {
    const dst: ReportingPreview = {
      reportHeaderId: src.reportHeaderId || '',
      workflowInstanceId: src.workflowInstanceId || '',
      sampleNo: src.sampleNo || '',
      caseNo: src.caseNo || '',
      customer: src.customer || '',
      material: src.material || '',
      condition: src.condition || '',
      reportNo: src.reportNo || '',
      status: (src.status as any) || 'Pending',
      mechanicalTests: (src.mechanicalTests || []).map(t => ({
        testResultHeaderId: (t as any).testResultHeaderId || (t as any).testId || '',
        testName: t.testName || '',
        reportNo: t.reportNo || '',
        specification1Name: t.specification1Name || '',
        specification2Name: t.specification2Name || '',
        status: (t.status as any) || 'Pending',
        parameters: (t.parameters || []).map(p => ({
          parameterID: (p as any).parameterID || (p as any).parameterId || '',
          parameterName: p.parameterName || '',
          value: p.value ?? '',
          unit: p.unit || '',
          minValue: p.minValue ?? '',
          maxValue: p.maxValue ?? '',
          isWithinLimit:  p.isWithinLimit !== undefined ? p.isWithinLimit : false,
          remarks: p.remarks || ''
        }))
      })),
      chemicalTests: (src.chemicalTests || []).map(t => ({
        testResultHeaderId: (t as any).testResultHeaderId || (t as any).testId || '',
        testName: t.testName || '',
        reportNo: t.reportNo || '',
        specification1Name: t.specification1Name || '',
        specification2Name: t.specification2Name || '',
        status: (t.status as any) || 'Pending',
        parameters: (t.parameters || []).map(p => ({
          parameterID: (p as any).parameterID || (p as any).parameterId || '',
          parameterName: p.parameterName|| '',
          value: p.value ?? '',
          unit: p.unit || '',
          minValue: p.minValue ?? '',
          maxValue: p.maxValue ?? '',
          isWithinLimit: p.isWithinLimit !== undefined ? p.isWithinLimit : false,
          remarks: p.remarks || ''
        }))
      })),
      longTermTests: (src.longTermTests || []).map(t => ({
        longTermTestId: (t as any).longTermTestId || (t as any).id || '',
        testName: t.testName || '',
        durationHours: t.durationHours ?? 0,
        startedAt: t.startedAt || '',
        endedAt: t.endedAt || undefined,
        status: (t.status as any) || 'Pending',
        parameters: (t.parameters || []).map((p: any) => ({ parameterName: p.parameterName || p.name || '', value: p.value ?? '' })),
        readings: (t.readings || []).map(r => {
          const parsed = this.safeParseReading(r.parsed);
          return {
            recordedAt: r.recordedAt  || '',
            parsed
          };
        })
      })),
      actions: src.actions || [],
      amendment: src.amendment || null
    };

    return dst;
  }

  private safeParseReading(raw: any): any {
    if (raw == null) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // not a JSON string, return raw string
        return raw;
      }
    }
    return raw;
  }

  /**
   * Extract relevant fields from parsed reading data
   * Handles both single object and array formats
   */
  extractReadingData(parsed: any): Array<{ parameterName: string; value: any; remarks: string }> {
    if (!parsed) return [];

    // If it's an array, process each item
    if (Array.isArray(parsed)) {
      return parsed.map(item => this.extractSingleReading(item)).filter(item => item !== null);
    }

    // If it's a single object, wrap in array
    const extracted = this.extractSingleReading(parsed);
    return extracted ? [extracted] : [];
  }

  private extractSingleReading(item: any): { parameterName: string; value: any; remarks: string } | null {
    if (!item || typeof item !== 'object') return null;

    return {
      parameterName: item.ParameterName || item.parameterName || '-',
      value: item.Value !== undefined ? item.Value : (item.value !== undefined ? item.value : '-'),
      remarks: item.Remarks || item.remarks || '-'
    };
  }

  goBack(): void {
    window.history.back();
  }

  // Collapsible toggle methods
  toggleMechanicalTest(testId: string): void {
    if (this.expandedMechanicalTests.has(testId)) {
      this.expandedMechanicalTests.delete(testId);
    } else {
      this.expandedMechanicalTests.add(testId);
    }
  }

  toggleChemicalTest(testId: string): void {
    if (this.expandedChemicalTests.has(testId)) {
      this.expandedChemicalTests.delete(testId);
    } else {
      this.expandedChemicalTests.add(testId);
    }
  }

  toggleLongTermTest(testId: string): void {
    if (this.expandedLongTermTests.has(testId)) {
      this.expandedLongTermTests.delete(testId);
    } else {
      this.expandedLongTermTests.add(testId);
    }
  }

  isMechanicalTestExpanded(testId: string): boolean {
    return this.expandedMechanicalTests.has(testId);
  }

  isChemicalTestExpanded(testId: string): boolean {
    return this.expandedChemicalTests.has(testId);
  }

  isLongTermTestExpanded(testId: string): boolean {
    return this.expandedLongTermTests.has(testId);
  }

  // Action handling - matches ReviewOfRequestFormComponent pattern
  submitReview(): void {
    debugger;
    if (!this.selectedAction || !this.reportData || this.submitting) return;
    const actionKey = (this.selectedAction.action || '').toString().toLowerCase();
    if (actionKey !== 'next' && !this.actionRemark) return;

    this.submitting = true;
    this.isLoading.set(true);

     const payload = {
      id: this.reportData.workflowInstanceId,
      action: this.selectedAction.action,
      remarks: this.actionRemark || ''
    };
    this.reportingService.takeWorkflowAction(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.isLoading.set(false);
        this.showActionPanel = false;
        // keep UX consistent with other screens
        alert('Action completed successfully.');
        this.router.navigate(['/reporting/dashboard']);
      },
      error: (err) => {
        this.submitting = false;
        console.error('Action failed:', err);
        this.isLoading.set(false);
        alert('Action failed. See console for details.');
      }
    });
  }



  /**
   * Check if report status allows PDF generation
   */
  canGeneratePdf(): boolean {
    if (!this.reportData) return false;
    return this.statusHelper.canGeneratePDF(this.reportData.status);
  }

  /**
   * Check if pricing can be viewed (read-only after approval)
   */
  canViewPricing(): boolean {
    if (!this.reportData) return false;
    return this.statusHelper.canViewPricing(this.reportData.status);
  }

  /**
   * Check if user can approve reports
   */
  canApproveReport(): boolean {
    return true;
    return this.roleHelper.canApproveReport();
  }

  // Expose statusHelper to template
  get statusHelperService() {
    return this.statusHelper;
  }

  /**
   * Generate PDF for the current report
   */
  generatePdf(): void {
    if (!this.reportData || this.pdfGenerating) return;

    if (!this.canGeneratePdf()) {
      alert('PDF can only be generated for approved/completed reports.');
      return;
    }

    this.pdfGenerating = true;
    this.reportingService.generateReportPdf(this.reportData.reportHeaderId).subscribe({
      next: () => {
        this.pdfGenerating = false;
        alert('PDF generated successfully.');
      },
      error: (err) => {
        this.pdfGenerating = false;
        console.error('PDF generation failed:', err);
        alert('PDF generation failed. See console for details.');
      }
    });
  }

  openFileInNewTab(filePath: string | null | undefined): void {
    if (filePath) window.open(this.baseUrl + filePath, '_blank');
  }
}
