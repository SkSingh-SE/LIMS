import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ClassificationService } from '../../services/classification.service';
import { ToastService } from '../../services/toast.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-classification-list',
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
  templateUrl: './classification-list.component.html',
  styleUrl: './classification-list.component.css'
})
export class ClassificationListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  filterCode: string = '';
  filterName: string = '';
  filterStatus: string = '';

  classificationList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'displayOrder';
  sortOrder: string = 'asc';

  classificationForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Classification';

  constructor(
    private fb: FormBuilder,
    private classificationService: ClassificationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  private initForm(): void {
    this.classificationForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern('^[A-Za-z0-9_ ]+$'), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(500)]],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  onCodeInput(): void {
    const ctrl = this.classificationForm.get('code');
    if (!ctrl || this.isViewMode) return;
    const raw = (ctrl.value || '').toUpperCase().replace(/\s+/g, '_');
    if (raw !== ctrl.value) ctrl.setValue(raw, { emitEvent: false });
  }

  fetchData(): void {
    const filters: any[] = [];

    if (this.filterCode.trim()) {
      filters.push({ column: 'Code', type: 'Contains', value: this.filterCode.trim() });
    }

    if (this.filterName.trim()) {
      filters.push({ column: 'Name', type: 'Contains', value: this.filterName.trim() });
    }

    if (this.filterStatus !== '') {
      filters.push({ column: 'IsActive', type: 'Equal', value: this.filterStatus });
    }

    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: '',
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      Filter: filters.length > 0 ? filters : null
    };

    this.classificationService.getAllClassifications(payload).subscribe({
      next: (res: any) => {
        this.classificationList = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageNumber = res?.pageNumber || 1;
        this.pageSize = res?.pageSize || 10;
      },
      error: (err: any) => {
        this.classificationList = [];
        this.totalItems = 0;
        this.toastService.show(err?.error?.message || 'Failed to fetch classifications', 'error');
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

  onPageSizeChange(event: any): void {
    this.pageSize = typeof event === 'number' ? event : Number(event?.target?.value || event);
    this.pageNumber = 1;
    this.fetchData();
  }

  openModal(mode: 'create' | 'edit' | 'view', id: number = 0): void {
    this.submitted = false;
    this.selectedId = id;
    this.isViewMode = mode === 'view';
    this.isEditMode = mode === 'edit';

    if (mode === 'create') {
      this.formTitle = 'Add Classification';
      this.classificationForm.reset({ id: 0, code: '', name: '', description: '', displayOrder: 0, isActive: true });
      this.classificationForm.enable();
      this.showModal();
    } else {
      this.formTitle = mode === 'edit' ? 'Edit Classification' : 'View Classification';
      this.classificationService.getClassificationById(id).subscribe({
        next: (data: any) => {
          if (!data) {
            this.toastService.show('Classification not found', 'error');
            return;
          }
          this.classificationForm.patchValue({
            id: data.id ?? data.ID ?? 0,
            code: data.code ?? data.Code ?? '',
            name: data.name ?? data.Name ?? '',
            description: data.description ?? data.Description ?? '',
            displayOrder: data.displayOrder ?? data.DisplayOrder ?? 0,
            isActive: data.isActive !== undefined ? data.isActive : (data.IsActive !== undefined ? data.IsActive : true)
          });

          if (this.isViewMode) this.classificationForm.disable();
          else this.classificationForm.enable();
          this.showModal();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to load classification details', 'error');
        }
      });
    }
  }

  private showModal(): void {
    if (!this.bsModal && this.modalElement) {
      this.bsModal = new Modal(this.modalElement.nativeElement, { backdrop: 'static', keyboard: false });
    }
    this.bsModal?.show();
  }

  closeModal(): void {
    this.bsModal?.hide();
    this.classificationForm.reset();
    this.submitted = false;
  }

  saveClassification(): void {
    this.submitted = true;
    if (this.classificationForm.invalid || this.isViewMode) {
      this.classificationForm.markAllAsTouched();
      return;
    }

    const val = this.classificationForm.getRawValue();
    const code = ((val.code || '').trim().toUpperCase().replace(/\s+/g, '_'));

    if (this.isEditMode && (val.id || 0) > 0) {
      const payload = {
        id: val.id,
        code,
        name: (val.name || '').trim(),
        description: (val.description || '').trim() || null,
        displayOrder: Number(val.displayOrder) || 0,
        isActive: val.isActive !== undefined ? val.isActive : true
      };
      this.classificationService.updateClassification(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Classification updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to update classification', 'error');
        }
      });
    } else {
      const payload = {
        code,
        name: (val.name || '').trim(),
        description: (val.description || '').trim() || null,
        displayOrder: Number(val.displayOrder) || 0
      };
      this.classificationService.createClassification(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Classification created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to create classification', 'error');
        }
      });
    }
  }

  toggleStatus(item: any): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} classification '${item.name}'?`)) return;

    this.classificationService.toggleClassificationStatus(item.id).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || `Classification ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || `Failed to ${action} classification`, 'error');
      }
    });
  }
}
