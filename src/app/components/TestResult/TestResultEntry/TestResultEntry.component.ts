import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TestResultService } from '../../../services/test-result.service';
import { ParameterService } from '../../../services/parameter.service';
import { Observable } from 'rxjs';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ToastService } from '../../../services/toast.service';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';

@Component({
  selector: 'app-TestResultEntryComponent',
  templateUrl: './TestResultEntry.component.html',
  styleUrls: ['./TestResultEntry.component.css'],
  imports: [ReactiveFormsModule, CommonModule, SearchableDropdownComponent,DecimalOnlyDirective],
})
export class TestResultEntryComponent implements OnInit {

  inward: any = null;
  sample: any = null;
  plans: any[] = [];
  resultForm!: FormGroup;

  // Store API metadata for save/complete
  apiMetadata: any = {
    generalTests: [],
    chemicalTests: []
  };

  constructor(
    private fb: FormBuilder,
    private testResultService: TestResultService,
    private parameterService: ParameterService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.loadDummyData();
    this.buildForm();
    this.loadFullResultPayload(34); // Sample ID
  }

  loadFullResultPayload(sampleId: number): void {
    this.testResultService.getFullResultPayload(sampleId).subscribe({
      next: (data) => {
        console.log("Full Result Payload:", data);
        // Map API response to component format
        this.mapApiResponseToComponentFormat(data);
        // Store metadata for save/complete
        this.storeApiMetadata(data);

        // Rebuild form with actual data
        this.resultForm = this.fb.group({
          plans: this.fb.array(this.plans.map(plan => this.createPlanGroup(plan)))
        });

        // Patch values into form
        this.patchFormValues(data);
      },
      error: (error) => {
        console.error("Error fetching full result payload:", error);
      }
    });
  }

  // ----------------------------------------------------------------
  // Store API Metadata (IDs needed for save/complete)
  // ----------------------------------------------------------------
  storeApiMetadata(apiData: any): void {
    this.apiMetadata = {
      planId: apiData.plans[0]?.planId || null,
      generalTests: [],
      chemicalTests: [],
      inwardId: apiData.inward.id,
      sampleId: apiData.sample.id
    };

    (apiData.plans || []).forEach((plan: any) => {
      (plan.generalTests || []).forEach((generalTest: any) => {
        this.apiMetadata.generalTests.push({
          headerId: generalTest.headerId,
          generalTestId: generalTest.generalTestId,
          testMethodId: generalTest.testMethodId,
          laboratoryTestId: generalTest.laboratoryTestId,
          specification1: generalTest.specification1,
          specification2: generalTest.specification2,
          parameters: generalTest.parameters || []
        });
      });

      (plan.chemicalTests || []).forEach((chemicalTest: any) => {
        this.apiMetadata.chemicalTests.push({
          headerId: chemicalTest.headerId,
          chemicalTestId: chemicalTest.chemicalTestId,
          labTestId: chemicalTest.labTestId,
          specification1: chemicalTest.specification1,
          specification2: chemicalTest.specification2,
          parameters: chemicalTest.parameters || []
        });
      });
    });
  }

