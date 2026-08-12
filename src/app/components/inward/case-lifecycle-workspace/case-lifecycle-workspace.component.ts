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
    { id: 1, label: 'Inward',               icon: 'bi-box-seam',          status: 'pending' },
    { id: 2, label: 'Review of Request',    icon: 'bi-shield-check',      status: 'pending' },
    { id: 3, label: 'Testing',              icon: 'bi-flask',             status: 'pending' },
    { id: 4, label: 'Reporting',            icon: 'bi-file-earmark-text', status: 'pending' },
    { id: 5, label: 'Accounts & Case Close', icon: 'bi-bank',             status: 'pending' },
  ];

  tabs: WorkspaceTab[] = [
    {
      id: 'inward',
      label: '1. Inward',
      icon: 'bi-box-seam',
      permission: 'CanReadSampleInward',
      isReadOnly: false,
      isVisible: true,
      isActive: true
    },
    {
      id: 'review',
      label: '2. Review of Request',
      icon: 'bi-shield-check',
      permission: 'CanReadReview',
      isReadOnly: false,
      isVisible: true,
      isActive: false
    },
    {
      id: 'testing',
      label: '3. Testing',
      icon: 'bi-flask',
      permission: 'CanReadTestResult',
      isReadOnly: false,
      isVisible: true,
      isActive: false
    },
    {
      id: 'reporting',
      label: '4. Reporting',
      icon: 'bi-file-earmark-text',
      permission: 'CanReadReport',
      isReadOnly: false,
      isVisible: true,
      isActive: false
    },
    {
      id: 'accounts',
      label: '5. Accounts & Case Close',
      icon: 'bi-bank',
      permission: 'CanReadAccount',
      isReadOnly: false,
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

    // Determine active stage index (0-based)
    let activeStageIndex = 0;
    if (s.includes('review') || s.includes('plan') || s.includes('prep') || s.includes('cutting')) {
      activeStageIndex = 1;
    } else if (s.includes('test') || s.includes('verif')) {
      activeStageIndex = 2;
    } else if (s.includes('report') || s.includes('dispatch')) {
      activeStageIndex = 3;
    } else if (s.includes('close') || s.includes('account') || s.includes('invoice') || s.includes('complet')) {
      activeStageIndex = 4;
    }

    // Update stepper
    this.stageSteps = this.stageSteps.map((step, i) => ({
      ...step,
      status: i < activeStageIndex ? 'completed'
             : i === activeStageIndex ? 'active'
             : 'pending'
    }));

    // Update tab visibility & read-only based on stage
    this.tabs = this.tabs.map(tab => {
      let isVisible = true;
      let isReadOnly = false;

      switch (tab.id) {
        case 'inward':
          isVisible = this.permissionService.has('CanReadSampleInward');
          isReadOnly = activeStageIndex >= 1; // Read-only once moved to Review stage
          break;
        case 'review':
          isVisible = this.permissionService.has('CanReadReview') || this.permissionService.has('CanReadPlan');
          isReadOnly = activeStageIndex >= 2; // Read-only once passed verification to Testing
          break;
        case 'testing':
          isVisible = this.permissionService.has('CanReadTestResult');
          isReadOnly = activeStageIndex >= 3;
          break;
        case 'reporting':
          isVisible = this.permissionService.has('CanReadReport');
          isReadOnly = activeStageIndex >= 4;
          break;
        case 'accounts':
          isVisible = this.permissionService.has('CanReadAccount');
          isReadOnly = false;
          break;
      }

      return { ...tab, isVisible, isReadOnly };
    });

    // Set active tab if current active tab is not visible
    const currentActive = this.tabs.find(t => t.id === this.activeTabId && t.isVisible);
    if (!currentActive) {
      const firstVisible = this.tabs.find(t => t.isVisible);
      if (firstVisible) {
        this.setActiveTab(firstVisible.id);
      }
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
