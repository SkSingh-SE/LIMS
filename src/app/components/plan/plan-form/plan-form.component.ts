import { Component, Input, OnInit , HostListener } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
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
import { SampleStatus } from '../../../utility/status_flow/enums/sample-status.enum';
import { InwardStatus } from '../../../utility/status_flow/enums/inward-status.enum';
import { TPIService } from '../../../services/tpi.service';
import { TestAutoSuggestService, SmartSuggestRequest, SuggestedTestDto } from '../../../services/test-auto-suggest.service';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
  selector: 'app-plan-form',
  templateUrl: './plan-form.component.html',
  styleUrls: ['./plan-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SearchableDropdownComponent]
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
  testTypeList: { id: number, name: string }[] = [];
  activeTabs: { [key: string]: 'general' | 'chemical' } = {};

  // Copy Plan modal
  showCopyPlanModal = false;
  copySourceIdx: number | null = null;
  copyTargetIdxs: boolean[] = [];
  // Stable cached lists — rebuilt only on open/source-change, never on every CD cycle
  copySampleList: { idx: number; sampleNo: string }[] = [];
  copyTargetOptions: { idx: number; sampleNo: string }[] = [];


  openCopyPlanModal(): void {
    this.copySourceIdx = null;
    this.copyTargetIdxs = this.samples.controls.map(() => false);
    this.copySampleList = this.buildSampleList();
    this.copyTargetOptions = [];
    this.showCopyPlanModal = true;
  }

  onCopySourceChange(newIdx: number): void {
    this.copyTargetIdxs = this.copyTargetIdxs.map((v, i) => i === +newIdx ? false : v);
    this.copyTargetOptions = this.copySampleList.filter(s => s.idx !== +newIdx);
  }

  private buildSampleList(): { idx: number; sampleNo: string }[] {
    return this.samples.controls.map((s, idx) => ({
      idx,
      sampleNo: s.get('sampleNo')?.value || `Sample ${idx + 1}`
    }));
  }

  trackBySampleIdx(_: number, item: { idx: number }): number {
    return item.idx;
  }

  displayUlr(value: string | null | undefined): string {
    return value?.trim() ? value : 'Auto Generate';
  }

  confirmCopyPlan(): void {
    if (this.copySourceIdx === null) {
      this.toastService.show('Please select a source sample.', 'warning');
      return;
    }
    const targets = this.copyTargetIdxs
      .map((checked, idx) => (checked ? idx : -1))
      .filter(idx => idx !== -1);
    if (targets.length === 0) {
      this.toastService.show('Please select at least one target sample.', 'warning');
      return;
    }
    const sourcePlans = this.getTestPlans(this.copySourceIdx);
    if (!sourcePlans || sourcePlans.length === 0) {
      this.toastService.show('Source sample has no plan to copy.', 'warning');
      return;
    }

    for (const targetIdx of targets) {
      const targetPlans = this.getTestPlans(targetIdx);
      const targetSampleNo = this.samples.at(targetIdx).get('sampleNo')?.value || '';
      const hasExistingPlan = targetPlans.length > 0;

      if (!hasExistingPlan) {
        // ── No existing plan → full fresh copy (id=0, Auto Generate URLs) ──
        for (let p = 0; p < sourcePlans.length; p++) {
          const srcPlan = sourcePlans.at(p) as FormGroup;
          targetPlans.push(this.fb.group({
            id: [0],
            sampleNo: [targetSampleNo],
            generalTests: this.copyGeneralTestsFresh(srcPlan, targetSampleNo),
            chemicalTests: this.copyChemicalTestsFresh(srcPlan, targetSampleNo),
          }));
          const srcTab = this.activeTabs[`${this.copySourceIdx}-${p}`];
          this.activeTabs[`${targetIdx}-${p}`] = srcTab || 'general';
        }
      } else {
        // ── Plan exists → merge: keep existing IDs and URLs, update content ──
        for (let p = 0; p < sourcePlans.length; p++) {
          const srcPlan = sourcePlans.at(p) as FormGroup;
          const existingPlan = targetPlans.at(p) as FormGroup | null;

          if (!existingPlan) {
            // Source has more plan versions than target → append fresh
            targetPlans.push(this.fb.group({
              id: [0],
              sampleNo: [targetSampleNo],
              generalTests: this.copyGeneralTestsFresh(srcPlan, targetSampleNo),
              chemicalTests: this.copyChemicalTestsFresh(srcPlan, targetSampleNo),
            }));
          } else {
            // Merge into existing plan — keep plan's own id and sampleNo
            const mergedGeneral = this.mergeGeneralTests(srcPlan, existingPlan, targetSampleNo);
            const mergedChemical = this.mergeChemicalTests(srcPlan, existingPlan, targetSampleNo);

            // Replace the FormArrays in place
            existingPlan.setControl('generalTests', mergedGeneral);
            existingPlan.setControl('chemicalTests', mergedChemical);
          }

          const srcTab = this.activeTabs[`${this.copySourceIdx}-${p}`];
          this.activeTabs[`${targetIdx}-${p}`] = srcTab || 'general';
        }
      }
    }

    this.showCopyPlanModal = false;
    this.toastService.show(`Plan copied to ${targets.length} sample(s).`, 'success');
  }

  // ── Fresh copy helpers (no existing plan on target) ──────────────────────

  private copyGeneralTestsFresh(srcPlan: FormGroup, targetSampleNo: string): FormArray {
    const srcGeneral = srcPlan.get('generalTests') as FormArray;
    const arr = this.fb.array<FormGroup>([]);
    for (let g = 0; g < srcGeneral.length; g++) {
      const srcGt = srcGeneral.at(g) as FormGroup;
      const srcMethods = srcGt.get('methods') as FormArray;
      const newGroup = this.createGeneralTestGroup();
      newGroup.patchValue({
        sampleNo: targetSampleNo,
        specification1: srcGt.get('specification1')?.value,
        specification2: srcGt.get('specification2')?.value,
      });
      for (let m = 0; m < srcMethods.length; m++) {
        const src = srcMethods.at(m).value;
        const row = this.createTestMethodRow('', '');
        row.patchValue({ testMethodID: src.testMethodID, quantity: src.quantity });
        (newGroup.get('methods') as FormArray).push(row);
      }
      arr.push(newGroup);
    }
    return arr;
  }

  private copyChemicalTestsFresh(srcPlan: FormGroup, targetSampleNo: string): FormArray {
    const srcChemical = srcPlan.get('chemicalTests') as FormArray;
    const arr = this.fb.array<FormGroup>([]);
    for (let c = 0; c < srcChemical.length; c++) {
      const srcCt = srcChemical.at(c) as FormGroup;
      const srcElements = srcCt.get('elements') as FormArray;
      const newChem = this.createChemicalTestGroup('', '');
      newChem.patchValue({
        sampleNo: targetSampleNo,
        specification1: srcCt.get('specification1')?.value,
        specification2: srcCt.get('specification2')?.value,
      });
      (newChem.get('testTypes') as FormGroup)?.patchValue(srcCt.get('testTypes')?.value || {});
      for (let e = 0; e < srcElements.length; e++) {
        const row = this.createElementRow();
        row.patchValue(srcElements.at(e).value);
        (newChem.get('elements') as FormArray).push(row);
      }
      arr.push(newChem);
    }
    return arr;
  }

  // ── Merge helpers (existing plan on target — preserve IDs and URLs) ───────

  private mergeGeneralTests(srcPlan: FormGroup, existingPlan: FormGroup, targetSampleNo: string): FormArray {
    const srcGeneral = srcPlan.get('generalTests') as FormArray;
    const existingGeneral = existingPlan.get('generalTests') as FormArray;

    // Source has no general tests → keep existing target general tests unchanged (preserve ULRs)
    if (!srcGeneral || srcGeneral.length === 0) {
      return existingGeneral ?? this.fb.array([]);
    }

    const arr = this.fb.array<FormGroup>([]);

    for (let g = 0; g < srcGeneral.length; g++) {
      const srcGt = srcGeneral.at(g) as FormGroup;
      const srcMethods = srcGt.get('methods') as FormArray;
      const existingGt = existingGeneral?.at(g) as FormGroup | undefined;
      // Position-based: existing methods array for this GT group
      const existingMethods = existingGt ? existingGt.get('methods') as FormArray : null;

      const newGroup = this.createGeneralTestGroup();
      newGroup.patchValue({
        sampleNo: targetSampleNo,
        specification1: srcGt.get('specification1')?.value,
        specification2: srcGt.get('specification2')?.value,
      });

      if (existingGt?.get('id')?.value) {
        newGroup.addControl('id', this.fb.control(existingGt.get('id')!.value));
      }

      for (let m = 0; m < srcMethods.length; m++) {
        const src = srcMethods.at(m).value;

        // Match by POSITION — ULR is tied to sample+slot, not the test method itself.
        // Slot m of source → slot m of target. Preserve target's reportNo/ulrNo for that slot.
        const existingMethod = existingMethods?.at(m);
        const existingReportNo = existingMethod?.get('reportNo')?.value || '';
        const existingUlrNo   = existingMethod?.get('ulrNo')?.value   || '';
        const existingId      = existingMethod?.get('id')?.value       || 0;

        const row = this.createTestMethodRow(existingReportNo, existingUlrNo);
        row.patchValue({
          testMethodID: src.testMethodID,
          quantity:     src.quantity,
          cancel:       src.cancel ?? false,
        });
        if (existingId > 0) row.addControl('id', this.fb.control(existingId));
        (newGroup.get('methods') as FormArray).push(row);
      }
      arr.push(newGroup);
    }
    return arr;
  }

  private mergeChemicalTests(srcPlan: FormGroup, existingPlan: FormGroup, targetSampleNo: string): FormArray {
    const srcChemical = srcPlan.get('chemicalTests') as FormArray;
    const existingChemical = existingPlan.get('chemicalTests') as FormArray;

    // Source has no chemical tests → keep existing target chemical tests unchanged (preserve ULRs)
    if (!srcChemical || srcChemical.length === 0) {
      return existingChemical ?? this.fb.array([]);
    }

    const arr = this.fb.array<FormGroup>([]);

    for (let c = 0; c < srcChemical.length; c++) {
      const srcCt = srcChemical.at(c) as FormGroup;
      const srcElements = srcCt.get('elements') as FormArray;
      const existingCt = existingChemical?.at(c) as FormGroup | null;

      // Build a map of existing elements: parameterID → {id, reportNo, ulrNo}
      const existingElementMap = new Map<number, { id: number }>();
      if (existingCt) {
        const existingElements = existingCt.get('elements') as FormArray;
        existingElements?.controls.forEach(el => {
          const parameterID = el.get('parameterID')?.value;
          if (parameterID) existingElementMap.set(+parameterID, { id: el.get('id')?.value || 0 });
        });
      }

      const newChem = this.createChemicalTestGroup(
        existingCt?.get('reportNo')?.value || '',
        existingCt?.get('ulrNo')?.value || ''
      );
      newChem.patchValue({
        sampleNo: targetSampleNo,
        specification1: srcCt.get('specification1')?.value,
        specification2: srcCt.get('specification2')?.value,
      });

      // Carry existing CT group id if present
      if (existingCt?.get('id')?.value) {
        newChem.addControl('id', this.fb.control(existingCt.get('id')!.value));
      }

      // Update test types from source
      (newChem.get('testTypes') as FormGroup)?.patchValue(srcCt.get('testTypes')?.value || {});

      // Merge elements: keep existing id where parameterID matches
      for (let e = 0; e < srcElements.length; e++) {
        const srcEl = srcElements.at(e).value;
        const existing = srcEl.parameterID ? existingElementMap.get(+srcEl.parameterID) : null;
        const row = this.createElementRow();
        row.patchValue(srcEl);
        if (existing?.id) row.addControl('id', this.fb.control(existing.id));
        (newChem.get('elements') as FormArray).push(row);
      }
      arr.push(newChem);
    }
    return arr;
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
   private unsavedChangesService: UnsavedChangesService) { }

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

    // Load chemical test types first, then fetch details (testTypeList must be ready for rebind)
    this.loadChemicalTestTypes(() => {
      if (this.inwardID) this.fetchSampleInwardDetails(this.inwardID);
    });
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
    const testTypesGroup: { [key: string]: any } = {};
    this.testTypeList.forEach(t => {
      testTypesGroup[t.id] = this.fb.control(false);
    });
    return this.fb.group({
      sampleNo: [''],
      reportNo: [reportNo || ''],
      ulrNo: [ulrNo || ''],
      testTypes: this.fb.group(testTypesGroup),
      specification1: [null],
      specification2: [null],
      elements: this.fb.array([])
    });
  }

  createTestMethodRow(reportNo: string, ulrNo: string): FormGroup {
    return this.fb.group({
      testMethodID: [null, Validators.required],
      quantity: ['1'],
      reportNo: [reportNo],
      ulrNo: [ulrNo],
      cancel: [false]
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
      selected: [false]
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

  // Check if at least one plan exists with at least one test (general or chemical)
  hasValidPlans(): boolean {
    for (let i = 0; i < this.samples.length; i++) {
      const testPlans = this.getTestPlans(i);
      for (let j = 0; j < testPlans.length; j++) {
        const plan = testPlans.at(j) as FormGroup;
        const generalTests = plan.get('generalTests') as FormArray;
        const chemicalTests = plan.get('chemicalTests') as FormArray;

        // General test is valid only if it has at least one method row
        for (let g = 0; g < generalTests.length; g++) {
          const gt = generalTests.at(g) as FormGroup;
          const methods = gt.get('methods') as FormArray;
          if (methods && methods.length > 0) return true;
        }

        // Chemical test is valid if it has at least one test type selected OR at least one element
        for (let c = 0; c < chemicalTests.length; c++) {
          const ct = chemicalTests.at(c) as FormGroup;
          const testTypes = ct.get('testTypes') as FormGroup;
          const elements = ct.get('elements') as FormArray;
          const hasSelectedType = testTypes && Object.values(testTypes.value).some(v => !!v);
          const hasElements = elements && elements.length > 0;
          if (hasSelectedType || hasElements) return true;
        }
      }
    }
    return false;
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
    this.getMethodRows(sampleIndex, planIndex).push(this.createTestMethodRow('', ''));
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
    testPlans.push(this.fb.group({
      id: [0],
      sampleNo: [sampleNo],
      generalTests: this.fb.array([]),
      chemicalTests: this.fb.array([])
    }));
    // No tab pre-selected — user clicks a tab to begin
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
                cancel: m.cancel
              }))
            })),
            chemicalTests: (tp.chemicalTests || []).map((ct: any) => ({
              id: ct.id,
              sampleNo: ct.sampleNo,
              reportNo: ct.reportNo,
              ulrNo: ct.ulrNo,
              testTypes: ct.testTypes,
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

  // ────────────── Dropdown Data Methods ──────────────
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

  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);

  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getChemicalParameterDropdown(term, page, pageSize);

  getProductConditions = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.productService.getProductConditionDropdown(term, page, pageSize);

  getTPIAgencies = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.tpiService.getTPIDropdown(term, page, pageSize);

  // ────────────── Event Handlers ──────────────
  onProductConditionSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    sampleDetailGroup.patchValue({ productConditionID: item?.id ?? null });
  }

  onMetalClassificationSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    sampleDetailGroup.patchValue({ metalClassificationID: item?.id ?? null });
  }

  onTPISelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    sampleDetailGroup.patchValue({ tpiAgencyID: item?.id ?? null });
  }

  getSpecimenOrientationDrop = (sampleIndex: number) => {
    return (term: string, page: number, pageSize: number): Observable<any[]> => {
      const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
      const metalClassificationID = sampleDetailGroup?.get('metalClassificationID')?.value;
      if (metalClassificationID) {
        return this.specimenOrientationService.getByClassification(metalClassificationID, term, page, pageSize);
      }
      return this.specimenOrientationService.getSpecimenOrientationDropdown(term, page, pageSize);
    };
  };

  onSpecimenOrientationSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    sampleDetailGroup.patchValue({ specimenOrientationID: item?.id ?? null });
  }

  getProductFormDrop = (term: string, page: number, pageSize: number) => {
    return this.productFormService.getProductFormDropdown(term, page, pageSize);
  };

  onProductFormSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    sampleDetailGroup.patchValue({ productFormID: item?.id ?? null });
  }

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
                    selected: [false],
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
                cancel: [m.cancel || false]
              })))
            })
          );

          const chemicalTestsArr = (tp.chemicalTests || []).map((ct: any) => {
            const testTypesGroup: any = {};

            // Start with all test types from master as false
            this.testTypeList.forEach(t => {
              testTypesGroup[t.id] = [false];
            });

            // Overlay saved values from backend (keyed by LaboratoryTestID)
            if (ct.testTypes && typeof ct.testTypes === 'object') {
              Object.keys(ct.testTypes).forEach(typeKey => {
                testTypesGroup[typeKey] = [ct.testTypes[typeKey] ?? false];
              });
            }

            return this.fb.group({
              id: [ct.id || 0],
              sampleNo: [sample.sampleNo],
              reportNo: [ct.reportNo],
              ulrNo: [ct.ulrNo],
              testTypes: this.fb.group(testTypesGroup),
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
            const testTypes = ct.get('testTypes') as FormGroup;
            return (elements?.length ?? 0) === 0 && !Object.values(testTypes?.value ?? {}).some(v => !!v);
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
    if (!this.hasValidPlans()) {
      this.toastService.show('At least one plan with at least one test (General or Chemical) is required.', 'warning');
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
    if (!this.hasValidPlans()) {
      this.toastService.show('At least one plan with at least one test (General or Chemical) is required.', 'warning');
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
            testTypes: c.testTypes || {},
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
      Draft: 'bg-secondary',
      Submitted: 'bg-info',
      UnderReview: 'bg-warning',
      Approved: 'bg-success',
      ReplanRequested: 'bg-danger',
      ReplanApproved: 'bg-primary',
      Cancelled: 'bg-secondary text-white opacity-75',
    };
    return classes[status] || 'bg-secondary';
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
  getTestMethodSpecificationDrop = this.getTestMethodSpecification;
  getMetalDrop = this.getMetalClassification;
  getProductConditionDrop = this.getProductConditions;
  getParameterDrop = this.getChemicalParameter;

  getLabTestDropdown = (term: string, page: number, pageSize: number) => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  loadChemicalTestTypes(callback?: () => void) {
    this.laboratoryTestService.getLaboratoryTestDropdownForChemicals('', 0, 100).subscribe({
      next: (data) => {
        this.testTypeList = data || [];
        if (callback) callback();
      },
      error: (err) => {
        console.error("Failed to load dynamic chemical test types", err);
        this.testTypeList = [];
        if (callback) callback();
      }
    });
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
