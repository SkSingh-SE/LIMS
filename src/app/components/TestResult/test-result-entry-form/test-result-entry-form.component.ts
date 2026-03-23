import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TestResultService } from '../../../services/test-result.service';
import { ParameterService } from '../../../services/parameter.service';
import { EquipmentService } from '../../../services/equipment.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { Observable } from 'rxjs';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ToastService } from '../../../services/toast.service';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { TestStatusBadgeComponent } from '../test-status-badge/test-status-badge.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-test-result-entry-form',
  templateUrl: './test-result-entry-form.component.html',
  styleUrls: ['./test-result-entry-form.component.css'],
  imports: [ReactiveFormsModule, CommonModule, SearchableDropdownComponent, DecimalOnlyDirective, TestStatusBadgeComponent, FormsModule],
})
export class TestResultEntryFormComponent implements OnInit {

  baseUrl: string = environment.baseUrl;
  sampleId: number = 0;
  inward: any = null;
  sample: any = null;
  plans: any[] = [];
  resultForm!: FormGroup;
  isViewMode: boolean = false;

  // Top-level tabs: Test Results vs Preparation & Pricing
  activeMainTab: 'results' | 'preparation' = 'results';

  // Dismissed alert IDs
  dismissedAlerts: Set<string> = new Set();

  // Plan tabs - active tab index
  activePlanIndex: number = 0;

  // Formula Builder Modal
  showFormulaBuilderModal = false;
  formulaBuilderTargetRow: { planIndex: number; testIndex: number; paramIndex: number } | null = null;
  formulaExpression = '';
  formulaCursorPos = 0;
  formulaAvailableParams: { parameterID: number; parameterName: string; unit: string; ref: string }[] = [];
  formulaOperators = ['+', '-', '*', '/', '(', ')'];
  formulaFunctions = ['MEAN', 'MAX', 'MIN', 'SUM', 'COUNT', 'STDEV'];

  // Environment info panel visibility per headerId
  envInfoVisible: { [key: string]: boolean } = {};

  // Store API metadata for save/complete
  apiMetadata: any = {
    generalTests: [],
    chemicalTests: []
  };

  // ================================================================
  // Move to Long-Term Test
  // ================================================================
  showMoveToLongTermModal = false;
  moveToLongTermForm!: FormGroup;
  selectedTestForLongTerm: { planIndex: number; testIndex: number } | null = null;

  // ================================================================
  // Phase 2A: Enhanced Test Execution
  // ================================================================
  // Environment info per headerId
  environmentMap: Record<number, { roomTemperature?: number; roomHumidity?: number; labRoomName?: string }> = {};
  // Equipment selection per headerId
  selectedEquipmentMap: Record<number, any[]> = {};
  // Test timing info per headerId (from API response)
  testTimingMap: Record<number, { testStartTime?: string; testEndTime?: string; performedByName?: string }> = {};

  // Add Standalone Parameter Modal
  showStandaloneParamModal = false;
  standaloneParamForm!: FormGroup;
  standaloneParamHeaderId: number = 0;
  standaloneParamPlanIndex: number = 0;
  standaloneParamTestIndex: number = 0;

  // Phase 2B: Price Calculation
  priceSummaryMap: Record<number, any> = {};
  priceBreakdownMap: Record<number, any[]> = {};
  priceLoadingMap: Record<number, boolean> = {};
  showPriceOverrideModal = false;
  priceOverrideHeaderId: number = 0;
  priceOverrideAmount: number | null = null;
  priceOverrideReason: string = '';

  // ================================================================
  // Phase 1-2: NABL Scope + Uncertainty
  // ================================================================
  nablScopeMap: Record<number, any[]> = {};
  uncertaintyMap: Record<number, any[]> = {};
  orientationWarnings: Record<number, any> = {};
  orientationDeviationAcknowledged: Record<number, boolean> = {};

  // ================================================================
  // Phase 4: Machine Data Integration
  // ================================================================
  machineDataLoading: Record<number, boolean> = {};

  // ================================================================
  // Phase 5: Preparation Status + Verification
  // ================================================================
  preparationStatus: any = null;
  isPreparationRequired = false;
  isPreparationRecorded = false;
  isVerificationMode = false;

  // ================================================================
  // Phase 6: Unified Price Summary
  // ================================================================
  unifiedPriceSummary: any = null;
  unifiedPriceLoading = false;

  // ================================================================
  // Machining Charge Line Items
  // ================================================================
  machiningItems: any[] = [];
  machiningLoading = false;
  newMachiningDesc = '';
  newMachiningAmount: number | null = null;
  newMachiningRemark = '';

  // Add Parameter From Method Modal
  showFromMethodModal = false;
  fromMethodForm!: FormGroup;
  fromMethodHeaderId: number = 0;
  fromMethodPlanIndex: number = 0;
  fromMethodTestIndex: number = 0;
  methodParameters: any[] = [];
  loadingMethodParams = false;

