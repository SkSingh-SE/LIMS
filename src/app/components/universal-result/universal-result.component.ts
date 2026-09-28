import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UniversalResultService } from '../../services/universal-result.service';
import { UniversalTestExecutionService } from '../../services/universal-test-execution.service';
import { ToastService } from '../../services/toast.service';
import { HasPermissionDirective } from '../../utility/directives/has-permission.directive';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { extractErrorMessage } from '../../utility/helper/error.helper';

@Component({
  selector: 'app-universal-result',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BreadcrumbComponent, HasPermissionDirective, SearchableDropdownComponent],
  templateUrl: './universal-result.component.html',
  styleUrl: './universal-result.component.css'
})
export class UniversalResultComponent implements OnInit {
  executionId: number = 0;
  result: any = null;
  notFound: boolean = false;
  remarks: string = '';
  finalizeRemarks: string = '';
  selectedExecutionItem: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private resultService: UniversalResultService,
    private executionService: UniversalTestExecutionService,
    private toast: ToastService
  ) { }

  getExecutionDropdown = (term: string, page: number, pageSize: number) => {
    return this.executionService.getExecutionDropdown(term, page, pageSize);
  };

  onExecutionSelected(item: any): void {
    this.selectedExecutionItem = item;
    const id = Number(item?.id ?? 0);
    if (id > 0) {
      this.executionId = id;
      this.load();
      this.router.navigate([], { relativeTo: this.route, queryParams: { executionId: id }, queryParamsHandling: 'merge' });
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      const id = Number(p['executionId'] || p['executionid'] || p['id'] || 0);
      const resId = Number(p['resultId'] || p['resultid'] || 0);
      if (id > 0) {
        this.executionId = id;
        this.load();
      } else if (resId > 0) {
        this.loadByResultId(resId);
      }
    });
    this.route.params.subscribe(p => {
      const id = Number((p as any)['id'] || 0);
      if (id > 0) {
        this.executionId = id;
        this.load();
      }
    });
  }

  load(): void {
    if (!this.executionId) return;
    this.resultService.getByExecution(this.executionId).subscribe({
      next: (res) => {
        this.result = res;
        this.notFound = false;
        if (!this.selectedExecutionItem || this.selectedExecutionItem.id !== this.executionId) {
          this.selectedExecutionItem = {
            id: this.executionId,
            name: `#${this.executionId} · ${res.testName || 'Test'} (Sample: ${res.sampleNo || '-'}, Run #${res.executionNo || 1})`
          };
        }
      },
      error: () => { this.result = null; this.notFound = true; }
    });
  }

  loadByResultId(resId: number): void {
    this.resultService.getById(resId).subscribe({
      next: (res) => {
        this.result = res;
        this.notFound = false;
        this.executionId = Number(res?.executionID ?? res?.universalTestExecutionID ?? 0);
        if (this.executionId && (!this.selectedExecutionItem || this.selectedExecutionItem.id !== this.executionId)) {
          this.selectedExecutionItem = {
            id: this.executionId,
            name: `#${this.executionId} · ${res.testName || 'Test'} (Sample: ${res.sampleNo || '-'}, Run #${res.executionNo || 1})`
          };
        }
      },
      error: (err) => {
        this.result = null;
        this.notFound = true;
        this.toast.show(extractErrorMessage(err, 'Result not found'), 'error');
      }
    });
  }

  onEvaluate(): void {
    if (!this.executionId) {
      this.toast.show('Please provide a valid execution ID', 'warning');
      return;
    }
    this.resultService.evaluate(this.executionId, this.remarks || undefined).subscribe({
      next: (res) => { this.result = res; this.notFound = false; this.toast.show('Result evaluated from frozen snapshot', 'success'); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Evaluation failed'), 'error')
    });
  }

  onFinalize(): void {
    if (!this.result) return;
    this.resultService.finalize(this.result.id ?? this.result.ID, this.result.concurrencyToken ?? this.result.ConcurrencyToken, this.finalizeRemarks || undefined).subscribe({
      next: (res) => { this.result = res; this.toast.show('Result finalized', 'success'); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Finalize failed'), 'error')
    });
  }

  openExecution(): void {
    this.router.navigate(['/universal-test-execution'], { queryParams: { executionId: this.executionId, from: 'result' } });
  }

  showCalculationTraces: boolean = false;
  showAuditTrail: boolean = false;

  openReview(): void {
    this.router.navigate(['/universal-review'], { queryParams: { executionId: this.executionId } });
  }

  copyHash(hash: string): void {
    if (!hash) return;
    navigator.clipboard.writeText(hash).then(() => {
      this.toast.show('Snapshot hash copied to clipboard', 'success');
    });
  }

  verdictClass(v: string): string {
    const s = (v || '').toUpperCase();
    if (s === 'PASS') return 'verdict-pass';
    if (s === 'FAIL') return 'verdict-fail';
    if (s === 'MARGINAL') return 'verdict-marginal';
    if (s === 'INFORMATIONAL' || s === 'NOT_CONFIGURED') return 'verdict-info';
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

  get params(): any[] { return this.result?.parameters ?? this.result?.Parameters ?? []; }
  get audits(): any[] { return this.result?.audits ?? this.result?.Audits ?? []; }

  get conformingCount(): number {
    return this.params.filter(p => (p.verdict || '').toUpperCase() === 'PASS').length;
  }

  get nonConformingCount(): number {
    return this.params.filter(p => (p.verdict || '').toUpperCase() === 'FAIL').length;
  }

  get marginalCount(): number {
    return this.params.filter(p => (p.verdict || '').toUpperCase() === 'MARGINAL').length;
  }

  get informationalCount(): number {
    return this.params.filter(p => {
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
    return p.requirementStatus === 'SPECIFICATION_NOT_APPLICABLE' ? 'Standardless / N/A' : 'Not Configured';
  }

  getMarginClass(p: any): string {
    if (!p || p.complianceMargin == null) return '';
    const v = (p.verdict || '').toUpperCase();
    if (v === 'PASS') return 'badge-margin-safe';
    if (v === 'FAIL') return 'badge-margin-fail';
    if (v === 'MARGINAL') return 'badge-margin-marginal';
    return 'badge-margin-neutral';
  }
}
