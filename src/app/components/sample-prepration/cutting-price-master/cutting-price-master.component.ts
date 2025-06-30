import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { Modal } from 'bootstrap';
import { ToastService } from '../../../services/toast.service';
import { CuttingPriceMasterService } from '../../../services/cutting-price-master.service';

@Component({
  selector: 'app-cutting-price-master',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DecimalOnlyDirective],
  templateUrl: './cutting-price-master.component.html',
  styleUrl: './cutting-price-master.component.css'
})
export class CuttingPriceMasterComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'cuttingType', type: 'string', label: 'Specification Name', filter: true },
    { key: 'unitType', type: 'string', label: 'Alias Name', filter: true },
    { key: 'ratePerUnit', type: 'string', label: 'Material Specification', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    cuttingType: 'string',
    unitType: 'string',
    ratePerUnit: 'string'
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
  cuttingPriceForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  cuttingPriceId: number = 0;
  formTitle = 'Cutting Price Master Form';

unitTypes = ['Per Cut', 'Per Minute', 'Per Sample'];

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private cuttingPriceService: CuttingPriceMasterService, private toastService: ToastService) {
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
  }
  initForm() {
    this.cuttingPriceForm = this.fb.group({
      id: [0],
      cuttingType: ['', Validators.required],
      unitType: ['', Validators.required],
      ratePerUnit: [0, [Validators.required, Validators.min(0)]],
      remarks: ['']
    });
  }

  fetchData() {
    this.cuttingPriceService.getAllCuttingPriceMasters(this.payload).subscribe({
      next: (response) => {
        this.listData = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.listData = [];
        this.isLoading.set(false);
      }
    }

    );
  }
  getDetails(): void {
    this.cuttingPriceService.getCuttingPriceMasterById(this.cuttingPriceId).subscribe({
      next: (response) => {
        this.customerTypeObject = response;
        this.cuttingPriceForm.patchValue(response);
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
    if (id > 0) {
      this.cuttingPriceId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      this.formTitle = 'Product Specification Form';
      this.cuttingPriceForm.enable();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Product Specification Form';
      this.cuttingPriceForm.enable();

    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Product Specification';
      this.cuttingPriceForm.disable();
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
    if (this.cuttingPriceForm.valid) {
      let formData = this.cuttingPriceForm.value;
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
  }
  
}