  // ----------------------------------------------------------------
  // Map API Response to Component Format
  // ----------------------------------------------------------------
  mapApiResponseToComponentFormat(apiData: any): void {
    // Set Inward Details
    this.inward = {
      caseNo: apiData.inward.caseNo || '',
      customerName: apiData.inward.customerName || '',
    };

    // Set Sample Details
    const sampleData = apiData.sample;
    this.sample = {
      sampleNo: sampleData.sampleNo || '',
      material: sampleData.details || '',
      metalClassification: sampleData.metalClassification || '',
      productCondition: sampleData.productCondition || '',
      batchNo: this.getBatchNoFromAdditionalDetails(sampleData.additionalDetails),
      remarks: sampleData.remarks || '',
    };

    // Map Plans
    this.plans = [];

    (apiData.plans || []).forEach((plan: any) => {
      // Map General Tests
      (plan.generalTests || []).forEach((generalTest: any, gtIdx: number) => {
        const specification = this.buildSpecificationName(
          generalTest.specfication1Name,
          generalTest.specfication2Name
        );

        const genPlan: any = {
          type: 'General',
          specification: specification,
          grade: '',
          headerId: generalTest.headerId,
          tests: [
            {
              id: `gen-${generalTest.headerId}`,
              headerId: generalTest.headerId,
              name: generalTest.laboratoryTest || 'General Test',
              reportNo: generalTest.reportNo || `Auto-${gtIdx}`,
              parameters: (generalTest.parameters || []).map((param: any) => ({
                id: param.id,
                parameterID: param.parameterID || null,
                parameterName: param.parameterName || '',
                unit: param.unit || '',
                value: param.value ?? null,
                remarks: param.remarks ?? '',
                minValue: param.minValue ?? null,
                maxValue: param.maxValue ?? null,
                isWithinLimit: param.isWithinLimit ?? null
              }))
            }
          ]
        };

        this.plans.push(genPlan);
      });

      // Map Chemical Tests
      (plan.chemicalTests || []).forEach((chemicalTest: any) => {
        const specification = this.buildSpecificationName(
          chemicalTest.specfication1Name,
          chemicalTest.specfication2Name
        );

        const chemPlan: any = {
          type: 'Chemical',
          specification: specification,
          grade: '',
          headerId: chemicalTest.headerId,
          tests: [
            {
              id: `chem-${chemicalTest.headerId}`,
              headerId: chemicalTest.headerId,
              name: chemicalTest.name || 'Chemical Test',
              reportNo: chemicalTest.reportNo || `Auto-${chemicalTest.headerId}`,
              parameters: (chemicalTest.parameters || []).map((param: any) => ({
                id: param.id,
                parameterID: param.parameterID || null,
                parameterName: param.parameterName || '',
                unit: param.unit || '',
                value: param.value ?? null,
                remarks: param.remarks ?? '',
                minValue: param.minValue ?? null,
                maxValue: param.maxValue ?? null,
                isWithinLimit: param.isWithinLimit ?? null,
                altered: param.altered || false
              }))
            }
          ]
        };

        this.plans.push(chemPlan);
      });
    });

    // Fallback to dummy if no plans
    if (this.plans.length === 0) {
      this.loadDummyData();
    }
  }

  // ----------------------------------------------------------------
  // Patch Form Values from API
  // ----------------------------------------------------------------
  patchFormValues(apiData: any): void {
    (apiData.plans || []).forEach((plan: any, planIndex: number) => {
      let currentPlanIndex = planIndex;

      // Patch General Tests
      (plan.generalTests || []).forEach((generalTest: any, gtIdx: number) => {
        if (currentPlanIndex < this.plansFA.length) {
          const planGroup = this.plansFA.at(currentPlanIndex) as FormGroup;
          const testGroup = (planGroup.get('tests') as FormArray).at(0) as FormGroup;
          const parametersArray = testGroup.get('parameters') as FormArray;

          (generalTest.parameters || []).forEach((param: any, paramIdx: number) => {
            if (paramIdx < parametersArray.length) {
              const paramGroup = parametersArray.at(paramIdx) as FormGroup;
              paramGroup.patchValue({
                id: param.id,
                parameterID: param.parameterID,
                parameterName: param.parameterName,
                unit: param.unit,
                value: param.value,
                remarks: param.remarks,
                minValue: param.minValue ?? null,
                maxValue: param.maxValue ?? null,
                isWithinLimit: param.isWithinLimit ?? null,
                altered: param.altered || false
              });
            }
          });
        }
        currentPlanIndex++;
      });

      // Patch Chemical Tests
      (plan.chemicalTests || []).forEach((chemicalTest: any, ctIdx: number) => {
        if (currentPlanIndex < this.plansFA.length) {
          const planGroup = this.plansFA.at(currentPlanIndex) as FormGroup;
          const testGroup = (planGroup.get('tests') as FormArray).at(0) as FormGroup;
          const parametersArray = testGroup.get('parameters') as FormArray;

          (chemicalTest.parameters || []).forEach((param: any, paramIdx: number) => {
            if (paramIdx < parametersArray.length) {
              const paramGroup = parametersArray.at(paramIdx) as FormGroup;
              paramGroup.patchValue({
                id: param.id,
                parameterID: param.parameterID,
                parameterName: param.parameterName,
                unit: param.unit,
                value: param.value,
                remarks: param.remarks,
                minValue: param.minValue ?? null,
                maxValue: param.maxValue ?? null,
                isWithinLimit: param.isWithinLimit ?? null,
                altered: param.altered || false
              });
            }
          });
        }
        currentPlanIndex++;
      });
    });
  }

