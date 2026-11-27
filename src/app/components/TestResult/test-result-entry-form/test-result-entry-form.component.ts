import {
  LimitBand,
  bandContains,
  buildBandSegments,
  dimensionKind,
  formatBand,
  parameterShortName,
  sampleDimension,
  segmentWithinBand,
  suggestProductSizeKey
} from '../../../utility/helper/spec-condition.helper';
import { ChangeDetectorRef, Component, DoCheck, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, QueryList, SimpleChanges, ViewChild, ViewChildren, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TestResultService } from '../../../services/test-result.service';
import { ParameterService } from '../../../services/parameter.service';
import { EquipmentService } from '../../../services/equipment.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { TestLayoutService } from '../../../services/test-layout.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { Observable, Subscription, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ToastService } from '../../../services/toast.service';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';
import { ConfirmDialogComponent } from '../../../utility/components/confirm-dialog/confirm-dialog.component';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { TestStatusBadgeComponent } from '../test-status-badge/test-status-badge.component';
import { ConfiguredTestLayoutRendererComponent } from '../configured-test-layout-renderer/configured-test-layout-renderer.component';
import { layoutRequiredGaps, layoutPhotoGaps } from '../configured-test-layout-renderer/layout-required-gaps';
import { TestVerdictPanelComponent, VerdictColumnConfig } from '../test-verdict-panel/test-verdict-panel.component';
import { FormsModule } from '@angular/forms';
import { formatFormulaDisplay, convertNamesToFormulaTokens } from '../../../utility/helper/formula.helper';
import { ExecutionMetrics, countExecutionMetrics, sameExecutionMetricsList } from './execution-metrics';
import {
  findByTensileRole,
  tensileArea, TensileRole
} from '../configured-test-layout-renderer/tensile-parameter-roles';
import {
  addSpecimenRows,
  filterEmptyExtraSpecimenRows,
  layoutDeclaredSpecimenCount,
  layoutHasSpecimenSection,
  removeSpecimenRows,
  resolveSpecimenCount,
  resolveSpecimenIndexes,
  savedResultIdsOf,
  specimenIndexesOf,
  SpecimenRowStore,
  updateSavedResultIds,
} from '../configured-test-layout-renderer/specimen-grouping';

/** One choice of a condition dropdown; `hint` lists the limits it sets (shown in the open list only). */
type CondOption = { value: string; label: string; hint?: string };

@Component({
  selector: 'app-test-result-entry-form',
  templateUrl: './test-result-entry-form.component.html',
  styleUrls: ['./test-result-entry-form.component.css'],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    SearchableDropdownComponent,
    DecimalOnlyDirective,
    TestStatusBadgeComponent,
    ConfiguredTestLayoutRendererComponent,
    TestVerdictPanelComponent,
    FormsModule,
    HasPermissionDirective,
    ConfirmDialogComponent
  ],
})
export class TestResultEntryFormComponent implements OnInit, OnChanges, DoCheck, OnDestroy {
  @ViewChild('layoutRenderer') layoutRendererComponent?: ConfiguredTestLayoutRendererComponent;
  @Input() inputSampleId?: number;
  @Input() isInline: boolean = false;
  @Output() resultSaved = new EventEmitter<any>();
  @Output() resultCompleted = new EventEmitter<any>();
  @Output() closeRequested = new EventEmitter<void>();

  baseUrl: string = environment.baseUrl;
  sampleId: number = 0;
  inward: any = null;
  sample: any = null;
  plans: any[] = [];
  resultForm!: FormGroup;
  isViewMode: boolean = false;
  payloadLoaded: boolean = false;

  // 2-Tab Consolidated Workflow Navigation (ISO 17025)
  // Tab 1: 'execution' (1. Test & Execution Workspace)
  // Tab 2: 'nabl_audit' (2. NABL QA & Audit)
  // Tab state is kept per test (plan), so every test remembers its own tab
  private tabByPlan: Record<number, 'execution' | 'nabl_audit'> = {};
  get activeTab(): 'execution' | 'nabl_audit' {
    return this.tabByPlan[this.activePlanIndex] ?? 'execution';
  }
  set activeTab(value: 'execution' | 'nabl_audit') {
    this.tabByPlan[this.activePlanIndex] = value;
  }
  caseDetailsVisible = false;
  openCaseDetails(): void {
    this.caseDetailsVisible = true;
  }
  closeCaseDetails(): void {
    this.caseDetailsVisible = false;
  }

  testTabs: { id: 'execution' | 'nabl_audit'; label: string; icon: string }[] = [
    { id: 'execution', label: '1. Test & Execution Workspace', icon: 'bi-clipboard-data' },
    { id: 'nabl_audit', label: '2. NABL QA & Audit', icon: 'bi-shield-check' }
  ];

  testPurposeOptions: string[] = [
    'Material Qualification',
    'Quality Control / Batch Release',
    'Failure Analysis',
    'Routine Testing',
    'Customer Verification',
    'Research & Development',
    'Third Party Inspection (TPI)'
  ];

  // Top-level tabs: Test Results vs Preparation & Pricing
  activeMainTab: 'results' | 'preparation' = 'results';

  // Dismissed alert IDs
  dismissedAlerts: Set<string> = new Set();
  cachedAlerts: { id: string; type: 'fail' | 'warn'; title: string; message: string }[] = [];

  // Plan tabs - active tab index
  activePlanIndex: number = 0;

  // Configured Test-Wise Layout State
  currentTestLayout: any = null;
  /** Standard fallback layout rendered whenever a test has no mapped TestLayoutTemplate in DB. */
  readonly defaultFallbackLayout: any = {
    id: 0,
    layoutName: 'Standard Parameter Table',
    sections: [
      {
        id: 'default-params',
        type: 'parameter',
        title: 'Test Parameters',
        config: {
          sectionDataMode: 'runtime',
          runtimeAdjust: true,
          allowRuntimeAdd: true
        }
      }
    ]
  };
  activeLayoutMode: 'configured' | 'default' = 'configured';
  layoutCache: Record<string, any> = {};
  loadingLayout: boolean = false;
  availableLayoutTemplates: any[] = [];
  selectedLayoutTemplateId: number | null = null;
  planLayoutSelections: Record<number, any> = {};

  // Formula Builder Modal
  showFormulaBuilderModal = false;
  formulaBuilderTargetRow: { planIndex: number; testIndex: number; paramIndex: number } | null = null;
  formulaExpression = '';
  formulaCursorPos = 0;
  formulaAvailableParams: { parameterID: number; parameterName: string; unit: string; ref: string }[] = [];
  formulaOperators = ['+', '-', '*', '/', '(', ')'];
  formulaFunctions = ['MEAN', 'MAX', 'MIN', 'SUM', 'COUNT', 'STDEV'];

  // Formula dependency warnings: key = "planIdx-testIdx-paramIdx", value = warning message
  formulaDependencyWarnings: Record<string, string> = {};
  globalParamMap: Record<number, string> = {};

  /**
   * Returns a user-friendly human-readable formula display string.
   * Never displays raw parameter IDs ({P240}) on any UI screen.
   */
  getFormulaDisplay(param: any, planIndex?: number, testIndex?: number): string {
    if (!param) return '';
    if (param.formulaDisplay && !/\{?P\d+\}?/i.test(param.formulaDisplay)) {
      return param.formulaDisplay;
    }
    const expr = param.formulaExpression || param.formula || '';
    if (!expr) return '';

    const lookupList: any[] = [];
    if (planIndex !== undefined && testIndex !== undefined && this.plans?.[planIndex]?.tests?.[testIndex]?.parameters) {
      lookupList.push(...this.plans[planIndex].tests[testIndex].parameters);
    }
    if (planIndex !== undefined && testIndex !== undefined) {
      try {
        const formParams = this.getParameters(planIndex, testIndex)?.value;
        if (Array.isArray(formParams)) lookupList.push(...formParams);
      } catch { }
    }
    lookupList.push(this.globalParamMap);

    return formatFormulaDisplay(expr, lookupList, this.globalParamMap);
  }

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
  environmentMap: Record<number, { roomTemperature?: number; roomHumidity?: number; labRoomName?: string; labRoomId?: number }> = {};
  // Equipment selection per headerId
  selectedEquipmentMap: Record<number, any[]> = {};
  // Test timing info per headerId (from API response)
  testTimingMap: Record<number, { testStartTime?: string; testEndTime?: string; performedByName?: string }> = {};

  // Lab Environment Recording Modal
  showRecordEnvironmentModal = false;
  recordEnvForm!: FormGroup;
  activeEnvHeaderId: number | null = null;
  activeEnvTestTitle: string = '';
  labRooms: any[] = [];
  loadingLabRooms = false;

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
  selectedMethodParam: any = null;
  loadingMethodParams = false;

  // Material Specification Condition Filter Engine
  /** Merge left-rail spec-condition selections into executionExtraJson so they survive reload. */
  private mergeSelectedConditions(extraJson: any, headerId: number): string | null {
    let extra: any = {};
    if (extraJson) {
      try {
        extra = typeof extraJson === 'string' ? JSON.parse(extraJson) : { ...extraJson };
      } catch {
        extra = {};
      }
    }
    const selected = this.selectedConditionsMap[headerId];
    if (selected) {
      extra.selectedConditions = selected;
    }
    return Object.keys(extra).length ? JSON.stringify(extra) : null;
  }

  selectedConditionsMap: Record<number, {
    dimensionalFactorID: number | null;
    heatTreatmentID: number | null;
    productConditionID1: number | null;
    productConditionID2: number | null;
    specimenOrientationID: number | null;
    facets?: Record<string, string | null>;
    productSizeMasterID?: number | null;
    testCondition?: string | null;
  }> = {};
  cachedGradeSpecLines: Record<number, any[]> = {};
  matchedConditionLinesCount: Record<number, number> = {};

