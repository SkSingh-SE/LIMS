import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { Observable } from 'rxjs';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ProductConditionService } from '../../../services/product-condition.service';

@Component({
  selector: 'app-plan-form',
  imports: [CommonModule, ReactiveFormsModule, SearchableDropdownComponent],
  templateUrl: './plan-form.component.html',
  styleUrl: './plan-form.component.css'
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
  // Store filtered test methods per sample/plan
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
    private productService: ProductConditionService
  ) { }

  ngOnInit(): void {
    if (!this.inwardID) {
      this.activeroute.paramMap.subscribe(params => {
        this.inwardID = Number(params.get('id'));
      });
      this.activeroute.queryParamMap.subscribe(params => {
        this.mode = (params.get('mode') as any) || 'view';
      });
    }
    if (this.mode === 'review') {
      this.isViewMode = true;
    } else if (this.mode === 'plan') {
      this.isViewMode = false;
    }
    this.initForm();
    // this.addDummySamples();
    this.fetchSampleInwardDetails(17);
    if (this.isViewMode) {
      this.planForm.disable();
    }
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

  get sampleInward(): FormGroup {
    return this.planForm.get('sampleInward') as FormGroup;
  }
  get samples(): FormArray {
    return this.planForm.get('samples') as FormArray;
  }

  addSample(): void {
    const sampleNo = `${this.yearCode}-000001`;
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
      additionalDetails: this.fb.array([
        this.fb.group({
          label: ['Heat No'],
          value: ['12345'],
          enabled: [true]
        }),
        this.fb.group({
          label: ['Batch Size'],
          value: ['1000kg'],
          enabled: [true]
        })
        // Add more details as needed
      ]),
      testPlans: this.fb.array([
        this.createTestPlan(sampleNo)
      ])
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
  getAdditionalDetails(sampleIndex: number): FormArray {
    return this.samples.at(sampleIndex).get('additionalDetails') as FormArray;
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

    if (type === 'generalTests') {
      array.push(this.createGeneralTestGroup());
    } else if (type === 'chemicalTests') {
      array.push(this.createChemicalTestGroup(reportNo, ulrNo));
    }
  }
  createGeneralTestGroup(): FormGroup {
    return this.fb.group({
      sampleNo: [''],
      specification1: ['', Validators.required],
      specification2: [''],
      parameter: [''],
      methods: this.fb.array([])
    }, { validators: this.uniqueSpecificationValidator });
  }
  createChemicalTestGroup(reportNo: string, ulrNo: string): FormGroup {
    const testTypesGroup: { [key: string]: any } = {};
    this.testTypeList.forEach(type => {
      testTypesGroup[type] = this.fb.control(false);
    });
    return this.fb.group({
      sampleNo: [''],
      reportNo: [reportNo || 'Auto Generate'],
      ulrNo: [ulrNo || 'Auto Generate'],
      testTypes: this.fb.group(testTypesGroup),
      metalClassificationID: [''],
      specification1: [''],
      specification2: [''],
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
    this.getElementRows(sampleIndex, planIndex).push(this.fb.group({
      parameterID: [''],
      selected: [false]
    }));
  }
  removeElementRow(sampleIndex: number, planIndex: number, elementIndex: number): void {
    this.getElementRows(sampleIndex, planIndex).removeAt(elementIndex);
  }
  asFormGroup(ctrl: AbstractControl | null): FormGroup {
    return ctrl as FormGroup;
  }

  getAdditionalSampleValue(row: AbstractControl, sampleIndex: number): string {
    const valuesArray = row.get('values') as FormArray;
    return valuesArray?.at(sampleIndex)?.value || '-';
  }

  // ────────────── API Calls ──────────────
  fetchSampleInwardDetails(sampleId: number): void {
    this.inwardService.getSampleInwardWithPlans(sampleId).subscribe({
      next: (data) => {
        if (data) {
          // Format the response to match the expected structure for the helper
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

          // Pass formatted response to helper
          this.updateFormFromPayload(formatted);
        }
      },
      error: (err) => console.error('Error fetching sample inward details:', err)
    });
  }

  getMaterialSpecificationGrade = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.materialSpecificationService.getMaterialSpecificationGradeDropdown(term, page, pageSize);

  getLaboratoryTest = (term: string, page: number, pageSize: number, sampleIndex?: number, planIndex?: number): Observable<any[]> => {
    if (
      typeof sampleIndex === 'number' &&
      typeof planIndex === 'number'
    ) {
      const key = `${sampleIndex}_${planIndex}`;
      const filtered = this.filteredTestMethods[key];
      if (filtered && filtered.length > 0) {
        // Optionally filter by term here if needed
        const filteredByTerm = filtered.filter((item: any) =>
          item.name?.toLowerCase().includes(term?.toLowerCase() || '')
        );
        return new Observable((observer) => {
          observer.next(filteredByTerm);
          observer.complete();
        });
      }
    }
    // fallback to API
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.metalService.getMetalClassificationDropdown(term, page, pageSize);

  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);

  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getChemicalParameterDropdown(term, page, pageSize);

  // Fetch default standard for a specification
  getDefaultStandardForSpecification(gradeId: string): Observable<any> {
    return this.materialSpecificationService.getDefaultStandardBySpecificationId(+gradeId);
  }

  // Fetch test methods for selected specifications
  getTestMethodsForSpecifications(spec1: string, spec2: string): Observable<any[]> {
    const spec1Num = spec1 ? +spec1 : 0;
    const spec2Num = spec2 ? +spec2 : 0;
    return this.materialSpecificationService.getTestMethodsBySpecifications(spec1Num, spec2Num);
  }
  getProductConditions = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.productService.getProductConditionDropdown(term, page, pageSize);
  };
   onMetalClassificationSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.samples.at(sampleIndex) as FormGroup;
    sampleDetailGroup.patchValue({
      metalClassificationID: item.id,
    });
  }
  onProductConditionSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.samples.at(sampleIndex) as FormGroup;
    sampleDetailGroup.patchValue({
      productConditionID: item.id,
    });
  }

  // Dropdown Event Handlers
  onSpecificationGradeSelected(
    sampleIndex: number,
    planIndex: number,
    item: any,
    field: 'specification1' | 'specification2',
    testType: 'generalTests' | 'chemicalTests'
  ) {
    const section = testType === 'generalTests'
      ? this.getGeneralTestSection(sampleIndex, planIndex)
      : this.getChemicalTestSection(sampleIndex, planIndex);

    section.patchValue({ [field]: item.id });

    // Only apply auto-standard and test method filtering for generalTests
    if (testType === 'generalTests') {
      const spec1 = section.get('specification1')?.value;
      const spec2 = section.get('specification2')?.value;

      if (spec1 && spec2 && spec1 === spec2) {
        this.toastService.show('Specification 1 and Specification 2 cannot be the same.', 'warning');
        section.patchValue({ [field]: 0 });
        return;
      }
      // Auto-select standard for the changed specification
      if (item.id) {
        this.getDefaultStandardForSpecification(item.id).subscribe((standard) => {
          if (standard && standard.length === 0) {
            this.toastService.show('No default standard found for the selected specification.', 'warning');
          }
          this.filteredStandards.push(...(standard ?? []));

          // keep only unique by id
          this.filteredStandards = this.filteredStandards.filter(
            (item, index, self) =>
              index === self.findIndex(t => t.id === item.id)
          );

          // Set standardID in the first method row if exists
          const methods = section.get('methods') as FormArray;
          if (methods && methods.length > 0 && standard[0]?.id) {
            methods.at(0).patchValue({ standardID: standard[0].id });
          }
        });
      }

      // Fetch and filter test methods based on both specifications
      if (spec1 || spec2) {
        this.getTestMethodsForSpecifications(spec1, spec2).subscribe((methods) => {
          // Store filtered methods for this sample/plan
          const key = `${sampleIndex}_${planIndex}`;
          this.filteredTestMethods[key] = methods || [];
        });
      }
    }
  }

  onLaboratorySelected(item: any, sampleIndex: number, planIndex: number, methodIndex: number) {
    this.getMethodRows(sampleIndex, planIndex).at(methodIndex).patchValue({
      testMethodID: item.id,
    });
  }
  onMetalSelected(sampleIndex: number, planIndex: number, item: any) {
    const chemicalTestGroup = this.getChemicalTestSection(sampleIndex, planIndex);
    chemicalTestGroup.patchValue({
      metalClassificationID: item.id,
    });
  }
  onGeneralTestStandardSelected(item: any, sampleIndex: number, planIndex: number, methodIndex: number) {
    this.getMethodRows(sampleIndex, planIndex).at(methodIndex).patchValue({
      standardID: item.id,
    });
  }
  onChemicalStandardSelected(item: any, sampleIndex: number, planIndex: number) {
    const chemicalTestGroup = this.getChemicalTestSection(sampleIndex, planIndex);
    chemicalTestGroup.patchValue({
      standardID: item.id,
    });
  }
  onParameterSelected(item: any, sampleIndex: number, planIndex: number, testIndex: number, index: number) {
    this.getElementRows(sampleIndex, planIndex).at(index).patchValue({
      parameterID: item.id,
    });
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
  getAdditionalDetailsArray(sample: AbstractControl): AbstractControl[] {
    const arr = sample.get('additionalDetails') as FormArray;
    return arr ? arr.controls : [];
  }

  // Add this validator function at the top or inside the class
  uniqueSpecificationValidator(group: FormGroup) {
    const spec1 = group.get('specification1')?.value;
    const spec2 = group.get('specification2')?.value;
    if (spec1 && spec2 && spec1 === spec2) {
      return { sameSpecification: true };
    }
    return null;
  }

  updateFormFromPayload(payload: any): void {
    // Set top-level fields
    this.planForm.patchValue({
      id: payload.id ?? 0,
      caseNo: payload.caseNo ?? '',
      sampleReceiptNote: payload.sampleReceiptNote ?? '',
      urgent: payload.urgent ?? false,
      returnSample: payload.returnSample ?? false,
      notDestroyed: payload.notDestroyed ?? false,
      statementOfConformity: payload.statementOfConformity ?? 'Not Applicable',
      decisionRule: payload.decisionRule ?? 'Not Applicable'
      // Add other top-level fields as needed
    });

    // Clear existing samples
    this.samples.clear();

    // Map sampleDetails to form structure
    (payload.sampleDetails || []).forEach((sample: any, sampleIdx:number) => {
      // Find additional details for this sample
      const additionalDetailsArr = (payload.sampleAdditionalDetails || [])
        .filter((ad: any) => ad.sampleID === sample.id)
        .map((ad: any) =>
          this.fb.group({
            id: [ad.id],
            sampleID: [ad.sampleID],
            sampleNo: [sample.sampleNo],
            label: [ad.label],
            value: [ad.value],
            enabled: [true]
          })
        );

      // Find test plans for this sample (if any)
      const testPlansArr = (payload.sampleTestPlans || [])
        .filter((tp: any) => tp.sampleID === sample.id)
        .map((tp: any, planIdx:number) => {
          // Map generalTests
          const generalTestsArr = (tp.generalTests || []).map((gt: any) =>
            this.fb.group({
              id: [gt.id],
              sampleNo: [gt.sampleNo],
              specification1: [gt.specification1],
              specification2: [gt.specification2],
              parameter: [gt.parameter],
              methods: this.fb.array(
                (gt.methods || []).map((m: any) =>
                  this.fb.group({
                    testMethodID: [m.testMethodID],
                    standardID: [m.standardID],
                    quantity: [m.quantity],
                    reportNo: [m.reportNo],
                    ulrNo: [m.ulrNo],
                    cancel: [m.cancel]
                  })
                )
              )
            }, { validators: this.uniqueSpecificationValidator }) // <-- add validator here
          );

          // Map chemicalTests
          const chemicalTestsArr = (tp.chemicalTests || []).map((ct: any) =>
            this.fb.group({
              sampleNo: [ct.sampleNo],
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
              specification1: [ct.specification1],
              specification2: [ct.specification2],
              testMethod: [ct.testMethod],
              elements: this.fb.array(
                (ct.elements || []).map((el: any) =>
                  this.fb.group({
                    parameterID: [el.parameterID],
                    selected: [el.selected]
                  })
                )
              )
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
    });
    if (this.isViewMode) {
      this.planForm.disable();
    }
  }

  onSave(): void {
    const raw = this.planForm.value;
    console.log('Initial Payload:', this.planForm.value);

    const payload = {
      id: raw.id || 0,
      caseNo: raw.caseNo || '',
      customerID: raw.customerID || 0,

      statementOfConformity: raw.statementOfConformity || 'Not Applicable',
      decisionRule: raw.decisionRule || 'Not Applicable',

      //  SampleDetails
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

        //  AdditionalDetails (strip "enabled")
        additionalDetails: (s.additionalDetails || []).map((a: any) => ({
          id: a.id || 0,
          sampleNo: s.sampleNo,
          label: a.label || '',
          value: a.value || '',
          sampleID: a.sampleID || 0
        })),

        //  TestPlans
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
      })),

    };

    console.log('Final Payload:', payload);

    this.inwardService.testPlanSave(payload).subscribe({
      next: (res) => {
        this.toastService.show('Test Plan saved successfully!', 'success');
        this.router.navigate(['/sample/plan']);
      },
      error: (err) => {
        console.error('Error saving test plan:', err);
        this.toastService.show('Error saving test plan. Please try again.', 'error');
      }
    });
  }


  onCancel(): void {
    // You can reset the form or navigate away as needed
    this.planForm.reset();
    this.router.navigate(['/sample/plan/inward']);
    // Optionally, navigate away
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
  openFileInNewTab(filePath: string): void {
    if (filePath) {
      window.open(this.baseUrl + filePath, '_blank');
    }
  }
  // Tab Management
  setDefaultTab(sampleIdx: number, planIdx: number, plan: any) {
    const key = `${sampleIdx}-${planIdx}`;

    if (plan?.generalTests?.length > 0) {
      this.activeTabs[key] = 'general';
    } else if (plan?.chemicalTests?.length > 0) {
      this.activeTabs[key] = 'chemical';
    } else {
      this.activeTabs[key] = 'general'; // fallback
    }
  }

  isActiveTab(sampleIdx: number, planIdx: number, tab: string): boolean {
    return this.activeTabs[`${sampleIdx}-${planIdx}`] === tab;
  }

  setActiveTab(sampleIdx: number, planIdx: number, tab: 'general' | 'chemical') {
    this.activeTabs[`${sampleIdx}-${planIdx}`] = tab;
  }
}
