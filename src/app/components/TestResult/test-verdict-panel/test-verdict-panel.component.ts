import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface VerdictColumnConfig {
  paramLabel: string;
  unitLabel: string;
  requirementLabel: string;
  avgLabel: string;
  showUnit: boolean;
  showRequirement: boolean;
  showAverage: boolean;
  showUncertainty: boolean;
  showDecisionDetail: boolean;
}

export interface SpecimenCellVerdict {
  label: string;
  displayValue: string;
  numericValue: number | null;
  verdict: 'PASS' | 'FAIL' | 'BORDERLINE' | 'INFO' | 'PENDING';
}

export interface ParameterEvaluationRow {
  index: number;
  /** Specimen label of the row (S1, or comma summary for multi-specimen) */
  specimen: string;
  parameterName: string;
  unit: string;
  specifiedMin: number | null;
  specifiedMax: number | null;
  acceptanceCriteria: string;
  observedValue: any;
  numericValue: number | null;
  specimenCells: SpecimenCellVerdict[];
  averageValue: string;
  expandedUncertainty: number;
  coverageFactor: number;
  isWithinSpec: boolean | null;
  verdict: 'PASS' | 'FAIL' | 'BORDERLINE' | 'INFO' | 'PENDING';
  verdictLabel: string;
  scopeStatus: 'WithinScope' | 'OutsideScope' | 'NotAccredited';
  testMethodUsed: string;
  guardBandDetail: string;
}

