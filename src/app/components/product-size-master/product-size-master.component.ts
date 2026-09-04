import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { CommonModule } from '@angular/common';
import { ProductSizeMasterService } from '../../services/product-size-master.service';
import { ParameterUnitService } from '../../services/parameter-unit.service';
import { ToastService } from '../../services/toast.service';
import { DecimalOnlyDirective } from '../../utility/directives/decimal-only.directive';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-product-size-master',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DecimalOnlyDirective, FormFieldErrorComponent, PaginationComponent, SearchableDropdownComponent],
  templateUrl: './product-size-master.component.html',
  styleUrl: './product-size-master.component.css',
})
export class ProductSizeMasterComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  sizeTypes = ['Diameter', 'Thickness', 'Length', 'Width'];

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'displayName', type: 'string', label: 'Display Name', filter: true },
    { key: 'sizeType', type: 'string', label: 'Size Type', filter: true },
    { key: 'minValue', type: 'number', label: 'Min', filter: true },
    { key: 'maxValue', type: 'number', label: 'Max', filter: true },
    { key: 'unitName', type: 'string', label: 'Unit', filter: false },
    { key: 'modifiedOn', type: 'date', label: 'Modified At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    displayName: 'string',
    sizeType: 'string',
    minValue: 'number',
    maxValue: 'number',
    modifiedOn: 'date',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  isFilterOpen = false;
  productSizeList: any[] = [];

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
    filter: this.filters ?? null,
  };

  productSizeForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  selectedId: number = 0;
  formTitle = 'Product Size Form';
  selectedUnitDropdownItem: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private productSizeService: ProductSizeMasterService,
    private parameterUnitService: ParameterUnitService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.fetchData();
    this.productSizeForm = this.fb.group({
      id: [0],
      displayName: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      sizeType: ['', [Validators.required]],
      minValue: [null],
      maxValue: [null],
      parameterUnitID: [null],
      parameterUnitEquivalentID: [null],
    });
  }

  getUnitDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.parameterUnitService.getGroupedParameterUnitDropdown(searchTerm, pageNo, pageSize);
  };
  getParameterUnitDropdown = this.getUnitDropdown;

  onUnitSelected(item: any): void {
    this.selectedUnitDropdownItem = item;
    this.productSizeForm.patchValue({
      parameterUnitID: item?.id ?? null,
      parameterUnitEquivalentID: item?.equivalentId ?? null,
    });
  }

  fetchData() {
    this.productSizeService.getAllProductSizes(this.payload).subscribe({
      next: (response) => {
        this.productSizeList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: () => {
        this.productSizeList = [];
      },
    });
  }

  loadProductSizeData(): void {
    const requestId = this.selectedId;
    this.productSizeService.getProductSizeById(requestId).subscribe({
      next: (response) => {
        if (this.selectedId !== requestId) return; // discard stale response
        this.productSizeForm.patchValue(response);
        if (response.parameterUnitID || response.parameterUnitEquivalentID) {
          this.selectedUnitDropdownItem = {
            id: response.parameterUnitID,
            equivalentId: response.parameterUnitEquivalentID,
            name: response.parameterUnitEquivalent?.name || response.parameterUnit?.name || response.unitName
          };
        } else {
          this.selectedUnitDropdownItem = null;
        }
      },
      error: (error) => {
        console.error('Error fetching product size data:', error);
      },
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
    this.columns.forEach((col) => {
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

    const existingFilterIndex = this.filters.findIndex((f) => f.column === this.filterColumn);
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
    this.filters = this.filters.filter((filter) => filter.column !== column);
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

  hasFilter(column: string): boolean {
    return this.filters?.some((f) => f.column === column) ?? false;
  }

  deleteProductSize(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      this.productSizeService.deleteProductSize(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.message || 'Failed to delete product size.', 'error');
        },
      });
    }
  }

  openModal(type: string, id: number): void {
    this.selectedUnitDropdownItem = null;
    this.productSizeForm.reset({ id: 0, sizeType: '', minValue: null, maxValue: null, parameterUnitID: null, parameterUnitEquivalentID: null });
    this.productSizeForm.enable();
    this.selectedId = 0;
    if (id > 0) {
      this.selectedId = id;
      this.loadProductSizeData();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Product Size Form';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Product Size Form';
      this.productSizeForm.enable();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Product Size';
      this.productSizeForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    this.bsModal.show();
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.productSizeForm, path, this.submitted);
  }

  closeModal(): void {
    this.submitted = false;
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.selectedUnitDropdownItem = null;
    this.productSizeForm.reset({ id: 0, parameterUnitID: null, parameterUnitEquivalentID: null });
    this.productSizeForm.enable();
    this.selectedId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.productSizeForm);
    if (!this.productSizeForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }
    const formData = this.productSizeForm.value;
    if (this.isEditMode) {
      this.productSizeService.updateProductSize(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          this.closeModal();
          this.fetchData();
        },
        error: () => {},
      });
    } else {
      formData.id = 0;
      this.productSizeService.createProductSize(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          this.closeModal();
          this.fetchData();
        },
        error: () => {},
      });
    }
  }
}