  constructor(
    private fb: FormBuilder,
    private testResultService: TestResultService,
    private parameterService: ParameterService,
    private equipmentService: EquipmentService,
    private testMethodService: TestMethodSpecificationService,
    private materialSpecService: MaterialSpecificationService,
    private testLayoutService: TestLayoutService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (this.inputSampleId && this.inputSampleId > 0) {
      this.sampleId = this.inputSampleId;
    } else {
      this.route.paramMap.subscribe(params => {
        const idParam = params.get('sampleId') ?? params.get('id');
        if (idParam) {
          this.sampleId = Number(idParam);
        }
      });
    }

    // Mode comes only from the URL (?mode=edit|view|verify), so refresh and new tabs keep it
    if (this.route.snapshot.url.some(s => s.path === 'details')) {
      this.isViewMode = true;
    }
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'view' || params['mode'] === 'verify') {
        this.isViewMode = true;
      }
    });
    this.buildForm();
    this.buildMoveToLongTermForm();
    this.buildStandaloneParamForm();
    this.buildFromMethodForm();
    this.buildRecordEnvironmentForm();
    this.loadAvailableLayoutTemplates();
    this.parameterService.getParameterDropdown('', 0, 500).subscribe({
      next: (res) => {
        (res || []).forEach((p: any) => {
          const id = p.id ?? p.value;
          const name = p.name ?? p.displayText;
          if (id && name) {
            this.globalParamMap[Number(id)] = String(name).trim();
          }
        });
      }
    });
    if (this.sampleId) {
      this.loadFullResultPayload(this.sampleId);
    } else {
      this.payloadLoaded = true;
      this.toastService.show('Sample ID is required', 'warning');
      // loading handled by interceptor
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inputSampleId'] && changes['inputSampleId'].currentValue) {
      const newId = Number(changes['inputSampleId'].currentValue);
      if (newId > 0 && newId !== this.sampleId) {
        this.sampleId = newId;
        this.loadFullResultPayload(this.sampleId);
      }
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

        // Store metadata for save/complete FIRST: mapping starts the specification condition engine, which reads the
        // grade, test node and method ids from it (before, it ran with empty metadata and fell back to the plan row)
        this.storeApiMetadata(data);
        // Map API response to component format
        this.mapApiResponseToComponentFormat(data);

        // Rebuild form with actual data
        this.resultForm = this.fb.group({
          plans: this.fb.array(this.plans.map(plan => this.createPlanGroup(plan)))
        });
        this.watchResultForm();

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

        // Auto-evaluate formulas and validate dependencies on first load
        this.autoEvaluateAllFormulas();

        // Load configured test-wise layout for active test
        this.loadTestLayoutForPlan(this.activePlanIndex);

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
  // Configured Test-Wise Layout Management
  // ----------------------------------------------------------------
  selectPlanTab(p: number): void {
    this.activePlanIndex = p;
    const saved = this.planLayoutSelections[p];
    if (saved !== undefined) {
      if (saved === null) {
        this.selectedLayoutTemplateId = null;
        this.loadTestLayoutForPlan(p);
      } else if (saved === -1 || saved === '-1') {
        this.selectedLayoutTemplateId = -1;
        this.currentTestLayout = null;
        this.activeLayoutMode = 'default';
      } else {
        this.onLayoutTemplateSelect(saved, false);
      }
    } else {
      this.selectedLayoutTemplateId = null;
      this.loadTestLayoutForPlan(p);
    }
  }

  /** Single source for the layout cache key (auto-resolve and manual pick must not collide). */
  private buildLayoutCacheKey(plan: any, planIndex: number, pickedLayoutId?: number): string {
    const headerId = plan?.headerId || plan?.tests?.[0]?.headerId || `plan_${planIndex}`;
    const methodId = plan?.methodId || plan?.tests?.[0]?.testMethodId || null;
    const methodName = plan?.methodName || plan?.tests?.[0]?.testMethodName || null;
    const leafNode = plan?.leafNode || plan?.tests?.[0]?.name || null;
    const key = `${headerId}_${plan?.labTestId}_${plan?.subGroupId || null}_${plan?.analysisTypeId || null}_${leafNode}_${methodId}_${methodName}`;
    return pickedLayoutId ? `${key}_L${pickedLayoutId}` : key;
  }

  loadTestLayoutForPlan(planIndex: number): void {
    const plan = this.plans[planIndex];
    if (!plan) return;

    const testId = plan.labTestId;
    const subGroupId = plan.subGroupId || null;
    const analysisTypeId = plan.analysisTypeId || null;
    const leafNode = plan.leafNode || plan.tests?.[0]?.name || null;
    const headerId = plan.headerId || plan.tests?.[0]?.headerId || `plan_${planIndex}`;
    const methodId = plan.methodId || plan.tests?.[0]?.testMethodId || null;
    const methodName = plan.methodName || plan.tests?.[0]?.testMethodName || null;

    const cacheKey = this.buildLayoutCacheKey(plan, planIndex);
    if (this.layoutCache[cacheKey]) {
      this.currentTestLayout = this.layoutCache[cacheKey];
      this.selectedLayoutTemplateId = this.currentTestLayout?.id || null;
      this.activeLayoutMode = 'configured';
      return;
    }

    // Priority 1: If test header already has a saved layoutSnapshotJson, restore it immediately
    const savedSnapshot = plan.tests?.[0]?.layoutSnapshotJson || plan.layoutSnapshotJson;
    if (savedSnapshot && typeof savedSnapshot === 'string' && savedSnapshot.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(savedSnapshot);
        const configJson = parsed.layoutConfigJson ? JSON.parse(parsed.layoutConfigJson) : (parsed.parsedConfig || parsed);
        this.currentTestLayout = {
          ...parsed,
          parsedConfig: configJson,
          sections: configJson.sections || parsed.sections || []
        };
        this.selectedLayoutTemplateId = this.currentTestLayout?.id || null;
        this.layoutCache[cacheKey] = this.currentTestLayout;
        this.activeLayoutMode = 'configured';
        return;
      } catch (e) {
        console.warn('Could not parse saved layoutSnapshotJson, falling back to hierarchy lookup', e);
      }
    }

    this.loadingLayout = true;
    this.testLayoutService.getLayoutByHierarchy(testId, subGroupId, analysisTypeId, leafNode, methodId, methodName).subscribe({
      next: (template: any) => {
        this.loadingLayout = false;
        if (template && template.layoutConfigJson) {
          try {
            const parsed = JSON.parse(template.layoutConfigJson);
            this.currentTestLayout = {
              ...template,
              parsedConfig: parsed,
              sections: parsed.sections || []
            };
            this.selectedLayoutTemplateId = template.id || null;
            this.layoutCache[cacheKey] = this.currentTestLayout;
            this.activeLayoutMode = 'configured';
          } catch (e) {
            console.warn('Failed to parse layoutConfigJson', e);
            this.currentTestLayout = null;
            this.selectedLayoutTemplateId = null;
            this.activeLayoutMode = 'default';
          }
        } else {
          // No layout returned (204 NoContent or null)
          this.currentTestLayout = null;
          this.selectedLayoutTemplateId = null;
          this.activeLayoutMode = 'default';
        }
      },
      error: (err) => {
        this.loadingLayout = false;
        console.warn('Could not load configured layout, falling back to default layout', err);
        this.currentTestLayout = null;
        this.selectedLayoutTemplateId = null;
        this.activeLayoutMode = 'default';
      }
    });
  }

  loadAvailableLayoutTemplates(): void {
    this.testLayoutService.getAllLayouts({ PageNumber: 1, PageSize: 100, sortByColumn: 'id', sortOrder: 'desc' }).subscribe({
      next: (res: any) => {
        const list = res?.items || res?.data || res?.model || [];
        this.availableLayoutTemplates = list;
        if (this.currentTestLayout?.id) {
          this.selectedLayoutTemplateId = this.currentTestLayout.id;
        }
      },
      error: (err: any) => {
        console.warn('Failed to load layout templates list', err);
      }
    });
  }

  getAvailableLayoutTemplatesForActiveTest(): any[] {
    const plan = this.plans[this.activePlanIndex];
    if (!plan) return this.availableLayoutTemplates;

    const testId = plan.labTestId;
    const subGroupId = plan.subGroupId;
    const analysisTypeId = plan.analysisTypeId;
    const testName = (plan.tests?.[0]?.name || plan.type || '').trim().toLowerCase();

    return this.availableLayoutTemplates.filter(t => {
      // Global default templates apply to all tests
      if (t.isGlobalDefault) return true;
      // Explicit match by LaboratoryTestId (handles both casing conventions)
      const templateLabTestId = t.laboratoryTestId ?? t.laboratoryTestID;
      if (templateLabTestId && testId && Number(templateLabTestId) === Number(testId)) return true;
      // Explicit match by SubGroupID
      const templateSubGroupId = t.laboratoryTestSubGroupID ?? t.laboratoryTestSubGroupId;
      if (templateSubGroupId && subGroupId && Number(templateSubGroupId) === Number(subGroupId)) return true;
      // Explicit match by AnalysisTypeID
      const templateAnalysisTypeId = t.laboratoryTestAnalysisTypeID ?? t.laboratoryTestAnalysisTypeId;
      if (templateAnalysisTypeId && analysisTypeId && Number(templateAnalysisTypeId) === Number(analysisTypeId)) return true;
      if (templateAnalysisTypeId && testId && Number(templateAnalysisTypeId) === Number(testId)) return true;
      // Explicit match by Name
      const templateLabTestName = (t.laboratoryTestName ?? t.laboratoryTest?.name ?? '').trim().toLowerCase();
      if (templateLabTestName && (templateLabTestName === testName || testName.includes(templateLabTestName) || templateLabTestName.includes(testName))) return true;
      const templateAnalysisTypeName = (t.analysisTypeName ?? '').trim().toLowerCase();
      if (templateAnalysisTypeName && (templateAnalysisTypeName === testName || testName.includes(templateAnalysisTypeName) || templateAnalysisTypeName.includes(testName))) return true;
      const templateSubGroupName = (t.subGroupName ?? '').trim().toLowerCase();
      if (templateSubGroupName && (templateSubGroupName === testName || testName.includes(templateSubGroupName) || templateSubGroupName.includes(testName))) return true;
      return false;
    });
  }

  getOtherLayoutTemplatesForActiveTest(): any[] {
    const matched = this.getAvailableLayoutTemplatesForActiveTest();
    const matchedIds = new Set(matched.map(m => m.id));
    return this.availableLayoutTemplates.filter(t => !matchedIds.has(t.id));
  }

  onLayoutTemplateSelect(layoutId: any, showToast: boolean = true): void {
    this.planLayoutSelections[this.activePlanIndex] = layoutId;

    if (layoutId === null || layoutId === 'auto' || layoutId === '') {
      this.selectedLayoutTemplateId = null;
      this.loadTestLayoutForPlan(this.activePlanIndex);
      if (showToast) this.toastService.show('Auto-selected layout by hierarchy', 'info');
      return;
    }

    if (layoutId === -1 || layoutId === '-1') {
      this.selectedLayoutTemplateId = -1;
      this.currentTestLayout = null;
      this.activeLayoutMode = 'default';
      if (showToast) this.toastService.show('Switched to Standard Fallback Layout', 'info');
      return;
    }

    const targetId = Number(layoutId);
    this.selectedLayoutTemplateId = targetId;

    const plan = this.plans[this.activePlanIndex];
    const testId = plan?.labTestId;
    const subGroupId = plan?.subGroupId || null;
    const analysisTypeId = plan?.analysisTypeId || null;
    const leafNode = plan?.leafNode || plan?.tests?.[0]?.name || null;
    const headerId = plan?.headerId || plan?.tests?.[0]?.headerId || `plan_${this.activePlanIndex}`;
    const cacheKey = this.buildLayoutCacheKey(plan, this.activePlanIndex, targetId);

    const found = this.availableLayoutTemplates.find(t => t.id === targetId);
    if (found && found.layoutConfigJson) {
      try {
        const parsed = JSON.parse(found.layoutConfigJson);
        this.currentTestLayout = {
          ...found,
          parsedConfig: parsed,
          sections: parsed.sections || []
        };
        this.layoutCache[cacheKey] = this.currentTestLayout;
        this.activeLayoutMode = 'configured';
        if (showToast) this.toastService.show(`Applied Layout Template: ${found.layoutName}`, 'success');
        return;
      } catch (e) {
        console.warn('Failed to parse cached layoutConfigJson', e);
      }
    }

    this.loadingLayout = true;
    this.testLayoutService.getLayoutById(targetId).subscribe({
      next: (template: any) => {
        this.loadingLayout = false;
        if (template && template.layoutConfigJson) {
          try {
            const parsed = JSON.parse(template.layoutConfigJson);
            this.currentTestLayout = {
              ...template,
              parsedConfig: parsed,
              sections: parsed.sections || []
            };
            this.layoutCache[cacheKey] = this.currentTestLayout;
            this.activeLayoutMode = 'configured';
            if (showToast) this.toastService.show(`Applied Layout Template: ${template.layoutName}`, 'success');
          } catch (e) {
            console.error('Failed to parse layoutConfigJson', e);
            this.toastService.show('Invalid layout JSON configuration', 'error');
          }
        }
      },
      error: (err: any) => {
        this.loadingLayout = false;
        console.error('Failed to fetch layout details', err);
        this.toastService.show('Failed to load selected layout template', 'error');
      }
    });
  }

  toggleLayoutMode(mode: 'configured' | 'default'): void {
    this.activeLayoutMode = mode;
  }

  getActiveTestGroup(): FormGroup {
    if (!this.resultForm) return this.fb.group({});
    const plansFA = this.resultForm.get('plans') as FormArray;
    if (!plansFA || plansFA.length <= this.activePlanIndex) return this.fb.group({});
    const planGroup = plansFA.at(this.activePlanIndex) as FormGroup;
    const testsFA = planGroup?.get('tests') as FormArray;
    if (!testsFA || testsFA.length === 0) return this.fb.group({});
    return testsFA.at(0) as FormGroup;
  }

  getActiveParametersFormArray(): FormArray {
    return (this.getActiveTestGroup()?.get('parameters') as FormArray) || this.fb.array([]);
  }

  @ViewChildren(ConfiguredTestLayoutRendererComponent) configuredRenderers!: QueryList<ConfiguredTestLayoutRendererComponent>;

  getActivePlannedQuantity(): number {
    const plan = this.plans[this.activePlanIndex];
    return Number(plan?.plannedQuantity || plan?.quantity || plan?.tests?.[0]?.plannedQuantity || 1);
  }

  getActiveSpecimenCount(): number {
    const plan = this.plans[this.activePlanIndex];
    return Math.max(1, Number(plan?.tests?.[0]?.totalSpecimens || plan?.totalSpecimens || plan?.plannedQuantity || plan?.quantity || 1));
  }

  getActivePlanSpecimenCount(p: number): number {
    const plan = this.plans[p];
    if (!plan) return 1;
    return Math.max(1, Number(plan.tests?.[0]?.totalSpecimens || plan.totalSpecimens || plan.plannedQuantity || plan.quantity || 1));
  }

  private getPrimaryLayoutSection(): any {
    const sections: any[] = this.currentTestLayout?.sections || this.currentTestLayout?.parsedConfig?.sections || [];
    return sections.find((s: any) => s?.type === 'specimen' || s?.type === 'spm')
      || sections.find((s: any) => s?.type === 'parameter' || s?.type === 'param')
      || null;
  }

  private laboratoryTestService = inject(LaboratoryTestService);
  /** Headers where the user explicitly clicked "Sync Lab Test" to pull actual Lab Test Master parameters. */
  syncedFromLabTestHeaders: Record<number, boolean> = {};

  private isSectionTemplateConfigured(sec: any): boolean {
    if (!sec?.config) return false;
    const dm = String(sec.config.sectionDataMode || '').trim().toLowerCase();
    if (dm === 'template' || dm === 'template_configured') return true;
    if (dm === 'runtime' || dm === 'auto_load') return false;
    const pm = String(sec.config.parameterMode || '').trim().toLowerCase();
    const hasTableRows = Array.isArray(sec.config.tableRows) && sec.config.tableRows.length > 0;
    return (pm.includes('subset') || pm.includes('template')) && hasTableRows;
  }

  /**
   * Returns ordered active parameter keys (`id:<id>` or `name:<lower>`) when the active layout's
   * primary section is in Template Configured mode, or `null` in Runtime Auto-Load / Synced mode.
   * Works even when Tab 2 is open and `<app-configured-test-layout-renderer>` is unmounted.
   */
  getActiveLayoutParameterKeys(planIndex?: number, testIndex?: number): string[] | null {
    const p = planIndex ?? this.activePlanIndex ?? 0;
    const t = testIndex ?? 0;
    if (p !== this.activePlanIndex) return null;

    const headerId = this.plans?.[p]?.tests?.[t]?.headerId;
    if (headerId != null && this.syncedFromLabTestHeaders[headerId]) return null;

    if (this.layoutRendererComponent) {
      return this.layoutRendererComponent.getActiveLayoutParameterKeys();
    }

    const sec = this.getPrimaryLayoutSection();
    if (!sec || !this.isSectionTemplateConfigured(sec)) return null;

    const tableRows: any[] = Array.isArray(sec?.config?.tableRows) ? sec.config.tableRows : [];
    const layoutRows = tableRows.filter(r => r?.visible !== false && r?.rowSource !== 'custom_text' && r?.rowOrigin !== 'custom' && !r?.isStatic && r?.source !== 'static' && r?.bindingMode !== 'static');
    if (!layoutRows.length) return null;

    const paramsFA = this.getParameters(p, t);
    const rawRows: any[] = paramsFA?.getRawValue?.() || this.plans?.[p]?.tests?.[t]?.parameters || [];
    const baseRows = rawRows.filter(r => (Number(r?.specimenIndex) || 0) === 0);
    const norm = (v: any) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const keyOf = (r: any) => (r?.parameterID != null && Number(r.parameterID) !== 0)
      ? `id:${r.parameterID}`
      : `name:${String(r?.parameterName || '').trim().toLowerCase()}`;

    const keys: string[] = [];
    const used = new Set<string>();
    for (const lr of layoutRows) {
      const targetId = lr.dbMasterId ?? lr.parameterId ?? lr.parameterID ?? null;
      let matched = targetId != null
        ? baseRows.find(b => b.parameterID != null && Number(b.parameterID) === Number(targetId) && !used.has(keyOf(b)))
        : undefined;
      if (!matched) {
        const want = [lr.dbMasterName, lr.sourceName, lr.label].map(norm).filter(Boolean);
        matched = baseRows.find(b => want.includes(norm(b.parameterName)) && !used.has(keyOf(b)));
      }
      if (matched) {
        const k = keyOf(matched);
        used.add(k);
        keys.push(k);
      }
    }
    // Include manually added (+ Add Parameter) runtime rows
    for (const b of baseRows) {
      const k = keyOf(b);
      if (b.isAdditional && !used.has(k)) {
        used.add(k);
        keys.push(k);
      }
    }
    return keys.length ? keys : null;
  }

  /**
   * Explicitly loads / syncs parameters directly from the Lab Test Master hierarchy
   * (AnalysisType -> SubGroup -> LabTest -> fallback Test Method) into the active test.
   * Never runs automatically in Template Configured mode — only on explicit user click.
   */
  onSyncFromLabTest(planIndex: number, testIndex: number, sec?: any): void {
    const plan = this.plans?.[planIndex];
    const test = plan?.tests?.[testIndex];
    if (!plan || !test) return;

    const applyMasterParams = (masterList: any[], sourceLabel: string) => {
      const paramsFA = this.getParameters(planIndex, testIndex);
      if (!paramsFA) return;
      const existingRaw: any[] = paramsFA.getRawValue();
      const spmCount = Math.max(1, this.getActiveSpecimenCount());
      const norm = (v: any) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

      let updatedCount = 0;
      let addedCount = 0;

      const normalized = (masterList || []).map((item: any) => {
        const pObj = item?.parameter || item;
        const pId = Number(pObj?.id ?? item?.parameterId ?? item?.parameterID ?? 0) || null;
        const pName = String(pObj?.name ?? item?.parameterName ?? '').trim();
        const unit = String(pObj?.parameterUnit?.name ?? item?.parameterUnit ?? item?.unit ?? '').trim();
        const isCalculated = !!(pObj?.isCalculated ?? item?.isCalculated);
        const formulaExpression = String(pObj?.formula ?? item?.formulaExpression ?? item?.formula ?? '').trim();
        const formulaDisplay = String(pObj?.formulaDisplay ?? item?.formulaDisplay ?? '').trim();
        const inputType = String(pObj?.inputType ?? item?.inputType ?? (pObj?.parameterType === 'Qualitative' ? 'Text' : 'Decimal'));
        const decimalPrecision = pObj?.decimalPrecision ?? item?.decimalPrecision ?? 2;
        return { pId, pName, unit, isCalculated, formulaExpression, formulaDisplay, inputType, decimalPrecision };
      }).filter(m => !!m.pName);

      for (const m of normalized) {
        const matchingIndices: number[] = [];
        existingRaw.forEach((r, idx) => {
          const sameId = m.pId != null && r.parameterID != null && Number(r.parameterID) === m.pId;
          const sameName = norm(r.parameterName) === norm(m.pName);
          if (sameId || sameName) matchingIndices.push(idx);
        });

        if (matchingIndices.length > 0) {
          matchingIndices.forEach(idx => {
            const grp = paramsFA.at(idx) as FormGroup;
            if (!grp) return;
            const patch: any = {};
            if (m.unit && !grp.get('unit')?.value) patch.unit = m.unit;
            if (m.formulaExpression) {
              patch.formulaExpression = m.formulaExpression;
              patch.isCalculated = true;
            }
            if (m.formulaDisplay) patch.formulaDisplay = m.formulaDisplay;
            if (Object.keys(patch).length > 0) {
              grp.patchValue(patch, { emitEvent: false });
            }
          });
          updatedCount++;
        } else {
          for (let s = 0; s < spmCount; s++) {
            paramsFA.push(this.createParamGroup({
              id: 0,
              specimenIndex: s,
              parameterID: m.pId,
              parameterName: m.pName,
              unit: m.unit,
              value: null,
              remarks: '',
              minValue: null,
              maxValue: null,
              isWithinLimit: null,
              formulaExpression: m.formulaExpression,
              formulaDisplay: m.formulaDisplay,
              isAdditional: true,
              isCalculated: m.isCalculated || !!m.formulaExpression,
              inputType: m.inputType,
              decimalPrecision: m.decimalPrecision,
              isReportable: true,
              isBillable: true
            }, plan.type));
          }
          addedCount++;
        }
      }

      if (test.headerId != null) {
        this.syncedFromLabTestHeaders[test.headerId] = true;
      }
      this.layoutRendererComponent?.markSyncedFromLabTest(sec);
      this.applyConditionLines(planIndex, testIndex, false);
      this.autoEvaluateAllFormulas();
      this.refreshPlanMetrics();
      this.cdr.markForCheck();

      const msg = addedCount > 0
        ? `Synced from ${sourceLabel}: ${addedCount} added, ${updatedCount} updated.`
        : `Synced from ${sourceLabel}: all ${updatedCount} parameter(s) up to date.`;
      this.toastService.show(msg, 'success');
    };

    const fallbackMethodSync = () => {
      if (test.headerId && plan.methodId) {
        this.testResultService.getMethodParametersForHeader(test.headerId, plan.methodId).subscribe({
          next: (list: any[]) => applyMasterParams(list || [], 'Lab Test Method Master'),
          error: () => this.toastService.show('Could not fetch parameters from Lab Test Master.', 'error')
        });
      } else {
        // Reveal all loaded parameters from header even when no master link IDs exist
        if (test.headerId != null) this.syncedFromLabTestHeaders[test.headerId] = true;
        this.layoutRendererComponent?.markSyncedFromLabTest(sec);
        this.applyConditionLines(planIndex, testIndex, false);
        this.refreshPlanMetrics();
        this.cdr.markForCheck();
        this.toastService.show('Synced parameters from Test Plan.', 'info');
      }
    };

    if (plan.analysisTypeId) {
      this.laboratoryTestService.getAnalysisTypeDetails(Number(plan.analysisTypeId)).subscribe({
        next: (at: any) => {
          const list = at?.parameters || [];
          if (list.length) applyMasterParams(list, 'Lab Test Master (Analysis Type)');
          else fallbackMethodSync();
        },
        error: () => fallbackMethodSync()
      });
    } else if (plan.subGroupId) {
      this.laboratoryTestService.getSubGroupDetails(Number(plan.subGroupId)).subscribe({
        next: (sg: any) => {
          const list = sg?.parameters || [];
          if (list.length) applyMasterParams(list, 'Lab Test Master (Sub-Group)');
          else fallbackMethodSync();
        },
        error: () => fallbackMethodSync()
      });
    } else if (plan.labTestId) {
      this.laboratoryTestService.getSubGroupsByLabTest(Number(plan.labTestId)).subscribe({
        next: (subGroups: any[]) => {
          const firstSg = Array.isArray(subGroups) && subGroups.length > 0 ? subGroups[0] : null;
          if (firstSg?.id) {
            this.laboratoryTestService.getSubGroupDetails(Number(firstSg.id)).subscribe({
              next: (sg: any) => {
                const list = sg?.parameters || [];
                if (list.length) applyMasterParams(list, 'Lab Test Master');
                else fallbackMethodSync();
              },
              error: () => fallbackMethodSync()
            });
          } else {
            fallbackMethodSync();
          }
        },
        error: () => fallbackMethodSync()
      });
    } else {
      fallbackMethodSync();
    }
  }

  /** Active specimen display labels (e.g. ['S.NO.1', 'S.NO.2']) consistent across Tab 1 & Tab 2. */
  getActiveSpecimenLabels(): string[] {
    if (this.layoutRendererComponent) {
      const rendererLabels = this.layoutRendererComponent.getSpecimenDisplayLabels();
      if (rendererLabels?.length) return rendererLabels;
    }
    const count = this.getActiveSpecimenCount();
    const sec = this.getPrimaryLayoutSection();
    const cfg = sec?.config || {};
    const namedRows: string[] = Array.isArray(cfg.specimenRows)
      ? cfg.specimenRows.map((x: any) => String(x ?? '').trim())
      : [];
    const namedCsv: string[] = typeof cfg.specimenNames === 'string' && cfg.specimenNames.trim()
      ? cfg.specimenNames.split(',').map((x: string) => x.trim())
      : [];
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const custom = namedRows[i] || namedCsv[i];
      labels.push(custom || `S${i + 1}`);
    }
    return labels;
  }

  /** Decision rule basis synced with Tab 1's Statement of Conformity card (ISO/IEC 17025 Cl 7.8.6). */
  getActiveDecisionRuleInfo(): { label: string; withMU: boolean } {
    if (this.layoutRendererComponent) {
      const basis = this.layoutRendererComponent.ruleBasis();
      return { label: basis.basis, withMU: basis.withMU };
    }
    const sections: any[] = this.currentTestLayout?.sections || this.currentTestLayout?.parsedConfig?.sections || [];
    const ruleCfg = sections.find((s: any) => s?.type === 'rule')?.config || null;
    const source: 'inward' | 'scope' | 'fixed' =
      ruleCfg?.verdictSource === 'scope' || ruleCfg?.verdictSource === 'fixed' ? ruleCfg.verdictSource : 'inward';
    const conformity = String(this.inward?.statementOfConformity ?? '').trim().toLowerCase();
    const rule = String(this.inward?.decisionRule ?? '').trim().toLowerCase();
    const inwardApplicable = conformity === 'applicable';
    const inwardWithMU = inwardApplicable && rule.startsWith('with ') && !rule.startsWith('without');
    if (source === 'fixed') {
      return { label: 'Fixed text of the layout', withMU: false };
    }
    if (source === 'scope') {
      const activeTest = this.plans?.[this.activePlanIndex]?.tests?.[0];
      const inScope = activeTest ? this.isNablAccredited(activeTest) : false;
      if (!inScope) {
        return { label: 'Lab scope: outside the accredited scope, without measurement uncertainty', withMU: false };
      }
      return {
        label: `Lab scope: within the accredited scope, ${inwardWithMU ? 'with' : 'without'} measurement uncertainty`,
        withMU: inwardWithMU
      };
    }
    if (!inwardApplicable) {
      return { label: 'Sample inward: statement of conformity not applicable', withMU: false };
    }
    return {
      label: `Sample inward: ${inwardWithMU ? 'with' : 'without'} measurement uncertainty`,
      withMU: inwardWithMU
    };
  }

  getActiveDecisionRuleLabel(): string {
    return this.getActiveDecisionRuleInfo().label;
  }

  getActiveDecisionRuleWithMU(): boolean {
    return this.getActiveDecisionRuleInfo().withMU;
  }

  /**
   * Builds the Conformity Assessment column visibility & labels directly from the active Result Entry
   * layout configuration so Tab 2 matches Tab 1 (with Verdict and Scope Status always appended).
   */
  private verdictColConfigCache: { key: string; val: VerdictColumnConfig } | null = null;

  getActiveVerdictColumnConfig(): VerdictColumnConfig {
    const sec = this.getPrimaryLayoutSection();
    const cfg = sec?.config || {};
    const cols: any[] = Array.isArray(cfg.tableColumns) ? cfg.tableColumns : [];
    const roleMap: Record<string, string[]> = {
      param: ['row_label', 'param_name', 'parameter_name', 'label'],
      unit: ['unit'],
      requirement: ['spec_requirement', 'requirement', 'limit'],
      avg: ['agg_average', 'average', 'avg'],
      uncertainty: ['uncertainty', 'mu']
    };
    const findCol = (key: string) =>
      cols.find((c: any) => c?.key === key) ||
      cols.find((c: any) => (roleMap[key] || []).includes(String(c?.columnRole || '').trim().toLowerCase()));
    const labelOf = (key: string, fallback: string) => {
      const c = findCol(key);
      return c && typeof c.label === 'string' && c.label.trim() ? c.label.trim() : fallback;
    };
    const inTableCols = (key: string) => {
      const c = findCol(key);
      return !!c && c.visible !== false;
    };

    const strictTemplate = !!sec && this.isSectionTemplateConfigured(sec) && cols.length > 0;
    const val: VerdictColumnConfig = {
      paramLabel: labelOf('param', 'Parameter Name'),
      unitLabel: labelOf('unit', 'Unit'),
      requirementLabel: labelOf('requirement', 'Requirement'),
      avgLabel: labelOf('avg', 'Average'),
      showUnit: strictTemplate ? inTableCols('unit') : cfg.showUnit !== false,
      showRequirement: strictTemplate ? inTableCols('requirement') : cfg.showRequirement !== false,
      showAverage: strictTemplate ? inTableCols('avg') : cfg.showAverage !== false,
      showUncertainty: strictTemplate ? inTableCols('uncertainty') : !!cfg.columns?.uncertainty,
      showDecisionDetail: false
    };
    const key = JSON.stringify(val);
    if (!this.verdictColConfigCache || this.verdictColConfigCache.key !== key) {
      this.verdictColConfigCache = { key, val };
    }
    return this.verdictColConfigCache.val;
  }

  // ----------------------------------------------------------------
  // Task L8.1: Specimen Size Prompt & Dimensions Management
  // ----------------------------------------------------------------
  specimenSizeModalVisible = false;
  activeSizePlanIndex = 0;
  activeSizeTestIndex = 0;
  specimenSizeProfile: 'round' | 'flat' | 'pipe' = 'round';
  specimenSizeDiameter: number | null = null;
  specimenSizeThickness: number | null = null;
  specimenSizeWidth: number | null = null;
  specimenSizeOuterDiameter: number | null = null;
  specimenSizeWallThickness: number | null = null;
  specimenSizeLength: number | null = null;
  specimenSizeGaugeLength: number | null = null;
  specimenSizeArea: number | null = null;
  isSavingSpecimenSize = false;

  isSpecimenSizeRequired(test?: any): boolean {
    if (!test) test = this.plans[this.activePlanIndex]?.tests?.[0];
    if (!test) return false;
    const name = String(test.name || test.laboratoryTest || test.leafNode || '').toLowerCase();
    const technique = String(test.analysisTechnique || '').toLowerCase();
    if (name.includes('tensile') || name.includes('yield') || name.includes('proof') || name.includes('uts') ||
      technique.includes('tensile') || technique.includes('yield') || technique.includes('proof')) {
      return true;
    }
    if (this.currentTestLayout && (this.currentTestLayout.sections || []).some((s: any) => s.type === 'spm' || s.type === 'specimen')) {
      return true;
    }
    const priceSummary = this.priceSummaryMap[test.headerId];
    if (priceSummary?.availablePricingTypes?.includes('SizeRange') || priceSummary?.availablePricingTypes?.includes('SizeAndLoad') ||
      priceSummary?.selectedPricingType === 'SizeRange' || priceSummary?.selectedPricingType === 'SizeAndLoad') {
      return true;
    }
    return false;
  }

  private cachedSpecimenDims: Record<number, { diameter?: number | null; thickness?: number | null; width?: number | null; area?: number | null }> = {};

  private getPrimarySpecimenDims(planIndex: number, testIndex: number): { diameter?: number | null; thickness?: number | null; width?: number | null; area?: number | null } | null {
    const test = this.plans?.[planIndex]?.tests?.[testIndex];
    const headerId = test?.headerId;
    const live = planIndex === this.activePlanIndex ? this.layoutRendererComponent?.specimens?.[0] : null;
    if (live && ((live.diameter && live.diameter > 0) || (live.thickness && live.thickness > 0) || (live.area && live.area > 0))) {
      const snap = { diameter: live.diameter, thickness: live.thickness, width: live.width, area: live.area };
      if (headerId != null) this.cachedSpecimenDims[headerId] = snap;
      return snap;
    }
    if (headerId != null && this.cachedSpecimenDims[headerId]) {
      return this.cachedSpecimenDims[headerId];
    }
    const formRows = (this.getParameters(planIndex, testIndex)?.getRawValue?.() || test?.parameters || [])
      .filter((r: any) => !(Number(r?.specimenIndex) > 0));
    const numOf = (role: TensileRole) => {
      const pm = findByTensileRole(formRows, role, (x: any) => x?.parameterName);
      const n = pm?.value != null && pm.value !== '' ? Number(pm.value) : NaN;
      return isFinite(n) && n > 0 ? n : null;
    };
    const diameter = numOf('diameter');
    const thickness = numOf('thickness');
    const width = numOf('width');
    const area = numOf('area');
    if (diameter || thickness || area) {
      return { diameter, thickness, width, area };
    }
    return live || null;
  }

  hasSpecimenSize(planIndex?: number, testIndex?: number): boolean {
    const p = planIndex ?? this.activePlanIndex ?? 0;
    const t = testIndex ?? 0;
    const test = this.plans?.[p]?.tests?.[t];
    if (!test) return false;
    if (test.pricingDimensionValue && Number(test.pricingDimensionValue) > 0) return true;
    const spm = this.getPrimarySpecimenDims(p, t);
    if (spm && ((spm.diameter && spm.diameter > 0) || (spm.thickness && spm.thickness > 0) || (spm.area && spm.area > 0))) return true;
    if (Number(this.sample?.diameter) > 0 || (Number(this.sample?.thickness) > 0 && Number(this.sample?.width) > 0) || Number(this.sample?.crossSectionArea) > 0) return true;
    const formRows = this.getParameters(p, t)?.getRawValue?.() || test.parameters || [];
    const dimParam = (role: TensileRole) => findByTensileRole(formRows, role, (pm: any) => pm?.parameterName);
    const numPos = (pm: any) => pm?.value != null && pm.value !== '' && Number(pm.value) > 0;
    if (numPos(dimParam('diameter')) || numPos(dimParam('thickness')) || numPos(dimParam('area'))) return true;
    return false;
  }

  hasSpecimenSizeForHeader(headerId: number): boolean {
    const plan = this.plans?.find((p: any) => p.tests?.some((t: any) => t.headerId === headerId));
    const pIdx = plan ? this.plans.indexOf(plan) : -1;
    const tIdx = plan?.tests?.findIndex((t: any) => t.headerId === headerId) ?? -1;
    if (pIdx < 0 || tIdx < 0) return true;
    return this.hasSpecimenSize(pIdx, tIdx);
  }

  getSpecimenSizeDisplay(planIndex?: number, testIndex?: number): string {
    const p = planIndex ?? this.activePlanIndex ?? 0;
    const t = testIndex ?? 0;
    const test = this.plans?.[p]?.tests?.[t];
    const spm = this.getPrimarySpecimenDims(p, t);
    if (spm) {
      if (spm.diameter && spm.diameter > 0) return `⌀ ${spm.diameter} mm`;
      if (spm.thickness && spm.width) return `${spm.thickness} × ${spm.width} mm`;
      if (spm.area && spm.area > 0) return `${spm.area} mm²`;
    }
    if (test?.pricingDimensionValue && Number(test.pricingDimensionValue) > 0) {
      return `⌀ ${test.pricingDimensionValue} mm`;
    }
    if (Number(this.sample?.diameter) > 0) {
      return `⌀ ${this.sample.diameter} mm`;
    }
    if (Number(this.sample?.thickness) > 0 && Number(this.sample?.width) > 0) {
      return `${this.sample.thickness} × ${this.sample.width} mm`;
    }
    return 'Set Size';
  }

  getSpecimenSizeSummary(planIndex?: number, testIndex?: number): string {
    const p = planIndex ?? this.activePlanIndex ?? 0;
    const t = testIndex ?? 0;
    const test = this.plans?.[p]?.tests?.[t];
    const spm = this.getPrimarySpecimenDims(p, t);
    if (spm) {
      if (spm.diameter && spm.diameter > 0) return `Round Bar: ⌀ ${spm.diameter} mm (Area: ${spm.area || '-'} mm²)`;
      if (spm.thickness && spm.width) return `Flat Plate: ${spm.thickness} × ${spm.width} mm (Area: ${spm.area || '-'} mm²)`;
    }
    if (test?.pricingDimensionValue && Number(test.pricingDimensionValue) > 0) {
      return `Pricing Dimension: ⌀ ${test.pricingDimensionValue} mm`;
    }
    if (Number(this.sample?.diameter) > 0) {
      return `Sample Diameter: ⌀ ${this.sample.diameter} mm`;
    }
    if (Number(this.sample?.thickness) > 0 && Number(this.sample?.width) > 0) {
      return `Sample Size: ${this.sample.thickness} × ${this.sample.width} mm`;
    }
    return 'Configure specimen cross-section dimensions';
  }

  shouldShowSpecimenSizePrompt(): boolean {
    const plan = this.plans[this.activePlanIndex];
    return !!plan;
  }

  openSpecimenSizeModal(planIndex?: number, testIndex?: number): void {
    if (this.isViewMode || this.isActiveTestFinalized()) return;
    this.activeSizePlanIndex = planIndex ?? this.activePlanIndex ?? 0;
    this.activeSizeTestIndex = testIndex ?? 0;
    const test = this.plans?.[this.activeSizePlanIndex]?.tests?.[this.activeSizeTestIndex];
    const spm = this.layoutRendererComponent?.specimens?.[0];

    const sampleDiam = Number(this.sample?.diameter) || null;
    const sampleThick = Number(this.sample?.thickness) || null;
    const sampleWidth = Number(this.sample?.width) || null;
    const sampleLen = Number(this.sample?.length) || null;
    const sampleGaugeLen = Number(this.sample?.gaugeLength) || null;
    const pricingDim = Number(test?.pricingDimensionValue) || null;

    if (spm?.thickness && spm?.width) {
      this.specimenSizeProfile = 'flat';
      this.specimenSizeThickness = spm.thickness;
      this.specimenSizeWidth = spm.width;
      this.specimenSizeDiameter = null;
    } else if (spm?.diameter || pricingDim || sampleDiam) {
      this.specimenSizeProfile = 'round';
      this.specimenSizeDiameter = spm?.diameter || pricingDim || sampleDiam;
      this.specimenSizeThickness = null;
      this.specimenSizeWidth = null;
    } else if (sampleThick && sampleWidth) {
      this.specimenSizeProfile = 'flat';
      this.specimenSizeThickness = sampleThick;
      this.specimenSizeWidth = sampleWidth;
      this.specimenSizeDiameter = null;
    } else {
      this.specimenSizeProfile = 'round';
      this.specimenSizeDiameter = null;
      this.specimenSizeThickness = null;
      this.specimenSizeWidth = null;
    }

    this.specimenSizeLength = sampleLen || 300;
    this.specimenSizeGaugeLength = spm?.gaugeLength || sampleGaugeLen || 50;
    this.onSpecimenSizeDimensionChange();
    this.specimenSizeModalVisible = true;
  }

  closeSpecimenSizeModal(): void {
    this.specimenSizeModalVisible = false;
  }

  setSpecimenSizeProfile(profile: 'round' | 'flat' | 'pipe'): void {
    this.specimenSizeProfile = profile;
    this.onSpecimenSizeDimensionChange();
  }

  onSpecimenSizeDimensionChange(): void {
    if (this.specimenSizeProfile === 'round') {
      const d = Number(this.specimenSizeDiameter);
      if (d > 0) {
        this.specimenSizeArea = parseFloat((Math.PI * Math.pow(d / 2, 2)).toFixed(2));
        this.specimenSizeGaugeLength = parseFloat((5.65 * Math.sqrt(this.specimenSizeArea)).toFixed(2));
      } else {
        this.specimenSizeArea = null;
      }
    } else if (this.specimenSizeProfile === 'flat') {
      const t = Number(this.specimenSizeThickness);
      const w = Number(this.specimenSizeWidth);
      if (t > 0 && w > 0) {
        this.specimenSizeArea = parseFloat((t * w).toFixed(2));
        this.specimenSizeGaugeLength = parseFloat((5.65 * Math.sqrt(this.specimenSizeArea)).toFixed(2));
      } else {
        this.specimenSizeArea = null;
      }
    } else if (this.specimenSizeProfile === 'pipe') {
      const od = Number(this.specimenSizeOuterDiameter);
      const wt = Number(this.specimenSizeWallThickness);
      if (od > 0 && wt > 0 && od > wt) {
        this.specimenSizeArea = parseFloat((Math.PI * (od - wt) * wt).toFixed(2));
        this.specimenSizeGaugeLength = parseFloat((5.65 * Math.sqrt(this.specimenSizeArea)).toFixed(2));
      } else {
        this.specimenSizeArea = null;
      }
    }
  }

  applySpecimenSize(): void {
    const test = this.plans?.[this.activeSizePlanIndex]?.tests?.[this.activeSizeTestIndex];
    if (!test) return;
    const headerId = test.headerId;

    let dimValue: number | null = null;
    if (this.specimenSizeProfile === 'round') {
      dimValue = Number(this.specimenSizeDiameter) || null;
    } else if (this.specimenSizeProfile === 'flat') {
      dimValue = Number(this.specimenSizeThickness) || null;
    } else if (this.specimenSizeProfile === 'pipe') {
      dimValue = Number(this.specimenSizeOuterDiameter) || null;
    }

    this.isSavingSpecimenSize = true;
    const payload = {
      pricingType: 'SizeRange',
      dimensionValue: dimValue != null ? String(dimValue) : null
    };

    this.testResultService.setPricingWithValue(headerId, payload).subscribe({
      next: (summary) => {
        this.isSavingSpecimenSize = false;
        test.pricingDimensionValue = payload.dimensionValue;
        if (summary) {
          this.priceSummaryMap[headerId] = summary;
        }

        if (this.layoutRendererComponent) {
          this.layoutRendererComponent.applySpecimenSizeDimensions({
            diameter: this.specimenSizeProfile === 'round' ? this.specimenSizeDiameter : null,
            thickness: this.specimenSizeProfile === 'flat' ? this.specimenSizeThickness : null,
            width: this.specimenSizeProfile === 'flat' ? this.specimenSizeWidth : null,
            area: this.specimenSizeArea,
            gaugeLength: this.specimenSizeGaugeLength
          });
        }

        this.closeSpecimenSizeModal();
        this.toastService.show('Specimen size applied to test and specimens', 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSavingSpecimenSize = false;
        console.error('Failed to update specimen size pricing', err);
        test.pricingDimensionValue = payload.dimensionValue;
        if (this.layoutRendererComponent) {
          this.layoutRendererComponent.applySpecimenSizeDimensions({
            diameter: this.specimenSizeProfile === 'round' ? this.specimenSizeDiameter : null,
            thickness: this.specimenSizeProfile === 'flat' ? this.specimenSizeThickness : null,
            width: this.specimenSizeProfile === 'flat' ? this.specimenSizeWidth : null,
            area: this.specimenSizeArea,
            gaugeLength: this.specimenSizeGaugeLength
          });
        }
        this.closeSpecimenSizeModal();
        this.toastService.show('Specimen size applied', 'success');
        this.cdr.markForCheck();
      }
    });
  }

  /** Completed, pending-verification and verified tests: no specimen count or layout change from the toolbar. */
  isToolbarLocked(status?: string): boolean {
    return ['Completed', 'PendingVerification', 'Verified'].includes(status || '');
  }

  isActiveTestFinalized(): boolean {
    return this.isToolbarLocked(this.plans[this.activePlanIndex]?.tests?.[0]?.status);
  }

  onWorkbenchSpecimenCountAdjust(delta: number): void {
    if (this.isViewMode || this.isActiveTestFinalized()) return;
    const current = this.getActiveSpecimenCount();
    const next = Math.max(1, Math.min(20, current + delta));
    this.updateWorkbenchSpecimenCount(next);
  }

  onWorkbenchSpecimenInputChange(event: Event): void {
    if (this.isViewMode || this.isActiveTestFinalized()) return;
    const input = event.target as HTMLInputElement;
    const val = Number(input.value);
    if (!isNaN(val) && val >= 1) {
      this.updateWorkbenchSpecimenCount(Math.min(20, Math.max(1, Math.round(val))));
    } else {
      input.value = String(this.getActiveSpecimenCount());
    }
  }

  updateWorkbenchSpecimenCount(count: number): void {
    const plan = this.plans[this.activePlanIndex];
    if (plan) {
      plan.totalSpecimens = count;
      if (plan.tests?.[0]) {
        plan.tests[0].totalSpecimens = count;
      }
    }
    if (this.configuredRenderers && this.configuredRenderers.length > 0) {
      this.configuredRenderers.filter(r => !r.printMode).forEach(r => r.setSpecimenCount(count));
    } else {
      // If configured renderers are not active in DOM (e.g. user is on Info tab), resize FormArray directly
      // Same rules as the layout table: rows carry their specimen index, saved rows are reused, and a specimen
      // that holds results is not removed
      const tg = this.getActiveTestGroup();
      const paramsFA = tg?.get('parameters') as FormArray;
      const store: SpecimenRowStore = plan?.tests?.[0] || {};
      if (paramsFA && paramsFA.length > 0) {
        let current = Math.max(1, ...specimenIndexesOf(paramsFA).map(s => s + 1));
        const clone = (src: any, specimen: number) => this.createParamGroup({
          ...src,
          id: 0,
          value: null,
          convertedValue: null,
          resultStatus: null,
          isWithinLimit: null,
          remarks: '',
          specimenIndex: specimen
        }, plan?.type);
        while (current < count) {
          addSpecimenRows(paramsFA, current, store, clone);
          current++;
        }
        while (current > count) {
          const blockingRow = removeSpecimenRows(paramsFA, current - 1, store);
          if (blockingRow) {
            this.toastService.show(`Specimen S${current} has results (${blockingRow}). Clear its values before removing the specimen.`, 'warning');
            break;
          }
          current--;
        }
        if (plan) {
          plan.totalSpecimens = current;
          if (plan.tests?.[0]) plan.tests[0].totalSpecimens = current;
        }
      }
    }
    this.autoEvaluateAllFormulas();
    this.cdr.markForCheck();
  }

  onWorkbenchSpecimenCountChanged(count: number): void {
    const plan = this.plans[this.activePlanIndex];
    if (plan) {
      plan.totalSpecimens = count;
      if (plan.tests?.[0]) {
        plan.tests[0].totalSpecimens = count;
      }
    }
    this.autoEvaluateAllFormulas();
    this.cdr.markForCheck();
  }

  hasCalculationSection(layout: any): boolean {
    if (!layout) return false;
    const sections = layout.sections || layout.parsedConfig?.sections || [];
    return sections.some((s: any) => s.type === 'formula' || s.type === 'calc');
  }

  onConfiguredParamChanged(event: { rowIdx: number; param: any }): void {
    this.onValueChanged(this.activePlanIndex, 0, event.rowIdx);
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
          conditionLabTestId: generalTest.conditionLabTestId ?? null,
          conditionMethodId: generalTest.conditionMethodId ?? null,
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
          parentLabTestId: chemicalTest.parentLabTestId || null,
          conditionLabTestId: chemicalTest.conditionLabTestId ?? null,
          conditionMethodId: chemicalTest.conditionMethodId ?? null,
          standard: chemicalTest.standard || null,
          standardName: chemicalTest.standardName || '',
          specification1: chemicalTest.specification1,
          specification2: chemicalTest.specification2,
          specfication1Name: chemicalTest.specfication1Name || '',
          specfication2Name: chemicalTest.specfication2Name || '',
          techniqueCodes: chemicalTest.techniqueCodes || [],
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
      caseNo: apiData.inward?.caseNo || '',
      customerName: apiData.inward?.customerName || '',
      customerAddress: apiData.inward?.customerAddress || '',
      poNo: apiData.inward?.poNo || '',
      receivedOn: apiData.inward?.receivedOn ? this.formatDateDisplay(apiData.inward.receivedOn) : '',
      statementOfConformity: apiData.inward?.statementOfConformity || '',
      decisionRule: apiData.inward?.decisionRule || '',
      sampleReceiptNote: apiData.inward?.sampleReceiptNote || ''
    };

    // Set Sample Details
    const sampleData = apiData.sample || {};
    this.sample = {
      sampleNo: sampleData.sampleNo || '',
      sampleStatus: sampleData.sampleStatus || '',
      material: sampleData.details || sampleData.productMasterName || '',
      metalClassification: sampleData.metalClassification || '',
      productCondition: sampleData.productCondition || '',
      productForm: sampleData.productForm || '',
      productMasterName: sampleData.productMasterName || '',
      productSizeDescription: sampleData.productSizeDescription || '',
      productSizeFormatted: sampleData.productSizeFormatted || (sampleData.productForm ? sampleData.productForm : '-'),
      batchNo: sampleData.batchNo || this.getBatchNoFromAdditionalDetails(sampleData.additionalDetails),
      heatNo: sampleData.heatNo || this.getBatchNoFromAdditionalDetails(sampleData.additionalDetails),
      stampedAs: sampleData.stampedAs || sampleData.details || '',
      natureOfSample: sampleData.natureOfSample || sampleData.productForm || sampleData.productMasterName || '',
      heatTreatment: sampleData.heatTreatment || '',
      specimenOrientation: sampleData.specimenOrientation || '',
      remarks: sampleData.remarks || '',
      details: sampleData.details || '',
      additionalDetails: Array.isArray(sampleData.additionalDetails) ? sampleData.additionalDetails : [],
      thickness: sampleData.thickness,
      diameter: sampleData.diameter,
      width: sampleData.width,
      length: sampleData.length,
      crossSectionArea: sampleData.crossSectionArea,
      gaugeLength: sampleData.gaugeLength,
      id: sampleData.id || this.sampleId,
      specificationGradeID: sampleData.specificationGradeID || null,
      assignedGradeID: sampleData.assignedGradeID || null,
      specificationGradeName: sampleData.specificationGradeName || sampleData.assignedGradeName || ''
    };

    // Map Plans
    this.plans = [];

    (apiData.plans || []).forEach((plan: any) => {
      // Map General Tests
      (plan.generalTests || []).forEach((generalTest: any, gtIdx: number) => {
        const specification = this.buildSpecificationName(
          generalTest.specfication1Name,
          generalTest.specfication2Name,
          generalTest,
          sampleData
        );

        const plannedQuantity = Number(generalTest.plannedQuantity || generalTest.quantity || 1);
        const hasSpmSec = layoutHasSpecimenSection(generalTest.layoutSnapshotJson);
        const keepExtra = hasSpmSec || plannedQuantity > 1;
        const validParams = filterEmptyExtraSpecimenRows(generalTest.parameters || [], keepExtra, {
          readings: generalTest.readings,
          testImages: generalTest.testImages
        });
        const declaredSpmCount = hasSpmSec ? layoutDeclaredSpecimenCount(generalTest.layoutSnapshotJson) : 0;
        // In-header specimen count: honour planned quantity, layout declared count, and highest saved SpecimenIndex
        const totalSpecimens = Math.max(1, plannedQuantity, declaredSpmCount, resolveSpecimenCount(validParams, 1));
        const sequenceNo = generalTest.sequenceNo || 1;
        const baseName = generalTest.laboratoryTest || 'General Test';
        const testName = baseName;

        const methodName = generalTest.standardName || '';
        const specName = specification && specification !== 'Unknown' ? specification : '';
        const genPlan: any = {
          type: 'General',
          plannedQuantity: plannedQuantity,
          totalSpecimens: totalSpecimens,
          discipline: generalTest.discipline || 'Mechanical',
          analysisTechnique: generalTest.analysisTechnique || generalTest.laboratoryTest || '—',
          sampleType: sampleData.productForm || sampleData.productMasterName || sampleData.productCondition || '—',
          sampling: sampleData.sampling || apiData.inward?.sampleReceiptNote || '—',
          specimenPreparation: sampleData.specimenPreparation || '—',
          reportFormatName: generalTest.reportFormatName || sampleData.reportFormatName || '—',
          reportFormatId: generalTest.reportFormatId || sampleData.reportFormatId || null,
          specification: specification,
          grade: '',
          headerId: generalTest.headerId,
          pricingDimensionValue: generalTest.pricingDimensionValue || null,
          selectedPricingType: generalTest.selectedPricingType || null,
          labTestId: (generalTest as any).laboratoryTestId || null,
          subGroupId: (generalTest as any).subGroupId || (generalTest as any).laboratoryTestSubGroupID || null,
          analysisTypeId: (generalTest as any).analysisTypeId || (generalTest as any).analysisTypeID || null,
          leafNode: (generalTest as any).leafNode || generalTest.laboratoryTest || null,
          methodId: generalTest.standard || null,
          methodName: methodName,
          methodSelected: generalTest.standard ? { id: generalTest.standard, name: methodName || `Method #${generalTest.standard}` } : null,
          specSelected: generalTest.specification1 ? { id: generalTest.specification1, name: specName || `Spec #${generalTest.specification1}` } : null,
          specimenLabel: null,
          tests: [
            {
              id: `gen-${generalTest.headerId}`,
              headerId: generalTest.headerId,
              name: testName,
              plannedQuantity: plannedQuantity,
              totalSpecimens: totalSpecimens,
              pricingDimensionValue: generalTest.pricingDimensionValue || null,
              selectedPricingType: generalTest.selectedPricingType || null,
              reportNo: generalTest.reportNo || `Auto-${gtIdx}`,
              status: generalTest.status || 'Pending',
              testPurpose: generalTest.testPurpose || '',
              remarks: generalTest.remarks || '',
              isNabl: generalTest.isNabl ?? false,
              equipmentId: generalTest.equipmentId || null,
              roomTemperature: generalTest.roomTemperature ?? null,
              roomHumidity: generalTest.roomHumidity ?? null,
              layoutTemplateId: generalTest.layoutTemplateId ?? null,
              layoutVersion: generalTest.layoutVersion || '1.0',
              layoutSnapshotJson: generalTest.layoutSnapshotJson || null,
              executionExtraJson: generalTest.executionExtraJson || null,
              readings: generalTest.readings,
              locations: generalTest.locations,
              traversePoints: generalTest.traversePoints,
              checklist: generalTest.checklist,
              observations: generalTest.observations,
              // Saved rows that hold a value or remark in the database: a row cleared on screen cannot be removed until saved
              savedResultIds: savedResultIdsOf(validParams),
              // Every saved row is kept; each row carries its own specimen index (see specimen-grouping.ts)
              parameters: (() => {
                const allParams = validParams;
                const specimenIndexes = resolveSpecimenIndexes(allParams);
                return allParams.map((param: any, rowIdx: number) => ({
                  id: param.id,
                  specimenIndex: specimenIndexes[rowIdx] ?? 0,
                  parameterID: param.parameterID || null,
                  parameterName: param.parameterName || '',
                  unit: param.unit || '',
                  value: param.value ?? null,
                  remarks: param.remarks ?? '',
                  minValue: param.minValue ?? null,
                  maxValue: param.maxValue ?? null,
                  isWithinLimit: param.isWithinLimit ?? null,
                  formulaExpression: param.formulaExpression || '',
                  formulaDisplay: param.formulaDisplay || '',
                  specMinValue: param.specMinValue ?? null,
                  specMaxValue: param.specMaxValue ?? null,
                  acceptanceCriteria: param.acceptanceCriteria || '',
                  specificationLineID: param.specificationLineID ?? null,
                  isAdditional: param.isAdditional ?? false,
                  isCalculated: param.isCalculated || !!param.formulaExpression || false,
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
                  isBillable: param.isBillable ?? true,
                  isReportable: param.isReportable !== false,
                  inputType: param.inputType || (param.parameterType === 'Qualitative' ? 'Text' : 'Decimal'),
                  dropdownOptions: param.dropdownOptions || []
                }));
              })()
            }
          ]
        };

        this.plans.push(genPlan);
      });

      // Map Chemical Tests
      (plan.chemicalTests || []).forEach((chemicalTest: any) => {
        const specification = this.buildSpecificationName(
          chemicalTest.specfication1Name,
          chemicalTest.specfication2Name,
          chemicalTest,
          sampleData
        );

        const chemPlannedQuantity = Number(chemicalTest.plannedQuantity || chemicalTest.quantity || 1);
        const chemHasSpmSec = layoutHasSpecimenSection(chemicalTest.layoutSnapshotJson);
        const chemKeepExtra = chemHasSpmSec || chemPlannedQuantity > 1;
        const chemValidParams = filterEmptyExtraSpecimenRows(chemicalTest.parameters || [], chemKeepExtra, {
          readings: chemicalTest.readings,
          testImages: chemicalTest.testImages
        });
        const chemDeclaredCount = chemHasSpmSec ? layoutDeclaredSpecimenCount(chemicalTest.layoutSnapshotJson) : 0;
        const chemTotalSpecimens = Math.max(1, chemPlannedQuantity, chemDeclaredCount, resolveSpecimenCount(chemValidParams, 1));
        const chemPlan: any = {
          type: 'Chemical',
          plannedQuantity: chemPlannedQuantity,
          totalSpecimens: chemTotalSpecimens,
          discipline: chemicalTest.discipline || 'Chemical',
          analysisTechnique: chemicalTest.analysisTechnique || '—',
          sampleType: sampleData.productForm || sampleData.productMasterName || sampleData.productCondition || '—',
          sampling: sampleData.sampling || apiData.inward?.sampleReceiptNote || '—',
          specimenPreparation: sampleData.specimenPreparation || '—',
          reportFormatName: chemicalTest.reportFormatName || sampleData.reportFormatName || '—',
          reportFormatId: chemicalTest.reportFormatId || sampleData.reportFormatId || null,
          specification: specification,
          grade: '',
          headerId: chemicalTest.headerId,
          pricingDimensionValue: chemicalTest.pricingDimensionValue || null,
          selectedPricingType: chemicalTest.selectedPricingType || null,
          methodId: chemicalTest.standard || null,
          methodName: chemicalTest.standardName || '',
          methodSelected: chemicalTest.standard ? { id: chemicalTest.standard, name: chemicalTest.standardName || `Method #${chemicalTest.standard}` } : null,
          specSelected: chemicalTest.specification1 ? { id: chemicalTest.specification1, name: (specification && specification !== 'Unknown' ? specification : `Spec #${chemicalTest.specification1}`) } : null,
          techniqueCodes: chemicalTest.techniqueCodes || [],
          labTestId: chemicalTest.labTestId || null,
          subGroupId: (chemicalTest as any).subGroupId || (chemicalTest as any).laboratoryTestSubGroupID || null,
          analysisTypeId: (chemicalTest as any).analysisTypeId || (chemicalTest as any).analysisTypeID || null,
          leafNode: (chemicalTest as any).leafNode || chemicalTest.laboratoryTest || null,
          parentLabTestId: chemicalTest.parentLabTestId || null,
          tests: [
            {
              id: `chem-${chemicalTest.headerId}`,
              headerId: chemicalTest.headerId,
              name: chemicalTest.laboratoryTest || 'Chemical Test',
              plannedQuantity: chemPlannedQuantity,
              totalSpecimens: chemTotalSpecimens,
              pricingDimensionValue: chemicalTest.pricingDimensionValue || null,
              selectedPricingType: chemicalTest.selectedPricingType || null,
              reportNo: chemicalTest.reportNo || `Auto-${chemicalTest.headerId}`,
              status: chemicalTest.status || 'Pending',
              testPurpose: chemicalTest.testPurpose || '',
              remarks: chemicalTest.remarks || '',
              isNabl: chemicalTest.isNabl ?? false,
              equipmentId: chemicalTest.equipmentId || null,
              roomTemperature: chemicalTest.roomTemperature ?? null,
              roomHumidity: chemicalTest.roomHumidity ?? null,
              layoutTemplateId: chemicalTest.layoutTemplateId ?? null,
              layoutVersion: chemicalTest.layoutVersion || '1.0',
              layoutSnapshotJson: chemicalTest.layoutSnapshotJson || null,
              executionExtraJson: chemicalTest.executionExtraJson || null,
              readings: chemicalTest.readings,
              locations: chemicalTest.locations,
              traversePoints: chemicalTest.traversePoints,
              checklist: chemicalTest.checklist,
              observations: chemicalTest.observations,
              savedResultIds: savedResultIdsOf(chemValidParams),
              parameters: (() => {
                const allParams = chemValidParams;
                const specimenIndexes = resolveSpecimenIndexes(allParams);
                return allParams.map((param: any, rowIdx: number) => ({
                  id: param.id,
                  specimenIndex: specimenIndexes[rowIdx] ?? 0,
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
                  formulaDisplay: param.formulaDisplay || '',
                  specMinValue: param.specMinValue ?? null,
                  specMaxValue: param.specMaxValue ?? null,
                  acceptanceCriteria: param.acceptanceCriteria || '',
                  specificationLineID: param.specificationLineID ?? null,
                  isAdditional: param.isAdditional ?? false,
                  isCalculated: param.isCalculated || !!param.formulaExpression || false,
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
                  isBillable: param.isBillable ?? true,
                  isReportable: param.isReportable !== false,
                  inputType: param.inputType || (param.parameterType === 'Qualitative' ? 'Text' : 'Decimal'),
                  dropdownOptions: param.dropdownOptions || []
                }))
              })()
            }
          ]
        };

        this.plans.push(chemPlan);
      });
    });

    // Populate globalParamMap from all mapped parameters
    (this.plans || []).forEach((pl: any) => {
      pl.tests?.forEach((t: any) => {
        t.parameters?.forEach((pm: any) => {
          const id = pm.parameterID || pm.id;
          const name = pm.parameterName || pm.name;
          if (id && name) {
            this.globalParamMap[Number(id)] = String(name).trim();
          }
        });
      });
    });

    // Store timing/environment info per header and fetch environment data
    (apiData.plans || []).forEach((plan: any) => {
      const allTests = [...(plan.generalTests || []), ...(plan.chemicalTests || [])];
      allTests.forEach((test: any) => {
        if (test.headerId) {
          if (test.roomTemperature != null || test.roomHumidity != null) {
            this.environmentMap[test.headerId] = {
              roomTemperature: test.roomTemperature,
              roomHumidity: test.roomHumidity,
              labRoomName: test.labRoomName || ''
            };
          }
          this.testTimingMap[test.headerId] = {
            testStartTime: test.testStartTime || '',
            testEndTime: test.testEndTime || '',
            performedByName: test.performedByName || ''
          };
          // Parse equipment IDs if available
          if (test.equipmentIdsJson) {
            try {
              const saved = JSON.parse(test.equipmentIdsJson);
              this.selectedEquipmentMap[test.headerId] = (Array.isArray(saved) ? saved : [])
                .map((x: any) => (typeof x === 'object' && x ? x : { id: Number(x) }))
                .filter((x: any) => x.id > 0);
              this.selectedEquipmentMap[test.headerId].forEach((e: any) => this.loadEquipmentDetails(test.headerId, e.id));
            } catch (e) {
              this.selectedEquipmentMap[test.headerId] = [];
            }
          }
          // Nothing saved yet: take the equipment linked to this test (sub-group / analysis type) in the master
          if (!(this.selectedEquipmentMap[test.headerId] || []).length && !this.isViewMode && !this.isTestFinalized(test.status)) {
            this.autoAssignLinkedEquipment(test.headerId, test.subGroupId || test.laboratoryTestSubGroupID, test.analysisTypeId || test.analysisTypeID);
          }
          // Fetch environment data
          this.fetchEnvironmentData(test.headerId);
          if (test.executionExtraJson) {
            try {
              const extra = typeof test.executionExtraJson === 'string' ? JSON.parse(test.executionExtraJson) : test.executionExtraJson;
              if (extra?.selectedConditions) {
                this.selectedConditionsMap[test.headerId] = extra.selectedConditions;
              }
            } catch (e) { }
          }
          this.restoreSpecConditions(test);
        }
      });
    });

    // Build left-rail condition dropdowns from each test's grade lines
    this.plans.forEach((pl: any, pIdx: number) => (pl.tests || []).forEach((_t: any, tIdx: number) => this.initConditionEngine(pIdx, tIdx)));

    // Truthful empty state: never fabricate plans when API returns none
    this.payloadLoaded = true;
    if (this.plans.length === 0) {
      this.toastService.show('No test plans found for this sample. Create a sample plan first.', 'warning');
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

          testGroup.patchValue({
            testPurpose: generalTest.testPurpose || '',
            remarks: generalTest.remarks || ''
          });

          (generalTest.parameters || []).forEach((param: any) => {
            const paramGroup = parametersArray.controls.find(c => {
              const cId = c.get('id')?.value;
              if (cId && param.id && Number(cId) === Number(param.id)) return true;
              return Number(c.get('parameterID')?.value) === Number(param.parameterID) &&
                Number(c.get('specimenIndex')?.value) === Number(param.specimenIndex || 0);
            }) as FormGroup;
            if (paramGroup) {
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

          testGroup.patchValue({
            testPurpose: chemicalTest.testPurpose || '',
            remarks: chemicalTest.remarks || ''
          });

          (chemicalTest.parameters || []).forEach((param: any) => {
            const paramGroup = parametersArray.controls.find(c => {
              const cId = c.get('id')?.value;
              if (cId && param.id && Number(cId) === Number(param.id)) return true;
              return Number(c.get('parameterID')?.value) === Number(param.parameterID) &&
                Number(c.get('specimenIndex')?.value) === Number(param.specimenIndex || 0);
            }) as FormGroup;
            if (paramGroup) {
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

  private buildSpecificationName(
    spec1Name?: string,
    spec2Name?: string,
    test?: any,
    sample?: any
  ): string {
    const s1 = (spec1Name || '').trim();
    const s2 = (spec2Name || '').trim();
    if (s1 && s2) return `${s1} / ${s2}`;
    if (s1) return s1;
    if (s2) return s2;

    // No named specification on plan: check if limits exist on parameters or test
    const params = test?.parameters || [];
    const hasSpecLimit =
      (test?.specificationLineID != null && Number(test.specificationLineID) > 0) ||
      params.some((p: any) =>
        (p?.specificationLineID != null && Number(p.specificationLineID) > 0) ||
        p?.specMinValue != null ||
        p?.specMaxValue != null ||
        p?.minValue != null ||
        p?.maxValue != null
      );

    if (!hasSpecLimit) {
      return 'Unknown';
    }

    // Limit comes from grade default: show real source (grade / "Grade default")
    const grade = (
      test?.gradeName ||
      test?.specificationGradeName ||
      test?.grade ||
      sample?.specificationGradeName ||
      sample?.assignedGradeName ||
      sample?.grade ||
      ''
    ).trim();

    return grade ? `${grade} (Grade default)` : 'Grade default';
  }

  // ----------------------------------------------------------------
  // 2. Build Main Form
  // ----------------------------------------------------------------
  buildForm(): void {
    this.resultForm = this.fb.group({
      plans: this.fb.array(this.plans.map(plan => this.createPlanGroup(plan)))
    });
    this.watchResultForm();
  }

  get plansFA(): FormArray {
    return (this.resultForm?.get('plans') as FormArray) || this.fb.array([]);
  }

  createPlanGroup(plan: any): FormGroup {
    return this.fb.group({
      type: [plan.type],
      specification: [plan.specification],
      grade: [plan.grade],
      headerId: [plan.headerId],
      tests: this.fb.array(plan.tests.map((t: any) => this.createTestGroup(t, plan.type)))
    });
  }

  getTests(planIndex: number): FormArray {
    return (this.plansFA?.at(planIndex)?.get('tests') as FormArray) || this.fb.array([]);
  }

  createTestGroup(test: any, planType: string): FormGroup {
    return this.fb.group({
      id: [test.id],
      headerId: [test.headerId],
      name: [test.name],
      reportNo: [test.reportNo],
      testPurpose: [test.testPurpose || ''],
      remarks: [test.remarks || ''],
      roomTemperature: [test.roomTemperature ?? null],
      roomHumidity: [test.roomHumidity ?? null],
      layoutTemplateId: [test.layoutTemplateId ?? null],
      layoutVersion: [test.layoutVersion || '1.0'],
      layoutSnapshotJson: [test.layoutSnapshotJson || null],
      executionExtraJson: [test.executionExtraJson || null],
      parameters: this.fb.array(test.parameters.map((p: any) => this.createParamGroup(p, planType)))
    });
  }

  getParameters(planIndex: number, testIndex: number): FormArray {
    return (this.getTests(planIndex)?.at(testIndex)?.get('parameters') as FormArray) || this.fb.array([]);
  }

  createParamGroup(p: any, planType?: string): FormGroup {
    // For chemical tests require minValue and maxValue validators
    const minValidators = (planType === 'Chemical') ? [Validators.required] : [];
    const maxValidators = (planType === 'Chemical') ? [Validators.required] : [];

    const isCalculated = p.isCalculated === true || !!p.formulaExpression || !!p.formula;
    const inputType = p.inputType || (p.parameterType === 'Qualitative' ? 'Text' : 'Decimal');

    return this.fb.group({
      id: [p.id || 0],
      // Specimen this row belongs to (0 = S1); saved with the row so a reload groups rows the same way
      specimenIndex: [Number(p.specimenIndex) > 0 ? Math.floor(Number(p.specimenIndex)) : 0],
      parameterID: [p.parameterID, Validators.required],
      parameterName: [p.parameterName],
      unit: [p.unit],
      value: [p.value],
      remarks: [p.remarks],
      minValue: [planType === 'Chemical' ? (p.minValue ?? 0) : (p.minValue ?? null), minValidators],
      maxValue: [planType === 'Chemical' ? (p.maxValue ?? 0) : (p.maxValue ?? null), maxValidators],
      isWithinLimit: [p.isWithinLimit ?? null],
      altered: [p.altered || false],
      formulaExpression: [p.formulaExpression || p.formula || ''],
      formulaDisplay: [p.formulaDisplay || ''],
      isCalculated: [isCalculated],
      inputType: [inputType],
      dropdownOptions: [p.dropdownOptions || []],
      specMinValue: [p.specMinValue ?? null],
      specMaxValue: [p.specMaxValue ?? null],
      acceptanceCriteria: [p.acceptanceCriteria || ''],
      // Specification line this row's limits came from (saved with the row for traceability)
      specificationLineID: [p.specificationLineID ?? null],
      isAdditional: [p.isAdditional ?? false],
      // Screen-only text for the chip under the requirement (which spec line / size range applied); not saved
      specSource: [p.specSource || ''],
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
      isBillable: [p.isBillable ?? true],
      isReportable: [p.isReportable !== false]
    });
  }

  // ----------------------------------------------------------------
  // 3. Add / Remove parameter rows
  // ----------------------------------------------------------------
  addParameter(planIndex: number, testIndex: number): void {
    const parametersArray = this.getParameters(planIndex, testIndex);
    const planType = this.plansFA?.at(planIndex)?.get('type')?.value;

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
    this.switchTab('execution');
    this.toastService.show('New parameter row added. Please select parameter.', 'info');

    setTimeout(() => {
      const rows = document.querySelectorAll('.result-table tbody tr');
      if (rows && rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        lastRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = lastRow.querySelector('input:not([readonly]), select, button, .dropdown-toggle') as HTMLElement;
        if (focusable) {
          focusable.focus();
        }
      }
    }, 200);
  }

  removeParameter(planIndex: number, testIndex: number, paramIndex: number): void {
    const paramGroup = this.getParameters(planIndex, testIndex).at(paramIndex);
    const paramId = paramGroup?.value?.id;
    const paramName = paramGroup?.value?.parameterName || `Row ${paramIndex + 1}`;

    // If parameter exists in DB (has ID), delete from backend first, then remove from UI
    if (paramId && paramId > 0) {
      this.askConfirm('Delete parameter', `Delete parameter "${paramName}"? This cannot be undone.`, () => {
        this.testResultService.deleteParameter(paramId).subscribe({
          next: () => {
            this.getParameters(planIndex, testIndex).removeAt(paramIndex);
            this.toastService.show('Parameter removed', 'success');
          },
          error: (err: any) => {
            this.toastService.show(err?.error?.message || 'Failed to delete parameter from server', 'error');
          }
        });
      }, { confirmLabel: 'Delete', variant: 'danger' });
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

    if (this.isSavingResult) return;
    this.isSavingResult = true;
    this.testResultService.saveTestResult(payload).subscribe({
      next: (response) => {
        this.isSavingResult = false;
        this.equipmentDirty = {};
        this.toastService.show(response.message, 'success');
        this.resultSaved.emit(response);
      },
      error: (error) => {
        this.isSavingResult = false;
        console.error("Error saving results:", error);
        this.toastService.show("Error saving test results", 'error');
      }
    });
  }

  saveTestWise(planIndex: number, testIndex: number, onSaved?: (res?: any) => void): void {
    // One save at a time: a second click before the first returns would send new rows (id 0) twice
    if (this.isSavingResult) return;
    const planGroup = (this.resultForm.get('plans') as FormArray).at(planIndex) as FormGroup;
    const testGroup = (planGroup.get('tests') as FormArray).at(testIndex) as FormGroup;
    const testParams = testGroup.get('parameters') as FormArray;

    if (!testParams || testParams.length === 0) {
      this.toastService.show('No parameters to save', 'warning');
      return;
    }

    if (this.layoutRendererComponent && planIndex === this.activePlanIndex) {
      this.layoutRendererComponent.syncCollectionsToTest();
    }

    const testObj = this.plans[planIndex]?.tests?.[testIndex] || {};
    const headerId = testObj.headerId;
    const equipmentIds = this.selectedEquipmentMap[headerId] || [];
    const equipmentIdsJson = equipmentIds.length > 0 ? JSON.stringify(equipmentIds.map((e: any) => e.id || e)) : null;

    const apiGeneral = this.apiMetadata.generalTests.find((gt: any) => gt.headerId === headerId);
    const apiChemical = this.apiMetadata.chemicalTests.find((ct: any) => ct.headerId === headerId);

    const payload: any = {
      inwardId: this.apiMetadata.inwardId,
      sampleId: this.apiMetadata.sampleId,
      planId: this.apiMetadata.planId,
      generalTests: [],
      chemicalTests: []
    };

    const isCurrentActive = planIndex === this.activePlanIndex;
    const layoutTemplateId = testGroup.get('layoutTemplateId')?.value || testObj.layoutTemplateId || (isCurrentActive ? this.currentTestLayout?.id : null);
    const rawVersion = testGroup.get('layoutVersion')?.value || testObj.layoutVersion || (isCurrentActive ? this.currentTestLayout?.version : 1);
    const layoutVersion = typeof rawVersion === 'number' ? Math.floor(rawVersion) : (parseInt(String(rawVersion).replace(/[^0-9]/g, ''), 10) || 1);
    const layoutSnapshotJson = (isCurrentActive && this.currentTestLayout) ? JSON.stringify(this.currentTestLayout) : (testGroup.get('layoutSnapshotJson')?.value || testObj.layoutSnapshotJson || null);
    const executionExtraJson = this.mergeSelectedConditions(testObj.executionExtraJson || (isCurrentActive && this.layoutRendererComponent ? this.layoutRendererComponent.getExecutionExtraJson() : null), testObj.headerId);

    const commonData = {
      headerId,
      equipmentIdsJson,
      testPurpose: testGroup.get('testPurpose')?.value || '',
      remarks: testGroup.get('remarks')?.value || '',
      roomTemperature: testGroup.get('roomTemperature')?.value ?? null,
      roomHumidity: testGroup.get('roomHumidity')?.value ?? null,
      layoutTemplateId: layoutTemplateId || null,
      layoutVersion: layoutVersion || 1,
      layoutSnapshotJson: layoutSnapshotJson || null,
      retestOfHeaderId: testObj.retestOfHeaderId || null,
      retestReasonCode: testObj.retestReasonCode || null,
      executionExtraJson: executionExtraJson || null,
      ...this.getSpecConditionPayload(testObj.headerId),
      readings: testObj.readings,
      locations: testObj.locations,
      traversePoints: testObj.traversePoints,
      checklist: testObj.checklist,
      observations: testObj.observations,
      parameters: testParams.value.map((p: any) => ({
        id: p.id || 0, // new rows (added in this session) have no id yet
        parameterID: p.parameterID,
        parameterName: p.parameterName,
        unit: p.unit,
        value: (p.value !== '' && p.value !== null && p.value !== undefined && !isNaN(Number(p.value))) ? Number(p.value) : (p.value ?? null),
        remarks: p.remarks,
        minValue: p.minValue,
        maxValue: p.maxValue,
        // The limit source of the row: the server stores exactly what the screen applied
        specMinValue: p.specMinValue ?? null,
        specMaxValue: p.specMaxValue ?? null,
        acceptanceCriteria: p.acceptanceCriteria || null,
        specificationLineID: p.specificationLineID ?? null,
        isAdditional: p.isAdditional ?? false,
        specFieldsSent: true,
        isWithinLimit: p.isWithinLimit,
        altered: p.altered || false,
        formula: p.formulaExpression || '',
        testMethodUsed: p.testMethodUsed || '',
        convertedValue: p.convertedValue ?? null,
        selectedUnit: p.selectedUnit || '',
        isBillable: p.isBillable ?? true,
        isReportable: p.isReportable !== false,
        specimenIndex: Number(p.specimenIndex) > 0 ? Number(p.specimenIndex) : 0
      })),
      // Saved rows removed on the screen (only empty rows are removed; the API refuses rows with values)
      removedParameterIds: [...(testObj.removedParameterIds || [])] as number[],
      discardedParameterIds: [...(testObj.discardedParameterIds || [])] as number[]
    };

    if (apiGeneral) {
      payload.generalTests.push({
        ...commonData,
        generalTestId: apiGeneral.generalTestId,
        testMethodId: apiGeneral.testMethodId,
        laboratoryTestId: apiGeneral.laboratoryTestId
      });
    } else if (apiChemical) {
      payload.chemicalTests.push({
        ...commonData,
        chemicalTestId: apiChemical.chemicalTestId,
        generalTestId: apiChemical.chemicalTestId,
        testMethodId: apiChemical.testMethodId,
        laboratoryTestId: apiChemical.laboratoryTestId || apiChemical.labTestId
      });
    }

    const testName = testObj.name || 'Test';
    this.isSavingResult = true;
    this.testResultService.saveTestResult(payload).subscribe({
      next: (response) => {
        this.isSavingResult = false;
        this.equipmentDirty[headerId] = false;
        // Remember which rows now hold a saved value (uses the rows exactly as sent, before new ids are patched in)
        updateSavedResultIds(
          testObj as SpecimenRowStore,
          commonData.parameters,
          response?.saved?.[0]?.parameterIds || [],
          commonData.removedParameterIds
        );
        this.applySavedParameterIds(testParams, response);
        // Removed rows are gone from the database now
        const sentRemoved = commonData.removedParameterIds;
        if (sentRemoved.length && Array.isArray(testObj.removedParameterIds)) {
          testObj.removedParameterIds = testObj.removedParameterIds.filter((id: number) => !sentRemoved.includes(id));
          testObj.discardedParameterIds = (testObj.discardedParameterIds || []).filter((id: number) => !sentRemoved.includes(id));
        }
        this.toastService.show(`${testName} — saved successfully`, 'success');
        this.resultSaved.emit(response);
        if (onSaved) {
          // Defer reload to the caller (e.g., completeTest / startTest) to prevent mid-flight payload overwrite races
          onSaved(response);
        } else {
          // Automatically evaluate formula parameters on backend
          this.calculateParameters(planIndex, testIndex);
        }
      },
      error: (error) => {
        this.isSavingResult = false;
        this.toastService.show(`Error saving ${testName}`, 'error');
      }
    });
  }

  /** True while a save request is running; Save Draft / Complete are blocked until it returns. */
  isSavingResult = false;

  /**
   * The save response lists the saved row IDs per test in the order they were sent.
   * Rows added on this screen (id 0) take their new ID at once, so a second save updates them instead of inserting again.
   */
  private applySavedParameterIds(testParams: FormArray, response: any): void {
    const ids: any[] = response?.saved?.[0]?.parameterIds || [];
    if (!testParams || ids.length !== testParams.length) return;
    ids.forEach((id, i) => {
      const ctrl = testParams.at(i)?.get('id');
      if (ctrl && !ctrl.value && Number(id) > 0) ctrl.setValue(Number(id), { emitEvent: false });
    });
  }

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
    if (this.layoutRendererComponent) {
      this.layoutRendererComponent.syncCollectionsToTest();
    }

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
        const testObj = this.plans[planIdx]?.tests?.[testIdx] || {};
        const headerId = testObj.headerId || plan.headerId;
        const testParams = test.parameters;

        // Determine if general or chemical test
        const apiGeneral = this.apiMetadata.generalTests.find((gt: any) => gt.headerId === headerId);
        const apiChemical = this.apiMetadata.chemicalTests.find((ct: any) => ct.headerId === headerId);

        // Get equipment for this header
        const equipmentIds = this.selectedEquipmentMap[headerId] || [];
        const equipmentIdsJson = equipmentIds.length > 0 ? JSON.stringify(equipmentIds.map((e: any) => e.id || e)) : null;

        const isCurrentActive = planIdx === this.activePlanIndex;
        const layoutTemplateId = test.layoutTemplateId || testObj.layoutTemplateId || (isCurrentActive ? this.currentTestLayout?.id : null);
        const rawVersion = test.layoutVersion || testObj.layoutVersion || (isCurrentActive ? this.currentTestLayout?.version : 1);
        const layoutVersion = typeof rawVersion === 'number' ? Math.floor(rawVersion) : (parseInt(String(rawVersion).replace(/[^0-9]/g, ''), 10) || 1);
        const layoutSnapshotJson = (isCurrentActive && this.currentTestLayout) ? JSON.stringify(this.currentTestLayout) : (test.layoutSnapshotJson || testObj.layoutSnapshotJson || null);
        const executionExtraJson = this.mergeSelectedConditions(testObj.executionExtraJson || (isCurrentActive && this.layoutRendererComponent ? this.layoutRendererComponent.getExecutionExtraJson() : null), testObj.headerId);

        const commonData = {
          headerId: headerId,
          equipmentIdsJson: equipmentIdsJson,
          testPurpose: test.testPurpose || '',
          remarks: test.remarks || '',
          roomTemperature: test.roomTemperature ?? null,
          roomHumidity: test.roomHumidity ?? null,
          layoutTemplateId: layoutTemplateId || null,
          layoutVersion: layoutVersion || 1,
          layoutSnapshotJson: layoutSnapshotJson || null,
          retestOfHeaderId: testObj.retestOfHeaderId || null,
          retestReasonCode: testObj.retestReasonCode || null,
          executionExtraJson: executionExtraJson || null,
          ...this.getSpecConditionPayload(testObj.headerId),
          readings: testObj.readings,
          locations: testObj.locations,
          traversePoints: testObj.traversePoints,
          checklist: testObj.checklist,
          observations: testObj.observations,
          parameters: testParams.map((param: any) => ({
            id: param.id || 0, // new rows (added in this session) have no id yet
            parameterID: param.parameterID,
            parameterName: param.parameterName,
            unit: param.unit,
            value: param.value,
            remarks: param.remarks,
            minValue: param.minValue,
            maxValue: param.maxValue,
            specMinValue: param.specMinValue ?? null,
            specMaxValue: param.specMaxValue ?? null,
            acceptanceCriteria: param.acceptanceCriteria || null,
            specificationLineID: param.specificationLineID ?? null,
            isAdditional: param.isAdditional ?? false,
            specFieldsSent: true,
            isWithinLimit: param.isWithinLimit,
            altered: param.altered || false,
            formula: param.formulaExpression || '',
            testMethodUsed: param.testMethodUsed || '',
            convertedValue: param.convertedValue ?? null,
            selectedUnit: param.selectedUnit || '',
            isBillable: param.isBillable ?? true,
            isReportable: param.isReportable !== false,
            specimenIndex: Number(param.specimenIndex) > 0 ? Number(param.specimenIndex) : 0
          })),
          removedParameterIds: [...(testObj.removedParameterIds || [])] as number[],
          discardedParameterIds: [...(testObj.discardedParameterIds || [])] as number[]
        };

        if (apiGeneral) {
          payload.generalTests.push({
            ...commonData,
            generalTestId: apiGeneral.generalTestId,
            testMethodId: apiGeneral.testMethodId,
            laboratoryTestId: apiGeneral.laboratoryTestId
          });
        } else if (apiChemical) {
          payload.chemicalTests.push({
            ...commonData,
            chemicalTestId: apiChemical.chemicalTestId,
            generalTestId: apiChemical.chemicalTestId,
            testMethodId: apiChemical.testMethodId,
            laboratoryTestId: apiChemical.laboratoryTestId || apiChemical.labTestId
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
    const planType = this.plansFA?.at(planIndex)?.get('type')?.value; // 'General' or 'Chemical'

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

      // Apply measurement uncertainty guard-band if loaded for this test
      const pId = row.get('parameterID')?.value;
      const test = this.plans[planIndex]?.tests?.[testIndex];
      const unc = test?.headerId ? this.getUncertainty(test.headerId, pId) : null;
      const expandedU = unc?.expandedUncertainty != null ? Number(unc.expandedUncertainty) : 0;

      // Chemical → Pass/Fail/Borderline, Mechanical → Within Range/Under Range/Over Range/Borderline
      let status: string;
      if (planType === 'Chemical') {
        if (!withinLimit) {
          status = 'Fail';
        } else if (expandedU > 0 && ((hasMin && Math.abs(compareValue - min) <= expandedU) || (hasMax && Math.abs(compareValue - max) <= expandedU))) {
          status = 'Borderline';
        } else {
          status = 'Pass';
        }
      } else {
        if (!withinMin) {
          status = 'Under Range';
        } else if (!withinMax) {
          status = 'Over Range';
        } else if (expandedU > 0 && ((hasMin && Math.abs(compareValue - min) <= expandedU) || (hasMax && Math.abs(compareValue - max) <= expandedU))) {
          status = 'Borderline';
        } else {
          status = 'Within Range';
        }
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

  /**
   * Auto-evaluate all formulas across all plans/tests on initial data load.
   * Also validates dependencies and shows warnings for missing parameters.
   */
  autoEvaluateAllFormulas(): void {
    this.formulaDependencyWarnings = {};
    const warnings: string[] = [];

    this.plansFA.controls.forEach((planCtrl, pIdx) => {
      const testsFA = planCtrl.get('tests') as FormArray;
      if (!testsFA) return;

      testsFA.controls.forEach((testCtrl, tIdx) => {
        const params = this.getParameters(pIdx, tIdx);
        if (!params || params.length === 0) return;

        // Build parameter ID set for this test
        const paramIdSet = new Set<number>();
        const paramNameMap: Record<string, string> = {};
        params.controls.forEach(row => {
          const pid = row.get('parameterID')?.value;
          const pname = row.get('ParameterName')?.value || row.get('parameterName')?.value || '';
          if (pid) {
            paramIdSet.add(Number(pid));
            paramNameMap[`P${pid}`] = pname;
          }
        });

        // Check each formula parameter for missing dependencies
        params.controls.forEach((row, rIdx) => {
          const formula = row.get('formulaExpression')?.value;
          if (!formula) return;

          // Extract all P-references from formula
          const pRefs = formula.match(/P(\d+)/g) || [];
          const missingNames: string[] = [];

          for (const ref of pRefs) {
            const refId = Number(ref.replace('P', ''));
            if (!paramIdSet.has(refId)) {
              const friendlyName = this.globalParamMap[refId] || `Parameter #${refId}`;
              missingNames.push(friendlyName);
            }
          }

          if (missingNames.length > 0) {
            const paramName = row.get('ParameterName')?.value || row.get('parameterName')?.value || 'Parameter';
            const key = `${pIdx}-${tIdx}-${rIdx}`;
            this.formulaDependencyWarnings[key] = `Missing: ${missingNames.join(', ')}`;
            warnings.push(`${paramName}: depends on ${missingNames.join(', ')} which are not in this test`);
          }
        });

        // Run formula calculation for this test
        this.recalculateFormulas(pIdx, tIdx);
      });
    });

    if (warnings.length > 0) {
      this.toastService.show(`${warnings.length} formula dependency warning(s) found`, 'warning');
    }
  }

  /** Get formula dependency warning for a specific parameter row */
  getFormulaDependencyWarning(planIndex: number, testIndex: number, paramIndex: number): string | null {
    return this.formulaDependencyWarnings[`${planIndex}-${testIndex}-${paramIndex}`] || null;
  }

  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getChemicalParameterDropdown(term, page, pageSize);

  getMechanicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getMechanicalParameterDropdown(term, page, pageSize);

  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.parameterService.getParameterDropdown(term, page, pageSize);

  getTestMethodSpecDrop = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodService.getTestMethodSpecificationDropdown(term, page, pageSize);

  getSpecGradeDrop = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.materialSpecService.getGradeDropdown(term, page, pageSize);

  getMethodVersionDrop = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.testMethodService.getTestMethodSpecificationVersionDropdown(term, page, pageSize, 0);

  /** Reselect test method standard from result entry — updates underlying plan */
  onTestMethodReselect(planIndex: number, testIndex: number, selectedItem: any): void {
    const test = this.plans[planIndex]?.tests[testIndex];
    if (!test?.headerId || !selectedItem?.id) return;
    this.testResultService.updatePlanMethod({
      headerId: test.headerId,
      testMethodSpecificationID: selectedItem.id
    }).subscribe({
      next: (res: any) => {
        const plan = this.plans[planIndex];
        plan.methodId = res.testMethodSpecificationID ?? selectedItem.id;
        plan.methodName = res.methodName || selectedItem.name;
        plan.methodSelected = { id: plan.methodId, name: plan.methodName };
        this.toastService.show(`Test method updated to ${plan.methodName}`, 'success');
      },
      error: (err: any) => {
        console.error('Error updating test method:', err);
        this.toastService.show(err?.error?.message || 'Failed to update test method', 'error');
      }
    });
  }

  /** Reselect material specification (grade) from result entry — updates underlying plan + sample grade */
  onSpecReselect(planIndex: number, testIndex: number, selectedItem: any): void {
    const test = this.plans[planIndex]?.tests[testIndex];
    if (!test?.headerId || !selectedItem?.id) return;
    this.testResultService.updatePlanMethod({
      headerId: test.headerId,
      specification1: selectedItem.id
    }).subscribe({
      next: (res: any) => {
        const plan = this.plans[planIndex];
        plan.specSelected = { id: res.specification1 ?? selectedItem.id, name: res.specName || selectedItem.name };
        plan.specification = res.specName || selectedItem.name;
        this.toastService.show(`Specification updated to ${plan.specification}. Use Load Parameters to refresh acceptance limits.`, 'success');
      },
      error: (err: any) => {
        console.error('Error updating specification:', err);
        this.toastService.show(err?.error?.message || 'Failed to update specification', 'error');
      }
    });
  }

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
      row.patchValue({
        parameterID: null,
        parameterName: null,
        unit: null,
        inputType: 'Decimal',
        isCalculated: false,
        formulaExpression: '',
        dropdownOptions: []
      });
      return;
    }

    // Skip if same parameter re-selected (e.g., dropdown init on load)
    if (currentParamId === selectedItem.id) return;

    const unit = selectedItem?.additionalValues?.['Unit'] || selectedItem?.unit || row.get('unit')?.value;
    const inputType = selectedItem?.additionalValues?.['InputType'] || selectedItem?.inputType || 'Decimal';
    const isCalculated = selectedItem?.additionalValues?.['IsCalculated'] ?? selectedItem?.isCalculated ?? false;
    const formula = selectedItem?.additionalValues?.['Formula'] || selectedItem?.formula || '';
    const formulaDisplay = selectedItem?.additionalValues?.['FormulaDisplay'] || selectedItem?.formulaDisplay || '';
    const dropdownOptions = selectedItem?.additionalValues?.['DropdownOptions'] || selectedItem?.dropdownOptions || [];
    const decimalPrecision = selectedItem?.additionalValues?.['DecimalPrecision'] ?? selectedItem?.decimalPrecision ?? 2;
    const parameterType = selectedItem?.additionalValues?.['ParameterType'] || selectedItem?.parameterType || '';

    // Parameter actually changed — clear old values and update
    row.patchValue({
      parameterID: selectedItem.id,
      parameterName: selectedItem.name,
      unit: unit,
      inputType: inputType,
      isCalculated: isCalculated || !!formula,
      formulaExpression: formula || formulaDisplay,
      dropdownOptions: dropdownOptions,
      decimalPrecision: decimalPrecision,
      parameterType: parameterType,
      specMinValue: null,
      specMaxValue: null,
      minValue: null,
      maxValue: null,
      value: null,
      isWithinLimit: null,
      resultStatus: null,
    });

    if (formula || isCalculated) {
      this.recalculateFormulas(planIndex, testIndex);
    }
  }

  // ================================================================
  // Test Start / Complete Flow
  // ================================================================
  // Validation & Modal states
  showConfigValidationModal = false;
  configValidationResult: any = null;
  pendingStartTest: { planIndex: number; testIndex: number } | null = null;

  showRequirementDetailModal = false;
  selectedRequirementParam: any = null;

  showReadingsModal = false;
  readingTarget: { planIndex: number; testIndex: number; paramIndex: number } | null = null;
  readingValues: (number | null)[] = [null, null, null];
  calculatedAverage: number = 0;

  isConfigLocked(status: string): boolean {
    if (this.isViewMode) return true;
    return ['Started', 'In-Progress', 'In Progress', 'Completed', 'PendingVerification', 'Verified'].includes(status);
  }

  canStartTest(status: string): boolean {
    if (this.isViewMode) return false;
    return !status || status === 'Pending' || status === 'VerificationRejected';
  }

  canViewRawDataSheet(status?: string): boolean {
    if (!status) return false;
    const completedStatuses = [
      'Completed',
      'PendingVerification',
      'Verified',
      'VerificationRejected',
      'ReportGenerated',
      'REPORT_UNDER_REVIEW',
      'FINAL_REPORT_APPROVED',
      'REPORT_APPROVED',
      'COMPLETED',
      'REPORT_DISPATCHED',
      'Closed'
    ];
    return completedStatuses.includes(status);
  }

  isHardnessTest(test: any): boolean {
    const name = (test?.name || '').toLowerCase();
    return name.includes('hardness') || name.includes('rockwell') || name.includes('brinell') || name.includes('vickers');
  }

  formatRequirement(param: any): string {
    if (!param) return 'Not Specified';
    const rawMin = param.specMinValue != null ? param.specMinValue : param.minValue;
    const rawMax = param.specMaxValue != null ? param.specMaxValue : param.maxValue;
    const unit = (param.unit || param.selectedUnit || '').toString().trim();
    const withUnit = (s: string) => unit ? `${s} ${unit}` : s;
    const hasMin = rawMin !== null && rawMin !== undefined && rawMin !== '' && !isNaN(Number(rawMin));
    const hasMax = rawMax !== null && rawMax !== undefined && rawMax !== '' && !isNaN(Number(rawMax));
    if (hasMin && hasMax) {
      if (Number(rawMin) === Number(rawMax)) return withUnit(`= ${rawMin}`);
      return withUnit(`${rawMin} – ${rawMax}`);
    }
    if (hasMin) return withUnit(`≥ ${rawMin}`);
    if (hasMax) return withUnit(`≤ ${rawMax}`);
    const criteria = (param.acceptanceCriteria || '').toString().trim();
    if (criteria) return criteria;
    return 'Not Specified';
  }

  openRequirementDetails(param: any): void {
    this.selectedRequirementParam = param;
    this.showRequirementDetailModal = true;
  }

  closeRequirementDetails(): void {
    this.showRequirementDetailModal = false;
    this.selectedRequirementParam = null;
  }

  openMultipleReadingsModal(planIndex: number, testIndex: number, paramIndex: number): void {
    this.readingTarget = { planIndex, testIndex, paramIndex };
    const paramGroup = this.getParameters(planIndex, testIndex).at(paramIndex);

    // Check if remarks already has serialized readings array
    const remarks = paramGroup.get('remarks')?.value;
    if (remarks && typeof remarks === 'string' && remarks.startsWith('[') && remarks.endsWith(']')) {
      try {
        const parsed = JSON.parse(remarks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.readingValues = parsed.map(v => (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : null);
          this.recomputeReadingAverage();
          this.showReadingsModal = true;
          return;
        }
      } catch (e) {
        // Fallback to single value
      }
    }

    const currVal = parseFloat(paramGroup.get('value')?.value);
    if (!isNaN(currVal) && currVal > 0) {
      this.readingValues = [currVal, null, null];
    } else {
      this.readingValues = [null, null, null];
    }
    this.recomputeReadingAverage();
    this.showReadingsModal = true;
  }

  addModalReading(): void {
    if (this.readingValues.length < 25) {
      this.readingValues.push(null);
    }
  }

  removeModalReading(index?: number): void {
    if (this.readingValues.length > 1) {
      if (index !== undefined && index >= 0) {
        this.readingValues.splice(index, 1);
      } else {
        this.readingValues.pop();
      }
      this.recomputeReadingAverage();
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  recomputeReadingAverage(): void {
    const valid = this.readingValues.filter(v => v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) > 0) as number[];
    if (valid.length > 0) {
      const sum = valid.reduce((acc, v) => acc + Number(v), 0);
      this.calculatedAverage = parseFloat((sum / valid.length).toFixed(2));
    } else {
      this.calculatedAverage = 0;
    }
  }

  applyMultipleReadings(): void {
    if (!this.readingTarget) return;
    const { planIndex, testIndex, paramIndex } = this.readingTarget;
    const paramGroup = this.getParameters(planIndex, testIndex).at(paramIndex);
    paramGroup.get('value')?.setValue(this.calculatedAverage);
    paramGroup.patchValue({ remarks: JSON.stringify(this.readingValues) });
    this.onValueChanged(planIndex, testIndex, paramIndex);
    this.closeMultipleReadingsModal();
  }

  closeMultipleReadingsModal(): void {
    this.showReadingsModal = false;
    this.readingTarget = null;
  }

  closeConfigValidationModal(): void {
    this.showConfigValidationModal = false;
    this.configValidationResult = null;
    this.pendingStartTest = null;
  }

  // ================================================================
  // Test Start / Complete Flow
  // ================================================================
  startTest(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    if (!headerId && headerId !== 0) {
      this.toastService.show('Test Header ID is missing', 'error');
      return;
    }

    // The server checks the SAVED equipment, so any unsaved/auto-assigned equipment is persisted transparently first
    if (this.equipmentDirty[headerId]) {
      this.saveTestWise(planIndex, testIndex, () => this.continueStartTest(planIndex, testIndex));
      return;
    }

    this.continueStartTest(planIndex, testIndex);
  }

  private continueStartTest(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    // Call configuration validation endpoint
    this.testResultService.validateTestConfiguration(headerId).subscribe({
      next: (valResult) => {
        if (!valResult.isValid) {
          this.configValidationResult = valResult;
          this.pendingStartTest = { planIndex, testIndex };
          this.showConfigValidationModal = true;
          return;
        }

        this.askConfirm('Start test', `Start test "${test.name}"? This will lock test configuration (methods, specifications, parameters) and record start time.`,
          () => this.executeStartTest(planIndex, testIndex), { confirmLabel: 'Start Test' });
      },
      error: (err) => {
        console.warn('Validate test configuration call failed, proceeding with confirm prompt', err);
        this.askConfirm('Start test', `Start test "${test.name}"? This will lock test configuration and record start time.`,
          () => this.executeStartTest(planIndex, testIndex), { confirmLabel: 'Start Test' });
      }
    });
  }

  executeStartTest(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    this.testResultService.startTest(headerId).subscribe({
      next: (response) => {
        test.status = 'Started';
        this.toastService.show('Test started successfully. Configuration locked for execution.', 'success');
        if (response?.testStartTime) {
          this.testTimingMap[headerId] = {
            ...this.testTimingMap[headerId],
            testStartTime: response.testStartTime,
            performedByName: response.performedByName || this.testTimingMap[headerId]?.performedByName
          };
        } else {
          this.fetchEnvironmentData(headerId);
        }
        this.closeConfigValidationModal();
      },
      error: (error) => {
        console.error('Error starting test:', error);
        this.toastService.show('Error starting test: ' + (error?.error?.message || error?.message || 'Server error'), 'error');
      }
    });
  }

  completeTest(planIndex: number, testIndex: number): void {
    if (this.isSavingResult) return; // a save is still running
    const test = this.plans[planIndex].tests[testIndex];
    const headerId = test.headerId;

    const planGroup = (this.resultForm.get('plans') as FormArray).at(planIndex) as FormGroup;
    const testGroup = (planGroup.get('tests') as FormArray).at(testIndex) as FormGroup;
    const testParams = testGroup.get('parameters') as FormArray;

    if (!testParams || testParams.length === 0) {
      this.toastService.show('No parameters found in this test to complete', 'warning');
      return;
    }

    // Check for empty values strictly among active layout parameters (never blocking on unrendered master parameters in Template Configured / Reading-only layouts)
    const rendererForCheck = this.layoutRendererComponent?.test === test ? this.layoutRendererComponent : null;
    const activeKeys = this.getActiveLayoutParameterKeys(planIndex, testIndex);
    const activeKeySet = activeKeys ? new Set(activeKeys) : null;
    const controlsToValidate = activeKeySet
      ? testParams.controls.filter((ctrl) => {
          const pId = ctrl.get('parameterID')?.value;
          const pName = String(ctrl.get('parameterName')?.value || '').trim().toLowerCase();
          const k = pId != null && Number(pId) !== 0 ? `id:${pId}` : `name:${pName}`;
          return activeKeySet.has(k);
        })
      : testParams.controls;

    const readingProgress = rendererForCheck ? rendererForCheck.readingProgress() : { entered: 0, expected: 0 };
    const hasRecordedReadings = readingProgress.entered > 0 || (Array.isArray(test.readings) && test.readings.some((r: any) => r?.isVoided !== true));

    const missingValues = controlsToValidate.filter((ctrl) => {
      // a Text parameter (e.g. Location of Fracture) keeps its result in Remarks
      const raw = ctrl.get('inputType')?.value === 'Text' ? ctrl.get('remarks')?.value : ctrl.get('value')?.value;
      return raw === null || raw === undefined || String(raw).trim() === '';
    });

    if (missingValues.length > 0 && !(readingProgress.expected > 0 && hasRecordedReadings && controlsToValidate.length === 0)) {
      const missingNames = missingValues.map(ctrl => ctrl.get('parameterName')?.value || 'Parameter').slice(0, 3).join(', ');
      this.toastService.show(`Cannot complete test. Missing values for: ${missingNames}${missingValues.length > 3 ? '...' : ''}`, 'error');
      return;
    }

    // What the layout marks as required (notes, conditions, checklist answers)
    const renderer = this.layoutRendererComponent?.test === test ? this.layoutRendererComponent : null;
    let gaps: string[] = [];
    if (renderer) {
      gaps = renderer.requiredGaps();
    } else {
      const testGroup = this.getTests(planIndex)?.at(testIndex) as FormGroup;
      const layout = this.resolveSheetLayout(planIndex, test, testGroup);
      const rawSections = layout ? (layout.sections || layout.parsedConfig?.sections || []) : [];
      gaps = layoutRequiredGaps(rawSections, test.executionExtraJson, test.checklist);
    }
    if (gaps.length > 0) {
      this.toastService.show(`Cannot complete test. Required by the layout: ${gaps.slice(0, 3).join(', ')}${gaps.length > 3 ? '...' : ''}`, 'error');
      return;
    }

    this.askConfirm('Complete test', `Complete test "${test.name}"? This will finalize test results, evaluate overall pass/fail status, and generate audit record.`, () => {
      // Sequential flow: save -> calculate formulas -> complete -> reload cleanly (prevents status revert race)
      const finalizeComplete = () => {
        this.testResultService.completeTest(headerId).subscribe({
          next: (response) => {
            test.status = 'Completed';
            test.isOverallPass = response.isOverallPass;
            const msg = response.isOverallPass
              ? `Test Completed! Overall Result: PASS.`
              : `Test Completed! Overall Result: FAIL (Parameters out of specification limit).`;
            this.toastService.show(msg, response.isOverallPass ? 'success' : 'warning');
            this.resultCompleted.emit({ headerId, status: 'Completed', isOverallPass: response.isOverallPass });
            if (response?.testEndTime) {
              this.testTimingMap[headerId] = {
                ...this.testTimingMap[headerId],
                testEndTime: response.testEndTime,
                performedByName: response.performedByName || this.testTimingMap[headerId]?.performedByName
              };
            } else {
              this.fetchEnvironmentData(headerId);
            }
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error completing test:', error);
            this.toastService.show('Error completing test: ' + (error?.error?.message || error?.message || 'Server error'), 'error');
          }
        });
      };

      this.saveTestWise(planIndex, testIndex, () => {
        this.testResultService.calculateParameters(headerId).subscribe({
          next: () => finalizeComplete(),
          error: () => finalizeComplete()
        });
      });
    }, { confirmLabel: 'Complete Test' });
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
    // Check if parameter has isCalculated flag, is marked as read-only, or has a formula
    return param?.isCalculated === true || param?.isReadOnly === true || !!param?.formulaExpression || !!param?.formula;
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
  // 6-Tab Workflow Navigation & Quick Actions
  // ================================================================
  switchTab(tab: string): void {
    if (tab === 'nabl' || tab === 'history' || tab === 'nabl_audit') {
      this.activeTab = 'nabl_audit';
    } else {
      this.activeTab = 'execution';
    }
  }

  goToNextTab(): void {
    if (this.activeTab === 'execution') {
      this.activeTab = 'nabl_audit';
    }
  }

  getExecutionMetrics(planIndex?: number, testIndex?: number): ExecutionMetrics {
    const p = planIndex ?? this.activePlanIndex ?? 0;
    const t = testIndex ?? 0;
    const testGroup = this.getTests(p)?.at(t);
    const paramsFA = testGroup?.get('parameters') as FormArray;
    if (!paramsFA || !paramsFA.length) {
      const rawParams = this.plans?.[p]?.tests?.[t]?.parameters || [];
      return countExecutionMetrics(rawParams.map((r: any) => ({
        parameterID: r.parameterID,
        parameterName: r.parameterName,
        specimenIndex: r.specimenIndex,
        value: r.value,
        remarks: r.remarks,
        inputType: r.inputType,
        resultStatus: r.resultStatus,
        status: r.status,
        isWithinLimit: r.isWithinLimit
      })));
    }

    // The open test with a reading / location grid counts its readings (36 Charpy values), not the parameter
    // rows that only hold their averages. Other tabs count rows until they are opened.
    const renderer = p === this.activePlanIndex ? this.layoutRendererComponent : undefined;
    const activeKeys = this.getActiveLayoutParameterKeys(p, t);
    const activeKeySet = activeKeys ? new Set(activeKeys) : null;
    const controls = paramsFA.controls.filter(ctrl => {
      const pName = String(ctrl.get('parameterName')?.value ?? '');
      if (renderer && renderer.isGridParameter(pName)) return false;
      if (activeKeySet) {
        const pId = ctrl.get('parameterID')?.value;
        const k = (pId != null && Number(pId) !== 0) ? `id:${pId}` : `name:${pName.trim().toLowerCase()}`;
        if (!activeKeySet.has(k)) return false;
      }
      return true;
    });
    const rowMetrics = countExecutionMetrics(controls.map(ctrl => ({
      parameterID: ctrl.get('parameterID')?.value,
      parameterName: ctrl.get('parameterName')?.value,
      specimenIndex: ctrl.get('specimenIndex')?.value,
      value: ctrl.get('value')?.value,
      remarks: ctrl.get('remarks')?.value,
      inputType: ctrl.get('inputType')?.value,
      resultStatus: ctrl.get('resultStatus')?.value,
      status: ctrl.get('status')?.value,
      isWithinLimit: ctrl.get('isWithinLimit')?.value
    })));
    const rp = renderer?.readingProgress();
    if (!rp || !rp.expected) return rowMetrics;
    return {
      ...rowMetrics,
      total: rowMetrics.total + rp.expected,
      entered: rowMetrics.entered + rp.entered,
      pending: rowMetrics.pending + (rp.expected - rp.entered),
    };
  }

  /**
   * Counts of each test (plans[] holds one test per header, so test 0), shown in the
   * test pills and the per-test toolbar. Kept in a signal: the layout renderer fills
   * values into the form while the page is being checked, and a signal written at
   * that point makes Angular refresh the header in the same pass (no NG0100).
   */
  readonly planMetrics = signal<ExecutionMetrics[]>([], { equal: sameExecutionMetricsList });
  private resultFormValueSub?: Subscription;
  private static readonly EMPTY_METRICS: ExecutionMetrics = { total: 0, entered: 0, pass: 0, fail: 0, pending: 0 };

  refreshPlanMetrics(): void {
    this.planMetrics.set((this.plans || []).map((_, p) => this.getExecutionMetrics(p, 0)));
  }

  /** Call after every `this.resultForm = ...` so the counts follow the new form. */
  private watchResultForm(): void {
    this.resultFormValueSub?.unsubscribe();
    this.resultFormValueSub = this.resultForm?.valueChanges.subscribe(() => this.refreshPlanMetrics());
    this.refreshPlanMetrics();
  }

  pillMetrics(planIndex: number): ExecutionMetrics {
    return this.planMetrics()[planIndex] ?? TestResultEntryFormComponent.EMPTY_METRICS;
  }

  ngDoCheck(): void {
    // Picks up changes made without a form event (e.g. limit checks with emitEvent: false, plan list changes)
    this.refreshPlanMetrics();
  }

  ngOnDestroy(): void {
    this.resultFormValueSub?.unsubscribe();
  }

  /** Why Complete is disabled for this test, or null when it can be completed. Shown as the button's hover text. */
  getCompleteBlockedReason(headerId: number): string | null {
    if (this.isViewMode) return 'View mode';
    if (this.isHeaderCompleted(headerId)) return 'Test already completed';
    if (this.activeTab !== 'execution') return 'Open the Execution tab to complete this test';
    const plan = this.plans?.find((p: any) => p.tests?.some((t: any) => t.headerId === headerId));
    const test = plan?.tests?.find((t: any) => t.headerId === headerId);
    if (test && this.isSpecimenSizeRequired(test) && !this.hasSpecimenSizeForHeader(headerId)) {
      return 'Specimen Size is required before completing this test';
    }
    return null;
  }

  /** Hover text for a test pill: name, status and counts in plain words. */
  getTestPillTitle(planIndex: number): string {
    const plan = this.plans?.[planIndex];
    const name = plan?.tests?.[0]?.name || plan?.type || 'Test';
    const status = plan?.tests?.[0]?.status || 'In Progress';
    const m = this.pillMetrics(planIndex);
    const failText = m.fail > 0 ? `, ${m.fail} fail` : '';
    return `${name} - ${status} - ${m.entered} of ${m.total} entered${failText}`;
  }

  formatDateDisplay(dateStr: any): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  viewMethodDetails(methodId?: number): void {
    const id = methodId || this.plans[this.activePlanIndex]?.methodId;
    if (id && id > 0) {
      window.open(`/test-specification/details/${id}`, '_blank');
    } else {
      this.toastService.show('No test method standard linked to this test.', 'warning');
    }
  }

  viewSpecification(specId?: number): void {
    const id = specId || this.sample?.specificationGradeID || this.sample?.assignedGradeID;
    if (id && id > 0) {
      window.open(`/material-specification/details/${id}`, '_blank');
    } else {
      this.toastService.show('No Material Specification linked to this test.', 'warning');
    }
  }

  viewEquipment(equipmentId?: number): void {
    if (equipmentId && equipmentId > 0) {
      window.open(`/equipment/details/${equipmentId}`, '_blank');
    } else {
      this.switchTab('execution');
      this.toastService.show('No equipment assigned yet for this test. Please select equipment under Execution.', 'info');
    }
  }

  viewReportFormat(formatId?: number): void {
    if (formatId && formatId > 0) {
      window.open(`/report-format/designer/${formatId}`, '_blank');
    } else if (this.sampleId) {
      window.open(`/reporting/preview/${this.sampleId}`, '_blank');
    } else {
      this.toastService.show('No configured report format found for preview.', 'warning');
    }
  }

  navigateToScope(): void {
    window.open('/scope', '_blank');
  }

  navigateToPreparation(sampleId?: number): void {
    const id = sampleId || this.sampleId;
    if (id) {
      window.open(`/sample/preparation/create/${id}`, '_blank');
    } else {
      window.open('/sample/preparation', '_blank');
    }
  }

  isNablAccredited(test: any): boolean {
    if (!test) return false;
    const headerId = test.headerId;
    if (headerId && this.nablScopeMap[headerId]) {
      const summary = this.getNablScopeSummary(headerId);
      if (summary.totalChecked > 0) {
        // Strict ISO 17025 requirement: ALL tested parameters must be within accredited scope
        return summary.allInScope;
      }
    }
    return !!test.isNabl;
  }

  getEnvironmentDisplay(headerId: number): string | null {
    const env = this.environmentMap[headerId];
    if (!env) return null;
    const parts: string[] = [];
    if (env.roomTemperature != null && env.roomTemperature !== undefined && !isNaN(Number(env.roomTemperature))) {
      parts.push(`${env.roomTemperature}°C`);
    }
    if (env.roomHumidity != null && env.roomHumidity !== undefined && !isNaN(Number(env.roomHumidity))) {
      parts.push(`${env.roomHumidity}% RH`);
    }
    return parts.length > 0 ? parts.join(', ') : null;
  }

  viewSOP(methodId?: number, sopFilePath?: string): void {
    if (sopFilePath) {
      const fullUrl = this.baseUrl + (sopFilePath.startsWith('/') ? '' : '/') + sopFilePath;
      window.open(fullUrl, '_blank');
      return;
    }
    if (methodId && methodId > 0) {
      this.testMethodService.getTestMethodSpecificationById(methodId).subscribe({
        next: (spec: any) => {
          const filePath = spec?.versions?.find((v: any) => v.isDefault && v.standardFilePath)?.standardFilePath
            || spec?.versions?.find((v: any) => v.standardFilePath)?.standardFilePath;
          if (filePath) {
            const fullUrl = this.baseUrl + (filePath.startsWith('/') ? '' : '/') + filePath;
            window.open(fullUrl, '_blank');
          } else {
            this.toastService.show('No SOP / Procedure document attached for this test method.', 'warning');
          }
        },
        error: () => {
          this.toastService.show('No SOP / Procedure document attached for this test method.', 'warning');
        }
      });
    } else {
      this.toastService.show('No test method standard linked to check for SOP.', 'warning');
    }
  }

  addRemarkFocus(): void {
    const el = document.getElementById('test-remarks-input');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  markAsNonconforming(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex]?.tests[testIndex];
    this.askConfirm('Nonconforming work', `Mark test "${test?.name || 'Test'}" as Nonconforming work (ISO 17025 Clause 7.10)?`, () => {
      this.router.navigate(['/non-conforming-work/create'], {
        state: {
          sampleId: this.sampleId,
          sampleNo: this.sample?.sampleNo,
          caseNo: this.inward?.caseNo,
          customerName: this.inward?.customerName,
          testName: test?.name,
          headerId: test?.headerId
        }
      });
    }, { variant: 'warning', confirmLabel: 'Continue' });
  }

  saveAsDraft(planIndex: number, testIndex: number): void {
    this.saveTestWise(planIndex, testIndex);
  }

  formatSpecRange(param: any): string {
    if (!param) return '—';
    const min = param.specMinValue != null ? param.specMinValue : param.minValue;
    const max = param.specMaxValue != null ? param.specMaxValue : param.maxValue;
    if (min != null && max != null) return `${min} – ${max}`;
    if (min != null) return `≥ ${min}`;
    if (max != null) return `≤ ${max}`;
    return param.acceptanceCriteria || '—';
  }

  getParameterStatus(param: any): 'pass' | 'fail' | 'marginal' | null {
    if (!param) return null;
    // CRITICAL: If no result value has been entered, status cannot be Pass/Fail
    if (param.value === null || param.value === undefined || param.value === '') {
      return null;
    }
    if (param.resultStatus) {
      const status = String(param.resultStatus).toLowerCase();
      if (status === 'pass' || status === 'within range') return 'pass';
      if (status === 'fail' || status === 'under range' || status === 'over range') return 'fail';
      if (status === 'marginal') return 'marginal';
    }
    if (param.isWithinLimit === true) return 'pass';
    if (param.isWithinLimit === false) return 'fail';
    return null;
  }

  /**
   * Parameters of the test as the result screen has them now: one entry per parameter (not per specimen row),
   * scoped to active layout parameters in Template Configured mode, with real MU & k-factor from uncertaintyMap.
   */
  getNablParameters(planIndex: number, testIndex: number): { parameterID: number; parameterName: string; unit: string; expandedUncertainty: any; coverageFactor: any }[] {
    const headerId = this.plans?.[planIndex]?.tests?.[testIndex]?.headerId;
    const uncList: any[] = headerId != null ? (this.uncertaintyMap[headerId] || []) : [];
    const rows: any[] = this.getParameters(planIndex, testIndex)?.getRawValue?.() || [];
    const activeKeys = this.getActiveLayoutParameterKeys(planIndex, testIndex);
    const activeKeySet = activeKeys ? new Set(activeKeys) : null;

    const byKey = new Map<string, { parameterID: number; parameterName: string; unit: string; expandedUncertainty: any; coverageFactor: any }>();
    rows.forEach(r => {
      const key = (r.parameterID != null && Number(r.parameterID) !== 0)
        ? 'id:' + r.parameterID
        : 'name:' + String(r.parameterName || '').trim().toLowerCase();
      if (activeKeySet && !activeKeySet.has(key)) return;
      if (byKey.has(key)) return;
      const pNameLower = String(r.parameterName || '').trim().toLowerCase();
      const uncItem = uncList.find((u: any) =>
        (r.parameterID && (Number(u.parameterId) === Number(r.parameterID) || Number(u.parameterID) === Number(r.parameterID))) ||
        (u.parameterName && u.parameterName.trim().toLowerCase() === pNameLower)
      );
      byKey.set(key, {
        parameterID: r.parameterID,
        parameterName: r.parameterName,
        unit: r.unit,
        expandedUncertainty: uncItem?.expandedUncertainty ?? r.expandedUncertainty ?? null,
        coverageFactor: uncItem?.coverageFactor ?? r.coverageFactor ?? null
      });
    });

    if (activeKeys) {
      const ordered: { parameterID: number; parameterName: string; unit: string; expandedUncertainty: any; coverageFactor: any }[] = [];
      activeKeys.forEach(k => {
        const item = byKey.get(k);
        if (item) ordered.push(item);
      });
      byKey.forEach((v, k) => {
        if (!activeKeys.includes(k)) ordered.push(v);
      });
      return ordered;
    }
    return Array.from(byKey.values());
  }

  /** In-scope / out-of-scope / not-in-scope-master counts over the active parameters of the result screen. */
  getNablScopeCounts(planIndex: number, testIndex: number): { total: number; inScope: number; outOfScope: number; notConfigured: number } {
    const headerId = this.plans[planIndex]?.tests?.[testIndex]?.headerId;
    const list = this.getNablParameters(planIndex, testIndex);
    const hasScopeData = (this.nablScopeMap[headerId] || []).length > 0;
    if (!hasScopeData) {
      return { total: list.length, inScope: 0, outOfScope: 0, notConfigured: list.length };
    }
    let inScope = 0;
    let outOfScope = 0;
    let notConfigured = 0;
    for (const x of list) {
      const st = this.getNablScopeStatus(headerId, x.parameterID);
      if (st === 'WithinScope') inScope++;
      else if (st === 'OutsideScope') outOfScope++;
      else notConfigured++;
    }
    return { total: list.length, inScope, outOfScope, notConfigured };
  }

  /** Requirement source lines, one per parameter and limit (specimen rows of one parameter share a line). */
  getRequirementSourceRows(headerId: number): { name: string; min: any; max: any; unit: string; source: string }[] {
    const seen = new Set<string>();
    return (this.requirementSources[headerId] || []).filter(r => {
      const key = [r.name, r.min, r.max, r.unit, r.source].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getNablScopeStatus(headerId: number, parameterId: number): 'WithinScope' | 'OutsideScope' | 'NotAccredited' {
    const statusObj = this.getNablStatus(headerId, parameterId);
    if (statusObj?.scopeStatus === 'WithinScope') return 'WithinScope';
    if (statusObj?.scopeStatus === 'OutsideScope') return 'OutsideScope';
    return 'NotAccredited';
  }

  onParameterValueChanged(planIndex: number, testIndex: number, paramIndex: number): void {
    this.onValueChanged(planIndex, testIndex, paramIndex);
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
  isSubmittingReport = false;
  showVerificationConfirmDialog = false;

  /** One confirm dialog for every "Are you sure?" on this screen (replaces window.confirm). */
  confirmState: { visible: boolean; title: string; message: string; confirmLabel: string; variant: 'danger' | 'primary' | 'warning'; run: (() => void) | null } =
    { visible: false, title: '', message: '', confirmLabel: 'Confirm', variant: 'primary', run: null };

  askConfirm(title: string, message: string, run: () => void, opts: { confirmLabel?: string; variant?: 'danger' | 'primary' | 'warning' } = {}): void {
    this.confirmState = { visible: true, title, message, confirmLabel: opts.confirmLabel || 'Confirm', variant: opts.variant || 'primary', run };
  }

  onGenericConfirmed(): void {
    const run = this.confirmState.run;
    this.confirmState = { ...this.confirmState, visible: false, run: null };
    run?.();
  }

  onGenericCancelled(): void {
    this.confirmState = { ...this.confirmState, visible: false, run: null };
  }
  pendingVerificationTarget?: { planIndex: number; testIndex: number };

  canSubmitForVerification(status?: string): boolean {
    if (this.isViewMode) return false;
    return status === 'Completed';
  }

  requestSubmitForVerification(planIndex: number, testIndex: number): void {
    this.pendingVerificationTarget = { planIndex, testIndex };
    this.showVerificationConfirmDialog = true;
  }

  onVerificationConfirmed(): void {
    if (this.pendingVerificationTarget) {
      const { planIndex, testIndex } = this.pendingVerificationTarget;
      this.pendingVerificationTarget = undefined;
      this.showVerificationConfirmDialog = false;
      this.submitForVerification(planIndex, testIndex);
    }
  }

  onVerificationCancelled(): void {
    this.pendingVerificationTarget = undefined;
    this.showVerificationConfirmDialog = false;
  }

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
    const test = this.plans[planIndex]?.tests?.[testIndex];
    const headerId = test?.headerId;
    if (!headerId) return;
    if (this.isSubmittingVerification) return;
    // Photos the layout requires before verification
    const renderer = this.layoutRendererComponent?.test === test ? this.layoutRendererComponent : null;
    let photoGaps: string[] = [];
    if (renderer) {
      photoGaps = renderer.photoGaps();
    } else {
      const testGroup = this.getTests(planIndex)?.at(testIndex) as FormGroup;
      const layout = this.resolveSheetLayout(planIndex, test, testGroup);
      const rawSections = layout ? (layout.sections || layout.parsedConfig?.sections || []) : [];
      const images = this.testImagesMap[headerId] || test.images || [];
      photoGaps = layoutPhotoGaps(rawSections, images);
    }
    if (photoGaps.length > 0) {
      this.toastService.show(`Cannot submit for verification. Required photo missing: ${photoGaps.slice(0, 3).join(', ')}${photoGaps.length > 3 ? '...' : ''}`, 'error');
      return;
    }
    this.isSubmittingVerification = true;

    this.testResultService.submitForVerification(headerId).subscribe({
      next: () => {
        this.isSubmittingVerification = false;
        this.toastService.show('Test submitted for verification', 'success');
        this.loadFullResultPayload(this.sampleId);
      },
      error: (err: any) => {
        this.isSubmittingVerification = false;
        const apiMessage = typeof err?.error === 'string' ? err.error : err?.error?.message;
        this.toastService.show(apiMessage || 'Failed to submit for verification', 'error');
      }
    });
  }

  submitSampleForVerification(): void {
    if (this.isSubmittingVerification) return;
    this.isSubmittingVerification = true;

    this.testResultService.submitSampleForVerification(this.sampleId).subscribe({
      next: (res: any) => {
        this.isSubmittingVerification = false;
        this.toastService.show(res?.message || 'All tests submitted for verification', 'success');
        this.loadFullResultPayload(this.sampleId);
      },
      error: (err: any) => {
        this.isSubmittingVerification = false;
        this.toastService.show(err?.error?.message || 'Failed to submit for verification', 'error');
      }
    });
  }

  canSubmitForReportReview(): boolean {
    const status = this.sample?.sampleStatus;
    // Only show when tests are verified and report has not been submitted/reviewed/approved
    const hiddenStatuses = ['REPORT_UNDER_REVIEW', 'FINAL_REPORT_APPROVED', 'REPORT_APPROVED', 'COMPLETED', 'REPORT_DISPATCHED'];
    return status === 'TESTING_VERIFIED' && !hiddenStatuses.includes(status);
  }

  submitForReportReview(): void {
    if (this.isSubmittingReport) return;
    this.isSubmittingReport = true;
    this.testResultService.submitForReportReview(this.sampleId).subscribe({
      next: () => {
        this.isSubmittingReport = false;
        this.toastService.show('Submitted for report review successfully.', 'success');
        this.resultCompleted.emit({ sampleId: this.sampleId, reportReviewSubmitted: true });
        this.loadFullResultPayload(this.sampleId);
      },
      error: (err: any) => {
        this.isSubmittingReport = false;
        this.toastService.show(err?.error?.message || 'Failed to submit for report review.', 'error');
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
      try { URL.revokeObjectURL(a.preview); } catch (e) { }
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
    window.open(this.baseUrl + imgUrl, '_blank');
  }
  cancel(): void {
    if (this.isInline) {
      this.closeRequested.emit();
    } else {
      this.router.navigate(['/testing/dashboard']);
    }
  }

  // ================================================================
  // Phase 2A: Environment Data & Recording Modal
  // ================================================================
  private buildRecordEnvironmentForm(): void {
    this.recordEnvForm = this.fb.group({
      labRoomId: [null],
      roomTemperature: [null, [Validators.required, Validators.min(-50), Validators.max(100)]],
      roomHumidity: [null, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  openRecordEnvironmentModal(plan: any, test: any): void {
    if (!test || !test.headerId) {
      this.toastService.show('Please start the test before recording environment conditions', 'warning');
      return;
    }
    this.activeEnvHeaderId = test.headerId;
    this.activeEnvTestTitle = test.testName || test.testMethodName || 'Test Execution';

    const currentEnv = this.environmentMap[test.headerId] || {};
    this.recordEnvForm.patchValue({
      labRoomId: currentEnv.labRoomId || null,
      roomTemperature: currentEnv.roomTemperature ?? null,
      roomHumidity: currentEnv.roomHumidity ?? null
    });

    if (this.labRooms.length === 0) {
      this.loadLabRooms();
    }

    // Auto-fetch daily environment if not yet recorded
    if (currentEnv.roomTemperature == null && currentEnv.roomHumidity == null) {
      this.fetchLatestDailyEnv(false);
    }

    this.showRecordEnvironmentModal = true;
  }

  closeRecordEnvironmentModal(): void {
    this.showRecordEnvironmentModal = false;
    this.activeEnvHeaderId = null;
  }

  loadLabRooms(): void {
    this.loadingLabRooms = true;
    this.testResultService.getLabRooms().subscribe({
      next: (rooms) => {
        this.labRooms = rooms || [];
        this.loadingLabRooms = false;
      },
      error: () => {
        this.loadingLabRooms = false;
      }
    });
  }

  onLabRoomChange(): void {
    const roomId = this.recordEnvForm.get('labRoomId')?.value;
    if (roomId) {
      this.fetchLatestDailyEnv(false, roomId);
    }
  }

  fetchLatestDailyEnv(showSuccessToast: boolean = true, roomId?: number): void {
    const selectedRoomId = roomId || this.recordEnvForm.get('labRoomId')?.value || undefined;
    this.testResultService.getDailyEnvironment(selectedRoomId).subscribe({
      next: (res: any) => {
        if (res) {
          if (res.labRoomId && !this.recordEnvForm.get('labRoomId')?.value) {
            this.recordEnvForm.patchValue({ labRoomId: res.labRoomId });
          }
          if (res.roomTemperature != null || res.roomHumidity != null) {
            this.recordEnvForm.patchValue({
              roomTemperature: res.roomTemperature,
              roomHumidity: res.roomHumidity
            });
            if (showSuccessToast) {
              this.toastService.show('Loaded daily environment log', 'success');
            }
          } else if (showSuccessToast) {
            this.toastService.show('No daily environment record found for today', 'info');
          }
        }
      },
      error: () => {
        if (showSuccessToast) {
          this.toastService.show('Failed to fetch daily environment log', 'error');
        }
      }
    });
  }

  saveEnvironmentRecord(): void {
    if (this.recordEnvForm.invalid || !this.activeEnvHeaderId) {
      this.recordEnvForm.markAllAsTouched();
      if (this.recordEnvForm.invalid) this.toastService.show('Enter room temperature (-50 to 100 °C) and humidity (0 to 100 %).', 'error');
      return;
    }

    const payload = this.recordEnvForm.value;
    const headerId = this.activeEnvHeaderId;

    this.testResultService.updateEnvironment(headerId, payload).subscribe({
      next: (res: any) => {
        this.toastService.show('Lab environment recorded successfully', 'success');
        this.environmentMap[headerId] = {
          roomTemperature: res.roomTemperature,
          roomHumidity: res.roomHumidity,
          labRoomId: res.labRoomId,
          labRoomName: res.labRoomName || (this.labRooms.find(r => r.id === payload.labRoomId)?.name) || ''
        };
        // Keep the test form and model in step, so the layout section shows it and Save Draft sends the recorded values
        this.syncRecordedEnvironment(headerId, res.roomTemperature, res.roomHumidity);
        this.closeRecordEnvironmentModal();
      },
      error: (err: any) => {
        this.toastService.show(err.error?.message || 'Failed to record lab environment', 'error');
      }
    });
  }

  private syncRecordedEnvironment(headerId: number, roomTemperature: any, roomHumidity: any): void {
    this.plans.forEach((plan: any, p: number) => (plan.tests || []).forEach((test: any, t: number) => {
      if (test?.headerId !== headerId) return;
      test.roomTemperature = roomTemperature ?? null;
      test.roomHumidity = roomHumidity ?? null;
      this.getTests(p)?.at(t)?.patchValue({ roomTemperature: roomTemperature ?? null, roomHumidity: roomHumidity ?? null }, { emitEvent: false });
    }));
  }

  fetchEnvironmentData(headerId: number): void {
    if (!headerId) return;
    this.testResultService.getEnvironmentAtTime(headerId).subscribe({
      next: (env) => {
        this.environmentMap[headerId] = {
          roomTemperature: env.roomTemperature ?? env.temperature,
          roomHumidity: env.roomHumidity ?? env.humidity,
          labRoomId: env.labRoomId,
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
  // Workbench Inspector Data Helpers (Compact Global UI Pattern)
  // ================================================================
  isTensileActive(planIndex: number, testIndex: number): boolean {
    const test = this.plans?.[planIndex]?.tests?.[testIndex];
    const name = (test?.name || this.plans?.[planIndex]?.type || '').toLowerCase();
    return name.includes('tensile') || name.includes('tension') || name.includes('a370') || name.includes('is 1608');
  }

  /**
   * Key tensile results for the tiles. Values come from the live form rows (first specimen), limits only from the
   * row's own applied limit: a result without a limit is shown as INFO, never judged against an invented number.
   */
  getCalculatedKeyResults(planIndex: number, testIndex: number): Array<{
    symbol: string;
    name: string;
    value: string;
    unit: string;
    requirement: string;
    status: 'PASS' | 'FAIL' | 'PENDING' | 'INFO';
  }> {
    const test = this.plans?.[planIndex]?.tests?.[testIndex];
    if (!test) return [];

    type Tile = { symbol: string; name: string; value: string; unit: string; requirement: string; status: 'PASS' | 'FAIL' | 'PENDING' | 'INFO' };
    const results: Tile[] = [];

    const formRows = this.getParameters(planIndex, testIndex);
    const rawParams: any[] = formRows
      ? formRows.controls.map(c => (c as FormGroup).getRawValue()).filter(r => !(Number(r.specimenIndex) > 0))
      : (test.parameters || []);
    const activeKeys = this.getActiveLayoutParameterKeys(planIndex, testIndex);
    const activeKeySet = activeKeys ? new Set(activeKeys) : null;
    const params: any[] = activeKeySet
      ? rawParams.filter(r => {
        const k = (r.parameterID != null && Number(r.parameterID) !== 0)
          ? `id:${r.parameterID}`
          : `name:${String(r.parameterName || '').trim().toLowerCase()}`;
        return activeKeySet.has(k);
      })
      : rawParams;
    const spm = this.layoutRendererComponent?.specimens?.[0];

    const findParam = (terms: string[]) =>
      params.find(pm => terms.some(term => (pm.parameterName || '').toLowerCase().includes(term.toLowerCase())));

    // Exact role match (see tensile-parameter-roles.ts): "Throat Thickness" is not the specimen thickness,
    // "Reduction of Area" is not the cross section area.
    const byRole = (role: TensileRole) => findByTensileRole(params, role, pm => pm.parameterName);
    const widthParam = byRole('width');
    const thickParam = byRole('thickness');
    const areaParam = byRole('area');
    // Display only: generic yield / Rp0.2 first, then the separate Rp0.5 / ReH / ReL quantities
    const ysParam = byRole('proofStress') ?? byRole('proofStress05') ?? byRole('upperYield') ?? byRole('lowerYield');
    const utsParam = byRole('uts');
    const elParam = byRole('elongation');
    const ystsParam = findParam(['ys/ts', 'ratio']);

    const num = (v: any): number | null => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
    /** The limit the row applies (set by the specification conditions), min / max may each be missing. */
    const limitOf = (pm: any) => ({ min: num(pm?.minValue ?? pm?.specMinValue), max: num(pm?.maxValue ?? pm?.specMaxValue) });
    const limitText = (l: { min: number | null; max: number | null }) =>
      l.min !== null && l.max !== null ? `${l.min} – ${l.max}` : l.min !== null ? `≥ ${l.min}` : l.max !== null ? `≤ ${l.max}` : '';
    const verdict = (v: number, l: { min: number | null; max: number | null }): 'PASS' | 'FAIL' | 'INFO' =>
      l.min === null && l.max === null ? 'INFO' : (l.min === null || v >= l.min) && (l.max === null || v <= l.max) ? 'PASS' : 'FAIL';

    // Tensile roles (area, yield, UTS, elongation, ratio) only make sense for a tensile test; every other test
    // shows the results of its own formula parameters (fallback below).
    const isTensile = this.isTensileActive(planIndex, testIndex);

    // 1. Cross-sectional area: a formula result, never judged
    const sampleArea = tensileArea(num(this.sample?.thickness), num(this.sample?.width), num(this.sample?.diameter));
    const areaVal = areaParam?.value ?? spm?.area ?? (
      (num(widthParam?.value) !== null && num(thickParam?.value) !== null)
        ? (Number(widthParam.value) * Number(thickParam.value))
        : sampleArea
    );
    if (isTensile && areaVal != null && areaVal !== '') {
      results.push({
        symbol: 'S₀',
        name: 'Cross Section Area',
        value: Number(areaVal).toFixed(areaParam?.decimalPrecision != null ? areaParam.decimalPrecision : 2),
        unit: areaParam?.unit || 'mm²',
        requirement: 'Formula: W × T',
        status: 'INFO'
      });
    }

    const pushResult = (symbol: string, defaultName: string, pm: any, raw: any, defaultUnit: string) => {
      const v = num(raw);
      if (!isTensile || v === null) return;
      const l = limitOf(pm);
      results.push({
        symbol,
        name: pm?.parameterName || defaultName,
        value: String(raw),
        unit: pm?.unit || defaultUnit,
        requirement: limitText(l),
        status: verdict(v, l)
      });
    };

    // 2-4. Yield strength, tensile strength, elongation
    pushResult('R_p0.2', 'Yield Strength', ysParam, ysParam?.value ?? spm?.proofStress, 'MPa');
    const utsVal = utsParam?.value ?? spm?.uts;
    pushResult('R_m', 'Tensile Strength (UTS)', utsParam, utsVal, 'MPa');
    pushResult('A', 'Elongation (%)', elParam, elParam?.value ?? spm?.elongation, '%');

    // 5. YS / TS ratio (calculated here when the test has no ratio parameter)
    const ysVal = ysParam?.value ?? spm?.proofStress;
    let ystsVal = ystsParam?.value;
    if ((ystsVal == null || ystsVal === '') && ysVal && utsVal && Number(utsVal) > 0) {
      ystsVal = (Number(ysVal) / Number(utsVal)).toFixed(2);
    }
    if (isTensile && num(ystsVal) !== null) {
      const l = limitOf(ystsParam);
      results.push({
        symbol: 'YS/TS',
        name: 'Yield / Tensile Ratio',
        value: String(ystsVal),
        unit: '',
        requirement: limitText(l),
        status: verdict(Number(ystsVal), l)
      });
    }

    // Fallback: If not standard tensile or no tensile parameters detected
    if (results.length === 0) {
      for (const pm of params) {
        if (pm.isCalculated || pm.formulaExpression || (isTensile && pm.value != null)) {
          const l = limitOf(pm);
          const v = num(pm.value);
          results.push({
            symbol: 'fx',
            name: pm.parameterName,
            value: String(pm.value ?? '—'),
            unit: pm.unit || '',
            requirement: limitText(l),
            status: v === null ? 'PENDING' : verdict(v, l)
          });
          if (results.length >= 4) break;
        }
      }
    }

    return results;
  }

  getSpecimenDimensionValue(dimKey: string, planIndex: number, testIndex: number): string {
    const test = this.plans?.[planIndex]?.tests?.[testIndex];
    const params: any[] = test?.parameters || [];
    const spm = this.layoutRendererComponent?.specimens?.[0];

    const byRole = (role: TensileRole) => findByTensileRole(params, role, pm => pm.parameterName);

    if (dimKey === 'thickness') {
      const pMatch = byRole('thickness');
      return String(pMatch?.value ?? spm?.thickness ?? this.sample?.thickness ?? '—');
    }
    if (dimKey === 'width') {
      const pMatch = byRole('width');
      return String(pMatch?.value ?? spm?.width ?? this.sample?.width ?? '—');
    }
    if (dimKey === 'gaugeLength') {
      const pMatch = byRole('gaugeLength');
      return String(pMatch?.value ?? spm?.gaugeLength ?? this.sample?.gaugeLength ?? '—');
    }
    if (dimKey === 'finalLength') {
      const pMatch = byRole('finalLength');
      return String(pMatch?.value ?? spm?.finalLength ?? '—');
    }
    if (dimKey === 'diameter') {
      const pMatch = byRole('diameter');
      return String(pMatch?.value ?? spm?.diameter ?? this.sample?.diameter ?? '—');
    }
    return '—';
  }

  hasFormulaParameters(planIndex: number, testIndex: number): boolean {
    return this.getFormulaParametersList(planIndex, testIndex).length > 0;
  }

  /**
   * Returns deduplicated formula parameters (1 per unique parameter, never duplicated across specimens),
   * scoped to active layout parameters when Template Configured mode is active.
   */
  getFormulaParametersList(planIndex: number, testIndex: number): any[] {
    const formRows = this.getParameters(planIndex, testIndex)?.getRawValue?.();
    const rawParams: any[] = Array.isArray(formRows) && formRows.length
      ? formRows
      : (this.plans?.[planIndex]?.tests?.[testIndex]?.parameters || []);
    const activeKeys = this.getActiveLayoutParameterKeys(planIndex, testIndex);
    const activeKeySet = activeKeys ? new Set(activeKeys) : null;
    const labels = this.getActiveSpecimenLabels();

    const groups = new Map<string, any[]>();
    for (const pm of rawParams) {
      if (!(pm?.isCalculated || pm?.formulaExpression)) continue;
      const key = (pm.parameterID != null && Number(pm.parameterID) !== 0)
        ? `id:${pm.parameterID}`
        : `name:${String(pm.parameterName || '').trim().toLowerCase()}`;
      if (activeKeySet && !activeKeySet.has(key)) continue;
      const list = groups.get(key);
      if (list) list.push(pm);
      else groups.set(key, [pm]);
    }

    const result: any[] = [];
    groups.forEach(items => {
      const primary = items[0];
      const unit = primary.unit || '';
      if (items.length <= 1) {
        result.push({
          ...primary,
          displayValue: primary.value != null && primary.value !== '' ? `${primary.value}${unit ? ' ' + unit : ''}` : 'Pending'
        });
      } else {
        const parts = items.map((it, idx) => {
          const spmIdx = Number(it.specimenIndex ?? idx);
          const lbl = labels[spmIdx] || `S${spmIdx + 1}`;
          const val = it.value != null && it.value !== '' ? `${it.value}${unit ? ' ' + unit : ''}` : '—';
          return `${lbl}: ${val}`;
        });
        const anyValue = items.some(it => it.value != null && it.value !== '');
        result.push({
          ...primary,
          displayValue: anyValue ? parts.join(' | ') : 'Pending'
        });
      }
    });
    return result;
  }

  // ================================================================
  // Phase 2A: Equipment Dropdown
  // ================================================================
  getEquipmentDropdown = (term: string, page: number, pageSize: number): Observable<any[]> =>
    this.equipmentService.getEquipmentDropdown(term, page, pageSize);

  getEquipmentDropdownFor = (pIdx: number, tIdx: number) => (term: string, page: number, pageSize: number): Observable<any[]> => {
    const plan: any = this.plans?.[pIdx];
    let labTestId: number | undefined;
    let analysisTypeId: number | undefined;
    if (plan) {
      if (plan.type === 'Chemical') {
        analysisTypeId = plan.labTestId || undefined;
        labTestId = plan.parentLabTestId || undefined;
      } else {
        labTestId = plan.labTestId || plan.methodId || undefined;
      }
    }
    return this.equipmentService.getEquipmentDropdown(term, page, pageSize, labTestId, undefined, analysisTypeId);
  };

  /** Equipment chosen or removed on the screen and not saved yet (Start is refused until it is saved). */
  equipmentDirty: Record<number, boolean> = {};
  /** Changing this key re-creates the "Add equipment" dropdown so it is empty again after a pick. */
  equipmentPickerKey: Record<number, number> = {};
  private equipmentPickerCache: Record<string, (term: string, page: number, pageSize: number) => Observable<any[]>> = {};

  trackByEquipment = (_: number, e: any) => e.id;

  /** Stable fetch function per plan + test (a new function on every check would reload the dropdown). */
  getEquipmentPicker(pIdx: number, tIdx: number): (term: string, page: number, pageSize: number) => Observable<any[]> {
    const key = `${pIdx}_${tIdx}`;
    if (!this.equipmentPickerCache[key]) {
      const forTest = this.getEquipmentDropdownFor(pIdx, tIdx);
      this.equipmentPickerCache[key] = (term: string, page: number, pageSize: number) => {
        if (this.equipmentUnfiltered[key]) return this.equipmentService.getEquipmentDropdown(term, page, pageSize);
        return forTest(term, page, pageSize).pipe(
          switchMap((list: any) => {
            // no equipment linked to this test in the master: list all equipment (and say so) instead of an empty list
            if ((list || []).length > 0 || term || page > 0) return of(list);
            return this.equipmentService.getEquipmentDropdown('', page, pageSize).pipe(
              tap((all: any) => { this.equipmentUnfiltered[key] = (all || []).length > 0; }));
          }));
      };
    }
    return this.equipmentPickerCache[key];
  }

  /** Plan_test keys whose equipment list is the full master because nothing is linked to the test. */
  equipmentUnfiltered: Record<string, boolean> = {};

  onEquipmentPicked(headerId: number, item: any): void {
    if (!item || item.id === null || item.id === undefined) return;
    this.onEquipmentSelected(headerId, item);
    this.equipmentPickerKey[headerId] = (this.equipmentPickerKey[headerId] || 0) + 1;
    this.cdr.markForCheck();
  }

  /** Name and calibration data of one equipment (the saved result only keeps its id). */
  private loadEquipmentDetails(headerId: number, equipmentId: number): void {
    this.equipmentService.getEquipmentById(equipmentId).subscribe({
      next: (eqDetails: any) => {
        const item = this.selectedEquipmentMap[headerId]?.find((e: any) => e.id === equipmentId);
        if (item && eqDetails) {
          item.name = item.name || eqDetails.name || eqDetails.equipmentName || '';
          item.calibrationRequired = eqDetails.calibrationRequired;
          item.nextCalibrationDueDate = eqDetails.nextCalibrationDueDate;
          item.labRoomName = eqDetails.labRoom?.roomName || '';
        }
        if (item) item.detailsLoaded = true;
        this.cdr.markForCheck();
      },
      error: () => {
        // the API answers 400 "Equipment not found" for an inactive or deleted equipment
        const item = this.selectedEquipmentMap[headerId]?.find((e: any) => e.id === equipmentId);
        if (item) { item.detailsLoaded = true; item.notFound = true; }
        this.cdr.markForCheck();
      }
    });
  }

  private inwardService = inject(SampleInwardService);

  /** Grade dropdown of the result screen (same source as the plan). */
  fetchGrades = (term: string, page: number, pageSize: number): Observable<any[]> => this.materialSpecService.getGradeDropdown(term, page, pageSize);

  /** Grade currently applied to the sample or active test plan: shown selected in the Specification Conditions card. */
  get currentGradeItem(): any {
    const planSpec = this.plans?.[this.activePlanIndex]?.specSelected;
    const id = this.sample?.assignedGradeID || this.sample?.specificationGradeID || planSpec?.id;
    if (!id) return null;
    const name = this.sample?.specificationGradeName || this.sample?.assignedGradeName || planSpec?.name || ('Grade #' + id);
    // same object while nothing changed, so the dropdown is not re-bound on every change detection
    if (!this.gradeItemCache || this.gradeItemCache.id !== id || this.gradeItemCache.name !== name) this.gradeItemCache = { id, name };
    return this.gradeItemCache;
  }
  private gradeItemCache: { id: number; name: string } | null = null;

  /** The user picks / changes the grade on the result screen: store it on the sample and rebuild the limits. */
  onGradePicked(item: any, planIndex: number): void {
    if (!item?.id || !this.sample?.id) return;
    this.inwardService.assignGrade({ sampleID: this.sample.id, specificationGradeID: +item.id, notes: 'Grade selected on the result entry screen' }).subscribe({
      next: () => {
        this.sample.assignedGradeID = +item.id;
        this.sample.specificationGradeID = +item.id;
        this.sample.specificationGradeName = item.name || item.displayText || '';
        this.toastService.show('Grade applied: ' + (item.name || item.displayText || item.id), 'success');
        (this.plans?.[planIndex]?.tests || []).forEach((_: any, tIdx: number) => this.initConditionEngine(planIndex, tIdx));
        this.cdr.markForCheck();
      },
      error: (err: any) => this.toastService.show(err?.error?.message || 'Failed to apply the grade.', 'error')
    });
  }

  /** Pre-fills the equipment of a test from the equipment linked to its sub-group / analysis type (kept until Save Draft). */
  private autoAssignLinkedEquipment(headerId: number, subGroupId?: number | null, analysisTypeId?: number | null): void {
    if (!headerId || (!subGroupId && !analysisTypeId)) return;
    this.equipmentService
      .getEquipmentDropdown('', 0, 5, undefined, analysisTypeId ? undefined : Number(subGroupId), analysisTypeId ? Number(analysisTypeId) : undefined)
      .subscribe({
        next: (res: any) => {
          const list: any[] = Array.isArray(res) ? res : res?.items || res?.data || [];
          if ((this.selectedEquipmentMap[headerId] || []).length) return;
          list.slice(0, 3).forEach(item => this.onEquipmentSelected(headerId, item));
          this.cdr.markForCheck();
        },
        error: () => { }
      });
  }

  onEquipmentSelected(headerId: number, selectedItem: any): void {
    if (!selectedItem) {
      return;
    }
    if (!this.selectedEquipmentMap[headerId]) {
      this.selectedEquipmentMap[headerId] = [];
    }
    // Avoid duplicates
    if (!this.selectedEquipmentMap[headerId].find((e: any) => e.id === selectedItem.id)) {
      this.selectedEquipmentMap[headerId].push({
        id: selectedItem.id,
        name: selectedItem.name,
        calibrationRequired: selectedItem.calibrationRequired,
        nextCalibrationDueDate: selectedItem.nextCalibrationDueDate
      });
      this.equipmentDirty[headerId] = true;
      this.resultForm?.markAsDirty();
      // Query full equipment details to check calibration validity
      this.loadEquipmentDetails(headerId, selectedItem.id);
    }
  }

  removeEquipment(headerId: number, equipmentId: number): void {
    if (this.selectedEquipmentMap[headerId]) {
      this.selectedEquipmentMap[headerId] = this.selectedEquipmentMap[headerId].filter((e: any) => e.id !== equipmentId);
      this.equipmentDirty[headerId] = true;
      this.resultForm?.markAsDirty();
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
    const test = this.plans[planIndex]?.tests?.[testIndex];
    this.fromMethodHeaderId = test?.headerId || 0;
    this.fromMethodPlanIndex = planIndex;
    this.fromMethodTestIndex = testIndex;
    this.fromMethodForm.reset();
    this.methodParameters = [];
    this.selectedMethodParam = null;
    this.loadingMethodParams = false;
    this.showFromMethodModal = true;
  }

  closeFromMethodModal(): void {
    this.showFromMethodModal = false;
    this.fromMethodForm.reset();
    this.methodParameters = [];
    this.selectedMethodParam = null;
    this.loadingMethodParams = false;
  }

  isParamAlreadyInHeader(paramId: number): boolean {
    if (!this.plans || this.fromMethodPlanIndex === undefined || this.fromMethodTestIndex === undefined) return false;
    const test = this.plans[this.fromMethodPlanIndex]?.tests?.[this.fromMethodTestIndex];
    if (!test || !test.parameters) return false;
    return test.parameters.some((p: any) => (p.parameterID === paramId || p.parameterId === paramId));
  }

  onTestMethodSelected(selectedItem: any): void {
    if (!selectedItem) {
      this.fromMethodForm.patchValue({ testMethodId: null, parameterID: null });
      this.methodParameters = [];
      this.selectedMethodParam = null;
      return;
    }
    const methodId = selectedItem.id;
    this.fromMethodForm.patchValue({ testMethodId: methodId, parameterID: null });
    this.methodParameters = [];
    this.selectedMethodParam = null;
    this.loadingMethodParams = true;

    // Call specialized endpoint that matches specification limits and marks duplicate parameters
    this.testResultService.getMethodParametersForHeader(this.fromMethodHeaderId, methodId).subscribe({
      next: (params: any[]) => {
        if (params && params.length > 0) {
          this.methodParameters = params.map(p => ({
            ...p,
            isAlreadyAdded: p.isAlreadyAdded || this.isParamAlreadyInHeader(p.parameterID)
          }));
          this.loadingMethodParams = false;
        } else {
          this.loadFallbackMethodParameters(methodId);
        }
      },
      error: (err) => {
        console.warn('getMethodParametersForHeader failed, falling back to spec details:', err);
        this.loadFallbackMethodParameters(methodId);
      }
    });
  }

  private loadFallbackMethodParameters(methodId: number): void {
    this.testMethodService.getTestMethodSpecificationById(methodId).subscribe({
      next: (method: any) => {
        let params: any[] = [];
        if (method?.versions && method.versions.length > 0) {
          const ver = method.versions.find((v: any) => v.id === methodId)
            || method.versions.find((v: any) => v.isDefault)
            || method.versions[0];
          if (ver && ver.parameters && ver.parameters.length > 0) {
            params = ver.parameters.map((vp: any) => {
              const pId = vp.parameterID || vp.parameter?.id || vp.id;
              return {
                parameterID: pId,
                parameterName: vp.parameter?.name || vp.parameterName || `Parameter #${pId}`,
                unit: vp.parameterUnit?.name || vp.parameter?.parameterUnit?.name || vp.unit || '',
                specRange: null,
                isAlreadyAdded: this.isParamAlreadyInHeader(pId),
                comment: vp.comment
              };
            });
          }
        }
        if (params.length === 0 && (method?.parameters || method?.testParameters)) {
          params = (method.parameters || method.testParameters).map((p: any) => {
            const pId = p.parameterID || p.id;
            return {
              parameterID: pId,
              parameterName: p.parameterName || p.name || `Parameter #${pId}`,
              unit: p.unit || p.parameterUnit?.name || '',
              specRange: null,
              isAlreadyAdded: this.isParamAlreadyInHeader(pId),
              comment: p.comment
            };
          });
        }
        this.methodParameters = params;
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
    if (param.isAlreadyAdded) {
      this.toastService.show(`Parameter '${param.parameterName}' is already present in this test.`, 'info');
      return;
    }
    this.selectedMethodParam = param;
    this.fromMethodForm.patchValue({ parameterID: param.parameterID || param.id });
  }

  submitFromMethod(): void {
    if (!this.fromMethodForm.valid) {
      this.toastService.show('Please select a test method and parameter', 'warning');
      return;
    }

    const formVal = this.fromMethodForm.value;
    if (this.isParamAlreadyInHeader(formVal.parameterID)) {
      this.toastService.show('This parameter is already added to this test.', 'warning');
      return;
    }

    const dto = {
      sourceTestMethodId: formVal.testMethodId,
      testMethodId: formVal.testMethodId,
      parameterID: formVal.parameterID
    };

    this.testResultService.addParameterFromMethod(this.fromMethodHeaderId, dto).subscribe({
      next: (response) => {
        this.toastService.show(response?.message || 'Parameter added from test method successfully', 'success');
        this.closeFromMethodModal();
        // Refresh full payload so table displays the new parameter with matching specification limits
        this.loadFullResultPayload(this.sampleId);
      },
      error: (error) => {
        console.error('Error adding parameter from method:', error);
        this.toastService.show(error?.error?.message || error?.error || 'Error adding parameter from method', 'error');
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
        // Refresh the unified price summary (Preparation & Pricing tab + badge)
        if (this.sampleId) this.loadUnifiedPriceSummary(this.sampleId);
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
        if (this.sampleId) this.loadUnifiedPriceSummary(this.sampleId);
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
        if (this.sampleId) this.loadUnifiedPriceSummary(this.sampleId);
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
        // No price data yet — auto-calculate on first load
        this.autoCalculatePriceForHeader(headerId);
      }
    });
  }

  /** Auto-calculate price for a header if no price exists yet */
  private autoCalculatePriceForHeader(headerId: number): void {
    if (this.isViewMode || headerId <= 0) return;
    this.priceLoadingMap[headerId] = true;
    this.testResultService.calculatePrice(headerId).subscribe({
      next: (summary) => {
        this.priceSummaryMap[headerId] = summary;
        this.priceBreakdownMap[headerId] = summary.breakdown || [];
        this.priceLoadingMap[headerId] = false;
        if (this.sampleId) this.loadUnifiedPriceSummary(this.sampleId);
      },
      error: () => {
        this.priceLoadingMap[headerId] = false;
        // Silent fail — user can manually click Calculate
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
        if (this.sampleId) this.loadUnifiedPriceSummary(this.sampleId);
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
    if (!results || parameterId == null) return null;
    const matches = results.filter((r: any) => Number(r.parameterId ?? r.parameterID) === Number(parameterId));
    if (!matches.length) return null;
    return matches.find((r: any) => r.scopeStatus === 'OutsideScope')
      || matches.find((r: any) => r.scopeStatus === 'WithinScope')
      || matches[0];
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
    window.open(`/sample/preparation/create/${this.sampleId}`, '_blank');
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
    this.askConfirm('Delete machining charge', 'Delete this machining charge?', () => {
      this.testResultService.deleteMachiningItem(itemId).subscribe({
        next: () => {
          this.loadMachiningItems(this.sampleId);
          this.loadUnifiedPriceSummary(this.sampleId);
          this.loadPreparationStatus(this.sampleId);
        },
        error: (err) => this.toastService.show(err?.error?.message || 'Failed to delete machining item', 'error'),
      });
    }, { confirmLabel: 'Delete', variant: 'danger' });
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
    const rawExpr = paramRow?.get('formulaExpression')?.value || '';

    // Build available params list (excluding current row)
    const params = this.getParameters(planIndex, testIndex);
    this.formulaAvailableParams = [];
    params.controls.forEach((row, idx) => {
      if (idx === paramIndex) return;
      const v = row.value;
      if (v.parameterID) {
        const pName = v.parameterName || this.globalParamMap[v.parameterID] || `Param ${v.parameterID}`;
        this.formulaAvailableParams.push({
          parameterID: v.parameterID,
          parameterName: pName,
          unit: v.unit || '',
          ref: `P${v.parameterID}`
        });
      }
    });

    // Also include any parameters explicitly referenced in rawExpr that exist in globalParamMap
    const referencedIds = (rawExpr.match(/\{?P(\d+)\}?/gi) || []).map((m: string) => Number(m.replace(/\D/g, '')));
    referencedIds.forEach((id: number) => {
      if (id && !this.formulaAvailableParams.some(p => p.parameterID === id)) {
        const pName = this.globalParamMap[id];
        if (pName) {
          this.formulaAvailableParams.push({
            parameterID: id,
            parameterName: pName,
            unit: '',
            ref: `P${id}`
          });
        }
      }
    });

    const displayFormula = paramRow?.get('formulaDisplay')?.value;
    if (displayFormula && !/\{?P\d+\}?/i.test(displayFormula)) {
      this.formulaExpression = displayFormula;
    } else {
      this.formulaExpression = formatFormulaDisplay(rawExpr, this.formulaAvailableParams, this.globalParamMap);
    }
    this.formulaCursorPos = this.formulaExpression.length;
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

    const displayFormula = this.formulaExpression.trim();
    // Convert human-readable parameter names into internal {P123} tokens for storage and math calculation
    const allAvailable = [
      ...this.formulaAvailableParams,
      ...Object.entries(this.globalParamMap).map(([id, name]) => ({
        parameterID: Number(id),
        parameterName: name
      }))
    ];
    const tokenizedExpr = convertNamesToFormulaTokens(displayFormula, allAvailable);

    paramRow?.patchValue({
      formulaExpression: tokenizedExpr,
      formulaDisplay: displayFormula
    });
    this.showFormulaBuilderModal = false;

    // Evaluate formula on UI side immediately
    const calculatedValue = this.evaluateFormula(tokenizedExpr, planIndex, testIndex, paramIndex);
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

  /** Apply smart formula — convert to friendly parameter names */
  applySmartFormula(): void {
    if (!this.smartFormulaValid) return;

    const specialConstants: Record<string, string> = { 'pi': '3.14159265', 'PI': '3.14159265', 'π': '3.14159265' };

    // Build friendly expression using parameter names, not raw IDs
    const parts = this.smartFormulaTokens.map(t => {
      if (t.type === 'param' && t.matched) return t.matched;
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
   * Supports P{ID} references, parameter names, basic math (+,-,*,/,(,)), and functions (MEAN, MAX, MIN, SUM, COUNT, STDEV).
   * Returns the calculated numeric value, or null if evaluation fails.
   */
  evaluateFormula(expression: string, planIndex: number, testIndex: number, excludeParamIndex: number): number | null {
    if (!expression || !expression.trim()) return null;

    try {
      const params = this.getParameters(planIndex, testIndex);
      // Build a map of P{ID} -> numeric value and parameterName -> numeric value
      const paramValueMap: Record<string, number> = {};
      params.controls.forEach((row, idx) => {
        const v = row.value;
        if (v.value != null && v.value !== '') {
          const numVal = Number(v.value);
          if (v.parameterID) {
            paramValueMap[`P${v.parameterID}`] = numVal;
          }
          if (v.parameterName) {
            paramValueMap[v.parameterName.toLowerCase()] = numVal;
          }
          if (v.symbol) {
            paramValueMap[v.symbol.toLowerCase()] = numVal;
          }
        }
      });

      let expr = expression.trim();
      if (!/\{?P\d+\}?/i.test(expr)) {
        expr = convertNamesToFormulaTokens(expr, params.controls.map(c => c.value));
      }

      // Parity with FormulaEvaluator.ConvertToNCalcExpression: strip target assignment (e.g. "UTS = Load / Area")
      const eqIdx = expr.indexOf('=');
      if (eqIdx > 0 && !expr.startsWith('>=') && !expr.startsWith('<=') && !expr.startsWith('==') && !expr.startsWith('!=')) {
        const left = expr.substring(0, eqIdx).trim();
        if (/^[a-zA-Z_%][a-zA-Z0-9_ %]*$/.test(left)) {
          expr = expr.substring(eqIdx + 1).trim();
        }
      }
      // Strip % prefix from parameter tokens (e.g. "%C" -> "C"), parity with backend
      expr = expr.replace(/%([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1');

      // Replace aggregate functions: MEAN/AVG/MAX/MIN/SUM/COUNT/STDEV(...)
      expr = expr.replace(/(MEAN|AVG|MAX|MIN|SUM|COUNT|STDEV)\(([^)]+)\)/gi, (match, fn, args) => {
        const argTokens = args.split(',').map((a: string) => a.trim().replace(/[{}]/g, ''));
        const values: number[] = [];
        for (const token of argTokens) {
          const normKey = /^P\d+$/i.test(token) ? token.toUpperCase() : token;
          if (paramValueMap[normKey] !== undefined) {
            values.push(paramValueMap[normKey]);
          } else if (!isNaN(Number(token))) {
            values.push(Number(token));
          } else {
            return 'NaN'; // unresolved reference
          }
        }
        if (values.length === 0) return 'NaN';

        const fnUpper = fn.toUpperCase();
        switch (fnUpper) {
          case 'MEAN':
          case 'AVG': return String(values.reduce((a, b) => a + b, 0) / values.length);
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

      // Replace {P<ID>} and P<ID> references with their numeric values (parity with backend {P12} tokens)
      expr = expr.replace(/\{?P(\d+)\}?/g, (match, id) => {
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

  // =========================================================================
  // Technical Raw Data Sheet Preview (ISO 17025 Clause 7.5)
  // =========================================================================
  showRawDataSheetModal = false;
  rawDataSheetData: any = null;

  /**
   * Raw data sheet of one test: the fixed identification block plus the test itself, shown by the layout renderer in
   * print mode on the layout the test was entered with (its saved snapshot). Nothing is filled in with default values.
   */
  openRawDataSheetModal(planIndex?: number, testIndex?: number): void {
    const pIdx = planIndex ?? this.activePlanIndex;
    const tIdx = testIndex ?? 0;
    const plan = this.plans[pIdx];
    if (!plan) return;
    const test = plan.tests?.[tIdx];
    if (!test) return;

    if (!this.canViewRawDataSheet(test.status)) {
      this.toastService.show('Technical Raw Data Sheet is available only after the test is completed.', 'warning');
      return;
    }

    // The live renderer pushes its lists (checklist, traverse, observations, hidden rows) to the test before the copy reads them
    if (pIdx === this.activePlanIndex) this.layoutRendererComponent?.syncCollectionsToTest();

    const testGroup = this.getTests(pIdx)?.at(tIdx) as FormGroup;
    const layout = this.resolveSheetLayout(pIdx, test, testGroup);
    const rows: any[] = (testGroup?.get('parameters') as FormArray)?.getRawValue?.() || test.parameters || [];

    // Group fallback rawParameters by unique parameter (scoped to active layout keys) with side-by-side specimens
    const activeKeys = this.getActiveLayoutParameterKeys(pIdx, tIdx);
    const activeKeySet = activeKeys ? new Set(activeKeys) : null;
    const spmLabels = this.getActiveSpecimenLabels();
    const spmCount = Math.max(1, spmLabels.length);
    const groupedMap = new Map<string, { first: any; bySpm: Map<number, any> }>();
    rows.forEach((p: any, idx: number) => {
      const key = (p.parameterID != null && Number(p.parameterID) !== 0)
        ? `id:${p.parameterID}`
        : `name:${String(p.parameterName || '').trim().toLowerCase() || idx}`;
      if (activeKeySet && !activeKeySet.has(key)) return;
      const spmIdx = Math.max(0, Number(p.specimenIndex) || 0);
      if (spmIdx >= spmCount) return;
      let entry = groupedMap.get(key);
      if (!entry) {
        entry = { first: p, bySpm: new Map<number, any>() };
        groupedMap.set(key, entry);
      }
      if (!entry.bySpm.has(spmIdx)) entry.bySpm.set(spmIdx, p);
    });
    const orderedKeys: string[] = [];
    if (activeKeys) {
      activeKeys.forEach(k => { if (groupedMap.has(k) && !orderedKeys.includes(k)) orderedKeys.push(k); });
    }
    groupedMap.forEach((_, k) => { if (!orderedKeys.includes(k)) orderedKeys.push(k); });
    const rawParameters = orderedKeys.map(k => {
      const entry = groupedMap.get(k)!;
      const first = entry.first;
      const specimenValues = Array.from({ length: spmCount }, (_, s) => {
        const sp = entry.bySpm.get(s);
        const val = sp?.value !== null && sp?.value !== undefined && sp?.value !== '' ? sp.value : (sp?.remarks || '');
        return val !== '' && val !== null && val !== undefined ? String(val) : '—';
      });
      return {
        name: first.parameterName,
        unit: first.unit || '—',
        specimenValues,
        requirement: this.formatRequirement(first),
        status: this.getParameterStatus(first)
      };
    });

    this.rawDataSheetData = {
      sample: this.sample,
      inward: this.inward,
      plan,
      test,
      testGroup,
      layout,
      hasSignSection: !!(layout?.sections || []).some((s: any) => s.type === 'sign' && s.config?.enabled !== false),
      env: this.environmentMap[test.headerId] || null,
      conditions: this.getSelectedConditionRows(test.headerId),
      equipment: this.selectedEquipmentMap[test.headerId] || [],
      images: this.testImagesMap[test.headerId] || [],
      timing: this.testTimingMap[test.headerId] || {},
      info: this.withConditionSuffix(this.buildSheetInfo(plan, test, pIdx, tIdx), layout, test),
      rawSpecimenLabels: spmLabels,
      rawParameters,
      generatedAt: new Date()
    };

    this.showRawDataSheetModal = true;
  }

  /**
   * Identification lines of the sheet, in the order of the lab's report format. A line with no recorded value is left
   * out of the sheet (the template hides empty ones); nothing is filled in with a default.
   */
  /** Adds the condition the layout names to the test name of the record ("IMPACT TEST @ -29 °C"). */
  private withConditionSuffix(info: any, layout: any, test: any): any {
    const sec = (layout?.sections || []).find((s: any) => ['condition', 'cond'].includes(String(s?.type || '').toLowerCase()) && String(s?.config?.titleSuffixField ?? '').trim());
    if (!sec || !info) return info;
    let extra: any = test?.executionExtraJson;
    try {
      extra = typeof extra === 'string' ? JSON.parse(extra) : extra;
    } catch {
      extra = null;
    }
    const value = String(extra?.conditionValues?.[String(sec.config.titleSuffixField).trim()] ?? '').trim();
    return value ? { ...info, testName: `${info.testName} @ ${value}`.trim() } : info;
  }

  private buildSheetInfo(plan: any, test: any, planIndex: number = this.activePlanIndex, testIndex: number = 0): any {
    const details: any[] = this.sample?.additionalDetails || [];
    const norm = (s: any) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const detail = (...labels: string[]): string => {
      const wanted = labels.map(norm);
      const hit = details.find(d => wanted.includes(norm(d?.label)) && String(d?.value ?? '').trim() !== '');
      return hit ? String(hit.value).trim() : '';
    };
    const timing = this.testTimingMap[test.headerId] || {};
    const testedOn = timing.testEndTime || timing.testStartTime || null;
    const spec = plan?.specification && plan.specification !== 'Unknown' ? plan.specification : '';
    const env = this.environmentMap[test.headerId] || null;
    const envParts: string[] = [];
    if (env?.roomTemperature != null) envParts.push(`${env.roomTemperature} °C`);
    if (env?.roomHumidity != null) envParts.push(`${env.roomHumidity} % RH`);

    const scopeCounts = this.getNablScopeCounts(planIndex, testIndex);
    const accreditationScope = scopeCounts.inScope > 0 && scopeCounts.outOfScope === 0
      ? `In Scope (${scopeCounts.inScope} parameter${scopeCounts.inScope > 1 ? 's' : ''})`
      : scopeCounts.inScope > 0 && scopeCounts.outOfScope > 0
        ? `Partly in Scope (${scopeCounts.inScope} in, ${scopeCounts.outOfScope} out)`
        : scopeCounts.outOfScope > 0
          ? `Outside Scope (${scopeCounts.outOfScope})`
          : 'Not Configured in Lab Scope Master';

    const specimenSize = this.hasSpecimenSize(planIndex, testIndex)
      ? this.getSpecimenSizeSummary(planIndex, testIndex)
      : '';

    const liveVerdict = planIndex === this.activePlanIndex ? this.layoutRendererComponent?.conformityVerdict : null;
    const verdictLabel = liveVerdict?.label || this.computeFallbackVerdictLabel(planIndex, testIndex, test);

    return {
      reference: detail('Reference', 'Customer Reference', 'Letter No', 'Ref No') || this.inward?.poNo || '',
      description: this.sample?.details || '',
      stampedAs: detail('Stamped As', 'Stamped', 'Identification Mark', 'Marking'),
      sampleDrawnBy: detail('Sample Drawn By', 'Drawn By'),
      natureOfSample: detail('Nature of Sample') || this.sample?.productForm || this.sample?.productMasterName || '',
      heatNo: detail('Heat No', 'Heat Number') || '',
      batchNo: detail('Batch No', 'Batch Number') || '',
      specification: spec,
      discipline: String(plan?.discipline || '').toUpperCase(),
      technique: plan?.analysisTechnique && plan.analysisTechnique !== '—' ? String(plan.analysisTechnique).toUpperCase() : '',
      testName: String(test?.name || '').toUpperCase(),
      method: this.getCleanMethodLabel(plan?.methodName),
      testedOn: testedOn ? this.formatDateDisplay(testedOn) : '',
      testedDateTime: testedOn ? this.formatDateTime(testedOn) : '',
      environment: envParts.join(' / '),
      specimenSize,
      accreditationScope,
      verdictLabel,
      testedBy: timing.performedByName || '',
    };
  }

  /** Computes conformity verdict label when the Tab 1 renderer is unmounted (e.g. Raw Data Sheet opened from Tab 2). */
  private computeFallbackVerdictLabel(planIndex: number, testIndex: number, test: any): string {
    const paramsFA = this.getParameters(planIndex, testIndex);
    const activeKeys = this.getActiveLayoutParameterKeys(planIndex, testIndex);
    const activeSet = activeKeys ? new Set(activeKeys) : null;
    const toNum = (v: any): number | null => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));

    let withValue = 0;
    let judged = 0;
    let failed = 0;

    if (paramsFA && paramsFA.length > 0) {
      for (const ctrl of paramsFA.controls) {
        const r = (ctrl as FormGroup).getRawValue();
        if (activeSet) {
          const k = r.parameterID != null ? `id:${r.parameterID}` : `name:${String(r.parameterName || '').trim().toLowerCase()}`;
          if (!activeSet.has(k)) continue;
        }
        const v = toNum(r.value);
        if (v === null) continue;
        withValue++;
        const min = toNum(r.minValue ?? r.specMinValue);
        const max = toNum(r.maxValue ?? r.specMaxValue);
        if (min === null && max === null) continue;
        judged++;
        if ((min !== null && v < min) || (max !== null && v > max)) {
          failed++;
        }
      }
    }

    if (withValue === 0) {
      if (test?.isOverallPass === true) return 'CONFORMING (PASS)';
      if (test?.isOverallPass === false) return 'NON-CONFORMING (FAIL)';
      return 'RESULTS PENDING';
    }
    if (judged === 0) return 'NOT ASSESSED';
    return failed > 0 ? 'NON-CONFORMING (FAIL)' : 'CONFORMING (PASS)';
  }

  /** dd-MM-yyyy, as on the lab's reports. */
  formatSheetDate(value: any): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
  }

  /** "FIE 400KN UTM (DMSPL/07/01) Cal. Dt: … Due Dt.: …", only with the parts that are recorded. */
  sheetEquipmentLine(eq: any): string {
    if (!eq) return '';
    const code = eq.code || eq.equipmentCode || eq.equipmentId || eq.assetCode || '';
    const cal = eq.lastCalibrationDate || eq.calibrationDate || null;
    const due = eq.nextCalibrationDueDate || eq.nextCalibrationDate || null;
    // a saved id whose equipment is inactive or deleted: say so instead of printing a bare id
    if (eq.notFound) return `Equipment #${eq.id} (not found in equipment master)`;
    let line = eq.name || `Equipment #${eq.id}`;
    if (code) line += ` (${code})`;
    if (cal) line += ` Cal. Dt: ${this.formatSheetDate(cal)}`;
    if (due) line += ` Due Dt.: ${this.formatSheetDate(due)}`;
    return line;
  }

  /** Layout of the sheet: the snapshot saved with the test; for a test not saved with one yet, the layout on screen. */
  private resolveSheetLayout(planIndex: number, test: any, testGroup: FormGroup | null): any {
    const snapshot = testGroup?.get('layoutSnapshotJson')?.value || test?.layoutSnapshotJson;
    if (snapshot) {
      try {
        const parsed = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
        if (parsed?.sections?.length || parsed?.parsedConfig?.sections?.length) return parsed;
      } catch {
        // an unreadable snapshot falls through to the layout on screen
      }
    }
    return planIndex === this.activePlanIndex ? (this.currentTestLayout || null) : null;
  }

  closeRawDataSheetModal(): void {
    this.showRawDataSheetModal = false;
    this.rawDataSheetData = null;
  }

  printRawDataSheet(): void {
    window.print();
  }



  // ================================================================
  // Material Specification Condition Filter Engine
  // ================================================================
  getConditionFilter(headerId: number) {
    if (!this.selectedConditionsMap[headerId]) {
      this.selectedConditionsMap[headerId] = {
        dimensionalFactorID: null,
        heatTreatmentID: null,
        productConditionID1: null,
        productConditionID2: null,
        specimenOrientationID: null
      };
    }
    return this.selectedConditionsMap[headerId];
  }

  isEquipmentCalibrated(equipment: any): boolean {
    if (!equipment) return true;
    if (equipment.calibrationRequired === false) return true;
    const dueDate = equipment.nextCalibrationDueDate || equipment.nextCalibrationDate;
    if (!dueDate) return true;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due >= today;
  }

  /** Green when calibrated, red when expired, grey when there is nothing to judge. */
  equipmentBadgeClass(equipment: any): string {
    const text = this.getEquipmentCalibrationText(equipment);
    if (text.startsWith('Valid')) return 'bg-success-subtle text-success border border-success-subtle';
    if (text.startsWith('EXPIRED') || text.startsWith('Equipment not found')) return 'bg-danger-subtle text-danger border border-danger-subtle';
    return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
  }

  /** Method caption without doubled prefixes ("IS IS") or doubled years, shared by the toolbar and the trace card. */
  getCleanMethodLabel(name?: string | null): string {
    return String(name || '')
      .replace(/\bIS\s+IS\b/gi, 'IS')
      .replace(/\bASTM\s+ASTM\b/gi, 'ASTM')
      .replace(/\bISO\s+ISO\b/gi, 'ISO')
      .replace(/\(Part\s+(\d+)\)\s*[-–:]\s*\(Part\s+\1\)/gi, '(Part $1)')
      .replace(/(\b\d{4}\b)\s+\1/g, '$1')
      .trim();
  }

  equipmentNames(list: any[] | null | undefined): string {
    const names = (list || []).map(e => e.name || `Equipment #${e.id}`);
    return names.length ? names.join(', ') : 'Not recorded';
  }

  getEquipmentCalibrationText(equipment: any): string {
    if (!equipment) return 'Not assigned';
    if (equipment.notFound) return 'Equipment not found in master';
    if (equipment.detailsLoaded !== true && equipment.calibrationRequired === undefined && !equipment.nextCalibrationDueDate) {
      return 'Checking calibration';
    }
    if (equipment.calibrationRequired === false) return 'Calibration not required';
    const dueDate = equipment.nextCalibrationDueDate || equipment.nextCalibrationDate;
    if (!dueDate) return 'Due date not recorded';
    const d = new Date(dueDate);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return this.isEquipmentCalibrated(equipment) ? `Valid (${dateStr})` : `EXPIRED (${dateStr})`;
  }

  // ================================================================
  // Specification condition engine
  // Dropdown options come ONLY from the grade's own specification lines (scoped to this
  // test + method), so only valid combinations are offered. A line that leaves a facet empty
  // is a wildcard for that facet.
  // ================================================================
  /** Left-rail selections as real columns on the result header (limits are re-picked server-side from these). */
  private getSpecConditionPayload(headerId: number): Record<string, any> {
    const f: any = this.selectedConditionsMap[headerId];
    const dfParts = (f?.facets?.['df'] || '').split('|');
    const hasDf = !!f?.facets?.['df'];
    const num = (v: string | undefined) => (v !== undefined && v !== '' ? Number(v) : null);
    return {
      specDimensionalFactorID: hasDf ? num(dfParts[0]) : null,
      specDimLowerSymbol: hasDf ? dfParts[1] || null : null,
      specDimLowerValue: hasDf ? num(dfParts[2]) : null,
      specDimUpperSymbol: hasDf ? dfParts[3] || null : null,
      specDimUpperValue: hasDf ? num(dfParts[4]) : null,
      specHeatTreatmentID: f?.heatTreatmentID || null,
      specProductConditionID1: f?.productConditionID1 || null,
      specProductConditionID2: f?.productConditionID2 || null,
      specProductSizeMasterID: f?.productSizeMasterID || null,
      specTestCondition: f?.testCondition || null,
      specSpecimenOrientationID: f?.specimenOrientationID || null
    };
  }

  /** Rebuild the dropdown selections from the saved header columns (they win over the older JSON copy). */
  private restoreSpecConditions(test: any): void {
    const hasAny = test.specDimensionalFactorID || test.specHeatTreatmentID || test.specProductConditionID1 || test.specProductConditionID2
      || test.specProductSizeMasterID || test.specTestCondition || test.specSpecimenOrientationID;
    if (!hasAny) return;
    const f: any = this.getConditionFilter(test.headerId);
    f.facets = {
      df: test.specDimensionalFactorID
        ? [test.specDimensionalFactorID, test.specDimLowerSymbol ?? '', test.specDimLowerValue ?? '', test.specDimUpperSymbol ?? '', test.specDimUpperValue ?? ''].join('|')
        : null,
      ht: test.specHeatTreatmentID ? String(test.specHeatTreatmentID) : null,
      pc: test.specProductConditionID1 || test.specProductConditionID2 ? `${test.specProductConditionID1 || 0}|${test.specProductConditionID2 || 0}` : null,
      tc: test.specTestCondition || null,
      ps: test.specProductSizeMasterID ? String(test.specProductSizeMasterID) : null,
      or: test.specSpecimenOrientationID ? String(test.specSpecimenOrientationID) : null
    };
    this.syncLegacyConditionIds(test.headerId);
  }

  private readonly conditionFacets = ['df', 'ht', 'pc', 'tc', 'ps', 'or'];
  conditionLines: Record<number, any[]> = {};
  private conditionOptionsMap: Record<number, Record<string, CondOption[]>> = {};
  private conditionPresentMap: Record<number, Record<string, boolean>> = {};
  conditionConflicts: Record<number, string[]> = {};
  /** Per condition: why choosing it matters (shown on hover of the "i" icon while it is not chosen). */
  conditionHints: Record<number, Record<string, string>> = {};
  /** Parameters whose grade lines exist but none fits the selected conditions (no limit is shown for them). */
  conditionNotApplicable: Record<number, string[]> = {};
  /** Parameters whose limit changes with the size range (their limits are listed under the dropdowns). */
  private conditionVaryingParams: Record<number, Set<string>> = {};
  /** "Limits for this selection": limit of each size-dependent parameter for the chosen range. */
  conditionLimitSummary: Record<number, { name: string; limit: string; source: string }[]> = {};
  /** More ranges than this means the grade cuts its parameters' size ranges very differently. */
  readonly maxComfortableSegments = 12;
  /** True when neither the plan nor the sample carries a specification grade. */
  conditionNoGrade: Record<number, boolean> = {};
  private conditionLinesCache: Record<string, any[]> = {};
  /** Facets pre-selected from the sample (shown with an "Auto" tag until the user changes them). */
  conditionAuto: Record<number, Record<string, boolean>> = {};
  /** Which specification line each parameter's limits came from. */
  requirementSources: Record<number, { name: string; min: any; max: any; unit: string; source: string }[]> = {};
  readonly conditionFacetLabels: Record<string, string> = {
    df: 'Dimensional Factor + Limit',
    ht: 'Heat Treatment',
    pc: 'Product Condition',
    tc: 'Test Condition',
    ps: 'Product Size',
    or: 'Specimen Orientation'
  };

  private lineFacetValue(line: any, facet: string): string | null {
    switch (facet) {
      case 'df':
        return line.dimensionalFactorID
          ? [line.dimensionalFactorID, line.lowerLimitValue ?? '', line.lowerLimitDecimalValue ?? '', line.upperLimitValue ?? '', line.upperLimitDecimalValue ?? ''].join('|')
          : null;
      case 'ht':
        return line.heatTreatmentID ? String(line.heatTreatmentID) : null;
      case 'pc':
        return line.productConditionID1 || line.productConditionID2 ? `${line.productConditionID1 || 0}|${line.productConditionID2 || 0}` : null;
      case 'tc':
        return (line.testCondition || '').trim() || null;
      case 'ps':
        return line.productSizeMasterID ? String(line.productSizeMasterID) : null;
      case 'or':
        return line.specimenOrientationID ? String(line.specimenOrientationID) : null;
    }
    return null;
  }

  /** Readable label, e.g. "Thickness > 16 ≤ 40 mm" or "As-Rolled + Descaled". */
  private lineFacetLabel(line: any, facet: string): string {
    switch (facet) {
      case 'df': {
        const lower = line.lowerLimitDecimalValue != null ? `${line.lowerLimitValue || '≥'} ${line.lowerLimitDecimalValue}` : '';
        const upper = line.upperLimitDecimalValue != null ? `${line.upperLimitValue || '≤'} ${line.upperLimitDecimalValue}` : '';
        return [line.dimensionalFactorName, lower, upper, line.dimensionalFactorUnit].filter(x => !!x).join(' ');
      }
      case 'ht':
        return line.heatTreatmentName || '';
      case 'pc':
        return [line.productConditionName1, line.productConditionName2].filter(x => !!x).join(' + ');
      case 'tc':
        return (line.testCondition || '').trim();
      case 'ps':
        return line.productSizeName || '';
      case 'or':
        return line.specimenOrientationName || '';
    }
    return '';
  }

  private getFacetSel(headerId: number, facet: string): string | null {
    return (this.getConditionFilter(headerId) as any).facets?.[facet] ?? null;
  }

  private setFacetSel(headerId: number, facet: string, value: string | null): void {
    const f: any = this.getConditionFilter(headerId);
    f.facets = f.facets || {};
    f.facets[facet] = value;
  }

  private lineMatchesSelection(line: any, headerId: number, skipFacet?: string): boolean {
    return this.conditionFacets.every(fc => {
      if (fc === skipFacet) return true;
      const sel = this.getFacetSel(headerId, fc);
      if (!sel) return true;
      if (fc === 'df') return this.lineMatchesDf(line, sel);
      const lv = this.lineFacetValue(line, fc);
      return lv === null || lv === sel;
    });
  }

  // ---- Dimensional factor: the dropdown holds SEGMENTS of the factor, a line matches when the
  // ---- chosen segment lies inside the line's own band (so "≥ 20 ≤ 25" matches a "≥ 20 ≤ 40" line).
  private parseDfKey(key: string | null): { factorId: number; band: LimitBand } | null {
    if (!key) return null;
    const p = key.split('|');
    const num = (v?: string) => (v !== undefined && v !== '' ? Number(v) : null);
    return {
      factorId: Number(p[0]),
      band: { lowerSymbol: p[1] || null, lowerValue: num(p[2]), upperSymbol: p[3] || null, upperValue: num(p[4]) }
    };
  }

  private dfKeyOf(factorId: number, seg: LimitBand): string {
    return [factorId, seg.lowerSymbol ?? '', seg.lowerValue ?? '', seg.upperSymbol ?? '', seg.upperValue ?? ''].join('|');
  }

  private lineBand(line: any): LimitBand {
    return {
      lowerSymbol: line.lowerLimitValue ?? null,
      lowerValue: line.lowerLimitDecimalValue ?? null,
      upperSymbol: line.upperLimitValue ?? null,
      upperValue: line.upperLimitDecimalValue ?? null
    };
  }

  private lineMatchesDf(line: any, selectedKey: string): boolean {
    if (!line.dimensionalFactorID) return true;
    const sel = this.parseDfKey(selectedKey);
    if (!sel) return true;
    if (Number(line.dimensionalFactorID) !== sel.factorId) return false;
    return segmentWithinBand(sel.band, this.lineBand(line));
  }

  private limitText(line: any): string {
    const min = line?.minValue;
    const max = line?.maxValue;
    if (min != null && max != null) return `${min} – ${max}`;
    if (min != null) return `≥ ${min}`;
    if (max != null) return `≤ ${max}`;
    return '';
  }

  /**
   * Segment options of every factor used by these lines. The label stays short (band + how many limits change);
   * `varyingNames` collects the parameters whose limit differs between segments, shown in "Limits for this selection".
   */
  private buildDfOptions(candidates: any[], varyingNames: Set<string>): CondOption[] {
    const byFactor = new Map<number, any[]>();
    for (const l of candidates) {
      if (!l.dimensionalFactorID) continue;
      const id = Number(l.dimensionalFactorID);
      byFactor.set(id, [...(byFactor.get(id) || []), l]);
    }
    const options: CondOption[] = [];
    byFactor.forEach((factorLines, factorId) => {
      const segments = buildBandSegments(factorLines.map(l => this.lineBand(l)));
      const name = factorLines[0].dimensionalFactorName || 'Dimension';
      const unit = factorLines[0].dimensionalFactorUnit || '';

      // limit of each parameter inside each segment (a line with this factor's band wins over a line without one)
      const params = new Map<number, string>();
      factorLines.forEach(l => params.set(l.parameterID, l.parameterName || ''));
      const limitsBySegment: Map<number, string>[] = segments.map(seg => {
        const m = new Map<number, string>();
        params.forEach((_n, pid) => {
          const own = candidates.filter(l => l.parameterID === pid);
          const withBand = own.find(l => l.dimensionalFactorID && Number(l.dimensionalFactorID) === factorId && segmentWithinBand(seg, this.lineBand(l)));
          const line = withBand || own.find(l => !l.dimensionalFactorID);
          const text = this.limitText(line);
          if (text) m.set(pid, text);
        });
        return m;
      });
      const varying = Array.from(params.keys()).filter(pid => new Set(limitsBySegment.map(m => m.get(pid) ?? '')).size > 1);

      varying.forEach(pid => varyingNames.add(params.get(pid) || ''));

      segments.forEach((seg, i) => {
        const label = [name, formatBand(seg), unit].filter(x => !!x).join(' ');
        // only the limits that change with the range, e.g. "YS ≥ 245 · El ≥ 23"
        const hint = varying
          .filter(pid => limitsBySegment[i].has(pid))
          .map(pid => `${parameterShortName(params.get(pid))} ${limitsBySegment[i].get(pid)}`)
          .join(' · ');
        options.push({ value: this.dfKeyOf(factorId, seg), label, hint });
      });
    });
    return options;
  }

  /** Short text for the chip under a row's requirement, e.g. "≥ 20 ≤ 40 mm" or "Grade default". */
  private lineChipLabel(line: any): string {
    const parts: string[] = [];
    if (line.dimensionalFactorID) {
      parts.push([formatBand(this.lineBand(line)), line.dimensionalFactorUnit].filter(x => !!x).join(' '));
    }
    for (const fc of ['ht', 'pc', 'tc', 'ps', 'or']) {
      const text = this.lineFacetLabel(line, fc);
      if (text) parts.push(text);
    }
    return parts.filter(x => !!x).join(' · ') || 'Grade default';
  }

  /** View mode runs no condition engine: label each row from the spec line it was saved with. */
  private labelRowSources(planIndex: number, testIndex: number, headerId: number): void {
    const lines = this.conditionLines[headerId] || [];
    const paramsFA = this.getParameters(planIndex, testIndex);
    for (let i = 0; paramsFA && i < paramsFA.length; i++) {
      const group = paramsFA.at(i);
      const lineId = group.get('specificationLineID')?.value;
      const line = lineId ? lines.find(l => l.specificationLineID === lineId) : null;
      group.get('specSource')?.setValue(line ? this.lineChipLabel(line) : '', { emitEvent: false });
    }
    this.cdr.markForCheck();
  }

  /** True when the saved (possibly older, full-band) selection still lies inside some line of the same factor. */
  private isDfSelectionUsable(candidates: any[], selectedKey: string): boolean {
    const sel = this.parseDfKey(selectedKey);
    if (!sel) return false;
    return candidates.some(l => l.dimensionalFactorID && Number(l.dimensionalFactorID) === sel.factorId && segmentWithinBand(sel.band, this.lineBand(l)));
  }

  condFacetPresent(headerId: number, facet: string): boolean {
    return !!this.conditionPresentMap[headerId]?.[facet];
  }

  condOptions(headerId: number, facet: string): CondOption[] {
    return this.conditionOptionsMap[headerId]?.[facet] || [];
  }

  condSelection(headerId: number, facet: string): string | null {
    return this.getFacetSel(headerId, facet);
  }

  /** Chosen conditions of a test as label/value rows (used by the raw data sheet). Empty when nothing is chosen. */
  getSelectedConditionRows(headerId: number): { label: string; value: string }[] {
    const rows: { label: string; value: string }[] = [];
    for (const facet of this.conditionFacets) {
      if (!this.condFacetPresent(headerId, facet)) continue;
      const sel = this.condSelection(headerId, facet);
      if (!sel) continue;
      const opt = this.condOptions(headerId, facet).find(o => o.value === sel);
      if (opt?.label) rows.push({ label: this.conditionFacetLabels[facet] || facet, value: opt.label });
    }
    return rows;
  }

  /** Rebuild each dropdown from the lines left valid by the OTHER selections; auto-pick a single option. */
  private refreshConditionOptions(headerId: number): void {
    const lines = this.conditionLines[headerId] || [];
    const options: Record<string, CondOption[]> = {};
    const present: Record<string, boolean> = {};
    for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (const fc of this.conditionFacets) {
        const found = new Map<string, string>();
        const hints = new Map<string, string>();
        const candidates = lines.filter(l => this.lineMatchesSelection(l, headerId, fc));
        if (fc === 'df') {
          const varyingNames = new Set<string>();
          this.buildDfOptions(candidates, varyingNames).forEach(o => {
            found.set(o.value, o.label);
            if (o.hint) hints.set(o.value, o.hint);
          });
          this.conditionVaryingParams[headerId] = varyingNames;
          // an older save may hold a whole line band instead of a segment: keep it while a line still contains it
          const saved = this.getFacetSel(headerId, 'df');
          if (saved && !found.has(saved) && this.isDfSelectionUsable(candidates, saved)) {
            const sel = this.parseDfKey(saved)!;
            const first = candidates.find(l => Number(l.dimensionalFactorID) === sel.factorId);
            found.set(saved, [first?.dimensionalFactorName, formatBand(sel.band), first?.dimensionalFactorUnit].filter(x => !!x).join(' '));
          }
        } else {
          for (const l of candidates) {
            const v = this.lineFacetValue(l, fc);
            if (v !== null && !found.has(v)) found.set(v, this.lineFacetLabel(l, fc));
          }
        }
        options[fc] = Array.from(found, ([value, label]) => ({ value, label, hint: hints.get(value) }));
        present[fc] = lines.some(l => this.lineFacetValue(l, fc) !== null);
        const sel = this.getFacetSel(headerId, fc);
        if (sel && !found.has(sel)) {
          this.setFacetSel(headerId, fc, null);
          changed = true;
        } else if (!sel && options[fc].length === 1) {
          this.setFacetSel(headerId, fc, options[fc][0].value);
          changed = true;
        }
      }
      if (!changed) break;
    }
    this.conditionOptionsMap[headerId] = options;
    this.conditionPresentMap[headerId] = present;
    // new key => every condition dropdown drops its cached list and reloads on the next open
    this.conditionVersion[headerId] = (this.conditionVersion[headerId] || 0) + 1;
    this.syncLegacyConditionIds(headerId);
  }

  // ---- Condition dropdowns use app-searchable-dropdown with a local list --------------------------
  conditionVersion: Record<number, number> = {};
  /** Display order of the condition dropdowns. */
  readonly conditionFacetOrder: string[] = ['or', 'df', 'ht', 'pc', 'ps', 'tc'];
  private condFetchCache: Record<string, (term: string, page: number, pageSize: number) => Observable<any[]>> = {};
  private condSelectedCache: Record<string, { id: string; name: string }> = {};

  /** Stable fetch function per header + facet (a new function on every check would reload the dropdown). */
  condFetch(headerId: number, facet: string): (term: string, page: number, pageSize: number) => Observable<any[]> {
    const key = `${headerId}_${facet}`;
    if (!this.condFetchCache[key]) {
      this.condFetchCache[key] = (term: string, page: number, pageSize: number) => {
        const t = (term || '').toLowerCase().trim();
        const items: any[] = [];
        if (!t) items.push({ id: null, name: facet === 'df' ? 'All sizes' : 'All' });
        for (const o of this.condOptions(headerId, facet)) {
          const name = o.hint ? `${o.label} (${o.hint})` : o.label;
          if (!t || name.toLowerCase().includes(t)) items.push({ id: o.value, name });
        }
        return of(items.slice(page * pageSize, (page + 1) * pageSize));
      };
    }
    return this.condFetchCache[key];
  }

  /** Selected option as an object with a stable reference (null when nothing is chosen). */
  condSelectedItem(headerId: number, facet: string): { id: string; name: string } | null {
    const sel = this.getFacetSel(headerId, facet);
    if (!sel) return null;
    // the limit hint belongs to the open list only; the chosen value shows just the condition
    const name = this.condOptions(headerId, facet).find(o => o.value === sel)?.label ?? sel;
    const key = `${headerId}_${facet}`;
    const cached = this.condSelectedCache[key];
    if (cached && cached.id === sel && cached.name === name) return cached;
    return (this.condSelectedCache[key] = { id: sel, name });
  }

  onCondItemSelected(planIndex: number, testIndex: number, facet: string, item: any): void {
    const value = item && item.id !== null && item.id !== undefined ? String(item.id) : null;
    this.onConditionFacetChanged(planIndex, testIndex, facet, value);
  }

  /** Keep the older id fields (persisted with the result) in step with the facet selections. */
  private syncLegacyConditionIds(headerId: number): void {
    const f: any = this.getConditionFilter(headerId);
    const df = this.getFacetSel(headerId, 'df');
    const pc = this.getFacetSel(headerId, 'pc');
    f.dimensionalFactorID = df ? Number(df.split('|')[0]) : null;
    f.heatTreatmentID = this.getFacetSel(headerId, 'ht') ? Number(this.getFacetSel(headerId, 'ht')) : null;
    f.productConditionID1 = pc ? Number(pc.split('|')[0]) || null : null;
    f.productConditionID2 = pc ? Number(pc.split('|')[1]) || null : null;
    f.productSizeMasterID = this.getFacetSel(headerId, 'ps') ? Number(this.getFacetSel(headerId, 'ps')) : null;
    f.testCondition = this.getFacetSel(headerId, 'tc');
    f.specimenOrientationID = this.getFacetSel(headerId, 'or') ? Number(this.getFacetSel(headerId, 'or')) : null;
  }

  /** Pre-select Dimensional Factor band and Product Size from the sample's own dimensions (editable). */
  private autoSuggestConditions(headerId: number): void {
    const lines = this.conditionLines[headerId] || [];
    const auto = (this.conditionAuto[headerId] = this.conditionAuto[headerId] || {});
    const sampleOrientation = String(this.sample?.specimenOrientation || '').trim().toLowerCase();
    const suggestions: Record<string, string | null> = {
      or: sampleOrientation ? this.condOptions(headerId, 'or').find(o => o.label.trim().toLowerCase() === sampleOrientation)?.value ?? null : null,
      df: this.suggestDfSegmentKey(headerId, lines),
      ps: suggestProductSizeKey(lines, this.sample)
    };
    for (const fc of Object.keys(suggestions)) {
      const key = suggestions[fc];
      if (!key || this.getFacetSel(headerId, fc)) continue;
      if (!this.condOptions(headerId, fc).some(o => o.value === key)) continue;
      this.setFacetSel(headerId, fc, key);
      auto[fc] = true;
    }
    this.refreshConditionOptions(headerId);
  }

  /**
   * The option holding the sample's own thickness / diameter / width (per factor). A key is returned only when
   * exactly one factor gives a match, so two factors never pick one at random.
   */
  private suggestDfSegmentKey(headerId: number, lines: any[]): string | null {
    const hits = new Set<string>();
    for (const opt of this.condOptions(headerId, 'df')) {
      const sel = this.parseDfKey(opt.value);
      if (!sel) continue;
      const factorLine = lines.find(l => Number(l.dimensionalFactorID) === sel.factorId);
      const dim = sampleDimension(this.sample, dimensionKind(factorLine?.dimensionalFactorName));
      if (dim === null) continue;
      if (bandContains(dim, sel.band.lowerSymbol, sel.band.lowerValue, sel.band.upperSymbol, sel.band.upperValue)) hits.add(opt.value);
    }
    return hits.size === 1 ? Array.from(hits)[0] : null;
  }

  isAutoCondition(headerId: number, facet: string): boolean {
    return !!this.conditionAuto[headerId]?.[facet];
  }

  /** Text of the "i" icon next to a condition that is not chosen but would decide a limit (empty: no icon). */
  conditionHint(headerId: number, facet: string): string {
    if (this.getFacetSel(headerId, facet)) return '';
    return this.conditionHints[headerId]?.[facet] || '';
  }

  /** Load the grade's lines for this test + method, then build the dropdowns and apply limits. */
  initConditionEngine(planIndex: number, testIndex: number): void {
    const plan = this.plans[planIndex];
    const test = plan?.tests?.[testIndex];
    if (!test?.headerId) return;
    const headerId = test.headerId;
    // The plan test objects do not carry the grade/method ids; they live in apiMetadata (keyed by headerId)
    const meta = [...(this.apiMetadata?.generalTests || []), ...(this.apiMetadata?.chemicalTests || [])].find((m: any) => m.headerId === headerId);
    // Same grade sources the server uses: plan first, then the grade stored on the sample
    const g1 = Number(meta?.specification1 || plan.specSelected?.id || this.sample?.specificationGradeID || this.sample?.assignedGradeID || 0);
    const g2 = Number(meta?.specification2 || 0) || null;
    this.conditionNoGrade[headerId] = !g1;
    if (!g1) return;
    // The plan's own test node and the method specification id: that is how spec lines store them
    const labTestId = Number(meta?.conditionLabTestId || meta?.laboratoryTestId || plan.labTestId || 0) || null;
    const methodId = Number(meta?.conditionMethodId || meta?.testMethodId || 0) || null;
    // Chemical tests only use chemical lines, every other test only mechanical lines
    const isChemicalTest = !!(this.apiMetadata?.chemicalTests || []).find((m: any) => m.headerId === headerId);
    const testKind = isChemicalTest ? 'chemical' : 'general';
    const key = `${g1}_${g2}_${labTestId}_${methodId}_${testKind}`;

    const ready = (lines: any[]) => {
      this.conditionLines[headerId] = lines;
      this.refreshConditionOptions(headerId);
      if (!this.isViewMode) this.autoSuggestConditions(headerId);
      if (!this.isViewMode) this.applyConditionLines(planIndex, testIndex, false);
      if (this.isViewMode) this.labelRowSources(planIndex, testIndex, headerId);
      this.cdr.markForCheck();
    };
    if (this.conditionLinesCache[key]) {
      ready(this.conditionLinesCache[key]);
      return;
    }
    this.materialSpecService.getConditionOptions(g1, g2, labTestId, methodId, testKind).subscribe({
      next: lines => {
        this.conditionLinesCache[key] = lines || [];
        ready(this.conditionLinesCache[key]);
      },
      error: () => this.toastService.show('Failed to load specification conditions for this grade', 'error')
    });
  }

  onConditionFacetChanged(planIndex: number, testIndex: number, facet: string, value: string | null): void {
    const test = this.plans[planIndex]?.tests?.[testIndex];
    if (!test?.headerId) return;
    this.setFacetSel(test.headerId, facet, value || null);
    if (this.conditionAuto[test.headerId]) this.conditionAuto[test.headerId][facet] = false;
    this.refreshConditionOptions(test.headerId);
    this.applyConditionLines(planIndex, testIndex, true);
  }

  /** Rows added or removed in the layout table (Add Parameter, specimen count): new rows get their limits from the same matched spec lines. */
  onRendererParametersAdjusted(planIndex: number, testIndex: number): void {
    if (this.isViewMode) return;
    this.applyConditionLines(planIndex, testIndex, false);
  }

  /** Per parameter, the most specific matching line wins; equal-score lines with different limits are reported. */
  private applyConditionLines(planIndex: number, testIndex: number, notify: boolean): void {
    const test = this.plans[planIndex]?.tests?.[testIndex];
    if (!test?.headerId) return;
    const headerId = test.headerId;
    const matched = (this.conditionLines[headerId] || []).filter(l => this.lineMatchesSelection(l, headerId));
    this.matchedConditionLinesCount[headerId] = matched.length;
    const conflicts: string[] = [];
    const hints: Record<string, string[]> = {};
    const notApplicable: string[] = [];
    const sources: { name: string; min: any; max: any; unit: string; source: string }[] = [];

    const paramsFA = this.getParameters(planIndex, testIndex);
    for (let i = 0; paramsFA && i < paramsFA.length; i++) {
      const group = paramsFA.at(i);
      // a parameter added from ANOTHER grade keeps the limit of its own spec line (that line is not one of this test's grade lines)
      const ownLineId = group.get('specificationLineID')?.value;
      if (group.get('isAdditional')?.value && ownLineId && !(this.conditionLines[headerId] || []).some(l => l.specificationLineID === ownLineId)) continue;
      const pId = group.get('parameterID')?.value;
      const pName = (group.get('parameterName')?.value || '').toLowerCase();
      const candidates = matched.filter(l =>
        (pId && l.parameterID && pId === l.parameterID) || (pName && (l.parameterName || '').toLowerCase() === pName));
      if (!candidates.length) {
        // The grade has lines for this parameter but none fits the selected conditions: no limit applies
        const hasAnyLine = (this.conditionLines[headerId] || []).some(l =>
          (pId && l.parameterID && pId === l.parameterID) || (pName && (l.parameterName || '').toLowerCase() === pName));
        if (hasAnyLine) {
          ['minValue', 'maxValue', 'specMinValue', 'specMaxValue', 'specificationLineID'].forEach(c => group.get(c)?.setValue(null));
          group.get('acceptanceCriteria')?.setValue('');
          group.get('specSource')?.setValue('');
          notApplicable.push(group.get('parameterName')?.value || `Parameter ${pId}`);
        }
        continue;
      }

      // A line that carries no condition is the grade default and applies as long as no condition decides otherwise
      const isDefaultLine = (l: any) => this.conditionFacets.every(fc => this.lineFacetValue(l, fc) === null);
      const score = (l: any) => this.conditionFacets.filter(fc => this.getFacetSel(headerId, fc) && this.lineFacetValue(l, fc) !== null).length;
      const top = Math.max(...candidates.map(score));
      let best = candidates.filter(l => score(l) === top);
      if (top === 0) {
        const defaults = best.filter(isDefaultLine);
        if (defaults.length) best = defaults;
      }
      const sameLimits = best.every(l => l.minValue === best[0].minValue && l.maxValue === best[0].maxValue);
      if (!sameLimits) {
        const pLabel = group.get('parameterName')?.value || `Parameter ${pId}`;
        if (!conflicts.includes(pLabel)) {
          conflicts.push(pLabel);
          // which empty conditions tell these lines apart, and the limit under each choice
          for (const fc of this.conditionFacets) {
            if (this.getFacetSel(headerId, fc)) continue;
            const byValue = new Map<string, string>();
            best.forEach(l => {
              const label = this.lineFacetLabel(l, fc);
              if (label && !byValue.has(label)) byValue.set(label, this.limitText(l) || '—');
            });
            if (byValue.size < 2) continue;
            const choices = Array.from(byValue, ([label, limit]) => `${label} ${limit}`).join(', ');
            (hints[fc] = hints[fc] || []).push(`${pLabel}: ${choices}`);
          }
        }
        // the condition that decides it is not chosen: that filter is skipped and no limit is guessed
        ['minValue', 'maxValue', 'specMinValue', 'specMaxValue', 'specificationLineID'].forEach(c => group.get(c)?.setValue(null));
        group.get('acceptanceCriteria')?.setValue('');
        group.get('specSource')?.setValue('');
        continue;
      }
      const line = best[0];
      group.get('minValue')?.setValue(line.minValue ?? null);
      group.get('specMinValue')?.setValue(line.minValue ?? null);
      group.get('maxValue')?.setValue(line.maxValue ?? null);
      group.get('specMaxValue')?.setValue(line.maxValue ?? null);
      group.get('specificationLineID')?.setValue(line.specificationLineID ?? null);
      if (line.unitName && !group.get('unit')?.value) group.get('unit')?.setValue(line.unitName);
      if (line.equation) group.get('formulaExpression')?.setValue(line.equation);
      group.get('acceptanceCriteria')?.setValue(line.acceptanceCriteria || '');
      group.get('specSource')?.setValue(this.lineChipLabel(line));
      sources.push({
        name: group.get('parameterName')?.value || '',
        min: line.minValue,
        max: line.maxValue,
        unit: line.unitName || group.get('unit')?.value || '',
        source: this.conditionFacets.map(fc => this.lineFacetLabel(line, fc)).filter(x => !!x).join(' · ') || 'Grade default'
      });
    }
    this.conditionConflicts[headerId] = conflicts;
    this.conditionHints[headerId] = Object.fromEntries(Object.entries(hints).map(([fc, list]) => [
      fc,
      `Different limits by ${(this.conditionFacetLabels[fc] || fc).toLowerCase()}. ${list.join('; ')}. Not selected, so this filter is skipped and ${list.length === 1 ? 'this parameter has' : 'these parameters have'} no limit.`
    ]));
    this.conditionNotApplicable[headerId] = notApplicable;
    this.requirementSources[headerId] = sources;
    // Only the parameters whose limit depends on the size range are listed; the rest are the same for every range
    const varying = this.conditionVaryingParams[headerId] || new Set<string>();
    // one entry per parameter, however many specimen rows it has
    this.conditionLimitSummary[headerId] = sources
      .filter((s, i) => varying.has(s.name) && sources.findIndex(x => x.name === s.name) === i)
      .map(s => ({
        name: s.name,
        limit: this.limitText({ minValue: s.min, maxValue: s.max }) || '—',
        source: s.source
      }));

    this.autoEvaluateAllFormulas();
    this.cdr.markForCheck();
    if (notify) {
      this.toastService.show(
        conflicts.length ? `No limit applied to ${conflicts.join(', ')}: the specification has more than one limit for this selection.` : `Conditions applied: ${matched.length} specification line(s) matched.`,
        conflicts.length ? 'warning' : 'info');
    }
  }

  resetConditionFilters(planIndex: number, testIndex: number): void {
    const test = this.plans[planIndex]?.tests?.[testIndex];
    if (!test?.headerId) return;
    this.selectedConditionsMap[test.headerId] = {
      dimensionalFactorID: null,
      heatTreatmentID: null,
      productConditionID1: null,
      productConditionID2: null,
      specimenOrientationID: null
    };
    this.conditionAuto[test.headerId] = {};
    this.refreshConditionOptions(test.headerId);
    this.applyConditionLines(planIndex, testIndex, true);
  }

  // ================================================================
  // Searchable Dropdowns for Condition Engine & Layout Selection
  // ================================================================
  fetchLayoutTemplates = (term: string, page: number, pageSize: number): Observable<any[]> => {
    const termLower = (term || '').toLowerCase().trim();
    const items: any[] = [];
    const autoLabel = `Auto: ${this.currentTestLayout ? this.currentTestLayout.layoutName : 'Default'}`;
    if (!termLower || autoLabel.toLowerCase().includes(termLower)) {
      items.push({ id: null, name: autoLabel });
    }
    const list = this.availableLayoutTemplates || [];
    for (const t of list) {
      const name = `${t.layoutName} (${t.layoutCode || 'Layout'})`;
      if (!termLower || name.toLowerCase().includes(termLower)) {
        items.push({ id: t.id, name });
      }
    }
    if (!termLower || 'standard layout (no template)'.includes(termLower)) {
      items.push({ id: -1, name: 'Standard Layout (No Template)' });
    }
    return of(items.slice(page * pageSize, (page + 1) * pageSize));
  };

  get selectedLayoutItem(): any {
    if (this.selectedLayoutTemplateId === -1) {
      return { id: -1, name: 'Standard Layout (No Template)' };
    }
    if (this.selectedLayoutTemplateId === null || this.selectedLayoutTemplateId === undefined) {
      // id -2 only so the dropdown shows the resolved layout as selected (picking it again means Auto)
      const autoName = `Auto: ${this.currentTestLayout ? this.currentTestLayout.layoutName : 'Default'}`;
      if (!this.autoLayoutItem || this.autoLayoutItem.name !== autoName) this.autoLayoutItem = { id: -2, name: autoName };
      return this.autoLayoutItem;
    }
    // the list holds only the newest layouts: the applied layout is shown from the layout itself
    const found = this.availableLayoutTemplates?.find(t => t.id === this.selectedLayoutTemplateId)
      ?? (this.currentTestLayout?.id === this.selectedLayoutTemplateId ? this.currentTestLayout : null);
    if (!found) return null;
    const name = `${found.layoutName} (${found.layoutCode || 'Layout'})`;
    if (!this.pickedLayoutItem || this.pickedLayoutItem.id !== found.id || this.pickedLayoutItem.name !== name) this.pickedLayoutItem = { id: found.id, name };
    return this.pickedLayoutItem;
  }

  private autoLayoutItem: { id: number; name: string } | null = null;
  private pickedLayoutItem: { id: number; name: string } | null = null;

  /** Whether the top toolbar should display specimen controls. */
  shouldShowSpecimenToolbar(): boolean {
    return !!this.currentTestLayout;
  }

  /** Whether the specimen count can be manually adjusted (disabled if template fixes it or in view mode). */
  canAdjustSpecimenCount(): boolean {
    if (this.isViewMode || this.isActiveTestFinalized()) return false;
    if (!this.isDynamicAdjustMode) return false;
    const renderer = this.configuredRenderers?.find(r => !r.printMode);
    if (renderer?.specimenSection) {
      return renderer.canAdjustCount(renderer.specimenSection);
    }
    return true;
  }

  // ================================================================
  // Dual Layout Operational Mode (Template vs Dynamic Adjust) & Fresh Reset
  // ================================================================
  isDynamicAdjustMode: boolean = true;

  setDynamicAdjustMode(enabled: boolean): void {
    if (this.isViewMode || this.isActiveTestFinalized()) return;
    this.isDynamicAdjustMode = enabled;
    if (enabled) {
      this.toastService.show('Dynamic Layout Mode enabled: You can adjust specimens, dimensions, and columns on the fly.', 'info');
    } else {
      this.loadTemplatedData();
    }
  }

  loadTemplatedData(): void {
    if (this.isViewMode || this.isActiveTestFinalized()) return;
    this.isDynamicAdjustMode = false;
    const targetId = this.selectedLayoutTemplateId || this.currentTestLayout?.id;
    if (!targetId) {
      this.toastService.show('No active layout template selected.', 'warning');
      return;
    }

    this.testLayoutService.getLayoutById(targetId).subscribe({
      next: (template: any) => {
        if (template && template.layoutConfigJson) {
          try {
            const parsed = JSON.parse(template.layoutConfigJson);
            const allSecs: any[] = parsed.sections || [];
            const hasSpm = allSecs.some((s: any) => s.type === 'specimen' || s.type === 'spm');
            this.currentTestLayout = {
              ...template,
              parsedConfig: parsed,
              sections: hasSpm
                ? allSecs.filter((s: any) => s.type === 'specimen' || s.type === 'spm')
                : allSecs.filter((s: any) => s.config?.enabled !== false)
            };

            const spmSec = this.currentTestLayout.sections.find((s: any) => s.type === 'specimen' || s.type === 'spm' || ((s.type === 'parameter' || s.type === 'param') && s.config?.enableMultiSpecimen));
            const targetCount = spmSec?.config?.count ? Number(spmSec.config.count) : (spmSec?.config?.specimenCount ? Number(spmSec.config.specimenCount) : 1);
            this.updateWorkbenchSpecimenCount(targetCount);

            const renderer = this.configuredRenderers?.find(r => !r.printMode);
            if (renderer) {
              renderer.tensileRowPrintMap = {};
              renderer.initSpecimens();
            }

            this.toastService.show(`Loaded Template Mode: ${template.templateName || template.layoutName}`, 'success');
          } catch (e) {
            console.error('Failed to parse layoutConfigJson', e);
          }
        }
      },
      error: (err) => {
        console.error('Failed to reload template data', err);
        this.toastService.show('Failed to reload master template data.', 'error');
      }
    });
  }

  confirmResetSampleResults(): void {
    if (!this.sampleId || this.isViewMode || this.isActiveTestFinalized()) return;
    this.askConfirm(
      'Reset Test Results (Fresh Entry)',
      'Are you sure you want to clear all entered test result data for this sample? All observations, dimensions, and entered values will be reset for a fresh entry.',
      () => this.executeResetSampleResults(),
      { confirmLabel: 'Reset All Results', variant: 'danger' }
    );
  }

  executeResetSampleResults(): void {
    if (!this.sampleId) return;
    this.testResultService.resetSampleResults(this.sampleId).subscribe({
      next: (res) => {
        this.toastService.show(res?.message || 'Test results reset for fresh entry.', 'success');
        this.loadFullResultPayload(this.sampleId);
      },
      error: (err) => {
        console.error('Failed to reset test results', err);
        this.toastService.show('Failed to reset test results.', 'error');
      }
    });
  }

  /** The toolbar specimen stepper drives the specimen matrix; a layout without one (reading / location grid) does not show it. */
  layoutUsesSpecimenMatrix(): boolean {
    const secs: any[] = this.currentTestLayout?.sections || [];
    if (!secs.length) return true;
    return secs.some(x => ['spm', 'specimen'].includes(String(x?.type || '').toLowerCase()) && x?.config?.enabled !== false);
  }

  /** Test pill text: the "Test N of M" label is shown in front, so the name drops its own " - Test N" suffix. */
  pillName(plan: any): string {
    const name = String(plan?.tests?.[0]?.name || plan?.type || '');
    return plan?.specimenLabel ? name.replace(/\s+-\s+Test\s+\d+$/, '') : name;
  }

  onLayoutItemSelected(item: any): void {
    const id = item && item.id !== undefined && item.id !== -2 ? item.id : null;
    this.onLayoutTemplateSelect(id, true);
  }


  // ================================================================
  // Case Details & Quality Dossier Helper Methods (Tab 2)
  // ================================================================
  getAllCaseTestsList(): any[] {
    const list: any[] = [];
    if (!this.plans?.length) return list;
    this.plans.forEach((plan: any, pIdx: number) => {
      (plan.tests || []).forEach((test: any, tIdx: number) => {
        list.push({
          planIndex: pIdx,
          testIndex: tIdx,
          testName: test.name || plan.type,
          methodName: plan.methodName || test.methodName || 'Standard Method',
          specification: test.specification || plan.specification || 'Standard Spec',
          quantity: test.plannedQuantity || 1,
          status: test.status || 'In Progress',
          headerId: test.headerId,
          parametersCount: test.parameters?.length || 0,
          isOverallPass: test.isOverallPass
        });
      });
    });
    return list;
  }

  selectTestFromCaseDossier(planIndex: number, testIndex: number): void {
    this.selectPlanTab(planIndex);
    this.switchTab('execution');
  }

  getSampleStatusBadgeClass(status: string | null | undefined): string {
    if (!status) return 'badge-neutral';
    const s = status.toLowerCase();
    if (s.includes('completed') || s.includes('approved') || s.includes('pass')) return 'badge-success';
    if (s.includes('progress') || s.includes('started')) return 'badge-warning';
    if (s.includes('rejected') || s.includes('fail')) return 'badge-danger';
    return 'badge-info';
  }

}