@Component({
  selector: 'app-test-verdict-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './test-verdict-panel.component.html',
  styleUrls: ['./test-verdict-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestVerdictPanelComponent implements OnChanges {
  @Input() plan: any;
  @Input() test: any;
  @Input() parametersFormArray!: FormArray;
  @Input() nablScopeData: any[] = [];
  @Input() uncertaintyData: any[] = [];
  @Input() sample: any;
  @Input() inward: any;
  @Input() isViewMode: boolean = false;
  @Input() specimenLabels: string[] = [];
  @Input() activeParameterKeys: string[] | null = null;
  @Input() decisionRuleText: string = '';
  @Input() useGuardBand: boolean | null = null;
  @Input() layoutColumnConfig: VerdictColumnConfig | null = null;

  /** Runtime per-column overrides via the Conformity Assessment Adjust menu. */
  showColumnMenu = false;
  private colOverrides: Record<string, boolean> = {};

  get colParamLabel(): string {
    return this.layoutColumnConfig?.paramLabel || 'Parameter Name';
  }

  get colUnitLabel(): string {
    return this.layoutColumnConfig?.unitLabel || 'Unit';
  }

  get colRequirementLabel(): string {
    return this.layoutColumnConfig?.requirementLabel || 'Requirement';
  }

  get colAvgLabel(): string {
    return this.layoutColumnConfig?.avgLabel || 'Average';
  }

  isVerdictColShown(key: 'unit' | 'avg' | 'requirement' | 'uncertainty' | 'decisionDetail'): boolean {
    if (this.colOverrides[key] !== undefined) return this.colOverrides[key];
    const cfg = this.layoutColumnConfig;
    switch (key) {
      case 'unit': return cfg ? cfg.showUnit : true;
      case 'avg': return this.multiSpecimen && (cfg ? cfg.showAverage : false);
      case 'requirement': return cfg ? cfg.showRequirement : true;
      case 'uncertainty': return cfg ? cfg.showUncertainty : false;
      case 'decisionDetail': return cfg ? cfg.showDecisionDetail : false;
    }
  }

  toggleVerdictCol(key: 'unit' | 'avg' | 'requirement' | 'uncertainty' | 'decisionDetail'): void {
    this.colOverrides = { ...this.colOverrides, [key]: !this.isVerdictColShown(key) };
  }

  evaluationRows: ParameterEvaluationRow[] = [];
  displaySpecimenLabels: string[] = [];
  overallVerdict: 'PASS' | 'FAIL' | 'BORDERLINE' | 'PENDING' = 'PENDING';
  overallVerdictLabel: string = 'Results pending';
  overallVerdictSubtext: string = 'Test parameters await observation entry and calculation.';
  nablScopeStatus: 'ACCREDITED' | 'PARTIAL' | 'OUTSIDE_SCOPE' | 'NOT_CONFIGURED' = 'NOT_CONFIGURED';
  decisionRuleName: string = 'Simple Acceptance (without measurement uncertainty)';

  /** More than one specimen: the table shows side-by-side specimen columns instead of repeating rows */
  multiSpecimen = false;
  totalParameters: number = 0;
  passedCount: number = 0;
  failedCount: number = 0;
  borderlineCount: number = 0;
  infoCount: number = 0;
  pendingCount: number = 0;
  inScopeCount: number = 0;
  outOfScopeCount: number = 0;

  ngOnChanges(changes: SimpleChanges): void {
    this.evaluateResults();
  }

  private resolveUseGuardBand(): boolean {
    if (this.useGuardBand !== null && this.useGuardBand !== undefined) {
      return !!this.useGuardBand;
    }
    const conformity = String(this.inward?.statementOfConformity ?? '').trim().toLowerCase();
    const rule = String(this.inward?.decisionRule ?? '').trim().toLowerCase();
    return conformity === 'applicable' && rule.startsWith('with ') && !rule.startsWith('without');
  }

  private resolveDecisionRuleName(): string {
    if (this.decisionRuleText && this.decisionRuleText.trim()) {
      return this.decisionRuleText.trim();
    }
    const conformity = String(this.inward?.statementOfConformity ?? '').trim();
    const rule = String(this.inward?.decisionRule ?? '').trim();
    if (conformity && conformity.toLowerCase() !== 'applicable') {
      return `Sample inward: statement of conformity ${conformity.toLowerCase()}`;
    }
    if (rule) {
      return rule;
    }
    return this.resolveUseGuardBand()
      ? 'With measurement uncertainty (ILAC-G8 Guard Band)'
      : 'Simple Acceptance (without measurement uncertainty)';
  }

  private paramKeyOf(pId: any, pName: string, fallbackIdx: number): string {
    if (pId !== null && pId !== undefined && pId !== '' && Number(pId) !== 0) {
      return `id:${pId}`;
    }
    const norm = (pName || '').trim().toLowerCase();
    return norm ? `name:${norm}` : `idx:${fallbackIdx}`;
  }

  evaluateResults(): void {
    this.decisionRuleName = this.resolveDecisionRuleName();

    if (!this.parametersFormArray || this.parametersFormArray.length === 0) {
      this.evaluationRows = [];
      this.displaySpecimenLabels = [];
      this.multiSpecimen = false;
      this.resetMetrics();
      return;
    }

    const withMU = this.resolveUseGuardBand();
    const baseMethod = this.getCleanTestMethod();

    // Determine specimen indexes present in the FormArray and active specimen labels
    const maxSpmFromRows = this.parametersFormArray.controls.reduce((max, c) => {
      const idx = Number(c?.get('specimenIndex')?.value) || 0;
      return Math.max(max, idx);
    }, 0);
    const spmCount = Math.max(1, this.specimenLabels?.length || 0, maxSpmFromRows + 1);
    const labels: string[] = [];
    for (let s = 0; s < spmCount; s++) {
      const lbl = (this.specimenLabels && this.specimenLabels[s] && this.specimenLabels[s].trim())
        ? this.specimenLabels[s].trim()
        : `S${s + 1}`;
      labels.push(lbl);
    }
    this.displaySpecimenLabels = labels;
    this.multiSpecimen = labels.length > 1;

    // Group form controls by unique parameter key (one row per unique parameter)
    const activeKeyOrder = Array.isArray(this.activeParameterKeys) && this.activeParameterKeys.length > 0
      ? this.activeParameterKeys
      : null;
    const activeKeySet = activeKeyOrder ? new Set(activeKeyOrder) : null;

    const grouped = new Map<string, { firstCtrl: any; bySpecimen: Map<number, any> }>();

    for (let i = 0; i < this.parametersFormArray.length; i++) {
      const ctrl = this.parametersFormArray.at(i);
      if (!ctrl) continue;

      const pName = (ctrl.get('parameterName')?.value || '').trim();
      const pId = ctrl.get('parameterID')?.value;
      const key = this.paramKeyOf(pId, pName, i);
      if (activeKeySet && !activeKeySet.has(key)) continue;

      const spmIdx = Math.max(0, Number(ctrl.get('specimenIndex')?.value) || 0);
      if (spmIdx >= spmCount) continue;

      let entry = grouped.get(key);
      if (!entry) {
        entry = { firstCtrl: ctrl, bySpecimen: new Map<number, any>() };
        grouped.set(key, entry);
      }
      if (!entry.bySpecimen.has(spmIdx)) {
        entry.bySpecimen.set(spmIdx, ctrl);
      }
    }

    // Order groups: follow activeParameterKeys order when Template Configured, else insertion order
    const orderedKeys: string[] = [];
    if (activeKeyOrder) {
      activeKeyOrder.forEach(k => {
        if (grouped.has(k) && !orderedKeys.includes(k)) orderedKeys.push(k);
      });
    }
    grouped.forEach((_, k) => {
      if (!orderedKeys.includes(k)) orderedKeys.push(k);
    });

    const rows: ParameterEvaluationRow[] = [];
    let pass = 0;
    let fail = 0;
    let borderline = 0;
    let info = 0;
    let pending = 0;
    let enteredParams = 0;
    let inScope = 0;
    let outScope = 0;

    orderedKeys.forEach((key, rowIdx) => {
      const entry = grouped.get(key)!;
      const ctrl = entry.firstCtrl;

      const pName = (ctrl.get('parameterName')?.value || '').trim();
      const pId = ctrl.get('parameterID')?.value;
      const unit = ctrl.get('unit')?.value || '—';
      const minRaw = ctrl.get('specMinValue')?.value ?? ctrl.get('minValue')?.value;
      const maxRaw = ctrl.get('specMaxValue')?.value ?? ctrl.get('maxValue')?.value;
      const criteria = (ctrl.get('acceptanceCriteria')?.value || '').trim();
      const pType = ctrl.get('parameterType')?.value || 'Quantitative';
      const inputType = ctrl.get('inputType')?.value || 'Decimal';
      const methodUsed = ctrl.get('testMethodUsed')?.value || baseMethod;

      const specMin = minRaw !== null && minRaw !== undefined && minRaw !== '' ? Number(minRaw) : null;
      const specMax = maxRaw !== null && maxRaw !== undefined && maxRaw !== '' ? Number(maxRaw) : null;

      // Find Uncertainty
      const uncItem = this.uncertaintyData?.find((u: any) =>
        (u.parameterId && pId && Number(u.parameterId) === Number(pId)) ||
        (u.parameterID && pId && Number(u.parameterID) === Number(pId)) ||
        (u.parameterName && u.parameterName.trim().toLowerCase() === pName.toLowerCase())
      );
      const expandedU = uncItem?.expandedUncertainty != null ? Number(uncItem.expandedUncertainty) : 0;
      const kFactor = uncItem?.coverageFactor != null ? Number(uncItem.coverageFactor) : 2;

      // Find NABL Scope (worst-case across specimens; only parameters configured in Lab Scope Master get WithinScope / OutsideScope)
      const scopeMatches = (this.nablScopeData || []).filter((s: any) =>
        (s.parameterId && pId && Number(s.parameterId) === Number(pId)) ||
        (s.parameterID && pId && Number(s.parameterID) === Number(pId)) ||
        (s.parameterName && s.parameterName.trim().toLowerCase() === pName.toLowerCase())
      );
      const scopeItem = scopeMatches.find((s: any) => s.scopeStatus === 'OutsideScope')
        || scopeMatches.find((s: any) => s.scopeStatus === 'WithinScope')
        || scopeMatches[0];
      const scopeStatus: 'WithinScope' | 'OutsideScope' | 'NotAccredited' =
        scopeItem?.scopeStatus === 'WithinScope'
          ? 'WithinScope'
          : (scopeItem?.scopeStatus === 'OutsideScope' ? 'OutsideScope' : 'NotAccredited');

      if (scopeStatus === 'WithinScope') {
        inScope++;
      } else if (scopeStatus === 'OutsideScope') {
        outScope++;
      }

      // Evaluate each specimen cell
      const specimenCells: SpecimenCellVerdict[] = [];
      const numericVals: number[] = [];
      const failDetails: string[] = [];
      const borderlineDetails: string[] = [];

      for (let s = 0; s < spmCount; s++) {
        const sCtrl = entry.bySpecimen.get(s);
        const sLabel = labels[s];
        const rawVal = sCtrl?.get('value')?.value;
        const rawRemarks = sCtrl?.get('remarks')?.value;
        const effectiveRaw = (rawVal !== null && rawVal !== undefined && rawVal !== '')
          ? rawVal
          : (inputType === 'Text' && String(rawRemarks ?? '').trim() !== '' ? String(rawRemarks).trim() : null);

        let cellV: 'PASS' | 'FAIL' | 'BORDERLINE' | 'INFO' | 'PENDING' = 'PENDING';
        let cellNum: number | null = null;
        let displayValue = '';

        if (effectiveRaw === null || effectiveRaw === undefined || effectiveRaw === '') {
          cellV = 'PENDING';
          displayValue = '';
        } else if (pType === 'Qualitative' || inputType === 'Text' || inputType === 'Boolean') {
          displayValue = String(effectiveRaw).trim();
          const strVal = displayValue.toLowerCase();
          if (strVal === 'pass' || strVal === 'satisfactory' || strVal === 'compliant' || strVal === 'conforms' || strVal === 'ok') {
            cellV = 'PASS';
          } else if (strVal === 'fail' || strVal === 'not satisfactory' || strVal === 'non-compliant' || strVal === 'does not conform') {
            cellV = 'FAIL';
            failDetails.push(`${sLabel}: ${displayValue}`);
          } else {
            cellV = 'INFO';
          }
        } else {
          cellNum = Number(effectiveRaw);
          displayValue = String(effectiveRaw);
          if (isNaN(cellNum)) {
            cellV = 'PENDING';
          } else {
            numericVals.push(cellNum);
            if (specMin === null && specMax === null && !criteria) {
              cellV = 'INFO';
            } else {
              const failsMin = specMin !== null && cellNum < specMin;
              const failsMax = specMax !== null && cellNum > specMax;
              if (failsMin || failsMax) {
                cellV = 'FAIL';
                if (failsMin && failsMax) {
                  failDetails.push(`${sLabel} out of range (${specMin} – ${specMax})`);
                } else if (failsMin) {
                  failDetails.push(`${sLabel} below min (${cellNum} < ${specMin})`);
                } else {
                  failDetails.push(`${sLabel} exceeds max (${cellNum} > ${specMax})`);
                }
              } else {
                const isNearMin = withMU && expandedU > 0 && specMin !== null && Math.abs(cellNum - specMin) <= expandedU;
                const isNearMax = withMU && expandedU > 0 && specMax !== null && Math.abs(cellNum - specMax) <= expandedU;
                if (isNearMin || isNearMax) {
                  cellV = 'BORDERLINE';
                  borderlineDetails.push(`${sLabel} within ±${expandedU}`);
                } else {
                  cellV = 'PASS';
                }
              }
            }
          }
        }

        specimenCells.push({
          label: sLabel,
          displayValue,
          numericValue: cellNum,
          verdict: cellV
        });
      }

      // Aggregate row-level worst-case verdict across specimens
      let v: 'PASS' | 'FAIL' | 'BORDERLINE' | 'INFO' | 'PENDING' = 'PENDING';
      let vLabel = 'Pending';
      let guardBandDetail = 'No value recorded';
      let isWithinSpec: boolean | null = null;

      const hasFail = specimenCells.some(c => c.verdict === 'FAIL');
      const hasBorderline = specimenCells.some(c => c.verdict === 'BORDERLINE');
      const hasPass = specimenCells.some(c => c.verdict === 'PASS');
      const hasInfo = specimenCells.some(c => c.verdict === 'INFO');
      const hasPending = specimenCells.some(c => c.verdict === 'PENDING');
      if (specimenCells.some(c => c.displayValue !== '')) {
        enteredParams++;
      }

      if (hasFail) {
        v = 'FAIL';
        vLabel = 'Non-Conforming';
        isWithinSpec = false;
        guardBandDetail = failDetails.join('; ') || 'Out of specification limits';
        fail++;
      } else if (hasBorderline) {
        v = 'BORDERLINE';
        vLabel = 'Guard-Band (Borderline)';
        isWithinSpec = true;
        guardBandDetail = `Inside tolerance but within uncertainty boundary (${borderlineDetails.join(', ')})`;
        borderline++;
      } else if (hasPass && !hasPending) {
        v = 'PASS';
        vLabel = 'Conforms';
        isWithinSpec = true;
        guardBandDetail = withMU && expandedU > 0
          ? `Conforms with 95% confidence interval (U = ±${expandedU}, k=${kFactor})`
          : 'Conforms to specified tolerance limits';
        pass++;
      } else if (hasPass && hasPending) {
        v = 'PENDING';
        vLabel = 'Partial';
        isWithinSpec = null;
        guardBandDetail = 'Some specimen values still pending entry';
        pending++;
      } else if (hasInfo && !hasPending) {
        v = 'INFO';
        vLabel = 'Reported';
        isWithinSpec = null;
        guardBandDetail = 'For information only (no specification tolerance specified)';
        info++;
      } else if (hasInfo && hasPending) {
        v = 'PENDING';
        vLabel = 'Partial';
        isWithinSpec = null;
        guardBandDetail = 'Partially recorded (no specification tolerance specified)';
        pending++;
      } else {
        v = 'PENDING';
        vLabel = 'Pending';
        isWithinSpec = null;
        guardBandDetail = 'No value recorded';
        pending++;
      }

      const avgNum = numericVals.length > 0
        ? numericVals.reduce((acc, cur) => acc + cur, 0) / numericVals.length
        : null;
      const precision = Number(ctrl.get('decimalPrecision')?.value ?? 2);
      const averageValue = avgNum !== null ? avgNum.toFixed(isNaN(precision) ? 2 : precision) : '—';
      const firstCell = specimenCells[0];

      rows.push({
        index: rowIdx + 1,
        specimen: this.multiSpecimen ? labels.join(', ') : (labels[0] || 'S1'),
        parameterName: pName || `Parameter ${rowIdx + 1}`,
        unit,
        specifiedMin: specMin,
        specifiedMax: specMax,
        acceptanceCriteria: criteria,
        observedValue: firstCell?.displayValue || null,
        numericValue: firstCell?.numericValue ?? null,
        specimenCells,
        averageValue,
        expandedUncertainty: expandedU,
        coverageFactor: kFactor,
        isWithinSpec,
        verdict: v,
        verdictLabel: vLabel,
        scopeStatus,
        testMethodUsed: methodUsed,
        guardBandDetail
      });
    });

    this.evaluationRows = rows;
    const parameterCount = rows.length;
    const scopeText = `${parameterCount} parameter(s)${spmCount > 1 ? ` across ${spmCount} specimens` : ''}`;
    this.totalParameters = parameterCount;
    this.passedCount = pass;
    this.failedCount = fail;
    this.borderlineCount = borderline;
    this.infoCount = info;
    this.pendingCount = pending;
    this.inScopeCount = inScope;
    this.outOfScopeCount = outScope;

    // Determine Overall Verdict
    if (fail > 0) {
      this.overallVerdict = 'FAIL';
      this.overallVerdictLabel = 'Does not conform to the specification';
      this.overallVerdictSubtext = `${fail} parameter(s) are outside the specification limits. The material does not comply.`;
    } else if (borderline > 0 && pending === 0) {
      this.overallVerdict = 'BORDERLINE';
      this.overallVerdictLabel = 'Inconclusive (borderline)';
      this.overallVerdictSubtext = `${borderline} parameter(s) fall within the measurement uncertainty guard band.`;
    } else if (pass > 0 && pending === 0) {
      this.overallVerdict = 'PASS';
      this.overallVerdictLabel = 'Conforms to the specification';
      this.overallVerdictSubtext = `All ${scopeText} satisfy the requirements of ${this.getSpecificationTitle()}.`;
    } else if ((pass > 0 || info > 0 || borderline > 0) && pending > 0) {
      this.overallVerdict = 'PENDING';
      this.overallVerdictLabel = 'In progress (some results pending)';
      const doneParts: string[] = [];
      if (pass > 0) doneParts.push(`${pass} passed`);
      if (info > 0) doneParts.push(`${info} reported`);
      if (borderline > 0) doneParts.push(`${borderline} borderline`);
      this.overallVerdictSubtext = `${doneParts.join(', ')}, ${pending} pending entry. Complete all entries to finalize verdict.`;
    } else if (info > 0 && pending === 0) {
      this.overallVerdict = 'PENDING';
      this.overallVerdictLabel = 'Reported (no specification limits)';
      this.overallVerdictSubtext = `${info} parameter(s) recorded for information only; no specification limits apply.`;
    } else if (enteredParams > 0) {
      this.overallVerdict = 'PENDING';
      this.overallVerdictLabel = 'In progress (partial specimen entries)';
      this.overallVerdictSubtext = `${enteredParams} of ${parameterCount} parameter(s) have partial entries; complete remaining specimen values to finalize verdict.`;
    } else {
      this.overallVerdict = 'PENDING';
      this.overallVerdictLabel = 'Results pending';
      this.overallVerdictSubtext = 'No result has been entered yet.';
    }

    // Determine NABL Scope Status (only parameters configured in Lab Scope Master count toward Accredited / Out of Scope)
    if (outScope === 0 && inScope > 0) {
      this.nablScopeStatus = 'ACCREDITED';
    } else if (inScope > 0 && outScope > 0) {
      this.nablScopeStatus = 'PARTIAL';
    } else if (outScope > 0) {
      this.nablScopeStatus = 'OUTSIDE_SCOPE';
    } else {
      this.nablScopeStatus = 'NOT_CONFIGURED';
    }
  }

  private resetMetrics(): void {
    this.totalParameters = 0;
    this.passedCount = 0;
    this.failedCount = 0;
    this.borderlineCount = 0;
    this.infoCount = 0;
    this.pendingCount = 0;
    this.inScopeCount = 0;
    this.outOfScopeCount = 0;
    this.overallVerdict = 'PENDING';
    this.overallVerdictLabel = 'Results pending';
    this.overallVerdictSubtext = 'No parameter controls available for evaluation.';
  }

  getSpecificationTitle(): string {
    const spec = this.plan?.specification || this.sample?.specification || 'Specified Standard';
    const grade = this.plan?.grade || this.sample?.grade || '';
    return grade ? `${spec} Grade ${grade}` : spec;
  }

  getCleanTestMethod(): string {
    const m = this.plan?.methodName || this.test?.name || this.plan?.type || 'Standard Method';
    return m.replace(/^[\s\d#]+[-–]\s*/, '').trim();
  }

  getConformityStatement(): string {
    const spec = this.getSpecificationTitle();
    const method = this.getCleanTestMethod();

    if (this.overallVerdict === 'PASS') {
      return `Statement of Conformity: The test specimen conforms to the chemical / mechanical requirements of specification "${spec}" for all tested parameters using test method "${method}". Decision rule: ${this.decisionRuleName}.`;
    } else if (this.overallVerdict === 'FAIL') {
      const failedNames = this.evaluationRows.filter(r => r.verdict === 'FAIL').map(r => r.parameterName).join(', ');
      return `Statement of Non-Conformity: The test specimen DOES NOT conform to the specification requirements of "${spec}". Parameter(s) [${failedNames}] observed out of specification tolerance.`;
    } else if (this.overallVerdict === 'BORDERLINE') {
      return `Statement of Borderline / Inconclusive Result: The measured values fall within the expanded measurement uncertainty guard-band boundary of specification "${spec}". Conformity cannot be conclusively affirmed without risk sharing agreement.`;
    }
    return `Evaluation pending: Test observation entry in progress for specification "${spec}".`;
  }
}
