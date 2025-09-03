import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-plan-form',
  imports: [CommonModule, ReactiveFormsModule, SearchableDropdownComponent],
  templateUrl: './plan-form.component.html',
  styleUrl: './plan-form.component.css'
})
export class PlanFormComponent implements OnInit {
  baseUrl = environment.baseUrl;
  planForm!: FormGroup;
  isViewMode = false;
  yearCode = new Date().getFullYear().toString().slice(-2);
  testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];

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
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initForm();
    // this.addDummySamples();
    this.fetchSampleInwardDetails(17);
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
      category: ['Raw Material'],
      nature: ['Solid'],
      remarks: ['Sample received in good condition'],
      quantity: [1],
      cuttingRequired: [false],
      machiningRequired: [false],
      machiningAmount: [0],
      otherPreparation: [false],
      tpiRequired: [false],
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
      specification1: [''],
      specification2: [''],
      parameter: [''],
      methods: this.fb.array([])
    });
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
    this.inwardService.getSampleInwardById(sampleId).subscribe({
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
              category: s.category,
              nature: s.nature,
              remarks: s.remarks,
              quantity: s.quantity,
              cuttingRequired: s.cuttingRequired ?? false,
              machiningRequired: s.machiningRequired ?? false,
              machiningAmount: s.machiningAmount ?? 0,
              otherPreparation: s.otherPreparation ?? false,
              tpiRequired: s.tpiRequired ?? false,
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

  getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);

  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.metalService.getMetalClassificationDropdown(term, page, pageSize);

  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);

  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getChemicalParameterDropdown(term, page, pageSize);

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

  addDummySamples(): void {
    // Sample 1
    this.samples.push(this.fb.group({
      sampleNo: ['24-000001'],
      details: ['Steel Rod'],
      category: ['Raw Material'],
      nature: ['Solid'],
      remarks: ['First sample received in good condition'],
      quantity: [10],
      cuttingRequired: [true],
      machiningRequired: [false],
      machiningAmount: [0],
      otherPreparation: [false],
      tpiRequired: [true],
      additionalDetails: this.fb.array([
        this.fb.group({ label: ['Heat No'], value: ['HN123'], enabled: [true] }),
        this.fb.group({ label: ['Batch Size'], value: ['500kg'], enabled: [true] })
      ]),
      testPlans: this.fb.array([
        this.fb.group({
          sampleNo: ['24-000001'],
          generalTests: this.fb.array([
            this.fb.group({
              sampleNo: ['24-000001'],
              specification1: ['1'],
              specification2: ['2'],
              parameter: [''],
              methods: this.fb.array([
                this.fb.group({
                  testMethodID: ['1'],
                  standardID: ['4'],
                  quantity: [2],
                  reportNo: ['RPT001'],
                  ulrNo: ['ULR001'],
                  cancel: [false]
                })
              ])
            })
          ]),
          chemicalTests: this.fb.array([])
        }),
        this.fb.group({
          sampleNo: ['24-000001'],
          generalTests: this.fb.array([]),
          chemicalTests: this.fb.array([
            this.fb.group({
              sampleNo: ['24-000001'],
              reportNo: ['RPT002'],
              ulrNo: ['ULR002'],
              testTypes: this.fb.group({
                Spectro: [true],
                Chemical: [true],
                XRF: [false],
                'Full Analysis': [false],
                ROHS: [false]
              }),
              metalClassificationID: ['3'],
              specification1: ['1'],
              specification2: ['2'],
              testMethod: ['3'],
              elements: this.fb.array([
                this.fb.group({ parameterID: ['1'], selected: [true] }),
                this.fb.group({ parameterID: ['2'], selected: [false] })
              ])
            })
          ])
        })
      ])
    }));

    // Sample 2
    this.samples.push(this.fb.group({
      sampleNo: ['24-000002'],
      details: ['Copper Sheet'],
      category: ['Raw Material'],
      nature: ['Solid'],
      remarks: ['Second sample received in good condition'],
      quantity: [5],
      cuttingRequired: [false],
      machiningRequired: [true],
      machiningAmount: [200],
      otherPreparation: [true],
      tpiRequired: [false],
      additionalDetails: this.fb.array([
        this.fb.group({ label: ['Heat No'], value: ['HN456'], enabled: [true] }),
        this.fb.group({ label: ['Batch Size'], value: ['200kg'], enabled: [true] }),
        this.fb.group({ label: ['Supplier'], value: ['ABC Metals'], enabled: [true] })
      ]),
      testPlans: this.fb.array([
        this.fb.group({
          sampleNo: ['24-000002'],
          generalTests: this.fb.array([
            this.fb.group({
              sampleNo: ['24-000002'],
              specification1: ['1'],
              specification2: ['2'],
              parameter: [''],
              methods: this.fb.array([
                this.fb.group({
                  testMethodID: ['1'],
                  standardID: ['3'],
                  quantity: [1],
                  reportNo: ['RPT003'],
                  ulrNo: ['ULR003'],
                  cancel: [false]
                })
              ])
            })
          ]),
          chemicalTests: this.fb.array([])
        }),
        this.fb.group({
          sampleNo: ['24-000002'],
          generalTests: this.fb.array([]),
          chemicalTests: this.fb.array([
            this.fb.group({
              sampleNo: ['24-000002'],
              reportNo: ['RPT004'],
              ulrNo: ['ULR004'],
              testTypes: this.fb.group({
                Spectro: [false],
                Chemical: [true],
                XRF: [true],
                'Full Analysis': [false],
                ROHS: [true]
              }),
              metalClassificationID: ['1'],
              specification1: ['1'],
              specification2: ['2'],
              testMethod: ['3'],
              elements: this.fb.array([
                this.fb.group({ parameterID: ['3'], selected: [true] }),
                this.fb.group({ parameterID: ['4'], selected: [true] })
              ])
            })
          ])
        })
      ])
    }));
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
    (payload.sampleDetails || []).forEach((sample: any) => {
      // Find additional details for this sample
      const additionalDetailsArr = (payload.sampleAdditionalDetails || [])
        .filter((ad: any) => ad.sampleID === sample.id)
        .map((ad: any) =>
          this.fb.group({
            label: [ad.label],
            value: [ad.value],
            enabled: [true]
          })
        );

      // Find test plans for this sample (if any)
      const testPlansArr = (payload.sampleTestPlans || [])
        .filter((tp: any) => tp.sampleID === sample.id)
        .map((tp: any) => {
          // Map generalTests
          const generalTestsArr = (tp.generalTests || []).map((gt: any) =>
            this.fb.group({
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
            })
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

          return this.fb.group({
            sampleNo: [tp.sampleNo],
            generalTests: this.fb.array(generalTestsArr),
            chemicalTests: this.fb.array(chemicalTestsArr)
          });
        });

      this.samples.push(this.fb.group({
        sampleNo: [sample.sampleNo],
        details: [sample.details],
        category: [sample.category],
        nature: [sample.nature],
        remarks: [sample.remarks],
        quantity: [sample.quantity],
        cuttingRequired: [sample.cuttingRequired ?? false],
        machiningRequired: [sample.machiningRequired ?? false],
        machiningAmount: [sample.machiningAmount ?? 0],
        otherPreparation: [sample.otherPreparation ?? false],
        tpiRequired: [sample.tpiRequired ?? false],
        fileName: [sample.fileName ?? ''],
        sampleFilePath: [sample.sampleFilePath ?? ''],
        additionalDetails: this.fb.array(additionalDetailsArr),
        testPlans: this.fb.array(testPlansArr)
      }));
    });
  }

  onSave(): void {
    console.log('Form Value:', this.planForm.value);
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
}
