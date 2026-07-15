import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';
import { ParameterCategoryService } from '../../../services/parameter-category.service';
import { SpecimenOrientationService } from '../../../services/specimen-orientation.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { SymbolPickerComponent } from '../../../utility/components/symbol-picker/symbol-picker.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { FormulaBuilderComponent } from '../../../utility/components/formula-builder/formula-builder.component';

@Component({
  selector: 'app-mechanical-parameter',
  standalone: true,
  imports: [ CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, SymbolPickerComponent, PaginationComponent, FormulaBuilderComponent ],
  templateUrl: './mechanical-parameter.component.html',
  styleUrl: './mechanical-parameter.component.css'
})
export class MechanicalParameterComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  showFormulaBuilder = false;
  allParameters: any[] = [];

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'name', type: 'string', label: 'Parameter Name', filter: true },
    { key: 'unitName', type: 'string', label: 'Unit Name', filter: true },
    { key: 'parameterType', type: 'string', label: 'Parameter Type', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    name: 'string',
    unitName: 'string',
    parameterType: 'string',
    modifiedOn: 'date',
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
  ParameterForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  parameterId: number = 0;
  formTitle = 'Parameter Form';

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private parameterService: ParameterService, private toastService: ToastService, private parameterUnitService: ParameterUnitService, private parameterCategoryService: ParameterCategoryService, private specimenOrientationService: SpecimenOrientationService) {
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
    this.initForm();
    this.fetchParameterDropdown();
  }
  initForm() {
    this.ParameterForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      symbol: ['', Validators.required],
      inputType: ['Decimal', Validators.required],
      decimalPrecision: [1],
      parameterUnitID: [null],
      note: [''],
      elementType: ['normal'],
      parameterType: ['Mechanical', Validators.required],
      isCalculated: [false],
      formula: [''],
      formulaDisplay: [''],
      dropdownOptions: this.fb.array([])
    });
  }

  get dropdownOptions() {
    return this.ParameterForm.get('dropdownOptions') as any;
  }

  addDropdownOption() {
    this.dropdownOptions.push(this.fb.group({
      id: [0],
      displayText: ['', Validators.required],
      value: ['', Validators.required],
      displayOrder: [this.dropdownOptions.length + 1],
      isDefault: [false]
    }));
  }

  removeDropdownOption(index: number) {
    this.dropdownOptions.removeAt(index);
  }

  onInputTypeChange() {
    const inputType = this.ParameterForm.value.inputType;
    if (inputType !== 'Decimal' && inputType !== 'Integer') {
      this.ParameterForm.patchValue({ isCalculated: false, formula: '', formulaDisplay: '' });
    }
    if (inputType === 'Dropdown' || inputType === 'MultiSelect') {
      if (this.dropdownOptions.length === 0) this.addDropdownOption();
    } else {
      this.dropdownOptions.clear();
    }
  }
  fetchData() {
    this.parameterService.getAllMechanicalParameters(this.payload).subscribe({
      next: (response) => {
        this.ParameterList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        this.ParameterList = [];
      }
    }
    );
  }
  fetchParameterUnits() {
    this.parameterUnitService.getParameterUnitDropdown("", 0, 100).subscribe({
      next: (response) => {
        this.ParameterUnits = response || [];
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || 'Failed to load parameter units', 'error');
      }
    });
  }

  getDetails(): void {
    const requestId = this.parameterId;
    this.parameterService.getParameterById(requestId).subscribe({
      next: (response) => {
        if (this.parameterId !== requestId) return; // discard stale response
        this.customerTypeObject = response;
        this.ParameterForm.patchValue({
          ...response,
        });
        
        this.dropdownOptions.clear();
        if (response.dropdownOptions && response.dropdownOptions.length > 0) {
          response.dropdownOptions.forEach((opt: any) => {
            this.dropdownOptions.push(this.fb.group({
              id: [opt.id],
              displayText: [opt.displayText, Validators.required],
              value: [opt.value, Validators.required],
              displayOrder: [opt.displayOrder],
              isDefault: [opt.isDefault]
            }));
          });
        }
        
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || 'Failed to load parameter details', 'error');
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

      // Clamp to viewport so the popup doesn't overflow
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
    this.pageNumber = 1; // Reset to first page
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
      this.parameterService.deleteParameter(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        }
      });
    }
  }
  openModal(type: string, id: number): void {
    this.initForm();
    this.parameterId = 0;
    if (id > 0) {
      this.parameterId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Parameter Form';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Parameter Form';
    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Parameter';
      this.ParameterForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.initForm();
    this.customerTypeObject = null;
    this.parameterId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    if (this.ParameterForm.valid) {

      if (this.ParameterForm.value.isCalculated && !this.ParameterForm.value.formula) {
        this.toastService.show('Formula is required for calculated parameter', 'warning');
        return;
      }
      const inputType = this.ParameterForm.value.inputType;
      if ((inputType === 'Dropdown' || inputType === 'MultiSelect') && this.dropdownOptions.length === 0) {
        this.toastService.show('At least one dropdown option is required.', 'warning');
        return;
      }
      let formData = this.ParameterForm.value;
      if (this.isEditMode) {
        this.parameterService.updateParameter(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.closeModal();
            this.fetchData();
          },
          error: (error) => {
            this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
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
            this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
          }
        });
      }
    }
  }

  fetchParameterDropdown() {
    this.parameterService.getMechanicalParameterDropdown("", 0, 1000).subscribe({
      next: (response) => {
        this.allParameters = response || [];
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || 'Failed to load parameters', 'error');
      }
    });
  }

  onCalculatedToggle() {
    if (!this.ParameterForm.value.isCalculated) {
      this.ParameterForm.patchValue({ formula: '', formulaDisplay: '' });
    }
  }

  openFormulaBuilder() {
    this.showFormulaBuilder = true;
  }

  onFormulaSaved(event: { formula: string; formulaDisplay: string }) {
    this.ParameterForm.patchValue({
      formula: event.formula,
      formulaDisplay: event.formulaDisplay
    });
    this.showFormulaBuilder = false;
  }

  onFormulaCleared() {
    this.ParameterForm.patchValue({ formula: '', formulaDisplay: '' });
    this.showFormulaBuilder = false;
  }

  getCategoryDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.parameterCategoryService.getParameterCategoryDropdown(searchTerm, pageNo, pageSize);
  };

  getParameterUnitDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.parameterUnitService.getParameterUnitDropdown(searchTerm, pageNo, pageSize);
  };

  onParameterUnitSelected(item: any) {
    this.ParameterForm.patchValue({ parameterUnitID: item?.id ?? null });
  }
  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }
  @HostListener('window:focus')
  onWindowFocus(): void {}
}



