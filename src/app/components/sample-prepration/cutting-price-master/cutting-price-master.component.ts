import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { Modal } from 'bootstrap';
import { ToastService } from '../../../services/toast.service';
import { CuttingPriceMasterService } from '../../../services/cutting-price-master.service';
import { SpecimenTypeService } from '../../../services/specimen-type.service';
import { SettingsService } from '../../../services/settings.service';
import { Observable } from 'rxjs';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { SearchableDropdownModalComponent } from '../../../utility/components/searchable-dropdown-modal/searchable-dropdown-modal.component';

@Component({
  selector: 'app-cutting-price-master',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DecimalOnlyDirective, SearchableDropdownModalComponent, PaginationComponent],
  templateUrl: './cutting-price-master.component.html',
  styleUrl: './cutting-price-master.component.css'
})
export class CuttingPriceMasterComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'cuttingType', type: 'string', label: 'Cutting Type', filter: true },
    { key: 'unitType', type: 'string', label: 'Unit Type', filter: true },
    { key: 'specimenTypeName', type: 'string', label: 'Specimen Type', filter: true },
    { key: 'sizeRange', type: 'string', label: 'Size Range (mm)', filter: false },
    // { key: 'currentRatePerUnit', type: 'number', label: 'Normal Rate (₹)', filter: true },
    // { key: 'currentRatePerUnitHard', type: 'number', label: 'Hard Rate (₹)', filter: true },
    { key: 'versionCount', type: 'number', label: 'Years', filter: false },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    specimenTypeName: 'string',
    cuttingType: 'string',
    unitType: 'string',
    currentRatePerUnit: 'number',
    currentRatePerUnitHard: 'number'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  listData: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  sortByColumn: string = 'modifiedOn';
  sortOrder: string = 'desc';
  searchTerm: string = '';

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  // form
  cuttingPriceForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  cuttingPriceId: number = 0;
  formTitle = 'Cutting Price Master Form';

  unitTypes = ['Per Cut', 'Per Minute', 'Per Sample', 'Job Dependent'];

  selectedSpecimenTypeId: number = 0;

  financialYears: any[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private cuttingPriceService: CuttingPriceMasterService,
    private toastService: ToastService,
    private specimenTypeService: SpecimenTypeService,
    private settingsService: SettingsService
  ) {
    this.route.params.subscribe(params => {
      this.cuttingPriceId = params['id'] || 0;
      if (this.cuttingPriceId > 0) {
        this.getDetails();
      }
    });
  }

  ngOnInit() {
    this.fetchData();
    this.initForm();
    this.loadFinancialYears();
  }

  initForm() {
    this.cuttingPriceForm = this.fb.group({
      id: [0],
      specimenTypeId: [null],
      cuttingType: ['', Validators.required],
      unitType: ['', Validators.required],
      sizeRangeMin: [null, [Validators.min(0)]],
      sizeRangeMax: [null, [Validators.min(0)]],
      remark: [''],
      versions: this.fb.array([])
    });
    this.selectedSpecimenTypeId = 0;
  }

  loadFinancialYears() {
    this.settingsService.getFinancialYearsDropdown().subscribe({
      next: (data) => { this.financialYears = data || []; },
      error: () => { this.financialYears = []; }
    });
  }

  get versions(): FormArray {
    return this.cuttingPriceForm.get('versions') as FormArray;
  }

  createVersionGroup(v?: any): FormGroup {
    return this.fb.group({
      id: [v?.id || 0],
      financialYearId: [v?.financialYearId ?? null, Validators.required],
      effectiveFrom: [v?.effectiveFrom ? String(v.effectiveFrom).substring(0, 10) : '', Validators.required],
      ratePerUnit: [v?.ratePerUnit ?? 0, [Validators.required, Validators.min(0)]],
      ratePerUnitHard: [v?.ratePerUnitHard ?? 0, [Validators.required, Validators.min(0)]]
    });
  }

  // FY selected → auto-fill Effective From with that FY's start date (user can edit after).
  onVersionFyChange(index: number): void {
    const vg = this.versions.at(index);
    const selectedFyId = vg.get('financialYearId')?.value;
    // Block duplicate financial year — revert this row if the FY is already used elsewhere.
    const isDuplicate = this.versions.controls.some((c, i) => i !== index && c.get('financialYearId')?.value === selectedFyId);
    if (isDuplicate) {
      this.toastService.show('This financial year is already added.', 'error');
      vg.get('financialYearId')?.setValue(null);
      vg.get('effectiveFrom')?.setValue('');
      return;
    }
    const fy = this.financialYears.find(f => f.id === selectedFyId);
    if (fy?.startDate) {
      vg.get('effectiveFrom')?.setValue(String(fy.startDate).substring(0, 10));
    }
  }

  // Min/max bounds for the Effective From date input — confined to the selected FY range.
  getFyStart(index: number): string | null {
    const fy = this.financialYears.find(f => f.id === this.versions.at(index).get('financialYearId')?.value);
    return fy?.startDate ? String(fy.startDate).substring(0, 10) : null;
  }
  getFyEnd(index: number): string | null {
    const fy = this.financialYears.find(f => f.id === this.versions.at(index).get('financialYearId')?.value);
    return fy?.endDate ? String(fy.endDate).substring(0, 10) : null;
  }

  private hasEffectiveFromOutsideFy(): boolean {
    return this.versions.controls.some(c => {
      const fy = this.financialYears.find(f => f.id === c.get('financialYearId')?.value);
      const eff = c.get('effectiveFrom')?.value;
      if (!fy?.startDate || !fy?.endDate || !eff) return false;
      const d = String(eff).substring(0, 10);
      return d < String(fy.startDate).substring(0, 10) || d > String(fy.endDate).substring(0, 10);
    });
  }

  addVersion(): void {
    // Pick a financial year not already used by another version, so each row is distinct.
    const usedFyIds = new Set(this.versions.controls.map(v => v.get('financialYearId')?.value));
    const pick = this.financialYears.find(f => !usedFyIds.has(f.id));
    if (!pick) {
      this.toastService.show('All financial years have already been added.', 'warning');
      return;
    }
    this.versions.push(this.createVersionGroup({
      financialYearId: pick.id,
      effectiveFrom: pick.startDate ?? null
    }));
    this.cuttingPriceForm.markAsDirty();
  }

  removeVersion(index: number): void {
    this.versions.removeAt(index);
    this.cuttingPriceForm.markAsDirty();
  }

  fetchData() {
    this.cuttingPriceService.getAllCuttingPriceMasters(this.payload).subscribe({
      next: (response) => {
        this.listData = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.listData = [];
      }
    });
  }

  getDetails(): void {
    const requestId = this.cuttingPriceId;
    this.cuttingPriceService.getCuttingPriceMasterById(requestId).subscribe({
      next: (response) => {
        if (this.cuttingPriceId !== requestId) return; // discard stale response
        this.cuttingPriceForm.patchValue({
          id: response.id,
          specimenTypeId: response.specimenTypeId,
          cuttingType: response.cuttingType,
          unitType: response.unitType,
          sizeRangeMin: response.sizeRangeMin,
          sizeRangeMax: response.sizeRangeMax,
          remark: response.remark
        });
        this.selectedSpecimenTypeId = response.specimenTypeId || 0;
        this.versions.clear();
        (response.versions || []).forEach((v: any) => this.versions.push(this.createVersionGroup(v)));
        if (this.versions.length === 0) this.versions.push(this.createVersionGroup());
        if (this.isViewMode) this.cuttingPriceForm.disable();
      },
      error: (error) => {
        this.toastService.show(error?.message || 'Error fetching record.', 'error');
      }
    });
  }

  applySorting(column: string) {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.fetchData();
  }

  openFilterModal(column: string, event: MouseEvent) {
    this.filterColumn = column;
    this.columns.forEach(col => {
      if (col.key === column) {
        this.filterColumnTitle = col.label;
      }
    });
    this.filterValue = '';
    this.filterValue2 = '';

    const columnType = this.filterColumnTypes[column];
    switch (columnType) {
      case 'string':
        this.filterType = 'Contains';
        break;
      case 'number':
        this.filterType = 'Equal';
        break;
      case 'date':
        this.filterType = 'Between';
        break;
      default:
        this.filterType = 'Contains';
    }

    this.isFilterOpen = true;
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;

      requestAnimationFrame(() => {
        const modalRect = modal.getBoundingClientRect();
        if (modalRect.right > window.innerWidth) {
          modal.style.left = `${window.innerWidth - modalRect.width - 10 + window.scrollX}px`;
        }
        if (modalRect.bottom > window.innerHeight) {
          modal.style.top = `${rect.top + window.scrollY - modalRect.height - 5}px`;
        }
      });
    }
  }

  applyFilter() {
    if (!this.filterColumn || this.filterValue === '') return;

    const existingFilterIndex = this.filters.findIndex(f => f.column === this.filterColumn);
    const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };

    if (existingFilterIndex > -1) {
      this.filters[existingFilterIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }

    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string) {
    this.filters = this.filters.filter(filter => filter.column !== column);
    this.payload.filter = this.filters;
    this.fetchData();
  }

  closeFilterModal() {
    if (this.filterModal) {
      this.filterModal.nativeElement.style.display = 'none';
    }
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.payload.PageNumber = this.pageNumber;
    this.fetchData();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
  }

  onSearch() {
    if (this.searchTerm !== this.payload.searchTerm) {
      this.pageNumber = 1;
      this.payload.PageNumber = 1;
      this.payload.searchTerm = this.searchTerm;
      this.fetchData();
    }
  }

  get totalPages(): number[] {
    return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
  }
  getStartRecord(): number {
    return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }

  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }
  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.type : undefined;
  }

  deleteFn(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      this.cuttingPriceService.deleteCuttingPriceMaster(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error.message, 'error');
        }
      });
    }
  }

  openModal(type: string, id: number): void {
    this.initForm();
    this.cuttingPriceId = 0;
    if (id > 0) {
      this.cuttingPriceId = id;
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Cutting Price Master Form';
      this.versions.push(this.createVersionGroup());
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Cutting Price Master Form';
      this.getDetails();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Cutting Price Master';
      this.getDetails();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.initForm();
    this.cuttingPriceId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  private hasDuplicateFinancialYear(): boolean {
    const fyIds = this.versions.controls
      .map(c => c.get('financialYearId')?.value)
      .filter(v => v != null);
    return new Set(fyIds).size !== fyIds.length;
  }

  private hasDuplicateEffectiveFrom(): boolean {
    const dates = this.versions.controls
      .map(c => c.get('effectiveFrom')?.value)
      .filter(v => !!v);
    return new Set(dates).size !== dates.length;
  }

  onSubmit(): void {
    if (this.cuttingPriceForm.invalid) {
      this.cuttingPriceForm.markAllAsTouched();
      return;
    }
    if (this.versions.length === 0) {
      this.toastService.show('At least one rate version is required.', 'error');
      return;
    }
    if (this.hasDuplicateFinancialYear()) {
      this.toastService.show('Duplicate Financial Year — each financial year can appear only once.', 'error');
      return;
    }
    if (this.hasEffectiveFromOutsideFy()) {
      this.toastService.show('Effective From must fall within the selected financial year.', 'error');
      return;
    }
    if (this.hasDuplicateEffectiveFrom()) {
      this.toastService.show('Duplicate Effective From date — each date can appear only once.', 'error');
      return;
    }

    const formData = this.cuttingPriceForm.getRawValue();
    if (this.isEditMode) {
      this.cuttingPriceService.updateCuttingPriceMaster(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error.message, 'error');
        }
      });
    } else {
      formData.id = 0;
      this.cuttingPriceService.createCuttingPriceMaster(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error.message, 'error');
        }
      });
    }
  }

  fetchSpecimenTypeDropdown = (searchTerm: string, pageNumber: number, pageSize: number): Observable<any[]> => {
    return this.specimenTypeService.getSpecimenTypeDropdown(searchTerm, pageNumber, pageSize);
  };

  onSpecimenTypeSelected(item: any): void {
    this.cuttingPriceForm.patchValue({ specimenTypeId: item?.id || null });
    this.selectedSpecimenTypeId = item?.id || 0;
  }
}
