import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  UniversalTestExecutionService,
  TestExecutionDto,
  TestExecutionConfigSnapshotDto,
  SnapshotParameterDto,
  SnapshotConditionDto,
  SnapshotEquipmentDto,
  SnapshotFactorDto,
  TestExecutionSaveDto,
  ExecutionActionDto,
  ExecutionCalculationTraceDto,
  ResultsOverviewDto,
  NablScopeSummaryDto,
  FormulaPreviewResponseDto,
  ExecutionAttachmentUploadDto
} from '../../services/universal-test-execution.service';
import { ExecutionLayoutDto, ExecutionLayoutSectionDto, ExecutionLayoutItemDto } from '../../models/execution-layout.model';
import { UniversalResultService } from '../../services/universal-result.service';
import { UniversalReviewService } from '../../services/universal-review.service';
import { UniversalReportService } from '../../services/universal-report.service';
import { ToastService } from '../../services/toast.service';
import { extractErrorMessage } from '../../utility/helper/error.helper';
import { HasPermissionDirective } from '../../utility/directives/has-permission.directive';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { environment } from '../../../environments/environment';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

import { DecimalOnlyDirective } from '../../utility/directives/decimal-only.directive';
import { NumberOnlyDirective } from '../../utility/directives/number-only.directive';

@Component({
  selector: 'app-universal-test-execution',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, HasPermissionDirective, SearchableDropdownComponent, DecimalOnlyDirective, NumberOnlyDirective],
  templateUrl: './universal-test-execution.component.html',
  styleUrls: ['./universal-test-execution.component.css']
})
export class UniversalTestExecutionComponent implements OnInit, OnDestroy {
  // Main Workspace Tab: 'config' | 'entry' | 'results' | 'review' | 'report' | 'audit'
  activeWorkspaceTab: 'config' | 'entry' | 'results' | 'review' | 'report' | 'audit' = 'config';

  // Test Configuration Category: 10 items
  activeConfigCategory: string = 'parameters';
  showCategoryModal: boolean = false;
  categorySearchTerm: string = '';

  readonly categoryKeys: string[] = [
    'parameters', 'conditions', 'limits', 'formula', 'equipment',
    'factors', 'uncertainty', 'acceptance', 'attachments', 'remarks'
  ];

  readonly categoryMeta: Record<string, { title: string; subtitle: string; icon: string; badgeColor: string }> = {
    parameters: { title: 'Parameters', subtitle: 'Input, Calculated & Derived Variables', icon: 'bi-list-columns text-primary', badgeColor: 'bg-primary' },
    conditions: { title: 'Conditions / Environment', subtitle: 'Environmental & Test Execution Conditions', icon: 'bi-thermometer-half text-info', badgeColor: 'bg-info text-dark' },
    limits: { title: 'Specification Limits', subtitle: 'Min / Max / Target & ISO Tolerances', icon: 'bi-speedometer2 text-success', badgeColor: 'bg-success' },
    formula: { title: 'Formula Builder', subtitle: 'Equations, Mathematical Dependencies & DAG Trace', icon: 'bi-calculator text-primary', badgeColor: 'bg-primary' },
    equipment: { title: 'Equipment & Instruments', subtitle: 'Instruments, Calibration & Traceability', icon: 'bi-tools text-warning', badgeColor: 'bg-warning text-dark' },
    factors: { title: 'Factors & Conversions', subtitle: 'Multipliers, Dilution Factors & Units', icon: 'bi-percent text-secondary', badgeColor: 'bg-secondary' },
    uncertainty: { title: 'Measurement Uncertainty (MU)', subtitle: 'Coverage Factor (k), Basis & ISO 17025 Statement', icon: 'bi-graph-up text-dark', badgeColor: 'bg-dark' },
    acceptance: { title: 'Acceptance Criteria', subtitle: 'Pass / Fail Rules & Compliance Evaluation Rules', icon: 'bi-check2-circle text-success', badgeColor: 'bg-success' },
    attachments: { title: 'Attachments & Standards', subtitle: 'Test Methods, SOPs, Standards & Documents', icon: 'bi-paperclip text-primary', badgeColor: 'bg-primary' },
    remarks: { title: 'Remarks & Notes', subtitle: 'Analyst Notes & General Observations', icon: 'bi-card-text text-secondary', badgeColor: 'bg-secondary' }
  };

  executionForm: FormGroup;
  execution: TestExecutionDto | null = null;
  configSnapshot: TestExecutionConfigSnapshotDto | null = null;
  parameters: SnapshotParameterDto[] = [];
  testExecutionId: number | null = null;
  universalTestGroupId: number | null = null;
  currentLoadedExecutionId: number = 0;
  currentExecutionDropdownItem: any = null;
  private executionLoadSub?: Subscription;
  isViewMode: boolean = false;
  isProcessing: boolean = false;
  isFullscreen: boolean = false;
  isInspectorDrawerOpen: boolean = false;

  // Universal Phase 7 (Results) & Phase 8 (Review) State
  universalResult: any = null;
  reviewFindings: any[] = [];
  reviewAudits: any[] = [];
  findingForm!: FormGroup;
  showResultTraces: boolean = false;
  showResultAudits: boolean = false;

  // Universal Phase 9 (Report) State
  reportPreviewData: any = null;
  universalReports: any[] = [];
  selectedReport: any = null;
  reportPreviewFormatCode: string = 'DEFAULT';
  availableReportFormats: any[] = [{ formatCode: 'DEFAULT', formatName: 'Default Universal Report' }];

  // Run switcher
  availableRuns: number[] = [1];
  selectedRunNo: number = 1;

  // Formula Builder & Live Preview — dynamic, snapshot-driven (no hardcoded SOIL_*)
  selectedFormulaParam: SnapshotParameterDto | null = null;
  formulaExpression: string = '';
  formulaVariables: Record<string, number> = {};
  formulaPreviewResult: FormulaPreviewResponseDto | null = null;
  formulaValid: boolean = true;

  // Keypad Functions List
  keypadButtons: string[] = [
    '+', '-', '*', '/', '(', ')',
    'MEAN()', 'MIN()', 'MAX()',
    'ABS()', 'ROUND()', 'POW()', 'SQRT()'
  ];

  // Dynamic Calculation DAG Trace
  calcTrace: ExecutionCalculationTraceDto | null = null;

  // Results Overview Summary
  resultsOverview: ResultsOverviewDto | null = null;

  // NABL Scope Summary
  nablScope: NablScopeSummaryDto | null = null;

  // Verification & Approval Modal State
  actionModalVisible: boolean = false;
  actionModalTitle: string = '';
  actionModalType: 'verify' | 'approve' | 'reject' = 'verify';
  actionRemarks: string = '';

  // Retest Modal State (Phase 6 Authoritative Audit Requirement)
  retestModalVisible: boolean = false;
  retestReasonCode: string = 'ANALYST_DISCRETION';
  retestJustification: string = '';

  // Quick Modals for Adding Configuration Items
  showAddParamModal: boolean = false;
  newParam: any = { code: '', name: '', unit: '', inputType: 'Decimal', decimals: 2, isCalculated: false, formula: '', specMin: null, specMax: null };

  showAddConditionModal: boolean = false;
  newCondition: any = { dimensionName: '', unit: '°C', configuredOperator: '=', configuredValue1: '', configuredValue2: '' };

  showAddEquipmentModal: boolean = false;
  newEquipment: any = { name: '', model: '', calibrationNo: '', calibratedOn: '', validUpto: '' };

  showAddFactorModal: boolean = false;
  newFactor: any = { factorType: 'Multiplication Factor', factorName: '', value: 1.0, appliedOn: 'All Results', description: '' };

  showUploadModal: boolean = false;
  newAttachmentName: string = '';
  newAttachmentType: string = 'PDF';

