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
  cachedAlerts: { id: string; type: 'fail' | 'warn'; title: string; message: string }[] = [];

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

  // Smart formula input
  smartFormulaInput = '';
  smartFormulaMode = false;
  smartFormulaTokens: { token: string; type: 'param' | 'operator' | 'number' | 'function' | 'unknown'; matched?: string; paramRef?: string }[] = [];
  smartFormulaValid = false;
  smartFormulaErrors: string[] = [];

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

  // Smart Pricing Recommendation
  pricingRecMap: Record<number, any> = {};
  pricingRecLoading: Record<number, boolean> = {};
  showRecPanel: Record<number, boolean> = {};
  dimSizeMap: Record<number, number | null> = {};
  dimLoadMap: Record<number, number | null> = {};

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
  loadingParams: Record<number, boolean> = {};

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
    // View mode: check history.state first, then route path as fallback
    const state = history.state as { mode?: string };
    if (state?.mode === 'view' || this.route.snapshot.url.some(s => s.path === 'details')) {
      this.isViewMode = true;
    }
    // Also check query params (for verification mode)
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'view' || params['mode'] === 'verify') {
        this.isViewMode = true;
      }
    });
    this.buildForm();
    this.buildMoveToLongTermForm();
    this.buildStandaloneParamForm();
    this.buildFromMethodForm();
    if (this.sampleId) {
      this.loadFullResultPayload(this.sampleId);
    } else {
      this.loadDummyData();
      // loading handled by interceptor
    }
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
      // loading handled by interceptor
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
        this.refreshAlerts();

        // Auto-set view mode if all tests are finalized (Verified/PendingVerification)
        if (!this.canSaveAnyTest()) {
          this.isViewMode = true;
        }
      },
      error: (error) => {
        console.error("Error fetching full result payload:", error);
        this.toastService.show('Failed to load test result data. Please try again.', 'error');
        // loading handled by interceptor
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
          sequenceNo: generalTest.sequenceNo || 1,
          totalSpecimens: generalTest.totalSpecimens || 1,
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
      thickness: sampleData.thickness,
      diameter: sampleData.diameter,
      width: sampleData.width,
      length: sampleData.length,
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

        const totalSpecimens = generalTest.totalSpecimens || 1;
        const sequenceNo = generalTest.sequenceNo || 1;
        const baseName = generalTest.laboratoryTest || 'General Test';
        const testName = totalSpecimens > 1 ? `${baseName} - Specimen ${sequenceNo}` : baseName;

        const genPlan: any = {
          type: 'General',
          specification: specification,
          grade: '',
          headerId: generalTest.headerId,
          specimenLabel: totalSpecimens > 1 ? `Specimen ${sequenceNo} of ${totalSpecimens}` : null,
          tests: [
            {
              id: `gen-${generalTest.headerId}`,
              headerId: generalTest.headerId,
              name: testName,
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
                isCalculated: param.isCalculated || false,
                isStandalone: param.isStandalone || false,
                sourceTestMethodId: param.sourceTestMethodId ?? null,
                resultStatus: param.resultStatus || null,
                parameterType: param.parameterType || '',
                testMethodUsed: param.testMethodUsed || '',
                decimalPrecision: param.decimalPrecision ?? 2,
                conversionFactor: param.conversionFactor ?? 1,
                convertedValue: param.convertedValue ?? null,
                selectedUnit: param.selectedUnit || param.unit || '',
                unitOptions: param.unitOptions || [],
                isBillable: param.isBillable ?? true
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
                isCalculated: param.isCalculated || false,
                isStandalone: param.isStandalone || false,
                sourceTestMethodId: param.sourceTestMethodId ?? null,
                resultStatus: param.resultStatus || null,
                parameterType: param.parameterType || '',
                testMethodUsed: param.testMethodUsed || '',
                decimalPrecision: param.decimalPrecision ?? 2,
                conversionFactor: param.conversionFactor ?? 1,
                convertedValue: param.convertedValue ?? null,
                selectedUnit: param.selectedUnit || param.unit || '',
                unitOptions: param.unitOptions || [],
                isBillable: param.isBillable ?? true
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
      testMethodUsed: [p.testMethodUsed || ''],
      decimalPrecision: [p.decimalPrecision ?? 2],
      conversionFactor: [p.conversionFactor ?? 1],
      convertedValue: [p.convertedValue ?? null],
      selectedUnit: [p.selectedUnit || p.unit || ''],
      unitOptions: [p.unitOptions || []],
      isBillable: [p.isBillable ?? true]
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
    const paramGroup = this.getParameters(planIndex, testIndex).at(paramIndex);
    const paramId = paramGroup?.value?.id;
    const paramName = paramGroup?.value?.parameterName || `Row ${paramIndex + 1}`;

    // If parameter exists in DB (has ID), delete from backend first, then remove from UI
    if (paramId && paramId > 0) {
      if (!confirm(`Delete parameter "${paramName}"? This cannot be undone.`)) return;

      this.testResultService.deleteParameter(paramId).subscribe({
        next: () => {
          this.getParameters(planIndex, testIndex).removeAt(paramIndex);
          this.toastService.show('Parameter removed', 'success');
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to delete parameter from server', 'error');
        }
      });
    } else {
      // New unsaved parameter — just remove from UI
      this.getParameters(planIndex, testIndex).removeAt(paramIndex);
    }
  }

  loadParametersFromSpec(planIndex: number, testIndex: number): void {
    const headerId = this.plans[planIndex]?.tests[testIndex]?.headerId;
    if (!headerId) {
      this.toastService.show('Test header not found.', 'warning');
      return;
    }
    this.loadingParams[headerId] = true;
    this.testResultService.loadParametersFromSpec(headerId).subscribe({
      next: (res) => {
        this.loadingParams[headerId] = false;
        if (res.added > 0) {
          this.toastService.show(`${res.added} parameter(s) loaded from specification.`, 'success');
          // Reload full payload to refresh parameters
          this.loadFullResultPayload(this.sampleId);
        } else {
          this.toastService.show('No new parameters to load. All specification parameters already present.', 'info');
        }
        if (res.warnings?.length) {
          res.warnings.forEach((w: string) => this.toastService.show(w, 'warning'));
        }
      },
      error: (err) => {
        this.loadingParams[headerId] = false;
        this.toastService.show(err?.error?.message || 'Failed to load parameters.', 'error');
      }
    });
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
    const min = param.specMinValue ?? param.minValue;
    const max = param.specMaxValue ?? param.maxValue;
    if (min == null && max == null) return false;
    if (param.value == null) return false;
    const val = Number(param.value) * (Number(param.conversionFactor) || 1);
    if (min != null && val < Number(min)) return true;
    if (max != null && val > Number(max)) return true;
    return false;
  }

  isValueWithinRange(param: any): boolean {
    const min = param.specMinValue ?? param.minValue;
    const max = param.specMaxValue ?? param.maxValue;
    if (min == null && max == null) return false;
    if (param.value == null) return false;
    const val = Number(param.value) * (Number(param.conversionFactor) || 1);
    return (!min || val >= Number(min)) && (!max || val <= Number(max));
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
              if (param.minValue === null || param.minValue === undefined || param.minValue === '') {
                invalidParams.push(`${param.parameterName} - Min Value is required`);
              }
              if (param.maxValue === null || param.maxValue === undefined || param.maxValue === '') {
                invalidParams.push(`${param.parameterName} - Max Value is required`);
              }
              if (param.value === null || param.value === undefined || param.value === '') {
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
      const issues = this.getFormValidationErrors();
      this.toastService.show(issues || 'Please fill all required fields', 'error');
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

  // completeResults() removed — use per-test completeTest(planIndex, testIndex) instead
  // Each test is completed individually via POST /api/TestResults/complete-test/{headerId}

  // ----------------------------------------------------------------
  // Get specific validation errors for user-friendly messages
  // ----------------------------------------------------------------
  getFormValidationErrors(): string {
    const errors: string[] = [];
    const plansArray = this.resultForm.get('plans') as FormArray;
    if (!plansArray) return '';

    for (let p = 0; p < plansArray.length; p++) {
      const planGroup = plansArray.at(p) as FormGroup;
      const planName = this.plans[p]?.tests?.[0]?.name || `Test ${p + 1}`;
      const testsArray = planGroup.get('tests') as FormArray;
      if (!testsArray) continue;

      for (let t = 0; t < testsArray.length; t++) {
        const testGroup = testsArray.at(t) as FormGroup;
        const paramsArray = testGroup.get('parameters') as FormArray;
        if (!paramsArray) continue;

        for (let r = 0; r < paramsArray.length; r++) {
          const paramGroup = paramsArray.at(r) as FormGroup;
          if (paramGroup.valid) continue;

          const paramName = paramGroup.get('parameterName')?.value || `Row ${r + 1}`;
          const fieldErrors: string[] = [];

          if (paramGroup.get('parameterID')?.errors) fieldErrors.push('Parameter not selected');
          if (paramGroup.get('minValue')?.errors) fieldErrors.push('Min value required');
          if (paramGroup.get('maxValue')?.errors) fieldErrors.push('Max value required');

          if (fieldErrors.length > 0) {
            errors.push(`${planName} → ${paramName}: ${fieldErrors.join(', ')}`);
          }
        }
      }
    }

    if (errors.length === 0) return 'Form has validation errors. Please check all fields.';
    if (errors.length <= 3) return errors.join('\n');
    return `${errors.slice(0, 3).join('\n')}\n...and ${errors.length - 3} more error(s)`;
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

        // Get equipment for this header
        const equipmentIds = this.selectedEquipmentMap[headerId] || [];
        const equipmentIdsJson = equipmentIds.length > 0 ? JSON.stringify(equipmentIds.map((e: any) => e.id || e)) : null;

        if (apiGeneral) {
          payload.generalTests.push({
            headerId: headerId,
            generalTestId: apiGeneral.generalTestId,
            testMethodId: apiGeneral.testMethodId,
            laboratoryTestId: apiGeneral.laboratoryTestId,
            equipmentIdsJson: equipmentIdsJson,
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
              testMethodUsed: param.testMethodUsed || '',
              convertedValue: param.convertedValue ?? null,
              selectedUnit: param.selectedUnit || '',
              isBillable: param.isBillable ?? true
            }))
          });
        } else if (apiChemical) {
          payload.chemicalTests.push({
            headerId: headerId,
            generalTestId: apiChemical.chemicalTestId,
            laboratoryTestId: apiChemical.labTestId,
            equipmentIdsJson: equipmentIdsJson,
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
              testMethodUsed: param.testMethodUsed || '',
              convertedValue: param.convertedValue ?? null,
              selectedUnit: param.selectedUnit || '',
              isBillable: param.isBillable ?? true
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
    const rawValue = row.get('value')?.value;
    const planType = this.plansFA.at(planIndex).get('type')?.value; // 'General' or 'Chemical'

    // Use minValue/maxValue first, fallback to specMinValue/specMaxValue
    const minRaw = row.get('minValue')?.value ?? row.get('specMinValue')?.value;
    const maxRaw = row.get('maxValue')?.value ?? row.get('specMaxValue')?.value;
    const min = Number(minRaw);
    const max = Number(maxRaw);
    const hasMin = minRaw != null && minRaw !== '';
    const hasMax = maxRaw != null && maxRaw !== '';

    // Qualitative: pass/fail from select, no numeric comparison
    if (row.value.parameterType === 'Qualitative') {
      const isPass = rawValue === 'Pass' || rawValue === 'Satisfactory';
      const isFail = rawValue === 'Fail' || rawValue === 'Not Satisfactory';
      row.patchValue({
        isWithinLimit: isPass ? true : isFail ? false : null,
        resultStatus: isPass ? 'Pass' : isFail ? 'Fail' : null
      }, { emitEvent: false });
      return;
    }

    if (rawValue === null || rawValue === '' || rawValue === undefined) {
      row.patchValue({ isWithinLimit: null, resultStatus: null }, { emitEvent: false });
      this.recalculateFormulas(planIndex, testIndex);
      return;
    }

    const enteredValue = Number(rawValue);
    if (isNaN(enteredValue)) {
      row.patchValue({ isWithinLimit: null, resultStatus: null }, { emitEvent: false });
      this.recalculateFormulas(planIndex, testIndex);
      return;
    }

    // Apply conversion factor and decimal precision for comparison
    // Note: entered value stays in the input; converted value used only for comparison
    const conversionFactor = Number(row.get('conversionFactor')?.value) || 1;
    const decimalPrecision = Number(row.get('decimalPrecision')?.value) ?? 2;
    const compareValue = Number((enteredValue * conversionFactor).toFixed(decimalPrecision));

    if (hasMin || hasMax) {
      const withinMin = !hasMin || compareValue >= min;
      const withinMax = !hasMax || compareValue <= max;
      const withinLimit = withinMin && withinMax;

      // Chemical → Pass/Fail, Mechanical → Within Range/Under Range/Over Range
      let status: string;
      if (planType === 'Chemical') {
        status = withinLimit ? 'Pass' : 'Fail';
      } else {
        if (!withinMin) status = 'Under Range';
        else if (!withinMax) status = 'Over Range';
        else status = 'Within Range';
      }

      row.patchValue({ isWithinLimit: withinLimit, resultStatus: status }, { emitEvent: false });
    } else {
      row.patchValue({ isWithinLimit: null, resultStatus: null }, { emitEvent: false });
    }

    // Auto-recalculate all formula-based parameters in this test
    this.recalculateFormulas(planIndex, testIndex);

    // Recalculate converted value for selected equivalent unit
    this.onUnitChanged(planIndex, testIndex, paramIndex);

    // Refresh alert banners
    this.refreshAlerts();
  }

  /**
   * Re-evaluate all formula-based parameters in a test when any value changes.
   * This provides on-the-fly calculation without needing a backend call.
   */
  recalculateFormulas(planIndex: number, testIndex: number): void {
    const planType = this.plansFA.at(planIndex).get('type')?.value;
    const params = this.getParameters(planIndex, testIndex);

    params.controls.forEach((row, idx) => {
      const formulaExpr = row.get('formulaExpression')?.value;
      if (!formulaExpr) return;

      const calculatedValue = this.evaluateFormula(formulaExpr, planIndex, testIndex, idx);
      if (calculatedValue !== null) {
        const currentValue = row.get('value')?.value;
        if (Number(currentValue) !== calculatedValue) {
          // Apply decimal precision
          const decimalPrecision = Number(row.get('decimalPrecision')?.value) || 2;
          const rounded = Number(calculatedValue.toFixed(decimalPrecision));
          row.patchValue({ value: rounded }, { emitEvent: false });

          // Use specMinValue/specMaxValue as fallback (same as onValueChanged)
          const minRaw = row.get('minValue')?.value ?? row.get('specMinValue')?.value;
          const maxRaw = row.get('maxValue')?.value ?? row.get('specMaxValue')?.value;
          const hasMin = minRaw != null && minRaw !== '';
          const hasMax = maxRaw != null && maxRaw !== '';

          // Apply conversion factor for comparison
          const convFactor = Number(row.get('conversionFactor')?.value) || 1;
          const compareValue = rounded * convFactor;

          if (hasMin || hasMax) {
            const min = Number(minRaw);
            const max = Number(maxRaw);
            const withinMin = !hasMin || compareValue >= min;
            const withinMax = !hasMax || compareValue <= max;
            const withinLimit = withinMin && withinMax;

            let status: string;
            if (planType === 'Chemical') {
              status = withinLimit ? 'Pass' : 'Fail';
            } else {
              if (!withinMin) status = 'Under Range';
              else if (!withinMax) status = 'Over Range';
              else status = 'Within Range';
            }
            row.patchValue({ isWithinLimit: withinLimit, resultStatus: status }, { emitEvent: false });
          }

          // Update converted value for equivalent unit
          this.onUnitChanged(planIndex, testIndex, idx);
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

  getTestMethodSpecDrop = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodService.getTestMethodSpecificationDropdown(term, page, pageSize);

  /** Get unit options from form control (safe accessor) */
  getUnitOptions(row: any): any[] {
    return row.get('unitOptions')?.value || [];
  }

  /** Clear formula from a parameter and make it editable again */
  clearParameterFormula(planIndex: number, testIndex: number, paramIndex: number): void {
    const row = this.getParameters(planIndex, testIndex).at(paramIndex);
    row.patchValue({
      formulaExpression: '',
      isCalculated: false,
      value: null,
      isWithinLimit: null,
      resultStatus: null
    });
    this.toastService.show('Formula cleared. You can now enter value manually.', 'info');
  }

  /** Convert formula like "P5 * P7 / 2" to "Tensile × Yield / 2" using parameter names */
  getReadableFormula(expression: string, planIndex: number, testIndex: number): string {
    if (!expression) return '';
    const params = this.getParameters(planIndex, testIndex);
    let readable = expression;
    params.controls.forEach(row => {
      const v = row.value;
      if (v.parameterID) {
        const ref = `P${v.parameterID}`;
        const name = v.parameterName || ref;
        readable = readable.replace(new RegExp(ref, 'g'), name);
      }
    });
    return readable
      .replace(/\*/g, '×')
      .replace(/\//g, '÷');
  }

  onUnitChanged(planIndex: number, testIndex: number, paramIndex: number): void {
    const row = this.getParameters(planIndex, testIndex).at(paramIndex);
    const selectedUnit = row.get('selectedUnit')?.value;
    const primaryUnit = row.get('unit')?.value;
    const value = Number(row.get('value')?.value);
    const unitOptions: any[] = row.get('unitOptions')?.value || [];
    const decimalPrecision = Number(row.get('decimalPrecision')?.value) || 2;

    if (!value || isNaN(value) || !selectedUnit || selectedUnit === primaryUnit) {
      row.patchValue({ convertedValue: null }, { emitEvent: false });
      return;
    }

    const option = unitOptions.find((o: any) => o.unitName === selectedUnit);
    if (option?.factor) {
      const converted = Number((value * option.factor).toFixed(decimalPrecision));
      row.patchValue({ convertedValue: converted }, { emitEvent: false });
    } else {
      row.patchValue({ convertedValue: null }, { emitEvent: false });
    }
  }

  onTestMethodUsedSelected(planIndex: number, testIndex: number, paramIndex: number, selectedItem: any): void {
    const row = this.getParameters(planIndex, testIndex).at(paramIndex);
    row.patchValue({ testMethodUsed: selectedItem?.name || '' });
  }

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
    const currentParamId = row.get('parameterID')?.value;

    if (!selectedItem) {
      row.patchValue({ parameterID: null, parameterName: null, unit: null });
      return;
    }

    // Skip if same parameter re-selected (e.g., dropdown init on load)
    if (currentParamId === selectedItem.id) return;

    const unit = selectedItem?.additionalValues?.['Unit'] || selectedItem?.unit || row.get('unit')?.value;

    // Parameter actually changed — clear old values and update
    row.patchValue({
      parameterID: selectedItem.id,
      parameterName: selectedItem.name,
      unit: unit,
      specMinValue: null,
      specMaxValue: null,
      minValue: null,
      maxValue: null,
      value: null,
      isWithinLimit: null,
      resultStatus: null,
    });
  }

  // ================================================================
  // Test Start / Complete Flow
  // ================================================================
  startTest(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    if (!confirm(`Start test "${test.name}"? This will record the start time and performer.`)) return;

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
    }
    // Removed auto-add on Enter at last row — user should explicitly click "Add Parameter"
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
    const completedStatuses = ['Completed', 'PendingVerification', 'Verified', 'VerificationRejected'];
    return relatedTests.every((t: any) => completedStatuses.includes(t.status));
  }

  isTestFinalized(status: string): boolean {
    return ['PendingVerification', 'Verified'].includes(status);
  }

  // ================================================================
  // Sample-Level Verification (NABL ISO 17025 Clause 7.7)
  // ================================================================
  isSubmittingVerification = false;

  getVerificationBannerState(): { state: string; message: string } | null {
    const allTests = this.plans.flatMap((p: any) => p.tests || []);
    if (!allTests.length) return null;

    const statuses = allTests.map((t: any) => t.status);
    const allVerified = statuses.every((s: string) => s === 'Verified');
    const allPending = statuses.every((s: string) => s === 'PendingVerification');
    const allCompleted = statuses.every((s: string) => s === 'Completed');
    const anyPending = statuses.some((s: string) => s === 'PendingVerification');
    const anyIncomplete = statuses.some((s: string) =>
      s !== 'Completed' && s !== 'PendingVerification' && s !== 'Verified');

    if (allVerified) {
      return { state: 'verified', message: 'All tests verified successfully.' };
    }
    if (allPending || (anyPending && !anyIncomplete)) {
      return { state: 'pending', message: 'All tests submitted for verification. Awaiting reviewer approval.' };
    }
    if (allCompleted) {
      return { state: 'ready', message: `All ${allTests.length} test(s) completed. Ready to submit for verification.` };
    }
    if (anyIncomplete) {
      const completed = statuses.filter((s: string) => s === 'Completed' || s === 'PendingVerification' || s === 'Verified').length;
      return { state: 'partial', message: `${completed} of ${allTests.length} test(s) completed. Complete all tests before submitting for verification.` };
    }
    return null;
  }

  submitForVerification(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;
    if (!headerId) return;

    this.testResultService.submitForVerification(headerId).subscribe({
      next: () => {
        test.status = 'PendingVerification';
        this.toastService.show('Test submitted for verification', 'success');
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to submit for verification', 'error');
      }
    });
  }

  submitSampleForVerification(): void {
    if (this.isSubmittingVerification) return;
    this.isSubmittingVerification = true;

    this.testResultService.submitSampleForVerification(this.sampleId).subscribe({
      next: (res: any) => {
        this.isSubmittingVerification = false;
        // Update all completed test statuses to PendingVerification
        this.plans.forEach((plan: any) => {
          (plan.tests || []).forEach((test: any) => {
            if (test.status === 'Completed') {
              test.status = 'PendingVerification';
            }
          });
        });
        this.toastService.show(res?.message || 'All tests submitted for verification', 'success');
      },
      error: (err: any) => {
        this.isSubmittingVerification = false;
        this.toastService.show(err?.error?.message || 'Failed to submit for verification', 'error');
      }
    });
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
    if (!selectedItem) {
      return;
    }
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
    if (!selectedItem) {
      this.fromMethodForm.patchValue({ testMethodId: null, parameterID: null });
      this.methodParameters = [];
      return;
    }
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
      case 'Pass':
      case 'Within Range': return 'badge-pass';
      case 'Fail':
      case 'Out of Range': return 'badge-fail';
      case 'Under Range':
      case 'Over Range': return 'badge-warn';
      case 'Marginal': return 'badge-warn';
      default: return 'badge-pending';
    }
  }

  getResultStatusIcon(status: string | null): string {
    switch (status) {
      case 'Pass':
      case 'Within Range': return 'bi-check-circle';
      case 'Fail':
      case 'Out of Range': return 'bi-x-circle';
      case 'Under Range': return 'bi-arrow-down-circle';
      case 'Over Range': return 'bi-arrow-up-circle';
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

  onPricingTypeChange(headerId: number, event: Event): void {
    const pricingType = (event.target as HTMLSelectElement).value || null;
    this.priceLoadingMap[headerId] = true;
    this.testResultService.setPricingType(headerId, pricingType).subscribe({
      next: (summary: any) => {
        this.priceSummaryMap[headerId] = summary;
        this.priceBreakdownMap[headerId] = summary.breakdown || [];
        this.priceLoadingMap[headerId] = false;
        this.toastService.show('Pricing method updated', 'success');
      },
      error: (err: any) => {
        this.priceLoadingMap[headerId] = false;
        this.toastService.show(err?.error?.message || 'Error updating pricing method', 'error');
      }
    });
  }

  // ── Smart Pricing Recommendation ──

  toggleRecPanel(headerId: number): void {
    if (!this.showRecPanel[headerId]) {
      this.fetchPricingRec(headerId);
    } else {
      this.showRecPanel[headerId] = false;
    }
  }

  fetchPricingRec(headerId: number): void {
    if (!headerId || headerId <= 0) return;
    this.pricingRecLoading[headerId] = true;
    this.testResultService.getPricingRecommendation(headerId).subscribe({
      next: (rec: any) => {
        this.pricingRecMap[headerId] = rec;
        this.pricingRecLoading[headerId] = false;
        this.showRecPanel[headerId] = true;
        // Auto-fill size from sample dimensions
        const dims = rec.sampleDimensions;
        if (dims && !this.dimSizeMap[headerId]) {
          this.dimSizeMap[headerId] = dims.diameter ?? dims.thickness ?? dims.width ?? null;
        }
      },
      error: () => { this.pricingRecLoading[headerId] = false; }
    });
  }

  applyRec(headerId: number, rec: any): void {
    this.priceLoadingMap[headerId] = true;

    // Build dimension string based on type
    let dimensionValue: string | null = null;
    const size = this.dimSizeMap[headerId] ?? rec.autoDetectedValue;
    const load = this.dimLoadMap[headerId];

    if (rec.pricingType === 'SizeLoad' || rec.pricingType === 'SizeAndLoad') {
      if (size && load) dimensionValue = `${size}|${load}`;
      else if (size) dimensionValue = `${size}`;
    } else if (size) {
      dimensionValue = `${size}`;
    }

    this.testResultService.setPricingWithValue(headerId, {
      pricingType: rec.pricingType,
      dimensionValue: dimensionValue
    }).subscribe({
      next: (summary: any) => {
        this.priceSummaryMap[headerId] = summary;
        this.priceBreakdownMap[headerId] = summary.breakdown || [];
        this.priceLoadingMap[headerId] = false;
        this.toastService.show(`Applied: ${rec.displayName} pricing`, 'success');
      },
      error: (err: any) => {
        this.priceLoadingMap[headerId] = false;
        this.toastService.show(err?.error?.message || 'Error', 'error');
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

  getNablScopeSummary(headerId: number): { allInScope: boolean; outOfScopeCount: number; notAccreditedCount: number; inScopeCount: number; totalChecked: number } {
    const results = this.nablScopeMap[headerId];
    if (!results || results.length === 0) return { allInScope: false, outOfScopeCount: 0, notAccreditedCount: 0, inScopeCount: 0, totalChecked: 0 };
    const outOfScope = results.filter((r: any) => r.scopeStatus === 'OutsideScope');
    const notAccredited = results.filter((r: any) => r.scopeStatus === 'NotAccredited');
    const inScope = results.filter((r: any) => r.scopeStatus === 'WithinScope');
    return {
      allInScope: inScope.length > 0 && outOfScope.length === 0,
      outOfScopeCount: outOfScope.length,
      notAccreditedCount: notAccredited.length,
      inScopeCount: inScope.length,
      totalChecked: results.length,
    };
  }

  hasOutOfScopeParams(headerId: number): boolean {
    return this.getNablScopeSummary(headerId).outOfScopeCount > 0;
  }

  hasAnyInScope(headerId: number): boolean {
    return this.getNablScopeSummary(headerId).inScopeCount > 0;
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
    return this.cachedAlerts.filter(a => !this.dismissedAlerts.has(a.id));
  }

  refreshAlerts(): void {
    const alerts: { id: string; type: 'fail' | 'warn'; title: string; message: string }[] = [];
    this.plans.forEach((plan, pIdx) => {
      (plan.tests || []).forEach((test: any, tIdx: number) => {
        (test.parameters || []).forEach((param: any) => {
          const alertId = `${pIdx}-${tIdx}-${param.parameterID || param.id}`;
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
    this.cachedAlerts = alerts;
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

  /** Returns true if at least one test can accept saves (not verified/pending verification) */
  canSaveAnyTest(): boolean {
    const blockedStatuses = ['Verified', 'PendingVerification'];
    const allTests = this.plans.flatMap((p: any) => p.tests || []);
    return allTests.some((t: any) => !blockedStatuses.includes(t.status));
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
    this.smartFormulaMode = false;
    this.smartFormulaInput = '';
    this.smartFormulaTokens = [];
    this.smartFormulaErrors = [];
    this.smartFormulaValid = false;
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

  // ── Smart Formula Input ──────────────────────────────────────

  toggleSmartFormulaMode(): void {
    this.smartFormulaMode = !this.smartFormulaMode;
    if (this.smartFormulaMode) {
      // Convert existing P-notation to readable names for editing
      this.smartFormulaInput = this.formulaBuilderTargetRow
        ? this.pNotationToNames(this.formulaExpression)
        : '';
    }
  }

  /** Convert P-notation (P12 * 1000) to names (UTL * 1000) */
  private pNotationToNames(expr: string): string {
    if (!expr) return '';
    let result = expr;
    this.formulaAvailableParams.forEach(p => {
      result = result.replace(new RegExp(p.ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), p.parameterName);
    });
    return result;
  }

  /** Parse smart formula input — tokenize, match, validate */
  parseSmartFormula(): void {
    const input = this.smartFormulaInput.trim();
    this.smartFormulaTokens = [];
    this.smartFormulaErrors = [];
    this.smartFormulaValid = false;

    if (!input) return;

    // Tokenize: split by operators/brackets but keep them
    const rawTokens = input.match(/([a-zA-Z_][a-zA-Z0-9_]*|[0-9]*\.?[0-9]+|[+\-*/(),])/g) || [];

    const operators = new Set(['+', '-', '*', '/', '(', ')', ',']);
    const functions = new Set(this.formulaFunctions.map(f => f.toUpperCase()));
    const specialConstants: Record<string, string> = { 'pi': '3.14159265', 'PI': '3.14159265', 'π': '3.14159265' };

    for (const raw of rawTokens) {
      // Operator
      if (operators.has(raw)) {
        this.smartFormulaTokens.push({ token: raw, type: 'operator' });
        continue;
      }

      // Number
      if (/^[0-9]*\.?[0-9]+$/.test(raw)) {
        this.smartFormulaTokens.push({ token: raw, type: 'number' });
        continue;
      }

      // Special constant (pi)
      if (specialConstants[raw]) {
        this.smartFormulaTokens.push({ token: raw, type: 'number', matched: `= ${specialConstants[raw]}` });
        continue;
      }

      // Function
      if (functions.has(raw.toUpperCase())) {
        this.smartFormulaTokens.push({ token: raw, type: 'function', matched: raw.toUpperCase() });
        continue;
      }

      // P-notation already (P12, P207 etc.)
      const pMatch = raw.match(/^P(\d+)$/i);
      if (pMatch) {
        const found = this.formulaAvailableParams.find(p => p.ref.toUpperCase() === raw.toUpperCase());
        if (found) {
          this.smartFormulaTokens.push({ token: raw, type: 'param', matched: found.parameterName, paramRef: found.ref });
        } else {
          this.smartFormulaTokens.push({ token: raw, type: 'unknown' });
          this.smartFormulaErrors.push(`"${raw}" — no matching parameter found`);
        }
        continue;
      }

      // Try matching by parameter name (case-insensitive)
      const exactMatch = this.formulaAvailableParams.find(
        p => p.parameterName.toLowerCase() === raw.toLowerCase()
      );
      if (exactMatch) {
        this.smartFormulaTokens.push({ token: raw, type: 'param', matched: exactMatch.parameterName, paramRef: exactMatch.ref });
        continue;
      }

      // Partial/fuzzy match
      const partialMatch = this.formulaAvailableParams.find(
        p => p.parameterName.toLowerCase().startsWith(raw.toLowerCase())
      );
      if (partialMatch) {
        this.smartFormulaTokens.push({ token: raw, type: 'param', matched: `${partialMatch.parameterName}?`, paramRef: partialMatch.ref });
        this.smartFormulaErrors.push(`"${raw}" → did you mean "${partialMatch.parameterName}"?`);
        continue;
      }

      // No match
      this.smartFormulaTokens.push({ token: raw, type: 'unknown' });
      this.smartFormulaErrors.push(`"${raw}" — no matching parameter found`);
    }

    // Validate brackets
    let depth = 0;
    for (const t of this.smartFormulaTokens) {
      if (t.token === '(') depth++;
      if (t.token === ')') depth--;
      if (depth < 0) { this.smartFormulaErrors.push('Unmatched closing bracket ")"'); break; }
    }
    if (depth > 0) this.smartFormulaErrors.push(`${depth} unclosed bracket(s)`);

    this.smartFormulaValid = this.smartFormulaErrors.length === 0 && this.smartFormulaTokens.length > 0;
  }

  /** Apply smart formula — convert to P-notation */
  applySmartFormula(): void {
    if (!this.smartFormulaValid) return;

    const specialConstants: Record<string, string> = { 'pi': '3.14159265', 'PI': '3.14159265', 'π': '3.14159265' };

    // Build P-notation expression
    const parts = this.smartFormulaTokens.map(t => {
      if (t.type === 'param' && t.paramRef) return t.paramRef;
      if (t.type === 'number' && specialConstants[t.token]) return specialConstants[t.token];
      return t.token;
    });

    this.formulaExpression = parts.join(' ').replace(/\s*\(\s*/g, '(').replace(/\s*\)\s*/g, ')').replace(/\s+/g, ' ').trim();
    this.smartFormulaMode = false;
    this.applyFormula();
  }

  /** Use suggested match for an unknown token */
  acceptSuggestion(tokenIndex: number, paramRef: string, paramName: string): void {
    const token = this.smartFormulaTokens[tokenIndex];
    if (token) {
      // Replace in input text
      this.smartFormulaInput = this.smartFormulaInput.replace(
        new RegExp(`\\b${token.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
        paramName
      );
      this.parseSmartFormula();
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

