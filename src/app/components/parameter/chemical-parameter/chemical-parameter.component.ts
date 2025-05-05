import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';

@Component({
  selector: 'app-chemical-parameter',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './chemical-parameter.component.html',
  styleUrl: './chemical-parameter.component.css'
})
export class ChemicalParameterComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'name', type: 'string', label: 'Parameter Name', filter: true },
    { key: 'aliasName', type: 'string', label: 'Alias Name', filter: true },
    { key: 'rate', type: 'string', label: 'Rate', filter: true },
    { key: 'unitName', type: 'string', label: 'Unit Name', filter: true },
    { key: 'factor', type: 'string', label: 'Conversaion Factor', filter: true },
    { key: 'createdOn', type: 'date', label: 'Created At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    name: 'string',
    aliasName: 'string',
    rate: 'number',
    unitName: 'string',
    factor: 'string',
    createdOn: 'date'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  ParameterList: any[] = [];
  ParameterUnits: any[] = [];

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
  ParameterForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  parameterId: number = 0;
  formTitle = 'Parameter Form';

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private parameterService: ParameterService, private toastService: ToastService, private parameterUnitService: ParameterUnitService) {
    this.route.params.subscribe(params => {
      this.parameterId = params['id'] || 0;
      if (this.parameterId > 0) {
        this.getDetails();
      }
    });

  }


  ngOnInit() {
    this.fetchData();
    this.fetchParameterUnits();
    this.ParameterForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      aliasName: [''],
      parameterUnitID: ['', Validators.required],
      rate: [0],
      note: [''],
      parameterType: ['Chemical', Validators.required],
    });
  }

  fetchData() {
    this.parameterService.getAllChemicalParameters(this.payload).subscribe({
      next: (response) => {
        this.ParameterList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.ParameterList = [];
        this.isLoading.set(false);
      }
    }
    );
  }
  fetchParameterUnits() {
    this.parameterUnitService.getParameterUnitDropdown("", 0, 100).subscribe({
      next: (response) => {
        this.ParameterUnits = response?.items || [];
      },
      error: (error) => {
        console.error('Error fetching parameter units:', error);
      }
    });
  }

  getDetails(): void {
    this.parameterService.getParameterById(this.parameterId).subscribe({
      next: (response) => {
        this.customerTypeObject = response;
        this.ParameterForm.patchValue(response);
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
      this.parameterService.deleteParameter(id).subscribe({
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
      this.parameterId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.ParameterForm.reset();
      this.formTitle = 'Parameter Form';
      this.ParameterForm.enable();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Parameter Form';
      this.ParameterForm.enable();
      
    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Parameter';
      this.ParameterForm.disable();
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
    if (this.ParameterForm.valid) {
      let formData = this.ParameterForm.value;
      if (this.isEditMode) {
        this.parameterService.updateParameter(formData).subscribe({
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
        this.parameterService.createParameter(formData).subscribe({
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