  // ----------------------------------------------------------------
  // Helper Methods
  // ----------------------------------------------------------------
  private getBatchNoFromAdditionalDetails(additionalDetails: any[]): string {
    if (!Array.isArray(additionalDetails)) return '';
    const batchNo = additionalDetails.find(ad => ad.label?.toLowerCase() === 'batch no');
    return batchNo?.value || '';
  }

  private buildSpecificationName(spec1Name: string, spec2Name: string): string {
    if (!spec1Name) return 'Unknown';
    return spec2Name ? `${spec1Name} / ${spec2Name}` : spec1Name;
  }

  // ----------------------------------------------------------------
  // 1. Dummy Data
  // ----------------------------------------------------------------
  loadDummyData(): void {
    this.inward = {
      caseNo: "DMSPL-000001",
      customerName: "Harsh Gujral",
    };

    this.sample = {
      sampleNo: "25-000001",
      material: "TMT",
      metalClassification: "MS",
      productCondition: "Hot Rolled",
      batchNo: "1",
      remarks: "Tensile",
    };

    this.plans = [
      {
        type: "General",
        specification: "IS 1608",
        grade: "Fe500D",
        headerId: 0,
        tests: [
          {
            id: 1,
            headerId: 0,
            name: "Tensile Test",
            reportNo: "25-000001-1",
            parameters: [
              { id: 1, parameterName: "Yield Strength", unit: "MPa", value: null, remarks: "", minValue: null, maxValue: null, isWithinLimit: null },
              { id: 2, parameterName: "UTS", unit: "MPa", value: null, remarks: "", minValue: null, maxValue: null, isWithinLimit: null },
              { id: 3, parameterName: "% Elongation", unit: "%", value: null, remarks: "", minValue: null, maxValue: null, isWithinLimit: null },
            ]
          }
        ]
      },
      {
        type: "Chemical",
        specification: "IS 1786",
        grade: "Fe500D",
        headerId: 0,
        tests: [
          {
            id: 2,
            headerId: 0,
            name: "Spectro Analysis",
            reportNo: "25-000001-2",
            parameters: [
              { id: 4, parameterName: "C", unit: "%", value: null, remarks: "", minValue: 0.15, maxValue: 0.25, isWithinLimit: null },
              { id: 5, parameterName: "Mn", unit: "%", value: null, remarks: "", minValue: 0.5, maxValue: 1.8, isWithinLimit: null },
              { id: 6, parameterName: "S", unit: "%", value: null, remarks: "", minValue: 0.0, maxValue: 0.045, isWithinLimit: null }
            ]
          }
        ]
      }
    ];
  }

  // ----------------------------------------------------------------
  // 2. Build Main Form
  // ----------------------------------------------------------------
  buildForm(): void {
    this.resultForm = this.fb.group({
      plans: this.fb.array(this.plans.map(plan => this.createPlanGroup(plan)))
    });
  }

  get plansFA(): FormArray {
    return this.resultForm.get('plans') as FormArray;
  }

  createPlanGroup(plan: any): FormGroup {
    return this.fb.group({
      type: [plan.type],
      specification: [plan.specification],
      grade: [plan.grade],
      headerId: [plan.headerId],
      tests: this.fb.array(plan.tests.map((t: any) => this.createTestGroup(t,plan.type)))
    });
  }

  getTests(planIndex: number): FormArray {
    return this.plansFA.at(planIndex).get('tests') as FormArray;
  }

 createTestGroup(test: any, planType: string): FormGroup {
    return this.fb.group({
      id: [test.id],
      headerId: [test.headerId],
      name: [test.name],
      reportNo: [test.reportNo],
      parameters: this.fb.array(test.parameters.map((p: any) => this.createParamGroup(p, planType)))
    });
  }

  getParameters(planIndex: number, testIndex: number): FormArray {
    return this.getTests(planIndex).at(testIndex).get('parameters') as FormArray;
  }

  createParamGroup(p: any, planType?: string): FormGroup {
    // For chemical tests require minValue and maxValue validators
    const minValidators = (planType === 'Chemical') ? [Validators.required] : [];
    const maxValidators = (planType === 'Chemical') ? [Validators.required] : [];

    return this.fb.group({
      id: [p.id || 0],
      parameterID: [p.parameterID, Validators.required],
      parameterName: [p.parameterName],
      unit: [p.unit],
      value: [p.value],
      remarks: [p.remarks],
      minValue: [planType === 'Chemical' ? (p.minValue ?? 0) : (p.minValue ?? null), minValidators],
      maxValue: [planType === 'Chemical' ? (p.maxValue ?? 0) : (p.maxValue ?? null), maxValidators],
      isWithinLimit: [p.isWithinLimit ?? null],
      altered: [p.altered || false]
    });
  }

