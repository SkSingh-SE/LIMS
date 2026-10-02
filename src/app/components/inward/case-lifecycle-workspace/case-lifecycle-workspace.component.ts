import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ToastService } from '../../../services/toast.service';
import { PermissionService } from '../../../utility/permission/permission.service';
import { SampleInwardFormComponent } from '../sample-inward-form/sample-inward-form.component';
import { ReviewOfRequestFormComponent } from '../review-of-request-form/review-of-request-form.component';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';
import { CaseSampleSelectorComponent } from './case-sample-selector/case-sample-selector.component';

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
    SampleInwardFormComponent,
    ReviewOfRequestFormComponent,
    TestStatusBadgeComponent,
    CaseSampleSelectorComponent
  ]
})
export class CaseLifecycleWorkspaceComponent implements OnInit {
  inwardId: number = 0;
  caseInfo: any = null;
  lifecycleSummary: any = null;
  currentStageStatus: string = '';
  activeStageId: string = 'overview';
  isLoading: boolean = false;

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
      statusDescription: 'Sample Inward Registration (Customer, PO, Samples)',
      pendingAction: 'View / Edit Sample Receipt Details'
    },
    {
      id: 'plan',
      stepNumber: 2,
      label: 'Plan',
      shortLabel: 'Plan',
      icon: 'bi-clipboard-check',
      status: 'active',
      isReadOnly: false,
      isAccessible: true,
      permission: 'CanReadReview',
      statusDescription: 'Universal Test Planning (Screen 14, 12 Gates, Freeze)',
      dependencyText: 'Inward completion',
      pendingAction: 'Plan tests per sample & freeze configuration'
    },
    {
      id: 'review',
      stepNumber: 3,
      label: 'Review',
      shortLabel: 'Review',
      icon: 'bi-shield-check',
      status: 'pending',
      isReadOnly: false,
      isAccessible: true,
      permission: 'CanReadReview',
      statusDescription: 'Review of Request + Effective Config + Adjustment',
      dependencyText: 'Plan submission',
      pendingAction: 'Approve feasibility & adjustments'
    },
    {
      id: 'preparation',
      stepNumber: 4,
      label: 'Prep',
      shortLabel: 'Prep',
      icon: 'bi-scissors',
      status: 'pending',
      isReadOnly: false,
      isAccessible: true,
      permission: 'CanReadSampleInward',
      statusDescription: 'Sample Preparation (Optional Cutting/Machining)',
      dependencyText: 'Review approval',
      pendingAction: 'Complete specimen preparation if required'
    },
    {
      id: 'testing',
      stepNumber: 5,
      label: 'Execution',
      shortLabel: 'Exec',
      icon: 'bi-flask',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadTestResult',
      statusDescription: 'Test Execution (Phase 6 Snapshot Freeze + DAG)',
      dependencyText: 'Review approval',
      pendingAction: 'Enter observations & complete execution'
    },
    {
      id: 'result',
      stepNumber: 6,
      label: 'Result',
      shortLabel: 'Result',
      icon: 'bi-graph-up',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadTestResult',
      statusDescription: 'Result Evaluation & Compliance (Phase 7 DAG + MU)',
      dependencyText: 'Execution completion',
      pendingAction: 'Evaluate compliance & finalize result'
    },
    {
      id: 'verification',
      stepNumber: 7,
      label: 'Verify',
      shortLabel: 'Verify',
      icon: 'bi-patch-check',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadTestResult',
      statusDescription: 'Technical Verification Four-Eyes (Phase 8)',
      dependencyText: 'Result finalization',
      pendingAction: 'Verify result with findings lifecycle'
    },
    {
      id: 'approval',
      stepNumber: 8,
      label: 'Approval',
      shortLabel: 'Appr',
      icon: 'bi-award',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadTestResult',
      statusDescription: 'Authorized Approval (Phase 8 Signatory)',
      dependencyText: 'Verification completion',
      pendingAction: 'Approve execution for reporting'
    },
    {
      id: 'reporting',
      stepNumber: 9,
      label: 'Report',
      shortLabel: 'Report',
      icon: 'bi-file-earmark-text',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadReport',
      statusDescription: 'Report Generation & Release + Amendment (Phase 9 NABL/ULR)',
      dependencyText: 'Approval completion',
      pendingAction: 'Generate, release, dispatch & amend report'
    },
    {
      id: 'accounts',
      stepNumber: 10,
      label: 'Billing',
      shortLabel: 'Bill',
      icon: 'bi-receipt',
      status: 'pending',
      isReadOnly: false,
      isAccessible: true,
      permission: 'CanReadAccount',
      statusDescription: 'Billing & Invoice (Proforma/Tax + Payment)',
      pendingAction: 'Generate invoice and reconcile payment'
    },
    {
      id: 'close',
      stepNumber: 11,
      label: 'Dispatch',
      shortLabel: 'Close',
      icon: 'bi-check2-circle',
      status: 'pending',
      isReadOnly: false,
      isAccessible: false,
      permission: 'CanReadAccount',
      statusDescription: 'Dispatch & Case Closure',
      dependencyText: 'Report released & payment reconciled',
      pendingAction: 'Dispatch case & close lifecycle'
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
    const s = (status || '').toUpperCase();
    const sum: any = this.lifecycleSummary || {};
    const totalU: number = sum.totalUniversalTests || sum.TotalUniversalTests || 0;
    const inProg: number = sum.universalInProgressTests ?? sum.UniversalInProgressTests ?? 0;
    const comp: number = sum.universalCompletedTests ?? sum.UniversalCompletedTests ?? 0;
    const ver: number = sum.universalVerifiedTests ?? sum.UniversalVerifiedTests ?? 0;
    const appr: number = sum.universalApprovedTests ?? sum.UniversalApprovedTests ?? 0;
    const hasReleased: boolean = !!(sum.hasReleasedUniversalReport ?? sum.HasReleasedUniversalReport ?? sum.hasTaxInvoice);
    const hasInvoice: boolean = !!(sum.hasTaxInvoice ?? sum.HasTaxInvoice);
    const prepRequired: boolean = (sum.samples || []).some((x: any) => x.preparationRequired);

    // Map InwardStatus + Universal aggregates to the 11-step index (0-based, guide flow)
    let activeStageIndex = 0;
    if (s.includes('CLOSE') || s.includes('CASE_CLOSED') || s.includes('DISPATCHED')) {
      activeStageIndex = 10;
    } else if (s.includes('INVOICE') || s.includes('ACCOUNT') || s.includes('BILLING') || s.includes('PAYMENT') || (hasReleased && hasInvoice)) {
      activeStageIndex = 9;
    } else if (s.includes('REPORT') || s.includes('DISPATCH') || s.includes('RELEASED') || hasReleased) {
      activeStageIndex = 8;
    } else if (s.includes('APPROV') || appr > 0) {
      activeStageIndex = 7;
    } else if (s.includes('VERIF') || ver > 0) {
      activeStageIndex = 6;
    } else if (s.includes('RESULT') || s.includes('COMPLIANCE') || s.includes('EVALUAT') || comp > 0) {
      activeStageIndex = 5;
    } else if (s.includes('TEST') || s.includes('EXECUT') || s.includes('UNDER_TESTING') || inProg > 0) {
      activeStageIndex = 4;
    } else if (s.includes('PREP')) {
      activeStageIndex = 3;
    } else if (s.includes('REVIEW') || s.includes('UNDER_REVIEW') || s.includes('REVIEW_COMPLETED') || (totalU > 0 && (inProg + comp + ver + appr) === 0)) {
      const pendingU: number = sum.universalPendingTests ?? sum.UniversalPendingTests ?? 0;
      activeStageIndex = pendingU > 0 ? 1 : 2;
    } else if (s.includes('PLAN') || s.includes('UNDER_PLANNING') || totalU > 0) {
      activeStageIndex = 1;
    }

    this.stages = this.stages.map((stage, i) => {
      let stageStatus: 'completed' | 'active' | 'pending' | 'na' = 'pending';
      let isAccessible = false;
      let isReadOnly = false;
      let completedOn = null;
      let completedBy = null;
      let naReason: string | undefined = undefined;

      if (i < activeStageIndex) {
        stageStatus = 'completed';
        isAccessible = true;
        isReadOnly = true;
      } else if (i === activeStageIndex) {
        stageStatus = 'active';
        isAccessible = true;
        isReadOnly = false;
      } else {
        stageStatus = 'pending';
        // Allow accounts to be accessible if permitted
        isAccessible = stage.id === 'accounts';
        isReadOnly = false;
      }

      // Preparation is optional: mark N/A when no sample needs it
      if (stage.id === 'preparation' && !prepRequired && stageStatus !== 'completed') {
        stageStatus = 'na';
        isAccessible = true;
        isReadOnly = true;
        naReason = 'No sample requires cutting/machining';
      }

      // Check dates / actors from caseInfo / summary
      if (stage.id === 'inward') {
        completedOn = this.caseInfo?.collectionTime || this.caseInfo?.createdOn;
        completedBy = this.caseInfo?.createdBy;
      } else if ((stage.id === 'review' || (stage as any).id === 'review-plan') && (stageStatus === 'completed' || activeStageIndex > 2)) {
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

    // Default to the active stage if first load and on overview
    if (this.activeStageId === 'overview' && !this.selectedSampleId) {
      const activeStage = this.stages.find(st => st.status === 'active');
      if (activeStage) {
        this.activeStageId = activeStage.id;
      }
    }
  }

  openUniversalPlan(): void {
    this.router.navigate(['/sample/plan/universal', this.inwardId]);
  }

  openExecution(sample?: any): void {
    const id = sample?.latestExecutionId || sample?.latestUniversalTestGroupId;
    if (sample?.latestExecutionId) {
      this.router.navigate(['/universal-test-execution'], { queryParams: { executionId: sample.latestExecutionId } });
    } else if (sample?.latestUniversalTestGroupId) {
      this.router.navigate(['/sample/test-group', sample.latestUniversalTestGroupId]);
    } else {
      this.router.navigate(['/sample/test-groups'], { queryParams: { inwardId: this.inwardId } });
    }
  }

  openResult(sample?: any): void {
    const execId = sample?.latestExecutionId;
    if (execId) {
      this.router.navigate(['/universal-test-execution'], { queryParams: { executionId: execId, tab: 'results' } });
    } else {
      this.toast.show('No execution found for result evaluation yet.', 'warning');
    }
  }

  openVerification(sample?: any): void {
    const execId = sample?.latestExecutionId;
    if (execId) {
      this.router.navigate(['/universal-review'], { queryParams: { executionId: execId } });
    } else {
      this.toast.show('No execution found for verification yet.', 'warning');
    }
  }

  openApproval(sample?: any): void {
    const execId = sample?.latestExecutionId;
    if (execId) {
      this.router.navigate(['/universal-review'], { queryParams: { executionId: execId } });
    } else {
      this.toast.show('No execution found for approval yet.', 'warning');
    }
  }

  openReport(sample?: any): void {
    const execId = sample?.latestExecutionId;
    if (execId) {
      this.router.navigate(['/universal-report'], { queryParams: { executionId: execId } });
    } else {
      this.toast.show('No execution found for reporting yet.', 'warning');
    }
  }

  isStageReadOnlyCompat(stageId: string): boolean {
    if (stageId === 'review-plan') return this.isStageReadOnly('review');
    return this.isStageReadOnly(stageId);
  }

  onReviewCompleted(res?: any): void {
    this.inwardService.getSampleInwardById(this.inwardId).subscribe({
      next: (data: any) => {
        this.caseInfo = data;
        this.currentStageStatus = data?.inwardStatus || data?.status || res?.status || 'SAMPLE_UNDER_PREPARATION';

        this.inwardService.getLifecycleSummary(this.inwardId).subscribe({
          next: (summary: any) => {
            this.lifecycleSummary = summary;
            if (summary?.inwardStatus) {
              this.currentStageStatus = summary.inwardStatus;
            }
            this.updateLifecycleStages(this.currentStageStatus);

            // Smoothly auto-navigate to the next stage
            const s = (this.currentStageStatus || '').toUpperCase();
            if (s.includes('TEST') || s.includes('VERIF')) {
              this.activeStageId = 'testing';
              this.activeInlineAction = 'testing';
            }
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
