import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ToastService } from '../../../services/toast.service';
import { PermissionService } from '../../../utility/permission/permission.service';
import { SampleInwardFormComponent } from '../sample-inward-form/sample-inward-form.component';
import { PlanFormComponent } from '../../plan/plan-form/plan-form.component';
import { ReviewOfRequestFormComponent } from '../review-of-request-form/review-of-request-form.component';
import { CuttingMachiningPlanTabComponent } from '../cutting-machining-plan-tab/cutting-machining-plan-tab.component';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';

export interface StageStep {
  id: number;
  label: string;
  icon: string;
  status: 'completed' | 'active' | 'pending';
}

export interface WorkspaceTab {
  id: string;
  label: string;
  icon: string;
  permission?: string;
  isReadOnly: boolean;
  isVisible: boolean;
  isActive: boolean;
}

@Component({
  selector: 'app-case-lifecycle-workspace',
  templateUrl: './case-lifecycle-workspace.component.html',
  styleUrls: ['./case-lifecycle-workspace.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    SampleInwardFormComponent,
    PlanFormComponent,
    ReviewOfRequestFormComponent,
    CuttingMachiningPlanTabComponent,
    TestStatusBadgeComponent,
    HasPermissionDirective
  ]
})
export class CaseLifecycleWorkspaceComponent implements OnInit {
  inwardId: number = 0;
  caseInfo: any = null;
  currentStageStatus: string = '';
  activeTabId: string = 'inward';
  isLoading: boolean = false;

  stageSteps: StageStep[] = [
    { id: 1, label: 'Sample Inward',       icon: 'bi-box-seam',          status: 'pending' },
    { id: 2, label: 'Sample Plan',          icon: 'bi-clipboard-check',   status: 'pending' },
    { id: 3, label: 'Review of Request',    icon: 'bi-shield-check',      status: 'pending' },
    { id: 4, label: 'Cutting & Machining',  icon: 'bi-scissors',          status: 'pending' },
    { id: 5, label: 'Testing',              icon: 'bi-flask',             status: 'pending' },
    { id: 6, label: 'Verification & Approval', icon: 'bi-patch-check',   status: 'pending' },
    { id: 7, label: 'Report Generation',    icon: 'bi-file-earmark-text', status: 'pending' },
    { id: 8, label: 'Case Closure',         icon: 'bi-check-circle',      status: 'pending' },
  ];

  tabs: WorkspaceTab[] = [
    {
      id: 'inward',
      label: 'Customer & Company Info',
      icon: 'bi-person-lines-fill',
      permission: 'CanReadSampleInward',
      isReadOnly: false,
      isVisible: true,
      isActive: true
    },
    {
      id: 'samples',
      label: 'Sample Details',
      icon: 'bi-box-seam',
      permission: 'CanReadSampleInward',
      isReadOnly: false,
      isVisible: true,
      isActive: false
    },
    {
      id: 'plan',
      label: 'Plan',
      icon: 'bi-clipboard-check',
      permission: 'CanReadPlan',
      isReadOnly: false,
      isVisible: true,
      isActive: false
    },
    {
      id: 'review',
      label: 'Review of Request',
      icon: 'bi-shield-check',
      permission: 'CanReadReview',
      isReadOnly: false,
      isVisible: false,
      isActive: false
    },
    {
      id: 'cutting',
      label: 'Cutting & Machining Plan',
      icon: 'bi-scissors',
      permission: 'CanReadSampleCutting',
      isReadOnly: false,
      isVisible: false,
      isActive: false
    },
    {
      id: 'case',
      label: 'Case Details',
      icon: 'bi-folder2-open',
      permission: 'CanReadSampleInward',
      isReadOnly: true,
      isVisible: true,
      isActive: false
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
        this.loadCaseInfo();
      }
    });
  }

  loadCaseInfo(): void {
    this.isLoading = true;
    this.inwardService.getSampleInwardById(this.inwardId).subscribe({
      next: (data: any) => {
        this.caseInfo = data;
        this.currentStageStatus = data?.inwardStatus || data?.status || '';
        this.updateStageStepperAndTabs(this.currentStageStatus);
        this.isLoading = false;
      },
      error: () => {
        this.toast.show('Failed to load case information.', 'error');
        this.isLoading = false;
      }
    });
  }

  updateStageStepperAndTabs(status: string): void {
    const s = (status || '').toLowerCase();

    // Determine active stage index
    let activeStageIndex = 0;
    if (s.includes('plan') && !s.includes('review'))      activeStageIndex = 1;
    else if (s.includes('review'))                         activeStageIndex = 2;
    else if (s.includes('cutting') || s.includes('prep')) activeStageIndex = 3;
    else if (s.includes('test'))                           activeStageIndex = 4;
    else if (s.includes('verif') || s.includes('approv')) activeStageIndex = 5;
    else if (s.includes('report'))                         activeStageIndex = 6;
    else if (s.includes('close') || s.includes('complet'))activeStageIndex = 7;

    // Update stepper
    this.stageSteps = this.stageSteps.map((step, i) => ({
      ...step,
      status: i < activeStageIndex ? 'completed'
             : i === activeStageIndex ? 'active'
             : 'pending'
    }));

    // Update tab visibility & read-only based on stage and permissions
    const canManageReview   = this.permissionService.has('CanManageReview');
    const canManageCutting  = this.permissionService.has('CanManageSampleCutting');
    const canManageReviewOrCutting = canManageReview || canManageCutting;

    this.tabs = this.tabs.map(tab => {
      let isVisible = tab.isVisible;
      let isReadOnly = tab.isReadOnly;

      switch (tab.id) {
        case 'inward':
        case 'samples':
          isVisible = this.permissionService.has('CanReadSampleInward');
          isReadOnly = activeStageIndex >= 2; // Read-only once past inward stage
          break;
        case 'plan':
          isVisible = this.permissionService.has('CanReadPlan');
          // Plan is editable for frontdesk (stage 0,1) and reviewer (stage 2)
          isReadOnly = activeStageIndex > 2;
          break;
        case 'review':
          isVisible = canManageReview && activeStageIndex >= 2;
          isReadOnly = activeStageIndex > 2;
          break;
        case 'cutting':
          isVisible = canManageReviewOrCutting && activeStageIndex >= 2;
          isReadOnly = activeStageIndex > 3;
          break;
        case 'case':
          isVisible = this.permissionService.has('CanReadSampleInward');
          isReadOnly = true;
          break;
      }

      return { ...tab, isVisible, isReadOnly };
    });

    // Set first visible tab as active
    const firstVisible = this.tabs.find(t => t.isVisible);
    if (firstVisible) {
      this.setActiveTab(firstVisible.id);
    }
  }

  setActiveTab(tabId: string): void {
    this.activeTabId = tabId;
    this.tabs = this.tabs.map(t => ({ ...t, isActive: t.id === tabId }));
  }

  get visibleTabs(): WorkspaceTab[] {
    return this.tabs.filter(t => t.isVisible);
  }

  getActiveTab(): WorkspaceTab | undefined {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  isTabReadOnly(tabId: string): boolean {
    return this.tabs.find(t => t.id === tabId)?.isReadOnly ?? false;
  }

  getStepConnectorClass(stepIndex: number): string {
    const currentStep = this.stageSteps[stepIndex];
    const nextStep = this.stageSteps[stepIndex + 1];
    if (currentStep?.status === 'completed') return 'connector completed';
    if (currentStep?.status === 'active' && nextStep) return 'connector active';
    return 'connector pending';
  }

  navigateToCaseList(): void {
    this.router.navigate(['/sample/inward']);
  }
}
