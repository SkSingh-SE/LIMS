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
import { SampleStatus } from '../../../utility/status_flow/enums/sample-status.enum';
import { InwardStatus } from '../../../utility/status_flow/enums/inward-status.enum';
import { TPIService } from '../../../services/tpi.service';

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
  isEditMode = false;
  sampleId!: number;

  yearCode = new Date().getFullYear().toString().slice(-2);
  // testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];
  testTypeList: { id: number, name: string }[] = [];
  activeTabs: { [key: string]: 'general' | 'chemical' } = {};
  filteredTestMethods: { [key: string]: any[] } = {};
  filteredStandardsMap: { [key: string]: any[] } = {};
  filteredTestCases: { [key: string]: any[] } = {};

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
    private testMappingService: MaterialTestMappingService,
    private tpiService: TPIService,
  ) { }

  ngOnInit(): void {
    this.activeroute.paramMap.subscribe(params => {
      this.sampleId = Number(params.get('id'));
      this.inwardID = this.sampleId;
    });

    this.activeroute.queryParamMap.subscribe(params => {
      const mode = params.get('mode') || '';
      this.isViewMode = mode === 'view';
      this.isEditMode = mode === 'edit' || mode === 'review';
    });

    const state = history.state as { mode?: string };
    if (state?.mode) {
      this.isViewMode = state.mode === 'view' || state.mode === 'review';
      this.isEditMode = state.mode === 'edit';
    }
    this.loadChemicalTestTypes();

    this.initForm();
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
    (generalTestGroup.get('methods') as FormArray).push(this.createTestMethodRow('Auto Generate', 'Auto Generate'));
    return this.fb.group({
      sampleNo: [sampleNo],
      generalTests: this.fb.array([generalTestGroup]),
      chemicalTests: this.fb.array([])
    });
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

  createChemicalTestGroup(reportNo: string, urlNo: string): FormGroup {
    const testTypesGroup: { [key: string]: any } = {};
    this.testTypeList.forEach(t => {
      testTypesGroup[t.id] = this.fb.control(false);
    });
    return this.fb.group({
      sampleNo: [''],
      reportNo: [reportNo || 'Auto Generate'],
      urlNo: [urlNo || 'Auto Generate'],
      testTypes: this.fb.group(testTypesGroup),
      specification1: [null],
      specification2: [null],
      testMethod: [''],
      elements: this.fb.array([])
    });
  }

  createTestMethodRow(reportNo: string, urlNo: string): FormGroup {
    return this.fb.group({
      testMethodID: ['', Validators.required],
      testCaseID: ['', Validators.required],
      selectionType: [''],
      value: [''],
      standardID: [''],
      quantity: ['1'],
      reportNo: [reportNo],
      urlNo: [urlNo],
      cancel: [false]
    });
  }

  createElementRow(): FormGroup {
    return this.fb.group({
      parameterID: [''],
      specificationLineID: [''],
      parameterName: [''],
      minValue: [null],
      maxValue: [null],
      parameterUnitID: [''],
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
      array.push(this.createChemicalTestGroup('Auto Generate', 'Auto Generate'));
    }
  }

  addMethodRow(sampleIndex: number, planIndex: number): void {
    this.getMethodRows(sampleIndex, planIndex).push(this.createTestMethodRow('Auto Generate', 'Auto Generate'));
  }

  addElementRow(sampleIndex: number, planIndex: number): void {
    this.getElementRows(sampleIndex, planIndex).push(this.createElementRow());
  }

  removeElementRow(sampleIndex: number, planIndex: number, elementIndex: number): void {
    this.getElementRows(sampleIndex, planIndex).removeAt(elementIndex);
  }

  addPlanToSample(sampleIdx: number): void {
    const sampleGroup = this.samples.at(sampleIdx) as FormGroup;
    const testPlans = sampleGroup.get('testPlans') as FormArray;
    const sampleNo = sampleGroup.get('sampleNo')?.value || '';
    testPlans.push(this.fb.group({
      sampleNo: [sampleNo],
      generalTests: this.fb.array([]),
      chemicalTests: this.fb.array([])
    }));
  }

  // ────────────── API Calls ──────────────
  fetchSampleInwardDetails(sampleId: number): void {
    this.inwardService.getSampleInwardWithPlans(sampleId).subscribe({
      next: (data) => {
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
            tpiAgencyID: s.tpiAgencyID,
            remarks: s.remarks,
            quantity: s.quantity,
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
            generalTests: (tp.generalTests || []).map((gt: any) => ({
              id: gt.id,
              sampleNo: gt.sampleNo,
              specification1: gt.specification1,
              specification2: gt.specification2,
              parameter: gt.parameter,
              methods: (gt.methods || []).map((m: any) => ({
                testMethodID: m.testMethodID,
                testCaseID: m.testCaseID,
                selectionType: m.selectionType,
                value: m.value,
                standardID: m.standardID,
                quantity: m.quantity,
                reportNo: m.reportNo,
                urlNo: m.urlNo,
                cancel: m.cancel
              }))
            })),
            chemicalTests: (tp.chemicalTests || []).map((ct: any) => ({
              sampleNo: ct.sampleNo,
              reportNo: ct.reportNo,
              urlNo: ct.urlNo,
              testTypes: {
                Spectro: ct.testTypes?.Spectro ?? false,
                Chemical: ct.testTypes?.Chemical ?? false,
                XRF: ct.testTypes?.XRF ?? false,
                'Full Analysis': ct.testTypes?.['Full Analysis'] ?? false,
                ROHS: ct.testTypes?.ROHS ?? false
              },
              specification1: ct.specification1,
              specification2: ct.specification2,
              testMethod: ct.testMethod,
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

  getLaboratoryTestCases = (testMethodId: number): Observable<any[]> =>
    this.laboratoryTestService.getTestCasesByTestMethodId(testMethodId);

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

    // General Test Logic
    if (testType === 'generalTests') {
      if (newId) {
        this.materialSpecificationService.getDefaultStandardBySpecificationId(+newId).subscribe({
          next: (standard: any[]) => {
            if (!standard || standard.length === 0) {
              this.toastService.show('No default standard found for the selected specification.', 'info');
              return;
            }

            const existingStandards = this.filteredStandardsMap[key] || [];
            const map = new Map<number, any>(existingStandards.map(s => [s.id, s]));
            (standard || []).forEach((s: any) => map.set(s.id, s));
            this.filteredStandardsMap[key] = Array.from(map.values());

            const methods = section.get('methods') as FormArray;
            if (methods && methods.length > 0 && standard[0]?.id) {
              methods.at(0).patchValue({ standardID: standard[0].id });
            }
          },
          error: (err) => console.warn('[PlanForm] Error fetching default standard', err)
        });
      }

      if (specsToUse.length > 0) {
        this.testMappingService.getAutoSuggestedTests(metalId, productConditionId, specsToUse.join(','))
          .subscribe({
            next: (tests: any[]) => {
              const methods = section.get('methods') as FormArray;

              if (tests && tests.length > 0) {
                const unique = tests.filter(
                  (t: any, i: number, self: any[]) => i === self.findIndex((x: any) => x.id === t.id)
                );
                this.filteredTestMethods[key] = unique;

                // if (methods && methods.length > 0 && unique[0]?.id) {
                //   methods.at(0).patchValue({ testMethodID: unique[0].id });
                // }
              } else {
                this.filteredTestMethods[key] = [];
                this.toastService.show('No suggested test methods found for selected specifications.', 'info');
              }
            },
            error: (err) => {
              console.warn('[PlanForm] Error in getAutoSuggestedTests', err);
              this.filteredTestMethods[key] = [];
            }
          });
      }
    }

    // Chemical Test Logic
    if (testType === 'chemicalTests') {
      if (specsToUse.length > 0) {
        this.testMappingService.getAutoSuggestedTests(metalId, productConditionId, specsToUse.join(','))
          .subscribe({
            next: (tests: any[]) => {
              if (tests && tests.length > 0) {
                const unique = tests.filter(
                  (t: any, i: number, self: any[]) => i === self.findIndex((x: any) => x.id === t.id)
                );
                this.filteredTestMethods[key] = unique;

                if (unique[0]?.id) {
                  section.patchValue({ testMethod: unique[0].id });
                }
              } else {
                this.filteredTestMethods[key] = [];
                this.toastService.show('No suggested chemical test methods found.', 'info');
              }
            },
            error: (err) => {
              console.warn('[PlanForm] Error in chemical getAutoSuggestedTests', err);
              this.filteredTestMethods[key] = [];
            }
          });
      }

      // Fetch chemical elements
      this.materialSpecificationService.getChemicalElementsBySpecifications(spec1 || 0, spec2 || 0)
        .subscribe({
          next: (elements: any[]) => {
            const elementsArray = section.get('elements') as FormArray;
            elementsArray.clear();

            if (!elements || elements.length === 0) {
              this.toastService.show('No chemical elements found for selected specifications.', 'info');
              return;
            }

            elements.forEach((el) => {
              elementsArray.push(this.fb.group({
                parameterID: [el.parameterID || el.id || 0],
                specificationLineID: [el.specificationLineID || 0],
                parameterName: [el.parameterName || ''],
                minValue: [el.minValue ?? null],
                maxValue: [el.maxValue ?? null],
                parameterUnitID: [el.parameterUnitID || 0],
                parameterUnit: [el.parameterUnit || ''],
                selected: [!!el.isCommon || false]
              }));
            });

            this.toastService.show('Chemical elements loaded successfully.', 'success');
          },
          error: (err) => {
            console.error('[PlanForm] Error fetching chemical elements', err);
            this.toastService.show('Error fetching chemical elements. Please try again.', 'error');
          }
        });
    }
  }

  onLaboratorySelected(item: any, sampleIndex: number, planIndex: number, methodIndex: number) {
    const methodsArray = this.getMethodRows(sampleIndex, planIndex);
    if (!methodsArray) return;

    const methodCtrl = methodsArray.at(methodIndex);
    if (!methodCtrl) return;

    methodCtrl.patchValue({
      testMethodID: item?.id ?? null,
      testCaseID: null,
      selectionType: '',
      value: '',
    });

    // Load test cases for selected test method
    if (item?.id) {
      const key = `${sampleIndex}_${planIndex}_${methodIndex}`;
      this.getLaboratoryTestCases(item.id).subscribe({
        next: (testCases: any[]) => {
          this.filteredTestCases[key] = testCases || [];
          if (testCases && testCases.length === 0) {
            this.toastService.show('No test cases found for the selected test method.', 'info');
          }
        },
        error: (err) => {
          console.error('[PlanForm] Error fetching test cases:', err);
          this.toastService.show('Error loading test cases.', 'error');
          this.filteredTestCases[key] = [];
        }
      });
    }
  }

  onTestCaseSelected(value: any, sampleIndex: number, planIndex: number, methodIndex: number) {
    debugger;
    const methodsArray = this.getMethodRows(sampleIndex, planIndex);
    if (!methodsArray) return;

    const methodCtrl = methodsArray.at(methodIndex);
    if (!methodCtrl) return;

    const key = `${sampleIndex}_${planIndex}_${methodIndex}`;

    const item = this.filteredTestCases[key] || [];
    const selectedItem = item.find((tc: any) => tc.id == value?.id) || null;
    // Update test case ID and populate derived fields
    if (selectedItem?.id) {
      methodCtrl.patchValue({
        testCaseID: selectedItem.id,
        selectionType: selectedItem.selectionType || '',
        value: selectedItem.value || ''
      });
    } else {
      methodCtrl.patchValue({
        testCaseID: null,
        selectionType: '',
        value: ''
      });
    }
  }

  onGeneralTestStandardSelected(item: any, sampleIndex: number, planIndex: number, methodIndex: number) {
    const methods = this.getMethodRows(sampleIndex, planIndex);
    if (!methods) return;

    const methodCtrl = methods.at(methodIndex);
    if (!methodCtrl) return;
    methodCtrl.patchValue({ standardID: item?.id ?? null });
  }

  onChemicalStandardSelected(item: any, sampleIndex: number, planIndex: number) {
    const chemicalTestGroup = this.getChemicalTestSection(sampleIndex, planIndex);
    chemicalTestGroup.patchValue({ standardID: item.id });
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
              id: [gt.id],
              sampleNo: [sample.sampleNo],
              specification1: [gt.specification1 !== undefined && gt.specification1 !== null ? +gt.specification1 : null],
              specification2: [gt.specification2 !== undefined && gt.specification2 !== null ? +gt.specification2 : null],
              parameter: [gt.parameter],
              methods: this.fb.array((gt.methods || []).map((m: any) => this.fb.group({
                testMethodID: [m.testMethodID, Validators.required],
                testCaseID: [m.testCaseID, Validators.required],
                selectionType: [m.selectionType || ''],
                value: [m.value || ''],
                standardID: [m.standardID],
                quantity: [m.quantity],
                reportNo: [m.reportNo],
                urlNo: [m.urlNo],
                cancel: [m.cancel]
              })))
            })
          );

          const chemicalTestsArr = (tp.chemicalTests || []).map((ct: any) => {

            const testTypesGroup: any = {};
            this.testTypeList.forEach(t => {
              testTypesGroup[t.id] = [ct.testTypes?.[t.id] ?? false];
            });

            return this.fb.group({
              sampleNo: [sample.sampleNo],
              reportNo: [ct.reportNo],
              urlNo: [ct.urlNo],
              testTypes: this.fb.group(testTypesGroup),
              specification1: [
                ct.specification1 !== undefined && ct.specification1 !== null ? +ct.specification1 : null
              ],
              specification2: [
                ct.specification2 !== undefined && ct.specification2 !== null ? +ct.specification2 : null
              ],
              testMethod: [ct.testMethod],
              elements: this.fb.array((ct.elements || []).map((el: any) =>
                this.fb.group({
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
        fileName: [sample.fileName ?? ''],
        sampleFilePath: [sample.sampleFilePath ?? ''],
        additionalDetails: this.fb.array(additionalDetailsArr),
        testPlans: this.fb.array(testPlansArr)
      }));
    });
  }

  // ────────────── Submission ──────────────
  onSave(): void {
    debugger;
    const payload = this.buildPayload(SampleStatus.UNDER_PLANNING);
    this.inwardService.testPlanSave(payload).subscribe({
      next: () => {
        this.toastService.show('Test Plan saved successfully!', 'success');
        this.router.navigate(['/sample/plan']);
      },
      error: (err) => {
        console.error('[PlanForm] Save Error:', err);
        this.toastService.show('Error saving test plan.', 'error');
      }
    });
  }

  onSendForReview(): void {
    const payload = this.buildPayload(SampleStatus.UNDER_REVIEW_REQUEST);
    this.inwardService.sendTestPlanForReview(payload).subscribe({
      next: () => {
        this.toastService.show('Plan sent for review successfully!', 'success');
        this.router.navigate(['/sample/review', payload.id]);
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
        productConditionID: s.productConditionID || '',
        metalClassificationID: s.metalClassificationID || '',
        tpiAgencyID: s.tpiAgencyID || null,
        remarks: s.remarks || '',
        quantity: s.quantity || 0,
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
          sampleNo: s.sampleNo,

          generalTests: (tp.generalTests || []).map((g: any) => ({
            sampleNo: g.sampleNo || '',
            specification1: g.specification1 || 0,
            specification2: g.specification2 || null,
            parameter: g.parameter || '',
            methods: (g.methods || []).map((m: any) => ({
              testMethodID: m.testMethodID || 0,
              testCaseID: m.testCaseID || null,
              selectionType: m.selectionType || '',
              value: m.value || '',
              standardID: m.standardID || 0,
              quantity: m.quantity || 0,
              reportNo: m.reportNo === 'Auto Generate' ? '' : m.reportNo || '',
              urlNo: m.urlNo === 'Auto Generate' ? '' : m.urlNo || '',
              cancel: m.cancel || false
            }))
          })),

          chemicalTests: (tp.chemicalTests || []).map((c: any) => ({
            sampleNo: c.sampleNo || '',
            reportNo: c.reportNo === 'Auto Generate' ? '' : c.reportNo || '',
            urlNo: c.urlNo === 'Auto Generate' ? '' : c.urlNo || '',
            testTypes: c.testTypes || {},
            specification1: c.specification1 || 0,
            specification2: c.specification2 || null,
            testMethod: c.testMethod || 0,
            elements: (c.elements || []).map((e: any) => ({
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

  onCancel(): void {
    this.planForm.reset();
    this.router.navigate(['/sample/plan/inward']);
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
  }

  // Dropdown functions for template
  getTestMethodSpecificationDrop = this.getTestMethodSpecification;
  getMetalDrop = this.getMetalClassification;
  getProductConditionDrop = this.getProductConditions;
  getParameterDrop = this.getChemicalParameter;

  loadChemicalTestTypes() {
    this.laboratoryTestService.getLaboratoryTestDropdownForChemicals('',0,100).subscribe({
      next: (data) => {
        this.testTypeList = data || [];
      },
      error: (err) => {
        console.error("Failed to load dynamic chemical test types", err);
        this.testTypeList = [];
      }
    });
  }

}
