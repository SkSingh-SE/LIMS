import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UniversalResultService } from '../../services/universal-result.service';
import { UniversalReviewService } from '../../services/universal-review.service';
import { UniversalTestExecutionService } from '../../services/universal-test-execution.service';
import { EmployeeService } from '../../services/employee.service';
import { ToastService } from '../../services/toast.service';
import { HasPermissionDirective } from '../../utility/directives/has-permission.directive';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { extractErrorMessage } from '../../utility/helper/error.helper';

@Component({
  selector: 'app-universal-review',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, BreadcrumbComponent, HasPermissionDirective, FormFieldErrorComponent, SearchableDropdownComponent],
  templateUrl: './universal-review.component.html',
  styleUrl: './universal-review.component.css'
})
export class UniversalReviewComponent implements OnInit {
  executionId: number = 0;
  result: any = null;
  submitted: boolean = false;
  findingForm!: FormGroup;
  reviewerId: string = '';
  actionRemarks: string = '';
  selectedExecutionItem: any = null;
  selectedReviewerItem: any = null;
  // H1: standard resolution modal state (replaces window.prompt; same resolveFinding API)
  isResolveModalOpen: boolean = false;
  resolvingFinding: any = null;
  resolveSubmitted: boolean = false;
  resolveForm!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private resultService: UniversalResultService,
    private reviewService: UniversalReviewService,
    private executionService: UniversalTestExecutionService,
    private employeeService: EmployeeService,
    private toast: ToastService
  ) {
    this.findingForm = this.fb.group({
      findingType: ['Observation', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      severity: ['Major', Validators.required],
      isBlocking: [true]
    });
    this.resolveForm = this.fb.group({
      resolution: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  getExecutionDropdown = (term: string, page: number, pageSize: number) => {
    return this.executionService.getExecutionDropdown(term, page, pageSize);
  };

  getEmployeeDropdown = (term: string, page: number, pageSize: number) => {
    return this.employeeService.getEmployeeDropdown(term, page, pageSize);
  };

  onExecutionSelected(item: any): void {
    this.selectedExecutionItem = item;
    const id = Number(item?.id ?? 0);
    if (id > 0) {
      this.executionId = id;
      this.load();
      this.router.navigate([], { relativeTo: this.route, queryParams: { executionId: id }, queryParamsHandling: 'merge' });
    } else {
      this.executionId = 0;
      this.result = null;
    }
  }

  onReviewerSelected(item: any): void {
    this.selectedReviewerItem = item;
    this.reviewerId = item?.id ? String(item.id) : '';
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
        this.syncSelectionItems(res);
      },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Result not found. Evaluate in Phase 7 first.'), 'error')
    });
  }

  loadByResultId(resId: number): void {
    this.resultService.getById(resId).subscribe({
      next: (res) => {
        this.result = res;
        this.executionId = Number(res?.executionID ?? res?.universalTestExecutionID ?? 0);
        this.syncSelectionItems(res);
      },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Result not found.'), 'error')
    });
  }

  private syncSelectionItems(res: any): void {
    if (!res) return;
    const execId = this.executionId;
    if (execId && (!this.selectedExecutionItem || this.selectedExecutionItem.id !== execId)) {
      this.selectedExecutionItem = {
        id: execId,
        name: `#${execId} · ${res.testName || 'Test'} (Sample: ${res.sampleNo || '-'}, Run #${res.executionNo || 1})`
      };
    }
    const revId = res.reviewerID ?? res.ReviewerID;
    if (revId) {
      this.reviewerId = String(revId);
      if (!this.selectedReviewerItem || this.selectedReviewerItem.id !== revId) {
        this.employeeService.getEmployeeById(Number(revId)).subscribe({
          next: (emp) => {
            if (emp) {
              this.selectedReviewerItem = {
                id: emp.id,
                name: `${emp.firstName ?? ''} ${emp.lastName ?? ''} (${emp.employeeCode ?? emp.id})`.trim()
              };
            }
          },
          error: () => {
            this.selectedReviewerItem = { id: revId, name: `Employee #${revId}` };
          }
        });
      }
    }
  }

  get token(): string { return this.result?.concurrencyToken ?? this.result?.ConcurrencyToken ?? ''; }
  get resultId(): number { return Number(this.result?.id ?? this.result?.ID ?? 0); }
  get params(): any[] { return this.result?.parameters ?? this.result?.Parameters ?? []; }
  get findings(): any[] { return this.result?.findings ?? this.result?.Findings ?? []; }
  get audits(): any[] { return this.result?.audits ?? this.result?.Audits ?? []; }

  openExecution(): void {
    this.router.navigate(['/universal-test-execution'], { queryParams: { executionId: this.executionId, from: 'review' } });
  }

  openResult(): void {
    this.router.navigate(['/universal-result'], { queryParams: { executionId: this.executionId } });
  }

  openReport(): void {
    this.router.navigate(['/universal-report'], { queryParams: { executionId: this.executionId } });
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

  onAssignReviewer(): void {
    const id = Number(this.reviewerId);
    if (!id) { this.toast.show('Select a reviewer employee', 'warning'); return; }
    this.reviewService.assignReviewer(this.resultId, id, this.actionRemarks || undefined).subscribe({
      next: (res) => {
        this.result = res;
        this.syncSelectionItems(res);
        this.toast.show('Reviewer assigned', 'success');
      },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Assign failed'), 'error')
    });
  }

  onAddFinding(): void {
    this.submitted = true;
    if (this.findingForm.invalid) { this.findingForm.markAllAsTouched(); this.toast.show('Please fill in all required fields correctly', 'warning'); return; }
    const v = this.findingForm.value;
    this.reviewService.createFinding(this.resultId, { findingType: v.findingType, description: v.description.trim(), severity: v.severity, isBlocking: !!v.isBlocking }).subscribe({
      next: (f) => { this.toast.show('Finding recorded (original data untouched)', 'success'); this.findingForm.reset({ findingType: 'Observation', severity: 'Major', isBlocking: true }); this.submitted = false; this.load(); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Finding failed'), 'error')
    });
  }

  // H1: open standard resolution modal (no window.prompt; backend contract unchanged)
  onResolveFinding(f: any): void {
    this.resolvingFinding = f;
    this.resolveSubmitted = false;
    this.resolveForm.reset({ resolution: '' });
    this.isResolveModalOpen = true;
  }

  closeResolveModal(): void {
    this.isResolveModalOpen = false;
    this.resolvingFinding = null;
    this.resolveSubmitted = false;
  }

  confirmResolveFinding(): void {
    this.resolveSubmitted = true;
    if (this.resolveForm.invalid || !this.resolvingFinding) {
      this.resolveForm.markAllAsTouched();
      if (!this.resolvingFinding) this.closeResolveModal();
      return;
    }
    const resolution = String(this.resolveForm.value.resolution || '').trim();
    if (!resolution) return;
    this.reviewService.resolveFinding(this.resolvingFinding.id ?? this.resolvingFinding.ID, resolution).subscribe({
      next: () => { this.toast.show('Finding resolved', 'success'); this.closeResolveModal(); this.load(); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Resolve failed'), 'error')
    });
  }

  // H3: rule-based governance hints. Derived from result status + findings only;
  // never matched against backend error-message text. Backend remains authoritative.
  get openBlockingCount(): number {
    return (this.findings || []).filter((f: any) => (f.isBlocking ?? f.IsBlocking) && String(f.status ?? f.Status) === 'Open').length;
  }

  get verifyHint(): string {
    const s = String(this.result?.resultStatus ?? this.result?.ResultStatus ?? '');
    if (!this.result) return 'Rule: verification acts on a Finalized result assigned to a reviewer.';
    if (s !== 'Finalized' && s !== 'UnderReview') return 'Rule: verification is allowed from Finalized or UnderReview only.';
    if (this.openBlockingCount > 0) return 'Rule: unresolved blocking findings must be resolved before verification.';
    return 'Rule: analyst cannot verify own test; only the assigned reviewer verifies.';
  }

  get approveHint(): string {
    const s = String(this.result?.resultStatus ?? this.result?.ResultStatus ?? '');
    if (!this.result) return 'Rule: approval acts on a Verified result.';
    if (s !== 'Verified') return 'Rule: approval is allowed from Verified only.';
    if (this.openBlockingCount > 0) return 'Rule: unresolved blocking findings must be resolved before approval.';
    return 'Rule: analyst and verifier cannot approve; a third approver signs.';
  }

  // H4: read-only pointer to the owning Phase 5 difference audit (no recompute here).
  get universalTestGroupId(): number {
    return Number(this.result?.universalTestGroupID ?? this.result?.UniversalTestGroupID ?? 0);
  }

  onVerify(): void {
    this.reviewService.verify(this.resultId, this.token, this.actionRemarks || undefined).subscribe({
      next: (res) => { this.result = res; this.toast.show('Verified (analyst ≠ verifier enforced)', 'success'); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Verify failed'), 'error')
    });
  }

  onApprove(): void {
    this.reviewService.approve(this.resultId, this.token, this.actionRemarks || undefined).subscribe({
      next: (res) => { this.result = res; this.toast.show('Approved — result is now immutable', 'success'); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Approve failed'), 'error')
    });
  }

  onRequestRework(): void {
    if (!this.actionRemarks || !this.actionRemarks.trim()) { this.toast.show('Rework remarks are mandatory', 'warning'); return; }
    this.reviewService.requestRework(this.resultId, this.token, this.actionRemarks.trim()).subscribe({
      next: (res) => { this.result = res; this.toast.show('Rework requested — new revision required, history preserved', 'success'); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Rework failed'), 'error')
    });
  }

  onReject(): void {
    if (!this.actionRemarks || !this.actionRemarks.trim()) { this.toast.show('Rejection remarks are mandatory', 'warning'); return; }
    this.reviewService.reject(this.resultId, this.token, this.actionRemarks.trim()).subscribe({
      next: (res) => { this.result = res; this.toast.show('Approval rejected — rework required', 'success'); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Reject failed'), 'error')
    });
  }
}
