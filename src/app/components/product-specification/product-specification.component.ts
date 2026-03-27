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
import { Select2Option, Select2UpdateEvent, Select2UpdateValue } from 'ng-select2-component';
import { LaboratoryTestService } from '../../services/laboratory-test.service';
import { MetalClassificationService } from '../../services/metal-classification.service';
import { TestMethodSpecificationService } from '../../services/test-method-specification.service';
import { ProductTestGroupService } from '../../services/product-test-group.service';
import { ProductSpecificationGradeService } from '../../services/product-specification-grade.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';

@Component({
  selector: 'app-product-specification',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SearchableDropdownModalComponent, DecimalOnlyDirective, FormFieldErrorComponent],
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
    { key: 'modifiedOn', type: 'date', label: 'Modified At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    specificationName: 'string',
    aliasName: 'string',
    materialSpecification: 'string',
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

  // form
  ProductSpecificationForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  productSpecificationId: number = 0;
  formTitle = 'Product Specfication Form';

  activeTab = 'details';
  testGroups: any[] = [];
  specGrades: any[] = [];
  newTestGroup: any = { laboratoryTestID: 0, laboratoryTestName: '', testMethodSpecificationID: 0, testMethodSpecificationName: '', isPerBatch: false, year: '' };
  newSpecGrade: any = { specificationGradeID: 0, specificationGradeName: '', aliasName: '' };

  testMethods: any[] = [
    { value: 1, label: 'Test Method 1' },
    { value: 2, label: 'Test Method 2' },
    { value: 3, label: 'Test Method 3' },
    { value: 4, label: 'Test Method 4' },
    { value: 5, label: 'Test Method 5' },
  ];

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private productSpecificationService: ProductSpecificationService, private toastService: ToastService, private materialSpecificationService: MaterialSpecificationService, private laboratoryTestService: LaboratoryTestService, private metalService: MetalClassificationService, private testMethodSpecificationService: TestMethodSpecificationService, private productTestGroupService: ProductTestGroupService, private productSpecGradeService: ProductSpecificationGradeService) {
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
      gradeID : ['', Validators.required],
      laboratoryTestID: ['', Validators.required],
      metalClassificationID: ['', Validators.required],
      testMethodSpecificationID: ['', Validators.required],
      testMethodSpecificationVersionID: [null],
      isCustom: [false],
      size: [''],
    });
  }

  fetchData() {
    this.productSpecificationService.getAllProductSpecifications(this.payload).subscribe({
      next: (response) => {
        this.ProductSpecificationList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: () => {
        this.ProductSpecificationList = [];
      }
    }

    );
  }
  getDetails(): void {
    const requestId = this.productSpecificationId;
    this.productSpecificationService.getProductSpecificationById(requestId).subscribe({
      next: (response) => {
        if (this.productSpecificationId !== requestId) return; // discard stale response
        this.customerTypeObject = response;
        this.ProductSpecificationForm.patchValue(response);
        // Load version dropdown if spec has testMethodSpecificationID
        if (response.testMethodSpecificationID) {
          this.loadSpecVersions(response.testMethodSpecificationID);
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
      this.productSpecificationService.deleteProductSpecification(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: () => {}
      });
    }
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
      this.formTitle = 'Product Specification Form';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Product Specification Form';
      this.ProductSpecificationForm.enable();
    } else if (type === 'view') {
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
      let formData = this.ProductSpecificationForm.value;
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
  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);
  };
  onGradeSelected(item: any) {
    this.ProductSpecificationForm.patchValue({ gradeID : item.id });
  }
  onLaboratorySelected(item:any){
    this.ProductSpecificationForm.patchValue({ laboratoryTestID: item.id });
  }
  onMetalSelected(item:any){
    this.ProductSpecificationForm.patchValue({ metalClassificationID: item.id });
  }
  specVersions: any[] = [];
  onTestSpecificationSelected(item:any){
    this.ProductSpecificationForm.patchValue({ testMethodSpecificationID: item.id, testMethodSpecificationVersionID: null });
    this.loadSpecVersions(item.id);
  }
  loadSpecVersions(specId: number) {
    this.testMethodSpecificationService.getVersionsDropdown(specId).subscribe({
      next: (data) => {
        this.specVersions = data || [];
        if (this.specVersions.length === 1) {
          this.ProductSpecificationForm.patchValue({ testMethodSpecificationVersionID: this.specVersions[0].id });
        }
      },
      error: () => { this.specVersions = []; }
    });
  }
  onLaboratoryTestChange(selectedIds: Select2UpdateEvent<Select2UpdateValue>) {
    const line = this.ProductSpecificationForm.get('testMethods') as FormArray;
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

  onTestGroupMethodSelected(item: any) {
    this.newTestGroup.testMethodSpecificationID = item.id;
    this.newTestGroup.testMethodSpecificationName = item.name;
  }

  addTestGroup() {
    if (!this.newTestGroup.laboratoryTestID || !this.newTestGroup.testMethodSpecificationID) {
      this.toastService.show('Please select Laboratory Test and Test Method Specification', 'error');
      return;
    }
    const payload = {
      id: 0,
      productSpecificationID: this.productSpecificationId,
      laboratoryTestID: this.newTestGroup.laboratoryTestID,
      testMethodStandardID: this.newTestGroup.testMethodSpecificationID,
      isPerBatch: this.newTestGroup.isPerBatch,
      year: this.newTestGroup.year ? parseInt(this.newTestGroup.year, 10) : null
    };
    this.productTestGroupService.create(payload).subscribe({
      next: (response) => {
        this.toastService.show(response.message || 'Test Group added', 'success');
        this.loadTestGroups(this.productSpecificationId);
        this.newTestGroup = { laboratoryTestID: 0, laboratoryTestName: '', testMethodSpecificationID: 0, testMethodSpecificationName: '', isPerBatch: false, year: '' };
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


