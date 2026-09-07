import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { 
  TestMethodVersionService, 
  TestMethodVersionListItem, 
  TestMethodVersionFilter, 
  TestMethodVersionParameter, 
  VersionStatus 
} from '../../services/test-method-version.service';
import { TestMethodService, TestMethodDropdownItem } from '../../services/test-method.service';
import { ParameterService } from '../../services/parameter.service';
import { ToastService } from '../../services/toast.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-test-method-version-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    PaginationComponent,
    BreadcrumbComponent
  ],
  templateUrl: './test-method-version-list.component.html',
  styleUrl: './test-method-version-list.component.css'
})
export class TestMethodVersionListComponent implements OnInit {
  @ViewChild('versionModalRef') versionModalElement!: ElementRef;
  @ViewChild('paramModalRef') paramModalElement!: ElementRef;
  @ViewChild('fileInputRef') fileInputRef!: ElementRef;

  private bsVersionModal!: Modal;
  private bsParamModal!: Modal;

  // Filter state
  filterMethodId: number | null = null;
  filterVersion: string = '';
  filterYear: string = '';
  filterStatus: string = ''; // '' = All, '0' = Draft, '1' = Active, '2' = Superseded, '3' = Withdrawn
  filterIsDefault: string = ''; // '' = All, 'true', 'false'