  constructor(
    private fb: FormBuilder,
    private testResultService: TestResultService,
    private parameterService: ParameterService,
    private equipmentService: EquipmentService,
    private testMethodService: TestMethodSpecificationService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.sampleId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };
    if (state) {
      if (state.mode === 'view') {
        this.isViewMode = true;
      }
    }
    this.loadDummyData();
    this.buildForm();
    this.buildMoveToLongTermForm();
    this.buildStandaloneParamForm();
    this.buildFromMethodForm();
    if(this.sampleId)
      this.loadFullResultPayload(this.sampleId); // Sample ID
  }

  private buildMoveToLongTermForm(): void {
    this.moveToLongTermForm = this.fb.group({
      durationHours: ['', [Validators.required, Validators.min(1), Validators.max(10000)]]
    });
  }

  openMoveToLongTermModal(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    if (test.status !== 'Started' && test.status !== 'In Progress' && test.status !== 'Completed') {
      this.toastService.show('Test must be started or in progress before moving to long-term tracking', 'warning');
      return;
    }
    this.selectedTestForLongTerm = { planIndex, testIndex };
    this.moveToLongTermForm.reset();
    this.showMoveToLongTermModal = true;
  }

  closeMoveToLongTermModal(): void {
    this.showMoveToLongTermModal = false;
    this.selectedTestForLongTerm = null;
    this.moveToLongTermForm.reset();
  }

  submitMoveToLongTerm(): void {
    if (!this.moveToLongTermForm.valid || !this.selectedTestForLongTerm) {
      this.toastService.show('Please enter valid duration hours', 'warning');
      return;
    }

    const { planIndex, testIndex } = this.selectedTestForLongTerm;
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;
    const durationHours = this.moveToLongTermForm.get('durationHours')?.value;

    console.log('Moving test to long-term:', { headerId, durationHours });

    this.testResultService.moveToLongTerm(headerId, durationHours).subscribe({
      next: (response) => {
        this.toastService.show('Test moved to long-term tracking successfully', 'success');
        this.closeMoveToLongTermModal();
        // Refresh the test status
        test.status = 'Long-Term';
      },
      error: (error) => {
        console.error('Error moving test to long-term:', error);
        this.toastService.show('Error moving test to long-term tracking', 'error');
      }
    });
  }

  loadFullResultPayload(sampleId: number): void {
    if (!sampleId) {
      console.warn('[TestResultEntry] No sample ID provided');
      this.toastService.show('Sample ID is required', 'warning');
      return;
    }

    this.testResultService.getFullResultPayload(sampleId).subscribe({
      next: (data) => {
        if (!data) {
          console.warn('[TestResultEntry] Empty payload received from API');
          this.toastService.show('No test result data found', 'warning');
          return;
        }

        console.log("Full Result Payload:", data);

        // Validate critical fields
        if (!data.inward) {
          console.warn('[TestResultEntry] Missing inward data in payload');
        }
        if (!data.sample) {
          console.warn('[TestResultEntry] Missing sample data in payload');
        }
        if (!data.plans || data.plans.length === 0) {
          console.warn('[TestResultEntry] No test plans found in payload');
        }

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
        // Fetch images for all test headers so thumbnails are available in UI
        try {
          const headerSet = new Set<number>();
          (this.plans || []).forEach((plan: any) => {
            (plan.tests || []).forEach((t: any) => {
              if (t && (t.headerId || t.headerId === 0)) headerSet.add(t.headerId);
            });
          });
          headerSet.forEach(hId => {
            this.fetchTestImages(hId);
            this.fetchPriceSummary(hId);
            this.loadNablScopeCheck(hId);
            this.loadUncertainty(hId);
            this.loadOrientationCheck(hId);
          });
        } catch (e) {
          console.warn('Failed to fetch initial test images', e);
        }
        // Load preparation status + unified price + machining items
        this.loadPreparationStatus(sampleId);
        this.loadUnifiedPriceSummary(sampleId);
        this.loadMachiningItems(sampleId);
      },
      error: (error) => {
        console.error("Error fetching full result payload:", error);
        this.toastService.show('Failed to load test result data. Please try again.', 'error');
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
              status: generalTest.status || 'Pending',
              parameters: (generalTest.parameters || []).map((param: any) => ({
                id: param.id,
                parameterID: param.parameterID || null,
                parameterName: param.parameterName || '',
                unit: param.unit || '',
                value: param.value ?? null,
                remarks: param.remarks ?? '',
                minValue: param.minValue ?? null,
                maxValue: param.maxValue ?? null,
                isWithinLimit: param.isWithinLimit ?? null,
                formulaExpression: param.formulaExpression || '',
                specMinValue: param.specMinValue ?? null,
                specMaxValue: param.specMaxValue ?? null,
                acceptanceCriteria: param.acceptanceCriteria || '',
                isStandalone: param.isStandalone || false,
                sourceTestMethodId: param.sourceTestMethodId ?? null,
                resultStatus: param.resultStatus || null,
                parameterType: param.parameterType || '',
                testMethodUsed: param.testMethodUsed || ''
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
              name: chemicalTest.laboratoryTest || 'Chemical Test',
              reportNo: chemicalTest.reportNo || `Auto-${chemicalTest.headerId}`,
              status: chemicalTest.status || 'Pending',
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
                altered: param.altered || false,
                formulaExpression: param.formulaExpression || '',
                specMinValue: param.specMinValue ?? null,
                specMaxValue: param.specMaxValue ?? null,
                acceptanceCriteria: param.acceptanceCriteria || '',
                isStandalone: param.isStandalone || false,
                sourceTestMethodId: param.sourceTestMethodId ?? null,
                resultStatus: param.resultStatus || null,
                parameterType: param.parameterType || '',
                testMethodUsed: param.testMethodUsed || ''
              }))
            }
          ]
        };

        this.plans.push(chemPlan);
      });
    });

    // Store timing/environment info per header and fetch environment data
    (apiData.plans || []).forEach((plan: any) => {
      const allTests = [...(plan.generalTests || []), ...(plan.chemicalTests || [])];
      allTests.forEach((test: any) => {
        if (test.headerId) {
          this.testTimingMap[test.headerId] = {
            testStartTime: test.testStartTime || '',
            testEndTime: test.testEndTime || '',
            performedByName: test.performedByName || ''
          };
          // Parse equipment IDs if available
          if (test.equipmentIdsJson) {
            try {
              this.selectedEquipmentMap[test.headerId] = JSON.parse(test.equipmentIdsJson);
            } catch (e) {
              this.selectedEquipmentMap[test.headerId] = [];
            }
          }
          // Fetch environment data
          this.fetchEnvironmentData(test.headerId);
        }
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
      altered: [p.altered || false],
      formulaExpression: [p.formulaExpression || ''],
      specMinValue: [p.specMinValue ?? null],
      specMaxValue: [p.specMaxValue ?? null],
      acceptanceCriteria: [p.acceptanceCriteria || ''],
      isStandalone: [p.isStandalone || false],
      sourceTestMethodId: [p.sourceTestMethodId ?? null],
      resultStatus: [p.resultStatus || null],
      parameterType: [p.parameterType || ''],
      testMethodUsed: [p.testMethodUsed || '']
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
  saveResults(): void {
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
              altered: param.altered || false,
              formula: param.formulaExpression || '',
              testMethodUsed: param.testMethodUsed || ''
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
              altered: param.altered || false,
              formula: param.formulaExpression || '',
              testMethodUsed: param.testMethodUsed || ''
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

    if (min != null || max != null) {
      let pass = true;
      if (min != null && value < min) pass = false;
      if (max != null && value > max) pass = false;
      row.patchValue({ isWithinLimit: pass });
    }

    // Auto-recalculate all formula-based parameters in this test
    this.recalculateFormulas(planIndex, testIndex);
  }

  /**
   * Re-evaluate all formula-based parameters in a test when any value changes.
   * This provides on-the-fly calculation without needing a backend call.
   */
  recalculateFormulas(planIndex: number, testIndex: number): void {
    const params = this.getParameters(planIndex, testIndex);
    params.controls.forEach((row, idx) => {
      const formulaExpr = row.get('formulaExpression')?.value;
      if (!formulaExpr) return;

      const calculatedValue = this.evaluateFormula(formulaExpr, planIndex, testIndex, idx);
      if (calculatedValue !== null) {
        const currentValue = row.get('value')?.value;
        // Only update if the calculated value is different (avoid infinite loops)
        if (Number(currentValue) !== calculatedValue) {
          row.patchValue({ value: calculatedValue }, { emitEvent: false });

          // Update isWithinLimit for the formula-calculated parameter
          const min = row.get('minValue')?.value;
          const max = row.get('maxValue')?.value;
          if (min != null || max != null) {
            let pass = true;
            if (min != null && calculatedValue < min) pass = false;
            if (max != null && calculatedValue > max) pass = false;
            row.patchValue({ isWithinLimit: pass }, { emitEvent: false });
          }
        }
      }
    });
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

    const value = Number(row.get('value')?.value);
    const min = row.get('minValue')?.value;
    const max = row.get('maxValue')?.value;

    let pass = true;
    if (min != null && value < min) pass = false;
    if (max != null && value > max) pass = false;

    row.patchValue({
      parameterID: selectedItem.id,
      parameterName: selectedItem.name,
      unit: selectedItem.unit || unit,
      minValue: planType === 'Chemical' ? (row.value.minValue ?? 0) : null ,
      maxValue: planType === 'Chemical' ? (row.value.maxValue ?? 0) : null,
      isWithinLimit: pass,
    });
  }

  // ================================================================
  // Test Start / Complete Flow
  // ================================================================
  startTest(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    this.testResultService.startTest(headerId).subscribe({
      next: (response) => {
        test.status = 'Started';
        this.toastService.show('Test started successfully', 'success');
        // Capture timing from response or refresh from API
        if (response?.testStartTime) {
          this.testTimingMap[headerId] = {
            ...this.testTimingMap[headerId],
            testStartTime: response.testStartTime,
            performedByName: response.performedByName || this.testTimingMap[headerId]?.performedByName
          };
        } else {
          // Refresh timing from environment endpoint
          this.fetchEnvironmentData(headerId);
        }
        // Show preparation warning if returned by backend
        if (response?.preparationWarning) {
          this.toastService.show(
            response.warningMessage || 'Sample preparation data is not yet entered in the system.',
            'warning'
          );
        }
      },
      error: (error) => {
        console.error('Error starting test:', error);
        this.toastService.show('Error starting test', 'error');
      }
    });
  }

  completeTest(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    if (confirm('Are you sure you want to complete this test?')) {
      this.testResultService.completeTest(headerId).subscribe({
        next: (response) => {
          test.status = 'Completed';
          this.toastService.show('Test completed successfully', 'success');
          // Capture timing from response or refresh from API
          if (response?.testEndTime) {
            this.testTimingMap[headerId] = {
              ...this.testTimingMap[headerId],
              testEndTime: response.testEndTime,
              performedByName: response.performedByName || this.testTimingMap[headerId]?.performedByName
            };
          } else {
            // Refresh timing from environment endpoint
            this.fetchEnvironmentData(headerId);
          }
        },
        error: (error) => {
          console.error('Error completing test:', error);
          this.toastService.show('Error completing test', 'error');
        }
      });
    }
  }

  // ================================================================
  // Auto-Focus & Keyboard Navigation
  // ================================================================
  /**
   * Handle Enter key in parameter value input
   * Auto-focus to next parameter row or add new if on last
   */
  onParameterKeyDown(event: KeyboardEvent, planIndex: number, testIndex: number, paramIndex: number): void {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const parametersArray = this.getParameters(planIndex, testIndex);
    const nextParamIndex = paramIndex + 1;

    if (nextParamIndex < parametersArray.length) {
      // Focus next parameter's value input
      setTimeout(() => {
        const nextValueInput = document.querySelector(
          `[data-param-input="${planIndex}-${testIndex}-${nextParamIndex}"]`
        ) as HTMLInputElement;
        if (nextValueInput) {
          nextValueInput.focus();
        }
      }, 0);
    } else {
      // Auto-add new parameter row if on last and it's not empty
      const currentValue = parametersArray.at(paramIndex).get('value')?.value;
      if (currentValue !== null && currentValue !== '') {
        this.addParameter(planIndex, testIndex);
        setTimeout(() => {
          const newInput = document.querySelector(
            `[data-param-input="${planIndex}-${testIndex}-${nextParamIndex}"]`
          ) as HTMLInputElement;
          if (newInput) {
            newInput.focus();
          }
        }, 100);
      }
    }
  }

  /**
   * Check if parameter is calculated (disabled for editing)
   */
  isParameterCalculated(param: any): boolean {
    // Check if parameter has isCalculated flag or is marked as read-only
    return param?.isCalculated === true || param?.isReadOnly === true;
  }

  /**
   * Get CSS classes for parameter row based on state
   */
  getParameterRowClass(param: any): string {
    const classes: string[] = [];

    if (this.isValueOutOfRange(param)) {
      classes.push('row-error');
    } else if (this.isValueWithinRange(param)) {
      classes.push('row-ok');
    }

    if (this.isParameterCalculated(param)) {
      classes.push('row-calculated');
    }

    return classes.join(' ');
  }

  /**
   * Inline update parameter via API
   */
  updateParameterInline(planIndex: number, testIndex: number, paramIndex: number): void {
    const param = this.getParameters(planIndex, testIndex).at(paramIndex).value;
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    if (!param.parameterID) {
      this.toastService.show('Parameter not selected', 'warning');
      return;
    }

    console.log('Updating parameter inline:', { headerId, paramId: param.id, parameterID: param.parameterID });

    this.testResultService.updateParameter(headerId, param.parameterID, param).subscribe({
      next: (response) => {
        this.toastService.show('Parameter updated successfully', 'success');
      },
      error: (error) => {
        console.error('Error updating parameter:', error);
        this.toastService.show('Error updating parameter', 'error');
      }
    });
  }

  // ================================================================
  // Test Images - UI state, preview, upload and fetch
  // ================================================================
  // Map of headerId -> array of existing images fetched from API
  testImagesMap: Record<number, any[]> = {};

  // Map of headerId -> selected files w/ captions & previews before upload
  selectedFilesMap: Record<number, { file: File; caption: string; preview: string }[]> = {};

  /**
   * Determine if a TestResultHeader (identified by headerId) is completed.
   * We approximate header status by checking if all tests sharing the headerId are Completed.
   */
  isHeaderCompleted(headerId: number): boolean {
    if (!headerId && headerId !== 0) return false;
    const relatedTests = this.plans.flatMap(p => p.tests || []).filter((t: any) => t.headerId === headerId);
    if (!relatedTests || relatedTests.length === 0) return false;
    return relatedTests.every((t: any) => t.status === 'Completed');
  }

  /** Handle file selection for a particular headerId */
  onFilesSelected(event: Event, headerId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input || !input.files) return;

    const files = Array.from(input.files);
    if (!this.selectedFilesMap[headerId]) this.selectedFilesMap[headerId] = [];

    files.forEach(file => {
      const preview = URL.createObjectURL(file);
      this.selectedFilesMap[headerId].push({ file, caption: '', preview });
    });

    // reset the input so the same file can be re-selected if needed
    input.value = '';
  }

  updateCaption(headerId: number, idx: number, value: string): void {
    const arr = this.selectedFilesMap[headerId] || [];
    if (arr[idx]) arr[idx].caption = value || '';
  }

  /** Upload selected files for a header */
  uploadSelectedFiles(headerId: number): void {
    const selected = this.selectedFilesMap[headerId] || [];
    if (!selected.length) {
      this.toastService.show('Please select files to upload', 'warning');
      return;
    }

    const files = selected.map(s => s.file);
    const captions = selected.map(s => s.caption || '');

    // Call service (uses FormData internally)
    this.testResultService.uploadTestImages(headerId, files, captions).subscribe({
      next: (resp) => {
        this.toastService.show('Images uploaded successfully', 'success');
        // clear selected files for this header and refresh list
        this.clearSelectedPreviews(headerId);
        // this.fetchTestImages(headerId);
        this.loadFullResultPayload(this.sampleId) // in case image info needed in payload
      },
      error: (err) => {
        console.error('Image upload failed:', err);
        this.toastService.show('Failed to upload images', 'error');
      }
    });
  }

  /** Clear selected previews and revoke object URLs */
  private clearSelectedPreviews(headerId: number): void {
    const arr = this.selectedFilesMap[headerId] || [];
    arr.forEach(a => {
      try { URL.revokeObjectURL(a.preview); } catch (e) {}
    });
    this.selectedFilesMap[headerId] = [];
  }

  /** Fetch images from API for a header and store in map */
  fetchTestImages(headerId: number): void {
    if (!headerId && headerId !== 0) return;
    this.testResultService.getTestImages(headerId).subscribe({
      next: (imgs) => {
        this.testImagesMap[headerId] = imgs || [];
      },
      error: (err) => {
        console.error('Failed to fetch test images:', err);
        this.testImagesMap[headerId] = [];
      }
    });
  }

  /** Utility: open full image in new tab */
  openImage(imgUrl: string): void {
    if (!imgUrl) return;
    window.open(this.baseUrl+imgUrl, '_blank');
  }
  cancel(): void {
    this.router.navigate(['/testing/dashboard']);
  }

  // ================================================================
  // Phase 2A: Environment Data
  // ================================================================
  fetchEnvironmentData(headerId: number): void {
    if (!headerId) return;
    this.testResultService.getEnvironmentAtTime(headerId).subscribe({
      next: (env) => {
        this.environmentMap[headerId] = {
          roomTemperature: env.roomTemperature ?? env.temperature,
          roomHumidity: env.roomHumidity ?? env.humidity,
          labRoomName: env.labRoomName || env.roomName || ''
        };
      },
      error: () => {
        this.environmentMap[headerId] = {};
      }
    });
  }

  // ================================================================
  // Phase 2A: Auto-Calculate Parameters
  // ================================================================
  calculateParameters(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    if (!headerId) {
      this.toastService.show('No header ID available for calculation', 'warning');
      return;
    }

    this.testResultService.calculateParameters(headerId).subscribe({
      next: (response) => {
        this.toastService.show('Parameters calculated successfully', 'success');
        // Refresh the full payload to get updated calculated values
        this.loadFullResultPayload(this.sampleId);
      },
      error: (error) => {
        console.error('Error calculating parameters:', error);
        this.toastService.show(error?.error?.message || 'Error calculating parameters', 'error');
      }
    });
  }

  // ================================================================
  // Phase 2A: Equipment Dropdown
  // ================================================================
  getEquipmentDropdown = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.equipmentService.getEquipmentDropdown(term, page, pageSize);

  onEquipmentSelected(headerId: number, selectedItem: any): void {
    if (!this.selectedEquipmentMap[headerId]) {
      this.selectedEquipmentMap[headerId] = [];
    }
    // Avoid duplicates
    if (!this.selectedEquipmentMap[headerId].find((e: any) => e.id === selectedItem.id)) {
      this.selectedEquipmentMap[headerId].push({ id: selectedItem.id, name: selectedItem.name });
    }
  }

  removeEquipment(headerId: number, equipmentId: number): void {
    if (this.selectedEquipmentMap[headerId]) {
      this.selectedEquipmentMap[headerId] = this.selectedEquipmentMap[headerId].filter((e: any) => e.id !== equipmentId);
    }
  }

  // ================================================================
  // Phase 2A: Standalone Parameter Modal
  // ================================================================
  private buildStandaloneParamForm(): void {
    this.standaloneParamForm = this.fb.group({
      parameterName: ['', Validators.required],
      unit: ['', Validators.required],
      formulaExpression: [''],
      specMinValue: [null],
      specMaxValue: [null]
    });
  }

  openStandaloneParamModal(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    this.standaloneParamHeaderId = test.headerId;
    this.standaloneParamPlanIndex = planIndex;
    this.standaloneParamTestIndex = testIndex;
    this.standaloneParamForm.reset();
    this.showStandaloneParamModal = true;
  }

  closeStandaloneParamModal(): void {
    this.showStandaloneParamModal = false;
    this.standaloneParamForm.reset();
  }

  submitStandaloneParam(): void {
    if (!this.standaloneParamForm.valid) {
      this.toastService.show('Please fill required fields', 'warning');
      return;
    }

    const dto = this.standaloneParamForm.value;
    this.testResultService.addStandaloneParameter(this.standaloneParamHeaderId, dto).subscribe({
      next: (response) => {
        this.toastService.show('Standalone parameter added successfully', 'success');
        this.closeStandaloneParamModal();
        // Refresh to get the new parameter
        this.loadFullResultPayload(this.sampleId);
      },
      error: (error) => {
        console.error('Error adding standalone parameter:', error);
        this.toastService.show(error?.error?.message || 'Error adding standalone parameter', 'error');
      }
    });
  }

  // ================================================================
  // Phase 2A: Add Parameter From Method Modal
  // ================================================================
  private buildFromMethodForm(): void {
    this.fromMethodForm = this.fb.group({
      testMethodId: [null, Validators.required],
      parameterID: [null, Validators.required]
    });
  }

  getTestMethodDropdown = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodService.getTestMethodSpecificationDropdown(term, page, pageSize);

  openFromMethodModal(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    this.fromMethodHeaderId = test.headerId;
    this.fromMethodPlanIndex = planIndex;
    this.fromMethodTestIndex = testIndex;
    this.fromMethodForm.reset();
    this.methodParameters = [];
    this.showFromMethodModal = true;
  }

  closeFromMethodModal(): void {
    this.showFromMethodModal = false;
    this.fromMethodForm.reset();
    this.methodParameters = [];
  }

  onTestMethodSelected(selectedItem: any): void {
    this.fromMethodForm.patchValue({ testMethodId: selectedItem.id, parameterID: null });
    this.methodParameters = [];
    this.loadingMethodParams = true;

    // Load parameters for the selected test method
    this.testMethodService.getTestMethodSpecificationById(selectedItem.id).subscribe({
      next: (method) => {
        this.methodParameters = method.parameters || method.testParameters || [];
        this.loadingMethodParams = false;
      },
      error: () => {
        this.methodParameters = [];
        this.loadingMethodParams = false;
        this.toastService.show('Failed to load method parameters', 'error');
      }
    });
  }

  selectMethodParameter(param: any): void {
    this.fromMethodForm.patchValue({ parameterID: param.id || param.parameterId });
  }

  submitFromMethod(): void {
    if (!this.fromMethodForm.valid) {
      this.toastService.show('Please select a test method and parameter', 'warning');
      return;
    }

    const dto = this.fromMethodForm.value;
    this.testResultService.addParameterFromMethod(this.fromMethodHeaderId, dto).subscribe({
      next: (response) => {
        this.toastService.show('Parameter added from test method successfully', 'success');
        this.closeFromMethodModal();
        // Refresh to get the new parameter
        this.loadFullResultPayload(this.sampleId);
      },
      error: (error) => {
        console.error('Error adding parameter from method:', error);
        this.toastService.show(error?.error?.message || 'Error adding parameter from method', 'error');
      }
    });
  }

  // ================================================================
  // Phase 2A: Result Status Helpers
  // ================================================================
  getResultStatusClass(status: string | null): string {
    switch (status) {
      case 'Pass': return 'badge-pass';
      case 'Fail': return 'badge-fail';
      case 'Marginal': return 'badge-warn';
      default: return 'badge-pending';
    }
  }

  getResultStatusIcon(status: string | null): string {
    switch (status) {
      case 'Pass': return 'bi-check-circle';
      case 'Fail': return 'bi-x-circle';
      case 'Marginal': return 'bi-exclamation-triangle';
      default: return 'bi-dash-circle';
    }
  }

  formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString();
    } catch {
      return dateStr;
    }
  }

  // ================================================================
  // Environment Info Panel Toggle
  // ================================================================
  toggleEnvInfo(headerId: number | string): void {
    const key = String(headerId);
    this.envInfoVisible[key] = !this.envInfoVisible[key];
  }

  // ================================================================
  // Test Card Status CSS Class
  // ================================================================
  getTestCardClass(status: string): string {
    switch (status) {
      case 'Pending': return 'test-card--pending';
      case 'Started':
      case 'In Progress': return 'test-card--started';
      case 'Completed': return 'test-card--completed';
      case 'Long-Term': return 'test-card--longterm';
      case 'Verified': return 'test-card--verified';
      default: return 'test-card--pending';
    }
  }

  // ================================================================
  // Phase 2B: Price Calculation
  // ================================================================
  calculateTestPrice(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    if (headerId == null || headerId <= 0) {
      this.toastService.show('No header ID available for price calculation', 'warning');
      return;
    }

    this.priceLoadingMap[headerId] = true;

    this.testResultService.calculatePrice(headerId).subscribe({
      next: (summary) => {
        this.priceSummaryMap[headerId] = summary;
        this.priceBreakdownMap[headerId] = summary.breakdown || [];
        this.priceLoadingMap[headerId] = false;
        if (summary.message) {
          this.toastService.show(summary.message, 'warning');
        } else {
          this.toastService.show('Price calculated successfully', 'success');
        }
      },
      error: (error) => {
        console.error('Error calculating price:', error);
        this.priceLoadingMap[headerId] = false;
        this.toastService.show(error?.error?.message || 'Error calculating price', 'error');
      }
    });
  }

  fetchPriceSummary(headerId: number): void {
    if (headerId == null || headerId <= 0) return;
    this.testResultService.getPriceSummary(headerId).subscribe({
      next: (summary) => {
        this.priceSummaryMap[headerId] = summary;
        this.priceBreakdownMap[headerId] = summary.breakdown || [];
      },
      error: () => {
        // No price data yet — that's fine
      }
    });
  }

  openPriceOverrideModal(headerId: number): void {
    this.priceOverrideHeaderId = headerId;
    this.priceOverrideAmount = null;
    this.priceOverrideReason = '';
    this.showPriceOverrideModal = true;
  }

  closePriceOverrideModal(): void {
    this.showPriceOverrideModal = false;
    this.priceOverrideHeaderId = 0;
    this.priceOverrideAmount = null;
    this.priceOverrideReason = '';
  }

  submitPriceOverride(): void {
    if (!this.priceOverrideAmount || this.priceOverrideAmount <= 0) {
      this.toastService.show('Please enter a valid override amount', 'warning');
      return;
    }
    if (!this.priceOverrideReason.trim()) {
      this.toastService.show('Please provide a reason for overriding', 'warning');
      return;
    }

    const headerId = this.priceOverrideHeaderId;
    this.testResultService.overridePrice(headerId, {
      amount: this.priceOverrideAmount,
      reason: this.priceOverrideReason.trim()
    }).subscribe({
      next: (summary) => {
        this.priceSummaryMap[headerId] = summary;
        this.priceBreakdownMap[headerId] = summary.breakdown || [];
        this.closePriceOverrideModal();
        this.toastService.show('Price overridden successfully', 'success');
      },
      error: (error) => {
        console.error('Error overriding price:', error);
        this.toastService.show(error?.error?.message || 'Error overriding price', 'error');
      }
    });
  }

  // ================================================================
  // Phase 1: NABL Scope Check
  // ================================================================
  loadNablScopeCheck(headerId: number): void {
    this.testResultService.getNablScopeCheck(headerId).subscribe({
      next: (results) => {
        this.nablScopeMap[headerId] = results;
      },
      error: (err) => console.error('NABL scope check error:', err),
    });
  }

  getNablStatus(headerId: number, parameterId: number): any {
    const results = this.nablScopeMap[headerId];
    if (!results) return null;
    return results.find((r: any) => r.parameterId === parameterId);
  }

  nablScopeAcknowledged: Record<number, boolean> = {};

  getNablScopeSummary(headerId: number): { allInScope: boolean; outOfScopeCount: number; totalChecked: number } {
    const results = this.nablScopeMap[headerId];
    if (!results || results.length === 0) return { allInScope: true, outOfScopeCount: 0, totalChecked: 0 };
    const outOfScope = results.filter((r: any) => r.scopeStatus === 'OutsideScope');
    return {
      allInScope: outOfScope.length === 0,
      outOfScopeCount: outOfScope.length,
      totalChecked: results.length,
    };
  }

  hasOutOfScopeParams(headerId: number): boolean {
    return this.getNablScopeSummary(headerId).outOfScopeCount > 0;
  }

  // ================================================================
  // Orientation Mismatch Check
  // ================================================================
  loadOrientationCheck(headerId: number): void {
    this.testResultService.checkOrientationMismatch(headerId).subscribe({
      next: (result) => {
        this.orientationWarnings[headerId] = result;
      },
      error: (err) => console.error('Orientation check error:', err),
    });
  }

  getOrientationWarning(headerId: number, parameterId: number): any {
    const result = this.orientationWarnings[headerId];
    if (!result?.warnings) return null;
    return result.warnings.find((w: any) => w.parameterId === parameterId);
  }

  hasOrientationMismatches(headerId: number): boolean {
    return this.orientationWarnings[headerId]?.hasMismatches === true;
  }

  // ================================================================
  // Phase 2: Uncertainty
  // ================================================================
  loadUncertainty(headerId: number): void {
    this.testResultService.getUncertainty(headerId).subscribe({
      next: (results) => {
        this.uncertaintyMap[headerId] = results;
      },
      error: (err) => console.error('Uncertainty load error:', err),
    });
  }

  getUncertainty(headerId: number, parameterId: number): any {
    const results = this.uncertaintyMap[headerId];
    if (!results) return null;
    return results.find((r: any) => r.parameterId === parameterId);
  }

  // ================================================================
  // Phase 4: Machine Data Fetch
  // ================================================================
  fetchMachineData(headerId: number, equipmentId: number): void {
    this.machineDataLoading[headerId] = true;
    const dto = { testResultHeaderId: headerId, equipmentId };
    this.testResultService.fetchMachineData(dto).subscribe({
      next: (result) => {
        this.machineDataLoading[headerId] = false;
        this.toastService.show(
          `Machine data: ${result.matchedCount} matched, ${result.unmatchedCount} unmatched`,
          result.unmatchedCount > 0 ? 'warning' : 'success'
        );
        // Reload the test data to reflect updated values
        this.loadFullResultPayload(this.sampleId);
        this.loadNablScopeCheck(headerId);
      },
      error: (err) => {
        this.machineDataLoading[headerId] = false;
        console.error('Machine data fetch error:', err);
        this.toastService.show(err?.error?.message || 'Failed to fetch machine data', 'error');
      },
    });
  }

  // ================================================================
  // Phase 5: Preparation Status
  // ================================================================
  loadPreparationStatus(sampleId: number): void {
    this.testResultService.getPreparationStatus(sampleId).subscribe({
      next: (data) => {
        this.preparationStatus = data;
        this.isPreparationRequired = data.preparationRequired;
        this.isPreparationRecorded = data.preparationRecorded;
      },
      error: (err) => console.error('Preparation status error:', err),
    });
  }

  openPreparationForm(): void {
    const url = this.preparationStatus?.cuttingEditUrl || '/sample/cutting';
    window.open(url, '_blank');
  }

  refreshPreparationData(): void {
    if (this.sampleId) {
      this.loadPreparationStatus(this.sampleId);
      this.loadUnifiedPriceSummary(this.sampleId);
    }
  }

  // ================================================================
  // Phase 6: Unified Price Summary
  // ================================================================
  loadUnifiedPriceSummary(sampleId: number): void {
    this.unifiedPriceLoading = true;
    this.testResultService.getUnifiedPriceSummary(sampleId).subscribe({
      next: (data) => {
        this.unifiedPriceSummary = data;
        this.unifiedPriceLoading = false;
      },
      error: (err) => {
        this.unifiedPriceLoading = false;
        console.error('Unified price summary error:', err);
      },
    });
  }

  // ================================================================
  // Machining Charge Line Items
  // ================================================================
  loadMachiningItems(sampleId: number): void {
    this.machiningLoading = true;
    this.testResultService.getMachiningItems(sampleId).subscribe({
      next: (data) => {
        this.machiningItems = data;
        this.machiningLoading = false;
      },
      error: (err) => {
        this.machiningLoading = false;
        console.error('Machining items error:', err);
      },
    });
  }

  addMachiningLine(): void {
    if (!this.newMachiningDesc?.trim() || !this.newMachiningAmount) return;
    this.testResultService.addMachiningItem(this.sampleId, {
      description: this.newMachiningDesc.trim(),
      amount: this.newMachiningAmount,
      remark: this.newMachiningRemark?.trim() || undefined,
    }).subscribe({
      next: () => {
        this.newMachiningDesc = '';
        this.newMachiningAmount = null;
        this.newMachiningRemark = '';
        this.loadMachiningItems(this.sampleId);
        this.loadUnifiedPriceSummary(this.sampleId);
        this.loadPreparationStatus(this.sampleId);
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to add machining item', 'error'),
    });
  }

  deleteMachiningItem(itemId: number): void {
    if (!confirm('Delete this machining charge?')) return;
    this.testResultService.deleteMachiningItem(itemId).subscribe({
      next: () => {
        this.loadMachiningItems(this.sampleId);
        this.loadUnifiedPriceSummary(this.sampleId);
        this.loadPreparationStatus(this.sampleId);
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to delete machining item', 'error'),
    });
  }

  get machiningSubtotal(): number {
    return this.machiningItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  }

  // ================================================================
  // Alert Banners — Failed / Marginal Parameters
  // ================================================================
  get parameterAlerts(): { id: string; type: 'fail' | 'warn'; title: string; message: string }[] {
    const alerts: { id: string; type: 'fail' | 'warn'; title: string; message: string }[] = [];
    this.plans.forEach((plan, pIdx) => {
      (plan.tests || []).forEach((test: any, tIdx: number) => {
        (test.parameters || []).forEach((param: any) => {
          const alertId = `${pIdx}-${tIdx}-${param.parameterID || param.id}`;
          if (this.dismissedAlerts.has(alertId)) return;
          if (param.resultStatus === 'Fail' || (param.isWithinLimit === false && param.value != null)) {
            alerts.push({
              id: alertId,
              type: 'fail',
              title: `${param.parameterName} — FAILED`,
              message: `Value ${param.value} ${param.unit || ''} is outside specification range`
            });
          } else if (param.resultStatus === 'Marginal') {
            alerts.push({
              id: alertId,
              type: 'warn',
              title: `${param.parameterName} — MARGINAL`,
              message: `Value ${param.value} ${param.unit || ''} is near specification limit`
            });
          }
        });
      });
    });
    return alerts;
  }

  dismissAlert(alertId: string): void {
    this.dismissedAlerts.add(alertId);
  }

  getOverallStatus(): string {
    const allTests = this.plans.flatMap(p => p.tests || []);
    if (allTests.every((t: any) => t.status === 'Completed')) return 'Completed';
    if (allTests.some((t: any) => t.status === 'Started' || t.status === 'In Progress')) return 'In Progress';
    return 'Pending';
  }

  // ================================================================
  // Formula Builder Modal
  // ================================================================
  openFormulaBuilder(planIndex: number, testIndex: number, paramIndex: number): void {
    this.formulaBuilderTargetRow = { planIndex, testIndex, paramIndex };
    const paramRow = this.getParameters(planIndex, testIndex).at(paramIndex);
    this.formulaExpression = paramRow?.get('formulaExpression')?.value || '';
    this.formulaCursorPos = this.formulaExpression.length;

    // Build available params list (excluding current row)
    const params = this.getParameters(planIndex, testIndex);
    this.formulaAvailableParams = [];
    params.controls.forEach((row, idx) => {
      if (idx === paramIndex) return;
      const v = row.value;
      if (v.parameterID) {
        this.formulaAvailableParams.push({
          parameterID: v.parameterID,
          parameterName: v.parameterName || `Param ${v.parameterID}`,
          unit: v.unit || '',
          ref: `P${v.parameterID}`
        });
      }
    });
    this.showFormulaBuilderModal = true;
  }

  insertFormulaToken(token: string): void {
    const before = this.formulaExpression.slice(0, this.formulaCursorPos);
    const after = this.formulaExpression.slice(this.formulaCursorPos);
    const needsSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('(');
    this.formulaExpression = before + (needsSpace ? ' ' : '') + token + after;
    this.formulaCursorPos = this.formulaExpression.length - after.length;
  }

  insertFormulaFunction(fn: string): void {
    this.insertFormulaToken(fn + '(');
  }

  clearFormula(): void {
    this.formulaExpression = '';
    this.formulaCursorPos = 0;
  }

  applyFormula(): void {
    if (!this.formulaBuilderTargetRow) return;
    const { planIndex, testIndex, paramIndex } = this.formulaBuilderTargetRow;
    const paramRow = this.getParameters(planIndex, testIndex).at(paramIndex);
    paramRow?.patchValue({ formulaExpression: this.formulaExpression });
    this.showFormulaBuilderModal = false;

    // Evaluate formula on UI side immediately
    const calculatedValue = this.evaluateFormula(this.formulaExpression, planIndex, testIndex, paramIndex);
    if (calculatedValue !== null) {
      paramRow?.patchValue({ value: calculatedValue });
      // Also update isWithinLimit based on new value
      this.onValueChanged(planIndex, testIndex, paramIndex);
      this.toastService.show(`Formula applied — calculated value: ${calculatedValue}`, 'success');
    } else {
      this.toastService.show('Formula applied but could not evaluate — missing parameter values', 'warning');
    }
  }

  /**
   * Evaluate a formula expression on the client side using current parameter values.
   * Supports P{ID} references, basic math (+,-,*,/,(,)), and functions (MEAN, MAX, MIN, SUM, COUNT, STDEV).
   * Returns the calculated numeric value, or null if evaluation fails.
   */
  evaluateFormula(expression: string, planIndex: number, testIndex: number, excludeParamIndex: number): number | null {
    if (!expression || !expression.trim()) return null;

    try {
      const params = this.getParameters(planIndex, testIndex);
      // Build a map of P{ID} -> numeric value from all parameters in this test
      const paramValueMap: Record<string, number> = {};
      params.controls.forEach((row, idx) => {
        const v = row.value;
        if (v.parameterID && v.value != null && v.value !== '') {
          paramValueMap[`P${v.parameterID}`] = Number(v.value);
        }
      });

      let expr = expression.trim();

      // Replace aggregate functions: MEAN(...), MAX(...), MIN(...), SUM(...), COUNT(...), STDEV(...)
      expr = expr.replace(/(MEAN|MAX|MIN|SUM|COUNT|STDEV)\(([^)]+)\)/gi, (match, fn, args) => {
        const argTokens = args.split(',').map((a: string) => a.trim());
        const values: number[] = [];
        for (const token of argTokens) {
          if (paramValueMap[token] !== undefined) {
            values.push(paramValueMap[token]);
          } else if (!isNaN(Number(token))) {
            values.push(Number(token));
          } else {
            return 'NaN'; // unresolved reference
          }
        }
        if (values.length === 0) return 'NaN';

        const fnUpper = fn.toUpperCase();
        switch (fnUpper) {
          case 'MEAN': return String(values.reduce((a, b) => a + b, 0) / values.length);
          case 'MAX': return String(Math.max(...values));
          case 'MIN': return String(Math.min(...values));
          case 'SUM': return String(values.reduce((a, b) => a + b, 0));
          case 'COUNT': return String(values.length);
          case 'STDEV': {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            return String(Math.sqrt(variance));
          }
          default: return 'NaN';
        }
      });

      // Replace P{ID} references with their numeric values
      expr = expr.replace(/P(\d+)/g, (match, id) => {
        const key = `P${id}`;
        if (paramValueMap[key] !== undefined) {
          return String(paramValueMap[key]);
        }
        return 'NaN'; // unresolved reference
      });

      // Check for any unresolved references
      if (expr.includes('NaN')) return null;

      // Validate expression contains only safe characters: digits, operators, parentheses, dots, spaces
      if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;

      // Evaluate the math expression
      const result = new Function('return (' + expr + ')')();
      if (typeof result === 'number' && isFinite(result)) {
        return Math.round(result * 10000) / 10000; // round to 4 decimal places
      }
      return null;
    } catch (e) {
      console.warn('Formula evaluation error:', e);
      return null;
    }
  }

  closeFormulaBuilder(): void {
    this.showFormulaBuilderModal = false;
    this.formulaBuilderTargetRow = null;
  }

  onFormulaInputChange(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.formulaCursorPos = input.selectionStart || 0;
  }

}

