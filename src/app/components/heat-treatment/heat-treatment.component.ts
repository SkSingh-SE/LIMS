import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, signal, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { HeatTreatmentService } from '../../services/heat-treatment.service';
import { HeatTreatmentCategoryService } from '../../services/heat-treatment-category.service';
import { CoolingMediumService } from '../../services/cooling-medium.service';
import { MetalClassificationService } from '../../services/metal-classification.service';
import { ToastService } from '../../services/toast.service';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-heat-treatment',
  imports: [ CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, MultiSelectDropdownComponent, FormFieldErrorComponent, PaginationComponent ],
  templateUrl: './heat-treatment.component.html',
  styleUrl: './heat-treatment.component.css'
})
export class HeatTreatmentComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'code', type: 'string', label: 'Code', filter: true },
    { key: 'name', type: 'string', label: 'Name', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    code: 'string',
    name: 'string',
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
  HeatTreatmentList: any[] = [];

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
  HeatTreatmentForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  heatTreatmentId: number = 0;
  formTitle = 'Heat Treatment Form';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private heatTreatmentService: HeatTreatmentService,
    private heatTreatmentCategoryService: HeatTreatmentCategoryService,
    private coolingMediumService: CoolingMediumService,
    private metalClassificationService: MetalClassificationService,
    private toastService: ToastService,
  ) {}


  ngOnInit() {
    this.fetchData();
    this.initForm();
  }

  fetchData() {
    this.heatTreatmentService.getAllHeatTreatments(this.payload).subscribe({
      next: (response) => {
        this.HeatTreatmentList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        this.HeatTreatmentList = [];
      }
    }

    );
  }
  getDetails(): void {
    const requestId = this.heatTreatmentId;
    this.heatTreatmentService.getHeatTreatmentById(requestId).subscribe({
      next: (response) => {
        if (this.heatTreatmentId !== requestId) return; // discard stale response
        this.customerTypeObject = response;
        this.HeatTreatmentForm.patchValue(response);
        if (response.applicableClassifications?.length > 0) {
          const ids = response.applicableClassifications.map((c: any) => c.metalClassificationID);
          this.HeatTreatmentForm.get('applicableClassificationIds')?.setValue(ids);
        }
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
      this.heatTreatmentService.deleteHeatTreatment(id).subscribe({
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
  initForm() {
    this.HeatTreatmentForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      code: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      heatTreatmentCategoryID: [null],
      tempRangeMin: [null],
      tempRangeMax: [null],
      tempRangeDescription: [''],
      coolingMediumID: [null],
      applicableClassificationIds: [[]],
      applicableClassifications: this.fb.array([]),
    });
  }

  openModal(type: string, id: number): void {
    this.initForm();
    this.customerTypeObject = null;
    this.heatTreatmentId = 0;
    if (id > 0) {
      this.heatTreatmentId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Heat Treatment Form';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Heat Treatment Form';
    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Heat Treatment';
      this.HeatTreatmentForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    this.bsModal.show();
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.HeatTreatmentForm, path, this.submitted);
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.initForm();
    this.customerTypeObject = null;
    this.heatTreatmentId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
    this.submitted = false;
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.HeatTreatmentForm);
    if (!this.HeatTreatmentForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }
    let formData = this.HeatTreatmentForm.value;
    const classIds = formData.applicableClassificationIds || [];
    formData.applicableClassifications = classIds.map((id: number) => ({ metalClassificationID: id }));
    if (this.isEditMode) {
      this.heatTreatmentService.updateHeatTreatment(formData).subscribe({
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
      this.heatTreatmentService.createHeatTreatment(formData).subscribe({
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

  getCategoryDropdown = (s: string, p: number, ps: number) =>
    this.heatTreatmentCategoryService.getHeatTreatmentCategoryDropdown(s, p, ps);

  getCoolingMediumDropdown = (s: string, p: number, ps: number) =>
    this.coolingMediumService.getCoolingMediumDropdown(s, p, ps);

  getMetalClassificationDropdown = (s: string, p: number, ps: number) =>
    this.metalClassificationService.getMetalClassificationDropdown(s, p, ps);

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  onClassificationSelected(selectedItems: any[]): void {
    const classificationsArray = this.HeatTreatmentForm.get('applicableClassifications') as FormArray;
    classificationsArray.clear();
    const ids = selectedItems.map((item: any) => item.id || item);
    ids.forEach((id: number) => {
      classificationsArray.push(this.fb.group({ metalClassificationID: [id] }));
    });
    this.HeatTreatmentForm.get('applicableClassificationIds')?.setValue(ids);
  }

  @HostListener('window:focus')
  onWindowFocus(): void {}
}
