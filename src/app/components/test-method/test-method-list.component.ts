import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { TestMethodService, TestMethodListItem } from '../../services/test-method.service';
import { AnalysisTechniqueService } from '../../services/analysis-technique.service';
import { ToastService } from '../../services/toast.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-test-method-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    PaginationComponent,
    BreadcrumbComponent
  ],
  templateUrl: './test-method-list.component.html',
  styleUrl: './test-method-list.component.css'
})
export class TestMethodListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  // Filter state
  filterCode: string = '';
  filterName: string = '';
  filterTechniqueId: number | null = null;
  filterStatus: string = ''; // '' = All, 'true' = Active, 'false' = Inactive

  // Grid state
  testMethodList: TestMethodListItem[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'Code';
  sortOrder: string = 'asc';

  // Analysis techniques for filter and form dropdowns
  techniqueList: any[] = [];

  // Modal / Form state
  testMethodForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Test Method';

  constructor(
    private fb: FormBuilder,
    private testMethodService: TestMethodService,
    private techniqueService: AnalysisTechniqueService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTechniqueDropdown();
    this.fetchData();
  }

  initForm(): void {
    this.testMethodForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Z0-9_]+$/)]],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      standardReference: ['', [Validators.maxLength(200)]],
      analysisTechniqueID: [null],
      description: ['', [Validators.maxLength(1000)]],
      isActive: [true]
    });
  }

  loadTechniqueDropdown(): void {
    this.techniqueService.getAnalysisTechniqueDropdown('', 0, 100).subscribe({
      next: (data) => {
        this.techniqueList = data || [];
      },
      error: () => {
        this.techniqueList = [];
      }
    });
  }

  fetchData(): void {
    const payload = {
      PageNumber: this.pageNumber - 1, // 0-indexed on backend
      PageSize: this.pageSize,
      SortByColumn: this.sortByColumn,
      SortOrder: this.sortOrder
    };

    const code = this.filterCode.trim() || undefined;
    const name = this.filterName.trim() || undefined;
    const techId = this.filterTechniqueId && this.filterTechniqueId > 0 ? this.filterTechniqueId : null;
    const status = this.filterStatus !== '' ? this.filterStatus : undefined;

    this.testMethodService.getTestMethods(payload, code, name, techId, status).subscribe({
      next: (response) => {
        this.testMethodList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: () => {
        this.testMethodList = [];
        this.totalItems = 0;
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onReset(): void {
    this.filterCode = '';
    this.filterName = '';
    this.filterTechniqueId = null;
    this.filterStatus = '';
    this.pageNumber = 1;
    this.fetchData();
  }

  applySorting(column: string): void {
    if (this.sortByColumn.toLowerCase() === column.toLowerCase()) {
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

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.pageNumber = 1;
    this.fetchData();
  }

  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.fetchData();
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    // Unified normalization: uppercase, spaces to underscore, allowed chars only [A-Z0-9_]
    const normalized = input.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    this.testMethodForm.get('code')?.setValue(normalized, { emitEvent: false });
  }

  openModal(type: string, id: number = 0): void {
    this.submitted = false;
    this.selectedId = id;
    this.testMethodForm.reset({
      id: 0,
      code: '',
      name: '',
      standardReference: '',
      analysisTechniqueID: null,
      description: '',
      isActive: true
    });
    this.testMethodForm.enable();

    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Add Test Method';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Edit Test Method';
      this.loadMethodData(id);
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Test Method Details';
      this.testMethodForm.disable();
      this.loadMethodData(id);
    }

    if (!this.bsModal && this.modalElement) {
      this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    }
    this.bsModal?.show();
  }

  loadMethodData(id: number): void {
    this.testMethodService.getTestMethodById(id).subscribe({
      next: (data) => {
        if (this.selectedId !== id) return;
        this.testMethodForm.patchValue({
          id: data.id,
          code: data.code,
          name: data.name,
          standardReference: data.standardReference || '',
          analysisTechniqueID: data.analysisTechniqueID || null,
          description: data.description || '',
          isActive: data.isActive
        });
      },
      error: () => {
        this.toastService.show('Failed to load test method details.', 'error');
      }
    });
  }

  closeModal(): void {
    this.submitted = false;
    this.bsModal?.hide();
    this.testMethodForm.reset({
      id: 0,
      code: '',
      name: '',
      standardReference: '',
      analysisTechniqueID: null,
      description: '',
      isActive: true
    });
    this.testMethodForm.enable();
    this.selectedId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.testMethodForm, path, this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.testMethodForm);

    if (!this.testMethodForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }

    const formVal = this.testMethodForm.getRawValue();

    if (this.isEditMode) {
      const updateDto = {
        id: formVal.id,
        code: formVal.code?.trim().toUpperCase(),
        name: formVal.name?.trim(),
        standardReference: formVal.standardReference?.trim() || null,
        analysisTechniqueID: formVal.analysisTechniqueID ? Number(formVal.analysisTechniqueID) : null,
        description: formVal.description?.trim() || null
      };

      this.testMethodService.updateTestMethod(updateDto).subscribe({
        next: (response) => {
          this.toastService.show(response?.message || 'Test Method updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.message || 'Failed to update test method.', 'error');
        }
      });
    } else {
      const createDto = {
        code: formVal.code?.trim().toUpperCase(),
        name: formVal.name?.trim(),
        standardReference: formVal.standardReference?.trim() || null,
        analysisTechniqueID: formVal.analysisTechniqueID ? Number(formVal.analysisTechniqueID) : null,
        description: formVal.description?.trim() || null
      };

      this.testMethodService.createTestMethod(createDto).subscribe({
        next: (response) => {
          this.toastService.show(response?.message || 'Test Method created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.message || 'Failed to create test method.', 'error');
        }
      });
    }
  }

  toggleStatus(item: TestMethodListItem): void {
    if (!item?.id) return;
    const action = item.isActive ? 'deactivate' : 'activate';
    this.testMethodService.toggleStatus(item.id).subscribe({
      next: (response) => {
        this.toastService.show(response?.message || `Test Method ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || error?.message || `Failed to ${action} test method.`, 'error');
      }
    });
  }
}
