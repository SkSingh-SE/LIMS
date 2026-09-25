import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ToastService } from '../../../services/toast.service';
import { PermissionService } from '../../../utility/permission/permission.service';
import { SampleInwardFormComponent } from '../sample-inward-form/sample-inward-form.component';
import { ReviewOfRequestFormComponent } from '../review-of-request-form/review-of-request-form.component';
import { CuttingMachiningPlanTabComponent } from '../cutting-machining-plan-tab/cutting-machining-plan-tab.component';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';
import { CaseSampleSelectorComponent } from './case-sample-selector/case-sample-selector.component';
import { TestResultEntryFormComponent } from '../../TestResult/test-result-entry-form/test-result-entry-form.component';
import { ReportingPreviewComponent } from '../../report/reporting-preview/reporting-preview.component';

export interface LifecycleStage {
  id: string; // 'inward' | 'review-plan' | 'preparation' | 'testing' | 'reporting' | 'accounts' | 'close'
  stepNumber: number;
  label: string;
  shortLabel: string;
  icon: string;
  status: 'completed' | 'active' | 'pending' | 'na';
  isReadOnly: boolean;
  isAccessible: boolean;
  permission?: string;
  
  // Tooltip / Popover details
  statusDescription: string;
  completedOn?: string | Date | null;
  completedBy?: string | null;
  startedOn?: string | Date | null;
  dependencyText?: string;
  naReason?: string;
  pendingAction?: string;
}

@Component({
  selector: 'app-case-lifecycle-workspace',
  standalone: true,
  templateUrl: './case-lifecycle-workspace.component.html',
  styleUrls: ['./case-lifecycle-workspace.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SampleInwardFormComponent,
    ReviewOfRequestFormComponent,
    CuttingMachiningPlanTabComponent,
    TestStatusBadgeComponent,
    CaseSampleSelectorComponent,
    TestResultEntryFormComponent,
    ReportingPreviewComponent
  ]
})
export class CaseLifecycleWorkspaceComponent implements OnInit {
  inwardId: number = 0;
  caseInfo: any = null;
  lifecycleSummary: any = null;
  currentStageStatus: string = '';
  activeStageId: string = 'overview';
  isLoading: boolean = false;

  userExplicitlySelectedTab: boolean = false;

  // Selected sample & inline active form state
  selectedSampleId: number | null = null;
  activeInlineAction: string | null = null;

  // Hover Tooltip / Popover State
  hoveredStage: LifecycleStage | null = null;
  tooltipPos: { x: number; y: number } | null = null;

