import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { DisciplineService } from '../../services/discipline.service';
import { ToastService } from '../../services/toast.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-discipline-list',
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
  templateUrl: './discipline-list.component.html',
  styleUrl: './discipline-list.component.css'
})
export class DisciplineListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  // Search & Filter state
  filterCode: string = '';
  filterName: string = '';
  filterStatus: string = ''; // '' = All, 'true' = Active, 'false' = Inactive

  // Grid state
  disciplineList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'sortOrder';
  sortOrder: string = 'asc';

  // Modal / Form state
  disciplineForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Discipline';

  constructor(
    private fb: FormBuilder,
    private disciplineService: DisciplineService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  private initForm(): void {
    this.disciplineForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(20), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(250)]],
      sortOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  fetchData(): void {
    const filters: any[] = [];

    if (this.filterCode.trim()) {
      filters.push({
        column: 'Code',
        type: 'Contains',
        value: this.filterCode.trim()
      });
    }

    if (this.filterName.trim()) {
      filters.push({
        column: 'Name',
        type: 'Contains',
        value: this.filterName.trim()
      });
    }

    if (this.filterStatus !== '') {
      filters.push({
        column: 'IsActive',
        type: 'Equal',
        value: this.filterStatus
      });
    }

    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: '',
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      Filter: filters.length > 0 ? filters : null
    };

    this.disciplineService.getAllDisciplines(payload).subscribe({
      next: (res: any) => {
        this.disciplineList = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageNumber = res?.pageNumber || 1;
        this.pageSize = res?.pageSize || 10;
      },
      error: (err: any) => {
        this.disciplineList = [];
        this.totalItems = 0;
        this.toastService.show(err?.error?.message || 'Failed to fetch disciplines', 'error');
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
      this.formTitle = 'Add Discipline';
      this.disciplineForm.reset({
        id: 0,
        code: '',
        name: '',
        description: '',
        sortOrder: 0,
        isActive: true
      });
      this.disciplineForm.enable();
      this.showModal();
    } else {
      this.formTitle = mode === 'edit' ? 'Edit Discipline' : 'View Discipline';
      this.disciplineService.getDisciplineById(id).subscribe({
        next: (data: any) => {
          if (!data) {
            this.toastService.show('Discipline not found', 'error');
            return;
          }
          this.disciplineForm.patchValue({
            id: data.id || data.ID,
            code: data.code || data.Code || '',
            name: data.name || data.Name || '',
            description: data.description || data.Description || '',
            sortOrder: data.sortOrder || data.SortOrder || 0,
            isActive: data.isActive !== undefined ? data.isActive : (data.IsActive !== undefined ? data.IsActive : true)
          });

          if (this.isViewMode) {
            this.disciplineForm.disable();
          } else {
            this.disciplineForm.enable();
          }
          this.showModal();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to load discipline details', 'error');
        }
      });
    }
  }

  private showModal(): void {
    if (!this.bsModal && this.modalElement) {
      this.bsModal = new Modal(this.modalElement.nativeElement, {
        backdrop: 'static',
        keyboard: false
      });
    }
    this.bsModal?.show();
  }

  closeModal(): void {
    this.bsModal?.hide();
    this.disciplineForm.reset();
    this.submitted = false;
  }

  saveDiscipline(): void {
    this.submitted = true;
    if (this.disciplineForm.invalid || this.isViewMode) {
      this.disciplineForm.markAllAsTouched();
      return;
    }

    const val = this.disciplineForm.getRawValue();
    const payload = {
      ID: val.id || 0,
      Code: (val.code || '').trim().toUpperCase(),
      Name: (val.name || '').trim(),
      Description: (val.description || '').trim() || null,
      SortOrder: Number(val.sortOrder) || 0,
      IsActive: val.isActive !== undefined ? val.isActive : true
    };

    if (this.isEditMode && payload.ID > 0) {
      this.disciplineService.updateDiscipline(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Discipline updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to update discipline', 'error');
        }
      });
    } else {
      this.disciplineService.createDiscipline(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Discipline created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to create discipline', 'error');
        }
      });
    }
  }

  toggleStatus(item: any): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    const confirmMsg = `Are you sure you want to ${action} discipline '${item.name}'?`;
    if (!confirm(confirmMsg)) return;

    this.disciplineService.toggleDisciplineStatus(item.id).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || `Discipline ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || `Failed to ${action} discipline`, 'error');
      }
    });
  }
}
