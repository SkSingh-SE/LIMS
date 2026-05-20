import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { Observable } from 'rxjs';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { ToastService } from '../../../services/toast.service';
import { MachiningChargeMasterService } from '../../../services/machining-charge-master.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { SettingsService } from '../../../services/settings.service';
import { SearchableDropdownModalComponent } from '../../../utility/components/searchable-dropdown-modal/searchable-dropdown-modal.component';

@Component({
  selector: 'app-machining-charge-master',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DecimalOnlyDirective, SearchableDropdownModalComponent, PaginationComponent],
  templateUrl: './machining-charge-master.component.html',
  styleUrl: './machining-charge-master.component.css'
})
export class MachiningChargeMasterComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'laboratoryTestName', type: 'string', label: 'Laboratory Test', filter: true },
    { key: 'testMethodSpecificationName', type: 'string', label: 'Test Method Standard', filter: true },
    { key: 'specimenRawMaterialSize', type: 'string', label: 'Raw Material Size', filter: true },
    { key: 'specimenSize', type: 'string', label: 'Specimen Size', filter: true },
    { key: 'currentPriceGeneralMetal', type: 'number', label: 'General Price (₹)', filter: false },
    { key: 'currentPriceHardMetal', type: 'number', label: 'Hard Price (₹)', filter: false },
    { key: 'versionCount', type: 'number', label: 'Years', filter: false },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    laboratoryTestName: 'string',
    testMethodSpecificationName: 'string',
    specimenRawMaterialSize: 'string',
    specimenSize: 'string'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
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

  form!: FormGroup;
  isEditMode = false;
  isViewMode = true;
  recordId = 0;
  formTitle = 'Machining Charge Master Form';

  selectedLabTestId = 0;
  selectedStandardId = 0;
  selectedFile: File | null = null;
  existingFilePath: string | null = null;
  existingFileName: string | null = null;

  financialYears: any[] = [];

  constructor(
    private fb: FormBuilder,
    private service: MachiningChargeMasterService,
    private laboratoryTestService: LaboratoryTestService,
    private testMethodSpecificationService: TestMethodSpecificationService,
    private settingsService: SettingsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.fetchData();
    this.initForm();
    this.loadFinancialYears();
  }

  initForm(): void {
    this.form = this.fb.group({
      id: [0],
      laboratoryTestID: [null, Validators.required],
      testMethodStandardID: [null, Validators.required],
      specimenRawMaterialSize: [''],
      specimenSize: ['', Validators.required],
      remark: [''],
      fileName: [''],
      uploadReferenceID: [null],
      versions: this.fb.array([])
    });
    this.selectedLabTestId = 0;
    this.selectedStandardId = 0;
    this.selectedFile = null;
    this.existingFilePath = null;
    this.existingFileName = null;
  }

  loadFinancialYears(): void {
    this.settingsService.getFinancialYearsDropdown().subscribe({
      next: (data) => { this.financialYears = data || []; },
      error: () => { this.financialYears = []; }
    });
  }

  get versions(): FormArray {
    return this.form.get('versions') as FormArray;
  }

  createVersionGroup(v?: any): FormGroup {
    return this.fb.group({
      id: [v?.id || 0],
      financialYearId: [v?.financialYearId ?? null, Validators.required],
      effectiveFrom: [v?.effectiveFrom ? String(v.effectiveFrom).substring(0, 10) : '', Validators.required],
      priceGeneralMetal: [v?.priceGeneralMetal ?? 0, [Validators.required, Validators.min(0)]],
      priceHardMetal: [v?.priceHardMetal ?? 0, [Validators.required, Validators.min(0)]]
    });
  }

  // FY selected → auto-fill Effective From with that FY's start date (user can edit after).
  onVersionFyChange(index: number): void {
    const vg = this.versions.at(index);
    const fy = this.financialYears.find(f => f.id === vg.get('financialYearId')?.value);
    if (fy?.startDate) {
      vg.get('effectiveFrom')?.setValue(String(fy.startDate).substring(0, 10));
    }
  }

  addVersion(): void {
    // Pick a financial year not already used by another version, so each row is distinct.
    const usedFyIds = new Set(this.versions.controls.map(v => v.get('financialYearId')?.value));
    const pick = this.financialYears.find(f => !usedFyIds.has(f.id))
      || this.financialYears.find(f => f.isCurrent)
      || this.financialYears[0];
    this.versions.push(this.createVersionGroup({
      financialYearId: pick?.id ?? null,
      effectiveFrom: pick?.startDate ?? null
    }));
    this.form.markAsDirty();
  }

  removeVersion(index: number): void {
    this.versions.removeAt(index);
    this.form.markAsDirty();
  }

  fetchData(): void {
    this.service.getAllMachiningChargeMasters(this.payload).subscribe({
      next: (response) => {
        this.listData = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error?.message || 'Error loading records.', 'error');
        this.listData = [];
      }
    });
  }

  getDetails(): void {
    const requestId = this.recordId;
    this.service.getMachiningChargeMasterById(requestId).subscribe({
      next: (response) => {
        if (this.recordId !== requestId) return;
        this.form.patchValue({
          id: response.id,
          laboratoryTestID: response.laboratoryTestID,
          testMethodStandardID: response.testMethodStandardID,
          specimenRawMaterialSize: response.specimenRawMaterialSize,
          specimenSize: response.specimenSize,
          remark: response.remark,
          fileName: response.fileName,
          uploadReferenceID: response.uploadReferenceID
        });
        this.selectedLabTestId = response.laboratoryTestID || 0;
        this.selectedStandardId = response.testMethodStandardID || 0;
        this.existingFilePath = response.drawingFilePath || null;
        this.existingFileName = response.fileName || null;
        this.versions.clear();
        (response.versions || []).forEach((v: any) => this.versions.push(this.createVersionGroup(v)));
        if (this.versions.length === 0) this.versions.push(this.createVersionGroup());
        if (this.isViewMode) this.form.disable();
      },
      error: (error) => {
        this.toastService.show(error?.message || 'Error fetching record.', 'error');
      }
    });
  }

  applySorting(column: string): void {
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

  openFilterModal(column: string, event: MouseEvent): void {
    this.filterColumn = column;
    this.columns.forEach(col => { if (col.key === column) this.filterColumnTitle = col.label; });
    this.filterValue = '';
    this.filterValue2 = '';
    this.filterType = this.filterColumnTypes[column] === 'string' ? 'Contains' : 'Equal';
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

  applyFilter(): void {
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

  resetFilter(column: string): void {
    this.filters = this.filters.filter(filter => filter.column !== column);
    this.payload.filter = this.filters;
    this.fetchData();
  }

  closeFilterModal(): void {
    if (this.filterModal) this.filterModal.nativeElement.style.display = 'none';
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.payload.PageNumber = this.pageNumber;
    this.fetchData();
  }

  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
  }

  onSearch(): void {
    if (this.searchTerm !== this.payload.searchTerm) {
      this.pageNumber = 1;
      this.payload.PageNumber = 1;
      this.payload.searchTerm = this.searchTerm;
      this.fetchData();
    }
  }

  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }

  deleteFn(id: number): void {
    if (id <= 0) return;
    if (window.confirm('Are you sure you want to delete this item?')) {
      this.service.deleteMachiningChargeMaster(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error?.message || 'Delete failed.', 'error');
        }
      });
    }
  }

  openModal(type: string, id: number): void {
    this.initForm();
    this.recordId = 0;
    if (id > 0) this.recordId = id;

    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Machining Charge Master Form';
      this.versions.push(this.createVersionGroup());
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Machining Charge Master Form';
      this.getDetails();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Machining Charge Master';
      this.getDetails();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) this.bsModal.hide();
    this.initForm();
    this.recordId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  onLaboratoryTestSelected(item: any): void {
    this.form.patchValue({ laboratoryTestID: item?.id || null });
    this.selectedLabTestId = item?.id || 0;
  }

  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);
  };

  onTestMethodSpecificationSelected(item: any): void {
    this.form.patchValue({ testMethodStandardID: item?.id || null });
    this.selectedStandardId = item?.id || 0;
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastService.show('File size should be less than 10 MB.', 'warning');
      event.target.value = '';
      return;
    }
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      this.toastService.show('Only PDF, PNG or JPG files are allowed.', 'warning');
      event.target.value = '';
      return;
    }
    this.selectedFile = file;
    this.form.markAsDirty();
  }

  removeFile(): void {
    this.selectedFile = null;
    this.existingFilePath = null;
    this.existingFileName = null;
    this.form.patchValue({ fileName: '', uploadReferenceID: null });
    if (this.fileInput) this.fileInput.nativeElement.value = '';
    this.form.markAsDirty();
  }

  private hasDuplicateEffectiveFrom(): boolean {
    const dates = this.versions.controls
      .map(c => c.get('effectiveFrom')?.value)
      .filter(v => !!v);
    return new Set(dates).size !== dates.length;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.versions.length === 0) {
      this.toastService.show('At least one price version is required.', 'error');
      return;
    }
    if (this.hasDuplicateEffectiveFrom()) {
      this.toastService.show('Duplicate Effective From date — each date can appear only once.', 'error');
      return;
    }

    const raw = this.form.getRawValue();
    const fd = new FormData();
    fd.append('id', String(raw.id || 0));
    fd.append('laboratoryTestID', String(raw.laboratoryTestID));
    fd.append('testMethodStandardID', String(raw.testMethodStandardID));
    fd.append('specimenRawMaterialSize', raw.specimenRawMaterialSize || '');
    fd.append('specimenSize', raw.specimenSize || '');
    fd.append('remark', raw.remark || '');
    fd.append('fileName', raw.fileName || '');
    fd.append('uploadReferenceID', raw.uploadReferenceID != null ? String(raw.uploadReferenceID) : '');

    raw.versions.forEach((v: any, i: number) => {
      fd.append(`versions[${i}].id`, String(v.id || 0));
      fd.append(`versions[${i}].financialYearId`, v.financialYearId != null ? String(v.financialYearId) : '');
      fd.append(`versions[${i}].effectiveFrom`, v.effectiveFrom || '');
      fd.append(`versions[${i}].priceGeneralMetal`, String(v.priceGeneralMetal ?? 0));
      fd.append(`versions[${i}].priceHardMetal`, String(v.priceHardMetal ?? 0));
    });

    if (this.selectedFile) {
      fd.append('file', this.selectedFile, this.selectedFile.name);
    }

    const request$ = this.isEditMode
      ? this.service.updateMachiningChargeMaster(fd)
      : this.service.createMachiningChargeMaster(fd);

    request$.subscribe({
      next: (response) => {
        this.toastService.show(response.message, 'success');
        this.closeModal();
        this.fetchData();
      },
      error: (error) => {
        this.toastService.show(error?.message || 'Save failed.', 'error');
      }
    });
  }
}
