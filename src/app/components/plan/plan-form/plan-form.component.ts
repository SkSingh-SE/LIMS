import { Component, Input, OnInit, HostListener } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ProductConditionService } from '../../../services/product-condition.service';
import { SpecimenOrientationService } from '../../../services/specimen-orientation.service';
import { ProductFormService } from '../../../services/product-form.service';
import { CommonModule } from '@angular/common';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { SampleStatus } from '../../../utility/status_flow/enums/sample-status.enum';
import { InwardStatus } from '../../../utility/status_flow/enums/inward-status.enum';
import { TPIService } from '../../../services/tpi.service';
import { TestAutoSuggestService, SmartSuggestRequest, SuggestedTestDto } from '../../../services/test-auto-suggest.service';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { ProductMasterService } from '../../../services/product-master.service';
import { ProductSizeMasterService } from '../../../services/product-size-master.service';
import { PlanExplorerPanelComponent } from '../plan-explorer-panel/plan-explorer-panel.component';
import { PlanExplorerService, ConfiguredGrade, ConfiguredTest, ProductMasterExplorerData, MetalExplorerData } from '../../../services/plan-explorer.service';

@Component({
  selector: 'app-plan-form',
  templateUrl: './plan-form.component.html',
  styleUrls: ['./plan-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SearchableDropdownComponent, MultiSelectDropdownComponent, PlanExplorerPanelComponent]
})
export class PlanFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  @Input() inwardID?: number;
  @Input() mode: 'review' | 'plan' = 'review';

  baseUrl = environment.baseUrl;
  planForm!: FormGroup;
  isViewMode = false;
  isEditMode = false;
  sampleId!: number;
  currentStatus: SampleStatus | string = '';
  planHistoryData: any[] = [];
  showHistoryPanel = false;
  activeHistoryPlanId: number | null = null;
  replanReason = '';
  showReplanModal = false;
  replanPlanId: number | null = null;

  yearCode = new Date().getFullYear().toString().slice(-2);
  getChemicalTestTypeDrop = (term: string, page: number, pageSize: number) =>
    this.laboratoryTestService.getLaboratoryTestDropdownForChemicals(term, page, pageSize);
  activeTabs: { [key: string]: 'general' | 'chemical' } = {};
  tpiAgencyDetails: { [sampleIdx: number]: { emailId: string; contactNo: string } } = {};
  productSizeSelectedMap: { [sampleIdx: number]: any } = {};
  // ── Explorer Modal Drag & Position State ──
  showExplorerModal = false;
  explorerModalLeft = 40; // default left position in px
  explorerModalTop = 60;   // default top position in px
  isDraggingExplorer = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialModalLeft = 40;
  private initialModalTop = 60;

  openExplorerModal(sampleIdx?: number): void {
    if (sampleIdx !== undefined) {
      this.activeSampleIdx = sampleIdx;
    }
    this.showExplorerModal = true;
  }

  closeExplorerModal(): void {
    this.showExplorerModal = false;
  }

  startDragExplorer(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('btn-close') || target.closest('button')) return;

    this.isDraggingExplorer = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialModalLeft = this.explorerModalLeft;
    this.initialModalTop = this.explorerModalTop;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onDragExplorer(event: MouseEvent): void {
    if (!this.isDraggingExplorer) return;
    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;
    this.explorerModalLeft = Math.max(10, this.initialModalLeft + deltaX);
    this.explorerModalTop = Math.max(10, this.initialModalTop + deltaY);
  }

  @HostListener('document:mouseup')
  stopDragExplorer(): void {
    this.isDraggingExplorer = false;
  }
  metalClassificationSelectedMap: { [sampleIdx: number]: any } = {};

  // ── Split Panel State ──
  activeSampleIdx = 0;
  combinedIdxs: Set<number> = new Set();
  isCombinedMode = false;
  selectAllChecked = false;
  combinedActiveTab: 'general' | 'chemical' = 'general';
  combinedPlanForm!: FormGroup;

  sampleInfoCollapsed: { [key: number]: boolean } = {};
  // ── Split Panel Methods ──

  getActiveSampleGroup(): FormGroup {
    return this.samples.at(this.activeSampleIdx) as FormGroup;
  }

  getActiveSample(): AbstractControl {
    return this.samples.at(this.activeSampleIdx);
  }
  toggleSampleInfoCollapse(sampleIdx: number): void {
    if (!this.sampleInfoCollapsed[sampleIdx]) {
      this.sampleInfoCollapsed[sampleIdx] = false;
    }
    this.sampleInfoCollapsed[sampleIdx] = !this.sampleInfoCollapsed[sampleIdx];
  }

  initSampleCollapseState(): void {
    // Initialize: closed if no metal/product data, open if has data
    this.samples.controls.forEach((sample, idx) => {
      const metalId = sample.get('metalClassificationID')?.value;
      const productId = sample.get('productConditionID')?.value;
      this.sampleInfoCollapsed[idx] = !metalId && !productId; // true = collapsed
    });
  }
  onPreparationRequiredToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const activeSample = this.getActiveSampleGroup();
    if (activeSample) {
      activeSample.patchValue({ preparationRequired: checked });
    }
  }

  onSampleCardClick(idx: number): void {
    if (this.isCombinedMode) return;
    this.activeSampleIdx = idx;
    this.preloadExplorerForSample(idx);
  }

  toggleCombined(idx: number, checked: boolean): void {
    if (checked) {
      this.combinedIdxs.add(idx);
    } else {
      this.combinedIdxs.delete(idx);
    }
    this.isCombinedMode = this.combinedIdxs.size >= 2;
    if (!this.isCombinedMode && this.combinedIdxs.size === 1) {
      this.activeSampleIdx = Array.from(this.combinedIdxs)[0];
    }
    if (this.combinedIdxs.size === 0) this.selectAllChecked = false;
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectAllChecked = checked;
    this.combinedIdxs.clear();
    if (checked) {
      this.samples.controls.forEach((_, i) => this.combinedIdxs.add(i));
    }
    this.isCombinedMode = this.combinedIdxs.size >= 2;
  }

  removeFromCombined(idx: number): void {
    this.combinedIdxs.delete(idx);
    this.isCombinedMode = this.combinedIdxs.size >= 2;
    if (this.combinedIdxs.size === 0) this.selectAllChecked = false;
  }

  getSamplePlanStatus(sampleIdx: number): string {
    const plans = this.getTestPlans(sampleIdx);
    if (!plans || plans.length === 0) return 'No Plan';
    return plans.at(0).get('planStatus')?.value || 'Draft';
  }

  isCombinedSelected(idx: number): boolean {
    return this.combinedIdxs.has(idx);
  }

  getCombinedIdxsArray(): number[] {
    return Array.from(this.combinedIdxs);
  }

  initCombinedPlanForm(): void {
    this.combinedPlanForm = this.fb.group({
      metalClassificationID: [null],
      genSpec1: [null],
      genSpec2: [null],
      chemSpec1: [null],
      chemSpec2: [null],
      testTypeIds: [[]],
      methods: this.fb.array([this.createTestMethodRow('', '')]),
      elements: this.fb.array([])
    });
  }

  getCombinedMethods(): FormArray {
    return this.combinedPlanForm.get('methods') as FormArray;
  }

  getCombinedElements(): FormArray {
    return this.combinedPlanForm.get('elements') as FormArray;
  }

  addCombinedMethodRow(): void {
    this.getCombinedMethods().push(this.createTestMethodRow('', ''));
  }

  getCombinedSpecWrapper() {
    return (term: string, page: number, pageSize: number) => {
      const metalId = this.combinedPlanForm.get('metalClassificationID')?.value || 0;
      return this.materialSpecificationService.getGradeDropdownByMetalId(term, page, pageSize, metalId ? +metalId : 0);
    };
  }

  onCombinedMetalSelected(item: any): void {
    this.combinedPlanForm.patchValue({ metalClassificationID: item?.id ?? null });
  }

  onCombinedGenSpecSelected(item: any, field: 'genSpec1' | 'genSpec2'): void {
    const newId = item?.id !== undefined && item?.id !== null ? +item.id : null;
    const otherField = field === 'genSpec1' ? 'genSpec2' : 'genSpec1';
    const otherValRaw = this.combinedPlanForm.get(otherField)?.value;
    const otherVal = otherValRaw !== undefined && otherValRaw !== null ? +otherValRaw : null;

    if (newId && otherVal && newId === otherVal) {
      this.combinedPlanForm.patchValue({ [field]: null });
      this.toastService.show('Specification 1 and Specification 2 cannot be the same.', 'warning');
      return;
    }

    this.combinedPlanForm.patchValue({ [field]: newId });
  }

  onCombinedChemSpecSelected(item: any, field: 'chemSpec1' | 'chemSpec2'): void {
    const newId = item?.id !== undefined && item?.id !== null ? +item.id : null;
    const otherField = field === 'chemSpec1' ? 'chemSpec2' : 'chemSpec1';
    const otherValRaw = this.combinedPlanForm.get(otherField)?.value;
    const otherVal = otherValRaw !== undefined && otherValRaw !== null ? +otherValRaw : null;

    if (newId && otherVal && newId === otherVal) {
      this.combinedPlanForm.patchValue({ [field]: null });
      this.toastService.show('Specification 1 and Specification 2 cannot be the same.', 'warning');
      return;
    }

    this.combinedPlanForm.patchValue({ [field]: newId });
    const spec1 = field === 'chemSpec1' ? newId : this.combinedPlanForm.get('chemSpec1')?.value;
    const spec2 = field === 'chemSpec2' ? newId : this.combinedPlanForm.get('chemSpec2')?.value;
    if (spec1) {
      this.materialSpecificationService
        .getChemicalElementsBySpecifications(spec1 || 0, spec2 || 0)
        .subscribe({
          next: (elements: any[]) => {
            const arr = this.combinedPlanForm.get('elements') as FormArray;
            while (arr.length) arr.removeAt(0);
            if (!elements || elements.length === 0) {
              this.toastService.show('No chemical elements found.', 'info');
              return;
            }
            elements.forEach(el => {
              const row = this.createElementRow();
              row.patchValue({
                parameterID: el.parameterID || el.id || 0,
                parameterUnit: el.unit || el.parameterUnit || '',
                parameterUnitID: el.unitID || el.parameterUnitID || 0,
                specificationLineID: el.specificationLineID || 0,
                minValue: el.minValue ?? null,
                maxValue: el.maxValue ?? null,
                selected: true
              });
              arr.push(row);
            });
          }
        });
    }
  }

  onCombinedLabTestSelected(item: any, methodIdx: number): void {
    const m = this.getCombinedMethods().at(methodIdx);
    if (m) m.patchValue({ testMethodID: item?.id ?? null });
  }

  onCombinedStandardSelected(item: any, methodIdx: number): void {
    const m = this.getCombinedMethods().at(methodIdx);
    if (m) m.patchValue({ standardID: item?.id ?? null, standardName: item?.name ?? null });
  }

  applyCombinedPlan(): void {
    if (this.combinedIdxs.size === 0) return;
    const methods = this.getCombinedMethods();
    const combinedTestTypeIds: number[] = this.combinedPlanForm.get('testTypeIds')?.value || [];
    const hasChemical = combinedTestTypeIds.length > 0;
    const combinedElements = this.getCombinedElements();

    for (const sampleIdx of this.combinedIdxs) {
      const sampleNo = this.samples.at(sampleIdx).get('sampleNo')?.value || '';
      const testPlans = this.getTestPlans(sampleIdx);

      let plan: FormGroup;
      if (testPlans.length === 0) {
        plan = this.fb.group({ id: [0], sampleNo: [sampleNo], generalTests: this.fb.array([]), chemicalTests: this.fb.array([]) });
        testPlans.push(plan);
        this.setActiveTab(sampleIdx, 0, 'general');
      } else {
        plan = testPlans.at(0) as FormGroup;
      }

      const generalTests = plan.get('generalTests') as FormArray;
      while (generalTests.length) generalTests.removeAt(0);
      if (methods.length > 0) {
        const gtGroup = this.createGeneralTestGroup();
        gtGroup.patchValue({ sampleNo, specification1: this.combinedPlanForm.get('genSpec1')?.value, specification2: this.combinedPlanForm.get('genSpec2')?.value });
        for (let m = 0; m < methods.length; m++) {
          const srcM = methods.at(m).value;
          const row = this.createTestMethodRow('', '');
          row.patchValue({ testMethodID: srcM.testMethodID, quantity: srcM.quantity, standardID: srcM.standardID, standardName: srcM.standardName });
          (gtGroup.get('methods') as FormArray).push(row);
        }
        generalTests.push(gtGroup);
      }

      if (hasChemical || combinedElements.length > 0) {
        const chemTests = plan.get('chemicalTests') as FormArray;
        while (chemTests.length) chemTests.removeAt(0);
        const newChem = this.createChemicalTestGroup('', '');
        newChem.patchValue({ sampleNo, specification1: this.combinedPlanForm.get('chemSpec1')?.value, specification2: this.combinedPlanForm.get('chemSpec2')?.value });
        newChem.get('testTypeIds')?.setValue([...combinedTestTypeIds]);
        for (let e = 0; e < combinedElements.length; e++) {
          const row = this.createElementRow();
          row.patchValue(combinedElements.at(e).value);
          (newChem.get('elements') as FormArray).push(row);
        }
        chemTests.push(newChem);
      }
    }

    this.toastService.show(`Combined plan applied to ${this.combinedIdxs.size} samples.`, 'success');
    const firstIdx = Array.from(this.combinedIdxs)[0];
    this.combinedIdxs = new Set();
    this.isCombinedMode = false;
    this.selectAllChecked = false;
    this.activeSampleIdx = firstIdx;
  }

  displayUlr(value: string | null | undefined): string {
    return value?.trim() ? value : 'Auto Generate';
  }

  // Empty-tab confirmation dialog
  showEmptyTabsDialog = false;
  emptyTabsList: { sampleNo: string; label: string }[] = [];
  private pendingEmptyTabs: { sampleIdx: number; planIdx: number; type: 'generalTests' | 'chemicalTests' }[] = [];
  private pendingSubmitAction: (() => void) | null = null;

  // Auto-Suggest
  suggestedTests: any[] = [];
  showSuggestPanel: { [key: string]: boolean } = {};
  suggestLoading: { [key: string]: boolean } = {};

  constructor(
    private fb: FormBuilder,
    private materialSpecificationService: MaterialSpecificationService,
    private laboratoryTestService: LaboratoryTestService,
    private metalService: MetalClassificationService,
    private testMethodSpecificationService: TestMethodSpecificationService,
    private parameterService: ParameterService,
    private toastService: ToastService,
    private inwardService: SampleInwardService,
    private activeroute: ActivatedRoute,
    private router: Router,
    private productService: ProductConditionService,
    private specimenOrientationService: SpecimenOrientationService,
    private productFormService: ProductFormService,
    private tpiService: TPIService,
    private testAutoSuggestService: TestAutoSuggestService,
    private unsavedChangesService: UnsavedChangesService,
    private productMasterService: ProductMasterService,
    private productSizeMasterService: ProductSizeMasterService,
    private explorerService: PlanExplorerService) { }

  ngOnInit(): void {
    let isRouted = false;

    this.activeroute.paramMap.subscribe(params => {
      const routeId = params.get('id');
      if (routeId) {
        isRouted = true;
        this.sampleId = Number(routeId);
        this.inwardID = this.sampleId;
      }
    });

    // Use Router's navigation extras instead of raw history API
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state as { mode?: string };
      if (state?.mode) {
        this.isViewMode = state.mode === 'view' || state.mode === 'review';
        this.isEditMode = state.mode === 'edit';
      }
    }

    // Fallback to history.state if navigation state is not available
    const historyState = history.state as { mode?: string };
    if (historyState?.mode && !navigation?.extras?.state) {
      this.isViewMode = historyState.mode === 'view' || historyState.mode === 'review';
      this.isEditMode = historyState.mode === 'edit';
    }

    // If component is embedded (has @Input mode but not routed), use @Input mode
    // Check if we're not in a routed context
    const routeId = this.activeroute.snapshot.paramMap.get('id');
    if (!routeId && this.mode) {
      // We're embedded, use @Input mode to determine view mode
      if (this.mode === 'review') {
        this.isViewMode = true;
      } else if (this.mode === 'plan') {
        this.isViewMode = false;
      }
    }

    this.initForm();

    // If in view mode and form is initialized, disable it immediately
    if (this.isViewMode && this.planForm) {
      this.disableFormRecursively(this.planForm);
    }

    this.initCombinedPlanForm();
    if (this.inwardID) this.fetchSampleInwardDetails(this.inwardID);
  }

  // Form Initialization
  private initForm(): void {
    this.planForm = this.fb.group({
      id: [0],
      caseNo: ['DMSPL-000123'],
      sampleReceiptNote: ['Sample received in good condition'],
      urgent: [true],
      returnSample: [false],
      notDestroyed: [true],
      statementOfConformity: ['Not Applicable'],
      decisionRule: ['Not Applicable'],
      samples: this.fb.array([])
    });
  }

  // Getters
  get samples(): FormArray {
    return this.planForm.get('samples') as FormArray;
  }

  // Utility
  private disableFormRecursively(control: AbstractControl): void {
    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.keys(control.controls).forEach(key => {
        const childControl = control.get(key);
        if (childControl) {
          if (childControl instanceof FormGroup || childControl instanceof FormArray) {
            this.disableFormRecursively(childControl);
          } else {
            childControl.disable({ emitEvent: false });
          }
        }
      });
    } else {
      control.disable({ emitEvent: false });
    }
  }

  // ────────────── Form Building Methods ──────────────
  createTestPlan(sampleNo: string): FormGroup {
    const generalTestGroup = this.createGeneralTestGroup();
    (generalTestGroup.get('methods') as FormArray).push(this.createTestMethodRow('', ''));
    return this.fb.group({
      id: [0],
      sampleNo: [sampleNo],
      generalTests: this.fb.array([generalTestGroup]),
      chemicalTests: this.fb.array([])
    });
  }

  createGeneralTestGroup(): FormGroup {
    return this.fb.group({
      sampleNo: [''],
      specification1: [null],
      specification2: [null],
      parameter: [''],
      methods: this.fb.array([])
    }, { validators: this.uniqueSpecificationValidator });
  }

  createChemicalTestGroup(reportNo: string, ulrNo: string): FormGroup {
    return this.fb.group({
      sampleNo: [''],
      reportNo: [reportNo || ''],
      ulrNo: [ulrNo || ''],
      testTypeIds: [[]],
      specification1: [null],
      specification2: [null],
      methods: this.fb.array([this.createTestMethodRow(reportNo, ulrNo)]),
      elements: this.fb.array([])
    });
  }

  createTestMethodRow(reportNo: string, ulrNo: string): FormGroup {
    return this.fb.group({
      testMethodID: [null, Validators.required],
      quantity: ['1'],
      reportNo: [reportNo],
      ulrNo: [ulrNo],
      cancel: [false],
      standardID: [null],
      standardName: [''],
      customRemarks: ['']
    });
  }

  createElementRow(): FormGroup {
    return this.fb.group({
      parameterID: [null],
      specificationLineID: [null],
      parameterName: [''],
      minValue: [null],
      maxValue: [null],
      parameterUnitID: [null],
      parameterUnit: [''],
      selected: [true]
    });
  }

  // ────────────── Array Access Methods ──────────────
  getSampleDetails(sampleIndex: number): FormGroup {
    return this.samples.at(sampleIndex) as FormGroup;
  }

  getAdditionalDetailsArray(sample: AbstractControl): AbstractControl[] {
    const arr = sample.get('additionalDetails') as FormArray;
    return arr ? arr.controls : [];
  }

  getTestPlans(sampleIndex: number): FormArray {
    return this.samples.at(sampleIndex).get('testPlans') as FormArray;
  }

  getTestPlansArray(sample: AbstractControl): AbstractControl[] {
    const arr = sample.get('testPlans') as FormArray;
    return arr ? arr.controls : [];
  }

  private sampleHasValidTest(sampleIdx: number): boolean {
    const testPlans = this.getTestPlans(sampleIdx);
    for (let j = 0; j < testPlans.length; j++) {
      const plan = testPlans.at(j) as FormGroup;
      const generalTests = plan.get('generalTests') as FormArray;
      const chemicalTests = plan.get('chemicalTests') as FormArray;

      for (let g = 0; g < (generalTests?.length ?? 0); g++) {
        const methods = generalTests.at(g).get('methods') as FormArray;
        if (methods?.controls.some(m => !!m.get('testMethodID')?.value)) return true;
      }

      for (let c = 0; c < (chemicalTests?.length ?? 0); c++) {
        const ct = chemicalTests.at(c) as FormGroup;
        const elements = ct.get('elements') as FormArray;
        if ((ct.get('testTypeIds')?.value?.length ?? 0) > 0) return true;
        if ((elements?.length ?? 0) > 0) return true;
      }
    }
    return false;
  }

  getSamplesWithoutTests(): string[] {
    const missing: string[] = [];
    for (let i = 0; i < this.samples.length; i++) {
      if (!this.sampleHasValidTest(i)) {
        missing.push(this.samples.at(i).get('sampleNo')?.value || `Sample ${i + 1}`);
      }
    }
    return missing;
  }

  // Check if every sample has at least one test with a lab test selected
  hasValidPlans(): boolean {
    if (this.samples.length === 0) return false;
    return this.getSamplesWithoutTests().length === 0;
  }

  getTestArray(sampleIndex: number, planIndex: number, type: 'generalTests' | 'chemicalTests'): FormArray {
    return this.getTestPlans(sampleIndex).at(planIndex).get(type) as FormArray;
  }

  getGeneralTestSection(sampleIndex: number, planIndex: number): FormGroup {
    return this.getTestArray(sampleIndex, planIndex, 'generalTests').at(0) as FormGroup;
  }

  getChemicalTestSection(sampleIndex: number, planIndex: number): FormGroup {
    return this.getTestArray(sampleIndex, planIndex, 'chemicalTests').at(0) as FormGroup;
  }

  getMethodRows(sampleIndex: number, planIndex: number): FormArray {
    const sectionArray = this.getTestArray(sampleIndex, planIndex, 'generalTests');
    if (!sectionArray || sectionArray.length === 0) return this.fb.array([]);
    const section = sectionArray.at(0) as FormGroup;
    return section.get('methods') as FormArray;
  }

  getElementRows(sampleIndex: number, planIndex: number): FormArray {
    const chemTests = this.getTestArray(sampleIndex, planIndex, 'chemicalTests');
    if (!chemTests || chemTests.length === 0) return this.fb.array([]);
    return chemTests.at(0).get('elements') as FormArray;
  }

  getChemicalTestsArray(sampleIdx: number, planIdx: number): AbstractControl[] {
    const arr = this.getTestArray(sampleIdx, planIdx, 'chemicalTests');
    return arr ? arr.controls : [];
  }

  getElementsArray(sampleIdx: number, planIdx: number, chemIdx: number): AbstractControl[] {
    const chemTests = this.getChemicalTestsArray(sampleIdx, planIdx);
    const arr = chemTests[chemIdx]?.get('elements') as FormArray;
    return arr ? arr.controls : [];
  }

  getChemicalMethodRows(sampleIdx: number, planIdx: number, chemIdx: number): FormArray {
    const chemTests = this.getChemicalTestsArray(sampleIdx, planIdx);
    const chemGroup = chemTests[chemIdx] as FormGroup;
    if (!chemGroup) return this.fb.array([]);
    let methods = chemGroup.get('methods') as FormArray;
    if (!methods) {
      methods = this.fb.array([]);
      chemGroup.addControl('methods', methods);
    }
    return methods;
  }

  addChemicalMethodRow(sampleIdx: number, planIdx: number, chemIdx: number): void {
    const methods = this.getChemicalMethodRows(sampleIdx, planIdx, chemIdx);
    methods.push(this.createTestMethodRow('', ''));
  }

  // Added: select-all helpers for chemical elements
  isAllElementsSelected(sampleIdx: number, planIdx: number, chemIdx: number): boolean {
    const elements = this.getElementsArray(sampleIdx, planIdx, chemIdx);
    if (!elements || elements.length === 0) return false;
    return elements.every((el: AbstractControl) => !!el.get('selected')?.value);
  }

  toggleSelectAllElements(event: Event, sampleIdx: number, planIdx: number, chemIdx: number): void {
    const checked = (event.target as HTMLInputElement).checked;
    const elements = this.getElementsArray(sampleIdx, planIdx, chemIdx);
    if (!elements) return;
    elements.forEach((el: AbstractControl) => {
      const ctrl = el.get('selected');
      if (ctrl) ctrl.setValue(checked);
    });
  }

  // ────────────── Add/Remove Methods ──────────────
  addTestBlock(sampleIndex: number, planIndex: number, type: 'generalTests' | 'chemicalTests'): void {
    const array = this.getTestArray(sampleIndex, planIndex, type);
    if (type === 'generalTests') {
      array.push(this.createGeneralTestGroup());
    } else {
      array.push(this.createChemicalTestGroup('', ''));
    }
  }

  addMethodRow(sampleIndex: number, planIndex: number): void {
    const rows = this.getMethodRows(sampleIndex, planIndex);
    if (rows && rows.length > 0) {
      const lastRow = rows.at(rows.length - 1);
      if (!lastRow.get('testMethodID')?.value) {
        this.toastService.show('Please select a Laboratory Test for the existing empty row first.', 'warning');
        return;
      }
    }
    rows.push(this.createTestMethodRow('', ''));
  }

  addElementRow(sampleIndex: number, planIndex: number): void {
    this.getElementRows(sampleIndex, planIndex).push(this.createElementRow());
  }

  removeElementRow(sampleIndex: number, planIndex: number, elementIndex: number): void {
    this.getElementRows(sampleIndex, planIndex).removeAt(elementIndex);
  }

  removeGeneralTest(sampleIndex: number, planIndex: number, generalIndex = 0): void {
    if (this.isViewMode) return;

    const genArray = this.getTestArray(sampleIndex, planIndex, 'generalTests');
    if (!genArray || genArray.length === 0) return;
    if (generalIndex < 0 || generalIndex >= genArray.length) return;

    const confirmed = window.confirm('Remove this General Test? This action can be undone before saving.');
    if (!confirmed) return;

    genArray.removeAt(generalIndex);

    const testPlansArray = this.getTestPlans(sampleIndex);
    const testPlanGroup = testPlansArray.at(planIndex) as FormGroup;
    const remainingGeneral = (testPlanGroup.get('generalTests') as FormArray)?.length || 0;
    const remainingChemical = (testPlanGroup.get('chemicalTests') as FormArray)?.length || 0;

    if (remainingGeneral === 0 && remainingChemical === 0) {
      testPlansArray.removeAt(planIndex);
    } else {
      const currentErrors = testPlanGroup.errors;
      if (currentErrors) {
        delete currentErrors['noTests'];
        const remainingKeys = Object.keys(currentErrors).filter(k => currentErrors[k] !== null && currentErrors[k] !== undefined);
        testPlanGroup.setErrors(remainingKeys.length ? currentErrors : null);
      }
    }

    testPlanGroup.updateValueAndValidity({ onlySelf: true, emitEvent: true });
    this.planForm.updateValueAndValidity();
  }

  removeChemicalTest(sampleIndex: number, planIndex: number, chemIndex: number): void {
    if (this.isViewMode) return;

    const chemArray = this.getTestArray(sampleIndex, planIndex, 'chemicalTests');
    if (!chemArray || chemArray.length === 0) return;
    if (chemIndex < 0 || chemIndex >= chemArray.length) return;

    const confirmed = window.confirm('Remove this Chemical Test? This action can be undone before saving.');
    if (!confirmed) return;

    chemArray.removeAt(chemIndex);

    const testPlansArray = this.getTestPlans(sampleIndex);
    const testPlanGroup = testPlansArray.at(planIndex) as FormGroup;
    const remainingGeneral = (testPlanGroup.get('generalTests') as FormArray)?.length || 0;
    const remainingChemical = (testPlanGroup.get('chemicalTests') as FormArray)?.length || 0;

    if (remainingGeneral === 0 && remainingChemical === 0) {
      testPlansArray.removeAt(planIndex);
    }

    testPlanGroup.updateValueAndValidity({ onlySelf: true, emitEvent: true });
    this.planForm.updateValueAndValidity();
  }

  addPlanToSample(sampleIdx: number): void {
    const sampleGroup = this.samples.at(sampleIdx) as FormGroup;
    const testPlans = sampleGroup.get('testPlans') as FormArray;
    const sampleNo = sampleGroup.get('sampleNo')?.value || '';
    testPlans.push(this.createTestPlan(sampleNo));
    const newPlanIdx = testPlans.length - 1;
    this.setActiveTab(sampleIdx, newPlanIdx, 'general');
  }

  /** Auto-create a default plan for each sample that has no test plans yet */
  private ensurePlansExist(): void {
    for (let i = 0; i < this.samples.length; i++) {
      const testPlans = this.getTestPlans(i);
      if (testPlans.length === 0) {
        this.addPlanToSample(i);
      }
    }
  }

  // ────────────── API Calls ──────────────
  fetchSampleInwardDetails(sampleId: number): void {
    this.inwardService.getSampleInwardWithPlans(sampleId).subscribe({
      next: (data) => {
        if (!data) return;

        // Store current status for Send for Review button visibility
        this.currentStatus = data.status || '';

        const formatted = {
          id: data.id,
          caseNo: data.caseNo,
          sampleReceiptNote: data.sampleReceiptNote,
          urgent: data.urgent,
          returnSample: data.returnSample,
          notDestroyed: data.notDestroyed,
          statementOfConformity: data.statementOfConformity ?? 'Not Applicable',
          decisionRule: data.decisionRule ?? 'Not Applicable',
          sampleDetails: (data.sampleDetails || []).filter((s: any) => !s.isCancelled).map((s: any) => ({
            id: s.id,
            sampleNo: s.sampleNo,
            details: s.details,
            metalClassificationID: s.metalClassificationID,
            metalClassificationName: s.metalClassificationName ?? '',
            productConditionID: s.productConditionID,
            specimenOrientationID: s.specimenOrientationID,
            productFormID: s.productFormID,
            tpiAgencyID: s.tpiAgencyID,
            remarks: s.remarks,
            quantity: s.quantity,
            thickness: s.thickness,
            diameter: s.diameter,
            width: s.width,
            length: s.length,
            preparationRequired: s.preparationRequired ?? false,
            machiningRequired: s.machiningRequired ?? false,
            machiningAmount: s.machiningAmount ?? 0,
            specimen: s.specimen ?? '',
            otherPreparation: s.otherPreparation ?? false,
            otherPreparationCharge: s.otherPreparationCharge ?? 0,
            tpiRequired: s.tpiRequired ?? false,
            testInstructions: s.testInstructions ?? '',
            fileName: s.fileName ?? '',
            sampleFilePath: s.sampleFilePath ?? ''
          })),
          sampleAdditionalDetails: (data.sampleAdditionalDetails || []).map((ad: any) => ({
            id: ad.id,
            sampleID: ad.sampleID,
            label: ad.label,
            value: ad.value
          })),
          sampleTestPlans: (data.sampleTestPlans || []).map((tp: any) => ({
            sampleID: tp.sampleID,
            sampleNo: tp.sampleNo,
            id: tp.id,
            version: tp.version ?? 1,
            replanCount: tp.replanCount ?? 0,
            planStatus: tp.planStatus ?? 'Draft',
            approvedById: tp.approvedById,
            approvedByName: tp.approvedByName,
            approvedAt: tp.approvedAt,
            generalTests: (tp.generalTests || []).map((gt: any) => ({
              id: gt.id,
              sampleNo: gt.sampleNo,
              specification1: gt.specification1,
              specification2: gt.specification2,
              parameter: gt.parameter,
              methods: (gt.methods || []).map((m: any) => ({
                id: m.id,
                testMethodID: m.testMethodID,
                quantity: m.quantity,
                reportNo: m.reportNo,
                ulrNo: m.ulrNo,
                cancel: m.cancel,
                standardID: m.standardID || null
              }))
            })),
            chemicalTests: (tp.chemicalTests || []).map((ct: any) => ({
              id: ct.id,
              sampleNo: ct.sampleNo,
              reportNo: ct.reportNo,
              ulrNo: ct.ulrNo,
              testTypeIds: ct.testTypeIds || [],
              specification1: ct.specification1,
              specification2: ct.specification2,
              elements: (ct.elements || []).map((el: any) => ({
                parameterID: el.parameterID || 0,
                specificationLineID: el.specificationLineID || 0,
                parameterName: el.parameterName || '',
                minValue: el.minValue ?? null,
                maxValue: el.maxValue ?? null,
                parameterUnitID: el.parameterUnitID || 0,
                parameterUnit: el.parameterUnit || '',
                selected: el.selected ?? false
              }))
            }))
          }))
        };
        // Check status and enable view mode
        // if (data?.status !== InwardStatus.IN_PROGRESS) {
        //   this.isViewMode = true;
        // }

        this.updateFormFromPayload(formatted);

        // Preload explorer data for all samples with productMasterID
        for (let i = 0; i < this.samples.length; i++) {
          this.preloadExplorerForSample(i);
        }

        // Auto-create a plan for samples that have no test plans yet
        if (!this.isViewMode) {
          this.ensurePlansExist();
        }

        // Disable form after populating if in view mode
        if (this.isViewMode) {
          this.disableFormRecursively(this.planForm);
        }
      },
      error: (err) => console.error('[PlanForm] Error fetching sample inward details:', err)
    });
  }

  preloadExplorerForSample(sampleIdx: number): void {
    const sGroup = this.getSampleGroupSafely(sampleIdx);
    const pmId = sGroup?.get('productMasterID')?.value;
    const metalId = sGroup?.get('metalClassificationID')?.value;

    if (pmId) {
      if (!this.explorerProductDataMap[sampleIdx]) {
        this.explorerService.getProductMasterExplorer(pmId).subscribe({
          next: (explorerData) => {
            this.explorerProductDataMap[sampleIdx] = explorerData;
            if (explorerData && explorerData.grades && explorerData.grades.length > 0 && !sGroup?.get('specificationGradeID')?.value) {
              sGroup?.patchValue({
                specificationGradeID: explorerData.grades[0].specificationGradeID
              });
            }
          }
        });
      }
    } else if (metalId) {
      if (!this.explorerMetalDataMap[sampleIdx]) {
        this.explorerService.getMetalClassificationExplorer(metalId).subscribe({
          next: (metalData: MetalExplorerData) => {
            this.explorerMetalDataMap[sampleIdx] = metalData;
          }
        });
      }
    }
  }

  autoPopulateFromProductMaster(sampleIdx: number): void {
    const sGroup = this.getSampleGroupSafely(sampleIdx);
    if (!sGroup) return;
    const pmId = sGroup.get('productMasterID')?.value;
    if (!pmId) {
      this.toastService.show('Please select a Product Master first.', 'warning');
      return;
    }

    const explorerData = this.explorerProductDataMap[sampleIdx];
    if (explorerData && explorerData.grades && explorerData.grades.length > 0) {
      const gradeId = sGroup.get('specificationGradeID')?.value;
      const targetGrade = gradeId
        ? explorerData.grades.find((g: ConfiguredGrade) => g.specificationGradeID === +gradeId)
        : explorerData.grades[0];

      if (targetGrade) {
        this.onApplyGradeConfig(targetGrade);
        this.toastService.show(`Auto-populated plan from ${targetGrade.gradeName}.`, 'success');
      }
    } else {
      this.explorerService.getProductMasterExplorer(pmId).subscribe({
        next: (data) => {
          this.explorerProductDataMap[sampleIdx] = data;
          if (data && data.grades && data.grades.length > 0) {
            this.onApplyGradeConfig(data.grades[0]);
            this.toastService.show(`Auto-populated plan from ${data.productName || 'Product Master'}.`, 'success');
          } else {
            this.toastService.show('No configured grades found in this Product Master.', 'info');
          }
        }
      });
    }
  }

  hasEmptyTestPlan(sampleIdx: number, planIdx: number = 0): boolean {
    const sGroup = this.getSampleGroupSafely(sampleIdx);
    if (!sGroup) return false;
    const pmId = sGroup.get('productMasterID')?.value;
    if (!pmId) return false;

    const genTests = this.getTestArray(sampleIdx, planIdx, 'generalTests');
    const chemTests = this.getTestArray(sampleIdx, planIdx, 'chemicalTests');

    const noGen = !genTests || genTests.length === 0;
    const noChem = !chemTests || chemTests.length === 0;

    if (noGen && noChem) return true;

    const methods = this.getMethodRows(sampleIdx, planIdx);
    const hasAnyGenMethod = methods && methods.controls.some(ctrl => !!ctrl.get('testMethodID')?.value);
    const hasAnyChemElements = chemTests && chemTests.controls.some(ct => {
      const els = (ct as FormGroup).get('elements') as FormArray;
      return els && els.length > 0;
    });

    return !hasAnyGenMethod && !hasAnyChemElements;
  }

  // ────────────── Dropdown Data Methods (Two-Tier Dual Base: Product Master -> Metal Classification) ──────────────
  buildSpecFetchFnWithSuggestions = (sampleIdx: number, field: string) => {
    return (term: string, page: number, pageSize: number): Observable<any[]> => {
      const metalId = this.getMetalIdForSample(sampleIdx);
      const isUnknown = this.getSampleGroupSafely(sampleIdx)?.get('isUnknownSample')?.value;
      const pmExplorer = this.explorerProductDataMap[sampleIdx];
      const metalExplorer = this.explorerMetalDataMap[sampleIdx];
      const activeExplorer = (pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0)
        ? pmExplorer
        : metalExplorer;

      const isProductMasterBase = !!(pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0);

      return this.materialSpecificationService.getGradeDropdownByMetalId(term, page, pageSize, metalId).pipe(
        map((allGrades: any[]) => {
          if (isUnknown || !activeExplorer || !activeExplorer.grades || activeExplorer.grades.length === 0) {
            return allGrades || [];
          }

          const configuredGrades = activeExplorer.grades.map((g: ConfiguredGrade) => ({
            id: g.specificationGradeID,
            name: `${g.gradeName} (${g.specificationName || (isProductMasterBase ? 'Configured' : 'Metal Grade')})`,
            isConfigured: true
          }));

          const configuredIds = new Set(configuredGrades.map((g: any) => +g.id));
          const otherGrades = (allGrades || []).filter((g: any) => !configuredIds.has(+g.id));

          const headerName = isProductMasterBase 
            ? '⭐ Configured Product Master Grades' 
            : '⭐ Configured Metal Specification Grades';

          const result: any[] = [];
          if (configuredGrades.length > 0) {
            if (!term || term.trim() === '') {
              result.push({ isHeader: true, name: headerName });
              result.push(...configuredGrades);
              if (otherGrades.length > 0) {
                result.push({ isHeader: true, name: 'All Material Specifications' });
                result.push(...otherGrades);
              }
            } else {
              const lower = term.toLowerCase().trim();
              const matchingConfigured = configuredGrades.filter((c: any) => c.name.toLowerCase().includes(lower));
              if (matchingConfigured.length > 0) {
                result.push({ isHeader: true, name: headerName });
                result.push(...matchingConfigured);
                if (otherGrades.length > 0) {
                  result.push({ isHeader: true, name: 'All Material Specifications' });
                  result.push(...otherGrades);
                }
              } else {
                result.push(...(allGrades || []));
              }
            }
          } else {
            result.push(...(allGrades || []));
          }
          return result;
        })
      );
    };
  };

  buildLabTestFetchFnWithSuggestions = (sampleIdx: number) => {
    return (term: string, page: number, pageSize: number): Observable<any[]> => {
      const isUnknown = this.getSampleGroupSafely(sampleIdx)?.get('isUnknownSample')?.value;
      const pmExplorer = this.explorerProductDataMap[sampleIdx];
      const metalExplorer = this.explorerMetalDataMap[sampleIdx];
      const activeExplorer = (pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0)
        ? pmExplorer
        : metalExplorer;

      const isProductMasterBase = !!(pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0);

      return this.laboratoryTestService.getLaboratoryTestDropdownForGeneral(term, page, pageSize).pipe(
        map((allTests: any[]) => {
          if (isUnknown || !activeExplorer || !activeExplorer.grades || activeExplorer.grades.length === 0) {
            return allTests || [];
          }

          const gradeId = this.getSampleGroupSafely(sampleIdx)?.get('specificationGradeID')?.value;
          const targetGrade = gradeId
            ? (activeExplorer.grades.find((g: ConfiguredGrade) => g.specificationGradeID === +gradeId) || activeExplorer.grades[0])
            : activeExplorer.grades[0];

          if (!targetGrade || !targetGrade.configuredTests || targetGrade.configuredTests.length === 0) {
            return allTests || [];
          }

          const suggestedTests = targetGrade.configuredTests
            .filter((t: ConfiguredTest) => t.testType !== 'Chemical')
            .map((t: ConfiguredTest) => ({
              id: t.laboratoryTestID,
              name: `${t.laboratoryTestName}${t.subGroup ? ' (' + t.subGroup + ')' : ''}`,
              isConfigured: true
            }));

          const suggestedIds = new Set(suggestedTests.map((t: any) => +t.id));
          const otherTests = (allTests || []).filter((t: any) => !suggestedIds.has(+t.id));

          const headerName = isProductMasterBase
            ? '⭐ Suggested Laboratory Tests (Product Master Mappings)'
            : '⭐ Suggested Laboratory Tests (Metal Classification)';

          const result: any[] = [];
          if (suggestedTests.length > 0) {
            if (!term || term.trim() === '') {
              result.push({ isHeader: true, name: headerName });
              result.push(...suggestedTests);
              if (otherTests.length > 0) {
                result.push({ isHeader: true, name: 'All Laboratory Tests' });
                result.push(...otherTests);
              }
            } else {
              const lower = term.toLowerCase().trim();
              const matchingSuggested = suggestedTests.filter((s: any) => s.name.toLowerCase().includes(lower));
              if (matchingSuggested.length > 0) {
                result.push({ isHeader: true, name: headerName });
                result.push(...matchingSuggested);
                if (otherTests.length > 0) {
                  result.push({ isHeader: true, name: 'All Laboratory Tests' });
                  result.push(...otherTests);
                }
              } else {
                result.push(...(allTests || []));
              }
            }
          } else {
            result.push(...(allTests || []));
          }
          return result;
        })
      );
    };
  };

  buildChemicalLabTestFetchFnWithSuggestions = (sampleIdx: number) => {
    return (term: string, page: number, pageSize: number): Observable<any[]> => {
      if (!this.hasSelectedTechnique(sampleIdx)) {
        return of([]);
      }
      const isUnknown = this.getSampleGroupSafely(sampleIdx)?.get('isUnknownSample')?.value;
      const pmExplorer = this.explorerProductDataMap[sampleIdx];
      const metalExplorer = this.explorerMetalDataMap[sampleIdx];
      const activeExplorer = (pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0)
        ? pmExplorer
        : metalExplorer;

      const isProductMasterBase = !!(pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0);

      return this.laboratoryTestService.getLaboratoryTestDropdownForChemicals(term, page, pageSize).pipe(
        map((allTests: any[]) => {
          if (isUnknown || !activeExplorer || !activeExplorer.grades || activeExplorer.grades.length === 0) {
            return allTests || [];
          }

          const gradeId = this.getSampleGroupSafely(sampleIdx)?.get('specificationGradeID')?.value;
          const targetGrade = gradeId
            ? (activeExplorer.grades.find((g: ConfiguredGrade) => g.specificationGradeID === +gradeId) || activeExplorer.grades[0])
            : activeExplorer.grades[0];

          if (!targetGrade || !targetGrade.configuredTests || targetGrade.configuredTests.length === 0) {
            return allTests || [];
          }

          const suggestedTests = targetGrade.configuredTests
            .filter((t: ConfiguredTest) => t.testType === 'Chemical')
            .map((t: ConfiguredTest) => ({
              id: t.laboratoryTestID,
              name: `${t.laboratoryTestName}${t.subGroup ? ' (' + t.subGroup + ')' : ''}`,
              isConfigured: true
            }));

          const suggestedIds = new Set(suggestedTests.map((t: any) => +t.id));
          const otherTests = (allTests || []).filter((t: any) => !suggestedIds.has(+t.id));

          const headerName = isProductMasterBase
            ? '⭐ Suggested Chemical Tests (Product Master Mappings)'
            : '⭐ Suggested Chemical Tests (Metal Classification)';

          const result: any[] = [];
          if (suggestedTests.length > 0) {
            if (!term || term.trim() === '') {
              result.push({ isHeader: true, name: headerName });
              result.push(...suggestedTests);
              if (otherTests.length > 0) {
                result.push({ isHeader: true, name: 'All Chemical Tests' });
                result.push(...otherTests);
              }
            } else {
              const lower = term.toLowerCase().trim();
              const matchingSuggested = suggestedTests.filter((s: any) => s.name.toLowerCase().includes(lower));
              if (matchingSuggested.length > 0) {
                result.push({ isHeader: true, name: headerName });
                result.push(...matchingSuggested);
                if (otherTests.length > 0) {
                  result.push({ isHeader: true, name: 'All Chemical Tests' });
                  result.push(...otherTests);
                }
              } else {
                result.push(...(allTests || []));
              }
            }
          } else {
            result.push(...(allTests || []));
          }
          return result;
        })
      );
    };
  };

  buildTestMethodSpecificationFetchFnWithSuggestions = (sampleIdx: number, planIdx?: number, methodIdx?: number) => {
    return (term: string, page: number, pageSize: number): Observable<any[]> => {
      const isUnknown = this.getSampleGroupSafely(sampleIdx)?.get('isUnknownSample')?.value;
      let testId: number | null = null;
      let rowKey = '';
      if (planIdx !== undefined && methodIdx !== undefined) {
        const row = this.getMethodRows(sampleIdx, planIdx)?.at(methodIdx);
        const val = row?.get('testMethodID')?.value;
        testId = val ? +val : null;
        rowKey = `${sampleIdx}_${planIdx}_${methodIdx}`;
      }

      const pmExplorer = this.explorerProductDataMap[sampleIdx];
      const metalExplorer = this.explorerMetalDataMap[sampleIdx];
      const activeExplorer = (pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0)
        ? pmExplorer
        : metalExplorer;

      const isProductMasterBase = !!(pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0);
      const mappedStandards = rowKey ? (this.subGroupStandardsMap[rowKey] || []) : [];

      // Fetch test-specific mapped standards (live/cached) and all test method specifications
      const labSpecs$ = (testId && !this.labTestStandardsCache[testId])
        ? this.laboratoryTestService.getTestMethodSpecificationByLabTest(testId).pipe(
            tap((specs: any[]) => {
              this.labTestStandardsCache[testId!] = specs || [];
            }),
            catchError(() => of([]))
          )
        : of(this.labTestStandardsCache[testId || 0] || []);

      const allStandards$ = this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);

      return forkJoin([labSpecs$, allStandards$]).pipe(
        map(([labSpecs, allStandards]) => {
          const recommendedList: any[] = [];
          const recIds = new Set<number>();

          // 1. Grade Recommended Test Method Specification from Explorer Data (Product Master or Metal Classification)
          if (!isUnknown && testId && activeExplorer && activeExplorer.grades) {
            const gradeId = this.getSampleGroupSafely(sampleIdx)?.get('specificationGradeID')?.value;
            const targetGrade = gradeId
              ? (activeExplorer.grades.find((g: ConfiguredGrade) => g.specificationGradeID === +gradeId) || activeExplorer.grades[0])
              : activeExplorer.grades[0];

            const matchingTest = targetGrade?.configuredTests?.find((t: ConfiguredTest) => +t.laboratoryTestID === +testId);
            const specId = matchingTest?.testMethodSpecificationID || matchingTest?.testMethodStandardID;
            const specName = matchingTest?.testMethodSpecificationName || matchingTest?.testMethodStandardName;
            if (matchingTest && specId && +specId > 0) {
              recommendedList.push({
                id: +specId,
                name: specName || 'Configured Test Method Specification',
                isConfigured: true
              });
              recIds.add(+specId);
            }
          }

          // 2. Direct Test Mappings from LaboratoryTest Master (e.g. IS 1608 for Tensile Test)
          if (labSpecs && labSpecs.length > 0) {
            labSpecs.forEach((s: any) => {
              if (s.id && !recIds.has(+s.id)) {
                recommendedList.push({
                  id: +s.id,
                  name: s.name,
                  isConfigured: true
                });
                recIds.add(+s.id);
              }
            });
          }

          // 3. Row-level cached mapped standards
          if (mappedStandards && mappedStandards.length > 0) {
            mappedStandards.forEach((s: any) => {
              if (s.id && !recIds.has(+s.id)) {
                recommendedList.push({
                  id: +s.id,
                  name: s.name,
                  isConfigured: true
                });
                recIds.add(+s.id);
              }
            });
          }

          if (recommendedList.length === 0) {
            return allStandards || [];
          }

          const otherStandards = (allStandards || []).filter((s: any) => !recIds.has(+s.id));
          const result: any[] = [];

          const headerTitle = isProductMasterBase 
            ? '⭐ Configured Test Method Specifications' 
            : '⭐ Configured Test Methods (Laboratory Test)';

          if (!term || term.trim() === '') {
            result.push({ isHeader: true, name: headerTitle });
            result.push(...recommendedList);
            if (otherStandards.length > 0) {
              result.push({ isHeader: true, name: 'All Test Method Specifications' });
              result.push(...otherStandards);
            }
          } else {
            const lower = term.toLowerCase().trim();
            const matchingRec = recommendedList.filter((r: any) => r.name.toLowerCase().includes(lower));
            if (matchingRec.length > 0) {
              result.push({ isHeader: true, name: headerTitle });
              result.push(...matchingRec);
              if (otherStandards.length > 0) {
                result.push({ isHeader: true, name: 'All Test Method Specifications' });
                result.push(...otherStandards);
              }
            } else {
              result.push(...(allStandards || []));
            }
          }
          return result;
        })
      );
    };
  };

  buildChemicalTestMethodSpecificationFetchFnWithSuggestions = (sampleIdx: number, planIdx: number, chemIdx: number, mIdx: number) => {
    return (term: string, page: number, pageSize: number): Observable<any[]> => {
      const isUnknown = this.getSampleGroupSafely(sampleIdx)?.get('isUnknownSample')?.value;
      const methodRow = this.getChemicalMethodRows(sampleIdx, planIdx, chemIdx)?.at(mIdx);
      const val = methodRow?.get('testMethodID')?.value;
      const testId = val ? +val : null;
      const rowKey = `chem_${sampleIdx}_${planIdx}_${chemIdx}_${mIdx}`;
      const pmExplorer = this.explorerProductDataMap[sampleIdx];
      const metalExplorer = this.explorerMetalDataMap[sampleIdx];
      const activeExplorer = (pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0)
        ? pmExplorer
        : metalExplorer;

      const isProductMasterBase = !!(pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0);
      const mappedStandards = this.chemicalStandardsMap[rowKey] || [];

      const labSpecs$ = (testId && !this.labTestStandardsCache[testId])
        ? this.laboratoryTestService.getTestMethodSpecificationByLabTest(testId).pipe(
            tap((specs: any[]) => {
              this.labTestStandardsCache[testId!] = specs || [];
            }),
            catchError(() => of([]))
          )
        : of(this.labTestStandardsCache[testId || 0] || []);

      const allStandards$ = this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);

      return forkJoin([labSpecs$, allStandards$]).pipe(
        map(([labSpecs, allStandards]) => {
          const recommendedList: any[] = [];
          const recIds = new Set<number>();

          // 1. Grade Recommended Test Method Specification
          if (!isUnknown && testId && activeExplorer && activeExplorer.grades) {
            const gradeId = this.getSampleGroupSafely(sampleIdx)?.get('specificationGradeID')?.value;
            const targetGrade = gradeId
              ? (activeExplorer.grades.find((g: ConfiguredGrade) => g.specificationGradeID === +gradeId) || activeExplorer.grades[0])
              : activeExplorer.grades[0];

            const matchingTest = targetGrade?.configuredTests?.find((t: ConfiguredTest) => +t.laboratoryTestID === +testId);
            const specId = matchingTest?.testMethodSpecificationID || matchingTest?.testMethodStandardID;
            const specName = matchingTest?.testMethodSpecificationName || matchingTest?.testMethodStandardName;
            if (matchingTest && specId && +specId > 0) {
              recommendedList.push({
                id: +specId,
                name: specName || 'Configured Test Method Specification',
                isConfigured: true
              });
              recIds.add(+specId);
            }
          }

          // 2. Direct Test Mappings from LaboratoryTest Master
          if (labSpecs && labSpecs.length > 0) {
            labSpecs.forEach((s: any) => {
              if (s.id && !recIds.has(+s.id)) {
                recommendedList.push({
                  id: +s.id,
                  name: s.name,
                  isConfigured: true
                });
                recIds.add(+s.id);
              }
            });
          }

          // 3. Row-level cached mapped standards
          if (mappedStandards && mappedStandards.length > 0) {
            mappedStandards.forEach((s: any) => {
              if (s.id && !recIds.has(+s.id)) {
                recommendedList.push({
                  id: +s.id,
                  name: s.name,
                  isConfigured: true
                });
                recIds.add(+s.id);
              }
            });
          }

          if (recommendedList.length === 0) {
            return allStandards || [];
          }

          const otherStandards = (allStandards || []).filter((s: any) => !recIds.has(+s.id));
          const result: any[] = [];

          const headerTitle = isProductMasterBase 
            ? '⭐ Configured Test Method Specifications' 
            : '⭐ Configured Test Methods (Laboratory Test)';

          if (!term || term.trim() === '') {
            result.push({ isHeader: true, name: headerTitle });
            result.push(...recommendedList);
            if (otherStandards.length > 0) {
              result.push({ isHeader: true, name: 'All Test Method Specifications' });
              result.push(...otherStandards);
            }
          } else {
            const lower = term.toLowerCase().trim();
            const matchingRec = recommendedList.filter((r: any) => r.name.toLowerCase().includes(lower));
            if (matchingRec.length > 0) {
              result.push({ isHeader: true, name: headerTitle });
              result.push(...matchingRec);
              if (otherStandards.length > 0) {
                result.push({ isHeader: true, name: 'All Test Method Specifications' });
                result.push(...otherStandards);
              }
            } else {
              result.push(...(allStandards || []));
            }
          }
          return result;
        })
      );
    };
  };

  // Aliases for template backwards-compatibility
  buildStandardFetchFnWithSuggestions = this.buildTestMethodSpecificationFetchFnWithSuggestions;
  buildChemicalStandardFetchFnWithSuggestions = this.buildChemicalTestMethodSpecificationFetchFnWithSuggestions;

  getLabTestDropdown = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);

  getTestMethodSpecificationDrop = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);

  getTestMethodStandardDrop = this.getTestMethodSpecificationDrop;

  getSpecificationGradeDrop = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.materialSpecificationService.getGradeDropdown(term, page, pageSize);

  getMaterialSpecificationGradeForGeneralWrapper(sampleIdx: number) {
    return (term: string, page: number, pageSize: number) =>
      this.getMaterialSpecificationGradeForGeneral(term, page, pageSize, { sampleIdx });
  }

  getMaterialSpecificationGradeForChemicalWrapper(sampleIdx: number) {
    return (term: string, page: number, pageSize: number) =>
      this.getMaterialSpecificationGradeForChemical(term, page, pageSize, { sampleIdx });
  }

  getMaterialSpecificationGradeForGeneral = (
    term: string,
    page: number,
    pageSize: number,
    context?: any
  ): Observable<any[]> => {
    const sampleIdx = context?.sampleIdx ?? 0;
    const metalId = this.getMetalIdForSample(sampleIdx);
    return this.materialSpecificationService.getGradeDropdownByMetalId(term, page, pageSize, metalId);
  };

  getMaterialSpecificationGradeForChemical = (
    term: string,
    page: number,
    pageSize: number,
    context?: any
  ): Observable<any[]> => {
    const sampleIdx = context?.sampleIdx ?? 0;
    const metalId = this.getMetalIdForSample(sampleIdx);
    return this.materialSpecificationService.getGradeDropdownByMetalId(term, page, pageSize, metalId);
  };

  private getMetalIdForSample(sampleIndex?: number): number {
    if (sampleIndex === undefined || sampleIndex === null) return 0;
    const sampleGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleGroup) return 0;
    const metalId = sampleGroup.get('metalClassificationID')?.value;
    return metalId ? +metalId : 0;
  }

  private getSampleGroupSafely(sampleIndex: number): FormGroup | null {
    if (!this.samples) return null;
    if (typeof sampleIndex !== 'number' || sampleIndex < 0 || sampleIndex >= this.samples.length) {
      return null;
    }
    return this.samples.at(sampleIndex) as FormGroup;
  }

  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.metalService.getMetalClassificationDropdown(term, page, pageSize);

  getProductMasterDrop = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.productMasterService.getDropdown(term, page, pageSize);

  getProductSizeDrop = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.productSizeMasterService.getProductSizeDropdown(term, page, pageSize);

  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);

  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getChemicalParameterDropdown(term, page, pageSize);

  getProductConditions = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.productService.getProductConditionDropdown(term, page, pageSize);

  getTPIAgencies = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.tpiService.getTPIDropdown(term, page, pageSize);

  // ────────────── Quick Preset Chips & Decision Engine Handlers ──────────────
  appendInstruction(sampleIndex: number, text: string): void {
    const sampleGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleGroup) return;
    const ctrl = sampleGroup.get('testInstructions');
    if (!ctrl) return;
    const current = ctrl.value ? ctrl.value.trim() : '';
    if (current.includes(text)) return;
    const updated = current ? `${current}. ${text}` : text;
    ctrl.setValue(updated);
  }

  onProductMasterSelected(item: any, sampleIndex: number): void {
    const sampleGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleGroup) return;
    const pmId = item?.id ?? null;
    const pmName = item?.name ?? '';
    sampleGroup.patchValue({
      productMasterID: pmId,
      productMasterName: pmName
    });

    if (pmId) {
      this.explorerService.getProductMasterExplorer(pmId).subscribe({
        next: (explorerData) => {
          this.explorerProductDataMap[sampleIndex] = explorerData;
          if (explorerData && explorerData.grades && explorerData.grades.length > 0) {
            const firstGrade = explorerData.grades[0];
            sampleGroup.patchValue({
              specificationGradeID: firstGrade.specificationGradeID
            });
          }
        }
      });

      this.inwardService.getProductMasterCascade(pmId).subscribe({
        next: (res: any) => {
          if (res?.success) {
            if (res.metalClassificationID) {
              sampleGroup.patchValue({
                metalClassificationID: res.metalClassificationID,
                metalClassificationName: res.metalClassificationName || ''
              });
            }
            if (res.productSizeMasterID) {
              sampleGroup.patchValue({
                productSizeID: res.productSizeMasterID,
                productSizeName: res.sizeDisplayName || 'Auto Size'
              });
            }
            this.toastService.show('Product Master applied automatically.', 'success');
          }
        }
      });
    } else {
      // Product Master cleared! Switch active suggestions base to Metal Classification
      delete this.explorerProductDataMap[sampleIndex];
      const metalId = sampleGroup.get('metalClassificationID')?.value;
      if (metalId) {
        this.explorerService.getMetalClassificationExplorer(metalId).subscribe({
          next: (metalData: MetalExplorerData) => {
            this.explorerMetalDataMap[sampleIndex] = metalData;
            this.toastService.show('Product Master cleared. Suggestions switched to Metal Classification base.', 'info');
          }
        });
      }
    }
  }

  onProductSizeSelected(item: any, sampleIndex: number): void {
    const sampleGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleGroup) return;
    const sizeId = item?.id ?? null;
    const sizeName = item?.name ?? '';
    sampleGroup.patchValue({
      productSizeID: sizeId,
      productSizeName: sizeName
    });

    const pmId = sampleGroup.get('productMasterID')?.value;

    if (pmId && sizeId) {
      this.inwardService.getProductMasterSizeLimits(pmId, sizeId).subscribe({
        next: (res: any) => {
          if (res?.success && res.parameters?.length) {
            this.toastService.show(`Re-resolved ${res.parameters.length} parameter limits for size ${res.sizeDisplayName || ''}.`, 'info');
          }
        }
      });
    }
  }

  // Technique-First Chemical Selection
  availableTechniques = [
    { code: 'OES', name: 'OES - Optical Emission Spectrometry' },
    { code: 'WET', name: 'WET - Wet Chemical Analysis' },
    { code: 'ICP', name: 'ICP - Inductively Coupled Plasma' },
    { code: 'LECO', name: 'LECO - Carbon / Sulphur Analysis' },
    { code: 'WDXRF', name: 'WDXRF - Wavelength Dispersive XRF' },
    { code: 'EDXRF', name: 'EDXRF - Energy Dispersive XRF' }
  ];

  selectedTechniquesMap: { [key: string]: boolean } = {};

  isTechniqueSelected(sampleIdx: number, techCode: string): boolean {
    return !!this.selectedTechniquesMap[`${sampleIdx}_${techCode}`];
  }

  hasSelectedTechnique(sampleIdx: number): boolean {
    return this.availableTechniques.some(tech => this.isTechniqueSelected(sampleIdx, tech.code));
  }

  toggleTechnique(sampleIdx: number, techCode: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedTechniquesMap[`${sampleIdx}_${techCode}`] = checked;

    const metalId = this.getMetalIdForSample(sampleIdx);
    if (checked) {
      this.toastService.show(`Technique ${techCode} enabled for sample.`, 'info');
    }
  }

  // ────────────── Event Handlers ──────────────
  onProductConditionSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    sampleDetailGroup.patchValue({ productConditionID: item?.id ?? null });
  }

  onMetalClassificationSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    const metalId = item?.id ?? null;
    sampleDetailGroup.patchValue({
      metalClassificationID: metalId,
      metalClassificationName: item?.name ?? ''
    });
    if (metalId) {
      this.metalClassificationSelectedMap[sampleIndex] = item;
      this.explorerService.getMetalClassificationExplorer(metalId).subscribe({
        next: (metalData: MetalExplorerData) => {
          this.explorerMetalDataMap[sampleIndex] = metalData;
        }
      });
    } else {
      delete this.metalClassificationSelectedMap[sampleIndex];
      delete this.explorerMetalDataMap[sampleIndex];
    }
  }

  onTPISelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    sampleDetailGroup.patchValue({ tpiAgencyID: item?.id ?? null });
    if (item?.additionalValues) {
      this.tpiAgencyDetails[sampleIndex] = {
        emailId: item.additionalValues['emailId'] ?? '',
        contactNo: item.additionalValues['contactNo'] ?? ''
      };
    } else {
      delete this.tpiAgencyDetails[sampleIndex];
    }
  }

  onTpiRequiredToggle(sampleIndex: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;

    sampleDetailGroup.patchValue({ tpiRequired: checked });

    if (!checked) {
      sampleDetailGroup.patchValue({ tpiAgencyID: null });
      delete this.tpiAgencyDetails[sampleIndex];
    }
  }

  // Specimen Orientation & Product Form — commented out per client requirement
  // getSpecimenOrientationDrop = (sampleIndex: number) => {
  //   return (term: string, page: number, pageSize: number): Observable<any[]> => {
  //     const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
  //     const metalClassificationID = sampleDetailGroup?.get('metalClassificationID')?.value;
  //     if (metalClassificationID) {
  //       return this.specimenOrientationService.getByClassification(metalClassificationID, term, page, pageSize);
  //     }
  //     return this.specimenOrientationService.getSpecimenOrientationDropdown(term, page, pageSize);
  //   };
  // };

  // onSpecimenOrientationSelected(item: any, sampleIndex: number) {
  //   const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
  //   if (!sampleDetailGroup) return;
  //   sampleDetailGroup.patchValue({ specimenOrientationID: item?.id ?? null });
  // }

  // getProductFormDrop = (term: string, page: number, pageSize: number) => {
  //   return this.productFormService.getProductFormDropdown(term, page, pageSize);
  // };

  // onProductFormSelected(item: any, sampleIndex: number) {
  //   const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
  //   if (!sampleDetailGroup) return;
  //   sampleDetailGroup.patchValue({ productFormID: item?.id ?? null });
  // }

  onSpecificationGradeSelected(
    sampleIndex: number,
    planIndex: number,
    item: any,
    field: 'specification1' | 'specification2',
    testType: 'generalTests' | 'chemicalTests'
  ) {
    const key = `${sampleIndex}_${planIndex}`;
    const section = testType === 'generalTests'
      ? this.getGeneralTestSection(sampleIndex, planIndex)
      : this.getChemicalTestSection(sampleIndex, planIndex);

    const newId = item?.id !== undefined && item?.id !== null ? +item.id : null;
    const otherField = field === 'specification1' ? 'specification2' : 'specification1';
    const otherValRaw = section.get(otherField)?.value;
    const otherVal = otherValRaw !== undefined && otherValRaw !== null ? +otherValRaw : null;

    if (newId && otherVal && newId === otherVal) {
      section.patchValue({ [field]: null });
      this.toastService.show('Specification 1 and Specification 2 cannot be the same.', 'warning');
      return;
    }

    section.patchValue({ [field]: newId });

    const spec1 = section.get('specification1')?.value;
    const spec2 = section.get('specification2')?.value;
    const specsToUse = [spec1, spec2].filter(s => s).map(s => String(s));

    const sampleGroup = this.samples.at(sampleIndex) as FormGroup;
    const metalId = sampleGroup.get('metalClassificationID')?.value || null;
    const productConditionId = sampleGroup.get('productConditionID')?.value || null;

    // General Test Logic — fetch mechanical limits for info
    if (testType === 'generalTests' && spec1) {
      this.materialSpecificationService
        .getMechanicalLimitsByGrade(spec1, spec2 || undefined)
        .subscribe({
          next: (limits: any[]) => {
            if (limits?.length > 0) {
              this.toastService.show(
                `${limits.length} mechanical spec limits found for selected grade.`,
                'info'
              );
            }
          }
        });
    }

    // Chemical Test Logic
    if (testType === 'chemicalTests') {
      // Fetch chemical elements
      this.materialSpecificationService
        .getChemicalElementsBySpecifications(spec1 || 0, spec2 || 0)
        .subscribe({
          next: (elements: any[]) => {
            const elementsArray = section.get('elements') as FormArray;

            if (!elements || elements.length === 0) {
              this.toastService.show(
                'No chemical elements found for selected specifications.',
                'info'
              );
              return;
            }

            const existingMap = new Map<number, AbstractControl>();

            elementsArray.controls.forEach(ctrl => {
              const id = ctrl.get('parameterID')?.value;
              existingMap.set(id, ctrl);
            });

            const nextControls: AbstractControl[] = [];

            elements.forEach(el => {
              const id = el.parameterID || el.id || 0;
              const existing = existingMap.get(id);

              if (existing) {
                const patch: any = {
                  specificationLineID: el.specificationLineID || 0,
                  parameterName: el.parameterName || '',
                  minValue: el.minValue ?? null,
                  maxValue: el.maxValue ?? null,
                  parameterUnitID: el.parameterUnitID || 0,
                  parameterUnit: el.parameterUnit || '',
                };

                if (el.isCommon !== undefined && el.isCommon !== null) {
                  patch.selected = el.isCommon ?? false;
                }

                existing.patchValue(patch);
                nextControls.push(existing);
              } else {
                nextControls.push(
                  this.fb.group({
                    parameterID: [id],
                    specificationLineID: [el.specificationLineID || 0],
                    parameterName: [el.parameterName || ''],
                    minValue: [el.minValue ?? null],
                    maxValue: [el.maxValue ?? null],
                    parameterUnitID: [el.parameterUnitID || 0],
                    parameterUnit: [el.parameterUnit || ''],
                    selected: [true],
                  })
                );
              }
            });

            // Replace FormArray contents safely (no clear)
            while (elementsArray.length) {
              elementsArray.removeAt(0);
            }
            nextControls.forEach(ctrl => elementsArray.push(ctrl));
          },

          error: err => {
            console.error('[PlanForm] Error fetching chemical elements', err);
            this.toastService.show(
              'Error fetching chemical elements. Please try again.',
              'error'
            );
          },
        });

    }

    // Auto-trigger test suggestions only on create (not edit — user must click manually)
    const isEditing = this.isEditMode || (this.inwardID != null && this.inwardID > 0);
    if (newId && !isEditing) {
      this.loadSuggestedTests(sampleIndex, planIndex);
    }
  }

  onLaboratorySelected(item: any, sampleIndex: number, planIndex: number, methodIndex: number) {
    const methodsArray = this.getMethodRows(sampleIndex, planIndex);
    if (!methodsArray) return;

    const methodCtrl = methodsArray.at(methodIndex);
    if (!methodCtrl) return;

    methodCtrl.patchValue({
      testMethodID: item?.id ?? null,
    });
  }

  onLaboratoryTestSelected(item: any, sampleIndex: number, planIndex: number, methodIndex: number) {
    const methodsArray = this.getMethodRows(sampleIndex, planIndex);
    if (!methodsArray) return;

    const methodCtrl = methodsArray.at(methodIndex);
    if (!methodCtrl) return;

    methodCtrl.patchValue({
      testMethodID: item?.id ?? null,
    });
  }

  onParameterSelected(item: any, sampleIndex: number, planIndex: number, testIndex: number, index: number) {
    this.getElementRows(sampleIndex, planIndex).at(index).patchValue({ parameterID: item.id });
  }

  // ────────────── Form Update & Validators ──────────────
  uniqueSpecificationValidator(group: FormGroup) {
    const spec1 = group.get('specification1')?.value;
    const spec2 = group.get('specification2')?.value;
    if (spec1 && spec2 && +spec1 === +spec2) return { sameSpecification: true };
    return null;
  }

  updateFormFromPayload(payload: any): void {
    this.planForm.patchValue({
      id: payload.id ?? 0,
      caseNo: payload.caseNo ?? '',
      sampleReceiptNote: payload.sampleReceiptNote ?? '',
      urgent: payload.urgent ?? false,
      returnSample: payload.returnSample ?? false,
      notDestroyed: payload.notDestroyed ?? false,
      statementOfConformity: payload.statementOfConformity ?? 'Not Applicable',
      decisionRule: payload.decisionRule ?? 'Not Applicable'
    });

    this.samples.clear();

    (payload.sampleDetails || []).forEach((sample: any, sampleIdx: number) => {
      const additionalDetailsArr = (payload.sampleAdditionalDetails || [])
        .filter((ad: any) => ad.sampleID === sample.id)
        .map((ad: any) => this.fb.group({
          id: [ad.id],
          sampleID: [ad.sampleID],
          sampleNo: [sample.sampleNo],
          label: [ad.label],
          value: [ad.value],
          enabled: [true]
        }));

      const testPlansArr = (payload.sampleTestPlans || [])
        .filter((tp: any) => tp.sampleID === sample.id)
        .map((tp: any, planIdx: number) => {
          const generalTestsArr = (tp.generalTests || []).map((gt: any) =>
            this.fb.group({
              id: [gt.id || 0],
              sampleNo: [sample.sampleNo],
              specification1: [gt.specification1 !== undefined && gt.specification1 !== null ? +gt.specification1 : null],
              specification2: [gt.specification2 !== undefined && gt.specification2 !== null ? +gt.specification2 : null],
              parameter: [gt.parameter],
              methods: this.fb.array((gt.methods || []).map((m: any) => this.fb.group({
                id: [m.id || 0],
                testMethodID: [m.testMethodID, Validators.required],
                quantity: [m.quantity || 1],
                reportNo: [m.reportNo || ''],
                ulrNo: [m.ulrNo || ''],
                cancel: [m.cancel || false],
                standardID: [m.standardID || null],
                standardName: [m.standardName || '']
              })))
            })
          );

          const chemicalTestsArr = (tp.chemicalTests || []).map((ct: any) => {
            const testTypeIds: number[] = (ct.testTypeIds || []).map((id: any) => +id);

            return this.fb.group({
              id: [ct.id || 0],
              sampleNo: [sample.sampleNo],
              reportNo: [ct.reportNo],
              ulrNo: [ct.ulrNo],
              testTypeIds: [testTypeIds],
              specification1: [
                ct.specification1 !== undefined && ct.specification1 !== null ? +ct.specification1 : null
              ],
              specification2: [
                ct.specification2 !== undefined && ct.specification2 !== null ? +ct.specification2 : null
              ],
              elements: this.fb.array((ct.elements || []).map((el: any) =>
                this.fb.group({
                  id: [el.id || 0],
                  parameterID: [el.parameterID || 0],
                  specificationLineID: [el.specificationLineID || 0],
                  parameterName: [el.parameterName || ''],
                  minValue: [el.minValue ?? null],
                  maxValue: [el.maxValue ?? null],
                  parameterUnitID: [el.parameterUnitID || 0],
                  parameterUnit: [el.parameterUnit || ''],
                  selected: [el.selected ?? false]
                })
              ))
            });
          });


          this.setDefaultTab(sampleIdx, planIdx, tp);
          return this.fb.group({
            id: [tp.id || 0],
            sampleNo: [tp.sampleNo],
            sampleID: [sample.id || 0],
            version: [tp.version ?? 1],
            replanCount: [tp.replanCount ?? 0],
            planStatus: [tp.planStatus ?? 'Draft'],
            approvedById: [tp.approvedById ?? null],
            approvedByName: [tp.approvedByName ?? ''],
            approvedAt: [tp.approvedAt ?? null],
            generalTests: this.fb.array(generalTestsArr),
            chemicalTests: this.fb.array(chemicalTestsArr)
          });
        });

      this.samples.push(this.fb.group({
        id: [sample.id ?? 0],
        inwardID: [sample.inwardID ?? 0],
        sampleNo: [sample.sampleNo],
        details: [sample.details],
        metalClassificationID: [sample.metalClassificationID],
        metalClassificationName: [sample.metalClassificationName ?? ''],
        productMasterID: [sample.productMasterID ?? null],
        productMasterName: [sample.productMasterName ?? ''],
        specificationGradeID: [sample.specificationGradeID ?? null],
        isUnknownSample: [sample.isUnknownSample ?? false],
        assignedGradeID: [null],
        assignedGradeNote: [''],
        productSizeID: [sample.productSizeID ?? sample.productSizeMasterID ?? null],
        productSizeName: [sample.productSizeName ?? sample.sizeDisplayName ?? ''],
        productConditionID: [sample.productConditionID],
        specimenOrientationID: [sample.specimenOrientationID],
        productFormID: [sample.productFormID],
        tpiAgencyID: [sample.tpiAgencyID],
        remarks: [sample.remarks],
        quantity: [sample.quantity],
        preparationRequired: [sample.preparationRequired ?? false],
        machiningRequired: [sample.machiningRequired ?? false],
        machiningAmount: [sample.machiningAmount ?? 0],
        specimen: [sample.specimen ?? ''],
        otherPreparation: [sample.otherPreparation ?? false],
        otherPreparationCharge: [sample.otherPreparationCharge ?? 0],
        tpiRequired: [sample.tpiRequired ?? false],
        testInstructions: [sample.testInstructions ?? ''],
        thickness: [sample.thickness ?? null],
        diameter: [sample.diameter ?? null],
        width: [sample.width ?? null],
        length: [sample.length ?? null],
        fileName: [sample.fileName ?? ''],
        sampleFilePath: [sample.sampleFilePath ?? ''],
        uploadReferenceID: [sample.uploadReferenceID ?? null],
        additionalDetails: this.fb.array(additionalDetailsArr),
        testPlans: this.fb.array(testPlansArr)
      }));

    });
  }
  // ────────────── Empty-tab detection ──────────────
  private findEmptyTabs(): { sampleIdx: number; planIdx: number; type: 'generalTests' | 'chemicalTests'; sampleNo: string; label: string }[] {
    const result: { sampleIdx: number; planIdx: number; type: 'generalTests' | 'chemicalTests'; sampleNo: string; label: string }[] = [];
    for (let i = 0; i < this.samples.length; i++) {
      const plans = this.getTestPlans(i);
      for (let j = 0; j < plans.length; j++) {
        const plan = plans.at(j) as FormGroup;
        const sampleNo = plan.get('sampleNo')?.value || `Sample ${i + 1}`;

        const generalTests = plan.get('generalTests') as FormArray;
        if (generalTests && generalTests.length > 0) {
          const allBlank = (generalTests.controls as FormGroup[]).every(
            gt => ((gt.get('methods') as FormArray)?.length ?? 0) === 0
          );
          if (allBlank) result.push({ sampleIdx: i, planIdx: j, type: 'generalTests', sampleNo, label: 'General Test' });
        }

        const chemicalTests = plan.get('chemicalTests') as FormArray;
        if (chemicalTests && chemicalTests.length > 0) {
          const allBlank = (chemicalTests.controls as FormGroup[]).every(ct => {
            const elements = ct.get('elements') as FormArray;
            return (elements?.length ?? 0) === 0 && !(ct.get('testTypeIds')?.value?.length > 0);
          });
          if (allBlank) result.push({ sampleIdx: i, planIdx: j, type: 'chemicalTests', sampleNo, label: 'Chemical Test' });
        }
      }
    }
    return result;
  }

  private checkEmptyTabsAndProceed(action: () => void): boolean {
    const emptyTabs = this.findEmptyTabs();
    if (emptyTabs.length > 0) {
      this.emptyTabsList = emptyTabs.map(t => ({ sampleNo: t.sampleNo, label: t.label }));
      this.pendingEmptyTabs = emptyTabs;
      this.pendingSubmitAction = action;
      this.showEmptyTabsDialog = true;
      return false;
    }
    return true;
  }

  removeEmptyTabsAndContinue(): void {
    for (const item of this.pendingEmptyTabs) {
      const arr = this.getTestArray(item.sampleIdx, item.planIdx, item.type);
      while (arr.length > 0) arr.removeAt(0);
    }
    this.showEmptyTabsDialog = false;
    const action = this.pendingSubmitAction;
    this.pendingSubmitAction = null;
    this.pendingEmptyTabs = [];
    action?.();
  }

  // ────────────── Submission ──────────────
  onSave(): void {
    this.planForm.markAllAsTouched();
    if (!this.planForm.valid) {
      this.toastService.show('Please fix form validation errors.', 'warning');
      return;
    }
    const missingSamples = this.getSamplesWithoutTests();
    if (missingSamples.length > 0) {
      this.toastService.show(`Please select at least one test for: ${missingSamples.join(', ')}`, 'warning');
      return;
    }
    if (!this.checkEmptyTabsAndProceed(() => this.proceedSave())) return;
    this.proceedSave();
  }

  private proceedSave(): void {
    const payload = this.buildPayload(SampleStatus.UNDER_PLANNING);
    this.inwardService.testPlanSave(payload).subscribe({
      next: () => {
        this.saved = true;
        this.toastService.show('Test Plan saved successfully!', 'success');
        this.router.navigate(['/sample/inward']);
      },
      error: (err) => {
        console.error('[PlanForm] Save Error:', err);
        this.toastService.show('Error saving test plan.', 'error');
      }
    });
  }

  // Check if Send for Review button should be visible
  canSendForReview(): boolean {
    return this.currentStatus === SampleStatus.UNDER_PLANNING;
  }

  onSendForReview(): void {
    this.planForm.markAllAsTouched();
    if (!this.planForm.valid) {
      this.toastService.show('Please fix form validation errors.', 'warning');
      return;
    }
    const missingSamples = this.getSamplesWithoutTests();
    if (missingSamples.length > 0) {
      this.toastService.show(`Please select at least one test for: ${missingSamples.join(', ')}`, 'warning');
      return;
    }
    if (!this.checkEmptyTabsAndProceed(() => this.proceedSendForReview())) return;
    this.proceedSendForReview();
  }

  private proceedSendForReview(): void {
    const payload = this.buildPayload(SampleStatus.UNDER_REVIEW_REQUEST);
    this.inwardService.sendTestPlanForReview(payload).subscribe({
      next: () => {
        this.saved = true;
        this.toastService.show('Plan sent for review successfully!', 'success');
        this.router.navigate(['/sample/inward']);
      },
      error: (err) => {
        console.error('[PlanForm] Review Error:', err);
        this.toastService.show('Failed to send plan for review.', 'error');
      }
    });
  }

  private buildPayload(status?: string) {
    const raw = this.planForm.getRawValue();

    return {
      id: raw.id || 0,
      caseNo: raw.caseNo || '',
      customerID: raw.customerID || 0,
      statementOfConformity: raw.statementOfConformity || 'Not Applicable',
      decisionRule: raw.decisionRule || 'Not Applicable',
      status: status || 'PLAN_DRAFT',

      sampleDetails: (raw.samples || []).map((s: any) => ({
        id: s.id || 0,
        sampleNo: s.sampleNo || '',
        details: s.details || '',
        productConditionID: s.productConditionID || null,
        metalClassificationID: s.metalClassificationID || null,
        specimenOrientationID: s.specimenOrientationID || null,
        productFormID: s.productFormID || null,
        tpiAgencyID: s.tpiAgencyID || null,
        remarks: s.remarks || '',
        quantity: s.quantity || 0,
        thickness: s.thickness ?? null,
        diameter: s.diameter ?? null,
        width: s.width ?? null,
        length: s.length ?? null,
        disabled: s.disabled || false,
        preparationRequired: s.preparationRequired || false,
        machiningRequired: s.machiningRequired || false,
        machiningAmount: s.machiningAmount || 0,
        specimen: s.specimen ?? '',
        otherPreparation: s.otherPreparation || false,
        otherPreparationCharge: s.otherPreparationCharge || 0,
        tpiRequired: s.tpiRequired || false,
        testInstructions: s.testInstructions || '',
        uploadReferenceID: s.uploadReferenceID || null,
        sampleFilePath: s.sampleFilePath || null,
        fileName: s.fileName || null,
        inwardID: s.inwardID || 0,

        additionalDetails: (s.additionalDetails || []).map((a: any) => ({
          id: a.id || 0,
          sampleNo: s.sampleNo,
          label: a.label || '',
          value: a.value || '',
          sampleID: a.sampleID || 0
        })),

        testPlans: (s.testPlans || []).map((tp: any) => ({
          id: tp.id || 0,
          sampleNo: s.sampleNo,
          sampleID: s.id || 0,

          generalTests: (tp.generalTests || []).map((g: any) => ({
            // include id if present so backend can reconcile additions/deletions
            id: g.id || 0,
            sampleNo: g.sampleNo || '',
            specification1: g.specification1 || null,
            specification2: g.specification2 || null,
            parameter: g.parameter || '',
            methods: (g.methods || []).map((m: any) => ({
              id: m.id || 0,
              testMethodID: m.testMethodID || 0,
              quantity: m.quantity || 0,
              reportNo: m.reportNo === 'Auto Generate' ? '' : m.reportNo || '',
              ulrNo: m.ulrNo === 'Auto Generate' ? '' : m.ulrNo || '',
              cancel: m.cancel || false
            }))
          })),

          chemicalTests: (tp.chemicalTests || []).map((c: any) => ({
            id: c.id || 0,
            sampleNo: c.sampleNo || '',
            reportNo: c.reportNo === 'Auto Generate' ? '' : c.reportNo || '',
            ulrNo: c.ulrNo === 'Auto Generate' ? '' : c.ulrNo || '',
            testTypeIds: c.testTypeIds || [],
            specification1: c.specification1 || 0,
            specification2: c.specification2 || null,
            elements: (c.elements || []).map((e: any) => ({
              id: e.id || 0,
              parameterID: e.parameterID || 0,
              specificationLineID: e.specificationLineID || 0,
              parameterName: e.parameterName || '',
              minValue: e.minValue ?? null,
              maxValue: e.maxValue ?? null,
              parameterUnitID: e.parameterUnitID || 0,
              parameterUnit: e.parameterUnit || '',
              selected: e.selected || false
            }))
          }))
        }))
      }))
    };
  }

  // ────────────── Plan History ──────────────
  togglePlanHistory(planId: number): void {
    if (this.activeHistoryPlanId === planId && this.showHistoryPanel) {
      this.showHistoryPanel = false;
      this.activeHistoryPlanId = null;
      return;
    }
    this.activeHistoryPlanId = planId;
    this.showHistoryPanel = true;
    this.loadPlanHistory(planId);
  }

  loadPlanHistory(planId: number): void {
    this.inwardService.getPlanHistory(planId).subscribe({
      next: (data) => {
        this.planHistoryData = data || [];
      },
      error: (err) => {
        console.error('[PlanForm] Error loading plan history:', err);
        this.planHistoryData = [];
      },
    });
  }

  // ────────────── Replan ──────────────
  openReplanModal(planId: number): void {
    this.replanPlanId = planId;
    this.replanReason = '';
    this.showReplanModal = true;
  }

  closeReplanModal(): void {
    this.showReplanModal = false;
    this.replanPlanId = null;
    this.replanReason = '';
  }

  submitReplanRequest(): void {
    if (!this.replanPlanId || !this.replanReason.trim()) {
      this.toastService.show('Please provide a reason for replanning.', 'warning');
      return;
    }
    this.inwardService.requestReplan(this.replanPlanId, this.replanReason).subscribe({
      next: () => {
        this.toastService.show('Replan request submitted successfully!', 'success');
        this.closeReplanModal();
        if (this.inwardID) this.fetchSampleInwardDetails(this.inwardID);
      },
      error: (err) => {
        console.error('[PlanForm] Replan request error:', err);
        this.toastService.show('Failed to submit replan request.', 'error');
      },
    });
  }

  parseFieldChanges(json: string | null): any[] | null {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }

  isPlanApproved(testPlan: any): boolean {
    return testPlan?.get('planStatus')?.value === 'Approved';
  }

  /** Save button visible only when at least one plan is in editable status */
  canSavePlan(): boolean {
    if (this.isViewMode) return false;
    const editableStatuses = ['Draft', 'ReplanRequested', 'ReplanApproved'];
    let hasAnyPlan = false;
    for (let i = 0; i < this.samples.length; i++) {
      const plans = this.getTestPlans(i);
      for (let j = 0; j < plans.length; j++) {
        hasAnyPlan = true;
        const status = plans.at(j).get('planStatus')?.value;
        if (!status || editableStatuses.includes(status)) return true;
      }
    }
    // Allow save when no plans exist yet (new plan or plans not yet created)
    return !hasAnyPlan;
  }

  getPlanStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      Draft: 'Draft',
      Submitted: 'Submitted',
      UnderReview: 'Under Review',
      Approved: 'Approved',
      ReplanRequested: 'Replan Requested',
      ReplanApproved: 'Replan Approved',
      Cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }

  getPlanStatusClass(status: string): string {
    const classes: Record<string, string> = {
      Draft: 'badge-draft',
      Submitted: 'bg-info text-white',
      UnderReview: 'bg-warning text-dark',
      Approved: 'bg-success text-white',
      ReplanRequested: 'bg-danger text-white',
      ReplanApproved: 'bg-primary text-white',
      Cancelled: 'bg-light text-secondary border',
      'No Plan': 'badge-no-plan',
    };
    return classes[status] || 'badge-draft';
  }

  // ────────────── Auto-Suggest Tests ──────────────
  loadSuggestedTests(sampleIdx: number, planIdx: number): void {
    const key = `${sampleIdx}_${planIdx}`;
    this.suggestLoading[key] = true;
    this.showSuggestPanel[key] = true;

    const sampleGroup = this.getSampleGroupSafely(sampleIdx);
    if (!sampleGroup) {
      this.suggestLoading[key] = false;
      return;
    }

    const testPlans = this.getTestPlans(sampleIdx);
    if (planIdx >= testPlans.length) {
      this.suggestLoading[key] = false;
      return;
    }

    const plan = testPlans.at(planIdx) as FormGroup;
    const generalTests = plan.get('generalTests') as FormArray;
    const chemicalTests = plan.get('chemicalTests') as FormArray;

    let specificationGradeId: number | undefined;

    if (generalTests && generalTests.length > 0) {
      const spec1 = generalTests.at(0).get('specification1')?.value;
      if (spec1) specificationGradeId = +spec1;
    }
    if (!specificationGradeId && chemicalTests && chemicalTests.length > 0) {
      const spec1 = chemicalTests.at(0).get('specification1')?.value;
      if (spec1) specificationGradeId = +spec1;
    }

    const metalClassificationId = sampleGroup.get('metalClassificationID')?.value
      ? +sampleGroup.get('metalClassificationID')!.value : undefined;
    const productConditionId = sampleGroup.get('productConditionID')?.value
      ? +sampleGroup.get('productConditionID')!.value : undefined;
    const customerId = this.planForm.get('customerID')?.value
      ? +this.planForm.get('customerID')!.value : undefined;

    const request: SmartSuggestRequest = {
      specificationGradeId,
      metalClassificationId,
      productConditionId,
      customerId,
    };

    this.testAutoSuggestService.getSmartSuggestions(request).subscribe({
      next: (result) => {
        this.suggestedTests = (result?.suggestedTests || []).map((item: SuggestedTestDto) => ({
          ...item,
          selected: false
        }));
        this.suggestLoading[key] = false;
        if (this.suggestedTests.length === 0) {
          this.toastService.show('No test suggestions found for current context.', 'info');
        }
      },
      error: (err) => {
        console.error('[PlanForm] Error loading smart suggestions:', err);
        this.suggestedTests = [];
        this.suggestLoading[key] = false;
        this.toastService.show('Failed to load test suggestions.', 'error');
      }
    });
  }

  toggleAllSuggestions(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.suggestedTests.forEach(t => t.selected = checked);
  }

  hasSelectedSuggestions(): boolean {
    return this.suggestedTests.some(t => t.selected);
  }

  closeSuggestPanel(sampleIdx: number, planIdx: number): void {
    const key = `${sampleIdx}_${planIdx}`;
    this.showSuggestPanel[key] = false;
    this.suggestedTests = [];
  }

  addSelectedSuggestedTests(sampleIdx: number, planIdx: number): void {
    const selected = this.suggestedTests.filter(t => t.selected);
    if (selected.length === 0) {
      this.toastService.show('Please select at least one test to add.', 'warning');
      return;
    }

    const methodsArray = this.getMethodRows(sampleIdx, planIdx);
    if (!methodsArray) {
      this.toastService.show('Please add a General Test block first.', 'warning');
      return;
    }

    const existingIds = new Set<number>();
    methodsArray.controls.forEach(ctrl => {
      const id = ctrl.get('testMethodID')?.value;
      if (id) existingIds.add(+id);
    });

    let addedCount = 0;
    selected.forEach(test => {
      const testId = test.laboratoryTestID || test.testMethodId || test.laboratoryTestId || test.id;
      if (testId && !existingIds.has(+testId)) {
        const row = this.createTestMethodRow('', '');
        row.patchValue({ testMethodID: +testId, quantity: test.isPerBatch ? 1 : 1 });
        methodsArray.push(row);
        existingIds.add(+testId);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.toastService.show(`${addedCount} suggested test(s) added to plan.`, 'success');
    } else {
      this.toastService.show('Selected tests are already in the plan.', 'info');
    }

    this.closeSuggestPanel(sampleIdx, planIdx);
  }

  getSuggestBadgeClass(source: string): string {
    const map: Record<string, string> = {
      'Spec Required': 'bg-primary',
      'Lab Scope': 'bg-success',
      'Customer Favorite': 'bg-warning text-dark',
      'Most Popular': 'bg-info',
      'Trending': 'bg-purple',
    };
    return map[source] || 'bg-secondary';
  }

  onCancel(): void {
    this.planForm.reset();
    this.router.navigate(['/sample/inward']);
  }

  // ────────────── UI Helpers ──────────────
  openFileInNewTab(filePath: string): void {
    if (filePath) window.open(this.baseUrl + filePath, '_blank');
  }

  setDefaultTab(sampleIdx: number, planIdx: number, plan: any) {
    const key = `${sampleIdx}-${planIdx}`;
    if (plan?.generalTests?.length > 0) this.activeTabs[key] = 'general';
    else if (plan?.chemicalTests?.length > 0) this.activeTabs[key] = 'chemical';
    else this.activeTabs[key] = 'general';
  }

  isActiveTab(sampleIdx: number, planIdx: number, tab: string): boolean {
    return this.activeTabs[`${sampleIdx}-${planIdx}`] === tab;
  }

  setActiveTab(sampleIdx: number, planIdx: number, tab: 'general' | 'chemical') {
    this.activeTabs[`${sampleIdx}-${planIdx}`] = tab;

    if (!this.isViewMode) {
      const type = tab === 'general' ? 'generalTests' : 'chemicalTests';
      const arr = this.getTestArray(sampleIdx, planIdx, type);
      if (arr && arr.length === 0) {
        this.addTestBlock(sampleIdx, planIdx, type);
        // For General Test: also add one blank method row inside the new group
        if (tab === 'general') {
          this.addMethodRow(sampleIdx, planIdx);
        }
      }
    }
  }

  // Dropdown functions for template
  getMetalDrop = this.getMetalClassification;
  getProductConditionDrop = this.getProductConditions;
  getParameterDrop = this.getChemicalParameter;
  subGroupStandardsMap: { [key: string]: any[] } = {};
  chemicalStandardsMap: { [key: string]: any[] } = {};
  complianceMap: { [key: string]: any } = {};
  isScopeConfiguredMap: { [key: string]: boolean } = {};
  explorerProductDataMap: { [sampleIdx: number]: any } = {};
  explorerMetalDataMap: { [sampleIdx: number]: any } = {};
  labTestStandardsCache: { [testId: number]: any[] } = {};
  gradeSuggestedSpecsMap: { [sampleIdx: number]: any[] } = {};

  getStandardsForSubGroupFn = (sampleIdx: number, planIdx: number, methodIdx: number) => {
    return (term: string, page: number, pageSize: number): Observable<any[]> => {
      const key = `${sampleIdx}_${planIdx}_${methodIdx}`;
      const mapped = this.subGroupStandardsMap[key];
      if (mapped && mapped.length > 0) {
        if (term && term.trim()) {
          const t = term.toLowerCase();
          return of(mapped.filter(m => m.name.toLowerCase().includes(t)));
        }
        return of(mapped);
      }
      return this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);
    };
  };

  evaluateRowCompliance(sampleIdx: number, planIdx: number, methodIdx: number, isChemical: boolean = false): void {
    const sample = this.getSampleDetails(sampleIdx);
    const methodRow = isChemical 
      ? this.getChemicalMethodRows(sampleIdx, planIdx, 0)?.at(methodIdx)
      : this.getMethodRows(sampleIdx, planIdx)?.at(methodIdx);
    if (!sample || !methodRow) return;

    const rowKey = isChemical ? `chem_${sampleIdx}_${planIdx}_0_${methodIdx}` : `${sampleIdx}_${planIdx}_${methodIdx}`;
    const payload = {
      productMasterID: sample.get('productMasterID')?.value || null,
      metalClassificationID: sample.get('metalClassificationID')?.value || null,
      specificationGradeID: sample.get('specificationGradeID')?.value || null,
      laboratoryTestSubGroupID: isChemical ? null : methodRow.get('testMethodID')?.value,
      laboratoryTestAnalysisTypeID: isChemical ? methodRow.get('testMethodID')?.value : null,
      testMethodSpecificationID: methodRow.get('standardID')?.value || null,
      isUnknownSample: !!sample.get('isUnknownSample')?.value
    };

    this.laboratoryTestService.evaluateCompliance(payload).subscribe({
      next: (res: any) => {
        this.complianceMap[rowKey] = res;
        this.isScopeConfiguredMap[sampleIdx] = res.isScopeConfigured;
      }
    });
  }

  loadMachineSpectroMatrix(sampleIdx: number, planIdx: number, analysisTypeId: number): void {
    if (!analysisTypeId) return;
    this.laboratoryTestService.getAnalysisTypeParameters(analysisTypeId).subscribe({
      next: (params: any[]) => {
        const chemGroup = this.getChemicalTestSection(sampleIdx, planIdx);
        if (!chemGroup) return;

        const elements = chemGroup.get('elements') as FormArray;
        while (elements.length) elements.removeAt(0);

        if (!params || params.length === 0) {
          this.toastService.show('No machine spectro elements configured for this Analysis Type.', 'info');
          return;
        }

        params.forEach(p => {
          const row = this.createElementRow();
          row.patchValue({
            parameterID: p.id,
            parameterName: p.name,
            parameterUnit: p.description || '',
            selected: true
          });
          elements.push(row);
        });

        this.toastService.show(`Loaded ${params.length} Machine Spectro Parameters directly from Analysis Type.`, 'success');
      }
    });
  }

  onLabTestSubGroupSelected(item: any, sampleIdx: number, planIdx: number, methodIdx: number): void {
    const methodRow = this.getMethodRows(sampleIdx, planIdx).at(methodIdx);
    if (!methodRow) return;

    const testId = item?.id ? +item.id : null;
    methodRow.patchValue({
      testMethodID: testId
    });

    if (testId) {
      this.laboratoryTestService.getTestMethodSpecificationByLabTest(testId).subscribe({
        next: (specs: any[]) => {
          const key = `${sampleIdx}_${planIdx}_${methodIdx}`;
          this.labTestStandardsCache[testId] = specs || [];
          if (specs && specs.length === 1) {
            // Auto-bind single configured test method specification
            const single = specs[0];
            methodRow.patchValue({
              standardID: single.id,
              standardName: single.name
            });
            this.toastService.show(`Auto-bound test method specification "${single.name}" for ${item.name || 'test'}.`, 'info');
          } else if (specs && specs.length > 1) {
            // Store multiple configured test method specifications for dropdown filtering
            this.subGroupStandardsMap[key] = specs;
            this.toastService.show(`Found ${specs.length} recommended test method specifications for ${item.name || 'test'}. Please select.`, 'info');
          } else {
            delete this.subGroupStandardsMap[key];
          }
          this.evaluateRowCompliance(sampleIdx, planIdx, methodIdx);
        },
        error: () => {
          this.laboratoryTestService.getTestMethodSpecificationBySubGroup(testId).subscribe({
            next: (specs: any[]) => {
              const key = `${sampleIdx}_${planIdx}_${methodIdx}`;
              this.labTestStandardsCache[testId] = specs || [];
              if (specs && specs.length === 1) {
                const single = specs[0];
                methodRow.patchValue({
                  standardID: single.id,
                  standardName: single.name
                });
              } else if (specs && specs.length > 1) {
                this.subGroupStandardsMap[key] = specs;
              }
              this.evaluateRowCompliance(sampleIdx, planIdx, methodIdx);
            }
          });
        }
      });
    }
  }

  onTestMethodSpecificationSelected(item: any, si: number, pi: number, mi: number): void {
    this.getMethodRows(si, pi).at(mi).patchValue({
      standardID: item?.id ?? null,
      standardName: item?.name ?? ''
    });
    this.evaluateRowCompliance(si, pi, mi);
  }

  onStandardSelected = this.onTestMethodSpecificationSelected;

  onChemicalLabTestSelected(item: any, sampleIdx: number, planIdx: number, chemIdx: number, mIdx: number): void {
    const methodRow = this.getChemicalMethodRows(sampleIdx, planIdx, chemIdx)?.at(mIdx);
    if (!methodRow) return;

    const testId = item?.id ? +item.id : null;
    methodRow.patchValue({
      testMethodID: testId
    });

    if (testId) {
      this.laboratoryTestService.getTestMethodSpecificationByLabTest(testId).subscribe({
        next: (specs: any[]) => {
          const key = `chem_${sampleIdx}_${planIdx}_${chemIdx}_${mIdx}`;
          this.labTestStandardsCache[testId] = specs || [];
          if (specs && specs.length === 1) {
            const single = specs[0];
            methodRow.patchValue({
              standardID: single.id,
              standardName: single.name
            });
            this.toastService.show(`Auto-bound test method specification "${single.name}" for ${item.name || 'test'}.`, 'info');
          } else if (specs && specs.length > 1) {
            this.chemicalStandardsMap[key] = specs;
            this.toastService.show(`Found ${specs.length} recommended test method specifications for ${item.name || 'test'}. Please select.`, 'info');
          } else {
            delete this.chemicalStandardsMap[key];
          }
          this.evaluateRowCompliance(sampleIdx, planIdx, mIdx, true);
        },
        error: () => {
          this.evaluateRowCompliance(sampleIdx, planIdx, mIdx, true);
        }
      });
    }
  }

  onChemicalTestMethodSpecificationSelected(item: any, sampleIdx: number, planIdx: number, chemIdx: number, mIdx: number): void {
    const methodRow = this.getChemicalMethodRows(sampleIdx, planIdx, chemIdx)?.at(mIdx);
    if (!methodRow) return;
    methodRow.patchValue({
      standardID: item?.id ?? null,
      standardName: item?.name ?? ''
    });
    this.evaluateRowCompliance(sampleIdx, planIdx, mIdx, true);
  }

  onChemicalStandardSelected = this.onChemicalTestMethodSpecificationSelected;

  onChemicalTestTypesSelected(items: any[], sampleIdx: number, planIdx: number, chemIdx: number): void {
    const ids = items.map(i => i.id);
    this.getTestArray(sampleIdx, planIdx, 'chemicalTests').at(chemIdx).get('testTypeIds')?.setValue(ids);
    this.planForm.markAsDirty();
  }

  onCombinedChemicalTestTypesSelected(items: any[]): void {
    this.combinedPlanForm.get('testTypeIds')?.setValue(items.map(i => i.id));
  }


  onApplyGradeConfig(grade: ConfiguredGrade): void {
    if (this.isViewMode || !grade) return;
    const sampleIdx = this.activeSampleIdx;
    const testPlans = this.getTestPlans(sampleIdx);
    if (!testPlans || testPlans.length === 0) {
      this.addPlanToSample(sampleIdx);
    }
    const planIdx = 0;

    // 1. Process General Tests (Non-Chemical)
    const genSection = this.getGeneralTestSection(sampleIdx, planIdx);
    if (genSection && grade.specificationGradeID) {
      genSection.patchValue({ specification1: grade.specificationGradeID });
    }

    const methodsArray = this.getMethodRows(sampleIdx, planIdx);
    if (methodsArray && grade.configuredTests?.length > 0) {
      const generalTests = grade.configuredTests.filter(t => t.testType !== 'Chemical');

      generalTests.forEach(test => {
        if (!test.laboratoryTestID) return;

        // Check for empty row (testMethodID is null)
        const emptyRow = methodsArray.controls.find(ctrl => !ctrl.get('testMethodID')?.value);
        if (emptyRow) {
          emptyRow.patchValue({
            testMethodID: +test.laboratoryTestID,
            standardID: test.testMethodStandardID || null,
            standardName: test.testMethodStandardName || '',
            quantity: test.quantity || 1
          });
        } else {
          const exists = methodsArray.controls.some(ctrl => +ctrl.get('testMethodID')?.value === +test.laboratoryTestID);
          if (!exists) {
            const row = this.createTestMethodRow('', '');
            row.patchValue({
              testMethodID: +test.laboratoryTestID,
              standardID: test.testMethodStandardID || null,
              standardName: test.testMethodStandardName || '',
              quantity: test.quantity || 1
            });
            methodsArray.push(row);
          }
        }
      });
    }

    // 2. Process Chemical Tests & Techniques
    const chemicalTests = grade.configuredTests?.filter(t => t.testType === 'Chemical') || [];
    if (chemicalTests.length > 0 || grade.chemicalElements?.length > 0) {
      let chemTests = this.getTestArray(sampleIdx, planIdx, 'chemicalTests');
      if (!chemTests || chemTests.length === 0) {
        this.addTestBlock(sampleIdx, planIdx, 'chemicalTests');
      }

      const chemSection = this.getChemicalTestSection(sampleIdx, planIdx);
      if (chemSection && grade.specificationGradeID) {
        chemSection.patchValue({ specification1: grade.specificationGradeID });
      }

      // Automatically select ALL techniques for chemical scope
      this.availableTechniques.forEach(tech => {
        this.selectedTechniquesMap[`${sampleIdx}_${tech.code}`] = true;
      });

      if (grade.chemicalElements?.length > 0 && chemSection) {
        const elementsArray = chemSection.get('elements') as FormArray;
        const existingMap = new Map<number, AbstractControl>();
        elementsArray.controls.forEach(ctrl => {
          const id = ctrl.get('parameterID')?.value;
          if (id) existingMap.set(+id, ctrl);
        });

        grade.chemicalElements.forEach(el => {
          if (el.parameterID && !existingMap.has(+el.parameterID)) {
            const row = this.createElementRow();
            row.patchValue({
              parameterID: +el.parameterID,
              parameterName: el.parameterName || '',
              minValue: el.minValue ?? null,
              maxValue: el.maxValue ?? null,
              parameterUnitID: el.parameterUnitID || 0,
              parameterUnit: el.parameterUnit || '',
              selected: true
            });
            elementsArray.push(row);
          }
        });
      }
    }

    this.planForm.markAsDirty();
  }

  onApplyTestConfig(test: ConfiguredTest): void {
    if (this.isViewMode || !test) return;
    const sampleIdx = this.activeSampleIdx;
    const testPlans = this.getTestPlans(sampleIdx);
    if (!testPlans || testPlans.length === 0) {
      this.addPlanToSample(sampleIdx);
    }
    const planIdx = 0;

    const isChemical = test.testType === 'Chemical' || (test.subGroup && test.subGroup.toLowerCase().includes('chemical'));

    if (isChemical) {
      // Switch to Chemical Tab for active sample
      this.setActiveTab(sampleIdx, planIdx, 'chemical');

      // Ensure Chemical Test Group exists
      let chemTests = this.getTestArray(sampleIdx, planIdx, 'chemicalTests');
      if (!chemTests || chemTests.length === 0) {
        this.addTestBlock(sampleIdx, planIdx, 'chemicalTests');
      }

      // Add/Populate Chemical Test Method Row
      const chemMethods = this.getChemicalMethodRows(sampleIdx, planIdx, 0);
      if (chemMethods) {
        const emptyRow = chemMethods.controls.find(ctrl => !ctrl.get('testMethodID')?.value);
        if (emptyRow) {
          emptyRow.patchValue({
            testMethodID: +test.laboratoryTestID,
            standardID: test.testMethodStandardID || null,
            standardName: test.testMethodStandardName || '',
            quantity: test.quantity || 1
          });
        } else {
          const exists = chemMethods.controls.some(ctrl => +ctrl.get('testMethodID')?.value === +test.laboratoryTestID);
          if (!exists) {
            const row = this.createTestMethodRow('', '');
            row.patchValue({
              testMethodID: +test.laboratoryTestID,
              standardID: test.testMethodStandardID || null,
              standardName: test.testMethodStandardName || '',
              quantity: test.quantity || 1
            });
            chemMethods.push(row);
          }
        }
      }

      // Automatically select ALL techniques for Chemical Test
      this.availableTechniques.forEach(tech => {
        this.selectedTechniquesMap[`${sampleIdx}_${tech.code}`] = true;
      });

      if (test.laboratoryTestID) {
        this.laboratoryTestService.getTestMethodSpecificationByLabTest(+test.laboratoryTestID).subscribe({
          next: (stds: any[]) => {
            const rowKey = `chem_${sampleIdx}_${planIdx}_0_${chemMethods ? chemMethods.length - 1 : 0}`;
            if (stds && stds.length > 0) {
              this.chemicalStandardsMap[rowKey] = stds;
            }
          }
        });
      }

      this.toastService.show(`Applied ${test.laboratoryTestName} to Chemical Tests & enabled techniques.`, 'success');
    } else {
      // General Test (Non-Chemical)
      this.setActiveTab(sampleIdx, planIdx, 'general');
      const methodsArray = this.getMethodRows(sampleIdx, planIdx);
      if (methodsArray && test.laboratoryTestID) {
        const specId = test.testMethodSpecificationID || test.testMethodStandardID || null;
        const specName = test.testMethodSpecificationName || test.testMethodStandardName || '';

        const emptyRow = methodsArray.controls.find(ctrl => !ctrl.get('testMethodID')?.value);
        if (emptyRow) {
          emptyRow.patchValue({
            testMethodID: +test.laboratoryTestID,
            standardID: specId,
            standardName: specName,
            quantity: test.quantity || 1
          });
          this.toastService.show(`Applied ${test.laboratoryTestName} to General Tests.`, 'success');
        } else {
          const exists = methodsArray.controls.some(ctrl => +ctrl.get('testMethodID')?.value === +test.laboratoryTestID);
          if (!exists) {
            const row = this.createTestMethodRow('', '');
            row.patchValue({
              testMethodID: +test.laboratoryTestID,
              standardID: specId,
              standardName: specName,
              quantity: test.quantity || 1
            });
            methodsArray.push(row);
            this.toastService.show(`Added ${test.laboratoryTestName} to General Tests.`, 'success');
          } else {
            this.toastService.show(`${test.laboratoryTestName} is already in the plan.`, 'info');
          }
        }

        this.laboratoryTestService.getTestMethodSpecificationByLabTest(+test.laboratoryTestID).subscribe({
          next: (stds: any[]) => {
            const rowKey = `${sampleIdx}_${planIdx}_${methodsArray ? methodsArray.length - 1 : 0}`;
            if (stds && stds.length > 0) {
              this.subGroupStandardsMap[rowKey] = stds;
            }
          }
        });
      }
    }
    this.planForm.markAsDirty();
  }

  onUnknownSampleToggle(sampleIdx: number): void {
    const sampleGroup = this.getSampleGroupSafely(sampleIdx);
    if (!sampleGroup) return;
    const isUnknown = sampleGroup.get('isUnknownSample')?.value;

    if (isUnknown) {
      sampleGroup.patchValue({
        productMasterID: null,
        productMasterName: ''
      });
      delete this.explorerProductDataMap[sampleIdx];
      delete this.gradeSuggestedSpecsMap[sampleIdx];
      sampleGroup.get('productMasterID')?.clearValidators();
      sampleGroup.get('productMasterID')?.updateValueAndValidity();
      sampleGroup.get('specificationGradeID')?.clearValidators();
      sampleGroup.get('specificationGradeID')?.updateValueAndValidity();
      this.toastService.show('Unknown Sample mode activated. Product Master cleared.', 'info');
    } else {
      sampleGroup.get('productMasterID')?.setValidators([Validators.required]);
      sampleGroup.get('productMasterID')?.updateValueAndValidity();
    }
    this.planForm.markAsDirty();
  }

  onAssignGrade(sampleIdx: number): void {
    const sampleGroup = this.getSampleGroupSafely(sampleIdx);
    if (!sampleGroup) return;
    const sampleId = sampleGroup.get('id')?.value;
    const gradeId = sampleGroup.get('assignedGradeID')?.value;
    const note = sampleGroup.get('assignedGradeNote')?.value || '';

    if (!gradeId) {
      this.toastService.show('Please select a grade to assign.', 'error');
      return;
    }

    this.inwardService.assignGrade({ sampleID: sampleId, specificationGradeID: +gradeId, notes: note }).subscribe({
      next: (res: any) => {
        sampleGroup.patchValue({
          isUnknownSample: false,
          specificationGradeID: +gradeId,
          assignedGradeID: null,
          assignedGradeNote: ''
        });
        this.toastService.show(res?.message || 'Grade assigned successfully and audit logged.', 'success');

        const testPlans = this.getTestPlans(sampleIdx);
        for (let p = 0; p < testPlans.length; p++) {
          const methods = this.getMethodRows(sampleIdx, p);
          methods.controls.forEach((_, mIdx) => {
            this.evaluateRowCompliance(sampleIdx, p, mIdx);
          });
        }
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to assign grade.', 'error');
      }
    });
  }

  getGradeSuggestedTests(sampleIdx: number): ConfiguredTest[] {
    const sampleGroup = this.getSampleGroupSafely(sampleIdx);
    if (!sampleGroup) return [];
    if (sampleGroup.get('isUnknownSample')?.value) return [];
    const gradeId = sampleGroup.get('specificationGradeID')?.value;
    const pmExplorer = this.explorerProductDataMap[sampleIdx];
    const metalExplorer = this.explorerMetalDataMap[sampleIdx];
    const explorerData = (pmExplorer && pmExplorer.grades && pmExplorer.grades.length > 0)
      ? pmExplorer
      : metalExplorer;

    if (!explorerData || !explorerData.grades) return [];

    let targetGrade = gradeId
      ? explorerData.grades.find((g: ConfiguredGrade) => g.specificationGradeID === +gradeId)
      : explorerData.grades[0];

    if (!targetGrade && explorerData.grades.length > 0) {
      targetGrade = explorerData.grades[0];
    }

    if (!targetGrade) return [];
    return (targetGrade.configuredTests || []).filter((t: ConfiguredTest) => t.testType !== 'Chemical');
  }

  applyGradeSuggestedTest(test: ConfiguredTest, sampleIdx: number, planIdx: number, methodIdx: number): void {
    if (this.isViewMode || !test) return;
    const methodRow = this.getMethodRows(sampleIdx, planIdx).at(methodIdx);
    if (!methodRow) return;

    methodRow.patchValue({
      testMethodID: test.laboratoryTestID,
      standardID: test.testMethodStandardID || null,
      standardName: test.testMethodStandardName || '',
      quantity: test.quantity || 1
    });

    this.onLabTestSubGroupSelected(
      { id: test.laboratoryTestID, name: test.laboratoryTestName },
      sampleIdx,
      planIdx,
      methodIdx
    );
  }

  onApplyBatchTests(tests: ConfiguredTest[]): void {
    if (this.isViewMode || !tests || tests.length === 0) return;
    const sampleIdx = this.activeSampleIdx;
    const testPlans = this.getTestPlans(sampleIdx);
    if (!testPlans || testPlans.length === 0) {
      this.addPlanToSample(sampleIdx);
    }
    const planIdx = 0;

    let appliedCount = 0;
    tests.forEach(test => {
      if (test.testType === 'Chemical') {
        this.onApplyTestConfig(test);
        appliedCount++;
      } else {
        const methodsArray = this.getMethodRows(sampleIdx, planIdx);
        if (methodsArray && test.laboratoryTestID) {
          const emptyRow = methodsArray.controls.find(ctrl => !ctrl.get('testMethodID')?.value);
          if (emptyRow) {
            emptyRow.patchValue({
              testMethodID: +test.laboratoryTestID,
              standardID: test.testMethodStandardID || null,
              standardName: test.testMethodStandardName || '',
              quantity: test.quantity || 1
            });
            this.onLabTestSubGroupSelected(
              { id: test.laboratoryTestID, name: test.laboratoryTestName },
              sampleIdx,
              planIdx,
              methodsArray.controls.indexOf(emptyRow)
            );
            appliedCount++;
          } else {
            const exists = methodsArray.controls.some(ctrl => +ctrl.get('testMethodID')?.value === +test.laboratoryTestID);
            if (!exists) {
              const row = this.createTestMethodRow('', '');
              row.patchValue({
                testMethodID: +test.laboratoryTestID,
                standardID: test.testMethodStandardID || null,
                standardName: test.testMethodStandardName || '',
                quantity: test.quantity || 1
              });
              methodsArray.push(row);
              this.onLabTestSubGroupSelected(
                { id: test.laboratoryTestID, name: test.laboratoryTestName },
                sampleIdx,
                planIdx,
                methodsArray.length - 1
              );
              appliedCount++;
            }
          }
        }
      }
    });

    this.toastService.show(`Applied ${appliedCount} test(s) from batch selection.`, 'success');
    this.planForm.markAsDirty();
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.planForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.planForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}