  // Grid state
  versionList: TestMethodVersionListItem[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'ID';
  sortOrder: string = 'desc';

  // Dropdown lists
  testMethodList: TestMethodDropdownItem[] = [];
  availableParameters: any[] = [];

  // Version Modal / Form state
  versionForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Test Method Version';
  selectedFile: File | null = null;
  currentDocumentName: string | null = null;

  // Parameter Mapping Modal state
  selectedVersionForParams: TestMethodVersionListItem | null = null;
  paramRows: TestMethodVersionParameter[] = [];
  isSavingParams: boolean = false;

  constructor(
    private fb: FormBuilder,
    private versionService: TestMethodVersionService,
    private testMethodService: TestMethodService,
    private parameterService: ParameterService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTestMethods();
    this.loadParameters();
    this.loadVersions();
  }

  private initForm(): void {
    this.versionForm = this.fb.group({
      testMethodSpecificationID: [null, [Validators.required]],
      version: ['', [Validators.required, noWhitespaceValidator, Validators.maxLength(50)]],
      year: ['', [Validators.maxLength(20)]],
      status: [0, [Validators.required]], // Draft = 0
      effectiveDate: [null],
      supersededDate: [null],
      reviewDate: [null],
      changeReason: ['', [Validators.maxLength(500)]],
      isDefault: [false]
    });
  }

  loadTestMethods(): void {
    this.testMethodService.getActiveDropdown().subscribe({
      next: (res: TestMethodDropdownItem[]) => {
        this.testMethodList = res || [];
      },
      error: () => {
        this.toastService.show('Failed to load Test Methods.', 'error');
      }
    });
  }

  loadParameters(): void {
    this.parameterService.getParameterDropdown('', 0, 200).subscribe({
      next: (res) => {
        this.availableParameters = res || [];
      },
      error: () => {
        this.toastService.show('Failed to load Parameter Masters.', 'error');
      }
    });
  }

  loadVersions(): void {
    const filter: TestMethodVersionFilter = {
      testMethodSpecificationID: this.filterMethodId ? Number(this.filterMethodId) : null,
      version: this.filterVersion.trim() || undefined,
      year: this.filterYear.trim() || undefined,
      status: this.filterStatus !== '' ? (Number(this.filterStatus) as VersionStatus) : null,
      isDefault: this.filterIsDefault !== '' ? (this.filterIsDefault === 'true') : null,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      sortColumn: this.sortByColumn,
      sortDirection: this.sortOrder
    };

    this.versionService.getVersions(filter).subscribe({
      next: (res) => {
        this.versionList = res.items || res.data || [];
        this.totalItems = res.totalRecords || 0;
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to load Test Method Versions.';
        this.toastService.show(msg, 'error');
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.loadVersions();
  }

  onReset(): void {
    this.filterMethodId = null;
    this.filterVersion = '';
    this.filterYear = '';
    this.filterStatus = '';
    this.filterIsDefault = '';
    this.pageNumber = 1;
    this.sortByColumn = 'ID';
    this.sortOrder = 'desc';
    this.loadVersions();
  }

  onSort(column: string): void {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.pageNumber = 1;
    this.loadVersions();
  }

  getSortIcon(column: string): string {
    if (this.sortByColumn !== column) return 'bi-arrow-down-up text-muted';
    return this.sortOrder === 'asc' ? 'bi-sort-up text-danger' : 'bi-sort-down text-danger';
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.loadVersions();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageNumber = 1;
    this.loadVersions();
  }

  // Version Add/Edit/View modal actions
  openAddModal(): void {
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedId = 0;
    this.submitted = false;
    this.selectedFile = null;
    this.currentDocumentName = null;
    this.formTitle = 'Add Test Method Version';

    this.versionForm.reset({
      testMethodSpecificationID: this.filterMethodId || null,
      version: '',
      year: new Date().getFullYear().toString(),
      status: 0, // Draft
      effectiveDate: null,
      supersededDate: null,
      reviewDate: null,
      changeReason: '',
      isDefault: false
    });
    this.versionForm.enable();

    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }

    this.getOrInitVersionModal().show();
  }

  openEditModal(item: TestMethodVersionListItem): void {
    this.isEditMode = true;
    this.isViewMode = false;
    this.selectedId = item.id;
    this.submitted = false;
    this.selectedFile = null;
    this.currentDocumentName = item.standardFile || null;
    this.formTitle = `Edit Test Method Version — ${item.version}`;

    this.versionForm.enable();
    this.versionForm.patchValue({
      testMethodSpecificationID: item.testMethodSpecificationID,
      version: item.version,
      year: item.year || '',
      status: item.status,
      effectiveDate: item.effectiveDate ? item.effectiveDate.substring(0, 10) : null,
      supersededDate: item.supersededDate ? item.supersededDate.substring(0, 10) : null,
      reviewDate: item.reviewDate ? item.reviewDate.substring(0, 10) : null,
      changeReason: item.changeReason || '',
      isDefault: item.isDefault
    });

    // Parent method cannot be changed once created
    this.versionForm.get('testMethodSpecificationID')?.disable();

    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }

    this.getOrInitVersionModal().show();
  }

  openViewModal(item: TestMethodVersionListItem): void {
    this.isEditMode = false;
    this.isViewMode = true;
    this.selectedId = item.id;
    this.submitted = false;
    this.selectedFile = null;
    this.currentDocumentName = item.standardFile || null;
    this.formTitle = `View Test Method Version — ${item.version}`;

    this.versionForm.patchValue({
      testMethodSpecificationID: item.testMethodSpecificationID,
      version: item.version,
      year: item.year || '',
      status: item.status,
      effectiveDate: item.effectiveDate ? item.effectiveDate.substring(0, 10) : null,
      supersededDate: item.supersededDate ? item.supersededDate.substring(0, 10) : null,
      reviewDate: item.reviewDate ? item.reviewDate.substring(0, 10) : null,
      changeReason: item.changeReason || '',
      isDefault: item.isDefault
    });
    this.versionForm.disable();

    this.getOrInitVersionModal().show();
  }

  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        this.toastService.show('Only PDF standard documents are permitted.', 'error');
        event.target.value = '';
        this.selectedFile = null;
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        this.toastService.show('File size cannot exceed 25MB.', 'error');
        event.target.value = '';
        this.selectedFile = null;
        return;
      }
      this.selectedFile = file;
    }
  }

  saveVersion(): void {
    this.submitted = true;
    if (this.versionForm.invalid) {
      this.versionForm.markAllAsTouched();
      return;
    }

    const formVal = this.versionForm.getRawValue();

    // Client-side date check
    if (formVal.effectiveDate && formVal.supersededDate && formVal.supersededDate < formVal.effectiveDate) {
      this.toastService.show('Superseded Date cannot be earlier than Effective Date.', 'error');
      return;
    }
    if (formVal.effectiveDate && formVal.reviewDate && formVal.reviewDate < formVal.effectiveDate) {
      this.toastService.show('Periodic Review Date cannot be earlier than Effective Date.', 'error');
      return;
    }

    // Default version check
    if (formVal.isDefault && Number(formVal.status) !== 1) {
      this.toastService.show('Only an Active version can be set as default.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('version', formVal.version.trim());
    formData.append('status', formVal.status.toString());
    formData.append('isDefault', formVal.isDefault ? 'true' : 'false');

    if (formVal.year) formData.append('year', formVal.year.trim());
    if (formVal.effectiveDate) formData.append('effectiveDate', formVal.effectiveDate);
    if (formVal.supersededDate) formData.append('supersededDate', formVal.supersededDate);
    if (formVal.reviewDate) formData.append('reviewDate', formVal.reviewDate);
    if (formVal.changeReason) formData.append('changeReason', formVal.changeReason.trim());

    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    if (this.isEditMode) {
      this.versionService.updateVersion(this.selectedId, formData).subscribe({
        next: () => {
          this.toastService.show('Test Method Version updated successfully.', 'success');
          this.getOrInitVersionModal().hide();
          this.loadVersions();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to update Test Method Version.';
          this.toastService.show(msg, 'error');
        }
      });
    } else {
      formData.append('testMethodSpecificationID', formVal.testMethodSpecificationID.toString());
      this.versionService.createVersion(formData).subscribe({
        next: () => {
          this.toastService.show('Test Method Version created successfully.', 'success');
          this.getOrInitVersionModal().hide();
          this.loadVersions();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to create Test Method Version.';
          this.toastService.show(msg, 'error');
        }
      });
    }
  }

  setDefault(item: TestMethodVersionListItem): void {
    if (item.isDefault) {
      this.toastService.show('This version is already the default edition.', 'info');
      return;
    }
    if (item.status !== 1) { // 1 = Active
      this.toastService.show('Only an Active version can be set as default.', 'error');
      return;
    }
    if (!item.isParentActive) {
      this.toastService.show('Cannot set as default because parent Test Method is inactive.', 'error');
      return;
    }

    if (confirm(`Set version '${item.version}' as the default edition for ${item.testMethodCode}?`)) {
      this.versionService.setDefaultVersion(item.id).subscribe({
        next: () => {
          this.toastService.show('Default version updated successfully.', 'success');
          this.loadVersions();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to set default version.';
          this.toastService.show(msg, 'error');
        }
      });
    }
  }

  // Parameter Mapping modal actions
  openParamModal(item: TestMethodVersionListItem): void {
    this.selectedVersionForParams = item;
    this.paramRows = [];
    this.isSavingParams = false;

    this.versionService.getVersionParameters(item.id).subscribe({
      next: (res) => {
        this.paramRows = res || [];
        this.getOrInitParamModal().show();
      },
      error: () => {
        this.toastService.show('Failed to load mapped parameters.', 'error');
      }
    });
  }

  addParamRow(): void {
    const nextOrder = this.paramRows.length > 0
      ? Math.max(...this.paramRows.map(p => p.sortOrder || 0)) + 1
      : 1;

    this.paramRows.push({
      parameterID: 0,
      parameterCode: '',
      parameterName: '',
      unitID: undefined,
      unitName: undefined,
      unitSymbol: undefined,
      sortOrder: nextOrder,
      comment: ''
    });
  }

  removeParamRow(index: number): void {
    this.paramRows.splice(index, 1);
  }

  onParamSelected(row: TestMethodVersionParameter, paramId: any): void {
    const pid = Number(paramId);
    row.parameterID = pid;
    const found = this.availableParameters.find(p => p.id === pid || p.ID === pid);
    if (found) {
      row.parameterCode = found.additionalValues?.Code || found.code || found.Code || '';
      row.parameterName = found.additionalValues?.PureName || found.name || found.Name || '';
      row.unitSymbol = found.additionalValues?.Symbol || found.unitSymbol || found.Symbol || found.symbol || '';
      row.unitName = found.additionalValues?.Unit || found.unitName || found.UnitName || '';
      row.unitID = found.additionalValues?.UnitID || found.unitID;
    }
  }

  saveParameters(): void {
    if (!this.selectedVersionForParams) return;

    // Validation 1: At least valid ParameterID
    for (const p of this.paramRows) {
      if (!p.parameterID || p.parameterID === 0) {
        this.toastService.show('Please select a parameter for all rows.', 'error');
        return;
      }
    }

    // Validation 2: Duplicate ParameterID
    const ids = this.paramRows.map(p => p.parameterID);
    const hasDups = ids.some((id, idx) => ids.indexOf(id) !== idx);
    if (hasDups) {
      this.toastService.show('Duplicate parameters cannot be mapped to the same version.', 'error');
      return;
    }

    // Validation 3: Duplicate sort orders
    const orders = this.paramRows.map(p => p.sortOrder);
    const hasOrderDups = orders.some((ord, idx) => orders.indexOf(ord) !== idx);
    if (hasOrderDups) {
      this.toastService.show('Each parameter must have a unique Sort Order.', 'error');
      return;
    }

    this.isSavingParams = true;
    this.versionService.saveVersionParameters(this.selectedVersionForParams.id, { parameters: this.paramRows }).subscribe({
      next: () => {
        this.isSavingParams = false;
        this.toastService.show('Parameters mapped successfully.', 'success');
        this.getOrInitParamModal().hide();
        this.loadVersions();
      },
      error: (err) => {
        this.isSavingParams = false;
        const msg = err?.error?.message || 'Failed to save mapped parameters.';
        this.toastService.show(msg, 'error');
      }
    });
  }

  getStatusBadgeClass(status: VersionStatus): string {
    switch (Number(status)) {
      case 0: return 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      case 1: return 'badge bg-success-subtle text-success-emphasis border border-success-subtle';
      case 2: return 'badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle';
      case 3: return 'badge bg-danger-subtle text-danger-emphasis border border-danger-subtle';
      default: return 'badge bg-light text-dark';
    }
  }

  getStatusLabel(status: VersionStatus): string {
    switch (Number(status)) {
      case 0: return 'Draft';
      case 1: return 'Active';
      case 2: return 'Superseded';
      case 3: return 'Withdrawn';
      default: return 'Unknown';
    }
  }

  private getOrInitVersionModal(): Modal {
    if (!this.bsVersionModal) {
      this.bsVersionModal = new Modal(this.versionModalElement.nativeElement, { backdrop: 'static' });
    }
    return this.bsVersionModal;
  }

  private getOrInitParamModal(): Modal {
    if (!this.bsParamModal) {
      this.bsParamModal = new Modal(this.paramModalElement.nativeElement, { backdrop: 'static' });
    }
    return this.bsParamModal;
  }
}
