import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ConditionMasterService } from '../../services/condition-master.service';
import { ParameterUnitService } from '../../services/parameter-unit.service';
import { ToastService } from '../../services/toast.service';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ConditionMasterDto } from '../../models/condition-master.model';

@Component({
  selector: 'app-condition-master',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    PaginationComponent,
    BreadcrumbComponent,
    SearchableDropdownComponent
  ],
  templateUrl: './condition-master.component.html',
  styleUrl: './condition-master.component.css',
})
export class ConditionMasterComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  @ViewChild('viewModalRef') viewModalElement!: ElementRef;
  @ViewChild('deleteModalRef') deleteModalElement!: ElementRef;

  private bsModal!: Modal;
  private bsViewModal!: Modal;
  private bsDeleteModal!: Modal;

  // Filter state
  filterSearch: string = '';
  filterCategory: string = '';
  filterValueType: string = '';
  filterStatus: string = ''; // '' = All, 'true' = Active, 'false' = Inactive

  // Standard metadata options
  standardCategories: string[] = [
    'Thermal',
    'Dimensional',
    'Environmental',
    'Temporal',
    'Operational',
    'State',
    'General'
  ];

  standardValueTypes: string[] = [
    'Decimal',
    'Integer',
    'Text',
    'Boolean',
    'Date',
    'DateTime',
    'Selection'
  ];

  allOperatorsForType: { [key: string]: string[] } = {
    'Decimal': ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'],
    'Integer': ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'],
    'Date': ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'],
    'DateTime': ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'],
    'Text': ['=', '!=', 'CONTAINS'],
    'Boolean': ['=', '!='],
    'Selection': ['=', '!=', 'IN']
  };

  // Grid state
  conditionList: ConditionMasterDto[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'displayOrder';
  sortOrder: string = 'asc';

  // Modal / Form state
  conditionForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Condition Master';

  // Selection value tags input
  newDiscreteValue: string = '';
  discreteValues: string[] = [];

  // View Modal state
  viewItem: ConditionMasterDto | null = null;

  // Delete modal state
  itemToDelete: ConditionMasterDto | null = null;

  constructor(
    private fb: FormBuilder,
    private conditionService: ConditionMasterService,
    private unitService: ParameterUnitService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  initForm(): void {
    this.conditionForm = this.fb.group({
      id: [0],
      code: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern('^[A-Za-z0-9_]+$')
        ]
      ],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      category: ['General', [Validators.required, Validators.maxLength(50)]],
      valueType: ['Decimal', [Validators.required]],
      parameterUnitID: [null],
      allowedOperators: [['=', '!=', '>', '>=', '<', '<=', 'BETWEEN']],
      defaultValue: ['', [Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });

    // Listen to ValueType changes to update default operators & clear discrete values
    this.conditionForm.get('valueType')?.valueChanges.subscribe((val: string) => {
      if (val && this.allOperatorsForType[val]) {
        const available = this.allOperatorsForType[val];
        const current = this.conditionForm.get('allowedOperators')?.value || [];
        // Keep valid operators or reset to available
        const filtered = current.filter((op: string) => available.includes(op));
        this.conditionForm.patchValue({
          allowedOperators: filtered.length > 0 ? filtered : available
        });
      }
      if (val !== 'Selection') {
        this.discreteValues = [];
      }
    });
  }

  fetchData(): void {
    const filters: any[] = [];

    if (this.filterCategory) {
      filters.push({ column: 'category', type: 'Equal', value: this.filterCategory });
    }

    if (this.filterValueType) {
      filters.push({ column: 'valueType', type: 'Equal', value: this.filterValueType });
    }

    if (this.filterStatus !== '') {
      filters.push({ column: 'isActive', type: 'Equal', value: this.filterStatus === 'true' });
    }

    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      searchTerm: this.filterSearch.trim(),
      filter: filters.length > 0 ? filters : null
    };

    this.conditionService.getAllConditionMasters(payload).subscribe({
      next: (res: any) => {
        this.conditionList = res.items || res.data || [];
        this.totalItems = res.totalRecords || 0;
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to fetch condition masters.', 'error');
      }
    });
  }

  applyFilters(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  clearFilters(): void {
    this.filterSearch = '';
    this.filterCategory = '';
    this.filterValueType = '';
    this.filterStatus = '';
    this.pageNumber = 1;
    this.fetchData();
  }

  onSort(column: string): void {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.fetchData();
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.fetchData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageNumber = 1;
    this.fetchData();
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.isViewMode = false;
    this.submitted = false;
    this.selectedId = 0;
    this.discreteValues = [];
    this.newDiscreteValue = '';
    this.formTitle = 'Add Condition Master';

    this.conditionForm.reset({
      id: 0,
      code: '',
      name: '',
      category: 'General',
      valueType: 'Decimal',
      parameterUnitID: null,
      allowedOperators: ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'],
      defaultValue: '',
      description: '',
      displayOrder: this.conditionList.length + 1,
      isActive: true
    });
    this.conditionForm.enable();

    this.showModal();
  }

  openEditModal(item: ConditionMasterDto): void {
    this.isEditMode = true;
    this.isViewMode = false;
    this.submitted = false;
    this.selectedId = item.id;
    this.formTitle = 'Edit Condition Master';

    this.discreteValues = item.allowedValues ? [...item.allowedValues] : [];
    this.newDiscreteValue = '';

    this.conditionForm.reset({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      valueType: item.valueType,
      parameterUnitID: item.parameterUnitID,
      allowedOperators: item.allowedOperators && item.allowedOperators.length > 0
        ? [...item.allowedOperators]
        : (this.allOperatorsForType[item.valueType] || ['=']),
      defaultValue: item.defaultValue || '',
      description: item.description || '',
      displayOrder: item.displayOrder,
      isActive: item.isActive
    });
    this.conditionForm.enable();

    this.showModal();
  }

  openViewModal(item: ConditionMasterDto): void {
    this.viewItem = item;
    if (!this.bsViewModal) {
      this.bsViewModal = new Modal(this.viewModalElement.nativeElement, { backdrop: 'static' });
    }
    this.bsViewModal.show();
  }

  closeViewModal(): void {
    if (this.bsViewModal) {
      this.bsViewModal.hide();
    }
  }

  confirmDelete(item: ConditionMasterDto): void {
    this.itemToDelete = item;
    if (!this.bsDeleteModal) {
      this.bsDeleteModal = new Modal(this.deleteModalElement.nativeElement, { backdrop: 'static' });
    }
    this.bsDeleteModal.show();
  }

  closeDeleteModal(): void {
    if (this.bsDeleteModal) {
      this.bsDeleteModal.hide();
    }
    this.itemToDelete = null;
  }

  executeDelete(): void {
    if (!this.itemToDelete) return;

    this.conditionService.deleteConditionMaster(this.itemToDelete.id).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || 'Condition Master deleted successfully.', 'success');
        this.closeDeleteModal();
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to delete Condition Master.', 'error');
      }
    });
  }

  toggleActive(item: ConditionMasterDto): void {
    this.conditionService.toggleStatus(item.id).subscribe({
      next: (res: any) => {
        item.isActive = res.isActive;
        this.toastService.show(res.message || 'Status updated successfully.', 'success');
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to update status.', 'error');
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.conditionForm.invalid) {
      this.conditionForm.markAllAsTouched();
      return;
    }

    const formVal = this.conditionForm.value;

    // Validate Selection type requires discrete values
    if (formVal.valueType === 'Selection' && this.discreteValues.length === 0) {
      this.toastService.show('Please add at least one allowed value for Selection type.', 'error');
      return;
    }

    const payload: any = {
      code: (formVal.code || '').trim().toUpperCase(),
      name: (formVal.name || '').trim(),
      category: (formVal.category || 'General').trim(),
      valueType: formVal.valueType,
      parameterUnitID: formVal.parameterUnitID || null,
      allowedOperators: formVal.allowedOperators || [],
      allowedValues: formVal.valueType === 'Selection' ? this.discreteValues : null,
      defaultValue: formVal.defaultValue ? formVal.defaultValue.trim() : null,
      description: formVal.description ? formVal.description.trim() : null,
      displayOrder: formVal.displayOrder || 0,
      isActive: formVal.isActive ?? true
    };

    if (this.isEditMode) {
      payload.id = this.selectedId;
      this.conditionService.updateConditionMaster(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Condition Master updated successfully.', 'success');
          this.hideModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to update Condition Master.', 'error');
        }
      });
    } else {
      this.conditionService.createConditionMaster(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Condition Master created successfully.', 'success');
          this.hideModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to create Condition Master.', 'error');
        }
      });
    }
  }

  // Operator selection toggle
  isOperatorSelected(op: string): boolean {
    const list: string[] = this.conditionForm.get('allowedOperators')?.value || [];
    return list.includes(op);
  }

  toggleOperator(op: string): void {
    const list: string[] = [...(this.conditionForm.get('allowedOperators')?.value || [])];
    const idx = list.indexOf(op);
    if (idx > -1) {
      if (list.length > 1) {
        list.splice(idx, 1);
      } else {
        this.toastService.show('At least one allowed operator must remain selected.', 'warning');
        return;
      }
    } else {
      list.push(op);
    }
    this.conditionForm.patchValue({ allowedOperators: list });
  }

  getAvailableOperatorsForCurrentType(): string[] {
    const type = this.conditionForm.get('valueType')?.value || 'Decimal';
    return this.allOperatorsForType[type] || ['=', '!='];
  }

  // Discrete values management
  addDiscreteValue(): void {
    const val = this.newDiscreteValue.trim();
    if (!val) return;
    if (this.discreteValues.some(v => v.toLowerCase() === val.toLowerCase())) {
      this.toastService.show(`'${val}' is already in the allowed values list.`, 'warning');
      return;
    }
    this.discreteValues.push(val);
    this.newDiscreteValue = '';
  }

  removeDiscreteValue(index: number): void {
    this.discreteValues.splice(index, 1);
  }

  // Parameter Unit Dropdown function
  getUnitDropdown = (searchTerm: string = '', pageNumber: number = 0, pageSize: number = 50) => {
    return this.unitService.getParameterUnitDropdown(searchTerm, pageNumber, pageSize);
  };

  onUnitSelected(event: any): void {
    this.conditionForm.patchValue({
      parameterUnitID: event?.id || null
    });
  }

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  private showModal(): void {
    if (!this.bsModal) {
      this.bsModal = new Modal(this.modalElement.nativeElement, { backdrop: 'static' });
    }
    this.bsModal.show();
  }

  hideModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch ((category || '').toLowerCase()) {
      case 'thermal': return 'badge-category-thermal';
      case 'dimensional': return 'badge-category-dimensional';
      case 'environmental': return 'badge-category-environmental';
      case 'temporal': return 'badge-category-temporal';
      case 'operational': return 'badge-category-operational';
      case 'state': return 'badge-category-state';
      default: return 'badge-category-general';
    }
  }

  getValueTypeBadgeClass(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'decimal':
      case 'integer': return 'badge-type-numeric';
      case 'selection': return 'badge-type-selection';
      case 'boolean': return 'badge-type-boolean';
      case 'date':
      case 'datetime': return 'badge-type-temporal';
      default: return 'badge-type-text';
    }
  }
}
