import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ProductSpecificationService } from '../../../services/product-specification.service';
import { ToastService } from '../../../services/toast.service';
import { CommonModule } from '@angular/common';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { Observable } from 'rxjs';
import { SearchableDropdownModalComponent } from '../../../utility/components/searchable-dropdown-modal/searchable-dropdown-modal.component';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { ProductTestGroupService } from '../../../services/product-test-group.service';
import { ProductSpecificationGradeService } from '../../../services/product-specification-grade.service';
import { YearHelper } from '../../../utility/helper/year.helper';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-custom-product-specification',
  imports: [ CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SearchableDropdownModalComponent, DecimalOnlyDirective, FormFieldErrorComponent, PaginationComponent ],
  templateUrl: './custom-product-specification.component.html',
  styleUrl: './custom-product-specification.component.css'
})
export class CustomProductSpecificationComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'specificationName', type: 'string', label: 'Specification Name', filter: true },
    { key: 'aliasName', type: 'string', label: 'Alias Name', filter: true },
    { key: 'specificationCode', type: 'string', label: 'Specification Code', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    specificationName: 'string',
    aliasName: 'string',
    specificationCode: 'string',
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
  ProductSpecificationList: any[] = [];

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

  ProductSpecificationForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  productSpecificationId: number = 0;
  formTitle = 'Custom Product Specification Form';

  activeTab = 'details';
  testGroups: any[] = [];
  specGrades: any[] = [];
  newTestGroup: any = { laboratoryTestID: 0, laboratoryTestName: '', testMethodSpecificationID: 0, testMethodSpecificationName: '', isPerBatch: false, year: null };
  yearOptions: number[] = YearHelper.standardYears();
  newSpecGrade: any = { specificationGradeID: 0, specificationGradeName: '', aliasName: '' };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private productSpecificationService: ProductSpecificationService,
    private toastService: ToastService,
    private materialSpecificationService: MaterialSpecificationService,
    private laboratoryTestService: LaboratoryTestService,
    private metalService: MetalClassificationService,
    private productTestGroupService: ProductTestGroupService,
    private productSpecGradeService: ProductSpecificationGradeService
  ) {
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
      specificationName: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      aliasName: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      specificationCode: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      gradeID: ['', Validators.required],
      laboratoryTestID: ['', Validators.required],
      metalClassificationID: ['', Validators.required],
      isCustom: [true],
      size: [''],
    });
  }

  fetchData() {
    const customPayload = { ...this.payload, filter: [...(this.filters ?? []), { column: 'isCustom', type: 'Equal', value: 'true', value2: '' }] };
    this.productSpecificationService.getAllProductSpecifications(customPayload).subscribe({
      next: (response) => {
        this.ProductSpecificationList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: () => {
        this.ProductSpecificationList = [];
      }
    });
  }

  getDetails(): void {
    const requestId = this.productSpecificationId;
    this.productSpecificationService.getProductSpecificationById(requestId).subscribe({
      next: (response) => {
        if (this.productSpecificationId !== requestId) return;
        this.ProductSpecificationForm.patchValue(response);
      },
      error: () => {}
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
      if (col.key === column) this.filterColumnTitle = col.label;
    });
    this.filterValue = '';
    this.filterValue2 = '';
    const columnType = this.filterColumnTypes[column];
    switch (columnType) {
      case 'string': this.filterType = 'Contains'; break;
      case 'number': this.filterType = 'Equal'; break;
      case 'date': this.filterType = 'Between'; break;
      default: this.filterType = 'Contains';
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
    if (this.filterModal) this.filterModal.nativeElement.style.display = 'none';
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
    return this.columns.find(col => col.key === columnKey)?.type;
  }

  deleteFn(id: number): void {
    if (id <= 0) return;
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    this.productSpecificationService.deleteProductSpecification(id).subscribe({
      next: (response) => {
        this.fetchData();
        this.toastService.show(response.message, 'success');
      },
      error: () => {}
    });
  }

  openModal(type: string, id: number): void {
    this.ProductSpecificationForm.reset();
    this.ProductSpecificationForm.enable();
    this.activeTab = 'details';
    this.productSpecificationId = 0;
    if (id > 0) {
      this.productSpecificationId = id;
      this.getDetails();
      this.loadTestGroups(id);
      this.loadSpecGrades(id);
    } else {
      this.testGroups = [];
      this.specGrades = [];
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      this.formTitle = 'Custom Product Specification Form';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Custom Product Specification Form';
      this.ProductSpecificationForm.enable();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Custom Product Specification';
      this.ProductSpecificationForm.disable();
    }
    this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) this.bsModal.hide();
    this.ProductSpecificationForm.reset();
    this.ProductSpecificationForm.enable();
    this.productSpecificationId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
    this.submitted = false;
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.ProductSpecificationForm, path, this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.ProductSpecificationForm);
    if (this.ProductSpecificationForm.valid) {
      const formData = { ...this.ProductSpecificationForm.value, isCustom: true };
      if (this.isEditMode) {
        this.productSpecificationService.updateProductSpecification(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.closeModal();
            this.fetchData();
          },
          error: () => {}
        });
      } else {
        formData.id = 0;
        this.productSpecificationService.createProductSpecification(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.closeModal();
            this.fetchData();
          },
          error: () => {}
        });
      }
    } else {
      this.toastService.show('Please fill all required fields.', 'warning');
    }
  }

  getMaterialSpecificationGrade = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.materialSpecificationService.getMaterialSpecificationGradeDropdown(term, page, pageSize);
  };
  getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };
  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalService.getMetalClassificationDropdown(term, page, pageSize);
  };

  onGradeSelected(item: any) {
    if (!item) {
      this.ProductSpecificationForm.patchValue({ gradeID: null });
      return;
    }
    this.ProductSpecificationForm.patchValue({ gradeID: item.id });
  }
  onLaboratorySelected(item: any) {
    if (!item) {
      this.ProductSpecificationForm.patchValue({ laboratoryTestID: null });
      return;
    }
    this.ProductSpecificationForm.patchValue({ laboratoryTestID: item.id });
  }
  onMetalSelected(item: any) {
    if (!item) {
      this.ProductSpecificationForm.patchValue({ metalClassificationID: null });
      return;
    }
    this.ProductSpecificationForm.patchValue({ metalClassificationID: item.id });
  }

  loadTestGroups(productSpecId: number) {
    this.productTestGroupService.getByProductSpec(productSpecId).subscribe({
      next: (data) => this.testGroups = data || [],
      error: () => this.testGroups = []
    });
  }

  loadSpecGrades(productSpecId: number) {
    this.productSpecGradeService.getByProductSpec(productSpecId).subscribe({
      next: (data) => this.specGrades = data || [],
      error: () => this.specGrades = []
    });
  }

  onTestGroupLabTestSelected(item: any) {
    this.newTestGroup.laboratoryTestID = item.id;
    this.newTestGroup.laboratoryTestName = item.name;
  }

  addTestGroup() {
    if (!this.newTestGroup.laboratoryTestID) {
      this.toastService.show('Please select a Laboratory Test', 'error');
      return;
    }
    const payload = {
      id: 0,
      productSpecificationID: this.productSpecificationId,
      laboratoryTestID: this.newTestGroup.laboratoryTestID,
      testMethodStandardID: null,
      isPerBatch: this.newTestGroup.isPerBatch,
      year: this.newTestGroup.year ?? null
    };
    this.productTestGroupService.create(payload).subscribe({
      next: (response) => {
        this.toastService.show(response.message || 'Test Group added', 'success');
        this.loadTestGroups(this.productSpecificationId);
        this.newTestGroup = { laboratoryTestID: 0, laboratoryTestName: '', isPerBatch: false, year: null };
      },
      error: () => {}
    });
  }

  removeTestGroup(id: number) {
    if (!confirm('Are you sure you want to remove this test group?')) return;
    this.productTestGroupService.delete(id).subscribe({
      next: (response) => {
        this.toastService.show(response.message || 'Test Group removed', 'success');
        this.loadTestGroups(this.productSpecificationId);
      },
      error: () => {}
    });
  }

  onSpecGradeSelected(item: any) {
    this.newSpecGrade.specificationGradeID = item.id;
    this.newSpecGrade.specificationGradeName = item.name;
  }

  addSpecGrade() {
    if (!this.newSpecGrade.specificationGradeID) {
      this.toastService.show('Please select a Specification Grade', 'error');
      return;
    }
    const payload = {
      id: 0,
      productSpecificationID: this.productSpecificationId,
      specificationGradeID: this.newSpecGrade.specificationGradeID,
      aliasName: this.newSpecGrade.aliasName
    };
    this.productSpecGradeService.create(payload).subscribe({
      next: (response) => {
        this.toastService.show(response.message || 'Grade added', 'success');
        this.loadSpecGrades(this.productSpecificationId);
        this.newSpecGrade = { specificationGradeID: 0, specificationGradeName: '', aliasName: '' };
      },
      error: () => {}
    });
  }

  removeSpecGrade(id: number) {
    if (!confirm('Are you sure you want to remove this grade?')) return;
    this.productSpecGradeService.delete(id).subscribe({
      next: (response) => {
        this.toastService.show(response.message || 'Grade removed', 'success');
        this.loadSpecGrades(this.productSpecificationId);
      },
      error: () => {}
    });
  }
}
