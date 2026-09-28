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
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ProductMasterService } from '../../../services/product-master.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { SpecificationMasterService } from '../../../services/specification-master.service';
import { SpecificationVersionService } from '../../../services/specification-version.service';
import { extractErrorMessage } from '../../../utility/helper/error.helper';

@Component({
  selector: 'app-universal-plan-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SearchableDropdownComponent],
  templateUrl: './universal-plan-workspace.component.html',
  styleUrls: ['./universal-plan-workspace.component.css']
})
export class UniversalPlanWorkspaceComponent implements OnInit, CanComponentDeactivate {
  inwardId: number = 0;
  sampleId?: number;
  workspace: UniversalPlanWorkspaceDto | null = null;

  // Selected Global Configuration — cascade: Sample → Product → Grade → Spec → Version
  // Product/Grade/Spec are resolvable in Screen 14 (selection of existing masters);
  // creation/editing stays in Screens 10/08/09. Version pin respects Screen 11 lifecycle (Active / explicit Superseded).
  selectedProductMasterId: number | null = null;
  selectedGradeId: number | null = null;
  selectedSpecHeaderId: number | null = null;
  selectedSpecVersionId: number = 0;
  selectedBranchId: number = 1;
  selectedProductItem: any = null;
  selectedGradeItem: any = null;
  selectedSpecItem: any = null;

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
    private toast: ToastService,
    private productMasterService: ProductMasterService,
    private materialSpecService: MaterialSpecificationService,
    private specMasterService: SpecificationMasterService,
    private specVersionService: SpecificationVersionService
  ) {}

  // ────────────── Cascade helpers (State 1 → 4) ──────────────
  // Issue #1: Grade is NOT blocked by Product. Product only filters the grade list.
  // Blank product → all grades; Product selected → grades filtered to that product's mapped grades.
  get isGradeEnabled(): boolean {
    return !this.workspace?.isPlanLocked;
  }
  get isSpecEnabled(): boolean {
    return !this.workspace?.isPlanLocked && !!this.selectedGradeId;
  }
  get isSpecVersionEnabled(): boolean {
    return !this.workspace?.isPlanLocked && !!this.selectedSpecHeaderId;
  }

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
          const msg = extractErrorMessage(err, 'Failed to retrieve inward samples.');
          this.toast.show(msg, 'error');
        }
      });
      return;
    }

    this.planService.getWorkspace(this.inwardId, this.sampleId).subscribe({
      next: (ws) => {
        this.workspace = ws;
        this.selectedProductMasterId = ws.productMasterID ?? null;
        this.selectedGradeId = ws.specificationGradeID ?? null;
        this.selectedSpecHeaderId = ws.specificationHeaderID ?? null;
        this.selectedSpecVersionId = ws.specificationVersionID || 0;
        this.selectedBranchId = ws.branchID || 1;
        this.selectedProductItem = ws.productMasterID ? { id: ws.productMasterID, name: ws.productMasterName } : null;
        this.selectedGradeItem = ws.specificationGradeID ? { id: ws.specificationGradeID, name: ws.gradeName } : null;
        this.selectedSpecItem = ws.specificationHeaderID ? { id: ws.specificationHeaderID, name: ws.specificationName } : null;
        this.plannedTests = [...ws.plannedTests];

        // Extract unique disciplines for filtering
        const discSet = new Set<string>();
        ws.availableTests.forEach(t => {
          if (t.disciplineName) discSet.add(t.disciplineName);
        });
        this.disciplines = ['ALL', ...Array.from(discSet)];

        // Auto-select test list discipline according to current sample's discipline
        this.autoSelectDisciplineForSample();

        this.isLoading = false;
        this.isDirty = false;
      },
      error: (err) => {
        this.isLoading = false;
        const msg = extractErrorMessage(err, 'Failed to load universal planning workspace.');
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
    // Instant discipline hint from already-loaded sample list before fresh load
    const target = this.workspace?.availableSamples?.find(s => s.sampleID === newSampleId) as any;
    const targetDisc = target?.sampleDisciplineName as string | undefined;
    if (targetDisc) {
      this.selectedDiscipline = targetDisc;
    } else {
      this.selectedDiscipline = 'ALL';
    }
    this.searchTerm = '';
    this.sampleId = newSampleId;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sampleId: newSampleId },
      queryParamsHandling: 'merge'
    });
  }

  private autoSelectDisciplineForSample(): void {
    if (!this.workspace) return;
    const sampleDisc = (this.workspace as any).sampleDisciplineName as string | undefined;
    if (sampleDisc && this.disciplines.includes(sampleDisc)) {
      this.selectedDiscipline = sampleDisc;
    } else if (!this.disciplines.includes(this.selectedDiscipline)) {
      this.selectedDiscipline = 'ALL';
    }
  }

  refreshWorkspace(): void {
    this.searchTerm = '';
    this.loadWorkspace();
    this.toast.show('Test list refreshed for current sample.', 'info');
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

  // ────────────── Sample → Product → Grade → Spec → Version cascade ──────────────
  getProductFetchFn = (searchTerm: string, pageNo: number, pageSize: number) =>
    this.productMasterService.getDropdown(searchTerm, pageNo, pageSize);

  getGradeFetchFn = (searchTerm: string, pageNo: number, pageSize: number) => {
    const hdr = this.selectedSpecHeaderId ?? 0;
    const prod = this.selectedProductMasterId ?? 0;
    return this.materialSpecService.getMaterialSpecificationGradeDropdown(searchTerm, pageNo, pageSize, hdr, prod);
  };

  getSpecFetchFn = (searchTerm: string, pageNo: number, pageSize: number) =>
    this.specMasterService.getSpecificationDropdown(searchTerm, pageNo, pageSize);

  onProductSelected(item: any): void {
    if (this.workspace?.isPlanLocked) return;
    this.selectedProductMasterId = item?.id ?? item?.Id ?? null;
    this.selectedProductItem = item ?? null;
    if (!item) {
      this.selectedGradeId = null;
      this.selectedGradeItem = null;
      this.selectedSpecHeaderId = null;
      this.selectedSpecItem = null;
      this.selectedSpecVersionId = 0;
      if (this.workspace) {
        this.workspace.productMasterID = null as any;
        this.workspace.productMasterName = null as any;
        this.workspace.specificationGradeID = null as any;
        this.workspace.gradeName = null as any;
        this.workspace.specificationHeaderID = null as any;
        this.workspace.specificationName = null as any;
        this.workspace.specificationVersionID = null as any;
        this.workspace.specificationVersionName = null as any;
        this.workspace.availableSpecVersions = [];
        this.workspace.isSupersededSpecVersion = false;
      }
    } else {
      if (this.workspace) {
        (this.workspace as any).productMasterID = this.selectedProductMasterId ?? undefined;
        this.workspace.productMasterName = item.name ?? item.Name ?? '';
      }
    }
    this.isDirty = true;
    if (this.isPreviewDrawerOpen && this.currentPreviewTestId > 0) this.fetchPreview(this.currentPreviewTestId);
  }

  onGradeSelected(item: any): void {
    if (this.workspace?.isPlanLocked) return;
    if (!this.isGradeEnabled && item) return;
    this.selectedGradeId = item?.id ?? item?.Id ?? null;
    this.selectedGradeItem = item ?? null;
    if (item) {
      const av = item.additionalValues ?? {};
      const hdr = av['specificationHeaderID'] ?? av['materialSpecificationId'] ?? av['SpecificationHeaderID'] ?? av['MaterialSpecificationId'] ?? item.ParentId ?? 0;
      const hdrName = av['materialSpecificationName'] ?? av['specDisplayTitle'] ?? av['displayTitle'] ?? av['specificationName'] ?? av['SpecificationName'] ?? '';
      if (hdr) {
        this.selectedSpecHeaderId = +hdr;
        this.selectedSpecItem = { id: +hdr, name: hdrName || String(hdr) };
        if (this.workspace) {
          this.workspace.specificationHeaderID = this.selectedSpecHeaderId;
          this.workspace.specificationName = hdrName || String(hdr);
        }
        this.loadSpecVersions(this.selectedSpecHeaderId!);
      }
      if (this.workspace) {
        (this.workspace as any).specificationGradeID = this.selectedGradeId ?? undefined;
        this.workspace.gradeName = item.name ?? item.Name ?? '';
      }
    } else {
      this.selectedSpecHeaderId = null;
      this.selectedSpecItem = null;
      this.selectedSpecVersionId = 0;
      if (this.workspace) {
        (this.workspace as any).specificationGradeID = undefined;
        this.workspace.gradeName = null as any;
        (this.workspace as any).specificationHeaderID = undefined;
        this.workspace.specificationName = null as any;
        (this.workspace as any).specificationVersionID = undefined;
        this.workspace.specificationVersionName = null as any;
        this.workspace.availableSpecVersions = [];
        this.workspace.isSupersededSpecVersion = false;
      }
    }
    this.isDirty = true;
    if (this.isPreviewDrawerOpen && this.currentPreviewTestId > 0) this.fetchPreview(this.currentPreviewTestId);
  }

  onSpecSelected(item: any): void {
    if (this.workspace?.isPlanLocked) return;
    if (!this.isSpecEnabled && item) {
      // Allow spec change only after grade — keep guard but permit clearing.
      if (item) return;
    }
    this.selectedSpecHeaderId = item?.id ?? item?.Id ?? null;
    this.selectedSpecItem = item ?? null;
    if (this.workspace) {
      (this.workspace as any).specificationHeaderID = this.selectedSpecHeaderId ?? undefined;
      this.workspace.specificationName = item?.name ?? item?.Name ?? null;
    }
    if (this.selectedGradeId && item) {
      const gradeHdr = this.selectedGradeItem?.additionalValues?.['specificationHeaderID'] ?? this.selectedGradeItem?.additionalValues?.['materialSpecificationId'];
      if (gradeHdr && +gradeHdr !== +item.id) {
        this.selectedGradeId = null;
        this.selectedGradeItem = null;
        if (this.workspace) {
          this.workspace.specificationGradeID = null as any;
          this.workspace.gradeName = null as any;
        }
      }
    }
    if (item?.id) this.loadSpecVersions(+item.id);
    else {
      this.selectedSpecVersionId = 0;
      if (this.workspace) {
        this.workspace.specificationVersionID = null as any;
        this.workspace.specificationVersionName = null as any;
        this.workspace.availableSpecVersions = [];
        this.workspace.isSupersededSpecVersion = false;
      }
    }
    this.isDirty = true;
    if (this.isPreviewDrawerOpen && this.currentPreviewTestId > 0) this.fetchPreview(this.currentPreviewTestId);
  }

  private loadSpecVersions(headerId: number): void {
    this.specVersionService.getDropdownBySpecification(headerId, true).subscribe({
      next: (list) => {
        const mapped = (list ?? []).map((v: any) => ({
          id: v.id ?? v.ID,
          version: v.version ?? v.Version ?? '',
          year: v.year ?? v.Year ?? null,
          status: typeof v.status === 'number' ? (['Draft','Active','Superseded','Withdrawn'][v.status] ?? String(v.status)) : String(v.status ?? ''),
          isDefault: !!(v.isDefault ?? v.IsDefault),
          isActive: (typeof v.status === 'number' ? v.status === 1 : String(v.status) === 'Active'),
          isSuperseded: (typeof v.status === 'number' ? v.status === 2 : String(v.status) === 'Superseded'),
          effectiveDate: v.effectiveDate ?? v.EffectiveDate,
          supersededDate: v.supersededDate ?? v.SupersededDate
        }));
        if (!this.workspace) return;
        this.workspace.availableSpecVersions = mapped as any;
        if (!this.selectedSpecVersionId && mapped.length) {
          const preferred = mapped.find(m => m.isDefault && m.isActive) ?? mapped.find(m => m.isActive) ?? mapped[0];
          if (preferred) {
            this.selectedSpecVersionId = preferred.id;
            this.workspace.specificationVersionID = preferred.id;
            this.workspace.specificationVersionName = preferred.version;
            this.workspace.isSupersededSpecVersion = !!preferred.isSuperseded;
            this.isDirty = true;
          }
        } else if (this.selectedSpecVersionId) {
          const cur = mapped.find(m => m.id === this.selectedSpecVersionId);
          if (this.workspace && cur) {
            this.workspace.specificationVersionName = cur.version;
            this.workspace.isSupersededSpecVersion = !!cur.isSuperseded;
          }
        }
        if (this.isPreviewDrawerOpen && this.currentPreviewTestId > 0) this.fetchPreview(this.currentPreviewTestId);
      },
      error: () => { /* keep current version list on error */ }
    });
  }

  onSpecVersionChange(newVersionId: number): void {
    if (this.workspace?.isPlanLocked) return;
    if (!this.isSpecVersionEnabled) return;
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
    if (this.workspace?.isPlanLocked) return;
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

    // Call preview to resolve effective config for this test — uses the cascade-pinned routing
    const req = {
      sampleID: this.workspace!.sampleID,
      laboratoryTestID: test.id,
      specificationHeaderID: this.selectedSpecHeaderId ?? this.workspace!.specificationHeaderID,
      specificationGradeID: this.selectedGradeId ?? this.workspace!.specificationGradeID,
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
          executionLayoutID: preview.executionLayoutID,
          executionLayoutCode: preview.executionLayoutCode,
          executionLayoutName: preview.executionLayoutName,
          rendererType: preview.rendererType,
          layoutResolutionLevel: preview.layoutResolutionLevel,
          status: 'Pending'
        };

        this.plannedTests.push(newPlannedItem);
        this.isDirty = true;
        this.toast.show(`Added '${test.name}' to plan.`, 'success');
      },
      error: (err) => {
        const msg = extractErrorMessage(err, `Failed to resolve configuration for '${test.name}'.`);
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
      specificationHeaderID: this.selectedSpecHeaderId ?? this.workspace.specificationHeaderID,
      specificationGradeID: this.selectedGradeId ?? this.workspace.specificationGradeID,
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

        const currentPlanned = this.getPlannedItem(testId);
        if (currentPlanned) {
          currentPlanned.executionLayoutID = preview.executionLayoutID;
          currentPlanned.executionLayoutCode = preview.executionLayoutCode;
          currentPlanned.executionLayoutName = preview.executionLayoutName;
          currentPlanned.rendererType = preview.rendererType;
          currentPlanned.layoutResolutionLevel = preview.layoutResolutionLevel;
          currentPlanned.departmentID = preview.departmentID;
          currentPlanned.departmentName = preview.departmentName;
        }
      },
      error: (err) => {
        this.activePreviewLoading = false;
        const msg = extractErrorMessage(err, 'Failed to preview test configuration.');
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
        const msg = extractErrorMessage(err, 'Failed to save plan draft.');
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
        const msg = extractErrorMessage(err, 'Failed to confirm plan and create test groups.');
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
      specificationHeaderID: p.specificationHeaderID ?? this.selectedSpecHeaderId ?? this.workspace!.specificationHeaderID,
      specificationGradeID: p.specificationGradeID ?? this.selectedGradeId ?? this.workspace!.specificationGradeID,
      specificationVersionID: p.specificationVersionID ?? (this.selectedSpecVersionId || undefined),
      branchID: p.branchID || this.selectedBranchId,
      isRetest: false
    }));

    return {
      sampleTestPlanID: this.workspace!.sampleTestPlanID,
      sampleID: this.workspace!.sampleID,
      branchID: this.selectedBranchId,
      productMasterID: this.selectedProductMasterId ?? undefined,
      specificationHeaderID: this.selectedSpecHeaderId ?? this.workspace!.specificationHeaderID,
      specificationGradeID: this.selectedGradeId ?? this.workspace!.specificationGradeID,
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
      specificationHeaderID: p.specificationHeaderID ?? this.selectedSpecHeaderId ?? this.workspace!.specificationHeaderID,
      specificationGradeID: p.specificationGradeID ?? this.selectedGradeId ?? this.workspace!.specificationGradeID,
      specificationVersionID: p.specificationVersionID ?? (this.selectedSpecVersionId || undefined),
      branchID: p.branchID || this.selectedBranchId,
      isRetest: false
    }));

    return {
      sampleTestPlanID: this.workspace!.sampleTestPlanID,
      sampleID: this.workspace!.sampleID,
      branchID: this.selectedBranchId,
      productMasterID: this.selectedProductMasterId ?? undefined,
      specificationHeaderID: this.selectedSpecHeaderId ?? this.workspace!.specificationHeaderID,
      specificationGradeID: this.selectedGradeId ?? this.workspace!.specificationGradeID,
      specificationVersionID: this.selectedSpecVersionId,
      tests: tests
    };
  }

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  openTestGroup(utgId: number): void {
    if (!utgId) return;
    this.router.navigate(['/sample/test-group', utgId]);
  }

  openExecution(target: PlannedUniversalTestDto | number): void {
    if (!target) return;
    if (typeof target === 'number') {
      this.router.navigate(['/universal-test-execution'], { queryParams: { utgId: target, from: 'plan' } });
      return;
    }
    const qp: any = { utgId: target.universalTestGroupID, from: 'plan' };
    if (target.testExecutionID) {
      qp.executionId = target.testExecutionID;
    }
    this.router.navigate(['/universal-test-execution'], { queryParams: qp });
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
    if (this.workspace?.isPlanLocked) return;
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
        const msg = extractErrorMessage(err, 'Failed to copy plan to targets.');
        this.toast.show(msg, 'error');
      }
    });
  }
}
