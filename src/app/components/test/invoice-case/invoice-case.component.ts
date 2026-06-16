import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { InvoiceCaseService } from '../../../services/invoice-case.service';
import { ToastService } from '../../../services/toast.service';
import { SettingsService } from '../../../services/settings.service';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';

@Component({
  selector: 'app-invoice-case',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchableDropdownComponent, DecimalOnlyDirective],
  templateUrl: './invoice-case.component.html',
  styleUrls: ['./invoice-case.component.css']
})
export class InvoiceCaseComponent implements OnInit {
  invoiceCaseForm!: FormGroup;
  isViewMode = false;
  isEditMode = false;
  invoiceId = 0;

  financialYears: any[] = [];
  activeVersionIndex = 0;

  // Lab test context — used to seed price rows for newly added year versions
  labTestConfigs: any[] = [];
  subGroupName = '';

  pricingTypeOptions = [
    { value: 'Element', label: 'Parameter Count' },
    { value: 'SizeLoad', label: 'Size + Load' },
    { value: 'SizeAndLoad', label: 'Size + Load Range' },
    { value: 'FlatRate', label: 'Flat Rate' },
  ];

  constructor(
    private fb: FormBuilder,
    private labTestService: LaboratoryTestService,
    private invoiceService: InvoiceCaseService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.invoiceId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };
    if (state?.mode === 'view') this.isViewMode = true;
    if (state?.mode === 'edit') this.isEditMode = true;

