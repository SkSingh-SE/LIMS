import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MaterialTestMappingService } from '../../../services/material-test-mapping.service';
import { CommonModule } from '@angular/common';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-plan-form',
  templateUrl: './plan-form.component.html',
  styleUrls: ['./plan-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule, SearchableDropdownComponent]
})
export class PlanFormComponent implements OnInit {
  @Input() inwardID?: number;
  @Input() mode: 'review' | 'plan' = 'review';
  baseUrl = environment.baseUrl;
  planForm!: FormGroup;
  isViewMode = false;
  yearCode = new Date().getFullYear().toString().slice(-2);
  testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];
  activeTabs: { [key: string]: 'general' | 'chemical' } = {};
  filteredTestMethods: { [key: string]: any[] } = {};
  filteredStandards: any[] = [];

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
    private testMappingService: MaterialTestMappingService
  ) { }

  ngOnInit(): void {
    console.log('[PlanForm] ngOnInit start', { inwardID: this.inwardID, mode: this.mode });
    if (!this.inwardID) {
      this.activeroute.paramMap.subscribe(params => {
        this.inwardID = Number(params.get('id'));
        console.log('[PlanForm] route param id ->', this.inwardID);
      });
      this.activeroute.queryParamMap.subscribe(params => {
        this.mode = (params.get('mode') as any) || this.mode;
        console.log('[PlanForm] route query mode ->', this.mode);
      });
    }
    this.isViewMode = this.mode === 'review';
    this.initForm();
    console.log('[PlanForm] initForm completed. isViewMode=', this.isViewMode);
    // Example fetch (replace 17 with this.inwardID when wiring up)
    this.fetchSampleInwardDetails(17);
    if (this.isViewMode) this.planForm.disable();
  }

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

  get samples(): FormArray {
    return this.planForm.get('samples') as FormArray;
  }

  addSample(): void {
    const sampleNo = `${this.yearCode}-000001`;
    console.log('[PlanForm] addSample', sampleNo);
    this.samples.push(this.fb.group({
      sampleNo: [sampleNo],
      details: ['Sample 1'],
      metalClassificationID: [null],
      productConditionID: [null],
      remarks: ['Sample received in good condition'],
      quantity: [1],
      cuttingRequired: [false],
      machiningRequired: [false],
      machiningAmount: [0],
      specimen: [''],
      otherPreparation: [false],
      otherPreparationCharge: [0],
      tpiRequired: [false],
      testInstructions: [''],
      fileName: [''],
      sampleFilePath: [''],
      additionalDetails: this.fb.array([]),
      testPlans: this.fb.array([ this.createTestPlan(sampleNo) ])
    }));
  }

  createTestPlan(sampleNo: string): FormGroup {
    const generalTestGroup = this.createGeneralTestGroup();
    (generalTestGroup.get('methods') as FormArray).push(this.createTestMethodRow('Auto Generate', 'Auto Generate'));
    return this.fb.group({
      sampleNo: [sampleNo],
      generalTests: this.fb.array([generalTestGroup]),
      chemicalTests: this.fb.array([])
    });
  }

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
  addTestBlock(sampleIndex: number, planIndex: number, type: 'generalTests' | 'chemicalTests'): void {
    const array = this.getTestArray(sampleIndex, planIndex, type);
    const reportNo = 'Auto Generate';
    const ulrNo = 'Auto Generate';
    if (type === 'generalTests') array.push(this.createGeneralTestGroup());
    else array.push(this.createChemicalTestGroup(reportNo, ulrNo));
  }

  createGeneralTestGroup(): FormGroup {
    return this.fb.group({
      sampleNo: [''],
      specification1: [null, Validators.required],
      specification2: [null],
      parameter: [''],
      methods: this.fb.array([])
    }, { validators: this.uniqueSpecificationValidator });
  }
  createChemicalTestGroup(reportNo: string, ulrNo: string): FormGroup {
    const testTypesGroup: { [key: string]: any } = {};
    this.testTypeList.forEach(type => testTypesGroup[type] = this.fb.control(false));
    return this.fb.group({
      sampleNo: [''],
      reportNo: [reportNo || 'Auto Generate'],
      ulrNo: [ulrNo || 'Auto Generate'],
      testTypes: this.fb.group(testTypesGroup),
      metalClassificationID: [''],
      specification1: [null],
      specification2: [null],
      testMethod: [''],
      elements: this.fb.array([])
    });
  }
  createTestMethodRow(reportNo: string, ulrNo: string): FormGroup {
    return this.fb.group({
      testMethodID: [''],
      standardID: [''],
      quantity: ['1'],
      reportNo: [reportNo],
      ulrNo: [ulrNo],
      cancel: [false]
    });
  }
  addMethodRow(sampleIndex: number, planIndex: number): void {
    this.getMethodRows(sampleIndex, planIndex).push(this.createTestMethodRow('Auto Generate', 'Auto Generate'));
  }

  getElementRows(sampleIndex: number, planIndex: number): FormArray {
    return this.getTestArray(sampleIndex, planIndex, 'chemicalTests').at(0).get('elements') as FormArray;
  }
  addElementRow(sampleIndex: number, planIndex: number): void {
    this.getElementRows(sampleIndex, planIndex).push(this.fb.group({ parameterID: [''], selected: [false] }));
  }
  removeElementRow(sampleIndex: number, planIndex: number, elementIndex: number): void {
    this.getElementRows(sampleIndex, planIndex).removeAt(elementIndex);
  }

  // ────────────── API Calls ──────────────
  fetchSampleInwardDetails(sampleId: number): void {
    console.log('[PlanForm] fetchSampleInwardDetails =>', sampleId);
    this.inwardService.getSampleInwardWithPlans(sampleId).subscribe({
      next: (data) => {
        console.log('[PlanForm] fetchSampleInwardDetails: API returned', !!data, data);
        if (!data) return;
        const formatted = {
          id: data.id,
          caseNo: data.caseNo,
          sampleReceiptNote: data.sampleReceiptNote,
          urgent: data.urgent,
          returnSample: data.returnSample,
          notDestroyed: data.notDestroyed,
          statementOfConformity: data.statementOfConformity ?? 'Not Applicable',
          decisionRule: data.decisionRule ?? 'Not Applicable',
          sampleDetails: (data.sampleDetails || []).map((s: any) => ({
            id: s.id,
            sampleNo: s.sampleNo,
            details: s.details,
            metalClassificationID: s.metalClassificationID,
            productConditionID: s.productConditionID,
            remarks: s.remarks,
            quantity: s.quantity,
            cuttingRequired: s.cuttingRequired ?? false,
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
            generalTests: (tp.generalTests || []).map((gt: any) => ({
              id: gt.id,
              sampleNo: gt.sampleNo,
              specification1: gt.specification1,
              specification2: gt.specification2,
              parameter: gt.parameter,
              methods: (gt.methods || []).map((m: any) => ({
                testMethodID: m.testMethodID,
                standardID: m.standardID,
                quantity: m.quantity,
                reportNo: m.reportNo,
                ulrNo: m.ulrNo,
                cancel: m.cancel
              }))
            })),
            chemicalTests: (tp.chemicalTests || []).map((ct: any) => ({
              sampleNo: ct.sampleNo,
              reportNo: ct.reportNo,
              ulrNo: ct.ulrNo,
              testTypes: {
                Spectro: ct.testTypes?.Spectro ?? false,
                Chemical: ct.testTypes?.Chemical ?? false,
                XRF: ct.testTypes?.XRF ?? false,
                'Full Analysis': ct.testTypes?.['Full Analysis'] ?? false,
                ROHS: ct.testTypes?.ROHS ?? false
              },
              metalClassificationID: ct.metalClassificationID,
              specification1: ct.specification1,
              specification2: ct.specification2,
              testMethod: ct.testMethod,
              elements: (ct.elements || []).map((el: any) => ({
                parameterID: el.parameterID,
                selected: el.selected
              }))
            }))
          }))
        };
        this.updateFormFromPayload(formatted);
      },
      error: (err) => console.error('[PlanForm] Error fetching sample inward details:', err)
    });
  }

  getMaterialSpecificationGrade = (term: string, page: number, pageSize: number): Observable<any[]> => {
    console.log('[PlanForm] getMaterialSpecificationGrade called', { term, page, pageSize });
    return this.materialSpecificationService.getMaterialSpecificationGradeDropdown(term, page, pageSize);
  };
  getMaterialSpecificationGradeForGeneral = (term: string, page: number, pageSize: number): Observable<any[]> => {
    console.log('[PlanForm] getMaterialSpecificationGradeForGeneral called', { term, page, pageSize });
    return this.materialSpecificationService.getMaterialSpecificationGradeDropdown(term, page, pageSize);
  };

  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.metalService.getMetalClassificationDropdown(term, page, pageSize);

  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);

  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getChemicalParameterDropdown(term, page, pageSize);

  getProductConditions = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.productService.getProductConditionDropdown(term, page, pageSize);

  onProductConditionSelected(item: any, sampleIndex: number) {
    console.log('[PlanForm] onProductConditionSelected', { item, sampleIndex });
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    sampleDetailGroup.patchValue({ productConditionID: item?.id ?? null });
  }

  onMetalClassificationSelected(item: any, sampleIndex: number) {
    console.log('[PlanForm] onMetalClassificationSelected', { item, sampleIndex });
    const sampleDetailGroup = this.getSampleGroupSafely(sampleIndex);
    if (!sampleDetailGroup) return;
    sampleDetailGroup.patchValue({ metalClassificationID: item?.id ?? null });
  }

  private getSampleGroupSafely(sampleIndex: number): FormGroup | null {
    if (!this.samples) return null;
    if (typeof sampleIndex !== 'number' || sampleIndex < 0 || sampleIndex >= this.samples.length) {
      console.warn(`[PlanForm] getSampleGroupSafely: sampleIndex ${sampleIndex} out of range (length=${this.samples.length}).`);
      return null;
    }
    return this.samples.at(sampleIndex) as FormGroup;
  }

  // SPECIFICATION selection handling (fixed + logs)
  onSpecificationGradeSelected(
    sampleIndex: number,
    planIndex: number,
    item: any,
    field: 'specification1' | 'specification2',
    testType: 'generalTests' | 'chemicalTests'
  ) {
    console.log('[PlanForm] onSpecificationGradeSelected start', { sampleIndex, planIndex, field, item, testType });
    const section = testType === 'generalTests'
      ? this.getGeneralTestSection(sampleIndex, planIndex)
      : this.getChemicalTestSection(sampleIndex, planIndex);

    const newId = item?.id !== undefined && item?.id !== null ? +item.id : null;
    const otherField = field === 'specification1' ? 'specification2' : 'specification1';
    const otherValRaw = section.get(otherField)?.value;
    const otherVal = otherValRaw !== undefined && otherValRaw !== null ? +otherValRaw : null;

    console.log('[PlanForm] onSpecificationGradeSelected computed', { newId, otherVal });

    if (newId && otherVal && newId === otherVal) {
      this.toastService.show('Specification 1 and Specification 2 cannot be the same.', 'warning');
      console.warn('[PlanForm] onSpecificationGradeSelected aborted - same specification');
      return; // don't change the value
    }

    // Patch the selected field
    section.patchValue({ [field]: newId });
    console.log('[PlanForm] patched section field', { field, newId });

    // Only apply auto logic for general tests
    if (testType !== 'generalTests') return;

    // Auto-select default standard for this specification (if available)
    if (newId) {
      console.log('[PlanForm] fetching default standard for specification', newId);
      this.materialSpecificationService.getDefaultStandardBySpecificationId(+newId).subscribe({
        next: (standard: any[]) => {
          console.log('[PlanForm] defaultStandard result', standard);
          if (!standard || standard.length === 0) {
            this.toastService.show('No default standard found for the selected specification.', 'info');
            return;
          }
          // merge unique standards by id
          const map = new Map<number, any>(this.filteredStandards.map(s => [s.id, s]));
          (standard || []).forEach((s: any) => map.set(s.id, s));
          this.filteredStandards = Array.from(map.values());
          console.log('[PlanForm] filteredStandards updated', this.filteredStandards);

          // set standardID in first method row if exists
          const methods = section.get('methods') as FormArray;
          if (methods && methods.length > 0 && standard[0]?.id) {
            methods.at(0).patchValue({ standardID: standard[0].id });
            console.log('[PlanForm] patched first method standardID ->', standard[0].id);
          }
        },
        error: (err) => console.warn('[PlanForm] error fetching default standard', err)
      });
    }

    // Prepare specs for auto-suggest
    const spec1 = section.get('specification1')?.value;
    const spec2 = section.get('specification2')?.value;
    const specsToUse = [spec1, spec2].filter(s => s !== null && s !== undefined && s !== 0).map(s => String(s));
    const key = `${sampleIndex}_${planIndex}`;

    console.log('[PlanForm] specsToUse for auto suggest', specsToUse);

    if (specsToUse.length === 0) {
      this.filteredTestMethods[key] = [];
      console.log('[PlanForm] cleared filteredTestMethods for key', key);
      return;
    }

    // Get sample metal/product condition
    const sampleGroup = this.samples.at(sampleIndex) as FormGroup;
    const metalId = sampleGroup.get('metalClassificationID')?.value || null;
    const productConditionId = sampleGroup.get('productConditionID')?.value || null;

    console.log('[PlanForm] calling getAutoSuggestedTests with', { metalId, productConditionId, specs: specsToUse.join(',') });
    this.testMappingService.getAutoSuggestedTests(metalId, productConditionId, specsToUse.join(','))
      .subscribe({
        next: (tests: any[]) => {
          console.log('[PlanForm] getAutoSuggestedTests result', tests);
          if (tests && tests.length > 0) {
            const unique = tests.filter((t: any, i: number, self: any[]) => i === self.findIndex((x: any) => x.id === t.id));
            this.filteredTestMethods[key] = unique;
            console.log('[PlanForm] filteredTestMethods updated for key', key, unique);
            // set first suggested test on first method row if applicable
            const methods = section.get('methods') as FormArray;
            if (methods && methods.length > 0 && unique[0]?.id) {
              methods.at(0).patchValue({ testMethodID: unique[0].id });
              console.log('[PlanForm] patched first method testMethodID ->', unique[0].id);
            }
          } else {
            this.filteredTestMethods[key] = [];
            console.log('[PlanForm] no suggested test methods found for key', key);
            this.toastService.show('No suggested test methods found for selected specifications.', 'info');
          }
        },
        error: (err) => {
          console.warn('[PlanForm] getAutoSuggestedTests error', err);
          this.filteredTestMethods[key] = [];
        }
      });
  }

  onLaboratorySelected(item: any, sampleIndex: number, planIndex: number, methodIndex: number) {
    console.log('[PlanForm] onLaboratorySelected', { item, sampleIndex, planIndex, methodIndex });
    const methodsArray = this.getMethodRowsSafely(sampleIndex, planIndex);
    if (!methodsArray) {
      this.toastService.show('Test methods not available yet.', 'warning');
      return;
    }
    const methodCtrl = methodsArray.at(methodIndex);
    if (!methodCtrl) return;
    methodCtrl.patchValue({ testMethodID: item?.id ?? null });
  }

  private getMethodRowsSafely(sampleIndex: number, planIndex: number): FormArray | null {
    try {
      const testArray = this.getTestArray(sampleIndex, planIndex, 'generalTests');
      if (!testArray || testArray.length === 0) {
        console.warn('[PlanForm] getMethodRowsSafely: no generalTests array');
        return null;
      }
      const section = testArray.at(0) as FormGroup;
      return section?.get('methods') as FormArray ?? null;
    } catch (err) {
      console.warn('[PlanForm] getMethodRowsSafely error', err);
      return null;
    }
  }

  onMetalSelected(sampleIndex: number, planIndex: number, item: any) {
    console.log('[PlanForm] onMetalSelected', { item, sampleIndex, planIndex });
    const chemicalTestGroup = this.getChemicalTestSection(sampleIndex, planIndex);
    chemicalTestGroup.patchValue({ metalClassificationID: item.id });
  }

  onGeneralTestStandardSelected(item: any, sampleIndex: number, planIndex: number, methodIndex: number) {
    console.log('[PlanForm] onGeneralTestStandardSelected', { item, sampleIndex, planIndex, methodIndex });
    const methods = this.getMethodRowsSafely(sampleIndex, planIndex);
    if (!methods) {
      this.toastService.show('Methods are not initialized yet.', 'warning');
      return;
    }
    const methodCtrl = methods.at(methodIndex);
    if (!methodCtrl) return;
    methodCtrl.patchValue({ standardID: item?.id ?? null });
  }

  onChemicalStandardSelected(item: any, sampleIndex: number, planIndex: number) {
    console.log('[PlanForm] onChemicalStandardSelected', { item, sampleIndex, planIndex });
    const chemicalTestGroup = this.getChemicalTestSection(sampleIndex, planIndex);
    chemicalTestGroup.patchValue({ standardID: item.id });
  }

  onParameterSelected(item: any, sampleIndex: number, planIndex: number, testIndex: number, index: number) {
    console.log('[PlanForm] onParameterSelected', { item, sampleIndex, planIndex, testIndex, index });
    this.getElementRows(sampleIndex, planIndex).at(index).patchValue({ parameterID: item.id });
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

  uniqueSpecificationValidator(group: FormGroup) {
    const spec1 = group.get('specification1')?.value;
    const spec2 = group.get('specification2')?.value;
    if (spec1 && spec2 && +spec1 === +spec2) return { sameSpecification: true };
    return null;
  }

  private ensureSpecificationBindings(sampleIdx: number, planIdx: number, section: FormGroup) {
    try {
      const spec1 = section.get('specification1')?.value;
      const spec2 = section.get('specification2')?.value;
      console.log('[PlanForm] ensureSpecificationBindings', { sampleIdx, planIdx, spec1, spec2 });
      // Schedule small delays so dropdown components initialize and see the selectedItem
      if (spec1) {
        setTimeout(() => {
          console.log('[PlanForm] ensureSpecificationBindings trigger spec1', spec1);
          this.onSpecificationGradeSelected(sampleIdx, planIdx, { id: spec1 }, 'specification1', 'generalTests');
        }, 50);
      }
      if (spec2) {
        setTimeout(() => {
          console.log('[PlanForm] ensureSpecificationBindings trigger spec2', spec2);
          this.onSpecificationGradeSelected(sampleIdx, planIdx, { id: spec2 }, 'specification2', 'generalTests');
        }, 80);
      }
    } catch (err) {
      console.warn('[PlanForm] ensureSpecificationBindings error', err);
    }
  }

  updateFormFromPayload(payload: any): void {
    console.log('[PlanForm] updateFormFromPayload start', { payloadSummary: { id: payload.id, sampleDetailsCount: (payload.sampleDetails || []).length } });
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
      console.log('[PlanForm] adding sample to form', { sampleIdx, sampleNo: sample.sampleNo });
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
          console.log('[PlanForm] processing testPlan', { sampleIdx, planIdx, tpSummary: { sampleNo: tp.sampleNo, generalTests: (tp.generalTests || []).length, chemicalTests: (tp.chemicalTests || []).length } });
          const generalTestsArr = (tp.generalTests || []).map((gt: any, gtIdx: number) =>
            this.fb.group({
              id: [gt.id],
              sampleNo: [sample.sampleNo],
              specification1: [gt.specification1 !== undefined && gt.specification1 !== null ? +gt.specification1 : null],
              specification2: [gt.specification2 !== undefined && gt.specification2 !== null ? +gt.specification2 : null],
              parameter: [gt.parameter],
              methods: this.fb.array((gt.methods || []).map((m: any) => this.fb.group({
                testMethodID: [m.testMethodID],
                standardID: [m.standardID],
                quantity: [m.quantity],
                reportNo: [m.reportNo],
                ulrNo: [m.ulrNo],
                cancel: [m.cancel]
              })))
            })
          );

          const chemicalTestsArr = (tp.chemicalTests || []).map((ct: any) =>
            this.fb.group({
              sampleNo: [sample.sampleNo],
              reportNo: [ct.reportNo],
              ulrNo: [ct.ulrNo],
              testTypes: this.fb.group({
                Spectro: [ct.testTypes?.Spectro ?? false],
                Chemical: [ct.testTypes?.Chemical ?? false],
                XRF: [ct.testTypes?.XRF ?? false],
                'Full Analysis': [ct.testTypes?.['Full Analysis'] ?? false],
                ROHS: [ct.testTypes?.ROHS ?? false]
              }),
              metalClassificationID: [ct.metalClassificationID],
              specification1: [ct.specification1 !== undefined && ct.specification1 !== null ? +ct.specification1 : null],
              specification2: [ct.specification2 !== undefined && ct.specification2 !== null ? +ct.specification2 : null],
              testMethod: [ct.testMethod],
              elements: this.fb.array((ct.elements || []).map((el: any) => this.fb.group({
                parameterID: [el.parameterID],
                selected: [el.selected]
              })))
            })
          );

          this.setDefaultTab(sampleIdx, planIdx, tp);
          return this.fb.group({
            sampleNo: [tp.sampleNo],
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
        remarks: [sample.remarks],
        quantity: [sample.quantity],
        cuttingRequired: [sample.cuttingRequired ?? false],
        machiningRequired: [sample.machiningRequired ?? false],
        machiningAmount: [sample.machiningAmount ?? 0],
        specimen: [sample.specimen ?? ''],
        otherPreparation: [sample.otherPreparation ?? false],
        otherPreparationCharge: [sample.otherPreparationCharge ?? 0],
        tpiRequired: [sample.tpiRequired ?? false],
        testInstructions: [sample.testInstructions ?? ''],
        fileName: [sample.fileName ?? ''],
        sampleFilePath: [sample.sampleFilePath ?? ''],
        additionalDetails: this.fb.array(additionalDetailsArr),
        testPlans: this.fb.array(testPlansArr)
      }));

      // // After pushing sample, ensure any pre-existing specification values are re-applied so dropdowns can bind
      // const addedSampleGroup = this.samples.at(sampleIdx) as FormGroup;
      // const testPlansFA = addedSampleGroup.get('testPlans') as FormArray;
      // if (testPlansFA && testPlansFA.length > 0) {
      //   for (let p = 0; p < testPlansFA.length; p++) {
      //     try {
      //       const generalFA = (testPlansFA.at(p).get('generalTests') as FormArray);
      //       if (generalFA && generalFA.length > 0) {
      //         // For each general test section, ensure bindings after slight delay
      //         for (let g = 0; g < generalFA.length; g++) {
      //           const section = generalFA.at(g) as FormGroup;
      //           // schedule ensureSpecificationBindings so components have time to initialize
      //           setTimeout(() => {
      //             console.log('[PlanForm] scheduling ensureSpecificationBindings', { sampleIdx, planIdx: p, generalIndex: g });
      //             this.ensureSpecificationBindings(sampleIdx, p, section);
      //           }, 50 + (p * 20) + (g * 10));
      //         }
      //       }
      //     } catch (err) {
      //       console.warn('[PlanForm] error scheduling spec binding for sample', sampleIdx, 'plan', p, err);
      //     }
      //   }
      // }
    });

    console.log('[PlanForm] updateFormFromPayload finished building form. samples length=', this.samples.length);
    // if (this.isViewMode) this.planForm.disable();
  }

  onSave(): void {
    const raw = this.planForm.getRawValue();
    const payload = {
      id: raw.id || 0,
      caseNo: raw.caseNo || '',
      customerID: raw.customerID || 0,
      statementOfConformity: raw.statementOfConformity || 'Not Applicable',
      decisionRule: raw.decisionRule || 'Not Applicable',
      sampleDetails: (raw.samples || []).map((s: any) => ({
        id: s.id || 0,
        sampleNo: s.sampleNo || '',
        details: s.details || '',
        productConditionID: s.productConditionID || '',
        metalClassificationID: s.metalClassificationID || '',
        remarks: s.remarks || '',
        quantity: s.quantity || 0,
        disabled: s.disabled || false,
        cuttingRequired: s.cuttingRequired || false,
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
          sampleNo: s.sampleNo,
          generalTests: (tp.generalTests || []).map((g: any) => ({
            sampleNo: g.sampleNo || '',
            specification1: g.specification1 || 0,
            specification2: g.specification2 || null,
            parameter: g.parameter || '',
            methods: (g.methods || []).map((m: any) => ({
              testMethodID: m.testMethodID || 0,
              standardID: m.standardID || 0,
              quantity: m.quantity || 0,
              reportNo: m.reportNo == 'Auto Generate' ? '' : m.reportNo || '',
              ulrNo: m.ulrNo == 'Auto Generate' ? '' : m.ulrNo || '',
              cancel: m.cancel || false
            }))
          })),
          chemicalTests: (tp.chemicalTests || []).map((c: any) => ({
            sampleNo: c.sampleNo || '',
            reportNo: c.reportNo == 'Auto Generate' ? '' : c.reportNo || '',
            ulrNo: c.ulrNo == 'Auto Generate' ? '' : c.ulrNo || '',
            testTypes: c.testTypes || {},
            metalClassificationID: c.metalClassificationID || 0,
            specification1: c.specification1 || 0,
            specification2: c.specification2 || null,
            testMethod: c.testMethod || 0,
            elements: (c.elements || []).map((e: any) => ({
              parameterID: e.parameterID || 0,
              elementName: e.elementName || '',
              quantity: e.quantity || 0
            }))
          }))
        }))
      }))
    };

    console.log('[PlanForm] onSave payload prepared', payload);
    this.inwardService.testPlanSave(payload).subscribe({
      next: () => {
        this.toastService.show('Test Plan saved successfully!', 'success');
        this.router.navigate(['/sample/plan']);
      },
      error: (err) => {
        console.error('[PlanForm] Error saving test plan:', err);
        this.toastService.show('Error saving test plan. Please try again.', 'error');
      }
    });
  }

  onCancel(): void {
    this.planForm.reset();
    this.router.navigate(['/sample/plan/inward']);
  }

  addPlanToSample(sampleIdx: number): void {
    const sampleGroup = this.samples.at(sampleIdx) as FormGroup;
    const testPlans = sampleGroup.get('testPlans') as FormArray;
    const sampleNo = sampleGroup.get('sampleNo')?.value || '';
    testPlans.push(this.fb.group({ sampleNo: [sampleNo], generalTests: this.fb.array([]), chemicalTests: this.fb.array([]) }));
  }

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
  }

  // used by template
  getTestMethodSpecificationDrop = this.getTestMethodSpecification;
  getMaterialSpecDrop = this.getMaterialSpecificationGrade;
  getMaterialSpecDropForGeneral = this.getMaterialSpecificationGradeForGeneral;
  getMetalDrop = this.getMetalClassification;
  getProductConditionDrop = this.getProductConditions;
  getParameterDrop = this.getChemicalParameter;
}
