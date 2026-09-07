import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { AnalysisTechniqueService } from '../../services/analysis-technique.service';
import { ToastService } from '../../services/toast.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-analysis-technique',
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
  templateUrl: './analysis-technique.component.html',
  styleUrl: './analysis-technique.component.css',
})
export class AnalysisTechniqueComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  // Filter state
  filterCode: string = '';
  filterName: string = '';
  filterStatus: string = ''; // '' = All, 'true' = Active, 'false' = Inactive

  // Grid state
  techniqueList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'code';
  sortOrder: string = 'asc';

  // Modal / Form state
  techniqueForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Analysis Technique';

  constructor(
    private fb: FormBuilder,
    private techniqueService: AnalysisTechniqueService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  initForm(): void {
    this.techniqueForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      aliasNames: ['', [Validators.maxLength(500)]],
      description: ['', [Validators.maxLength(1000)]],
      isActive: [true]
    });
  }

  fetchData(): void {
    const filters: any[] = [];

    if (this.filterCode.trim()) {
      filters.push({ column: 'code', type: 'Contains', value: this.filterCode.trim() });
    }

    if (this.filterName.trim()) {
      filters.push({ column: 'name', type: 'Contains', value: this.filterName.trim() });
    }

    if (this.filterStatus !== '') {
      filters.push({ column: 'isActive', type: 'Equal', value: this.filterStatus === 'true' });
    }

    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      filter: filters.length > 0 ? filters : null
    };

    this.techniqueService.getAllAnalysisTechniques(payload).subscribe({
      next: (response) => {
        this.techniqueList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: () => {
        this.techniqueList = [];
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
    this.filterStatus = '';
    this.pageNumber = 1;
    this.fetchData();
  }

  applySorting(column: string): void {
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

  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.fetchData();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.pageNumber = 1;
    this.fetchData();
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    // Unified normalization: uppercase, spaces to underscore, allowed chars only [A-Z0-9_]
    const normalized = input.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    this.techniqueForm.get('code')?.setValue(normalized, { emitEvent: false });
  }

  openModal(type: string, id: number = 0): void {
    this.submitted = false;
    this.selectedId = id;
    this.techniqueForm.reset({ id: 0, code: '', name: '', aliasNames: '', description: '', isActive: true });
    this.techniqueForm.enable();

    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Add Analysis Technique';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Edit Analysis Technique';
      this.loadTechniqueData(id);
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Analysis Technique Details';
      this.techniqueForm.disable();
      this.loadTechniqueData(id);
    }

    if (!this.bsModal && this.modalElement) {
      this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    }
    this.bsModal?.show();
  }

  loadTechniqueData(id: number): void {
    this.techniqueService.getAnalysisTechniqueById(id).subscribe({
      next: (data) => {
        if (this.selectedId !== id) return;
        this.techniqueForm.patchValue({
          id: data.id,
          code: data.code,
          name: data.name,
          aliasNames: data.aliasNames,
          description: data.description,
          isActive: data.isActive
        });
      },
      error: () => {
        this.toastService.show('Failed to load technique details.', 'error');
      }
    });
  }

  closeModal(): void {
    this.submitted = false;
    this.bsModal?.hide();
    this.techniqueForm.reset({ id: 0, code: '', name: '', aliasNames: '', description: '', isActive: true });
    this.techniqueForm.enable();
    this.selectedId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.techniqueForm, path, this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.techniqueForm);

    if (!this.techniqueForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }

    const formVal = this.techniqueForm.getRawValue();

    if (this.isEditMode) {
      const updateDto = {
        id: formVal.id,
        code: formVal.code?.trim().toUpperCase(),
        name: formVal.name?.trim(),
        aliasNames: formVal.aliasNames?.trim() || null,
        description: formVal.description?.trim() || null,
        isActive: formVal.isActive ?? true
      };

      this.techniqueService.updateAnalysisTechnique(updateDto).subscribe({
        next: (response) => {
          this.toastService.show(response?.message || 'Analysis Technique updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.message || 'Failed to update analysis technique.', 'error');
        }
      });
    } else {
      const createDto = {
        code: formVal.code?.trim().toUpperCase(),
        name: formVal.name?.trim(),
        aliasNames: formVal.aliasNames?.trim() || null,
        description: formVal.description?.trim() || null,
        isActive: true
      };

      this.techniqueService.createAnalysisTechnique(createDto).subscribe({
        next: (response) => {
          this.toastService.show(response?.message || 'Analysis Technique created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.message || 'Failed to create analysis technique.', 'error');
        }
      });
    }
  }

  toggleStatus(item: any): void {
    if (!item?.id) return;
    const action = item.isActive ? 'deactivate' : 'activate';
    this.techniqueService.toggleStatus(item.id).subscribe({
      next: (response) => {
        this.toastService.show(response?.message || `Technique ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || error?.message || `Failed to ${action} technique.`, 'error');
      }
    });
  }
}
