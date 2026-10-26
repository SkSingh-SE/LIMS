import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
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
    { key: 'category', type: 'string', label: 'Category', filter: true },
    { key: 'stagesCount', type: 'number', label: 'Stages', filter: false },
    { key: 'modifiedOn', type: 'date', label: 'Modified By / At', filter: true },
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    code: 'string',
    name: 'string',
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
  HeatTreatmentList: any[] = [];

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
  HeatTreatmentForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  heatTreatmentId: number = 0;
  formTitle = 'Heat Treatment Master';
  selectedCategoryItem: any = null;

  constructor(
    private fb: FormBuilder,
    private heatTreatmentService: HeatTreatmentService,
    private heatTreatmentCategoryService: HeatTreatmentCategoryService,
    private coolingMediumService: CoolingMediumService,
    private metalClassificationService: MetalClassificationService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.initForm();
    this.fetchData();
  }

  initForm() {
    this.HeatTreatmentForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      heatTreatmentCategoryID: [null],
      applicableClassificationIds: [[]],
      stages: this.fb.array([])
    });
  }

  get stages(): FormArray {
    return this.HeatTreatmentForm.get('stages') as FormArray;
  }

  addStage(preset?: { name: string; min: number; max: number; soak?: string; coolingId?: number }) {
    if (this.isViewMode) return;
    const stageNum = this.stages.length + 1;
    this.stages.push(this.fb.group({
      id: [0],
      heatTreatmentID: [this.heatTreatmentId || 0],
      stageNumber: [stageNum],
      stageName: [preset?.name || '', [Validators.required, noWhitespaceValidator()]],
      tempRangeMin: [preset?.min ?? 0, [Validators.required]],
      tempRangeMax: [preset?.max ?? 0, [Validators.required]],
      soakingDescription: [preset?.soak || ''],
      coolingMediumID: [preset?.coolingId || null]
    }));
    this.HeatTreatmentForm.markAsDirty();
  }

  removeStage(index: number) {
    if (this.isViewMode) return;
    this.stages.removeAt(index);
    // Renumber remaining stages
    this.stages.controls.forEach((ctrl, idx) => {
      ctrl.patchValue({ stageNumber: idx + 1 });
    });
    this.HeatTreatmentForm.markAsDirty();
  }

  fetchData() {
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm;
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.payload.filter = this.filters?.length ? this.filters : null;

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
    });
  }

  getDetails(): void {
    const requestId = this.heatTreatmentId;
    this.heatTreatmentService.getHeatTreatmentById(requestId).subscribe({
      next: (response) => {
        if (this.heatTreatmentId !== requestId) return;
        this.customerTypeObject = response;

        this.HeatTreatmentForm.patchValue({
          id: response.id,
          code: response.code,
          name: response.name,
          heatTreatmentCategoryID: response.heatTreatmentCategoryID
        });

        // Set Category Item
        if (response.heatTreatmentCategoryID) {
          this.selectedCategoryItem = {
            id: response.heatTreatmentCategoryID,
            name: response.heatTreatmentCategory?.name || response.heatTreatmentCategoryName
          };
        } else {
          this.selectedCategoryItem = null;
        }

        // Metal Classifications
        if (response.applicableClassifications?.length > 0) {
          const ids = response.applicableClassifications.map((c: any) => c.metalClassificationID || c.id);
          this.HeatTreatmentForm.get('applicableClassificationIds')?.setValue(ids);
        } else {
          this.HeatTreatmentForm.get('applicableClassificationIds')?.setValue([]);
        }

        // Stages FormArray
        this.stages.clear();
        if (response.stages && response.stages.length > 0) {
          response.stages.sort((a: any, b: any) => (a.stageNumber || 0) - (b.stageNumber || 0));
          response.stages.forEach((s: any, idx: number) => {
            this.stages.push(this.fb.group({
              id: [s.id || 0],
              heatTreatmentID: [s.heatTreatmentID || requestId],
              stageNumber: [s.stageNumber || idx + 1],
              stageName: [s.stageName || '', [Validators.required, noWhitespaceValidator()]],
              tempRangeMin: [s.tempRangeMin ?? 0, [Validators.required]],
              tempRangeMax: [s.tempRangeMax ?? 0, [Validators.required]],
              soakingDescription: [s.soakingDescription || ''],
              coolingMediumID: [s.coolingMediumID || null]
            }));
          });
        }

        if (this.isViewMode) {
          this.HeatTreatmentForm.disable();
        }
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || 'Error loading heat treatment details', 'error');
      }
    });
  }

  openModal(type: string, id: number): void {
    this.initForm();
    this.selectedCategoryItem = null;
    this.customerTypeObject = null;
    this.heatTreatmentId = 0;
    this.submitted = false;

    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Create Heat Treatment Cycle';
      this.HeatTreatmentForm.enable();
      // Add initial Austenitizing stage
      this.addStage({ name: 'Austenitizing / Heating', min: 850, max: 900, soak: '1 hr per 25mm thickness' });
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Edit Heat Treatment Cycle';
      this.HeatTreatmentForm.enable();
      this.heatTreatmentId = id;
      this.getDetails();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Heat Treatment Cycle';
      this.heatTreatmentId = id;
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
    this.initForm();
    this.customerTypeObject = null;
    this.heatTreatmentId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
    this.submitted = false;
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.HeatTreatmentForm, path, this.submitted);
  }

  onCategorySelected(item: any): void {
    this.selectedCategoryItem = item;
    this.HeatTreatmentForm.patchValue({
      heatTreatmentCategoryID: item?.id ?? null
    });
    this.HeatTreatmentForm.markAsDirty();
  }

  onClassificationSelected(selectedItems: any[]): void {
    const ids = selectedItems.map((item: any) => item.id || item);
    this.HeatTreatmentForm.get('applicableClassificationIds')?.setValue(ids);
    this.HeatTreatmentForm.markAsDirty();
  }

  onStageCoolingSelected(item: any, index: number): void {
    const row = this.stages.at(index);
    if (row) {
      row.patchValue({ coolingMediumID: item?.id ?? null });
      this.HeatTreatmentForm.markAsDirty();
    }
  }

  // Dropdowns
  getCategoryDropdown = (s: string, p: number, ps: number) =>
    this.heatTreatmentCategoryService.getHeatTreatmentCategoryDropdown(s, p, ps);

  getCoolingMediumDropdown = (s: string, p: number, ps: number) =>
    this.coolingMediumService.getCoolingMediumDropdown(s, p, ps);

  getMetalClassificationDropdown = (s: string, p: number, ps: number) =>
    this.metalClassificationService.getMetalClassificationDropdown(s, p, ps);

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
    const confirmed = window.confirm('Are you sure you want to delete this Heat Treatment record?');
    if (confirmed) {
      this.heatTreatmentService.deleteHeatTreatment(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message || 'Heat Treatment deleted successfully', 'success');
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
    FormValidationHelper.markAllTouched(this.HeatTreatmentForm);

    if (!this.HeatTreatmentForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }

    const raw = this.HeatTreatmentForm.getRawValue();
    const classIds = raw.applicableClassificationIds || [];

    const formData = {
      ...raw,
      applicableClassifications: classIds.map((id: number) => ({ metalClassificationID: id }))
    };

    if (this.isEditMode) {
      this.heatTreatmentService.updateHeatTreatment(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Heat Treatment updated successfully', 'success');
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
          this.toastService.show(response.message || 'Heat Treatment created successfully', 'success');
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
