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

  isChemicalTest = false;
  subGroups: any[] = [];
  selectedAnalysisTypeId: number | null = null;
  selectedAnalysisTypeName = '';
  selectedLaboratoryTestName = '';

  getDefaultPricingTypeOptions(versionIndex: number): any[] {
    const pricesCtrl = this.pricesOf(versionIndex);
    if (!pricesCtrl) return [];

    const types = new Set<string>();
    pricesCtrl.controls.forEach(ctrl => {
      const st = ctrl.get('selectionType')?.value;
      if (st) types.add(st);
    });

    const options: { value: string; label: string }[] = [];
    types.forEach(t => {
      options.push({ value: t, label: `${t} (Dimension Type)` });
    });

    pricesCtrl.controls
      .map(ctrl => ctrl.get('name')?.value)
      .filter(Boolean)
      .forEach(name => {
        if (!types.has(name)) {
          options.push({ value: name, label: `${name}` });
        }
      });

    return options;
  }

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
      analysisTypeID: [null],
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
        const analysisTypeId = response?.analysisTypeID;
        if (!labTestId) {
          this.toastService.show('Invoice case has no linked Sub Group Test.', 'error');
          return;
        }
        this.invoiceCaseForm.patchValue({
          laboratoryTestID: labTestId,
          analysisTypeID: analysisTypeId
        });
        this.selectedAnalysisTypeId = analysisTypeId || null;

        // Fetch test details to load chemical state and subgroups
        this.labTestService.getLaboratoryTestById(labTestId).subscribe({
          next: (test) => {
            this.isChemicalTest = test?.isChemicalTest || false;
            this.subGroups = test?.subGroups || [];

            this.loadLabTestConfigsAndVersions(labTestId, analysisTypeId, true);
          },
          error: (err) => {
            this.toastService.show(err?.error?.message || 'Failed to check test details', 'error');
            // Fallback load configs/versions anyway
            this.loadLabTestConfigsAndVersions(labTestId, analysisTypeId, true);
          }
        });
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
      configName: [p?.configName ?? ''],
      aliasName: [p?.aliasName ?? '', Validators.required],
      price: [p?.price ?? 0, [Validators.required, Validators.min(0)]],
      elementPrices: [p?.elementPrices ?? null],
      isOverride: [p?.isOverride ?? false],
      overrideParameterIDs: [p?.overrideParameterIDs ?? null],
      overrideParameterNames: [p?.overrideParameterNames ?? ''],
      groupName: [p?.groupName ?? ''],
      groupType: [p?.groupType ?? ''],
      selectionType: [p?.selectionType ?? ''],
      configValue: [p?.configValue ?? ''],
      isBaseConfig: [p?.isBaseConfig ?? false]
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
  loadVersions(labTestId: number, analysisTypeId: number | null): void {
    this.invoiceService.getByLabTest(labTestId, analysisTypeId ?? undefined).subscribe({
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
        deduped.forEach((v: any) => {
          const existingPrices = v.prices ?? [];
          const mergedPrices = this.labTestConfigs.map((meta: any) => {
            const existingPrice = existingPrices.find((p: any) => p.invoiceCaseConfigID === meta.invoiceCaseConfigID);
            return {
              id: existingPrice?.id ?? 0,
              invoiceCaseConfigID: meta.invoiceCaseConfigID,
              name: meta.groupName ? `${meta.groupName} — ${meta.configName}` : meta.configName,
              configName: meta.configName ?? '',
              aliasName: existingPrice?.aliasName ?? meta.configName ?? '',
              price: existingPrice?.price ?? 0,
              elementPrices: existingPrice?.elementPrices ?? null,
              isOverride: meta.isOverride ?? false,
              overrideParameterIDs: meta.overrideParameterIDs ?? null,
              overrideParameterNames: meta.overrideParameterNames ?? '',
              groupName: meta.groupName ?? '',
              groupType: meta.groupType ?? '',
              selectionType: meta.selectionType ?? '',
              configValue: meta.configValue ?? '',
              isBaseConfig: meta.isBaseConfig ?? false
            };
          });
          v.prices = mergedPrices;
          this.versions.push(this.buildVersionGroup(v));
        });

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
      this.invoiceCaseForm.patchValue({
        laboratoryTestID: null,
        analysisTypeID: null
      });
      this.versions.clear();
      this.labTestConfigs = [];
      this.subGroupName = '';
      this.isChemicalTest = false;
      this.subGroups = [];
      this.selectedAnalysisTypeId = null;
      this.selectedAnalysisTypeName = '';
      this.selectedLaboratoryTestName = '';
      return;
    }
    this.selectedLaboratoryTestName = item.name || '';
    this.invoiceCaseForm.patchValue({
      laboratoryTestID: item.id,
      analysisTypeID: null
    });
    this.selectedAnalysisTypeId = null;
    this.selectedAnalysisTypeName = '';

    // Fetch test details to check if isChemicalTest
    this.labTestService.getLaboratoryTestById(item.id).subscribe({
      next: (test) => {
        this.isChemicalTest = test?.isChemicalTest || false;
        this.subGroups = test?.subGroups || [];

        if (this.isChemicalTest) {
          // Chemical test -> clear versions, wait for user to select AnalysisType
          this.versions.clear();
          this.labTestConfigs = [];
        } else {
          // Non-chemical -> load configs and versions directly
          this.loadLabTestConfigsAndVersions(item.id, null, true);
        }
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Failed to check test details', 'error');
        // Fallback load configs/versions directly
        this.loadLabTestConfigsAndVersions(item.id, null, true);
      }
    });
  }

  selectAnalysisType(at: any): void {
    if (this.isViewMode) return;
    this.selectedAnalysisTypeId = at.id;
    this.selectedAnalysisTypeName = at.name || '';
    this.invoiceCaseForm.patchValue({ analysisTypeID: at.id });

    const labTestId = this.invoiceCaseForm.get('laboratoryTestID')?.value;
    if (labTestId) {
      this.loadLabTestConfigsAndVersions(labTestId, at.id, true);
    }
  }

  // Loads the lab test's invoice-case configs (the price-row template).
  // seedFirstYear=true → after configs load, also load existing versions / seed one.
  private loadLabTestConfigsAndVersions(labTestId: number, analysisTypeId: number | null, seedFirstYear: boolean): void {
    this.labTestService.getPricingTemplate(labTestId, analysisTypeId ?? undefined).subscribe({
      next: (rows: any[]) => {
        this.labTestConfigs = rows;
        if (seedFirstYear) {
          this.loadVersions(labTestId, analysisTypeId);
        }
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to load pricing template', 'error')
    });
  }

  // Builds price rows for a brand-new year version from the lab test's configs.
  private buildPriceRowsFromConfigs(): any[] {
    return this.labTestConfigs.map((c: any) => ({
      id: 0,
      invoiceCaseConfigID: c?.invoiceCaseConfigID,
      name: c?.groupName ? `${c.groupName} — ${c.configName}` : c.configName,
      configName: c?.configName ?? '',
      aliasName: c?.configName ?? '',
      price: 0,
      elementPrices: null,
      isOverride: c?.isOverride ?? false,
      overrideParameterIDs: c?.overrideParameterIDs ?? null,
      overrideParameterNames: c?.overrideParameterNames ?? '',
      groupName: c?.groupName ?? '',
      groupType: c?.groupType ?? '',
      selectionType: c?.selectionType ?? '',
      configValue: c?.configValue ?? '',
      isBaseConfig: c?.isBaseConfig ?? false
    }));
  }

  // ── Year version actions ──
  addYear(): void {
    const usedFyIds = new Set(this.versions.controls.map(v => v.get('financialYearId')?.value));
    
    // Pick current default financial year first if not already added
    const currentFyId = this.defaultFinancialYearId;
    let pick = this.financialYears.find(fy => fy.id === currentFyId && !usedFyIds.has(fy.id));
    
    if (!pick) {
      pick = this.financialYears.find(fy => !usedFyIds.has(fy.id));
    }
    
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

    if (this.isChemicalTest && !this.selectedAnalysisTypeId) {
      this.toastService.show('Please select an Analysis Type before saving.', 'error');
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
      analysisTypeID: this.selectedAnalysisTypeId,
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
          price: p.price,
          elementPrices: p.elementPrices
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

  isBaseTierRow(versionIndex: number, priceIndex: number): boolean {
    const ctrl = this.pricesOf(versionIndex)?.at(priceIndex);
    if (!ctrl) return false;
    const val = (ctrl.get('configValue')?.value || '').toString().trim().toUpperCase();
    return ctrl.get('isBaseConfig')?.value === true || val === 'BASE';
  }

  getBaseTypeInfo(versionIndex: number, priceIndex: number): {
    badgeText: string;
    subText: string;
    typeClass: string;
    icon: string;
    tooltip: string;
  } {
    const ctrl = this.pricesOf(versionIndex)?.at(priceIndex);
    if (!ctrl) {
      return { badgeText: 'Standard', subText: 'Standard Price', typeClass: 'badge-default', icon: 'bi-tag', tooltip: 'Standard rate' };
    }

    const selType = ctrl.get('selectionType')?.value || '';
    const val = (ctrl.get('configValue')?.value || '').toString().trim();
    const isBase = ctrl.get('isBaseConfig')?.value === true || val.toUpperCase() === 'BASE';
    const isOverride = ctrl.get('isOverride')?.value === true;
    const name = ctrl.get('name')?.value || '';

    // 1. Base Tier
    if (isBase) {
      return {
        badgeText: 'Base Tier',
        subText: selType ? `${selType} • Full Matrix` : 'Primary Standard',
        typeClass: 'badge-base-tier',
        icon: 'bi-shield-check',
        tooltip: 'Primary Base Tier — standard comprehensive test method coverage'
      };
    }

    // 2. Chemical Special Elements Surcharge
    if (val.toUpperCase() === 'SPECIAL' || (selType === 'ChemicalElement' && name.includes('Special Elements'))) {
      return {
        badgeText: 'Special Surcharge',
        subText: 'N, B, Ca (+₹/element)',
        typeClass: 'badge-surcharge-special',
        icon: 'bi-lightning-fill',
        tooltip: 'Surcharge for special elements (Nitrogen, Boron, Calcium)'
      };
    }

    // 3. Chemical Super Special Elements Surcharge
    if (val.toUpperCase() === 'SUPER' || (selType === 'ChemicalElement' && name.includes('Super Special'))) {
      return {
        badgeText: 'Super Special',
        subText: 'Zr, Nb, Pt, Au (+₹/element)',
        typeClass: 'badge-surcharge-super',
        icon: 'bi-gem',
        tooltip: 'Surcharge for super special elements (Zirconium, Niobium, Precious Metals)'
      };
    }

    // 4. Element Count Slab
    if (selType === 'ChemicalElement' || selType === 'Element' || selType === 'ElementCountFormula') {
      if (val && val !== 'OVERRIDE' && val !== 'Flat') {
        const displayVal = val.startsWith('<=') || val.startsWith('>=') ? val : `≤ ${val}`;
        return {
          badgeText: `Element Slab (${displayVal})`,
          subText: `${selType} Count`,
          typeClass: 'badge-slab',
          icon: 'bi-layers-half',
          tooltip: `Count-based slab pricing: applies when active parameters match ${displayVal}`
        };
      }
    }

    // 5. Flat Rate
    if (selType === 'FlatRate') {
      return {
        badgeText: 'Flat Rate',
        subText: 'Fixed Price',
        typeClass: 'badge-flat',
        icon: 'bi-tag-fill',
        tooltip: 'Fixed flat price per sample / test'
      };
    }

    // 6. Range Types (SizeRange, LoadRange, TemperatureRange, HoursRange)
    if (selType.includes('Range')) {
      return {
        badgeText: `${selType.replace('Range', '')} Range`,
        subText: val || 'Condition Range',
        typeClass: 'badge-range',
        icon: 'bi-arrows-expand',
        tooltip: `Evaluated dynamically based on sample specifications (${selType})`
      };
    }

    // 7. Single Dimension Types (Size, Load, Temperature, Hours, DayWise)
    if (['Size', 'Load', 'Temperature', 'Hours', 'DayWise'].includes(selType)) {
      return {
        badgeText: `${selType} Condition`,
        subText: val ? `${val}` : 'Specific Value',
        typeClass: 'badge-dimension',
        icon: 'bi-sliders',
        tooltip: `Condition matched on ${selType}`
      };
    }

    // 8. Quantity / Unit-based (PerIndent, PerLocation, PerField, PerDolly, WithImage, WithExtenso)
    if (['PerIndent', 'PerLocation', 'PerField', 'PerDolly', 'WithImage', 'WithExtenso'].includes(selType)) {
      return {
        badgeText: `Unit (${selType})`,
        subText: 'Variable Count',
        typeClass: 'badge-qty',
        icon: 'bi-123',
        tooltip: `Pricing per unit/reading: ${selType}`
      };
    }

    // Fallback
    return {
      badgeText: selType || 'Standard',
      subText: isOverride ? 'Override Row' : 'Standard Rule',
      typeClass: isOverride ? 'badge-surcharge-special' : 'badge-default',
      icon: isOverride ? 'bi-sliders' : 'bi-info-circle',
      tooltip: isOverride ? 'Override rule with custom element rates' : 'Standard configuration rule'
    };
  }

  isOverrideRow(versionIndex: number, priceIndex: number): boolean {
    return !!this.pricesOf(versionIndex).at(priceIndex).get('isOverride')?.value;
  }

  getOverrideHint(versionIndex: number, priceIndex: number): string {
    const names = this.pricesOf(versionIndex).at(priceIndex).get('overrideParameterNames')?.value;
    if (!names) {
      const ids = this.pricesOf(versionIndex).at(priceIndex).get('overrideParameterIDs')?.value;
      if (!ids) {
        return 'Wildcard — applies to all special/super elements not matched by a specific override';
      }
      return `Specific override for element IDs: ${ids}`;
    }
    return `Specific override for elements: ${names}`;
  }

  getOverrideText(versionIndex: number, priceIndex: number): string {
    const names = this.pricesOf(versionIndex).at(priceIndex).get('overrideParameterNames')?.value;
    if (names) {
      return `Override (${names})`;
    }
    const ids = this.pricesOf(versionIndex).at(priceIndex).get('overrideParameterIDs')?.value;
    if (ids) {
      return `Override (IDs: ${ids})`;
    }
    return 'Override (All Elements)';
  }

  getOverrideParamIdsList(versionIndex: number, priceIndex: number): string[] {
    const ids = this.pricesOf(versionIndex).at(priceIndex).get('overrideParameterIDs')?.value;
    if (!ids) return [];
    return ids.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  isElementWiseMode(versionIndex: number, priceIndex: number): boolean {
    const elementPrices = this.pricesOf(versionIndex).at(priceIndex).get('elementPrices')?.value;
    return !!elementPrices;
  }

  toggleElementWiseMode(versionIndex: number, priceIndex: number): void {
    const ctrl = this.pricesOf(versionIndex).at(priceIndex).get('elementPrices');
    if (ctrl?.value) {
      ctrl.setValue(null);
    } else {
      const ids = this.getOverrideParamIdsList(versionIndex, priceIndex);
      const dict: { [key: string]: number } = {};
      if (ids.length > 0) {
        // Case B: specific parameters
        ids.forEach(id => {
          dict[id] = 0;
        });
      } else {
        // Case A: normal, special, super
        dict['normal'] = 0;
        dict['special'] = 0;
        dict['super'] = 0;
      }
      ctrl?.setValue(JSON.stringify(dict));
    }
  }

  getElementWiseList(versionIndex: number, priceIndex: number): any[] {
    const pricesCtrl = this.pricesOf(versionIndex).at(priceIndex);
    const elementPricesStr = pricesCtrl.get('elementPrices')?.value;
    if (!elementPricesStr) return [];
    try {
      const dict = JSON.parse(elementPricesStr);
      const ids = this.getOverrideParamIdsList(versionIndex, priceIndex);
      if (ids.length > 0) {
        // Case B: specific elements
        const namesStr = pricesCtrl.get('overrideParameterNames')?.value || '';
        const names = namesStr.split(',').map((s: string) => s.trim()).filter(Boolean);
        return ids.map((id, idx) => ({
          id: id,
          name: names[idx] || `Element #${id}`,
          price: dict[id] ?? 0
        }));
      } else {
        // Case A: wildcard/types
        return [
          { id: 'normal', name: 'Normal Element', price: dict['normal'] ?? 0 },
          { id: 'special', name: 'Special Element', price: dict['special'] ?? 0 },
          { id: 'super', name: 'Super Special Element', price: dict['super'] ?? 0 }
        ];
      }
    } catch {
      return [];
    }
  }

  updateElementPriceValue(versionIndex: number, priceIndex: number, elementKey: string, event: any): void {
    const ctrl = this.pricesOf(versionIndex).at(priceIndex).get('elementPrices');
    if (!ctrl) return;
    const value = parseFloat(event.target.value) || 0;
    try {
      const dict = ctrl.value ? JSON.parse(ctrl.value) : {};
      dict[elementKey] = value;
      ctrl.setValue(JSON.stringify(dict));
    } catch {
      const dict: { [key: string]: number } = {};
      dict[elementKey] = value;
      ctrl.setValue(JSON.stringify(dict));
    }
  }

  trackByElementId(index: number, item: any): string {
    return item.id;
  }
}
