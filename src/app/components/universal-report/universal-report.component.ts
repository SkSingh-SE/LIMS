import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UniversalReportService } from '../../services/universal-report.service';
import { UniversalTestExecutionService } from '../../services/universal-test-execution.service';
import { ToastService } from '../../services/toast.service';
import { HasPermissionDirective } from '../../utility/directives/has-permission.directive';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { extractErrorMessage } from '../../utility/helper/error.helper';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-universal-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BreadcrumbComponent, HasPermissionDirective, SearchableDropdownComponent],
  templateUrl: './universal-report.component.html',
  styleUrl: './universal-report.component.css'
})
export class UniversalReportComponent implements OnInit {
  executionId: number = 0;
  preview: any = null;
  reports: any[] = [];
  selected: any = null;
  remarks: string = '';
  reissueReason: string = '';
  selectedExecutionItem: any = null;
  availableFormats: any[] = [];
  selectedFormatCode: string = 'DEFAULT';
  sortColumn: string = 'generatedOn';
  sortAsc: boolean = false; // default latest on top

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reportService: UniversalReportService,
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
      this.loadAll();
      this.router.navigate([], { relativeTo: this.route, queryParams: { executionId: id }, queryParamsHandling: 'merge' });
    } else {
      this.executionId = 0;
      this.preview = null;
      this.reports = [];
      this.selected = null;
    }
  }

  ngOnInit(): void {
    this.loadFormats();
    this.route.queryParams.subscribe(p => {
      const id = Number(p['executionId'] || p['executionid'] || p['id'] || 0);
      if (id > 0) {
        this.executionId = id;
        this.loadAll();
      }
    });
    this.route.params.subscribe(p => {
      const id = Number((p as any)['id'] || 0);
      if (id > 0) {
        this.executionId = id;
        this.loadAll();
      }
    });
  }

  loadFormats(): void {
    this.reportService.getAvailableFormats().subscribe({
      next: (res) => {
        this.availableFormats = res || [];
        if (!this.availableFormats.some(f => (f.formatCode || f.FormatCode) === 'DEFAULT')) {
          this.availableFormats.unshift({ formatCode: 'DEFAULT', formatName: 'Default Universal Report' });
        }
      },
      error: () => {
        this.availableFormats = [{ formatCode: 'DEFAULT', formatName: 'Default Universal Report' }];
      }
    });
  }

  loadAll(): void {
    if (!this.executionId) return;
    this.onPreview(false);
    this.reportService.listByExecution(this.executionId).subscribe({
      next: (res) => {
        this.reports = res ?? [];
        this.applySort();
      },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Report history not available yet (run Phase 9 SQL + restart API).'), 'error')
    });
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = false; // default descending on new column
    }
    this.applySort();
  }

  applySort(): void {
    if (!this.reports || this.reports.length === 0) return;
    this.reports.sort((a, b) => {
      const valA = this.getSortValue(a, this.sortColumn);
      const valB = this.getSortValue(b, this.sortColumn);

      if (valA === valB) return 0;
      if (valA == null || valA === '') return 1;
      if (valB == null || valB === '') return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      }

      return this.sortAsc ? comparison : -comparison;
    });
  }

  private getSortValue(item: any, column: string): any {
    switch (column) {
      case 'reportNo':
        return item.reportNo ?? item.ReportNo ?? '';
      case 'ulrNo':
        return item.ulrNo ?? item.UlrNo ?? '';
      case 'resultRevisionNo':
        return Number(item.resultRevisionNo ?? item.ResultRevisionNo ?? 0);
      case 'reportRevisionNo':
        return Number(item.reportRevisionNo ?? item.ReportRevisionNo ?? 0);
      case 'status':
        return item.status ?? item.Status ?? '';
      case 'showNablMark':
        return (item.showNablMark ?? item.ShowNablMark) ? 1 : 0;
      case 'reportFormatSource':
        return item.reportFormatSource ?? item.ReportFormatSource ?? '';
      case 'reportDataHash':
        return item.reportDataHash ?? item.ReportDataHash ?? '';
      case 'generatedOn': {
        const g = item.generatedOn ?? item.GeneratedOn;
        return g ? new Date(g).getTime() : 0;
      }
      case 'releasedOn': {
        const r = item.releasedOn ?? item.ReleasedOn;
        return r ? new Date(r).getTime() : 0;
      }
      default:
        return item[column] ?? '';
    }
  }

  onPreview(notify = true): void {
    if (!this.executionId) return;
    this.reportService.preview(this.executionId, this.selectedFormatCode).subscribe({
      next: (res) => {
        this.preview = res;
        const d = this.dataOf(res);
        if (!this.selectedExecutionItem || this.selectedExecutionItem.id !== this.executionId) {
          const testName = d?.testName ?? d?.TestName ?? '';
          const sampleNo = d?.sampleNo ?? d?.SampleNo ?? '';
          this.selectedExecutionItem = {
            id: this.executionId,
            name: `#${this.executionId}${testName ? ' · ' + testName : ''}${sampleNo ? ' (Sample: ' + sampleNo + ')' : ''}`
          };
        }
        if (notify) this.toast.show('Preview assembled from frozen snapshot + approved result', 'success');
      },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Preview needs a finalized result first.'), 'error')
    });
  }

  onGenerate(): void {
    if (!this.executionId) return;
    this.reportService.generate(this.executionId, this.remarks || undefined, this.selectedFormatCode).subscribe({
      next: (res) => {
        this.selected = res;
        this.toast.show(`Generated ${res?.reportNo ?? res?.ReportNo}`, 'success');
        this.loadAll();
      },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Generate needs an Approved result with valid snapshot integrity.'), 'error')
    });
  }

  onRelease(): void {
    if (this.isSelectedVoid()) {
      this.toast.show('Void reports cannot be released as official documents.', 'warning');
      return;
    }
    const id = this.selectedId();
    if (!id) return;
    this.reportService.release(id, this.remarks || undefined).subscribe({
      next: (res) => { this.selected = res; this.toast.show('Report released', 'success'); this.loadAll(); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Release failed'), 'error')
    });
  }

  onReissue(): void {
    if (this.isSelectedVoid()) {
      this.toast.show('Void reports cannot be reissued as official documents.', 'warning');
      return;
    }
    const id = this.selectedId();
    if (!id) return;
    if (!this.reissueReason || this.reissueReason.trim().length < 10) {
      this.toast.show('Reissue needs a reason (min 10 chars). Old PDF is never overwritten.', 'warning');
      return;
    }
    this.reportService.reissue(id, this.reissueReason).subscribe({
      next: (res) => { this.selected = res; this.reissueReason = ''; this.toast.show('Reissued as new revision', 'success'); this.loadAll(); },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Reissue failed'), 'error')
    });
  }

  onView(r: any): void {
    this.reportService.getById(r.id ?? r.ID).subscribe({
      next: (res) => { this.selected = res; },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Load failed'), 'error')
    });
  }

  onDownload(r?: any): void {
    const report = r || this.selected;
    const status = (report?.status ?? report?.Status ?? '').toUpperCase();
    if (status === 'VOID') {
      this.toast.show('Void reports are cancelled and cannot be downloaded as official documents.', 'warning');
      return;
    }
    const id = r ? (r.id ?? r.ID) : this.selectedId();
    if (!id) return;
    this.reportService.download(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${r?.reportNo ?? r?.ReportNo ?? this.selected?.reportNo ?? 'report'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => this.toast.show(extractErrorMessage(err, 'Download failed'), 'error')
    });
  }

  openExecution(): void {
    this.router.navigate(['/universal-test-execution'], { queryParams: { executionId: this.executionId, from: 'report' } });
  }

  openReview(): void {
    this.router.navigate(['/universal-review'], { queryParams: { executionId: this.executionId } });
  }

  selectedId(): number {
    return Number(this.selected?.id ?? this.selected?.ID ?? 0);
  }

  dataOf(view: any): any {
    return view?.data ?? view?.Data ?? {};
  }

  paramsOf(view: any): any[] {
    const d = this.dataOf(view);
    return d?.resultParameters ?? d?.ResultParameters ?? [];
  }

  statusClass(s: string): string {
    const v = (s || '').toLowerCase();
    if (v === 'released') return 'result-status-approved';
    if (v === 'generated') return 'result-status-finalized';
    if (v === 'superseded') return 'result-status-rework';
    if (v === 'void') return 'result-status-rework';
    return 'result-status-calculated';
  }

  isVoidStatus(s: any): boolean {
    return String(s ?? '').toUpperCase() === 'VOID';
  }

  isSelectedVoid(): boolean {
    const st = this.selected?.status ?? this.selected?.Status ?? '';
    return this.isVoidStatus(st);
  }

  getApiUrl(path: string | undefined | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    const clean = '/' + path.replace(/\\/g, '/').replace(/^\/+/, '');
    const base = (environment.baseUrl || environment.apiUrl || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
    return base + clean;
  }

  hasNablMark(view: any): boolean {
    const d = this.dataOf(view);
    const r = this.selected;
    return !!(d?.showNablMark || d?.ShowNablMark || d?.isWithinAccreditedScope || d?.IsWithinAccreditedScope || r?.showNablMark || r?.ShowNablMark);
  }

  getNablLogoUrl(view: any): string {
    const d = this.dataOf(view);
    const r = this.selected;
    const path = d?.nablLogoPath || d?.NablLogoPath || r?.nablLogoPath || r?.NablLogoPath;
    if (path) {
      return this.getApiUrl(path);
    }
    return '';
  }

  getLabLogoUrl(view: any): string {
    const d = this.dataOf(view);
    const path = d?.labLogoPath || d?.LabLogoPath;
    if (path) {
      return this.getApiUrl(path);
    }
    return '';
  }

  today: Date = new Date();

  getReportTableRows(view: any): any[] {
    const d = this.dataOf(view);
    const reportParams = d?.resultParameters ?? d?.ResultParameters;
    if (reportParams?.length) {
      return reportParams.map((p: any, idx: number) => {
        const min = p.effectiveMin ?? p.specMin;
        const max = p.effectiveMax ?? p.specMax;
        let req = p.requirement ?? p.Requirement ?? p.specRange ?? '—';
        if (min != null && max != null) {
          req = `${min} - ${max}`;
        } else if (min != null) {
          req = `Min. ${min}`;
        } else if (max != null) {
          req = `Max. ${max}`;
        }
        const isNabl = p.isNabl ?? p.isWithinAccreditedScope ?? d?.showNablMark ?? true;
        return {
          srNo: idx + 1,
          parameterCode: p.parameterCode || p.code || '',
          parameterName: p.parameterName || p.ParameterName || p.parameterCode || p.code,
          testMethod: p.testMethodStandard || p.testMethodName || d?.testMethodStandard || d?.testMethodName || '—',
          unit: p.unit || p.Unit || '-',
          finalValue: p.reportedValue ?? p.ReportedValue ?? p.displayValue ?? p.DisplayValue ?? p.complianceValue ?? p.ComplianceValue ?? p.rawValue ?? '—',
          specRange: req,
          status: p.verdict ?? p.Verdict ?? p.status ?? '—',
          detectionLimit: p.detectionLimit ?? p.mdl ?? '—',
          isNabl: isNabl ? 'Yes' : 'No',
          uncertainty: p.expandedUncertainty ?? p.uncertainty ?? null
        };
      });
    }
    return [];
  }

  getEquipmentString(view: any): string {
    const d = this.dataOf(view);
    const eqList = d?.equipment ?? d?.Equipment;
    if (eqList && Array.isArray(eqList) && eqList.length > 0) {
      return eqList.map((e: any) => `${e.equipmentName || e.name || 'Equipment'} (${e.equipmentCode || e.code || 'ID: EQ'})`).join(', ');
    }
    return (d?.testEquipment && d.testEquipment !== '—') ? d.testEquipment : '—';
  }

  getConditionsString(view: any): string {
    const d = this.dataOf(view);
    const condList = d?.conditions ?? d?.Conditions;
    if (condList && Array.isArray(condList) && condList.length > 0) {
      return condList.map((c: any) => `${c.conditionName || c.name || 'Param'}: ${c.conditionValue || c.value || '-'} ${c.unit || ''}`.trim()).join(' | ');
    }
    return (d?.environmentalConditions && d.environmentalConditions !== '—') ? d.environmentalConditions : '—';
  }

  getMethodVersion(view: any): string {
    const d = this.dataOf(view);
    return d?.testMethodVersion || '—';
  }

  verdictClass(v: string): string {
    const s = (v || '').toUpperCase();
    if (s === 'PASS') return 'verdict-pass';
    if (s === 'FAIL') return 'verdict-fail';
    if (s === 'MARGINAL') return 'verdict-marginal';
    if (s === 'INFORMATIONAL' || s === 'NOT_CONFIGURED') return 'verdict-info';
    return 'verdict-neutral';
  }
}