  // ----------------------------------------------------------------
  // 3. Add / Remove parameter rows
  // ----------------------------------------------------------------
  addParameter(planIndex: number, testIndex: number): void {
    const parametersArray = this.getParameters(planIndex, testIndex);
    const planType = this.plansFA.at(planIndex).get('type')?.value;

    // Get existing parameter names to avoid duplicates
    const existingNames = parametersArray.value.map((p: any) => p.parameterName?.toLowerCase() || '');

    const newParam = this.createParamGroup({
      id: 0,
      parameterID: null,
      parameterName: "",
      unit: "",
      value: null,
      remarks: "",
      minValue: planType === 'Chemical' ? 0 : null,
      maxValue: planType === 'Chemical' ? 0 : null,
      isWithinLimit: null,
      altered: true
    }, planType);

    parametersArray.push(newParam);
  }

  removeParameter(planIndex: number, testIndex: number, paramIndex: number): void {
    this.getParameters(planIndex, testIndex).removeAt(paramIndex);
  }

  // Check if parameter name already exists
  isParameterDuplicate(planIndex: number, testIndex: number, paramIndex: number, parameterName: string): boolean {
    if (!parameterName) return false;
    const parametersArray = this.getParameters(planIndex, testIndex);
    const lowerName = parameterName.toLowerCase();

    return parametersArray.value.some((p: any, idx: number) =>
      idx !== paramIndex && p.parameterName?.toLowerCase() === lowerName
    );
  }

  // ----------------------------------------------------------------
  // 4. UI Helpers
  // ----------------------------------------------------------------
  isValueOutOfRange(param: any): boolean {
    if (param.minValue == null || param.maxValue == null || param.value == null) return false;
    return param.value < param.minValue || param.value > param.maxValue;
  }

  isValueWithinRange(param: any): boolean {
    if (param.minValue == null || param.maxValue == null || param.value == null) return false;
    return param.value >= param.minValue && param.value <= param.maxValue;
  }

  // ----------------------------------------------------------------
  // Validate Chemical Parameters
  // ----------------------------------------------------------------
  validateChemicalParameters(): { isValid: boolean; message: string } {
    const formValue = this.resultForm.value;
    const invalidParams: string[] = [];

    formValue.plans.forEach((plan: any, planIdx: number) => {
      if (plan.type === 'Chemical') {
        plan.tests.forEach((test: any, testIdx: number) => {
          test.parameters.forEach((param: any, paramIdx: number) => {
            if (param.parameterID) {
              if (param.minValue === 0 || param.minValue === null) {
                invalidParams.push(`${param.parameterName} - Min Value is required`);
              }
              if (param.maxValue === 0 || param.maxValue === null) {
                invalidParams.push(`${param.parameterName} - Max Value is required`);
              }
              if (param.value === 0 || param.value === null) {
                invalidParams.push(`${param.parameterName} - Value is required`);
              }
            }
          });
        });
      }
    });

    if (invalidParams.length > 0) {
      return {
        isValid: false,
        message: `Chemical test parameters cannot have 0 values:\n\n${invalidParams.join('\n')}`
      };
    }

    return { isValid: true, message: '' };
  }

  // ----------------------------------------------------------------
  // 5. Save / Complete
  // ----------------------------------------------------------------
  saveResults(): void {debugger

    if (!this.resultForm.valid) {
      this.toastService.show("Please fill all required fields", 'error');
      return;
    }

    // Validate chemical parameters
    const validation = this.validateChemicalParameters();
    if (!validation.isValid) {
      this.toastService.show(validation.message, 'warning');
      return;
    }

    const payload = this.buildSavePayload();
    console.log("SAVE Payload:", payload);

    this.testResultService.saveTestResult(payload).subscribe({
      next: (response) => {
        this.toastService.show(response.message, 'success');
      },
      error: (error) => {
        console.error("Error saving results:", error);
        this.toastService.show("Error saving test results", 'error');
      }
    });
  }

