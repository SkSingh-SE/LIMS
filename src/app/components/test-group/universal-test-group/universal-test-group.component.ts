import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';
import { UniversalTestGroupService } from '../../../services/universal-test-group.service';
import { ConfigurationAdjustmentService } from '../../../services/configuration-adjustment.service';
import { AuthService } from '../../../services/auth.service';
import {
  EffectiveConfigurationDto,
  UniversalTestGroupDetailDto,
  ConfigurationAdjustmentDetailDto,
  ConfigurationAdjustmentItemDto,
  ConfigurationAdjustmentListItemDto,
  AdjustedConfigurationDto,
  AdjustmentValidationResultDto,
  ComprehensiveDifferenceAuditDto,
  DifferenceAuditComparisonItemDto,
  ExecutionDeviationRequestDto,
  DeviationLookupResultDto,
  DeviationOptionDto
} from '../../../models/universal-test-group.model';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-universal-test-group',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BreadcrumbComponent],
  templateUrl: './universal-test-group.component.html',
  styleUrls: ['./universal-test-group.component.css']
})
export class UniversalTestGroupComponent implements OnInit, AfterViewInit {
  @ViewChild('tabStrip') tabStripRef?: ElementRef<HTMLUListElement>;
  hasTabOverflow = false;
  canScrollLeft = false;
  canScrollRight = false;
  showLeftTabScroll = false;
  showRightTabScroll = false;
  testGroupId: number = 0;
  detail: UniversalTestGroupDetailDto | null = null;
  eff: EffectiveConfigurationDto | null = null;
  activeAdjustment: ConfigurationAdjustmentDetailDto | null = null;
  differenceAuditItems: ConfigurationAdjustmentItemDto[] = [];
  comprehensiveAudit: ComprehensiveDifferenceAuditDto | null = null;
  approvalHistory: ConfigurationAdjustmentListItemDto[] = [];
  adjustedConfig: AdjustedConfigurationDto | null = null;

  activeTab: 'parameters' | 'conditions' | 'equipment' | 'factors' | 'uncertainty' | 'acceptance' | 'layout' | 'validation' | 'audit' | 'history' = 'parameters';

  auditSectionFilter: string = 'ALL';
  auditClassificationFilter: string = 'ALL';

  // Controlled Execution Deviation Modal State
  isDeviationModalOpen = false;
  deviationCategory: string = 'Equipment';
  deviationLookup: DeviationLookupResultDto | null = null;
  selectedAlternativeId: number | null = null;
  deviationReason: string = '';
  deviationEvidence: string = '';
  submitForApproval: boolean = true;
  isLoadingOptions = false;
  isSubmittingDeviation = false;

  // Approval & Rejection State
  approvalRemarks = '';
  isApproving = false;
  isApplying = false;

