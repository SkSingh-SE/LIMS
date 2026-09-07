import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { DepartmentService } from '../../../services/department.service';
import { DisciplineService } from '../../../services/discipline.service';
import { ToastService } from '../../../services/toast.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-department-list',
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
  templateUrl: './department-list.component.html',
  styleUrl: './department-list.component.css'
})
export class DepartmentListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  // Lookups
  branches: any[] = [];
  allDisciplines: any[] = [];
  filterDisciplines: any[] = [];
  modalDisciplines: any[] = [];

  // Filter state
  filterBranch: string = '';
  filterDiscipline: string = '';
  filterCode: string = '';
  filterName: string = '';
  filterStatus: string = ''; // '' = All, 'true' = Active, 'false' = Inactive

  // Grid state
  departmentList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'branchName';
  sortOrder: string = 'asc';

  // Modal / Form state
  departmentForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Department';
  loadingBranchDisciplines: boolean = false;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private disciplineService: DisciplineService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadLookups();
    this.fetchData();
  }

  private initForm(): void {
    this.departmentForm = this.fb.group({
      id: [0],
      branchId: [null, [Validators.required]],
      disciplineId: [null, [Validators.required]],
      code: ['', [Validators.required, Validators.maxLength(20), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(3000)]],
      isChemical: [false],
      isActive: [true]
    });
  }

  private loadLookups(): void {
    // Load authorized branches
    this.departmentService.getAuthorizedBranches().subscribe({
      next: (branches: any[]) => {
        this.branches = branches || [];
      },
      error: () => {
        this.branches = [];
      }
    });

    // Load general disciplines for filter dropdown
    this.disciplineService.getDisciplineDropdown('', 0, 100).subscribe({
      next: (disciplines: any[]) => {
        this.allDisciplines = disciplines || [];
        this.filterDisciplines = [...this.allDisciplines];
      },
      error: () => {
        this.allDisciplines = [];
        this.filterDisciplines = [];
      }
    });
  }

  onBranchFilterChange(): void {
    if (this.filterBranch) {
      const bId = Number(this.filterBranch);
      this.departmentService.getBranchDisciplines(bId).subscribe({
        next: (disciplines: any[]) => {
          this.filterDisciplines = disciplines || [];
          // If current filterDiscipline is not supported by this branch, reset it
          if (this.filterDiscipline && !this.filterDisciplines.some(d => d.id == this.filterDiscipline)) {
            this.filterDiscipline = '';
          }
          this.onSearch();
        },
        error: () => {
          this.filterDisciplines = [];
          this.filterDiscipline = '';
          this.onSearch();
        }
      });
    } else {
      this.filterDisciplines = [...this.allDisciplines];
      this.onSearch();
    }
  }

  onModalBranchChange(): void {
    const branchId = this.departmentForm.get('branchId')?.value;
    if (branchId) {
      this.loadingBranchDisciplines = true;
      this.departmentService.getBranchDisciplines(Number(branchId)).subscribe({
        next: (disciplines: any[]) => {
          this.modalDisciplines = disciplines || [];
          this.loadingBranchDisciplines = false;

          const currentDisciplineId = this.departmentForm.get('disciplineId')?.value;
          if (currentDisciplineId && !this.modalDisciplines.some(d => d.id == currentDisciplineId)) {
            this.departmentForm.patchValue({ disciplineId: null });
          }
        },
        error: () => {
          this.modalDisciplines = [];
          this.loadingBranchDisciplines = false;
          this.departmentForm.patchValue({ disciplineId: null });
        }
      });
    } else {
      this.modalDisciplines = [];
      this.departmentForm.patchValue({ disciplineId: null });
    }
  }

  fetchData(): void {
    const filters: any[] = [];

    if (this.filterBranch) {
      filters.push({
        column: 'BranchID',
        type: 'Equal',
        value: this.filterBranch
      });
    }

    if (this.filterDiscipline) {
      filters.push({
        column: 'DisciplineID',
        type: 'Equal',
        value: this.filterDiscipline
      });
    }

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

    this.departmentService.getAllDepartments(payload).subscribe({
      next: (res: any) => {
        this.departmentList = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageNumber = res?.pageNumber || 1;
        this.pageSize = res?.pageSize || 10;
      },
      error: (err: any) => {
        this.departmentList = [];
        this.totalItems = 0;
        this.toastService.show(err?.error?.message || 'Failed to fetch departments', 'error');
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onReset(): void {
    this.filterBranch = '';
    this.filterDiscipline = '';
    this.filterDisciplines = [...this.allDisciplines];
    this.filterCode = '';
    this.filterName = '';
    this.filterStatus = '';
    this.pageNumber = 1;
    this.sortByColumn = 'branchName';
    this.sortOrder = 'asc';
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

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageNumber = 1;
    this.fetchData();
  }

  openModal(mode: 'create' | 'edit' | 'view', item?: any): void {
    this.submitted = false;
    this.isViewMode = mode === 'view';
    this.isEditMode = mode === 'edit';

    if (mode === 'create') {
      this.formTitle = 'Add Department';
      this.selectedId = 0;
      this.departmentForm.enable();
      this.departmentForm.reset({
        id: 0,
        branchId: this.branches.length > 0 ? this.branches[0].id : null,
        disciplineId: null,
        code: '',
        name: '',
        description: '',
        isChemical: false,
        isActive: true
      });
      // Load branch-supported disciplines for initial branch
      if (this.branches.length > 0) {
        this.onModalBranchChange();
      } else {
        this.modalDisciplines = [];
      }
      this.showBsModal();
    } else {
      this.selectedId = item?.id || item?.ID;
      this.formTitle = mode === 'edit' ? 'Edit Department' : 'Department Details';

      this.departmentService.getDepartmentById(this.selectedId).subscribe({
        next: (data: any) => {
          const branchId = data.branchID || data.BranchID;
          const disciplineId = data.disciplineID || data.DisciplineID;

          // Load branch-supported disciplines for this branch
          this.departmentService.getBranchDisciplines(branchId).subscribe({
            next: (disciplines: any[]) => {
              this.modalDisciplines = disciplines || [];

              this.departmentForm.patchValue({
                id: data.id || data.ID,
                branchId: branchId,
                disciplineId: disciplineId,
                code: data.code || data.Code || '',
                name: data.name || data.Name || '',
                description: data.description || data.Description || '',
                isChemical: !!(data.isChemical || data.IsChemical),
                isActive: data.isActive !== undefined ? data.isActive : data.IsActive
              });

              if (this.isViewMode) {
                this.departmentForm.disable();
              } else {
                this.departmentForm.enable();
              }

              this.showBsModal();
            },
            error: () => {
              this.modalDisciplines = [];
              this.showBsModal();
            }
          });
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to load department details', 'error');
        }
      });
    }
  }

  private showBsModal(): void {
    if (!this.bsModal) {
      this.bsModal = new Modal(this.modalElement.nativeElement, { backdrop: 'static', keyboard: false });
    }
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.submitted = false;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.departmentForm.invalid) {
      return;
    }

    const formVal = this.departmentForm.getRawValue();

    if (this.isEditMode) {
      const payload = {
        id: this.selectedId,
        branchID: Number(formVal.branchId),
        disciplineID: Number(formVal.disciplineId),
        code: formVal.code?.trim().toUpperCase(),
        name: formVal.name?.trim(),
        description: formVal.description?.trim() || null,
        isChemical: !!formVal.isChemical,
        isActive: formVal.isActive
      };

      this.departmentService.updateDepartment(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Department updated successfully', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to update department', 'error');
        }
      });
    } else {
      const payload = {
        branchID: Number(formVal.branchId),
        disciplineID: Number(formVal.disciplineId),
        code: formVal.code?.trim().toUpperCase(),
        name: formVal.name?.trim(),
        description: formVal.description?.trim() || null,
        isChemical: !!formVal.isChemical,
        isActive: formVal.isActive
      };

      this.departmentService.createDepartment(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Department created successfully', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to create department', 'error');
        }
      });
    }
  }

  onToggleStatus(item: any): void {
    const id = item.id || item.ID;
    this.departmentService.toggleDepartmentStatus(id).subscribe({
      next: (res: any) => {
        item.isActive = res.isActive;
        this.toastService.show(res?.message || 'Status updated successfully', 'success');
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to update status', 'error');
      }
    });
  }
}
