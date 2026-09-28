import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { StandardOrgnizationService } from '../../services/standard-orgnization.service';
import { ToastService } from '../../services/toast.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-standard-orgnization',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, FormFieldErrorComponent, PaginationComponent],
  templateUrl: './standard-orgnization.component.html',
  styleUrl: './standard-orgnization.component.css'
})
export class StandardOrgnizationComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  StandardOrganizationList: any[] = [];
  standardOrganizationId: number = 0;

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200];

  sortByColumn: string = 'modifiedOn';
  sortOrder: string = 'desc';
  searchTerm: string = '';

  // Form state
  StandardOrganizationForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  formTitle = 'Add Standard Organization';

  constructor(
    private fb: FormBuilder,
    private standardOrgService: StandardOrgnizationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  initForm(): void {
    this.StandardOrganizationForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]]
    });
  }

  get payload(): any {
    return {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: this.searchTerm ? this.searchTerm.trim() : '',
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder
    };
  }

  fetchData(): void {
    this.standardOrgService.getAllStandardOrganizations(this.payload).subscribe({
      next: (response) => {
        this.StandardOrganizationList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error.message || 'Failed to load standard organizations.', 'error');
        this.StandardOrganizationList = [];
      }
    });
  }

  getDetails(): void {
    const requestId = this.standardOrganizationId;
    this.standardOrgService.getStandardOrganizationById(requestId).subscribe({
      next: (response) => {
        if (this.standardOrganizationId !== requestId) return;
        this.StandardOrganizationForm.patchValue(response);
      },
      error: (error) => {
        this.toastService.show(error.message || 'Failed to load details.', 'error');
      }
    });
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

  getSortIcon(column: string): string {
    if (this.sortByColumn !== column) {
      return 'bi-arrow-down-up text-muted opacity-50';
    }
    return this.sortOrder === 'asc' ? 'bi-sort-alpha-down text-danger' : 'bi-sort-alpha-up-alt text-danger';
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

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.pageNumber = 1;
    this.fetchData();
  }

  deleteFn(id: number): void {
    if (id <= 0) return;
    if (!confirm('Are you sure you want to delete this standard organization?')) return;

    this.standardOrgService.deleteStandardOrganization(id).subscribe({
      next: (response) => {
        this.toastService.show(response.message || 'Deleted successfully.', 'success');
        this.fetchData();
      },
      error: (error) => {
        this.toastService.show(error.message || 'Failed to delete standard organization.', 'error');
      }
    });
  }

  openModal(type: 'create' | 'edit' | 'view', id: number): void {
    this.submitted = false;
    this.StandardOrganizationForm.reset({ id: 0, name: '' });
    this.StandardOrganizationForm.enable();
    this.standardOrganizationId = id;

    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Add Standard Organization';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Edit Standard Organization';
      this.getDetails();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Standard Organization';
      this.StandardOrganizationForm.disable();
      this.getDetails();
    }

    if (!this.bsModal && this.modalElement) {
      this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    }
    this.bsModal?.show();
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.StandardOrganizationForm, path, this.submitted);
  }

  closeModal(): void {
    this.submitted = false;
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.StandardOrganizationForm.reset({ id: 0, name: '' });
    this.StandardOrganizationForm.enable();
    this.standardOrganizationId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    if (this.isViewMode) return;

    this.submitted = true;
    FormValidationHelper.markAllTouched(this.StandardOrganizationForm);

    if (!this.StandardOrganizationForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }

    const formData = this.StandardOrganizationForm.value;
    if (this.isEditMode) {
      this.standardOrgService.updateStandardOrganization(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error.message || 'Failed to update standard organization.', 'error');
        }
      });
    } else {
      formData.id = 0;
      this.standardOrgService.createStandardOrganization(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error.message || 'Failed to create standard organization.', 'error');
        }
      });
    }
  }
}
