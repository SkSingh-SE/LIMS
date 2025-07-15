import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from 'bootstrap';
import { Observable } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-configuration',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.css'
})
export class ConfigManagerComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'keyName', type: 'string', label: 'Key', filter: true },
    { key: 'groupName', type: 'string', label: 'Group Name', filter: true },
    { key: 'value', type: 'string', label: 'Value', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    keyName: 'string',
    groupName: 'string',
    value: 'string'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  configList: any[] = [];

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
  configForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  configId: number = 0;
  formTitle = 'Configuration Form';

  isSingleValue = true;
  isDropdown = false;

  constructor(private fb: FormBuilder, private configService: ConfigService, private toastService: ToastService) {

  }

  ngOnInit() {
    this.initForm();
    this.fetchData();
  }

  initForm() {
    this.configForm = this.fb.group({
      id: [0],
      keyName: ['', Validators.required],
      groupName: ['single'],
      value: [''],
      valueType: ['string'],
      description: [''],
      values: this.fb.array([]),
    });

    this.configForm.get('groupName')?.valueChanges.subscribe(() => this.onGroupChange());
    this.configForm.get('value')?.valueChanges.subscribe(value => this.detectValueType(value));
  }
  get values(): FormArray<FormControl> {
    return this.configForm.get('values') as FormArray<FormControl>;
  }

  fetchData() {
    this.configService.getAllConfigurations(this.payload).subscribe({
      next: (response) => {
        this.configList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.configList = [];
        this.isLoading.set(false);
      }
    }
    );
  }


  getDetails(): void {
    this.configService.getConfigurationsById(this.configId).subscribe({
      next: (res: any) => {
        if (res) {
          const aliasArray: FormArray<FormGroup> = this.fb.array<FormGroup>([]);
          (res.aliasNames || []).forEach((alias: any) => {
            aliasArray.push(this.fb.group({
              id: [alias.id],
              invoiceConfigurationID: [alias.invoiceConfigurationID],
              name: [alias.name]
            }));
          });

          this.configForm.patchValue({
            id: res.id,
            selectionType: res.selectionType,
            name: res.name,
            aliasName: res.aliasName,
            value: res.value,
            start: res.start,
            end: res.end,
            unit: res.unit
          });

          this.configForm.setControl('values', aliasArray);
        }
      },
      error: err => {
        this.toastService.show(err.error.message, 'error');
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
      this.configService.deleteConfigurations(id).subscribe({
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
      this.configId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      if (this.values.length === 0) {
        this.addValue();
      }
      this.formTitle = 'Configuration Form';
      this.configForm.enable();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Configuration Form';
      this.configForm.enable();

    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Configuration';
      this.configForm.disable();
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
    if (this.configForm.valid) {
      const payload = this.configForm.getRawValue();
      payload.value = payload.values.map((a: any) => a).join('|');


      const saveFn = this.configId > 0
        ? this.configService.updateConfigurations
        : this.configService.createConfigurations;


      saveFn.call(this.configService, payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res.message, 'success');
          this.closeModal();
          this.initForm();
          this.fetchData()
        },
        error: (err: any) => this.toastService.show(err.error.message, 'error')
      });
    } else {
      this.configForm.markAllAsTouched();
    }
  }

  trackByFn(item: any) {
    return item.label;
  }

  onGroupChange() {
    const group = this.configForm.get('groupName')?.value;
    this.isSingleValue = group === 'single';
    this.isDropdown = group === 'dropdown';

    if (this.isSingleValue) {
      this.configForm.get('value')?.enable();
      this.values.clear();
    } else if (this.isDropdown) {
      this.configForm.get('value')?.disable();
      if (this.values.length === 0) this.addValue();
    }
  }

  addValue() {
    this.values.push(this.fb.control(''));
    this.updateValueField();
  }

  removeValue(index: number) {
    this.values.removeAt(index);
    this.updateValueField();
  }

  updateValueField() {
    const joined = this.values.value.filter((v: any) => v).join('|');
    this.configForm.get('value')?.setValue(joined, { emitEvent: true });
  }

  detectValueType(value: string) {
    if (!value) {
      this.configForm.get('valueType')?.setValue('string');
      return;
    }

    const parts = value.split('|');
    const isNumeric = parts.every(p => !isNaN(Number(p)));

    const valueType = isNumeric ? 'number' : 'string';
    this.configForm.get('valueType')?.setValue(valueType);
  }

}