    this.initForm();
    this.loadFinancialYears();
  }

  initForm(): void {
    this.invoiceCaseForm = this.fb.group({
      laboratoryTestID: [null, Validators.required],
      versions: this.fb.array([])
    });
  }

  loadFinancialYears(): void {
    this.settingsService.getFinancialYearsDropdown().subscribe({
      next: (list) => {
        this.financialYears = list || [];
        if (this.invoiceId > 0) {
          this.resolveLabTestForEdit(this.invoiceId);
        }
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to load financial years', 'error')
    });
  }

  // The list passes an InvoiceCase row id; the form manages all year-versions for its
  // LaboratoryTest, so resolve the lab test first then load every version.
  private resolveLabTestForEdit(invoiceCaseId: number): void {
    this.invoiceService.getInvoiceCaseById(invoiceCaseId).subscribe({
      next: (response) => {
        const labTestId = response?.laboratoryTestID;
        if (!labTestId) {
          this.toastService.show('Invoice case has no linked Sub Group Test.', 'error');
          return;
        }
        this.invoiceCaseForm.patchValue({ laboratoryTestID: labTestId });
        this.loadLabTestConfigs(labTestId, true);
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to load invoice case', 'error')
    });
  }

  get versions(): FormArray {
    return this.invoiceCaseForm.get('versions') as FormArray;
  }

  pricesOf(versionIndex: number): FormArray {
    return this.versions.at(versionIndex).get('prices') as FormArray;
  }

  // ── Financial-year helpers ──
  get defaultFinancialYearId(): number | null {
    return this.financialYears.find(fy => fy.isCurrent)?.id ?? null;
  }

  getVersionFyLabel(versionIndex: number): string {
    const fyId = this.versions.at(versionIndex).get('financialYearId')?.value;
    return this.financialYears.find(fy => fy.id === fyId)?.year || '—';
  }

  isCurrentVersion(versionIndex: number): boolean {
    const fyId = this.versions.at(versionIndex).get('financialYearId')?.value;
    return fyId != null && fyId === this.defaultFinancialYearId;
  }

  // FY selected → warn if already used, revert; else auto-fill Effective From.
  onVersionFyChange(versionIndex: number): void {
    const vg = this.versions.at(versionIndex);
    const selectedFyId = vg.get('financialYearId')?.value;
    const duplicate = this.versions.controls.some(
      (v, i) => i !== versionIndex && v.get('financialYearId')?.value === selectedFyId
    );
    if (duplicate) {
      this.toastService.show('This financial year is already added. Please select a different year.', 'error');
      vg.get('financialYearId')?.setValue(null);
      vg.get('effectiveFrom')?.setValue('');
      return;
    }
    const fy = this.financialYears.find(f => f.id === selectedFyId);
    if (fy?.startDate) {
      vg.get('effectiveFrom')?.setValue(this.toDateInput(fy.startDate));
    }
  }

  // ── FormGroup builders ──
  private buildPriceGroup(p: any): FormGroup {
    return this.fb.group({
      id: [p?.id ?? 0],
      invoiceCaseConfigID: [p?.invoiceCaseConfigID ?? null],
      name: [p?.name ?? ''],
      aliasName: [p?.aliasName ?? '', Validators.required],
      price: [p?.price ?? 0, [Validators.required, Validators.min(0.01)]]
    });
  }

  private buildVersionGroup(v: any): FormGroup {
    const prices = (v?.prices ?? []).map((p: any) => this.buildPriceGroup(p));
    return this.fb.group({
      id: [v?.id ?? 0],
      financialYearId: [v?.financialYearId ?? null, Validators.required],
      effectiveFrom: [this.toDateInput(v?.effectiveFrom), Validators.required],
      defaultPricingType: [v?.defaultPricingType ?? null],
      prices: this.fb.array(prices)
    });
  }

  private toDateInput(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  }

  // ── Load existing versions for a lab test ──
  loadVersions(labTestId: number): void {
    this.invoiceService.getByLabTest(labTestId).subscribe({
      next: (response) => {
        this.versions.clear();
        // Deduplicate by financialYearId — keep the one with the latest effectiveFrom.
        const raw: any[] = response?.versions ?? [];
        const fyMap = new Map<any, any>();
        raw.forEach(v => {
          const key = v.financialYearId ?? v.id;
          const existing = fyMap.get(key);
          if (!existing || new Date(v.effectiveFrom) > new Date(existing.effectiveFrom)) {
            fyMap.set(key, v);
          }
        });
        const deduped = Array.from(fyMap.values());
        deduped.forEach((v: any) => this.versions.push(this.buildVersionGroup(v)));

        if (this.versions.length === 0) {
          this.addYear();
        } else {
          // Pre-select the default-FY version, else the first (newest) tab
          const idx = deduped.findIndex(v => v.isCurrentFy);
          this.activeVersionIndex = idx >= 0 ? idx : 0;
        }

        if (this.isViewMode) this.invoiceCaseForm.disable();
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to load invoice case prices', 'error')
    });
  }

  // ── Lab test selection ──
  getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.labTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  onLaboratorySelected(item: any): void {
    if (!item) {
      this.invoiceCaseForm.patchValue({ laboratoryTestID: null });
      this.versions.clear();
      this.labTestConfigs = [];
      this.subGroupName = '';
      return;
    }
    this.invoiceCaseForm.patchValue({ laboratoryTestID: item.id });
    this.loadLabTestConfigs(item.id, true);
  }

  // Loads the lab test's invoice-case configs (the price-row template).
  // seedFirstYear=true → after configs load, also load existing versions / seed one.
  private loadLabTestConfigs(labTestId: number, seedFirstYear: boolean): void {
    this.labTestService.getLaboratoryTestById(labTestId).subscribe({
      next: (response) => {
        this.subGroupName = response?.subGroup ?? '';
        this.labTestConfigs = response?.invoiceCases ?? [];
        if (seedFirstYear) {
          this.loadVersions(labTestId);
        }
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to load test configuration', 'error')
    });
  }

  // Builds price rows for a brand-new year version from the lab test's configs.
  private buildPriceRowsFromConfigs(): any[] {
    return this.labTestConfigs.map((c: any) => ({
      id: 0,
      invoiceCaseConfigID: c?.invoiceCaseConfigID,
      name: `${this.subGroupName} - ${c?.invoiceCaseConfiguration?.name ?? ''}`,
      aliasName: c?.invoiceCaseConfiguration?.name ?? '',
      price: 0
    }));
  }

  // ── Year version actions ──
  addYear(): void {
    const usedFyIds = new Set(this.versions.controls.map(v => v.get('financialYearId')?.value));
    const pick = this.financialYears.find(fy => !usedFyIds.has(fy.id));
    if (!pick) {
      this.toastService.show('All available financial years are already added.', 'warning');
      return;
    }
    this.versions.push(this.buildVersionGroup({
      id: 0,
      financialYearId: pick.id,
      effectiveFrom: pick.startDate ?? null,
      defaultPricingType: null,
      prices: this.buildPriceRowsFromConfigs()
    }));
    this.activeVersionIndex = this.versions.length - 1;
  }

  removeYear(index: number): void {
    if (this.versions.length === 1) {
      this.toastService.show('At least one year version is required.', 'error');
      return;
    }
    this.versions.removeAt(index);
    if (this.activeVersionIndex >= this.versions.length) {
      this.activeVersionIndex = this.versions.length - 1;
    }
  }

  selectVersion(index: number): void {
    this.activeVersionIndex = index;
  }

  // ── Save ──
  submit(): void {
    if (this.invoiceCaseForm.invalid) {
      this.invoiceCaseForm.markAllAsTouched();
      this.toastService.show('Please fill all required fields before saving.', 'error');
      return;
    }
    if (this.versions.length === 0) {
      this.toastService.show('Add at least one year version.', 'error');
      return;
    }

    // No two versions may share the same Effective From date
    const dates = this.versions.controls.map(v => v.get('effectiveFrom')?.value);
    if (new Set(dates).size !== dates.length) {
      this.toastService.show('Two year versions have the same Effective From date.', 'error');
      return;
    }

    const raw = this.invoiceCaseForm.getRawValue();
    const payload = {
      laboratoryTestID: raw.laboratoryTestID,
      versions: raw.versions.map((v: any) => ({
        id: v.id,
        financialYearId: v.financialYearId,
        effectiveFrom: v.effectiveFrom,
        defaultPricingType: v.defaultPricingType,
        prices: v.prices.map((p: any) => ({
          id: p.id,
          invoiceCaseConfigID: p.invoiceCaseConfigID,
          name: p.name,
          aliasName: p.aliasName,
          price: p.price
        }))
      }))
    };

    this.invoiceService.saveAll(payload).subscribe({
      next: (response) => {
        this.toastService.show(response.message, 'success');
        this.router.navigate(['/invoice-case']);
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to save invoice case prices', 'error')
    });
  }
}
