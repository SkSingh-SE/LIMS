import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ProductSpecificationService } from '../../services/product-specification.service';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';
import { MaterialSpecificationService } from '../../services/material-specification.service';
import { Observable } from 'rxjs';
import { SearchableDropdownModalComponent } from '../../utility/components/searchable-dropdown-modal/searchable-dropdown-modal.component';
import { DecimalOnlyDirective } from '../../utility/directives/decimal-only.directive';
import { Select2, Select2Option, Select2UpdateEvent, Select2UpdateValue } from 'ng-select2-component';

@Component({
  selector: 'app-product-specification',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SearchableDropdownModalComponent, DecimalOnlyDirective,Select2],
  templateUrl: './product-specification.component.html',
  styleUrl: './product-specification.component.css'
})
export class ProductSpecificationComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

   columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'specificationName', type: 'string', label: 'Specification Name', filter: true },
    { key: 'aliasName', type: 'string', label: 'Alias Name', filter: true },
    { key: 'materialSpecification', type: 'string', label: 'Material Specification', filter: true },
    { key: 'specificationCode', type: 'string', label: 'Specification Code', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    specificationName: 'string',
    aliasName: 'string',
    materialSpecification: 'string',
    specificationCode: 'string'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  ProductSpecificationList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

  sortByColumn: string = 'id';
  sortOrder: string = 'asc';
  searchTerm: string = '';
  isLoading = signal(false);

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  // form
  ProductSpecificationForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  productSpecificationId: number = 0;
  formTitle = 'Product Specfication Form';

  testMethods: any[] = [
    { value: 1, label: 'Test Method 1' },
    { value: 2, label: 'Test Method 2' },
    { value: 3, label: 'Test Method 3' },
    { value: 4, label: 'Test Method 4' },
    { value: 5, label: 'Test Method 5' },
  ];

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private productSpecificationService: ProductSpecificationService, private toastService: ToastService, private materialSpecificationService: MaterialSpecificationService) {
    this.route.params.subscribe(params => {
      this.productSpecificationId = params['id'] || 0;
      if (this.productSpecificationId > 0) {
        this.getDetails();
      }
    });

  }


  ngOnInit() {
    this.fetchData();
    this.initForm();
  }
  initForm() {
    this.ProductSpecificationForm = this.fb.group({
      id: [0],
      specificationName: ['', Validators.required],
      aliasName: ['', Validators.required],
      specificationCode: ['', Validators.required],
      materiaSpecificationID: ['', Validators.required],
      isCustom: [false],
      size:[''],
      testMethods:['']
    });
  }

  fetchData() {
    this.productSpecificationService.getAllProductSpecifications(this.payload).subscribe({
      next: (response) => {
        this.ProductSpecificationList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.ProductSpecificationList = [];
        this.isLoading.set(false);
      }
    }

    );
  }
  getDetails(): void {
    this.productSpecificationService.getProductSpecificationById(this.productSpecificationId).subscribe({
      next: (response) => {
        this.customerTypeObject = response;
        this.ProductSpecificationForm.patchValue(response);
      },
      error: (error) => {
        console.error('Error fetching tax data:', error);
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
    })
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
    this.pageNumber = 1; // Reset to first page
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
  }

  onSearch() {
    if (this.searchTerm !== this.payload.searchTerm) {
      this.payload.searchTerm = this.searchTerm;
      this.fetchData();
    }
  }

  get totalPages(): number[] {
    return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
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
      this.productSpecificationService.deleteProductSpecification(id).subscribe({
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
    if (id > 0) {
      this.productSpecificationId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      this.formTitle = 'Product Specification Form';
      this.ProductSpecificationForm.enable();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Product Specification Form';
      this.ProductSpecificationForm.enable();

    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Product Specification';
      this.ProductSpecificationForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  onSubmit(): void {
    if (this.ProductSpecificationForm.valid) {
      debugger;
      let formData = this.ProductSpecificationForm.value;
      if (this.isEditMode) {
        this.productSpecificationService.updateProductSpecification(formData).subscribe({
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
        this.productSpecificationService.createProductSpecification(formData).subscribe({
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
  }
  getMaterialSpecification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.materialSpecificationService.getMaterialSpecificationDropdown(term, page, pageSize);
  };
  onMaterialSelected(item: any) {
    debugger;
    this.ProductSpecificationForm.patchValue({ materiaSpecificationID: item.id });
  }
onLaboratoryTestChange(selectedIds: Select2UpdateEvent<Select2UpdateValue>) {
    const line = this.ProductSpecificationForm.get('testMethods') as FormArray;
    // Reset and rebuild array
    line.clear();
    selectedIds?.options?.forEach(item => {
      const selectedOption = this.testMethods.find((x: any) => x.value === item.value) as Select2Option;
      if (selectedOption) {
        line.push(this.fb.group({
          id: [0],
          specificationLineID: [line.get('id')?.value || 0],
          laboratoryTestID: [item.value],
          laboratoryTestName: [selectedOption?.label || '']
        }));
      }
    });
  }
}


