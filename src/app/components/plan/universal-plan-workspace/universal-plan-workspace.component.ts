import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  UniversalPlanService,
  UniversalPlanWorkspaceDto,
  UniversalTestCardDto,
  PlannedUniversalTestDto,
  UniversalPlanPreviewResponseDto,
  UniversalPlanValidationSummaryDto,
  UniversalPlanSaveDto,
  UniversalPlanConfirmDto,
  UniversalPlanTestItemDto
} from '../../../services/universal-plan.service';
import { ToastService } from '../../../services/toast.service';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';

@Component({
  selector: 'app-universal-plan-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './universal-plan-workspace.component.html',
  styleUrls: ['./universal-plan-workspace.component.css']
})
export class UniversalPlanWorkspaceComponent implements OnInit, CanComponentDeactivate {
  inwardId: number = 0;
  sampleId?: number;
  workspace: UniversalPlanWorkspaceDto | null = null;

  // Selected Global Configuration
  selectedSpecVersionId: number = 0;
  selectedBranchId: number = 1;

  // Search & Filter
  searchTerm: string = '';
  selectedDiscipline: string = 'ALL';
  disciplines: string[] = ['ALL'];

  // Planned items working collection
  plannedTests: PlannedUniversalTestDto[] = [];

  // Preview Drawer (Screen 14E)
  isPreviewDrawerOpen: boolean = false;
  activePreview: UniversalPlanPreviewResponseDto | null = null;
  activePreviewLoading: boolean = false;
  currentPreviewTestId: number = 0;
  selectedMethodVersionId?: number;

  // Validation Modal (Screen 14G)
  isValidationModalOpen: boolean = false;
  validationSummary: UniversalPlanValidationSummaryDto | null = null;
  isValidating: boolean = false;

  // Lifecycle & Guards
  isLoading: boolean = true;
  isSaving: boolean = false;
  isConfirming: boolean = false;
  isDirty: boolean = false;

