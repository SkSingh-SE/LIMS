import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { SpecimenOrientationService } from '../../services/specimen-orientation.service';
import { SpecimenOrientationCategoryService } from '../../services/specimen-orientation-category.service';
import { TestMethodSpecificationService } from '../../services/test-method-specification.service';
import { ToastService } from '../../services/toast.service';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { CustomSelectComponent } from '../../utility/components/custom-select/custom-select.component';

@Component({
  selector: 'app-specimen-orientation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    CustomSelectComponent,
    FormFieldErrorComponent,
    PaginationComponent
  ],
  templateUrl: './specimen-orientation.component.html',
  styleUrl: './specimen-orientation.component.css'
})
export class SpecimenOrientationComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'code', type: 'string', label: 'Code', filter: true },
    { key: 'name', type: 'string', label: 'Name', filter: true },
    { key: 'standardNotation', type: 'string', label: 'Standard Notation', filter: true },
    { key: 'notationType', type: 'string', label: 'Notation Type', filter: true },
    { key: 'category', type: 'string', label: 'Orientation Category', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified By / At', filter: true },
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    code: 'string',
    name: 'string',
    standardNotation: 'string',
    notationType: 'string',
    category: 'string',
    modifiedOn: 'date',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = '';
  filterColumnTitle: string = '';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  isFilterOpen = false;
  SpecimenOrientationList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  sortByColumn: string = 'modifiedOn';
  sortOrder: string = 'desc';
  searchTerm: string = '';

  payload: any = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  // Form
  SpecimentOrientationForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  specimenOrientationId: number = 0;
  formTitle = 'Specimen Orientation Master';

  selectedCategoryItem: any = null;
  selectedTestMethodItem: any = null;
  selectedStandardName: string = '';

  lengthAxisOptions = [
    { code: 'L', label: 'L - Longitudinal (Rolling/Grain Direction)', shortLabel: 'L - Longitudinal', badge: 'Primary' },
    { code: 'T', label: 'T - Transverse (Long-Transverse / Width)', shortLabel: 'T - Transverse', badge: 'Width' },
    { code: 'S', label: 'S - Short Transverse (Thickness Axis)', shortLabel: 'S - Short Transverse', badge: 'Thickness' }
  ];

  crackDirectionOptions = [
    { code: 'T', label: 'T - Transverse (Width Direction)', shortLabel: 'T - Transverse', badge: 'Width' },
    { code: 'L', label: 'L - Longitudinal (Rolling Direction)', shortLabel: 'L - Longitudinal', badge: 'Length' },
    { code: 'S', label: 'S - Short Transverse (Thickness Direction)', shortLabel: 'S - Short Transverse', badge: 'Thickness' }
  ];

  constructor(
    private fb: FormBuilder,
    private specimenOrientationService: SpecimenOrientationService,
    private specimenOrientationCategoryService: SpecimenOrientationCategoryService,
    private testMethodService: TestMethodSpecificationService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.initForm();
    this.fetchData();
  }

  initForm() {
    this.SpecimentOrientationForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      specimenOrientationCategoryID: [null],
      testMethodSpecificationID: [null],
      testStandardName: [''],
      notationType: ['Two-letter'],
      lengthAxis: ['L'],
      crackOrNotchDirection: ['T'],
      standardNotation: ['L-T']
    });
  }

  getTestMethodDropdown = (s: string, p: number, ps: number) =>
    this.testMethodService.getTestMethodSpecificationDropdown(s, p, ps);

  onTestMethodSelected(item: any): void {
    this.selectedTestMethodItem = item;
    this.selectedStandardName = item ? (item.name || item.testMethodStandard || item.displayText || '') : '';
    this.SpecimentOrientationForm.patchValue({
      testMethodSpecificationID: item?.id ?? null,
      testStandardName: this.selectedStandardName
    });
    this.SpecimentOrientationForm.markAsDirty();
  }

  setNotationType(type: 'Two-letter' | 'One-letter') {
    if (this.isViewMode) return;
    this.SpecimentOrientationForm.patchValue({ notationType: type });
    this.updateStandardNotation();
  }

  updateStandardNotation() {
    if (this.isViewMode) return;
    const type = this.SpecimentOrientationForm.get('notationType')?.value || 'Two-letter';
    const lAxis = this.SpecimentOrientationForm.get('lengthAxis')?.value || 'L';
    const cAxis = this.SpecimentOrientationForm.get('crackOrNotchDirection')?.value || 'T';

    const notation = type === 'Two-letter' ? `${lAxis}-${cAxis}` : lAxis;
    this.SpecimentOrientationForm.patchValue({ standardNotation: notation });

    // Auto-update Code and Name if pristine
    const codeCtrl = this.SpecimentOrientationForm.get('code');
    const nameCtrl = this.SpecimentOrientationForm.get('name');
    if (!codeCtrl?.value || codeCtrl?.pristine) {
      codeCtrl?.setValue(notation);
    }
    if (!nameCtrl?.value || nameCtrl?.pristine) {
      const axisNameMap: Record<string, string> = {
        'L': 'Longitudinal',
        'T': 'Transverse',
        'S': 'Short Transverse'
      };
      const lName = axisNameMap[lAxis] || lAxis;
      const cName = axisNameMap[cAxis] || cAxis;
      const descriptiveName = type === 'Two-letter' ? `${lName} - ${cName} (${notation})` : `${lName} (${notation})`;
      nameCtrl?.setValue(descriptiveName);
    }

    this.SpecimentOrientationForm.markAsDirty();
  }

  fetchData() {
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm;
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.payload.filter = this.filters?.length ? this.filters : null;

    this.specimenOrientationService.getAllSpecimenOrientations(this.payload).subscribe({
      next: (response) => {
        this.SpecimenOrientationList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        this.SpecimenOrientationList = [];
      }
    });
  }

  getDetails(): void {
    const requestId = this.specimenOrientationId;
    this.specimenOrientationService.getSpecimenOrientationById(requestId).subscribe({
      next: (response) => {
        if (this.specimenOrientationId !== requestId) return;
        this.customerTypeObject = response;

        this.SpecimentOrientationForm.patchValue({
          id: response.id,
          code: response.code,
          name: response.name,
          specimenOrientationCategoryID: response.specimenOrientationCategoryID,
          testMethodSpecificationID: response.testMethodSpecificationID,
          testStandardName: response.testStandardName || '',
          notationType: response.notationType || (response.standardNotation?.includes('-') ? 'Two-letter' : 'One-letter'),
          lengthAxis: response.lengthAxis || (response.standardNotation?.split('-')[0] || 'L'),
          crackOrNotchDirection: response.crackOrNotchDirection || (response.standardNotation?.split('-')[1] || 'T'),
          standardNotation: response.standardNotation || response.code
        });

        // Set Standard Item
        if (response.testMethodSpecificationID) {
          this.selectedTestMethodItem = {
            id: response.testMethodSpecificationID,
            name: response.testStandardName || response.testMethodSpecification?.name || response.testMethodStandard
          };
          this.selectedStandardName = this.selectedTestMethodItem.name || '';
        } else {
          this.selectedTestMethodItem = null;
          this.selectedStandardName = response.testStandardName || '';
        }

        // Set Category Item
        if (response.specimenOrientationCategoryID) {
          this.selectedCategoryItem = {
            id: response.specimenOrientationCategoryID,
            name: response.specimenOrientationCategory?.name || response.specimenOrientationCategoryName
          };
        } else {
          this.selectedCategoryItem = null;
        }

        if (this.isViewMode) {
          this.SpecimentOrientationForm.disable();
        }
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || 'Error loading specimen orientation details', 'error');
      }
    });
  }

  openModal(type: string, id: number): void {
    this.initForm();
    this.selectedCategoryItem = null;
    this.selectedTestMethodItem = null;
    this.selectedStandardName = '';
    this.specimenOrientationId = 0;
    this.submitted = false;

    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Create Specimen Orientation';
      this.SpecimentOrientationForm.enable();
      this.updateStandardNotation();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Edit Specimen Orientation';
      this.SpecimentOrientationForm.enable();
      this.specimenOrientationId = id;
      this.getDetails();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Specimen Orientation';
      this.specimenOrientationId = id;
      this.getDetails();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.selectedCategoryItem = null;
    this.selectedTestMethodItem = null;
    this.selectedStandardName = '';
    this.initForm();
    this.specimenOrientationId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
    this.submitted = false;
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.SpecimentOrientationForm, path, this.submitted);
  }

  onCategorySelected(item: any): void {
    this.selectedCategoryItem = item;
    this.SpecimentOrientationForm.patchValue({
      specimenOrientationCategoryID: item?.id ?? null
    });
    this.SpecimentOrientationForm.markAsDirty();
  }

  getCategoryDropdown = (s: string, p: number, ps: number) =>
    this.specimenOrientationCategoryService.getSpecimenOrientationCategoryDropdown(s, p, ps);

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  applySorting(column: string) {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.fetchData();
  }

  onSearch() {
    this.pageNumber = 1;
    this.fetchData();
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.fetchData();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.fetchData();
  }

  deleteFn(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this Specimen Orientation?');
    if (confirmed) {
      this.specimenOrientationService.deleteSpecimenOrientation(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message || 'Specimen Orientation deleted successfully', 'success');
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        }
      });
    }
  }

  openFilterModal(column: string, event: MouseEvent) {
    this.filterColumn = column;
    const col = this.columns.find(c => c.key === column);
    this.filterColumnTitle = col ? col.label : column;
    this.filterValue = '';
    this.filterValue2 = '';

    const columnType = this.filterColumnTypes[column] || 'string';
    this.filterType = columnType === 'number' ? 'Equal' : 'Contains';

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
    const existingIndex = this.filters.findIndex(f => f.column === this.filterColumn);
    const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };

    if (existingIndex > -1) {
      this.filters[existingIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }
    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string) {
    this.filters = this.filters.filter(f => f.column !== column);
    this.fetchData();
  }

  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }

  closeFilterModal() {
    if (this.filterModal) {
      this.filterModal.nativeElement.style.display = 'none';
    }
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.SpecimentOrientationForm);

    if (!this.SpecimentOrientationForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }

    const formData = this.SpecimentOrientationForm.getRawValue();

    if (this.isEditMode) {
      this.specimenOrientationService.updateSpecimenOrientation(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Specimen Orientation updated successfully', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        }
      });
    } else {
      formData.id = 0;
      this.specimenOrientationService.createSpecimenOrientation(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Specimen Orientation created successfully', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        }
      });
    }
  }
}
