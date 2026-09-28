import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { EquipmentTypeService } from '../../../services/equipment-type.service';
import { ToastService } from '../../../services/toast.service';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-equipment-type-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    HasPermissionDirective,
    FormFieldErrorComponent,
    PaginationComponent,
    BreadcrumbComponent
  ],
  templateUrl: './equipment-type-list.component.html',
  styleUrl: './equipment-type-list.component.css'
})
export class EquipmentTypeListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  filterName: string = '';

  equipmentTypeList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'Name';
  sortOrder: string = 'asc';

  equipmentTypeForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Equipment Type';

  constructor(
    private fb: FormBuilder,
    private equipmentTypeService: EquipmentTypeService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  private initForm(): void {
    this.equipmentTypeForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(500)]]
    });
  }

  fetchData(): void {
    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: this.filterName.trim(),
      SortByColumn: this.sortByColumn,
      SortOrder: this.sortOrder,
      Filter: null
    };

    this.equipmentTypeService.getAllEquipmentTypes(payload).subscribe({
      next: (res: any) => {
        this.equipmentTypeList = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageNumber = res?.pageNumber || 1;
        this.pageSize = res?.pageSize || 10;
      },
      error: (err: any) => {
        this.equipmentTypeList = [];
        this.totalItems = 0;
        this.toastService.show(err?.error?.message || 'Failed to fetch equipment types', 'error');
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onReset(): void {
    this.filterName = '';
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
      this.formTitle = 'Add Equipment Type';
      this.equipmentTypeForm.reset({ id: 0, name: '', description: '' });
      this.equipmentTypeForm.enable();
      this.showModal();
    } else {
      this.formTitle = mode === 'edit' ? 'Edit Equipment Type' : 'View Equipment Type';
      this.equipmentTypeService.getEquipmentTypeById(id).subscribe({
        next: (data: any) => {
          if (!data) {
            this.toastService.show('Equipment type not found', 'error');
            return;
          }
          this.equipmentTypeForm.patchValue({
            id: data.id ?? data.ID ?? id,
            name: data.name ?? data.Name ?? '',
            description: data.description ?? data.Description ?? ''
          });
          if (this.isViewMode) {
            this.equipmentTypeForm.disable();
          } else {
            this.equipmentTypeForm.enable();
          }
          this.showModal();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to load equipment type details', 'error');
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
    this.equipmentTypeForm.reset();
    this.submitted = false;
  }

  saveEquipmentType(): void {
    this.submitted = true;
    if (this.equipmentTypeForm.invalid || this.isViewMode) {
      this.equipmentTypeForm.markAllAsTouched();
      this.toastService.show('Please fill in all required fields correctly', 'warning');
      return;
    }

    const val = this.equipmentTypeForm.getRawValue();
    const payload = {
      ID: val.id || 0,
      Name: (val.name || '').trim(),
      Description: (val.description || '').trim() || null
    };

    if (this.isEditMode && payload.ID > 0) {
      this.equipmentTypeService.updateEquipmentType(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(typeof res === 'string' ? res : (res?.message || 'Equipment type updated successfully.'), 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to update equipment type', 'error');
        }
      });
    } else {
      this.equipmentTypeService.createEquipmentType(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(typeof res === 'string' ? res : (res?.message || 'Equipment type created successfully.'), 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to create equipment type', 'error');
        }
      });
    }
  }

  deleteEquipmentType(item: any): void {
    const name = item.name ?? item.Name ?? '';
    if (!confirm(`Are you sure you want to delete equipment type '${name}'?`)) return;

    this.equipmentTypeService.deleteEquipmentType(item.id ?? item.ID).subscribe({
      next: (res: any) => {
        this.toastService.show(typeof res === 'string' ? res : (res?.message || 'Equipment type deleted successfully.'), 'success');
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to delete equipment type', 'error');
      }
    });
  }
}
