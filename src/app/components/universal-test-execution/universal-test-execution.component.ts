import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-universal-test-execution',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './universal-test-execution.component.html',
  styleUrls: ['./universal-test-execution.component.css']
})
export class UniversalTestExecutionComponent implements OnInit, OnDestroy {
  // Main Workspace Tab: 'config' | 'entry' | 'results' | 'calculations' | 'review' | 'report' | 'audit'
  activeWorkspaceTab: 'config' | 'entry' | 'results' | 'calculations' | 'review' | 'report' | 'audit' = 'config';

  // Test Configuration Category: 10 items
  activeConfigCategory: string = 'parameters';

  executionForm: FormGroup;
  execution: TestExecutionDto | null = null;
  configSnapshot: TestExecutionConfigSnapshotDto | null = null;
  parameters: SnapshotParameterDto[] = [];
  testExecutionId: number | null = null;
  universalTestGroupId: number | null = null;
  isViewMode: boolean = false;
  isProcessing: boolean = false;
  isFullscreen: boolean = false;

  // Run switcher
  availableRuns: number[] = [1];
  selectedRunNo: number = 1;

  // Formula Builder & Live Preview
  selectedFormulaParam: SnapshotParameterDto | null = null;
  formulaExpression: string = '';
  formulaVariables: Record<string, number> = {
    'SOIL_LL': 42.0,
    'SOIL_PL': 18.0
  };
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
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.executionForm = this.fb.group({
      specimens: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe(params => {
      const execId = params['executionId'] || params['id'];
      if (execId) {
        this.testExecutionId = +execId;
        this.loadExecutionById(this.testExecutionId);
      } else if (params['utgId']) {
        this.universalTestGroupId = +params['utgId'];
        this.loadExecutionByGroup(this.universalTestGroupId);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
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

  // ----------------------------------------------------------------
  // Data Loading
  // ----------------------------------------------------------------

  loadExecutionById(id: number): void {
    this.isProcessing = true;
    this.executionService.getExecution(id).subscribe({
      next: (exec) => {
        this.isProcessing = false;
        this.applyExecutionData(exec);
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(err?.error?.message || 'Failed to load execution details', 'error');
      }
    });
  }

  loadExecutionByGroup(groupId: number): void {
    this.isProcessing = true;
    this.executionService.getExecutionByGroup(groupId).subscribe({
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
        this.toastService.show(err?.error?.message || 'Failed to start execution', 'error');
      }
    });
  }

  applyExecutionData(exec: TestExecutionDto): void {
    this.execution = exec;
    this.testExecutionId = exec.id;
    this.universalTestGroupId = exec.universalTestGroupID;
    this.configSnapshot = exec.configSnapshot || null;
    this.parameters = this.configSnapshot?.parameters || [];
    this.selectedRunNo = exec.executionNo || 1;
    this.availableRuns = Array.from({ length: Math.max(1, exec.executionNo || 1) }, (_, i) => i + 1);

    // Lock if Completed, Verified, Approved
    this.isViewMode = ['Completed', 'Verified', 'Approved'].includes(exec.status);

    // Initialize Formula Builder with the first calculated parameter
    const firstCalc = this.parameters.find(p => p.isCalculated);
    if (firstCalc) {
      this.selectFormulaParameter(firstCalc);
    }

    // Build Execution Form
    this.rebuildExecutionForm(exec);

    // Load auxiliary intelligence datasets
    this.loadAuxiliaryData(exec.id);
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

              const resGroup = this.fb.group({
                id: [existingResult?.id || 0],
                parameterMasterID: [param.parameterMasterID],
                parameterCode: [param.code],
                rawValue: [{ value: val, disabled: this.isViewMode || param.isCalculated }],
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
      specimens: specimensFA
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
      resFA.push(this.fb.group({
        id: [0],
        parameterMasterID: [param.parameterMasterID],
        parameterCode: [param.code],
        rawValue: [{ value: '', disabled: this.isViewMode || param.isCalculated }],
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
  // Real-Time Reactive Formula Evaluation on Client UX
  // ----------------------------------------------------------------

  onReadingInput(obsGroup: FormGroup): void {
    this.evaluateObservationGroup(obsGroup);
  }

  evaluateObservationGroup(obsGroup: FormGroup): void {
    const resultsFA = obsGroup.get('results') as FormArray;
    const valMap: Record<string, number> = {};

    // 1. Collect numeric inputs
    resultsFA.controls.forEach(ctrl => {
      const code = ctrl.get('parameterCode')?.value;
      const raw = ctrl.get('rawValue')?.value;
      const isCalc = ctrl.get('isFormulaCalculated')?.value;
      if (!isCalc && raw !== null && raw !== undefined && raw !== '') {
        const num = parseFloat(raw);
        if (!isNaN(num)) {
          valMap[code] = num;
          ctrl.patchValue({ numericValue: num }, { emitEvent: false });
        }
      }
    });

    // 2. Evaluate calculated parameters in topological order
    this.parameters.filter(p => p.isCalculated && p.formula).forEach(param => {
      const ctrl = resultsFA.controls.find(c => c.get('parameterCode')?.value === param.code);
      if (ctrl && param.formula) {
        try {
          const evalResult = this.clientFormulaEval(param.formula, valMap);
          if (evalResult !== null && !isNaN(evalResult)) {
            const rounded = parseFloat(evalResult.toFixed(param.decimalPrecision || 2));
            valMap[param.code] = rounded;

            // Compliance limit check
            let status = 'Pass';
            if (param.specMin !== null && param.specMin !== undefined && rounded < param.specMin) status = 'Fail';
            if (param.specMax !== null && param.specMax !== undefined && rounded > param.specMax) status = 'Fail';

            ctrl.patchValue({
              rawValue: rounded.toString(),
              numericValue: rounded,
              calculatedValue: rounded.toString(),
              resultStatus: status
            }, { emitEvent: false });
          }
        } catch (e) {
          // Ignore syntax errors in mid-typing
        }
      }
    });
  }

  evaluateAllReadings(): void {
    this.specimens.controls.forEach(spec => {
      const obsFA = spec.get('observations') as FormArray;
      obsFA.controls.forEach(obs => {
        this.evaluateObservationGroup(obs as FormGroup);
      });
    });
  }

  clientFormulaEval(formula: string, vars: Record<string, number>): number | null {
    let expr = formula;
    for (const k of Object.keys(vars)) {
      const regex = new RegExp(`\\{${k}\\}`, 'gi');
      expr = expr.replace(regex, vars[k].toString());
    }

    // Replace functions if present
    expr = expr.replace(/ROUND\(([^,]+),([^)]+)\)/gi, 'Math.round($1 * Math.pow(10, $2)) / Math.pow(10, $2)');
    expr = expr.replace(/ABS\(([^)]+)\)/gi, 'Math.abs($1)');
    expr = expr.replace(/SQRT\(([^)]+)\)/gi, 'Math.sqrt($1)');
    expr = expr.replace(/POW\(([^,]+),([^)]+)\)/gi, 'Math.pow($1, $2)');

    // Ensure no unresolved {PARAM} tokens remain
    if (/\{[A-Za-z0-9_.]+\}/.test(expr)) return null;

    try {
      // Safe client evaluator for UX preview
      const result = Function(`'use strict'; return (${expr})`)();
      return typeof result === 'number' ? result : null;
    } catch {
      return null;
    }
  }

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

  save(): void {
    if (this.isViewMode || !this.testExecutionId) return;
    this.isProcessing = true;

    const payload: TestExecutionSaveDto = {
      specimens: this.executionForm.getRawValue().specimens
    };

    this.executionService.saveObservations(this.testExecutionId, payload).subscribe({
      next: (updated) => {
        this.isProcessing = false;
        this.applyExecutionData(updated);
        this.toastService.show('Observations draft saved successfully.', 'success');
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(err?.error?.message || 'Failed to save observations', 'error');
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
        this.toastService.show(err?.error?.message || 'Failed to complete execution', 'error');
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
        this.toastService.show(err?.error?.message || 'Action failed', 'error');
      }
    });
  }

  retest(): void {
    if (!this.universalTestGroupId) return;
    if (confirm('Are you sure you want to initiate a Retest / New Run? Previous results will be preserved.')) {
      this.startExecution(this.universalTestGroupId, true);
    }
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
        this.toastService.show(err?.error?.message || 'Failed to update configuration', 'error');
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
        this.toastService.show(err?.error?.message || 'Failed to upload attachment', 'error');
      }
    });
  }

  // ----------------------------------------------------------------
  // Utility & Navigation
  // ----------------------------------------------------------------

  setWorkspaceTab(tab: 'config' | 'entry' | 'results' | 'calculations' | 'review' | 'report' | 'audit'): void {
    this.activeWorkspaceTab = tab;
    if (tab === 'results' && this.testExecutionId) {
      this.executionService.getResultsOverview(this.testExecutionId).subscribe(ov => this.resultsOverview = ov);
    }
    if (tab === 'calculations' && this.testExecutionId) {
      this.executionService.getCalculationTrace(this.testExecutionId).subscribe(tr => this.calcTrace = tr);
    }
  }

  setConfigCategory(cat: string): void {
    this.activeConfigCategory = cat;
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  getReportTableRows(): any[] {
    if (this.resultsOverview?.parameters?.length) {
      return this.resultsOverview.parameters.map(p => ({
        parameterName: p.parameterName,
        unit: p.unit || '%',
        finalValue: p.finalValue ?? p.averageValue ?? '—',
        specRange: p.specRange || '—',
        status: p.status || 'Pass'
      }));
    }
    return (this.parameters || []).map(p => {
      const min = p.specMin !== null && p.specMin !== undefined ? p.specMin : null;
      const max = p.specMax !== null && p.specMax !== undefined ? p.specMax : null;
      let specRange = '—';
      if (min !== null && max !== null) specRange = `${min} - ${max}`;
      else if (min !== null) specRange = `>= ${min}`;
      else if (max !== null) specRange = `<= ${max}`;
      return {
        parameterName: p.name,
        unit: p.unit || '%',
        finalValue: '—',
        specRange: specRange,
        status: 'PENDING'
      };
    });
  }

  goBack(): void {
    this.router.navigate(['/testing/queue']);
  }
}
