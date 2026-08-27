import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ToastService } from '../../../services/toast.service';
import { PermissionService } from '../../../utility/permission/permission.service';
import { SampleInwardFormComponent } from '../sample-inward-form/sample-inward-form.component';
import { ReviewOfRequestFormComponent } from '../review-of-request-form/review-of-request-form.component';
import { CuttingMachiningPlanTabComponent } from '../cutting-machining-plan-tab/cutting-machining-plan-tab.component';
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
    CuttingMachiningPlanTabComponent,
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

    // Map InwardStatus to the 7-step index (0-based)
    let activeStageIndex = 0;
    if (s.includes('PLAN') || s.includes('REVIEW')) {
      activeStageIndex = 1; // 2. Review & Plan
    } else if (s.includes('PREP') || s.includes('CUTTING') || s.includes('MACHINING')) {
      activeStageIndex = 2; // 3. Preparation
    } else if (s.includes('TEST') || s.includes('VERIF')) {
      activeStageIndex = 3; // 4. Testing
    } else if (s.includes('REPORT') || s.includes('DISPATCH')) {
      activeStageIndex = 4; // 5. Reporting
    } else if (s.includes('INVOICE') || s.includes('ACCOUNT') || s.includes('BILLING')) {
      activeStageIndex = 5; // 6. Accounts
    } else if (s.includes('CLOSE') || s.includes('COMPLET')) {
      activeStageIndex = 6; // 7. Close
    }

    // Check if preparation is required across all samples (or active stage is preparation)
    const isPrepRequired = s.includes('PREP') || s.includes('CUTTING') || s.includes('MACHINING') || (this.lifecycleSummary?.samples?.some((sm: any) => sm.preparationRequired || sm.machiningRequired) ?? false);

    this.stages = this.stages.map((stage, i) => {
      let stageStatus: 'completed' | 'active' | 'pending' | 'na' = 'pending';
      let isAccessible = false;
      let isReadOnly = false;
      let completedOn = null;
      let completedBy = null;
      let naReason: string | undefined = undefined;

      // Check for Preparation N/A condition (only if not required and case is already beyond prep or at planning without prep)
      if (stage.id === 'preparation' && !isPrepRequired && activeStageIndex !== 2 && (this.lifecycleSummary?.samples?.length ?? 0) > 0) {
        stageStatus = 'na';
        naReason = 'No cutting or machining required for any sample in this case';
        isAccessible = false;
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
        // Allow accounts to be accessible if permitted
        isAccessible = stage.id === 'accounts';
        isReadOnly = false;
      }

      // Check dates / actors from caseInfo / summary
      if (stage.id === 'inward') {
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

    // Default to the active stage if first load and on overview
    if (this.activeStageId === 'overview' && !this.selectedSampleId) {
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
            if (s.includes('PREP') || s.includes('CUTTING') || s.includes('MACHINING')) {
              this.activeStageId = 'preparation';
              this.activeInlineAction = 'preparation';
            } else if (s.includes('TEST') || s.includes('VERIF')) {
              this.activeStageId = 'testing';
              this.activeInlineAction = 'testing';
            }
          },
          error: () => {
            this.updateLifecycleStages(this.currentStageStatus);
            this.activeStageId = 'preparation';
            this.activeInlineAction = 'preparation';
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
