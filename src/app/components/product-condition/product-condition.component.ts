import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ProductConditionService } from '../../services/product-condition.service';
import { ProductConditionCategoryService } from '../../services/product-condition-category.service';
import { HeatTreatmentService } from '../../services/heat-treatment.service';
import { PropertyTypeService } from '../../services/property-type.service';
import { ToastService } from '../../services/toast.service';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-product-condition',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    MultiSelectDropdownComponent,
    FormFieldErrorComponent,
    PaginationComponent
  ],
  templateUrl: './product-condition.component.html',
  styleUrl: './product-condition.component.css'
})
export class ProductConditionComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'code', type: 'string', label: 'Code', filter: true },
    { key: 'name', type: 'string', label: 'Name', filter: true },
    { key: 'category', type: 'string', label: 'Condition Category', filter: true },
    { key: 'linkedHeatTreatment', type: 'string', label: 'Linked Heat Treatment', filter: true },
    { key: 'isHeatTreated', type: 'string', label: 'Condition Status', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified By / At', filter: true },
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    code: 'string',
    name: 'string',
    category: 'string',
    linkedHeatTreatment: 'string',
    isHeatTreated: 'string',
    modifiedOn: 'date',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = '';
  filterColumnTitle: string = '';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  isFilterOpen = false;
  ProductConditionList: any[] = [];

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
  ProductConditionForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  productConditionId: number = 0;
  formTitle = 'Product Condition Master';

  selectedCategoryItem: any = null;
  selectedHeatTreatmentItem: any = null;

  constructor(
    private fb: FormBuilder,
    private productConditionService: ProductConditionService,
    private productConditionCategoryService: ProductConditionCategoryService,
    private heatTreatmentService: HeatTreatmentService,
    private propertyTypeService: PropertyTypeService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.initForm();
    this.fetchData();
  }

  initForm() {
    this.ProductConditionForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      productConditionCategoryID: [null],
      linkedHeatTreatmentID: [null],
      description: ['', [Validators.maxLength(500)]],
      propertiesCapturedIds: [[]]
    });
  }

  fetchData() {
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm;
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.payload.filter = this.filters?.length ? this.filters : null;

    this.productConditionService.getAllProductConditions(this.payload).subscribe({
      next: (response) => {
        this.ProductConditionList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        this.ProductConditionList = [];
      }
    });
  }

  getDetails(): void {
    const requestId = this.productConditionId;
    this.productConditionService.getProductConditionById(requestId).subscribe({
      next: (response) => {
        if (this.productConditionId !== requestId) return;
        this.customerTypeObject = response;

        this.ProductConditionForm.patchValue({
          id: response.id,
          code: response.code,
          name: response.name,
          productConditionCategoryID: response.productConditionCategoryID,
          linkedHeatTreatmentID: response.linkedHeatTreatmentID,
          description: response.description || ''
        });

        // Set Category Item
        if (response.productConditionCategoryID) {
          this.selectedCategoryItem = {
            id: response.productConditionCategoryID,
            name: response.productConditionCategory?.name || response.productConditionCategoryName
          };
        } else {
          this.selectedCategoryItem = null;
        }

        // Set Heat Treatment Item
        if (response.linkedHeatTreatmentID) {
          this.selectedHeatTreatmentItem = {
            id: response.linkedHeatTreatmentID,
            name: response.linkedHeatTreatment?.name || response.linkedHeatTreatmentName
          };
        } else {
          this.selectedHeatTreatmentItem = null;
        }

        // Properties Captured
        if (response.propertiesCaptured?.length > 0) {
          const ids = response.propertiesCaptured.map((p: any) => p.propertyTypeID || p.id);
          this.ProductConditionForm.patchValue({ propertiesCapturedIds: ids });
        } else {
          this.ProductConditionForm.patchValue({ propertiesCapturedIds: [] });
        }

        if (this.isViewMode) {
          this.ProductConditionForm.disable();
        }
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || 'Error loading product condition details', 'error');
      }
    });
  }

  openModal(type: string, id: number): void {
    this.initForm();
    this.selectedCategoryItem = null;
    this.selectedHeatTreatmentItem = null;
    this.productConditionId = 0;
    this.submitted = false;

    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Create Product Condition';
      this.ProductConditionForm.enable();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Edit Product Condition';
      this.ProductConditionForm.enable();
      this.productConditionId = id;
      this.getDetails();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Product Condition';
      this.productConditionId = id;
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
    this.selectedHeatTreatmentItem = null;
    this.initForm();
    this.productConditionId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
    this.submitted = false;
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.ProductConditionForm, path, this.submitted);
  }

  onCategorySelected(item: any): void {
    this.selectedCategoryItem = item;
    this.ProductConditionForm.patchValue({
      productConditionCategoryID: item?.id ?? null
    });
    this.ProductConditionForm.markAsDirty();
  }

  onHeatTreatmentSelected(item: any): void {
    this.selectedHeatTreatmentItem = item;
    this.ProductConditionForm.patchValue({
      linkedHeatTreatmentID: item?.id ?? null
    });
    this.ProductConditionForm.markAsDirty();
  }

  onPropertySelected(items: any[]): void {
    const ids = items.map((x: any) => x.id || x);
    this.ProductConditionForm.patchValue({ propertiesCapturedIds: ids });
    this.ProductConditionForm.markAsDirty();
  }

  // Dropdown fetchers
  getCategoryDropdown = (s: string, p: number, ps: number) =>
    this.productConditionCategoryService.getProductConditionCategoryDropdown(s, p, ps);

  getHeatTreatmentDropdown = (s: string, p: number, ps: number) =>
    this.heatTreatmentService.getHeatTreatmentDropdown(s, p, ps);

  getPropertyTypeDropdown = (s: string, p: number, ps: number) =>
    this.propertyTypeService.getPropertyTypeDropdown(s, p, ps);

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
    const confirmed = window.confirm('Are you sure you want to delete this Product Condition?');
    if (confirmed) {
      this.productConditionService.deleteProductCondition(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message || 'Product Condition deleted successfully', 'success');
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
    FormValidationHelper.markAllTouched(this.ProductConditionForm);

    if (!this.ProductConditionForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }

    const raw = this.ProductConditionForm.getRawValue();
    const propIds = raw.propertiesCapturedIds || [];

    const formData = {
      ...raw,
      propertiesCaptured: propIds.map((id: number) => ({ PropertyTypeID: id }))
    };

    if (this.isEditMode) {
      this.productConditionService.updateProductCondition(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Product Condition updated successfully', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        }
      });
    } else {
      formData.id = 0;
      this.productConditionService.createProductCondition(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Product Condition created successfully', 'success');
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