  private routeSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private executionService: UniversalTestExecutionService,
    private resultService: UniversalResultService,
    private reviewService: UniversalReviewService,
    private reportService: UniversalReportService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    this.executionForm = this.fb.group({
      specimens: this.fb.array([]),
      remarks: ['']
    });
    this.findingForm = this.fb.group({
      findingType: ['Observation', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      severity: ['Major', Validators.required],
      isBlocking: [true]
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe(params => {
      const execId = Number(params['executionId'] || params['id'] || 0);
      const tabParam = params['tab'];
      if (tabParam) {
        this.activeWorkspaceTab = tabParam as any;
      }
      if (execId > 0) {
        if (execId !== this.currentLoadedExecutionId) {
          this.testExecutionId = execId;
          this.loadExecutionById(execId);
        }
      } else if (params['utgId']) {
        const utgId = Number(params['utgId']);
        if (utgId > 0 && utgId !== this.universalTestGroupId) {
          this.universalTestGroupId = utgId;
          this.loadExecutionByGroup(utgId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.executionLoadSub?.unsubscribe();
    this.activeCharts.forEach(c => c.destroy());
    this.activeCharts.clear();
  }

  get specimens(): FormArray {
    return this.executionForm.get('specimens') as FormArray;
  }

  getObservations(specimen: any): FormArray {
    return specimen.get('observations') as FormArray;
  }

  getResults(observation: any): FormArray {
    return observation.get('results') as FormArray;
  }

  get overviewParameters(): any[] {
    if (this.resultsOverview?.parameters && this.resultsOverview.parameters.length > 0) {
      return this.resultsOverview.parameters;
    }
    return (this.parameters as any[]) || [];
  }

  // ----------------------------------------------------------------
  // Data Loading
  // ----------------------------------------------------------------

  getExecutionDropdown = (term: string, page: number, pageSize: number) => {
    return this.executionService.getExecutionDropdown(term, page, pageSize);
  };

  resetStateForNewExecution(): void {
    // 1. Cleanly destroy all Chart.js instances before DOM changes
    this.activeCharts.forEach(c => c.destroy());
    this.activeCharts.clear();

    // 2. Clear auxiliary intelligence datasets
    this.calcTrace = null;
    this.resultsOverview = null;
    this.nablScope = null;
    this.universalResult = null;
    this.reviewFindings = [];
    this.reviewAudits = [];

    // 3. Clear report state
    this.reportPreviewData = null;
    this.universalReports = [];
    this.selectedReport = null;

    // 4. Reset conditions, formulas, and checklists
    this.conditionActuals = {};
    this.formulaVariables = {};
    this.selectedFormulaParam = null;
    this.formulaPreviewResult = null;
    this.formulaExpression = '';
    this.preparationChecklist = {};
    this.collapsedSections = {};
    this.isUnmappedCollapsed = false;

    // 5. Reset execution form to empty state before rebuild
    this.executionForm = this.fb.group({
      specimens: this.fb.array([]),
      remarks: ['']
    });
  }

  private syncCurrentExecutionDropdownItem(exec: TestExecutionDto): void {
    const testName = exec.testName || (exec as any).universalTestGroup?.laboratoryTest?.name || 'Test';
    const sampleNo = exec.sampleNo || (exec as any).universalTestGroup?.sampleTestPlan?.sampleDetail?.sampleNo || '-';
    this.currentExecutionDropdownItem = {
      id: exec.id,
      name: `#${exec.id} · ${testName} (Sample: ${sampleNo}, Run #${exec.executionNo || 1})`
    };
  }

  onExecutionDropdownSelected(item: any): void {
    if (!item) return;
    const id = Number(item.id ?? 0);
    if (id > 0 && id !== this.currentLoadedExecutionId) {
      this.router.navigate(['/universal-test-execution'], {
        queryParams: { executionId: id },
        queryParamsHandling: 'merge'
      });
    }
  }

  loadExecutionById(id: number): void {
    this.executionLoadSub?.unsubscribe();
    this.isProcessing = true;
    this.executionLoadSub = this.executionService.getExecution(id).subscribe({
      next: (exec) => {
        this.isProcessing = false;
        this.applyExecutionData(exec);
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Failed to load execution details'), 'error');
      }
    });
  }

  loadExecutionByGroup(groupId: number): void {
    this.executionLoadSub?.unsubscribe();
    this.isProcessing = true;
    this.executionLoadSub = this.executionService.getExecutionByGroup(groupId).subscribe({
      next: (exec) => {
        this.isProcessing = false;
        this.applyExecutionData(exec);
      },
      error: () => {
        // If not started yet, automatically start execution
        this.startExecution(groupId);
      }
    });
  }

  startExecution(groupId: number, isRetest: boolean = false): void {
    this.isProcessing = true;
    this.executionService.startExecution(groupId, isRetest).subscribe({
      next: (exec) => {
        this.isProcessing = false;
        this.applyExecutionData(exec);
        this.toastService.show(isRetest ? 'New execution run started.' : 'Test execution initialized successfully.', 'success');
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Failed to start execution'), 'error');
      }
    });
  }

  applyExecutionData(exec: TestExecutionDto): void {
    this.currentLoadedExecutionId = exec.id;
    this.resetStateForNewExecution();

    this.execution = exec;
    this.testExecutionId = exec.id;
    this.universalTestGroupId = exec.universalTestGroupID;
    this.configSnapshot = exec.configSnapshot || null;
    this.parameters = this.configSnapshot?.parameters || [];
    this.selectedRunNo = exec.executionNo || 1;
    this.availableRuns = Array.from({ length: Math.max(1, exec.executionNo || 1) }, (_, i) => i + 1);

    this.syncCurrentExecutionDropdownItem(exec);

    // Sync route queryParams with loaded executionId if not already in sync
    const currentQueryExecId = Number(this.route.snapshot.queryParams['executionId'] || this.route.snapshot.queryParams['id'] || 0);
    if (exec.id && currentQueryExecId !== exec.id) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { executionId: exec.id },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }

    // Lock if Completed, Verified, Approved
    this.isViewMode = ['Completed', 'Verified', 'Approved'].includes(exec.status);

    // Hydrate condition actuals from snapshot (configured vs actual separate)
    this.conditionActuals = {};
    const sourceConditions = (exec.actualConditions && exec.actualConditions.length > 0)
      ? exec.actualConditions
      : (this.configSnapshot?.conditions || []);

    sourceConditions.forEach(c => {
      const k = (c as any).conditionMasterID ?? (c as any).conditionDimensionID ?? (c as any).dimensionName;
      const v = (c as any).actualExecutionValue ?? (c as any).selectedExecutionValue ?? (c as any).actualValue ?? '';
      if (k) this.conditionActuals[String(k)] = String(v ?? '');
      if ((c as any).dimensionName) this.conditionActuals[(c as any).dimensionName] = String(v ?? '');
    });
    // Dynamic formulaVariables from input params (no hardcoded SOIL_*)
    this.formulaVariables = {};

    // Initialize Formula Builder with the first calculated parameter
    const firstCalc = this.parameters.find(p => p.isCalculated);
    if (firstCalc) {
      this.selectFormulaParameter(firstCalc);
    }

    // Build Execution Form
    this.rebuildExecutionForm(exec);

    // Load auxiliary intelligence datasets
    this.loadAuxiliaryData(exec.id);

    // Immediately load universal result and review audits for lifecycle timeline sync
    this.loadUniversalResult();

    // If currently on report tab, reload report data for this execution
    if (this.activeWorkspaceTab === 'report') {
      this.loadReportData();
    }

    if (this.activeWorkspaceTab === 'entry') {
      setTimeout(() => this.renderAllGraphs(), 150);
    }
  }

  loadAuxiliaryData(execId: number): void {
    this.executionService.getCalculationTrace(execId).subscribe({
      next: (trace) => { this.calcTrace = trace; },
      error: () => {}
    });

    this.executionService.getResultsOverview(execId).subscribe({
      next: (ov) => { this.resultsOverview = ov; },
      error: () => {}
    });

    this.executionService.getNablScopeSummary(execId).subscribe({
      next: (scope) => { this.nablScope = scope; },
      error: () => {}
    });
  }

  // ----------------------------------------------------------------
  // Form Building & Reactive Dynamic Matrix
  // ----------------------------------------------------------------

  rebuildExecutionForm(exec: TestExecutionDto): void {
    const specimensFA = this.fb.array([]) as FormArray;

    if (exec.testSpecimens && exec.testSpecimens.length > 0) {
      exec.testSpecimens.forEach(spec => {
        const specGroup = this.fb.group({
          id: [spec.id],
          sequenceNo: [spec.sequenceNo],
          specimenIdentifier: [{ value: spec.specimenIdentifier || `Specimen #${spec.sequenceNo}`, disabled: this.isViewMode }],
          isDiscarded: [{ value: spec.isDiscarded || false, disabled: this.isViewMode }],
          observations: this.fb.array([])
        });

        const obsFA = specGroup.get('observations') as FormArray;
        if (spec.testObservations && spec.testObservations.length > 0) {
          spec.testObservations.forEach(obs => {
            const obsGroup = this.fb.group({
              id: [obs.id],
              readingNo: [obs.readingNo],
              results: this.fb.array([])
            });

            const resFA = obsGroup.get('results') as FormArray;
            this.parameters.forEach(param => {
              const existingResult = (obs.parameterObservationResults || []).find(r => r.parameterMasterID === param.parameterMasterID);
              const val = existingResult?.rawValue ?? existingResult?.numericValue?.toString() ?? '';
              const calcVal = existingResult?.calculatedValue ?? (existingResult?.isFormulaCalculated ? val : '');
              const status = existingResult?.resultStatus ?? 'Pass';

              // CurvePeak params (MDD/OMC) are isCalculated=true but value comes from UI curve regression,
              // not a formula string — they must remain enabled so patchValue() & save payload work correctly.
              const isCurvePeak = param.calculationRole === 'CurvePeak';
              const resGroup = this.fb.group({
                id: [existingResult?.id || 0],
                parameterMasterID: [param.parameterMasterID],
                parameterCode: [param.code],
                rawValue: [{ value: val, disabled: this.isViewMode || (param.isCalculated && !isCurvePeak) }],
                numericValue: [existingResult?.numericValue ?? null],
                calculatedValue: [{ value: calcVal, disabled: true }],
                isFormulaCalculated: [param.isCalculated],
                specMin: [param.specMin],
                specMax: [param.specMax],
                resultStatus: [status]
              });

              resFA.push(resGroup);
            });
            obsFA.push(obsGroup);
          });
        } else {
          // Default: 1 observation reading
          obsFA.push(this.createDefaultObservationGroup(1));
        }
        specimensFA.push(specGroup);
      });
    } else {
      // Default: 1 Specimen with 1 Observation Reading
      const defaultSpec = this.fb.group({
        id: [0],
        sequenceNo: [1],
        specimenIdentifier: [{ value: 'Specimen #1', disabled: this.isViewMode }],
        isDiscarded: [{ value: false, disabled: this.isViewMode }],
        observations: this.fb.array([this.createDefaultObservationGroup(1)])
      });
      specimensFA.push(defaultSpec);
    }

    this.executionForm = this.fb.group({
      specimens: specimensFA,
      remarks: [exec?.reviewRemarks || '']
    });

    // Auto-calculate any formulas on initial form build
    this.evaluateAllReadings();
  }

  asFormGroup(ctrl: any): FormGroup {
    return ctrl as FormGroup;
  }

  createDefaultObservationGroup(readingNo: number): FormGroup {
    const resFA = this.fb.array<FormGroup>([]);
    this.parameters.forEach(param => {
      const isCurvePeakParam = param.calculationRole === 'CurvePeak';
      resFA.push(this.fb.group({
        id: [0],
        parameterMasterID: [param.parameterMasterID],
        parameterCode: [param.code],
        rawValue: [{ value: '', disabled: this.isViewMode || (param.isCalculated && !isCurvePeakParam) }],
        numericValue: [null],
        calculatedValue: [{ value: '', disabled: true }],
        isFormulaCalculated: [param.isCalculated],
        specMin: [param.specMin],
        specMax: [param.specMax],
        resultStatus: ['Pass']
      }));
    });
    return this.fb.group({
      id: [0],
      readingNo: [readingNo],
      results: resFA
    });
  }

  addSpecimen(): void {
    if (this.isViewMode) return;
    const seq = this.specimens.length + 1;
    const newSpec = this.fb.group({
      id: [0],
      sequenceNo: [seq],
      specimenIdentifier: [`Specimen #${seq}`],
      isDiscarded: [false],
      observations: this.fb.array([this.createDefaultObservationGroup(1)])
    });
    this.specimens.push(newSpec);
    this.toastService.show(`Added Specimen #${seq}`, 'info');
  }

  removeSpecimen(index: number): void {
    if (this.isViewMode || this.specimens.length <= 1) return;
    this.specimens.removeAt(index);
    this.evaluateAllReadings();
  }

  addObservation(specimen: any): void {
    if (this.isViewMode) return;
    const obsFA = specimen.get('observations') as FormArray;
    const readingNo = obsFA.length + 1;
    obsFA.push(this.createDefaultObservationGroup(readingNo));
    this.evaluateAllReadings();
  }

  removeObservation(specimen: any, index: number): void {
    if (this.isViewMode) return;
    const obsFA = specimen.get('observations') as FormArray;
    if (obsFA.length <= 1) return;
    obsFA.removeAt(index);
    this.evaluateAllReadings();
  }

  // ----------------------------------------------------------------
  // Real-Time Preview — server is authoritative (FormulaEvaluator/NCalc)
  // Client preview is UX-only, never trusted for persistence.
  // ----------------------------------------------------------------
  private conditionActuals: Record<string, string> = {};

  getConditionActual(c: SnapshotConditionDto): string {
    const k1 = (c as any).conditionMasterID ?? (c as any).conditionDimensionID ?? c.dimensionName;
    return this.conditionActuals[String(k1)] ?? (c as any).selectedExecutionValue ?? (c as any).actualExecutionValue ?? '';
  }
  setConditionActual(c: SnapshotConditionDto, val: string): void {
    const k1 = (c as any).conditionMasterID ?? (c as any).conditionDimensionID ?? c.dimensionName;
    this.conditionActuals[String(k1)] = val;
    // keep snapshot in sync for UI
    (c as any).selectedExecutionValue = val;
    (c as any).actualExecutionValue = val;
  }

  // Helpers for template — dynamic InputType handling (snapshot-driven)
  isCalculated(p: SnapshotParameterDto): boolean { return !!p.isCalculated; }
  getParamByCode(code: string): SnapshotParameterDto | undefined { return this.parameters.find(p => p.code === code); }
  getParamForRes(res: any): SnapshotParameterDto | undefined {
    const code = res?.get?.('parameterCode')?.value;
    return code ? this.getParamByCode(code) : undefined;
  }
  getRequirementText(p: SnapshotParameterDto): string {
    if (p.specMin != null && p.specMax != null) return `${p.specMin} – ${p.specMax}`;
    if (p.specMin != null) return `≥ ${p.specMin}`;
    if (p.specMax != null) return `≤ ${p.specMax}`;
    if ((p as any).acceptanceCriteria && (p as any).acceptanceCriteria !== 'Within specification range') {
      return (p as any).acceptanceCriteria;
    }
    if (!this.configSnapshot?.specificationHeaderID || this.configSnapshot?.specificationHeaderID <= 0) {
      return 'N/A';
    }
    return 'No limit defined';
  }

  getMissingDependencies(p: SnapshotParameterDto): string[] {
    if (!p.formula) return [];
    const cTokens = (p.formula.match(/\{([A-Za-z0-9_]+)\}/g) || []).map(t => t.replace(/[{}]/g, ''));
    const bTokens = (p.formula.match(/\[([A-Za-z0-9_]+)\]/g) || []).map(t => t.replace(/[\[\]]/g, ''));
    const tokens = Array.from(new Set([...cTokens, ...bTokens]));
    const availableCodes = new Set(this.parameters.map(param => param.code.toUpperCase()));
    return tokens.filter(t => !availableCodes.has(t.toUpperCase()));
  }

  isDependenciesMissing(p: SnapshotParameterDto): boolean {
    return this.getMissingDependencies(p).length > 0;
  }

  onReadingInput(obsGroup: FormGroup): void {
    // Lightweight preview only — do not trust for save, server will re-evaluate via FormulaEvaluator
    this.evaluateAllReadings();
  }

  previewObservationGroup(obsGroup: FormGroup): void {
    const resultsFA = obsGroup.get('results') as FormArray;
    const valMap: Record<string, number> = {};

    // 1. Collect inputs from current observation group
    resultsFA.controls.forEach(ctrl => {
      const code = ctrl.get('parameterCode')?.value;
      const raw = ctrl.get('rawValue')?.value;
      const isCalc = ctrl.get('isFormulaCalculated')?.value;
      const type = this.parameters.find(p => p.code === code)?.inputType;
      if (!isCalc && raw !== '' && raw != null && (type === 'Decimal' || type === 'Integer')) {
        const num = parseFloat(String(raw));
        if (!isNaN(num)) { valMap[code] = num; ctrl.patchValue({ numericValue: num }, { emitEvent: false }); }
      } else if (!isCalc && raw !== '' && raw != null) {
        // Non-numeric types keep raw only
        ctrl.patchValue({ numericValue: null }, { emitEvent: false });
      }
    });

    // 2. Merge specimen-level inputs (e.g. from observation 0 or other controls) into valMap
    this.parameters.filter(p => !p.isCalculated).forEach(p => {
      if (valMap[p.code] === undefined) {
        const sCtrl = this.getSpecimenResultControl(0, p.parameterMasterID);
        const raw = sCtrl?.get('rawValue')?.value ?? sCtrl?.get('numericValue')?.value;
        if (raw !== '' && raw != null) {
          const num = parseFloat(String(raw));
          if (!isNaN(num)) valMap[p.code] = num;
        }
      }
    });

    // 3. Preview calculated — show blocked if deps missing, else evaluate
    const calcParams = this.parameters.filter(p => p.isCalculated && p.formula);
    let evaluatedCount = 1;
    let passes = 0;
    while (evaluatedCount > 0 && passes < 4) {
      evaluatedCount = 0;
      passes++;
      calcParams.forEach(param => {
        const ctrl = resultsFA.controls.find(c => c.get('parameterCode')?.value === param.code);
        if (!ctrl || !param.formula) return;
        // Skip if already evaluated in valMap
        if (valMap[param.code] !== undefined) return;

        let deps = (param.formulaDependencies || []);
        if (deps.length === 0 && param.formula) {
          const cTokens = (param.formula.match(/\{([A-Za-z0-9_]+)\}/g) || []).map(t => t.replace(/[{}]/g, ''));
          const bTokens = (param.formula.match(/\[([A-Za-z0-9_]+)\]/g) || []).map(t => t.replace(/[\[\]]/g, ''));
          deps = Array.from(new Set([...cTokens, ...bTokens]));
        }

        const missing = deps.some(d => valMap[d] == null && !Object.prototype.hasOwnProperty.call(valMap, d));
        if (missing) {
          ctrl.patchValue({ rawValue: '', calculatedValue: 'BLOCKED', resultStatus: 'Blocked' }, { emitEvent: false });
          return;
        }
        
        // Simple client preview
        const evaluated = this.clientFormulaEval(param.formula, valMap);
        if (evaluated !== null) {
          const decimals = param.decimalPrecision ?? 2;
          const rounded = Number(Math.round(parseFloat(evaluated + 'e' + decimals)) + 'e-' + decimals);
          valMap[param.code] = rounded;
          ctrl.patchValue({
            rawValue: rounded.toFixed(decimals),
            numericValue: rounded,
            calculatedValue: rounded.toFixed(decimals),
            resultStatus: 'Pass'
          }, { emitEvent: false });
          evaluatedCount++;
        }
      });
    }
  }

  evaluateAllReadings(): void {
    this.evaluateCbrLoads();
    this.specimens.controls.forEach(spec => {
      const obsFA = spec.get('observations') as FormArray;
      obsFA.controls.forEach(obs => this.previewObservationGroup(obs as FormGroup));
    });
    this.evaluateCurvePeaks();
    this.renderAllGraphs();
  }

  evaluateCbrLoads(): void {
    const cbrLoad25Param = this.parameters.find(p => p.code === 'CBR_LOAD_2_5' || p.code === 'PENETRATION_2_5MM_LOAD');
    const cbrLoad50Param = this.parameters.find(p => p.code === 'CBR_LOAD_5_0' || p.code === 'PENETRATION_5_0MM_LOAD');
    if (!cbrLoad25Param && !cbrLoad50Param) return;

    const xParam = this.parameters.find(p => p.code === 'PENETRATION' || p.code === 'PENETRATION_DEPTH');
    const yParam = this.parameters.find(p => p.code === 'LOAD' || p.code === 'PLUNGER_LOAD');
    if (!xParam || !yParam) return;

    this.specimens.controls.forEach(spec => {
      if (spec.get('isDiscarded')?.value) return;
      const obsFA = spec.get('observations') as FormArray;
      const points: { x: number; y: number }[] = [];

      obsFA.controls.forEach(obs => {
        const xCtrl = this.getResultControl(obs as FormGroup, xParam.parameterMasterID);
        const yCtrl = this.getResultControl(obs as FormGroup, yParam.parameterMasterID);
        const xRaw = xCtrl?.get('rawValue')?.value ?? xCtrl?.get('numericValue')?.value;
        const yRaw = yCtrl?.get('rawValue')?.value ?? yCtrl?.get('numericValue')?.value;
        if (xRaw !== '' && xRaw != null && !isNaN(Number(xRaw)) && yRaw !== '' && yRaw != null && !isNaN(Number(yRaw))) {
          points.push({ x: Number(xRaw), y: Number(yRaw) });
        }
      });

      if (points.length < 2) return;
      points.sort((a, b) => a.x - b.x);

      const interpolateAt = (targetX: number): number | null => {
        const exact = points.find(p => Math.abs(p.x - targetX) < 0.05);
        if (exact) return exact.y;
        for (let i = 0; i < points.length - 1; i++) {
          if (points[i].x <= targetX && points[i + 1].x >= targetX) {
            const dx = points[i + 1].x - points[i].x;
            if (dx === 0) return points[i].y;
            const t = (targetX - points[i].x) / dx;
            return points[i].y + t * (points[i + 1].y - points[i].y);
          }
        }
        return null;
      };

      const load25 = interpolateAt(2.5);
      const load50 = interpolateAt(5.0);

      obsFA.controls.forEach(obs => {
        if (cbrLoad25Param && load25 !== null) {
          const ctrl = this.getResultControl(obs as FormGroup, cbrLoad25Param.parameterMasterID);
          if (ctrl && (!ctrl.dirty || ctrl.get('rawValue')?.value === '' || ctrl.get('rawValue')?.value == null)) {
            const dec = cbrLoad25Param.decimalPrecision ?? 2;
            const rounded = Number(load25.toFixed(dec));
            ctrl.patchValue({
              rawValue: rounded.toFixed(dec),
              numericValue: rounded,
              calculatedValue: rounded.toFixed(dec)
            }, { emitEvent: false });
          }
        }
        if (cbrLoad50Param && load50 !== null) {
          const ctrl = this.getResultControl(obs as FormGroup, cbrLoad50Param.parameterMasterID);
          if (ctrl && (!ctrl.dirty || ctrl.get('rawValue')?.value === '' || ctrl.get('rawValue')?.value == null)) {
            const dec = cbrLoad50Param.decimalPrecision ?? 2;
            const rounded = Number(load50.toFixed(dec));
            ctrl.patchValue({
              rawValue: rounded.toFixed(dec),
              numericValue: rounded,
              calculatedValue: rounded.toFixed(dec)
            }, { emitEvent: false });
          }
        }
      });
    });
  }

  evaluateCurvePeaks(): void {
    const curveParams = this.parameters.filter(p => p.calculationRole === 'CurvePeak');
    if (curveParams.length === 0) return;

    let xParam: SnapshotParameterDto | undefined;
    let yParam: SnapshotParameterDto | undefined;
    
    const graphSection = this.layoutSections.find(s => s.sectionType === 'Graph' || s.presentationStyle === 'InteractiveChart');
    if (graphSection) {
      const gConfig = this.getGraphConfig(graphSection);
      xParam = gConfig.xAxisParam;
      yParam = gConfig.yAxisParam;
    }

    if (!xParam || !yParam) return;

    const points: { x: number, y: number }[] = [];
    this.specimens.controls.forEach(spec => {
      if (spec.get('isDiscarded')?.value) return;
      const obsFA = spec.get('observations') as FormArray;
      obsFA.controls.forEach(obs => {
        const xCtrl = this.getResultControl(obs as FormGroup, xParam!.parameterMasterID);
        const yCtrl = this.getResultControl(obs as FormGroup, yParam!.parameterMasterID);
        
        const xRaw = xCtrl?.get('rawValue')?.value ?? xCtrl?.get('numericValue')?.value;
        const yRaw = yCtrl?.get('rawValue')?.value ?? yCtrl?.get('numericValue')?.value;
        
        if (xRaw !== '' && xRaw != null && !isNaN(Number(xRaw)) && yRaw !== '' && yRaw != null && !isNaN(Number(yRaw))) {
           points.push({ x: Number(xRaw), y: Number(yRaw) });
        }
      });
    });

    if (points.length >= 3) {
      const peak = this.calculatePolynomialPeak(points);
      if (peak) {
         curveParams.forEach(cp => {
            let val = 0;
            if (cp.code.toUpperCase().includes('OMC') || (cp.name || '').toUpperCase().includes('MOISTURE')) {
               val = peak.x;
            } else if (cp.code.toUpperCase().includes('MDD') || (cp.name || '').toUpperCase().includes('DENSITY')) {
               val = peak.y;
            }

            if (val > 0) {
               const decimals = cp.decimalPrecision ?? 2;
               const rounded = Number(Math.round(parseFloat(val + 'e' + decimals)) + 'e-' + decimals);
               
               this.specimens.controls.forEach(spec => {
                 const obsFA = spec.get('observations') as FormArray;
                 obsFA.controls.forEach(obs => {
                   const ctrl = this.getResultControl(obs as FormGroup, cp.parameterMasterID);
                   if (ctrl) {
                     ctrl.patchValue({ rawValue: rounded.toFixed(decimals), numericValue: rounded }, { emitEvent: false });
                   }
                 });
               });
            }
         });
      }
    }
  }

  calculatePolynomialPeak(points: { x: number, y: number }[]): { x: number, y: number } | null {
    const n = points.length;
    let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
    let sumY = 0, sumXY = 0, sumX2Y = 0;

    for (let i = 0; i < n; i++) {
      const x = points[i].x;
      const y = points[i].y;
      const x2 = x * x;
      sumX += x;
      sumX2 += x2;
      sumX3 += x2 * x;
      sumX4 += x2 * x2;
      sumY += y;
      sumXY += x * y;
      sumX2Y += x2 * y;
    }

    const det = sumX4 * (sumX2 * n - sumX * sumX) - 
                sumX3 * (sumX3 * n - sumX2 * sumX) + 
                sumX2 * (sumX3 * sumX - sumX2 * sumX2);
                
    if (Math.abs(det) < 1e-10) return null;

    const detA = sumX2Y * (sumX2 * n - sumX * sumX) - 
                 sumX3 * (sumXY * n - sumY * sumX) + 
                 sumX2 * (sumXY * sumX - sumY * sumX2);
                 
    const detB = sumX4 * (sumXY * n - sumY * sumX) - 
                 sumX2Y * (sumX3 * n - sumX2 * sumX) + 
                 sumX2 * (sumX3 * sumY - sumXY * sumX2);
                 
    const detC = sumX4 * (sumX2 * sumY - sumXY * sumX) - 
                 sumX3 * (sumX3 * sumY - sumXY * sumX2) + 
                 sumX2Y * (sumX3 * sumX - sumX2 * sumX2);

    const a = detA / det;
    const b = detB / det;
    const c = detC / det;

    if (a >= 0) return null; // Not a peak (valley or flat)

    const peakX = -b / (2 * a);
    const peakY = c - (b * b) / (4 * a);

    return { x: peakX, y: peakY };
  }

  // Basic client evaluator for simple math (live preview only, not authoritative)
  clientFormulaEval = (formula: string, vars: Record<string, number>): number | null => {
    try {
      let expr = formula;
      // Convert square bracket tokens [KEY] to {KEY}
      expr = expr.replace(/\[([A-Za-z0-9_]+)\]/g, '{$1}');
      for (const [key, val] of Object.entries(vars)) {
        expr = expr.replace(new RegExp(`\\{${key}\\}`, 'gi'), String(val));
      }
      expr = expr.replace(/Math\./g, ''); // In case formulas already have Math.

      // Convert Excel/NCalc if(cond, a, b) to JS ternary ((cond) ? (a) : (b))
      expr = expr.replace(/\bif\s*\(([^,]+),([^,]+),([^)]+)\)/gi, '(( $1 ) ? ( $2 ) : ( $3 ))');

      expr = expr.replace(/MIN/gi, 'Math.min');
      expr = expr.replace(/MAX/gi, 'Math.max');
      expr = expr.replace(/POW/gi, 'Math.pow');
      expr = expr.replace(/SQRT/gi, 'Math.sqrt');
      expr = expr.replace(/LOG/gi, 'Math.log10');
      expr = expr.replace(/LN/gi, 'Math.log');
      expr = expr.replace(/EXP/gi, 'Math.exp');
      expr = expr.replace(/ABS/gi, 'Math.abs');
      
      // If any unresolved variable token remains, cannot evaluate
      if (/\{[A-Za-z0-9_]+\}/.test(expr)) return null;

      const result = new Function('return ' + expr)();
      return (typeof result === 'number' && !isNaN(result) && isFinite(result)) ? result : null;
    } catch {
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Formula Builder Keypad & Live Preview
  // ----------------------------------------------------------------

  selectFormulaParameter(param: SnapshotParameterDto): void {
    this.selectedFormulaParam = param;
    this.formulaExpression = param.formula || '';
    this.testFormulaPreview();
  }

  insertKeypadToken(token: string): void {
    if (this.isViewMode) return;
    this.formulaExpression += token;
    this.testFormulaPreview();
  }

  clearFormula(): void {
    if (this.isViewMode) return;
    this.formulaExpression = '';
    this.testFormulaPreview();
  }

  testFormulaPreview(): void {
    if (!this.formulaExpression) {
      this.formulaPreviewResult = null;
      this.formulaValid = true;
      return;
    }

    this.executionService.previewFormula({
      formula: this.formulaExpression,
      variables: this.formulaVariables,
      precision: this.selectedFormulaParam?.decimalPrecision || 2
    }).subscribe({
      next: (res) => {
        this.formulaPreviewResult = res;
        this.formulaValid = res.isValid;
      },
      error: () => {
        this.formulaValid = false;
      }
    });
  }

  saveFormulaExpression(): void {
    if (this.isViewMode || !this.selectedFormulaParam) return;
    this.selectedFormulaParam.formula = this.formulaExpression;
    this.selectedFormulaParam.isCalculated = true;
    this.evaluateAllReadings();
    this.toastService.show(`Formula updated for ${this.selectedFormulaParam.name}`, 'success');
  }

  // ----------------------------------------------------------------
  // Save, Complete, Verify, Approve Lifecycle
  // ----------------------------------------------------------------

  onRunChange(runNo: number): void {
    if (!this.universalTestGroupId || !runNo) return;
    this.isProcessing = true;
    this.executionService.getExecutionByGroupAndRun(this.universalTestGroupId, runNo).subscribe({
      next: (exec) => {
        this.isProcessing = false;
        this.currentLoadedExecutionId = exec.id;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { executionId: exec.id },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        this.applyExecutionData(exec);
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, `Failed to load Run ${runNo}`), 'error');
      }
    });
  }

  save(): void {
    if (this.isViewMode || !this.testExecutionId) return;
    this.isProcessing = true;

    // Always re-compute CurvePeak values (MDD/OMC) just before saving
    // so they are guaranteed to be in the form even if graph hasn't re-rendered yet.
    this.evaluateCurvePeaks();

    // Build conditions payload from live snapshot actuals (separate from configured)
    const conditionsPayload = (this.configSnapshot?.conditions || []).map(c => ({
      conditionDimensionID: (c as any).conditionMasterID ?? (c as any).conditionDimensionID,
      dimensionName: c.dimensionName,
      selectedExecutionValue: this.getConditionActual(c)
    }));

    const rawSpecimens = this.executionForm.getRawValue().specimens || [];
    const specimensPayload = rawSpecimens.map((spec: any) => ({
      id: spec.id || 0,
      sequenceNo: spec.sequenceNo,
      specimenIdentifier: spec.specimenIdentifier,
      isDiscarded: !!spec.isDiscarded,
      observations: (spec.observations || []).map((obs: any) => ({
        id: obs.id || 0,
        readingNo: obs.readingNo,
        parameterResults: (obs.results || obs.parameterResults || []).map((r: any) => {
          const rawStr = r.rawValue != null ? String(r.rawValue).trim() : null;
          let numVal: number | null = r.numericValue != null ? Number(r.numericValue) : null;
          if (numVal == null && rawStr !== null && rawStr !== '' && !isNaN(Number(rawStr))) {
            numVal = Number(rawStr);
          }
          return {
            id: r.id || 0,
            parameterMasterID: r.parameterMasterID,
            parameterCode: r.parameterCode,
            rawValue: rawStr,
            numericValue: numVal,
            calculatedValue: r.calculatedValue != null ? String(r.calculatedValue) : null,
            isFormulaCalculated: !!r.isFormulaCalculated,
            resultStatus: r.resultStatus || 'Pass'
          };
        })
      }))
    }));

    const remarksVal = this.executionForm.get('remarks')?.value || '';
    const equipmentPayload = (this.configSnapshot?.equipment || []).map(eq => ({
      equipmentID: eq.equipmentID || 0,
      equipmentName: eq.name || eq.equipmentName || '',
      model: eq.model || '',
      calibrationCertificateNo: eq.calibrationNo || '',
      calibrationStatus: eq.calibrationStatus || 'Valid'
    }));

    const payload: TestExecutionSaveDto = {
      specimens: specimensPayload,
      conditions: conditionsPayload as any,
      actualConditions: conditionsPayload as any,
      actualEquipment: equipmentPayload as any,
      equipment: (this.configSnapshot?.equipment || []) as any,
      remarks: remarksVal,
      executionRemarks: remarksVal
    };

    this.executionService.saveObservations(this.testExecutionId, payload).subscribe({
      next: (updated) => {
        this.isProcessing = false;
        this.applyExecutionData(updated);
        this.toastService.show('Observations draft saved successfully.', 'success');
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Failed to save observations'), 'error');
      }
    });
  }

  complete(): void {
    if (!this.testExecutionId) return;
    this.isProcessing = true;
    this.executionService.completeExecution(this.testExecutionId).subscribe({
      next: (updated) => {
        this.isProcessing = false;
        this.applyExecutionData(updated);
        this.toastService.show('Test execution completed and ready for verification.', 'success');
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Failed to complete execution'), 'error');
      }
    });
  }

  openActionModal(type: 'verify' | 'approve' | 'reject'): void {
    this.actionModalType = type;
    this.actionRemarks = '';
    if (type === 'verify') this.actionModalTitle = 'Verify Laboratory Execution';
    else if (type === 'approve') this.actionModalTitle = 'Approve Test Results & Finalize';
    else this.actionModalTitle = 'Reject Test Execution';
    this.actionModalVisible = true;
  }

  confirmAction(): void {
    if (!this.testExecutionId) return;
    this.isProcessing = true;
    const dto: ExecutionActionDto = { remarks: this.actionRemarks };

    const actionCall = this.actionModalType === 'verify'
      ? this.executionService.verifyExecution(this.testExecutionId, dto)
      : this.actionModalType === 'approve'
      ? this.executionService.approveExecution(this.testExecutionId, dto)
      : this.executionService.rejectExecution(this.testExecutionId, dto);

    actionCall.subscribe({
      next: (updated) => {
        this.isProcessing = false;
        this.actionModalVisible = false;
        this.applyExecutionData(updated);
        this.toastService.show(`Execution status updated to ${updated.status}`, 'success');
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Action failed'), 'error');
      }
    });
  }

  openRetestModal(): void {
    this.retestReasonCode = 'ANALYST_DISCRETION';
    this.retestJustification = '';
    this.retestModalVisible = true;
  }

  retest(): void {
    this.openRetestModal();
  }

  confirmRetest(): void {
    if (!this.testExecutionId) return;
    if (!this.retestReasonCode) {
      this.toastService.show('Retest reason code is required', 'warning');
      return;
    }
    if (!this.retestJustification || this.retestJustification.trim().length < 20) {
      this.toastService.show('Retest justification must be at least 20 characters', 'warning');
      return;
    }

    this.isProcessing = true;
    this.executionService.retestExecution(this.testExecutionId, {
      reasonCode: this.retestReasonCode,
      justification: this.retestJustification.trim()
    }).subscribe({
      next: (newExec) => {
        this.isProcessing = false;
        this.retestModalVisible = false;
        this.toastService.show(`Retest run #${newExec.executionNo} initiated successfully.`, 'success');
        const newId = Number((newExec as any)?.id ?? (newExec as any)?.ID ?? (newExec as any)?.Id ?? this.testExecutionId);
        this.router.navigate(['/universal-test-execution'], { queryParams: { executionId: newId }, replaceUrl: true });
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Failed to initiate retest'), 'error');
      }
    });
  }

  // ----------------------------------------------------------------
  // Configuration Item Management (When Status == 'Planned')
  // ----------------------------------------------------------------

  addParameter(): void {
    if (!this.configSnapshot || this.execution?.status !== 'Planned') return;
    if (!this.newParam.code || !this.newParam.name) {
      this.toastService.show('Parameter code and name are required', 'warning');
      return;
    }

    this.configSnapshot.parameters.push({
      parameterMasterID: Date.now(),
      code: this.newParam.code.toUpperCase(),
      name: this.newParam.name,
      unit: this.newParam.unit,
      inputType: this.newParam.inputType,
      decimalPrecision: this.newParam.decimals,
      isCalculated: this.newParam.isCalculated,
      formula: this.newParam.formula,
      specMin: this.newParam.specMin,
      specMax: this.newParam.specMax,
      displayOrder: this.configSnapshot.parameters.length + 1,
      isRequired: true
    });

    this.showAddParamModal = false;
    this.saveConfigSnapshot();
  }

  deleteParameter(idx: number): void {
    if (!this.configSnapshot || this.execution?.status !== 'Planned') return;
    this.configSnapshot.parameters.splice(idx, 1);
    this.saveConfigSnapshot();
  }

  addCondition(): void {
    if (!this.configSnapshot || this.execution?.status !== 'Planned') return;
    this.configSnapshot.conditions.push({
      dimensionName: this.newCondition.dimensionName,
      unit: this.newCondition.unit,
      configuredOperator: this.newCondition.configuredOperator,
      configuredValue1: this.newCondition.configuredValue1,
      configuredValue2: this.newCondition.configuredValue2,
      selectedExecutionValue: this.newCondition.configuredValue1
    });
    this.showAddConditionModal = false;
    this.saveConfigSnapshot();
  }

  deleteCondition(idx: number): void {
    if (!this.configSnapshot || this.execution?.status !== 'Planned') return;
    this.configSnapshot.conditions.splice(idx, 1);
    this.saveConfigSnapshot();
  }

  addEquipment(): void {
    if (!this.configSnapshot || this.execution?.status !== 'Planned') return;
    this.configSnapshot.equipment.push({
      name: this.newEquipment.name,
      model: this.newEquipment.model,
      calibrationNo: this.newEquipment.calibrationNo,
      calibratedOn: this.newEquipment.calibratedOn,
      validUpto: this.newEquipment.validUpto
    });
    this.showAddEquipmentModal = false;
    this.saveConfigSnapshot();
  }

  deleteEquipment(idx: number): void {
    if (!this.configSnapshot || this.execution?.status !== 'Planned') return;
    this.configSnapshot.equipment.splice(idx, 1);
    this.saveConfigSnapshot();
  }

  addFactor(): void {
    if (!this.configSnapshot || this.execution?.status !== 'Planned') return;
    this.configSnapshot.factors.push({
      factorType: this.newFactor.factorType,
      factorName: this.newFactor.factorName,
      value: this.newFactor.value,
      appliedOn: this.newFactor.appliedOn,
      description: this.newFactor.description
    });
    this.showAddFactorModal = false;
    this.saveConfigSnapshot();
  }

  deleteFactor(idx: number): void {
    if (!this.configSnapshot || this.execution?.status !== 'Planned') return;
    this.configSnapshot.factors.splice(idx, 1);
    this.saveConfigSnapshot();
  }

  saveConfigSnapshot(): void {
    if (!this.testExecutionId || !this.configSnapshot || this.execution?.status !== 'Planned') return;
    this.executionService.updateConfiguration(this.testExecutionId, this.configSnapshot).subscribe({
      next: (updated) => {
        this.applyExecutionData(updated);
        this.toastService.show('Configuration snapshot updated.', 'success');
      },
      error: (err) => {
        this.toastService.show(extractErrorMessage(err, 'Failed to update configuration'), 'error');
      }
    });
  }

  uploadAttachment(): void {
    if (!this.testExecutionId || !this.newAttachmentName) return;
    const dto: ExecutionAttachmentUploadDto = {
      fileName: this.newAttachmentName,
      fileType: this.newAttachmentType,
      fileUrl: '#'
    };
    this.executionService.addAttachment(this.testExecutionId, dto).subscribe({
      next: (updated) => {
        this.applyExecutionData(updated);
        this.showUploadModal = false;
        this.newAttachmentName = '';
        this.toastService.show('Attachment recorded successfully.', 'success');
      },
      error: (err) => {
        this.toastService.show(extractErrorMessage(err, 'Failed to upload attachment'), 'error');
      }
    });
  }

  // ----------------------------------------------------------------
  // Utility & Navigation
  // ----------------------------------------------------------------

  setWorkspaceTab(tab: 'config' | 'entry' | 'results' | 'review' | 'report' | 'audit'): void {
    this.activeWorkspaceTab = tab;
    if ((tab === 'results' || tab === 'review' || tab === 'audit') && this.testExecutionId) {
      this.loadUniversalResult();
    }
    if (tab === 'results' && this.testExecutionId) {
      this.executionService.getResultsOverview(this.testExecutionId).subscribe(ov => this.resultsOverview = ov);
      this.executionService.getCalculationTrace(this.testExecutionId).subscribe(tr => this.calcTrace = tr);
    }
    if (tab === 'report' && this.testExecutionId) {
      this.loadReportData();
    }
    if (tab === 'entry') {
      setTimeout(() => this.renderAllGraphs(), 150);
    }
  }

  openSeparateScreen(tab: 'results' | 'review' | 'report'): void {
    if (!this.testExecutionId) return;
    const base = tab === 'results' ? '/universal-result' : tab === 'review' ? '/universal-review' : '/universal-report';
    const url = `${window.location.origin}${base}?executionId=${this.testExecutionId}`;
    window.open(url, '_blank', 'noopener');
  }

  isTabLocked(tab: string): boolean {
    const status = this.execution?.status || 'Planned';
    if (tab === 'config' || tab === 'audit') return false;
    if (tab === 'entry') return false;
    if (tab === 'results') {
      return status === 'Planned';
    }
    if (tab === 'review') {
      return status === 'Planned' || status === 'InProgress';
    }
    if (tab === 'report') {
      return status !== 'Verified' && status !== 'Approved' && status !== 'Released' && status !== 'Closed' && !(this.universalReports && this.universalReports.length > 0);
    }
    return false;
  }

  loadUniversalResult(): void {
    if (!this.testExecutionId) return;
    this.resultService.getByExecution(this.testExecutionId).subscribe({
      next: (res) => {
        this.universalResult = res;
        this.reviewFindings = res?.findings || res?.Findings || [];
        this.reviewAudits = res?.audits || res?.Audits || [];
      },
      error: () => {
        // Result not created yet
      }
    });
  }

  loadReportData(): void {
    if (!this.testExecutionId) return;
    this.reportService.preview(this.testExecutionId, this.reportPreviewFormatCode).subscribe({
      next: (prev) => {
        this.reportPreviewData = prev;
      },
      error: () => {}
    });
    this.reportService.listByExecution(this.testExecutionId).subscribe({
      next: (list) => {
        this.universalReports = list || [];
        if (this.universalReports.length > 0) {
          this.selectedReport = this.universalReports[0];
        }
      },
      error: () => {}
    });
    this.reportService.getAvailableFormats().subscribe({
      next: (list) => {
        this.availableReportFormats = list && list.length ? list : [{ formatCode: 'DEFAULT', formatName: 'Default Universal Report' }];
      },
      error: () => {
        this.availableReportFormats = [{ formatCode: 'DEFAULT', formatName: 'Default Universal Report' }];
      }
    });
  }

  previewReportFormat(): void {
    if (!this.testExecutionId) return;
    this.reportService.preview(this.testExecutionId, this.reportPreviewFormatCode).subscribe({
      next: (prev) => {
        this.reportPreviewData = prev;
        const d: any = (prev as any)?.data ?? prev ?? {};
        const n = (d.resultParameters ?? d.ResultParameters ?? []).length;
        const src = d.reportFormatSource ?? d.ReportFormatSource ?? this.reportPreviewFormatCode;
        this.toastService.show(`Preview assembled in ${src} format (${n} frozen parameters, no recalculation).`, 'success');
      },
      error: (err) => {
        this.toastService.show(extractErrorMessage(err, 'Format preview failed.'), 'error');
      }
    });
  }

  isSelectedReportVoid(): boolean {
    const s = (this.selectedReport?.status ?? this.selectedReport?.Status ?? '').toUpperCase();
    return s === 'VOID';
  }

  runComplianceEvaluation(): void {
    if (!this.testExecutionId) return;
    this.isProcessing = true;
    this.resultService.evaluate(this.testExecutionId, 'Evaluation triggered from Universal Test Workspace').subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.universalResult = res;
        this.reviewFindings = res?.findings || res?.Findings || [];
        this.reviewAudits = res?.audits || res?.Audits || [];
        this.toastService.show('ISO 17025 Compliance evaluation completed.', 'success');
        this.setWorkspaceTab('results');
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Compliance evaluation failed.'), 'error');
      }
    });
  }

  finalizeResult(): void {
    if (!this.universalResult?.id) {
      this.toastService.show('Please run compliance evaluation first.', 'warning');
      return;
    }
    this.isProcessing = true;
    const token = this.universalResult.concurrencyToken || this.universalResult.ConcurrencyToken || '';
    this.resultService.finalize(this.universalResult.id, token, 'Finalized in workspace').subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.universalResult = res;
        this.reviewFindings = res?.findings || res?.Findings || [];
        this.reviewAudits = res?.audits || res?.Audits || [];
        this.toastService.show('Results finalized successfully. Ready for Technical Review.', 'success');
        if (this.testExecutionId) this.loadExecutionById(this.testExecutionId);
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Finalization failed.'), 'error');
      }
    });
  }

  submitReviewVerify(): void {
    if (!this.universalResult?.id) return;
    this.isProcessing = true;
    const token = this.universalResult.concurrencyToken || this.universalResult.ConcurrencyToken || '';
    this.reviewService.verify(this.universalResult.id, token, this.actionRemarks).subscribe({
      next: () => {
        this.isProcessing = false;
        this.toastService.show('Technical verification completed.', 'success');
        this.loadUniversalResult();
        if (this.testExecutionId) this.loadExecutionById(this.testExecutionId);
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Verification failed.'), 'error');
      }
    });
  }

  submitReviewApprove(): void {
    if (!this.universalResult?.id) return;
    this.isProcessing = true;
    const token = this.universalResult.concurrencyToken || this.universalResult.ConcurrencyToken || '';
    this.reviewService.approve(this.universalResult.id, token, this.actionRemarks).subscribe({
      next: () => {
        this.isProcessing = false;
        this.toastService.show('Test approved! Report generation is now unlocked.', 'success');
        this.loadUniversalResult();
        if (this.testExecutionId) this.loadExecutionById(this.testExecutionId);
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Approval failed.'), 'error');
      }
    });
  }

  submitRework(): void {
    if (!this.universalResult?.id) return;
    if (!this.actionRemarks || this.actionRemarks.trim().length < 5) {
      this.toastService.show('Please provide a reason for rework in remarks.', 'warning');
      return;
    }
    this.isProcessing = true;
    const token = this.universalResult.concurrencyToken || this.universalResult.ConcurrencyToken || '';
    this.reviewService.requestRework(this.universalResult.id, token, this.actionRemarks).subscribe({
      next: () => {
        this.isProcessing = false;
        this.toastService.show('Rework requested. Test execution reverted to InProgress.', 'warning');
        this.loadUniversalResult();
        if (this.testExecutionId) this.loadExecutionById(this.testExecutionId);
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Rework request failed.'), 'error');
      }
    });
  }

  createFinding(): void {
    if (!this.universalResult?.id || this.findingForm.invalid) {
      this.findingForm.markAllAsTouched();
      return;
    }
    this.reviewService.createFinding(this.universalResult.id, this.findingForm.value).subscribe({
      next: () => {
        this.toastService.show('Review finding recorded.', 'info');
        this.findingForm.reset({ findingType: 'Observation', severity: 'Major', isBlocking: true });
        this.loadUniversalResult();
      },
      error: (err) => {
        this.toastService.show(extractErrorMessage(err, 'Failed to record finding.'), 'error');
      }
    });
  }

  resolveFinding(findingId: number): void {
    const resolution = window.prompt('Enter resolution description:');
    if (!resolution || !resolution.trim()) return;
    this.reviewService.resolveFinding(findingId, resolution.trim()).subscribe({
      next: () => {
        this.toastService.show('Finding marked as resolved.', 'success');
        this.loadUniversalResult();
      },
      error: (err) => {
        this.toastService.show(extractErrorMessage(err, 'Failed to resolve finding.'), 'error');
      }
    });
  }

  generateOfficialReport(): void {
    if (!this.testExecutionId) return;
    this.isProcessing = true;
    this.reportService.generate(this.testExecutionId, 'Official test report generation from workspace').subscribe({
      next: (res) => {
        this.isProcessing = false;
        this.toastService.show(`Official report ${res?.reportNo || ''} generated successfully!`, 'success');
        this.loadReportData();
        if (this.testExecutionId) this.loadExecutionById(this.testExecutionId);
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Report generation failed.'), 'error');
      }
    });
  }

  releaseOfficialReport(reportId: number): void {
    this.isProcessing = true;
    this.reportService.release(reportId, 'Released from workspace').subscribe({
      next: () => {
        this.isProcessing = false;
        this.toastService.show('Report officially released.', 'success');
        this.loadReportData();
        if (this.testExecutionId) this.loadExecutionById(this.testExecutionId);
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(extractErrorMessage(err, 'Release failed.'), 'error');
      }
    });
  }

  downloadReportPdf(report: any): void {
    const reportId = Number(report?.id || report?.ID || 0);
    if (!reportId) return;
    this.toastService.show('Preparing PDF document download...', 'info');
    this.reportService.download(reportId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report?.reportNo || report?.ReportNo || 'Official_Test_Report'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.toastService.show(extractErrorMessage(err, 'PDF download failed.'), 'error');
      }
    });
  }

  get resultParams(): any[] {
    const allParams = this.universalResult?.parameters ?? this.universalResult?.Parameters ?? [];
    return allParams.filter((p: any) => p.isReportable !== false && p.IsReportable !== false);
  }

  get resultAuditsList(): any[] {
    return this.universalResult?.audits ?? this.universalResult?.Audits ?? [];
  }

  get conformingCount(): number {
    return this.resultParams.filter(p => (p.verdict || '').toUpperCase() === 'PASS').length;
  }

  get nonConformingCount(): number {
    return this.resultParams.filter(p => (p.verdict || '').toUpperCase() === 'FAIL').length;
  }

  get marginalCount(): number {
    return this.resultParams.filter(p => (p.verdict || '').toUpperCase() === 'MARGINAL').length;
  }

  get informationalCount(): number {
    return this.resultParams.filter(p => {
      const v = (p.verdict || '').toUpperCase();
      return v === 'INFORMATIONAL' || v === 'NOT_CONFIGURED' || v === 'NOT_EVALUATED';
    }).length;
  }

  getRequirementDisplay(p: any): string {
    if (!p) return '—';
    const unit = p.unit ? ` ${p.unit}` : '';
    if (p.specMin != null && p.specMax != null) {
      return `[${p.specMin} – ${p.specMax}]${unit}`;
    }
    if (p.specMin != null) {
      return `≥ ${p.specMin}${unit}`;
    }
    if (p.specMax != null) {
      return `≤ ${p.specMax}${unit}`;
    }
    if (p.specTarget != null) {
      const tol = p.maxTolerance != null ? ` ± ${p.maxTolerance}` : '';
      return `${p.specTarget}${tol}${unit}`;
    }
    return p.requirementStatus === 'SPECIFICATION_NOT_APPLICABLE' ? 'Standardless / N/A' : (p.specRange || 'Not Configured');
  }

  getMarginClass(p: any): string {
    if (!p || p.complianceMargin == null) return '';
    const v = (p.verdict || '').toUpperCase();
    if (v === 'PASS') return 'badge-margin-safe';
    if (v === 'FAIL') return 'badge-margin-fail';
    if (v === 'MARGINAL') return 'badge-margin-marginal';
    return 'badge-margin-neutral';
  }

  copySnapshotHash(hash: string): void {
    if (!hash) return;
    navigator.clipboard.writeText(hash).then(() => {
      this.toastService.show('Snapshot hash copied to clipboard', 'success');
    });
  }

  verdictClass(v: string): string {
    const s = (v || '').toUpperCase();
    if (s === 'PASS') return 'verdict-pass';
    if (s === 'FAIL') return 'verdict-fail';
    if (s === 'MARGINAL') return 'verdict-marginal';
    if (s === 'INFORMATIONAL') return 'verdict-info';
    return 'verdict-neutral';
  }

  statusClass(s: string): string {
    const v = (s || '').toLowerCase().replace(/\s/g, '');
    if (v === 'draft') return 'result-status-draft';
    if (v === 'calculated') return 'result-status-calculated';
    if (v === 'finalized') return 'result-status-finalized';
    if (v === 'underreview') return 'result-status-underreview';
    if (v === 'verified') return 'result-status-verified';
    if (v === 'approved') return 'result-status-approved';
    return 'result-status-rework';
  }

  toggleInspectorDrawer(): void {
    this.isInspectorDrawerOpen = !this.isInspectorDrawerOpen;
  }

  closeInspectorDrawer(): void {
    this.isInspectorDrawerOpen = false;
  }

  setConfigCategory(cat: string): void {
    if (this.categoryKeys.includes(cat)) {
      this.activeConfigCategory = cat;
      if (cat === 'formula' && !this.selectedFormulaParam) {
        const firstCalc = this.parameters.find(p => p.isCalculated);
        if (firstCalc) {
          this.selectFormulaParameter(firstCalc);
        }
      }
    }
  }

  openCategoryModal(cat: string): void {
    this.setConfigCategory(cat);
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
  }

  prevCategory(): void {
    const idx = this.categoryKeys.indexOf(this.activeConfigCategory);
    const prevIdx = (idx - 1 + this.categoryKeys.length) % this.categoryKeys.length;
    this.setConfigCategory(this.categoryKeys[prevIdx]);
  }

  nextCategory(): void {
    const idx = this.categoryKeys.indexOf(this.activeConfigCategory);
    const nextIdx = (idx + 1) % this.categoryKeys.length;
    this.setConfigCategory(this.categoryKeys[nextIdx]);
  }

  get activeCategoryIndex(): number {
    return this.categoryKeys.indexOf(this.activeConfigCategory);
  }

  get categoryPointerTop(): number {
    const idx = this.activeCategoryIndex;
    if (idx < 0) return 60;
    return 42 + (idx * 48) + 14;
  }

  get currentCategoryMeta(): { title: string; subtitle: string; icon: string; badgeColor: string } {
    return this.categoryMeta[this.activeConfigCategory] || {
      title: 'Category Details',
      subtitle: 'Configuration Details',
      icon: 'bi-gear',
      badgeColor: 'bg-primary'
    };
  }

  get currentCategoryCount(): string | number {
    return this.getCategoryCount(this.activeConfigCategory);
  }

  getCategoryCount(catKey: string): number {
    switch (catKey) {
      case 'parameters':
        return this.parameters?.length || 0;
      case 'conditions':
        return this.configSnapshot?.conditions?.length || 0;
      case 'limits':
        return this.parameters?.length || 0;
      case 'formula':
        return this.parameters.filter(p => p.isCalculated)?.length || 0;
      case 'equipment':
        return this.configSnapshot?.equipment?.length || 0;
      case 'factors':
        return this.configSnapshot?.factors?.length || 0;
      case 'uncertainty':
        return 1;
      case 'acceptance':
        return 1;
      case 'attachments':
        return this.configSnapshot?.attachments?.length || 0;
      case 'remarks':
        return 1;
      default:
        return 0;
    }
  }

  get inputParametersCount(): number {
    return this.parameters.filter(p => !p.isCalculated).length;
  }

  get calculatedParametersCount(): number {
    return this.parameters.filter(p => p.isCalculated).length;
  }

  get filteredParameters(): SnapshotParameterDto[] {
    if (!this.categorySearchTerm || !this.categorySearchTerm.trim()) {
      return this.parameters;
    }
    const term = this.categorySearchTerm.toLowerCase().trim();
    return this.parameters.filter(p =>
      (p.code || '').toLowerCase().includes(term) ||
      (p.name || '').toLowerCase().includes(term) ||
      (p.parameterType || '').toLowerCase().includes(term)
    );
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.showCategoryModal) {
      this.closeCategoryModal();
    }
    if (this.isInspectorDrawerOpen) {
      this.closeInspectorDrawer();
    }
  }

  // Dynamic Lifecycle Timeline Getters
  get currentStageLevel(): number {
    const s = (this.execution?.status || this.universalResult?.resultStatus || '').toUpperCase().replace(/\s/g, '');
    if (s.includes('APPROVED')) return 5;
    if (s.includes('VERIFIED')) return 4;
    if (s.includes('COMPLETED') || s.includes('FINALIZED')) return 3;
    if (s.includes('INPROGRESS') || s.includes('CALCULATED') || s.includes('DRAFT')) return 2;
    if (s.includes('PLANNED')) return 1;
    return 2;
  }

  get isExecutionRejected(): boolean {
    const s = (this.execution?.status || this.universalResult?.resultStatus || '').toUpperCase();
    return s.includes('REJECT') || s.includes('REWORK');
  }

  getAuditFor(eventType: string): any {
    if (!this.reviewAudits || !this.reviewAudits.length) return null;
    const key = eventType.toLowerCase();
    return this.reviewAudits.find(a => (a.eventType || a.EventType || '').toLowerCase().includes(key));
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  today: Date = new Date();

  dataOfReportPreview(): any {
    return this.reportPreviewData?.data ?? this.reportPreviewData?.Data ?? this.reportPreviewData ?? {};
  }

  getApiUrl(path: string | undefined | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    const clean = '/' + path.replace(/\\/g, '/').replace(/^\/+/, '');
    const base = (environment.baseUrl || environment.apiUrl || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
    return base + clean;
  }

  hasNablMark(): boolean {
    const d = this.dataOfReportPreview();
    const r = this.selectedReport;
    return !!(d?.showNablMark || d?.ShowNablMark || d?.isWithinAccreditedScope || d?.IsWithinAccreditedScope || r?.showNablMark || r?.ShowNablMark);
  }

  getNablLogoUrl(): string {
    const d = this.dataOfReportPreview();
    const r = this.selectedReport;
    const path = d?.nablLogoPath || d?.NablLogoPath || r?.nablLogoPath || r?.NablLogoPath;
    if (path) {
      return this.getApiUrl(path);
    }
    return '';
  }

  getLabLogoUrl(): string {
    const d = this.dataOfReportPreview();
    const path = d?.labLogoPath || d?.LabLogoPath;
    if (path) {
      return this.getApiUrl(path);
    }
    return '';
  }

  getEquipmentString(): string {
    const d = this.dataOfReportPreview();
    const eqList = d?.equipment ?? d?.Equipment;
    if (eqList && Array.isArray(eqList) && eqList.length > 0) {
      return eqList.map((e: any) => `${e.equipmentName || e.name || 'Equipment'} (${e.equipmentCode || e.code || 'ID: EQ'})`).join(', ');
    }
    return (d?.testEquipment && d.testEquipment !== '—') ? d.testEquipment : ((this.execution as any)?.equipmentName || 'Modified Proctor / Heavy Compaction');
  }

  getConditionsString(): string {
    const d = this.dataOfReportPreview();
    const condList = d?.conditions ?? d?.Conditions;
    if (condList && Array.isArray(condList) && condList.length > 0) {
      return condList.map((c: any) => `${c.conditionName || c.name || 'Param'}: ${c.conditionValue || c.value || '-'} ${c.unit || ''}`.trim()).join(' | ');
    }
    return (d?.environmentalConditions && d.environmentalConditions !== '—') ? d.environmentalConditions : 'Param: - | Param: - | Param: -';
  }

  getMethodVersion(): string {
    const d = this.dataOfReportPreview();
    return d?.testMethodVersion || '1983';
  }

  getReportTableRows(): any[] {
    const d = this.dataOfReportPreview();
    let reportParams = d?.resultParameters ?? d?.ResultParameters;
    reportParams = reportParams?.filter((p: any) => p.isReportable !== false && p.IsReportable !== false);
    if (reportParams?.length) {
      return reportParams.map((p: any, idx: number) => {
        const min = p.effectiveMin ?? p.specMin;
        const max = p.effectiveMax ?? p.specMax;
        let req = p.requirement ?? p.Requirement ?? p.specRange ?? '—';
        if (min != null && max != null) {
          req = `${min} - ${max}`;
        } else if (min != null) {
          req = `${min} Min`;
        } else if (max != null) {
          req = `${max} Max`;
        }
        return {
          srNo: idx + 1,
          parameterCode: p.parameterCode || p.code || '',
          parameterName: p.parameterName || p.ParameterName || p.parameterCode || p.code,
          testMethod: p.testMethodStandard || p.testMethodName || d?.testMethodStandard || d?.testMethodName || '—',
          unit: p.unit || p.Unit || '-',
          finalValue: p.reportedValue ?? p.ReportedValue ?? p.displayValue ?? p.DisplayValue ?? p.complianceValue ?? p.ComplianceValue ?? p.rawValue ?? '—',
          specRange: req,
          status: p.verdict ?? p.Verdict ?? p.status ?? '—',
          uncertainty: p.expandedUncertainty ?? p.uncertainty ?? null
        };
      });
    }
    if (this.resultsOverview?.parameters?.length) {
      return this.resultsOverview.parameters.map((p, idx) => ({
        srNo: idx + 1,
        parameterCode: p.parameterCode || '',
        parameterName: p.parameterName,
        testMethod: this.displayExecutionTestName || '—',
        unit: p.unit || '%',
        finalValue: p.finalValue ?? p.averageValue ?? '—',
        specRange: p.specRange || '—',
        status: p.status || 'Pass',
        uncertainty: null
      }));
    }
    return (this.parameters || []).map((p, idx) => {
      const min = p.specMin !== null && p.specMin !== undefined ? p.specMin : null;
      const max = p.specMax !== null && p.specMax !== undefined ? p.specMax : null;
      let specRange = '—';
      if (min !== null && max !== null) specRange = `${min} - ${max}`;
      else if (min !== null) specRange = `${min} Min`;
      else if (max !== null) specRange = `${max} Max`;
      return {
        srNo: idx + 1,
        parameterCode: p.code || '',
        parameterName: p.name,
        testMethod: this.displayExecutionTestName || '—',
        unit: p.unit || '%',
        finalValue: '—',
        specRange: specRange,
        status: 'PENDING',
        uncertainty: null
      };
    });
  }

  goBack(): void {
    const query = this.route.snapshot.queryParams;
    const from = query['from'];
    const returnUrl = query['returnUrl'];

    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
      return;
    }

    if (from === 'group' && this.universalTestGroupId) {
      this.router.navigate(['/sample/test-group', this.universalTestGroupId]);
      return;
    }

    if (from === 'list') {
      this.router.navigate(['/sample/test-groups']);
      return;
    }

    if (from === 'result' && this.testExecutionId) {
      this.router.navigate(['/universal-result'], { queryParams: { executionId: this.testExecutionId } });
      return;
    }

    if (from === 'review' && this.testExecutionId) {
      this.router.navigate(['/universal-review'], { queryParams: { executionId: this.testExecutionId } });
      return;
    }

    if (from === 'report' && this.testExecutionId) {
      this.router.navigate(['/universal-report'], { queryParams: { executionId: this.testExecutionId } });
      return;
    }

    // Check if the user navigated from within this Angular application session
    if (window.history.state?.navigationId > 1) {
      this.location.back();
      return;
    }

    // Direct access fallback: parent Universal Test Group if known
    if (this.universalTestGroupId) {
      this.router.navigate(['/sample/test-group', this.universalTestGroupId]);
      return;
    }

    // Standard Universal workflow queue fallback
    this.router.navigate(['/sample/test-groups']);
  }

  // Sample context helpers (which sample is under test)
  get displaySampleNo(): string {
    return (this.execution as any)?.sampleNo || '—';
  }

  get displayCaseNo(): string {
    return (this.execution as any)?.caseNo || '—';
  }

  get displayCustomerName(): string {
    return (this.execution as any)?.customerName || (this.execution as any)?.clientName || '—';
  }

  get displaySampleDescription(): string {
    return (this.execution as any)?.sampleDescription || (this.execution as any)?.materialName || '';
  }

  get displayExecutionTestName(): string {
    return (this.execution as any)?.testName || this.configSnapshot?.laboratoryTestName || this.configSnapshot?.testName || '—';
  }

  get displayDisciplineName(): string {
    return this.configSnapshot?.disciplineName || '—';
  }

  get displayGradeName(): string {
    return (this.execution as any)?.gradeName || this.configSnapshot?.gradeName || '—';
  }

  get displaySpecTitle(): string {
    return (this.execution as any)?.specificationTitle || this.configSnapshot?.specificationTitle || this.configSnapshot?.specificationName || '';
  }

  // ----------------------------------------------------------------
  // Execution Layout & Dynamic Section Engine (Phase B.4)
  // ----------------------------------------------------------------
  private activeCharts: Map<string, Chart> = new Map();
  collapsedSections: Record<number, boolean> = {};
  isUnmappedCollapsed: boolean = false;

  get hasExecutionLayout(): boolean {
    return !!(this.configSnapshot?.executionLayout?.sections && this.configSnapshot.executionLayout.sections.length > 0);
  }

  get layoutSections(): ExecutionLayoutSectionDto[] {
    if (!this.configSnapshot?.executionLayout?.sections) return [];
    return [...this.configSnapshot.executionLayout.sections].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  toggleSectionCollapse(secId: number): void {
    this.collapsedSections[secId] = !this.collapsedSections[secId];
    if (!this.collapsedSections[secId]) {
      setTimeout(() => this.renderAllGraphs(), 100);
    }
  }

  isSectionCollapsed(sec: ExecutionLayoutSectionDto): boolean {
    return !!this.collapsedSections[sec.id];
  }

  toggleUnmappedCollapse(): void {
    this.isUnmappedCollapsed = !this.isUnmappedCollapsed;
  }

  // ----------------------------------------------------------------
  // Unified Parameter Management & Execution Deduplication (Phase B.5)
  // ----------------------------------------------------------------
  get unifiedExecutionParameters(): (SnapshotParameterDto & { origin: 'Layout' | 'TestMaster' | 'Added' })[] {
    const result: (SnapshotParameterDto & { origin: 'Layout' | 'TestMaster' | 'Added' })[] = [];
    const seenIds = new Set<number>();

    // 1. Gather all layout-mapped parameter IDs in layout section display order
    const mappedIdsInOrder: number[] = [];
    if (this.hasExecutionLayout) {
      this.layoutSections
        .filter(s => s.sectionType === 'Parameters' || s.sectionType === 'Observations')
        .forEach(s => {
          (s.items || [])
            .filter(it => it.referenceType === 'ParameterMaster' || it.referenceType === 'ParameterMasterID' || !it.referenceType || it.referenceType === 'None')
            .forEach(it => {
              if (it.referenceID && !mappedIdsInOrder.includes(it.referenceID)) {
                mappedIdsInOrder.push(it.referenceID);
              }
            });
        });
    }

    // 2. Add layout-mapped parameters first (Test Master definition is strictly PRIMARY)
    for (const mid of mappedIdsInOrder) {
      const testParam = this.parameters.find(p => p.parameterMasterID === mid);
      if (testParam && !seenIds.has(testParam.parameterMasterID)) {
        seenIds.add(testParam.parameterMasterID);
        result.push({
          ...testParam,
          origin: 'Layout'
        });
      }
    }

    // 3. Add remaining test master parameters (unmapped in layout, deduplicated)
    for (const p of this.parameters) {
      if (!seenIds.has(p.parameterMasterID)) {
        seenIds.add(p.parameterMasterID);
        const originType: 'Layout' | 'TestMaster' | 'Added' = (p as any).isCustomAdded ? 'Added' : 'TestMaster';
        result.push({
          ...p,
          origin: originType
        });
      }
    }

    return result;
  }

  get hasObservationsSection(): boolean {
    return this.layoutSections.some(s => s.sectionType === 'Observations');
  }

  isPrimaryParametersSection(sec: ExecutionLayoutSectionDto): boolean {
    const paramSections = this.layoutSections.filter(s => s.sectionType === 'Parameters');
    return paramSections.length > 0 && paramSections[0].id === sec.id;
  }

  getObservationSectionParameters(sec: ExecutionLayoutSectionDto): (SnapshotParameterDto & { origin?: 'Layout' | 'TestMaster' | 'Added' })[] {
    const sectionParams = this.getSectionParameters(sec);
    if (sectionParams.length > 0) {
      return sectionParams;
    }
    // Fallback: If section has no explicit items defined, return all input/non-calculated parameters
    return this.parameters.filter(p => !p.isCalculated);
  }

  // ----------------------------------------------------------------
  // In-Place Add & Remove Parameter Engine (Execution Entry)
  // ----------------------------------------------------------------
  showAddExecutionParamModal: boolean = false;
  newExecutionParam = {
    code: '',
    name: '',
    unit: '',
    inputType: 'Decimal',
    decimals: 2,
    isCalculated: false,
    formula: '',
    specMin: null as number | null,
    specMax: null as number | null,
    isRequired: false
  };

  openAddExecutionParamModal(): void {
    this.newExecutionParam = {
      code: '',
      name: '',
      unit: '',
      inputType: 'Decimal',
      decimals: 2,
      isCalculated: false,
      formula: '',
      specMin: null,
      specMax: null,
      isRequired: false
    };
    this.showAddExecutionParamModal = true;
  }

  closeAddExecutionParamModal(): void {
    this.showAddExecutionParamModal = false;
  }

  confirmAddExecutionParam(): void {
    if (!this.newExecutionParam.code || !this.newExecutionParam.name) {
      this.toastService.show('Parameter Code and Name are required.', 'warning');
      return;
    }

    const codeUpper = this.newExecutionParam.code.trim().toUpperCase();
    if (this.parameters.some(p => p.code === codeUpper)) {
      this.toastService.show(`Parameter with code '${codeUpper}' already exists.`, 'warning');
      return;
    }

    const newMasterId = Date.now();
    const newP: SnapshotParameterDto & { isCustomAdded?: boolean } = {
      parameterMasterID: newMasterId,
      code: codeUpper,
      name: this.newExecutionParam.name.trim(),
      unit: this.newExecutionParam.unit?.trim() || '',
      inputType: this.newExecutionParam.inputType,
      parameterType: this.newExecutionParam.isCalculated ? 'Calculated' : 'Input',
      decimalPrecision: this.newExecutionParam.decimals ?? 2,
      isCalculated: this.newExecutionParam.isCalculated,
      formula: this.newExecutionParam.formula?.trim() || '',
      formulaDependencies: [],
      specMin: this.newExecutionParam.specMin != null ? this.newExecutionParam.specMin : undefined,
      specMax: this.newExecutionParam.specMax != null ? this.newExecutionParam.specMax : undefined,
      displayOrder: this.parameters.length + 1,
      isRequired: !!this.newExecutionParam.isRequired,
      isReportable: true,
      dropdownOptions: [],
      isCustomAdded: true
    };

    this.parameters.push(newP);
    if (this.configSnapshot) {
      if (!this.configSnapshot.parameters) this.configSnapshot.parameters = [];
      this.configSnapshot.parameters.push(newP);
    }

    // Provision FormControls across all existing specimens and observations
    this.specimens.controls.forEach(spec => {
      const obsFA = spec.get('observations') as FormArray;
      if (obsFA) {
        obsFA.controls.forEach(obs => {
          const resFA = obs.get('results') as FormArray;
          if (resFA) {
            const resGroup = this.fb.group({
              id: [0],
              parameterMasterID: [newMasterId],
              parameterCode: [newP.code],
              rawValue: [''],
              numericValue: [null],
              calculatedValue: [''],
              isFormulaCalculated: [newP.isCalculated],
              resultStatus: ['Pass']
            });
            resFA.push(resGroup);
          }
        });
      }
    });

    this.showAddExecutionParamModal = false;
    this.evaluateAllReadings();
    this.toastService.show(`Parameter '${newP.name}' added to execution entry.`, 'success');
  }

  removeExecutionParam(param: SnapshotParameterDto): void {
    if (this.isViewMode) return;
    if (param.isRequired) {
      this.toastService.show(`Cannot remove mandatory parameter '${param.name}'.`, 'warning');
      return;
    }

    const idx = this.parameters.findIndex(p => p.parameterMasterID === param.parameterMasterID);
    if (idx >= 0) {
      this.parameters.splice(idx, 1);
    }
    if (this.configSnapshot?.parameters) {
      const snapIdx = this.configSnapshot.parameters.findIndex(p => p.parameterMasterID === param.parameterMasterID);
      if (snapIdx >= 0) {
        this.configSnapshot.parameters.splice(snapIdx, 1);
      }
    }

    // Remove from observation FormArrays
    this.specimens.controls.forEach(spec => {
      const obsFA = spec.get('observations') as FormArray;
      if (obsFA) {
        obsFA.controls.forEach(obs => {
          const resFA = obs.get('results') as FormArray;
          if (resFA) {
            const rIdx = resFA.controls.findIndex(c => c.get('parameterMasterID')?.value === param.parameterMasterID);
            if (rIdx >= 0) {
              resFA.removeAt(rIdx);
            }
          }
        });
      }
    });

    this.evaluateAllReadings();
    this.toastService.show(`Parameter '${param.name}' removed from execution.`, 'info');
  }

  // ----------------------------------------------------------------
  // Preparation Checklist & Calculation Live Value Helpers
  // ----------------------------------------------------------------
  preparationChecklist: Record<string, boolean> = {};

  togglePreparationChecklist(key: string): void {
    this.preparationChecklist[key] = !this.preparationChecklist[key];
  }

  isPreparationItemChecked(key: string): boolean {
    return !!this.preparationChecklist[key];
  }

  getCalculatedValue(param: SnapshotParameterDto): string {
    for (const spec of this.specimens.controls) {
      const obsFA = spec.get('observations') as FormArray;
      if (obsFA) {
        for (const obs of obsFA.controls) {
          const resCtrl = this.getResultControl(obs as FormGroup, param.parameterMasterID);
          const calc = resCtrl?.get('calculatedValue')?.value;
          if (calc != null && calc !== '' && calc !== '—') return String(calc);
          const raw = resCtrl?.get('rawValue')?.value;
          if (raw != null && raw !== '' && raw !== '—') return String(raw);
        }
      }
    }
    if (this.resultsOverview?.parameters) {
      const cr = this.resultsOverview.parameters.find(r => r.parameterCode === param.code);
      if (cr?.finalValue != null && cr.finalValue !== '') return String(cr.finalValue);
      if (cr?.averageValue != null && cr.averageValue !== '') return String(cr.averageValue);
    }
    return '—';
  }

  getSectionParameters(sec: ExecutionLayoutSectionDto): SnapshotParameterDto[] {
    if (!sec.items || sec.items.length === 0) return [];
    const paramIds = sec.items
      .filter(it => it.referenceType === 'ParameterMaster' || it.referenceType === 'ParameterMasterID' || !it.referenceType || it.referenceType === 'None')
      .map(it => it.referenceID);
    return this.parameters.filter(p => paramIds.includes(p.parameterMasterID));
  }

  get unmappedParameters(): SnapshotParameterDto[] {
    if (!this.hasExecutionLayout) return [];
    const allMappedIds = new Set<number>();
    (this.configSnapshot?.executionLayout?.sections || []).forEach(sec => {
      // If section is Observations and has no explicit items, it covers all non-calculated parameters
      if (sec.sectionType === 'Observations' && (!sec.items || sec.items.length === 0)) {
        this.parameters.filter(p => !p.isCalculated).forEach(p => allMappedIds.add(p.parameterMasterID));
      } else if (sec.sectionType === 'Parameters' && !this.hasObservationsSection) {
        this.parameters.forEach(p => allMappedIds.add(p.parameterMasterID));
      } else {
        (sec.items || []).forEach(it => {
          if (it.referenceID) allMappedIds.add(it.referenceID);
        });
      }
    });
    return this.parameters.filter(p => !allMappedIds.has(p.parameterMasterID));
  }

  getResultControl(obs: FormGroup, paramMasterId: number): FormGroup | null {
    const resultsFA = obs.get('results') as FormArray;
    if (!resultsFA) return null;
    const ctrl = resultsFA.controls.find(c => c.get('parameterMasterID')?.value === paramMasterId);
    return ctrl ? (ctrl as FormGroup) : null;
  }

  getSpecimenResultControl(specimenIndex: number, paramMasterId: number): FormGroup | null {
    if (!this.specimens || this.specimens.length <= specimenIndex) return null;
    const spec = this.specimens.at(specimenIndex) as FormGroup;
    if (!spec) return null;
    const obsFA = spec.get('observations') as FormArray;
    if (!obsFA || obsFA.length === 0) return null;
    return this.getResultControl(obsFA.at(0) as FormGroup, paramMasterId);
  }

  onSpecimenParamInput(param: SnapshotParameterDto, resCtrl: FormGroup): void {
    resCtrl.markAsDirty();
    const raw = resCtrl.get('rawValue')?.value;
    const num = (raw !== '' && raw != null) ? parseFloat(String(raw)) : null;
    resCtrl.patchValue({ numericValue: num, calculatedValue: raw }, { emitEvent: false });
    
    // Sync to all observations of the specimen
    this.specimens.controls.forEach(spec => {
      const obsFA = spec.get('observations') as FormArray;
      obsFA.controls.forEach(obs => {
        const ctrl = this.getResultControl(obs as FormGroup, param.parameterMasterID);
        if (ctrl && ctrl !== resCtrl) {
          ctrl.patchValue({ rawValue: raw, numericValue: num, calculatedValue: raw }, { emitEvent: false });
        }
      });
    });

    this.evaluateAllReadings();
  }

  getSectionIcon(sectionType: string): string {
    switch (sectionType) {
      case 'Preparation': return 'bi-clipboard-check text-info';
      case 'Conditions': return 'bi-thermometer-half text-info';
      case 'Equipment': return 'bi-tools text-warning';
      case 'Parameters': return 'bi-list-columns text-primary';
      case 'Observations': return 'bi-eye text-primary';
      case 'Calculations': return 'bi-calculator text-success';
      case 'Graph': return 'bi-graph-up text-danger';
      case 'Factors': return 'bi-percent text-secondary';
      case 'MeasurementUncertainty': return 'bi-compass text-dark';
      case 'AcceptanceCriteria': return 'bi-check2-circle text-success';
      case 'Attachments': return 'bi-paperclip text-primary';
      case 'Remarks': return 'bi-card-text text-secondary';
      default: return 'bi-layout-text-window text-secondary';
    }
  }

  getGraphConfig(sec: ExecutionLayoutSectionDto): { xAxisParam?: SnapshotParameterDto; yAxisParam?: SnapshotParameterDto; seriesParams: SnapshotParameterDto[] } {
    const xItem = (sec.items || []).find(it => it.referenceType === 'GraphXAxis');
    const yItem = (sec.items || []).find(it => it.referenceType === 'GraphYAxis');
    const sItems = (sec.items || []).filter(it => it.referenceType === 'GraphSeries');

    const xAxisParam = this.parameters.find(p => p.parameterMasterID === xItem?.referenceID);
    const yAxisParam = this.parameters.find(p => p.parameterMasterID === yItem?.referenceID);
    const seriesParams = this.parameters.filter(p => sItems.some(si => si.referenceID === p.parameterMasterID));

    return { xAxisParam, yAxisParam, seriesParams };
  }

  renderGraphForSection(sec: ExecutionLayoutSectionDto): void {
    const canvasId = 'chartCanvas_' + sec.id;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const graphConfig = this.getGraphConfig(sec);
    const xParam = graphConfig.xAxisParam;
    const yParam = graphConfig.yAxisParam;

    const datasets: any[] = [];
    const colors = ['#da261c', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2'];

    this.specimens.controls.forEach((spec, sIdx) => {
      const specId = spec.get('specimenIdentifier')?.value || `Specimen #${sIdx + 1}`;
      const isDiscarded = spec.get('isDiscarded')?.value;
      if (isDiscarded) return;

      const obsFA = spec.get('observations') as FormArray;
      const points: { x: number; y: number }[] = [];

      obsFA.controls.forEach(obs => {
        let xVal: number | null = null;
        let yVal: number | null = null;

        if (xParam) {
          const resCtrl = this.getResultControl(obs as FormGroup, xParam.parameterMasterID);
          const raw = resCtrl?.get('rawValue')?.value ?? resCtrl?.get('numericValue')?.value;
          if (raw !== '' && raw != null && !isNaN(Number(raw))) xVal = Number(raw);
        }
        if (yParam) {
          const resCtrl = this.getResultControl(obs as FormGroup, yParam.parameterMasterID);
          const raw = resCtrl?.get('rawValue')?.value ?? resCtrl?.get('numericValue')?.value;
          if (raw !== '' && raw != null && !isNaN(Number(raw))) yVal = Number(raw);
        }

        if (xVal !== null && yVal !== null) {
          points.push({ x: xVal, y: yVal });
        }
      });

      points.sort((a, b) => a.x - b.x);

      const color = colors[sIdx % colors.length];
      datasets.push({
        label: specId,
        data: points,
        borderColor: color,
        backgroundColor: color + '20',
        fill: false,
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
        showLine: true
      });
    });

    const existingChart = this.activeCharts.get(canvasId);
    if (existingChart) {
      existingChart.destroy();
      this.activeCharts.delete(canvasId);
    }

    const chart = new Chart(canvas, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Poppins', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => `${ctx.dataset.label}: (${ctx.raw.x} ${xParam?.unit || ''}, ${ctx.raw.y} ${yParam?.unit || ''})`
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: true,
              text: `${xParam?.name || 'X-Axis'} (${xParam?.unit || '—'})`,
              font: { family: 'Poppins', size: 11, weight: 'bold' }
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          y: {
            title: {
              display: true,
              text: `${yParam?.name || 'Y-Axis'} (${yParam?.unit || '—'})`,
              font: { family: 'Poppins', size: 11, weight: 'bold' }
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        }
      }
    });

    this.activeCharts.set(canvasId, chart);
  }

  renderAllGraphs(): void {
    if (!this.hasExecutionLayout) return;
    const graphSections = this.layoutSections.filter(s => s.sectionType === 'Graph' || s.presentationStyle === 'InteractiveChart');
    graphSections.forEach(sec => this.renderGraphForSection(sec));
  }
}