  // Rejection Modal State
  isRejectModalOpen = false;
  rejectionReasonText = '';
  isRejecting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: UniversalTestGroupService,
    private adjService: ConfigurationAdjustmentService,
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(p => {
      const id = p.get('id');
      if (id) {
        this.testGroupId = +id;
        this.load();
      }
    });
  }

  load(): void {
    this.service.getEffectiveConfiguration(this.testGroupId).subscribe({
      next: (res) => {
        this.eff = res;
        this.detail = res.testGroup;
        this.loadAdjustment();
        setTimeout(() => this.checkTabScroll(), 200);
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Failed to load effective configuration.', 'error');
      }
    });
  }

  loadAdjustment(): void {
    this.adjService.getByTestGroup(this.testGroupId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.activeAdjustment = res.data;
        } else {
          this.activeAdjustment = null;
        }
      },
      error: () => {
        this.activeAdjustment = null;
      }
    });

    this.adjService.getDifferenceAudit(this.testGroupId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.comprehensiveAudit = res.data;
          this.differenceAuditItems = res.data.adjustmentItems || [];
        }
      },
      error: () => {
        this.comprehensiveAudit = null;
        this.differenceAuditItems = [];
      }
    });

    this.adjService.getHistory(this.testGroupId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.approvalHistory = res.data;
        }
      },
      error: () => {
        this.approvalHistory = [];
      }
    });

    this.adjService.getAdjustedConfiguration(this.testGroupId, true).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.adjustedConfig = res.data;
        }
      },
      error: () => {
        this.adjustedConfig = null;
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkTabScroll(), 150);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.checkTabScroll();
  }

  checkTabScroll(): void {
    if (!this.tabStripRef?.nativeElement) return;
    const el = this.tabStripRef.nativeElement;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    this.hasTabOverflow = maxScroll > 4;
    this.canScrollLeft = el.scrollLeft > 4;
    this.canScrollRight = el.scrollLeft < (maxScroll - 4);
    this.showLeftTabScroll = this.canScrollLeft;
    this.showRightTabScroll = this.canScrollRight;
    this.cdr.markForCheck();
  }

  scrollTabStrip(direction: 'left' | 'right'): void {
    if (!this.tabStripRef?.nativeElement) return;
    const el = this.tabStripRef.nativeElement;
    const amount = 240;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    setTimeout(() => this.checkTabScroll(), 300);
  }

  onTabWheel(event: WheelEvent): void {
    if (!this.tabStripRef?.nativeElement) return;
    const el = this.tabStripRef.nativeElement;
    if (el.scrollWidth > el.clientWidth) {
      el.scrollLeft += (event.deltaY !== 0 ? event.deltaY : event.deltaX);
      event.preventDefault();
      this.checkTabScroll();
    }
  }

  setTab(tab: 'parameters' | 'conditions' | 'equipment' | 'factors' | 'uncertainty' | 'acceptance' | 'layout' | 'validation' | 'audit' | 'history'): void {
    this.activeTab = tab;
    setTimeout(() => {
      if (!this.tabStripRef?.nativeElement) return;
      const activeEl = this.tabStripRef.nativeElement.querySelector('.nav-link.active') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      this.checkTabScroll();
    }, 50);
  }

  get currentUserId(): number {
    const user = this.authService.getUserData();
    return user?.employeeID || user?.userId || 0;
  }

  get canApply(): boolean {
    if (!this.activeAdjustment) return false;
    return !!(this.activeAdjustment.status === 'Draft' && this.activeAdjustment.canApply);
  }

  get canReject(): boolean {
    if (!this.activeAdjustment) return false;
    if (this.activeAdjustment.status !== 'Applied') return false;
    // Strict Four-Eyes Segregation of Duties: Creator and Applier cannot reject/approve
    if (this.activeAdjustment.appliedBy === this.currentUserId || (this.activeAdjustment as any).createdBy === this.currentUserId) {
      return false;
    }
    return true;
  }

  get canApprove(): boolean {
    if (!this.activeAdjustment) return false;
    if (this.activeAdjustment.status !== 'Applied') return false;
    // Strict Four-Eyes Segregation of Duties: Creator and Applier cannot approve their own adjustment
    if (this.activeAdjustment.appliedBy === this.currentUserId || (this.activeAdjustment as any).createdBy === this.currentUserId) {
      return false;
    }
    return !!this.activeAdjustment.canApprove;
  }

  // ═══════════════════════════════════════════════════════════
  // CONTROLLED EXECUTION DEVIATION WORKFLOW
  // ═══════════════════════════════════════════════════════════
  openDeviationModal(category: string = 'Equipment'): void {
    this.deviationCategory = category;
    this.selectedAlternativeId = null;
    this.deviationReason = '';
    this.deviationEvidence = '';
    this.submitForApproval = true;
    this.isDeviationModalOpen = true;
    this.loadDeviationOptions(category);
  }

  closeDeviationModal(): void {
    this.isDeviationModalOpen = false;
    this.deviationLookup = null;
  }

  onDeviationCategoryChange(category: string): void {
    this.deviationCategory = category;
    this.selectedAlternativeId = null;
    this.loadDeviationOptions(category);
  }

  loadDeviationOptions(category: string): void {
    this.isLoadingOptions = true;
    this.adjService.getDeviationOptions(this.testGroupId, category).subscribe({
      next: (res) => {
        this.isLoadingOptions = false;
        if (res.success && res.data) {
          this.deviationLookup = res.data;
          const nonCurrent = res.data.availableOptions.find(o => !o.isCurrent);
          if (nonCurrent) {
            this.selectedAlternativeId = nonCurrent.id;
          }
        }
      },
      error: (err) => {
        this.isLoadingOptions = false;
        this.toast.show(err.error?.message || 'Failed to load deviation options.', 'error');
      }
    });
  }

  submitDeviation(): void {
    if (!this.selectedAlternativeId) {
      this.toast.show('Please select an authoritative alternative.', 'warning');
      return;
    }
    if (!this.deviationReason || !this.deviationReason.trim()) {
      this.toast.show('Deviation reason is mandatory.', 'warning');
      return;
    }

    this.isSubmittingDeviation = true;
    const req: ExecutionDeviationRequestDto = {
      universalTestGroupID: this.testGroupId,
      deviationCategory: this.deviationCategory,
      selectedAlternativeID: this.selectedAlternativeId,
      reason: this.deviationReason.trim(),
      evidenceReference: this.deviationEvidence.trim() || undefined,
      concurrencyToken: this.activeAdjustment?.concurrencyToken,
      submitForApproval: this.submitForApproval
    };

    this.adjService.requestDeviation(req).subscribe({
      next: (res) => {
        this.isSubmittingDeviation = false;
        if (res.success) {
          this.toast.show(
            this.submitForApproval
              ? 'Execution deviation submitted and applied for reviewer approval!'
              : 'Execution deviation saved as draft.',
            'success'
          );
          this.closeDeviationModal();
          this.load();
        } else {
          this.toast.show(res.message || 'Failed to submit deviation.', 'error');
        }
      },
      error: (err) => {
        this.isSubmittingDeviation = false;
        this.toast.show(err.error?.message || 'Error requesting deviation.', 'error');
      }
    });
  }

  applyAdjustment(): void {
    if (!this.activeAdjustment) return;

    if (!confirm('Are you sure you want to apply this adjustment? Once applied, the adjusted configuration becomes the immutable handoff for Phase 6.')) {
      return;
    }

    this.isApplying = true;
    const req = {
      configurationAdjustmentID: this.activeAdjustment.id,
      universalTestGroupID: this.testGroupId,
      concurrencyToken: this.activeAdjustment.concurrencyToken
    };

    this.adjService.apply(req).subscribe({
      next: (res) => {
        this.isApplying = false;
        if (res.success) {
          this.toast.show('Adjustment successfully applied! Immutable handoff created.', 'success');
          this.loadAdjustment();
        } else {
          this.toast.show(res.message || 'Failed to apply adjustment.', 'error');
        }
      },
      error: (err) => {
        this.isApplying = false;
        this.toast.show(err.error?.message || 'Error applying adjustment.', 'error');
      }
    });
  }

  approveAdjustment(): void {
    if (!this.activeAdjustment) return;

    if (!confirm('Are you sure you want to approve this adjustment? (Segregation of Duties: Creator cannot approve their own adjustment).')) {
      return;
    }

    this.isApproving = true;
    const req = {
      configurationAdjustmentID: this.activeAdjustment.id,
      universalTestGroupID: this.testGroupId,
      approvalRemarks: this.approvalRemarks || 'Approved per technical review.',
      concurrencyToken: this.activeAdjustment.concurrencyToken
    };

    this.adjService.approve(req).subscribe({
      next: (res) => {
        this.isApproving = false;
        if (res.success) {
          this.toast.show('Adjustment approved successfully! Eligible for Phase 6 execution.', 'success');
          this.approvalRemarks = '';
          this.loadAdjustment();
        } else {
          this.toast.show(res.message || 'Failed to approve adjustment.', 'error');
        }
      },
      error: (err) => {
        this.isApproving = false;
        this.toast.show(err.error?.message || 'Error approving adjustment.', 'error');
      }
    });
  }

  openRejectModal(): void {
    this.rejectionReasonText = '';
    this.isRejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.isRejectModalOpen = false;
    this.rejectionReasonText = '';
  }

  confirmRejectAdjustment(): void {
    if (!this.activeAdjustment) return;
    if (!this.rejectionReasonText || !this.rejectionReasonText.trim()) {
      this.toast.show('Rejection reason is mandatory.', 'warning');
      return;
    }

    this.isRejecting = true;
    const req = {
      configurationAdjustmentID: this.activeAdjustment.id,
      universalTestGroupID: this.testGroupId,
      rejectionReason: this.rejectionReasonText.trim(),
      concurrencyToken: this.activeAdjustment.concurrencyToken
    };

    this.adjService.reject(req).subscribe({
      next: (res) => {
        this.isRejecting = false;
        if (res.success) {
          this.toast.show('Adjustment rejected. Historical revision preserved for audit.', 'info');
          this.closeRejectModal();
          this.loadAdjustment();
        } else {
          this.toast.show(res.message || 'Failed to reject adjustment.', 'error');
        }
      },
      error: (err) => {
        this.isRejecting = false;
        this.toast.show(err.error?.message || 'Error rejecting adjustment.', 'error');
      }
    });
  }

  get filteredAuditItems(): DifferenceAuditComparisonItemDto[] {
    if (!this.comprehensiveAudit?.comparisonItems) return [];
    return this.comprehensiveAudit.comparisonItems.filter(item => {
      const matchSection = this.auditSectionFilter === 'ALL' || item.section === this.auditSectionFilter;
      const matchClassification = this.auditClassificationFilter === 'ALL' || item.classification === this.auditClassificationFilter;
      return matchSection && matchClassification;
    });
  }



  // ═══════════════════════════════════════════════════════════
  // 3-STATE LINEAGE & BADGE HELPERS
  // ═══════════════════════════════════════════════════════════
  getAdjustmentBadgeClass(status?: string): string {
    switch (status) {
      case 'Draft': return 'badge-lims-draft';
      case 'Applied': return 'badge-lims-applied';
      case 'Approved': return 'badge-lims-approved';
      default: return 'badge-lims-na';
    }
  }

  getOverallStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'READY': return 'badge-lims-ready';
      case 'WARNING': return 'badge-lims-warning';
      case 'BLOCKED': return 'badge-lims-blocked';
      default: return 'badge-lims-na';
    }
  }

  getValidationBadge(status: string): string {
    switch (status) {
      case 'PASS': return 'badge-lims-ready';
      case 'BLOCKED':
      case 'BLOCKING': return 'badge-lims-blocked';
      case 'WARNING': return 'badge-lims-warning';
      default: return 'badge-lims-na';
    }
  }

  getDriftBadgeClass(status: string): string {
    switch (status) {
      case 'UNCHANGED': return 'badge-lims-unchanged';
      case 'CHANGED': return 'badge-lims-drift';
      case 'MISSING': return 'badge-lims-blocked';
      case 'DRIFT_ADDED': return 'badge-lims-warning';
      case 'DRIFT_REMOVED': return 'badge-lims-warning';
      default: return 'badge-lims-na';
    }
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'RESOLVED':
      case 'CONFIGURED': return 'badge-lims-ready';
      case 'BLOCKED':
      case 'MANDATORY_MISSING': return 'badge-lims-blocked';
      case 'MISSING':
      case 'WARNING':
      case 'VERSION_MISMATCH':
      case 'GRADE_MISMATCH': return 'badge-lims-warning';
      default: return 'badge-lims-na';
    }
  }

  getLayoutStatusBadge(status: string): string {
    switch (status) {
      case 'UNCHANGED': return 'badge-lims-ready';
      case 'LAYOUT_DRIFT': return 'badge-lims-warning';
      default: return 'badge-lims-na';
    }
  }

  getReadinessBadge(status: string): string {
    switch (status) {
      case 'READY': return 'badge-lims-ready';
      case 'WARNING': return 'badge-lims-warning';
      case 'BLOCKED': return 'badge-lims-blocked';
      default: return 'badge-lims-na';
    }
  }

  getCategoryBadge(category?: string): string {
    switch (category) {
      case 'Scientific': return 'badge bg-danger-subtle text-danger border border-danger-subtle';
      case 'Compliance': return 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      case 'Operational': return 'badge bg-info-subtle text-info border border-info-subtle';
      case 'Presentation': return 'badge bg-secondary-subtle text-secondary border';
      default: return 'badge bg-light text-muted border';
    }
  }

  getRowState(section: string, entityId: number, property?: string): 'UNCHANGED' | 'MASTER_DRIFT' | 'USER_ADJUSTED' {
    if (this.activeAdjustment && this.activeAdjustment.items) {
      const match = this.activeAdjustment.items.find(i =>
        (i.targetCategory === section || (i as any).section === section) &&
        (i.targetEntityID === entityId || (i as any).entityID === entityId) &&
        (!property || i.targetProperty === property || (i as any).fieldName === property)
      );
      if (match) return 'USER_ADJUSTED';
    }

    if (this.eff) {
      if (section === 'Parameter') {
        const p = this.eff.parameters.find(x => x.parameterID === entityId);
        if (p && p.resolutionStatus === 'CHANGED') return 'MASTER_DRIFT';
      } else if (section === 'Requirement') {
        const r = this.eff.requirements.find(x => x.parameterID === entityId);
        if (r && r.resolutionStatus === 'CHANGED') return 'MASTER_DRIFT';
      } else if (section === 'Condition') {
        const c = this.eff.conditions.find(x => x.conditionMasterID === entityId);
        if (c && c.status === 'CHANGED') return 'MASTER_DRIFT';
      } else if (section === 'Equipment') {
        const eq = this.eff.equipment.find(x => x.equipmentID === entityId);
        if (eq && eq.readinessStatus === 'WARNING') return 'MASTER_DRIFT';
      }
    }

    return 'UNCHANGED';
  }

  getAdjustedValue(section: string, entityId: number, property: string): string | null {
    if (!this.activeAdjustment?.items) return null;
    const item = this.activeAdjustment.items.find(i =>
      (i.targetCategory === section || (i as any).section === section) &&
      (i.targetEntityID === entityId || (i as any).entityID === entityId) &&
      (i.targetProperty === property || (i as any).fieldName === property)
    );
    return item ? (item.adjustedValue || (item as any).newAdjustedValue || null) : null;
  }

  backToPlan(): void {
    if (this.detail) {
      this.router.navigate(['/sample/plan/universal', this.detail.inwardID], { queryParams: { sampleId: this.detail.sampleID } });
    } else {
      this.router.navigate(['/sample/plan']);
    }
  }

  openExecution(): void {
    if (!this.detail) return;
    if (this.detail.hasExecution) {
      const qp: any = { utgId: this.detail.id, from: 'group' };
      if (this.detail.latestExecutionID) {
        qp.executionId = this.detail.latestExecutionID;
      }
      this.router.navigate(['/universal-test-execution'], { queryParams: qp });
      return;
    }
    if (!this.detail.canOpenExecution) {
      this.toast.show(this.detail.canOpenExecutionReason || 'Execution not allowed in current status.', 'warning');
      return;
    }
    this.router.navigate(['/universal-test-execution'], { queryParams: { utgId: this.detail.id, from: 'group' } });
  }

  openMaster(route: string): void {
    window.open(route, '_blank');
  }
}
