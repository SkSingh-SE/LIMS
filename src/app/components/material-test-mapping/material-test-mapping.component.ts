import { LaboratoryTestService } from './../../services/laboratory-test.service';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { MetalClassificationService } from '../../services/metal-classification.service';
import { ToastService } from '../../services/toast.service';
import { ProductConditionService } from '../../services/product-condition.service';
import { MaterialSpecificationService } from '../../services/material-specification.service';
import { CommonModule } from '@angular/common';
import { MaterialTestMappingService } from '../../services/material-test-mapping.service';
import { SearchableDropdownModalComponent } from '../../utility/components/searchable-dropdown-modal/searchable-dropdown-modal.component';
import { MultiSelectDropdownComponent } from '../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { of } from 'rxjs';

@Component({
  selector: 'app-material-test-mapping',
  templateUrl: './material-test-mapping.component.html',
  styleUrls: ['./material-test-mapping.component.css'],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SearchableDropdownModalComponent, MultiSelectDropdownComponent],
})
export class MaterialTestMappingComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'metalClassification', type: 'string', label: 'Metal Classification', filter: true },
    { key: 'productCondition', type: 'string', label: 'Product Condition', filter: true },
    { key: 'grade', type: 'string', label: 'Grade', filter: true },
    { key: 'laboratoryTest', type: 'string', label: 'Laboratory Test', filter: true },
    { key: 'createdOn', type: 'date', label: 'Created At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    metalClassification: 'string',
    productCondition: 'string',
    grade: 'string',
    laboratoryTest: 'string',
    createdOn: 'date'
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

  // form base varryable
  MappingForm!: FormGroup;
  mappingList: any[] = [];
  mappingId: number = 0;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  formTitle = 'Test Mapping Form';

  // dropdowns and parameter options
  parametersOptions: Array<{ id: number; name: string }> = [];

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private metalclassificationService: MetalClassificationService, private toastService: ToastService, private productConditionService: ProductConditionService, private materialSpecService: MaterialSpecificationService, private materialTestMappingService: MaterialTestMappingService, private laboratoryTestService: LaboratoryTestService) {
  }
  ngOnInit() {
    this.fetchData();
    this.initForm();
  }
  initForm() {
    this.MappingForm = this.fb.group({
      id: [0],
      metalClassificationID: [null],
      productConditionID: [null],
      gradeID: [null, [Validators.required]],
      laboratoryTestID: [null],
      laboratoryTestIDs: [[], [Validators.required]],
      laboratoryTests: this.fb.array([]),
      isDefault: [false]
    });

  }
  get laboratoryTests(): FormArray {
    return this.MappingForm.get('laboratoryTests') as FormArray;
  }
  fetchData() {
    this.isLoading.set(true);
    this.materialTestMappingService.getAllMaterialTestMappings(this.payload).subscribe({
      next: (response) => {
        this.mappingList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.show(error.message ?? 'Error', 'error');
        this.mappingList = [];
        this.isLoading.set(false);
      }
    });
  }
  getDetails(): void {
    if (!this.mappingId || this.mappingId <= 0) return;
    this.materialTestMappingService.getMaterialTestMappingById(this.mappingId).subscribe({
      next: (response) => {
        this.customerTypeObject = response;
        if(response?.laboratoryTests){
          const labTestArray = this.MappingForm.get('laboratoryTests') as FormArray;
          labTestArray.clear();
          const selectedId : number[] = [];
          response?.laboratoryTests?.forEach((item :any) => {
            labTestArray.push(
              this.fb.group({
                id: [item.id],
                testMappingID: [item.testMappingID],
                laboratoryTestID: [item.laboratoryTestID]
              })
            );
            selectedId.push(item.laboratoryTestID);
          });
          this.MappingForm.patchValue({
            laboratoryTestIDs: selectedId
          });
        }
        // patch form
        this.MappingForm.patchValue({
          id: response?.id ?? 0,
          name: response?.name ?? '',
          metalClassificationID: response?.metalClassificationID ?? null,
          productConditionID: response?.productConditionID ?? null,
          gradeID: response?.gradeID ?? null,
          laboratoryTestID: response?.laboratoryTestID ?? null,
          isDefault: response?.isDefault ?? false,
        });

      },
      error: (error) => {
        console.error('Error fetching mapping data:', error);
        this.toastService.show(error?.message ?? 'Error fetching details', 'error');
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
    if (page < 1) return;
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
    return Array.from({ length: Math.max(1, Math.ceil(this.totalItems / this.pageSize)) }, (_, i) => i + 1);
  }

  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }
  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.type : undefined;
  }


  openModal(type: string, id: number): void {
    this.resetFormState();
    this.mappingId = 0;
    if (id > 0) {
      this.mappingId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.MappingForm.patchValue({ id: 0, isDefault: false, parameterIds: [] });
      this.formTitle = 'Test Mapping Form';
      this.MappingForm.enable();
      this.parametersOptions = [];
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Test Mapping Form';
      this.MappingForm.enable();
    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Test Mapping';
      this.MappingForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  private resetFormState() {
  this.MappingForm.reset({
    id: 0,
    metalClassificationID: null,
    productConditionID: null,
    gradeID: null,
    laboratoryTestID: null,
    laboratoryTestIDs: [],
    isDefault: false
  });

  this.laboratoryTests.clear();
  this.parametersOptions = [];
}


  closeModal(): void {
    this.resetFormState();
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  // fetch functions used by searchable dropdown component
  getMetalClassificationDropdown = (searchTerm: string, pageNumber: number, pageSize: number) => {
    return this.metalclassificationService.getMetalClassificationDropdown(searchTerm, pageNumber, pageSize);
  };

  getProductConditionDropdown = (searchTerm: string, pageNumber: number, pageSize: number) => {
    return this.productConditionService.getProductConditionDropdown(searchTerm, pageNumber, pageSize);
  };

  getMaterialSpecificationGradeDropdown = (searchTerm: string, pageNumber: number, pageSize: number) => {
      return this.materialSpecService.getMaterialSpecificationGradeDropdown(searchTerm, pageNumber, pageSize);
  };

  getTestMethodSpecificationDropdown = (searchTerm: string, pageNumber: number, pageSize: number) => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(searchTerm, pageNumber, pageSize);
  }

  // handlers for searchable dropdown selections
  onMetalSelected(item: any) {
    const id = item?.id ?? item?.value ?? item;
    this.MappingForm.patchValue({ metalClassificationID: id });
    this.MappingForm.patchValue({ gradeID: null });
  }
  onProductConditionSelected(item: any) {
    const id = item?.id ?? item?.value ?? item;
    this.MappingForm.patchValue({ productConditionID: id });
  }
  onGradeSelected(item: any) {
    const id = item?.id ?? item?.value ?? item;
    this.MappingForm.patchValue({ gradeID: id });
  }
  onLabTestSelected(item: any) {
    const id = item?.id ?? item?.value ?? item;
    this.MappingForm.patchValue({ laboratoryTestID: id });
  }
  onLabTestMultiSelected(selectedItems: any[]) {

    this.laboratoryTests.clear();
    const selectIds: number[] = [];
    selectedItems?.forEach((item) => {
      selectIds.push(item.id);
      this.laboratoryTests.push(
        this.fb.group({
          id: [0],
          name: [item.name],
          testMappingID: [this.mappingId],
          laboratoryTestID: [item.id]
        })
      );
    });
    this.MappingForm.patchValue({ laboratoryTestIDs: selectIds })
  }



  onSubmit(): void {
    if (this.MappingForm.valid) {
      let formData = this.MappingForm.value;
      if (this.isEditMode) {
        this.materialTestMappingService.updateMaterialTestMapping(formData).subscribe({
          next: (response) => {
            this.toastService.show(response?.message ?? 'Updated', 'success');
            this.MappingForm.reset();
            this.closeModal();
            this.fetchData();
          },
          error: (error) => {
            this.toastService.show(error?.message ?? 'Update failed', 'error');
          }
        });
      } else {
        formData.id = 0;
        this.materialTestMappingService.createMaterialTestMapping(formData).subscribe({
          next: (response) => {
            this.toastService.show(response?.message ?? 'Saved', 'success');
            this.MappingForm.reset();
            this.closeModal();
            this.fetchData();
          },
          error: (error) => {
            this.toastService.show(error?.message ?? 'Save failed', 'error');
          }
        });
      }
    } else {
      this.MappingForm.markAllAsTouched();
    }
  }

}