  stages: LifecycleStage[] = [
    {
      id: 'inward',
      stepNumber: 1,
      label: 'Inward',
      shortLabel: 'Inward',
      icon: 'bi-box-seam',
      status: 'completed',
      isReadOnly: false,
      isAccessible: true,
      permission: 'CanReadSampleInward',
      statusDescription: 'Sample Inward Registration',
      pendingAction: 'View / Edit Sample Receipt Details'
    },
    {
      id: 'review-plan',
      stepNumber: 2,
      label: 'Review & Plan',
      shortLabel: 'Review',
      icon: 'bi-shield-check',
      status: 'active',
      isReadOnly: false,
      isAccessible: true,
      permission: 'CanReadReview',
      statusDescription: 'Technical Review & Test Planning',
      pendingAction: 'Configure Test Plan & Review Feasibility'
    },
    {
      id: 'preparation',
      stepNumber: 3,
      label: 'Preparation',
      shortLabel: 'Prep',
      icon: 'bi-tools',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadSampleInward',
      statusDescription: 'Sample Cutting & Machining',
      dependencyText: 'Review of Request must be approved & locked',
      pendingAction: 'Record cutting & machining dimensions'
    },
    {
      id: 'testing',
      stepNumber: 4,
      label: 'Testing',
      shortLabel: 'Testing',
      icon: 'bi-flask',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadTestResult',
      statusDescription: 'Test Execution & Parameter Entry',
      dependencyText: 'Sample preparation & review completion',
      pendingAction: 'Enter test observations and results'
    },
    {
      id: 'reporting',
      stepNumber: 5,
      label: 'Reporting',
      shortLabel: 'Reports',
      icon: 'bi-file-earmark-text',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadReport',
      statusDescription: 'QuestPDF Report & Approvals',
      dependencyText: 'All test results must be completed & verified',
      pendingAction: 'Generate and approve test report'
    },
    {
      id: 'accounts',
      stepNumber: 6,
      label: 'Accounts',
      shortLabel: 'Accounts',
      icon: 'bi-receipt',
      status: 'pending',
      isReadOnly: false,
      isAccessible: true,
      permission: 'CanReadAccount',
      statusDescription: 'Billing, Invoices & Payment',
      pendingAction: 'Generate Proforma/Tax Invoice and reconcile payment'
    },
    {
      id: 'close',
      stepNumber: 7,
      label: 'Close',
      shortLabel: 'Close',
      icon: 'bi-check2-circle',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadAccount',
      statusDescription: 'Formal Case Closure',
      dependencyText: 'Report dispatched & payment reconciled',
      pendingAction: 'Close case lifecycle'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inwardService: SampleInwardService,
    private toast: ToastService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.inwardId = Number(params.get('id'));
      if (this.inwardId > 0) {
        const queryTab = this.route.snapshot.queryParamMap.get('tab');
        if (queryTab) {
          this.activeStageId = queryTab;
          this.userExplicitlySelectedTab = true;
        }
        this.loadCaseData();
      }
    });
  }

  loadCaseData(): void {
    this.isLoading = true;
    
    // Load basic details & lifecycle summary in parallel
    this.inwardService.getSampleInwardById(this.inwardId).subscribe({
      next: (data: any) => {
        this.caseInfo = data;
        this.currentStageStatus = data?.inwardStatus || data?.status || '';
        this.updateLifecycleStages(this.currentStageStatus);
        this.isLoading = false;
      },
      error: () => {
        this.toast.show('Failed to load case information.', 'error');
        this.isLoading = false;
      }
    });

    this.inwardService.getLifecycleSummary(this.inwardId).subscribe({
      next: (summary: any) => {
        this.lifecycleSummary = summary;
        if (summary?.inwardStatus) {
          this.currentStageStatus = summary.inwardStatus;
          this.updateLifecycleStages(this.currentStageStatus);
        }
      },
      error: () => {
        // Fallback gracefully
      }
    });
  }

  updateLifecycleStages(status: string): void {
    const s = (status || '').toUpperCase().trim();
    const isClosed = this.lifecycleSummary?.isClosed || s === 'CASE_CLOSED' || s === 'CLOSED';

    // 1. Check if preparation is required across all samples
    const samples = this.lifecycleSummary?.samples || [];
    const hasSamples = samples.length > 0;
    const isPrepRequired = samples.some(
      (sm: any) => sm.preparationRequired || sm.machiningRequired || sm.preparationStatus === 'In Progress' || sm.preparationStatus === 'Completed'
    );

    // 2. Accurate Stage Index Determination (0 to 6)
    let activeStageIndex = 0;

    if (isClosed) {
      activeStageIndex = 6; // 6 = Close
    } else if (
      s === 'SAMPLE_INWARD_REGISTERED' ||
      s === 'NOT_STARTED' ||
      s === 'AWAITING_MISSING_INFORMATION' ||
      s === 'REGISTERED' ||
      !s
    ) {
      activeStageIndex = 0; // 0 = Inward
    } else if (
      s === 'INWARD_COMPLETED' ||
      s === 'UNDER_PLANNING' ||
      s === 'UNDER_REVIEW' ||
      s === 'UNDER_REVIEW_REQUEST' ||
      s === 'REQUEST_REJECTED'
    ) {
      activeStageIndex = 1; // 1 = Review & Plan
    } else if (
      s === 'REQUEST_APPROVED' ||
      s === 'REVIEW_COMPLETED' ||
      s === 'PLAN_APPROVED'
    ) {
      // Review is approved — move to prep if required, otherwise testing
      activeStageIndex = isPrepRequired ? 2 : 3;
    } else if (
      s === 'PREPARATION_REQUIRED' ||
      s === 'PREPARATION_IN_PROGRESS' ||
      s === 'SAMPLE_UNDER_PREPARATION' ||
      s === 'CUTTING_IN_PROGRESS' ||
      s === 'MACHINING_IN_PROGRESS'
    ) {
      activeStageIndex = 2; // 2 = Preparation
    } else if (
      s === 'PREPARATION_COMPLETED' ||
      s === 'UNDER_TESTING' ||
      s === 'TESTING_IN_PROGRESS' ||
      s === 'TESTING_UNDER_VERIFICATION' ||
      s === 'TESTING_VERIFICATION_REJECTED' ||
      s === 'TESTING_VERIFIED'
    ) {
      activeStageIndex = 3; // 3 = Testing
    } else if (
      s === 'TESTING_COMPLETED'
    ) {
      if (hasSamples && samples.every((sm: any) => sm.isTestingCompleted || sm.testResultStatus === 'Completed' || sm.testResultStatus === 'Verified')) {
        activeStageIndex = 4; // 4 = Reporting
      } else {
        activeStageIndex = 3; // 3 = Testing
      }
    } else if (
      s === 'REPORT_GENERATION_IN_PROGRESS' ||
      s === 'REPORT_GENERATED' ||
      s === 'REPORT_UNDER_REVIEW' ||
      s === 'REPORT_REJECTED_BY_INTERNAL' ||
      s === 'REPORT_AMENDED_BY_INTERNAL' ||
      s === 'REPORT_AMENDMENT_APPROVED' ||
      s === 'REPORT_SENT_FOR_CUSTOMER_REVIEW' ||
      s === 'CUSTOMER_REQUESTED_AMENDMENT' ||
      s === 'AMENDMENT_IN_PROGRESS' ||
      s === 'AMENDMENT_COMPLETED'
    ) {
      activeStageIndex = 4; // 4 = Reporting
    } else if (
      s === 'FINAL_REPORT_APPROVED' ||
      s === 'REPORT_DISPATCHED'
    ) {
      if (this.lifecycleSummary?.hasTaxInvoice || this.lifecycleSummary?.balanceDueAmount === 0) {
        activeStageIndex = 6; // Close
      } else {
        activeStageIndex = 5; // Accounts
      }
    } else if (
      s === 'PI_GENERATED' ||
      s === 'ADVANCE_PAYMENT_PENDING' ||
      s === 'ADVANCE_PAYMENT_COMPLETED' ||
      s === 'PAYMENT_PENDING' ||
      s === 'PAYMENT_COMPLETED' ||
      s === 'INVOICE_GENERATED' ||
      s === 'TAX_INVOICE_GENERATED' ||
      s.includes('INVOICE') ||
      s.includes('BILLING')
    ) {
      activeStageIndex = 5; // 5 = Accounts
    } else if (s === 'CASE_CLOSED' || s === 'CLOSED' || s === 'READY_FOR_CLOSURE') {
      activeStageIndex = 6; // 6 = Close
    } else {
      // Fallback heuristics: check sample-level progress
      if (hasSamples && samples.every((sm: any) => sm.reportStatus === 'Dispatched' || sm.reportStatus === 'Approved')) {
        activeStageIndex = 5;
      } else if (hasSamples && samples.every((sm: any) => sm.isTestingCompleted || sm.testResultStatus === 'Verified')) {
        activeStageIndex = 4;
      } else if (hasSamples && samples.some((sm: any) => sm.testResultStatus === 'In Progress' || sm.testResultStatus === 'UNDER_TESTING')) {
        activeStageIndex = 3;
      } else if (isPrepRequired && samples.some((sm: any) => sm.preparationStatus === 'In Progress')) {
        activeStageIndex = 2;
      } else if (this.lifecycleSummary?.reviewStatus === 'Approved') {
        activeStageIndex = isPrepRequired ? 2 : 3;
      } else {
        activeStageIndex = 1; // Default to Review & Plan once inward is completed
      }
    }

    this.stages = this.stages.map((stage, i) => {
      let stageStatus: 'completed' | 'active' | 'pending' | 'na' = 'pending';
      let isAccessible = false;
      let isReadOnly = false;
      let completedOn = null;
      let completedBy = null;
      let naReason: string | undefined = undefined;

      // Handle Preparation N/A
      if (stage.id === 'preparation' && !isPrepRequired && activeStageIndex !== 2) {
        stageStatus = 'na';
        naReason = 'No cutting or machining required for any sample in this case';
        isAccessible = false;
        isReadOnly = true;
      } else if (i < activeStageIndex) {
        stageStatus = 'completed';
        isAccessible = true;
        isReadOnly = true;
      } else if (i === activeStageIndex) {
        stageStatus = 'active';
        isAccessible = true;
        isReadOnly = false;
      } else {
        stageStatus = 'pending';
        // Accounts is always accessible if permitted
        isAccessible = stage.id === 'accounts';
        isReadOnly = false;
      }

      // Check dates / actors from caseInfo / summary
      if (stage.id === 'inward') {
        if (activeStageIndex >= 1) {
          stageStatus = 'completed';
          isAccessible = true;
        }
        completedOn = this.caseInfo?.collectionTime || this.caseInfo?.createdOn;
        completedBy = this.caseInfo?.createdBy;
      } else if (stage.id === 'review-plan' && (stageStatus === 'completed' || activeStageIndex > 1)) {
        completedOn = this.caseInfo?.reviewedOn;
        completedBy = this.caseInfo?.reviewedBy;
      }

      return {
        ...stage,
        status: stageStatus,
        isAccessible,
        isReadOnly,
        completedOn,
        completedBy,
        naReason
      };
    });

    // Default to active stage or overview on first load if user hasn't explicitly clicked a tab
    if (!this.userExplicitlySelectedTab && !this.selectedSampleId) {
      const activeStage = this.stages.find(st => st.status === 'active');
      if (activeStage) {
        this.activeStageId = activeStage.id;
      }
    }
  }

  onReviewCompleted(res?: any): void {
    this.inwardService.getSampleInwardById(this.inwardId).subscribe({
      next: (data: any) => {
        this.caseInfo = data;
        this.currentStageStatus = data?.inwardStatus || data?.status || res?.status || 'REQUEST_APPROVED';

        this.inwardService.getLifecycleSummary(this.inwardId).subscribe({
          next: (summary: any) => {
            this.lifecycleSummary = summary;
            if (summary?.inwardStatus) {
              this.currentStageStatus = summary.inwardStatus;
            }
            this.updateLifecycleStages(this.currentStageStatus);

            // Auto-navigate to the next active stage
            const activeStage = this.stages.find(st => st.status === 'active');
            if (activeStage) {
              this.activeStageId = activeStage.id;
              this.activeInlineAction = activeStage.id;
            }
          },
          error: () => {
            this.updateLifecycleStages(this.currentStageStatus);
            const activeStage = this.stages.find(st => st.status === 'active');
            if (activeStage) {
              this.activeStageId = activeStage.id;
              this.activeInlineAction = activeStage.id;
            }
          }
        });
      }
    });
  }

  onPrepCompleted(): void {
    this.inwardService.getSampleInwardById(this.inwardId).subscribe({
      next: (data: any) => {
        this.caseInfo = data;
        this.currentStageStatus = data?.inwardStatus || data?.status || 'UNDER_TESTING';

        this.inwardService.getLifecycleSummary(this.inwardId).subscribe({
          next: (summary: any) => {
            this.lifecycleSummary = summary;
            if (summary?.inwardStatus) {
              this.currentStageStatus = summary.inwardStatus;
            }
            this.updateLifecycleStages(this.currentStageStatus);
            this.activeStageId = 'testing';
            this.activeInlineAction = 'testing';
          },
          error: () => {
            this.updateLifecycleStages(this.currentStageStatus);
            this.activeStageId = 'testing';
            this.activeInlineAction = 'testing';
          }
        });
      }
    });
  }

  selectStage(stageId: string): void {
    this.userExplicitlySelectedTab = true;
    if (stageId === 'overview') {
      this.activeStageId = 'overview';
      return;
    }

    const stage = this.stages.find(s => s.id === stageId);
    if (!stage) return;

    if (!stage.isAccessible && stage.status !== 'completed' && stage.status !== 'active') {
      this.toast.show(`Stage "${stage.label}" is locked. Prerequisite workflow stages must be completed first.`, 'warning');
      return;
    }

    if (stage.permission && !this.permissionService.has(stage.permission)) {
      this.toast.show(`You do not have permission to access ${stage.label}.`, 'error');
      return;
    }

    this.activeStageId = stageId;
    this.activeInlineAction = stageId;
  }

  getActiveStage(): LifecycleStage | undefined {
    return this.stages.find(s => s.id === this.activeStageId);
  }

  isStageReadOnly(stageId: string): boolean {
    return this.stages.find(s => s.id === stageId)?.isReadOnly ?? false;
  }

  showStageTooltip(stage: LifecycleStage, event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (target) {
      const rect = target.getBoundingClientRect();
      this.tooltipPos = {
        x: Math.max(10, rect.left + rect.width / 2 - 110),
        y: rect.bottom + 8
      };
    }
    this.hoveredStage = stage;
  }

  hideStageTooltip(): void {
    this.hoveredStage = null;
    this.tooltipPos = null;
  }

  getStageStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Completed';
      case 'active': return 'In Progress';
      case 'pending': return 'Pending';
      case 'na': return 'Not Applicable';
      default: return status;
    }
  }

  getStageBadgeClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-success text-white';
      case 'active': return 'bg-danger text-white';
      case 'pending': return 'bg-secondary-subtle text-secondary border';
      case 'na': return 'bg-light text-muted border';
      default: return 'bg-secondary';
    }
  }

  onSampleAction(event: { sampleId: number; action: string }): void {
    this.selectedSampleId = event.sampleId;
    this.activeInlineAction = event.action;
    this.userExplicitlySelectedTab = true;
    if (event.action === 'inward' || event.action === 'review-plan' || event.action === 'preparation' || event.action === 'testing' || event.action === 'reporting') {
      this.activeStageId = event.action;
    }
  }

  onTestingSaved(): void {
    this.loadCaseData();
  }

  onTestingCompleted(): void {
    this.loadCaseData();
    this.toast.show('Test results updated successfully.', 'success');
  }

  onReportActionCompleted(): void {
    this.loadCaseData();
    this.toast.show('Report status updated successfully.', 'success');
  }

  onCloseInlineForm(): void {
    this.selectedSampleId = null;
    this.activeInlineAction = null;
  }

  getSelectedSample(): any {
    if (!this.selectedSampleId || !this.lifecycleSummary?.samples) return null;
    return this.lifecycleSummary.samples.find((s: any) => s.sampleId === this.selectedSampleId);
  }

  navigateToCaseList(): void {
    this.router.navigate(['/sample/inward']);
  }
}