  // Copy Plan Modal (P1)
  isCopyModalOpen: boolean = false;
  selectedTargetSampleIds: number[] = [];
  copyBranchId?: number;
  isCopying: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private planService: UniversalPlanService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.inwardId = +idParam;
        this.route.queryParamMap.subscribe(qParams => {
          const sParam = qParams.get('sampleId');
          this.sampleId = sParam ? +sParam : undefined;
          this.loadWorkspace();
        });
      }
    });
  }

  canDeactivate(): boolean {
    if (this.isDirty) {
      return confirm('You have unsaved changes in the universal test plan. Do you really want to leave this page?');
    }
    return true;
  }

  loadWorkspace(): void {
    this.isLoading = true;

    // Explicit sampleId enforcement: if not in URL, query inward samples first
    if (!this.sampleId) {
      this.planService.getInwardSamples(this.inwardId).subscribe({
        next: (samples) => {
          if (samples && samples.length > 0) {
            this.sampleId = samples[0].sampleID;
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { sampleId: this.sampleId },
              queryParamsHandling: 'merge',
              replaceUrl: true
            });
          } else {
            this.isLoading = false;
            this.toast.show('No active samples found for this inward case.', 'error');
          }
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || err.message || 'Failed to retrieve inward samples.';
          this.toast.show(msg, 'error');
        }
      });
      return;
    }

    this.planService.getWorkspace(this.inwardId, this.sampleId).subscribe({
      next: (ws) => {
        this.workspace = ws;
        this.selectedSpecVersionId = ws.specificationVersionID || 0;
        this.selectedBranchId = ws.branchID || 1;
        this.plannedTests = [...ws.plannedTests];

        // Extract unique disciplines for filtering
        const discSet = new Set<string>();
        ws.availableTests.forEach(t => {
          if (t.disciplineName) discSet.add(t.disciplineName);
        });
        this.disciplines = ['ALL', ...Array.from(discSet)];

        this.isLoading = false;
        this.isDirty = false;
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || err.message || 'Failed to load universal planning workspace.';
        this.toast.show(msg, 'error');
      }
    });
  }

  switchSample(newSampleId: number): void {
    if (this.sampleId === newSampleId) return;
    if (this.isDirty) {
      if (!confirm('You have unsaved changes in the current sample plan. Switch to another sample anyway?')) {
        return;
      }
    }
    this.sampleId = newSampleId;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sampleId: newSampleId },
      queryParamsHandling: 'merge'
    });
  }

  get filteredAvailableTests(): UniversalTestCardDto[] {
    if (!this.workspace) return [];
    return this.workspace.availableTests.filter(t => {
      const matchesSearch = !this.searchTerm ||
        t.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesDiscipline = this.selectedDiscipline === 'ALL' ||
        t.disciplineName === this.selectedDiscipline;

      return matchesSearch && matchesDiscipline;
    });
  }

  isTestPlanned(testId: number): boolean {
    return this.plannedTests.some(p => p.laboratoryTestID === testId && p.status !== 'Cancelled');
  }

  getPlannedItem(testId: number): PlannedUniversalTestDto | undefined {
    return this.plannedTests.find(p => p.laboratoryTestID === testId && p.status !== 'Cancelled');
  }

  onSpecVersionChange(newVersionId: number): void {
    this.selectedSpecVersionId = +newVersionId;
    this.isDirty = true;

    if (this.workspace) {
      this.workspace.specificationVersionID = this.selectedSpecVersionId;
      const opt = this.workspace.availableSpecVersions.find(v => v.id === this.selectedSpecVersionId);
      if (opt) {
        this.workspace.specificationVersionName = opt.version;
        this.workspace.isSupersededSpecVersion = opt.isSuperseded;
      }
    }

    if (this.isPreviewDrawerOpen && this.currentPreviewTestId > 0) {
      this.fetchPreview(this.currentPreviewTestId);
    }
  }

  onBranchChange(newBranchId: number): void {
    this.selectedBranchId = +newBranchId;
    this.isDirty = true;
    if (this.workspace) {
      this.workspace.branchID = this.selectedBranchId;
      const b = this.workspace.availableBranches.find(x => x.id === this.selectedBranchId);
      if (b) this.workspace.branchName = b.name;
    }

    if (this.isPreviewDrawerOpen && this.currentPreviewTestId > 0) {
      this.fetchPreview(this.currentPreviewTestId);
    }
  }

  // ────────────── Test Planning Actions ──────────────

  addTestToPlan(test: UniversalTestCardDto, isRetest: boolean = false): void {
    if (!isRetest && this.isTestPlanned(test.id)) {
      this.toast.show(`Test '${test.name}' is already in the plan. Use 'Retest' if you wish to add a duplicate repeat test.`, 'info');
      return;
    }

    // Call preview to resolve effective config for this test
    const req = {
      sampleID: this.workspace!.sampleID,
      laboratoryTestID: test.id,
      specificationHeaderID: this.workspace!.specificationHeaderID,
      specificationGradeID: this.workspace!.specificationGradeID,
      specificationVersionID: this.selectedSpecVersionId,
      branchID: this.selectedBranchId
    };

    this.planService.previewTestConfiguration(req).subscribe({
      next: (preview) => {
        const newPlannedItem: PlannedUniversalTestDto = {
          universalTestGroupID: 0,
          laboratoryTestID: test.id,
          laboratoryTestCode: test.code,
          laboratoryTestName: test.name,
          disciplineName: test.disciplineName,
          testMethodSpecificationID: preview.testMethodSpecificationID,
          testMethodName: preview.testMethodName,
          testMethodSpecificationVersionID: preview.testMethodSpecificationVersionID,
          testMethodVersion: preview.testMethodVersion,
          isSupersededMethodVersion: preview.isSupersededMethodVersion,
          specificationHeaderID: preview.specificationHeaderID,
          specificationName: preview.specificationTitle,
          specificationVersionID: preview.specificationVersionID,
          specificationVersionName: preview.specificationVersionNumber,
          specificationGradeID: preview.specificationGradeID,
          gradeName: preview.gradeName,
          branchID: preview.branchID,
          branchName: preview.branchName,
          departmentID: preview.departmentID,
          departmentName: preview.departmentName,
          status: 'Pending'
        };

        this.plannedTests.push(newPlannedItem);
        this.isDirty = true;
        this.toast.show(`Added '${test.name}' to plan.`, 'success');
      },
      error: (err) => {
        const msg = err.error?.message || err.message || `Failed to resolve configuration for '${test.name}'.`;
        this.toast.show(msg, 'error');
      }
    });
  }

  removePlannedTest(index: number): void {
    const item = this.plannedTests[index];
    if (item.status === 'Completed' || item.status === 'InProgress') {
      this.toast.show(`Cannot remove test '${item.laboratoryTestName}' because it has already started execution.`, 'error');
      return;
    }

    this.plannedTests.splice(index, 1);
    this.isDirty = true;
    this.toast.show(`Removed test from plan.`, 'info');
  }

  // ────────────── Screen 14E: Preview Drawer ──────────────

  openPreview(testId: number): void {
    this.currentPreviewTestId = testId;
    this.selectedMethodVersionId = undefined;
    this.isPreviewDrawerOpen = true;
    this.fetchPreview(testId);
  }

  fetchPreview(testId: number): void {
    if (!this.workspace) return;
    this.activePreviewLoading = true;

    const planned = this.getPlannedItem(testId);

    const req = {
      sampleID: this.workspace.sampleID,
      laboratoryTestID: testId,
      specificationHeaderID: this.workspace.specificationHeaderID,
      specificationGradeID: this.workspace.specificationGradeID,
      specificationVersionID: this.selectedSpecVersionId,
      testMethodSpecificationID: planned?.testMethodSpecificationID,
      testMethodSpecificationVersionID: this.selectedMethodVersionId || planned?.testMethodSpecificationVersionID,
      branchID: this.selectedBranchId
    };

    this.planService.previewTestConfiguration(req).subscribe({
      next: (preview) => {
        this.activePreview = preview;
        this.selectedMethodVersionId = preview.testMethodSpecificationVersionID;
        this.activePreviewLoading = false;
      },
      error: (err) => {
        this.activePreviewLoading = false;
        const msg = err.error?.message || err.message || 'Failed to preview test configuration.';
        this.toast.show(msg, 'error');
      }
    });
  }

  onMethodVersionChange(versionId: number): void {
    this.selectedMethodVersionId = +versionId;
    if (this.currentPreviewTestId > 0) {
      this.fetchPreview(this.currentPreviewTestId);

      // If this test is already in planned list, update its pinned version
      const planned = this.getPlannedItem(this.currentPreviewTestId);
      if (planned) {
        planned.testMethodSpecificationVersionID = this.selectedMethodVersionId;
        const vOpt = this.activePreview?.availableMethodVersions.find(v => v.id === this.selectedMethodVersionId);
        if (vOpt) {
          planned.testMethodVersion = vOpt.version;
          planned.isSupersededMethodVersion = vOpt.isSuperseded;
        }
        this.isDirty = true;
      }
    }
  }

  closePreviewDrawer(): void {
    this.isPreviewDrawerOpen = false;
    this.activePreview = null;
  }

  // ────────────── Screen 14G: Validation Summary ──────────────

  validatePlan(): void {
    if (!this.workspace) return;
    if (this.plannedTests.length === 0) {
      this.toast.show('Please add at least one universal test definition before validating.', 'warning');
      return;
    }

    this.isValidating = true;
    const dto = this.buildSaveDto();

    this.planService.validatePlan(dto).subscribe({
      next: (summary) => {
        this.validationSummary = summary;
        this.isValidating = false;
        this.isValidationModalOpen = true;
      },
      error: (err) => {
        this.isValidating = false;
        const msg = err.error?.message || err.message || 'Validation check failed.';
        this.toast.show(msg, 'error');
      }
    });
  }

  closeValidationModal(): void {
    this.isValidationModalOpen = false;
  }

  // ────────────── Screen 14I: Action Bar Operations ──────────────

  saveDraft(): void {
    if (!this.workspace) return;
    this.isSaving = true;

    const dto = this.buildSaveDto();

    this.planService.saveDraftPlan(dto).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.isDirty = false;
        this.toast.show(res.message || 'Plan draft saved successfully.', 'success');
        this.loadWorkspace();
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err.error?.message || err.message || 'Failed to save plan draft.';
        this.toast.show(msg, 'error');
      }
    });
  }

  confirmAndCreateGroups(): void {
    if (!this.workspace) return;
    if (this.plannedTests.length === 0) {
      this.toast.show('Please select at least one test definition to plan.', 'warning');
      return;
    }

    if (!confirm('Are you sure you want to confirm this plan and generate Universal Test Groups?')) {
      return;
    }

    this.isConfirming = true;
    const dto = this.buildConfirmDto();

    this.planService.createTestGroups(dto).subscribe({
      next: (res) => {
        this.isConfirming = false;
        this.isDirty = false;
        this.toast.show(res.message || 'Universal test groups created successfully.', 'success');
        this.loadWorkspace();
      },
      error: (err) => {
        this.isConfirming = false;
        const msg = err.error?.message || err.message || 'Failed to confirm plan and create test groups.';
        this.toast.show(msg, 'error');
      }
    });
  }

  private buildSaveDto(): UniversalPlanSaveDto {
    const tests: UniversalPlanTestItemDto[] = this.plannedTests.map(p => ({
      universalTestGroupID: p.universalTestGroupID > 0 ? p.universalTestGroupID : undefined,
      laboratoryTestID: p.laboratoryTestID,
      testMethodSpecificationID: p.testMethodSpecificationID,
      testMethodSpecificationVersionID: p.testMethodSpecificationVersionID,
      specificationHeaderID: p.specificationHeaderID,
      specificationGradeID: p.specificationGradeID,
      specificationVersionID: p.specificationVersionID,
      branchID: p.branchID || this.selectedBranchId,
      isRetest: false
    }));

    return {
      sampleTestPlanID: this.workspace!.sampleTestPlanID,
      sampleID: this.workspace!.sampleID,
      branchID: this.selectedBranchId,
      specificationHeaderID: this.workspace!.specificationHeaderID,
      specificationGradeID: this.workspace!.specificationGradeID,
      specificationVersionID: this.selectedSpecVersionId,
      tests: tests
    };
  }

  private buildConfirmDto(): UniversalPlanConfirmDto {
    const tests: UniversalPlanTestItemDto[] = this.plannedTests.map(p => ({
      universalTestGroupID: p.universalTestGroupID > 0 ? p.universalTestGroupID : undefined,
      laboratoryTestID: p.laboratoryTestID,
      testMethodSpecificationID: p.testMethodSpecificationID,
      testMethodSpecificationVersionID: p.testMethodSpecificationVersionID,
      specificationHeaderID: p.specificationHeaderID,
      specificationGradeID: p.specificationGradeID,
      specificationVersionID: p.specificationVersionID,
      branchID: p.branchID || this.selectedBranchId,
      isRetest: false
    }));

    return {
      sampleTestPlanID: this.workspace!.sampleTestPlanID,
      sampleID: this.workspace!.sampleID,
      branchID: this.selectedBranchId,
      specificationHeaderID: this.workspace!.specificationHeaderID,
      specificationGradeID: this.workspace!.specificationGradeID,
      specificationVersionID: this.selectedSpecVersionId,
      tests: tests
    };
  }

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/sample/plan']);
  }

  // ────────────── Copy Plan (P1) ──────────────
  get copyableTargetSamples() {
    if (!this.workspace?.availableSamples) return [];
    return this.workspace.availableSamples.filter(s => s.sampleID !== this.workspace?.sampleID);
  }

  openCopyPlanModal(): void {
    if (!this.workspace || this.plannedTests.length === 0) {
      this.toast.show('There are no planned tests on this sample to copy.', 'warning');
      return;
    }
    this.selectedTargetSampleIds = [];
    this.copyBranchId = this.selectedBranchId;
    this.isCopyModalOpen = true;
  }

  closeCopyPlanModal(): void {
    this.isCopyModalOpen = false;
    this.selectedTargetSampleIds = [];
  }

  toggleTargetSample(sampleId: number): void {
    const idx = this.selectedTargetSampleIds.indexOf(sampleId);
    if (idx >= 0) {
      this.selectedTargetSampleIds.splice(idx, 1);
    } else {
      this.selectedTargetSampleIds.push(sampleId);
    }
  }

  selectAllTargets(): void {
    if (this.selectedTargetSampleIds.length === this.copyableTargetSamples.length) {
      this.selectedTargetSampleIds = [];
    } else {
      this.selectedTargetSampleIds = this.copyableTargetSamples
        .filter(s => s.planStatus !== 'Submitted' && s.planStatus !== 'Approved')
        .map(s => s.sampleID);
    }
  }

  executeCopyPlan(): void {
    if (!this.workspace) return;
    if (this.selectedTargetSampleIds.length === 0) {
      this.toast.show('Please select at least one target sample.', 'warning');
      return;
    }

    this.isCopying = true;
    const req = {
      sourceSampleID: this.workspace.sampleID,
      targetSampleIDs: this.selectedTargetSampleIds,
      executionBranchID: this.copyBranchId
    };

    this.planService.copyPlanToSamples(req).subscribe({
      next: (res) => {
        this.isCopying = false;
        this.closeCopyPlanModal();
        if (res.successfulCopies > 0) {
          this.toast.show(`Successfully copied planned tests to ${res.successfulCopies} sample(s).`, 'success');
        }
        if (res.failedCopies > 0) {
          const failMsg = res.details.filter(d => !d.success).map(d => `${d.sampleNo}: ${d.message}`).join('; ');
          this.toast.show(`Failed targets: ${failMsg}`, 'warning');
        }
        this.loadWorkspace();
      },
      error: (err) => {
        this.isCopying = false;
        const msg = err.error?.message || err.message || 'Failed to copy plan to targets.';
        this.toast.show(msg, 'error');
      }
    });
  }
}