  completeResults(): void {
    if (!this.resultForm.valid) {
      this.toastService.show("Please fill all required fields before completing", 'error');
      return;
    }

    // Validate chemical parameters
    const validation = this.validateChemicalParameters();
    if (!validation.isValid) {
      this.toastService.show(validation.message, 'error');
      return;
    }

    const payload = this.buildCompletePayload();
    console.log("COMPLETE Payload:", payload);

    this.testResultService.completeTestResult(payload).subscribe({
      next: (response) => {
        this.toastService.show(response.message, 'success');
      },
      error: (error) => {
        console.error("Error completing results:", error);
        this.toastService.show("Error completing test results", 'error');
      }
    });
  }

  // ----------------------------------------------------------------
  // Build Payload for Save
  // ----------------------------------------------------------------
  buildSavePayload(): any {
    const formValue = this.resultForm.value;
    const payload: any = {
      inwardId: this.apiMetadata.inwardId,
      sampleId: this.apiMetadata.sampleId,
      planId: this.apiMetadata.planId,
      generalTests: [],
      chemicalTests: []
    };

    formValue.plans.forEach((plan: any, planIdx: number) => {
      plan.tests.forEach((test: any, testIdx: number) => {
        const headerId = plan.headerId;
        const testParams = test.parameters;

        // Determine if general or chemical test
        const apiGeneral = this.apiMetadata.generalTests.find((gt: any) => gt.headerId === headerId);
        const apiChemical = this.apiMetadata.chemicalTests.find((ct: any) => ct.headerId === headerId);

        if (apiGeneral) {
          payload.generalTests.push({
            headerId: headerId,
            generalTestId: apiGeneral.generalTestId,
            testMethodId: apiGeneral.testMethodId,
            laboratoryTestId: apiGeneral.laboratoryTestId,
            parameters: testParams.map((param: any) => ({
              id: param.id,
              parameterID: param.parameterID,
              parameterName: param.parameterName,
              unit: param.unit,
              value: param.value,
              remarks: param.remarks,
              minValue: param.minValue,
              maxValue: param.maxValue,
              isWithinLimit: param.isWithinLimit,
              altered: param.altered || false
            }))
          });
        } else if (apiChemical) {
          payload.chemicalTests.push({
            headerId: headerId,
            chemicalTestId: apiChemical.chemicalTestId,
            labTestId: apiChemical.labTestId,
            parameters: testParams.map((param: any) => ({
              id: param.id,
              parameterID: param.parameterID,
              parameterName: param.parameterName,
              unit: param.unit,
              value: param.value,
              remarks: param.remarks,
              minValue: param.minValue,
              maxValue: param.maxValue,
              isWithinLimit: param.isWithinLimit,
              altered: param.altered || false
            }))
          });
        }
      });
    });

    return payload;
  }

  // ----------------------------------------------------------------
  // Build Payload for Complete
  // ----------------------------------------------------------------
  buildCompletePayload(): any {
    const payload = this.buildSavePayload();
    payload.status = 'Completed';
    return payload;
  }

  // ----------------------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------------------
  onValueChanged(planIndex: number, testIndex: number, paramIndex: number): void {
    const row = this.getParameters(planIndex, testIndex).at(paramIndex);

    const value = Number(row.get('value')?.value);
    const min = row.get('minValue')?.value;
    const max = row.get('maxValue')?.value;

    if (min == null && max == null) return; // Mechanical test → skip

    let pass = true;

    if (min != null && value < min) pass = false;
    if (max != null && value > max) pass = false;

    row.patchValue({ isWithinLimit: pass });
  }

  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getChemicalParameterDropdown(term, page, pageSize);

  getMechanicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getMechanicalParameterDropdown(term, page, pageSize);

  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getParameterDropdown(term, page, pageSize);

  getParameterDrop = (type: string) => {
    if (type === 'Chemical') {
      return this.getChemicalParameter;
    } else if (type === 'General') {
      return this.getMechanicalParameter;
    } else {
      return this.getParameter;
    }
  }

  onParameterSelected(planIndex: number, testIndex: number, paramIndex: number, selectedItem: any): void {
    const row = this.getParameters(planIndex, testIndex).at(paramIndex);
    const planType = this.plansFA.at(planIndex).get('type')?.value;
    const unit = selectedItem?.additionalValues ? selectedItem?.additionalValues["Unit"] : row.get('unit')?.value;

    row.patchValue({
      parameterID: selectedItem.id,
      parameterName: selectedItem.name,
      unit: selectedItem.unit || unit,
      minValue: planType === 'Chemical' ? (row.value.minValue ?? 0) : null ,
      maxValue: planType === 'Chemical' ? (row.value.maxValue ?? 0) : null
    });
  }
}
