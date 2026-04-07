import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, signal, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { MetalClassificationService } from '../../services/metal-classification.service';
import { ToastService } from '../../services/toast.service';
import { ParameterService } from '../../services/parameter.service';
import { Observable } from 'rxjs';
import { MultiSelectDropdownComponent } from '../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';

@Component({
  selector: 'app-metal-classification',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, MultiSelectDropdownComponent, SearchableDropdownComponent, FormFieldErrorComponent],
  templateUrl: './metal-classification.component.html',
  styleUrl: './metal-classification.component.css'
})
export class MetalClassificationComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'code', type: 'string', label: 'Code', filter: true },
    { key: 'name', type: 'string', label: 'Name', filter: true },
    { key: 'hasChemicalParams', type: 'string', label: 'Chemical', filter: false },
    { key: 'hasMechanicalParams', type: 'string', label: 'Mechanical', filter: false },
    { key: 'sortOrder', type: 'number', label: 'Sort Order', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    code: 'string',
    name: 'string',
    sortOrder: 'number',
    modifiedOn: 'date',
  };

  // common filter variables
  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

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

  // form base varryable
  MetalClassificationForm!: FormGroup;
  submitted = false;
  MetalClassificationList: any[] = [];
  metalClassificationId: number = 0;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  formTitle = 'Metal Classification Form';

  preSelectedItems = [2, 3];

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private metalclassificationService: MetalClassificationService, private toastService: ToastService, private parameterService: ParameterService) {
  }
  ngOnInit() {
    this.fetchData();
    this.initForm();
  }
  initForm() {
    this.MetalClassificationForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      code: ['', [Validators.required, noWhitespaceValidator(), Validators.maxLength(50)]],
      parentID: [null],
      hasChemicalParams: [false],
      hasMechanicalParams: [false],
      sortOrder: [0],
      parameterIds: [[]],
      parameters: this.fb.array([]),
    });
  }
  fetchData() {
    this.metalclassificationService.getAllMetalClassifications(this.payload).subscribe({
      next: (response) => {
        this.MetalClassificationList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        this.MetalClassificationList = [];
      }
    }

    );
  }
  getDetails(): void {
    const requestId = this.metalClassificationId;
    this.metalclassificationService.getMetalClassificationById(requestId).subscribe({
      next: (response) => {
        if (this.metalClassificationId !== requestId) return; // discard stale response
        this.customerTypeObject = response;
        this.MetalClassificationForm.patchValue(response);
        this.MetalClassificationForm.patchValue({
          parameterIds: response?.parameters?.map((x:any) => x.parameterID) ?? []
        });
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
    const filterData = { column: this.filterColumn, type: this.filterType, value: String(this.filterValue), value2: this.filterValue2 ? String(this.filterValue2) : undefined };

    if (existingFilterIndex > -1) {
      this.filters[existingFilterIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }

    this.payload.filter = this.filters;
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
      this.metalclassificationService.deleteMetalClassification(id).subscribe({
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
    this.parameterReloadKey++;
    this.metalClassificationId = 0;
    if (id > 0) {
      this.metalClassificationId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Metal Classification Form';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Metal Classification Form';
    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Metal Classification';
      this.MetalClassificationForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.MetalClassificationForm, path, this.submitted);
  }

  closeModal(): void {
    this.submitted = false;
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.initForm();
    this.metalClassificationId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  parameterReloadKey = 0;

  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    const hasChem = this.MetalClassificationForm?.get('hasChemicalParams')?.value;
    const hasMech = this.MetalClassificationForm?.get('hasMechanicalParams')?.value;
    if (hasChem && hasMech) {
      return this.parameterService.getParameterDropdown(term, page, pageSize);
    } else if (hasChem) {
      return this.parameterService.getChemicalParameterDropdown(term, page, pageSize);
    } else if (hasMech) {
      return this.parameterService.getMechanicalParameterDropdown(term, page, pageSize);
    }
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

  onCheckboxChange(): void {
    this.parameterReloadKey++;
    const isChemical = this.MetalClassificationForm.get('hasChemicalParams')?.value;
    const isMechanical = this.MetalClassificationForm.get('hasMechanicalParams')?.value;
    if (!isChemical && !isMechanical) {
      this.MetalClassificationForm.patchValue({ parameterIds: [] });
    }
  }

  onParameterSelected(item: any[]) {
    console.log("selected item", item);
    const selectIds: number[] = [];
    const parameterArray = this.MetalClassificationForm.get('parameters') as FormArray;
    parameterArray.clear();
    item.forEach((x) => {
      selectIds.push(x.id);
      parameterArray.push(
        this.fb.group({
          MetalClassificationID: [this.MetalClassificationForm.get('id')?.value || 0],
          ParameterID: [x.id],
        })
      );
    })
    this.MetalClassificationForm.patchValue({ parameterIds: selectIds });
  }

  getParentDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.metalclassificationService.getMetalClassificationDropdown(searchTerm, pageNo, pageSize);
  };

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  @HostListener('window:focus')
  onWindowFocus(): void {}

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.MetalClassificationForm);
    if (!this.MetalClassificationForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }
    let formData = this.MetalClassificationForm.value;
    const hasParams = formData.hasChemicalParams || formData.hasMechanicalParams;
    const parameterArray = this.MetalClassificationForm.get('parameters') as FormArray;
    if (hasParams && parameterArray.length === 0) {
      this.toastService.show('Please select at least one parameter.', 'warning');
      return;
    }
    if (this.isEditMode) {
      this.metalclassificationService.updateMetalClassification(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          this.MetalClassificationForm.reset();
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        }
      });
    } else {
      formData.id = 0;
      this.metalclassificationService.createMetalClassification(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          this.MetalClassificationForm.reset();
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


