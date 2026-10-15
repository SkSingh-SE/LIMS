import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface ParameterEvaluationRow {
  index: number;
  parameterName: string;
  unit: string;
  specifiedMin: number | null;
  specifiedMax: number | null;
  acceptanceCriteria: string;
  observedValue: any;
  numericValue: number | null;
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
  @Input() isViewMode: boolean = false;

  evaluationRows: ParameterEvaluationRow[] = [];
  overallVerdict: 'PASS' | 'FAIL' | 'BORDERLINE' | 'PENDING' = 'PENDING';
  overallVerdictLabel: string = 'PENDING DATA ENTRY';
  overallVerdictSubtext: string = 'Test parameters await observation entry and calculation.';
  nablScopeStatus: 'ACCREDITED' | 'PARTIAL' | 'OUTSIDE_SCOPE' = 'ACCREDITED';
  decisionRuleName: string = 'ILAC-G8:09/2019 Binary Statement with Guard Band (Simple Acceptance)';

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

  evaluateResults(): void {
    if (!this.parametersFormArray || this.parametersFormArray.length === 0) {
      this.evaluationRows = [];
      this.resetMetrics();
      return;
    }

    const rows: ParameterEvaluationRow[] = [];
    let pass = 0;
    let fail = 0;
    let borderline = 0;
    let info = 0;
    let pending = 0;
    let inScope = 0;
    let outScope = 0;

    const baseMethod = this.getCleanTestMethod();

    for (let i = 0; i < this.parametersFormArray.length; i++) {
      const ctrl = this.parametersFormArray.at(i);
      if (!ctrl) continue;

      const pName = (ctrl.get('parameterName')?.value || '').trim();
      const pId = ctrl.get('parameterID')?.value;
      const rawVal = ctrl.get('value')?.value;
      const unit = ctrl.get('unit')?.value || '—';
      const minRaw = ctrl.get('specMinValue')?.value ?? ctrl.get('minValue')?.value;
      const maxRaw = ctrl.get('specMaxValue')?.value ?? ctrl.get('maxValue')?.value;
      const criteria = (ctrl.get('acceptanceCriteria')?.value || '').trim();
      const pType = ctrl.get('parameterType')?.value || 'Quantitative';
      const methodUsed = ctrl.get('testMethodUsed')?.value || baseMethod;

      const specMin = minRaw !== null && minRaw !== undefined && minRaw !== '' ? Number(minRaw) : null;
      const specMax = maxRaw !== null && maxRaw !== undefined && maxRaw !== '' ? Number(maxRaw) : null;

      // Find Uncertainty
      const uncItem = this.uncertaintyData?.find((u: any) =>
        (u.parameterId && pId && Number(u.parameterId) === Number(pId)) ||
        (u.parameterName && u.parameterName.trim().toLowerCase() === pName.toLowerCase())
      );
      const expandedU = uncItem?.expandedUncertainty != null ? Number(uncItem.expandedUncertainty) : 0;
      const kFactor = uncItem?.coverageFactor != null ? Number(uncItem.coverageFactor) : 2;

      // Find NABL Scope
      const scopeItem = this.nablScopeData?.find((s: any) =>
        (s.parameterId && pId && Number(s.parameterId) === Number(pId)) ||
        (s.parameterName && s.parameterName.trim().toLowerCase() === pName.toLowerCase())
      );
      const scopeStatus: 'WithinScope' | 'OutsideScope' | 'NotAccredited' =
        scopeItem?.scopeStatus || (this.test?.isNabl === false ? 'OutsideScope' : 'WithinScope');

      if (scopeStatus === 'WithinScope') {
        inScope++;
      } else {
        outScope++;
      }

      // Evaluation
      let v: 'PASS' | 'FAIL' | 'BORDERLINE' | 'INFO' | 'PENDING' = 'PENDING';
      let vLabel = 'Pending';
      let guardBandDetail = 'Awaiting entry';
      let numVal: number | null = null;
      let isWithinSpec: boolean | null = null;

      if (rawVal === null || rawVal === undefined || rawVal === '') {
        v = 'PENDING';
        vLabel = 'Pending';
        guardBandDetail = 'No value recorded';
        pending++;
      } else if (pType === 'Qualitative') {
        const strVal = String(rawVal).trim().toLowerCase();
        if (strVal === 'pass' || strVal === 'satisfactory' || strVal === 'compliant' || strVal === 'conforms' || strVal === 'ok') {
          v = 'PASS';
          vLabel = 'Conforms';
          isWithinSpec = true;
          guardBandDetail = 'Satisfactory visual/qualitative observation';
          pass++;
        } else if (strVal === 'fail' || strVal === 'not satisfactory' || strVal === 'non-compliant' || strVal === 'does not conform') {
          v = 'FAIL';
          vLabel = 'Non-Conforming';
          isWithinSpec = false;
          guardBandDetail = 'Defect or non-conformance observed';
          fail++;
        } else {
          v = 'INFO';
          vLabel = 'Reported';
          isWithinSpec = true;
          guardBandDetail = 'Descriptive observation';
          info++;
        }
      } else {
        // Quantitative
        numVal = Number(rawVal);
        if (isNaN(numVal)) {
          v = 'PENDING';
          vLabel = 'Invalid';
          guardBandDetail = 'Non-numeric input';
          pending++;
        } else if (specMin === null && specMax === null && !criteria) {
          v = 'INFO';
          vLabel = 'Reported';
          isWithinSpec = true;
          guardBandDetail = 'For information only (no specification tolerance specified)';
          info++;
        } else {
          // Has limits
          const failsMin = specMin !== null && numVal < specMin;
          const failsMax = specMax !== null && numVal > specMax;

          if (failsMin || failsMax) {
            v = 'FAIL';
            vLabel = 'Non-Conforming';
            isWithinSpec = false;
            if (failsMin && failsMax) {
              guardBandDetail = `Out of range (${specMin} – ${specMax})`;
            } else if (failsMin) {
              guardBandDetail = `Below specified minimum (${numVal} < ${specMin})`;
            } else {
              guardBandDetail = `Exceeds specified maximum (${numVal} > ${specMax})`;
            }
            fail++;
          } else {
            // Value is inside limits. Check uncertainty guard band if U is defined
            let isNearMin = false;
            let isNearMax = false;
            if (expandedU > 0) {
              if (specMin !== null && Math.abs(numVal - specMin) <= expandedU) {
                isNearMin = true;
              }
              if (specMax !== null && Math.abs(numVal - specMax) <= expandedU) {
                isNearMax = true;
              }
            }

            if (isNearMin || isNearMax) {
              v = 'BORDERLINE';
              vLabel = 'Guard-Band (Borderline)';
              isWithinSpec = true;
              guardBandDetail = `Inside tolerance but within uncertainty boundary (U = ±${expandedU})`;
              borderline++;
            } else {
              v = 'PASS';
              vLabel = 'Conforms';
              isWithinSpec = true;
              guardBandDetail = expandedU > 0
                ? `Conforms with 95% confidence interval (U = ±${expandedU}, k=${kFactor})`
                : 'Conforms to specified tolerance limits';
              pass++;
            }
          }
        }
      }

      rows.push({
        index: i + 1,
        parameterName: pName || `Parameter ${i + 1}`,
        unit,
        specifiedMin: specMin,
        specifiedMax: specMax,
        acceptanceCriteria: criteria,
        observedValue: rawVal,
        numericValue: numVal,
        expandedUncertainty: expandedU,
        coverageFactor: kFactor,
        isWithinSpec,
        verdict: v,
        verdictLabel: vLabel,
        scopeStatus,
        testMethodUsed: methodUsed,
        guardBandDetail
      });
    }

    this.evaluationRows = rows;
    this.totalParameters = rows.length;
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
      this.overallVerdictLabel = 'NON-CONFORMING TO SPECIFICATION';
      this.overallVerdictSubtext = `${fail} parameter(s) failed specification limits. Material does not comply.`;
    } else if (borderline > 0 && pending === 0) {
      this.overallVerdict = 'BORDERLINE';
      this.overallVerdictLabel = 'INCONCLUSIVE / BORDERLINE';
      this.overallVerdictSubtext = `${borderline} parameter(s) fall within the measurement uncertainty guard-band zone.`;
    } else if (pass > 0 && pending === 0) {
      this.overallVerdict = 'PASS';
      this.overallVerdictLabel = 'CONFORMS TO SPECIFICATION (PASS)';
      this.overallVerdictSubtext = `All ${pass} evaluated parameter(s) satisfy the requirements of ${this.getSpecificationTitle()}.`;
    } else if (pass > 0 && pending > 0) {
      this.overallVerdict = 'PENDING';
      this.overallVerdictLabel = 'IN PROGRESS (PARTIAL ENTRY)';
      this.overallVerdictSubtext = `${pass} passed, ${pending} pending entry. Complete all entries to finalize verdict.`;
    } else {
      this.overallVerdict = 'PENDING';
      this.overallVerdictLabel = 'PENDING DATA ENTRY';
      this.overallVerdictSubtext = 'Awaiting laboratory technician observation entries.';
    }

    // Determine NABL Scope Status
    if (outScope === 0 && inScope > 0) {
      this.nablScopeStatus = 'ACCREDITED';
    } else if (inScope > 0 && outScope > 0) {
      this.nablScopeStatus = 'PARTIAL';
    } else {
      this.nablScopeStatus = 'OUTSIDE_SCOPE';
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
    this.overallVerdictLabel = 'PENDING DATA ENTRY';
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
      return `Statement of Conformity: The test specimen conforms to the chemical / mechanical requirements of specification "${spec}" for all tested parameters using test method "${method}". Decision rule: Simple Acceptance with ILAC G8 guard band evaluation taking expanded measurement uncertainty (k=2, 95% confidence level) into account.`;
    } else if (this.overallVerdict === 'FAIL') {
      const failedNames = this.evaluationRows.filter(r => r.verdict === 'FAIL').map(r => r.parameterName).join(', ');
      return `Statement of Non-Conformity: The test specimen DOES NOT conform to the specification requirements of "${spec}". Parameter(s) [${failedNames}] observed out of specification tolerance.`;
    } else if (this.overallVerdict === 'BORDERLINE') {
      return `Statement of Borderline / Inconclusive Result: The measured values fall within the expanded measurement uncertainty guard-band boundary of specification "${spec}". Conformity cannot be conclusively affirmed without risk sharing agreement.`;
    }
    return `Evaluation pending: Test observation entry in progress for specification "${spec}".`;
  }
}
