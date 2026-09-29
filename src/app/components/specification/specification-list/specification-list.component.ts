import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { SpecificationMasterService, SpecificationGradeDto, SpecificationGradeCreateDto, SpecificationGradeUpdateDto } from '../../../services/specification-master.service';
import { ToastService } from '../../../services/toast.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';

export interface SpecificationListItem {
  id: number;
  code: string;
  name: string;
  standardReference?: string;
  standardOrganizationID?: number;
  standardOrganizationName?: string;
  description?: string;
  isActive: boolean;
  versionCount: number;
  gradeCount?: number;
  createdOn: string;
  modifiedOn?: string;
}

@Component({
  selector: 'app-specification-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    PaginationComponent,
    BreadcrumbComponent,
    SearchableDropdownComponent
  ],
  templateUrl: './specification-list.component.html',
  styleUrl: './specification-list.component.css'
})
export class SpecificationListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  @ViewChild('viewModalRef') viewModalElement!: ElementRef;
  @ViewChild('gradeModalRef') gradeModalElement!: ElementRef;
  private bsModal!: Modal;
  private bsViewModal!: Modal;
  private bsGradeModal!: Modal;

  // Filter state
  filterCode: string = '';
  filterName: string = '';
  filterStandard: string = '';
  filterOrgId: number | null = null;
  filterStatus: string = ''; // '' = All, 'true' = Active, 'false' = Inactive

  // Grid state
  specificationList: SpecificationListItem[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'id';
  sortOrder: string = 'desc';

  // Standard Organizations for dropdown
  organizationList: any[] = [];

  // Add / Edit Form state
  specificationForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Specification';

  // View modal state
  viewData: any = null;

  // Grade Management state
  activeSpecForGrades: any = null;
  gradesList: SpecificationGradeDto[] = [];
  includeInactiveGrades: boolean = true;
  gradeForm!: FormGroup;
  gradeSubmitted: boolean = false;
  isGradeEditMode: boolean = false;
  editingGradeId: number = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private specificationService: SpecificationMasterService,
    private toastService: ToastService
  ) {}

  navigateToVersions(item: any): void {
    if (!item?.id) return;
    this.closeViewModal();
    this.router.navigate(['/specification-version'], { queryParams: { specId: item.id } });
  }

  navigateToAddVersion(item: any): void {
    if (!item?.id) return;
    this.closeViewModal();
    this.router.navigate(['/specification-version'], { queryParams: { specId: item.id, action: 'add' } });
  }

  navigateToRequirements(item: any): void {
    if (!item?.id) return;
    this.closeViewModal();
    this.router.navigate(['/specification-requirement'], { queryParams: { specId: item.id } });
  }

  navigateToRequirementsForGrade(grade: SpecificationGradeDto): void {
    if (!this.activeSpecForGrades?.id || !grade?.id) return;
    const specId = this.activeSpecForGrades.id;
    const gradeId = grade.id;
    this.closeGradeModal();
    this.router.navigate(['/specification-requirement'], { queryParams: { specId, gradeId } });
  }

  navigateToRequirementsFromGradeModal(): void {
    if (!this.activeSpecForGrades?.id) return;
    const specId = this.activeSpecForGrades.id;
    this.closeGradeModal();
    this.router.navigate(['/specification-requirement'], { queryParams: { specId } });
  }

  navigateToVersionsFromGradeModal(): void {
    if (!this.activeSpecForGrades?.id) return;
    const specId = this.activeSpecForGrades.id;
    this.closeGradeModal();
    this.router.navigate(['/specification-version'], { queryParams: { specId } });
  }

  ngOnInit(): void {
    this.initForm();
    this.initGradeForm();
    this.loadOrganizations();
    this.fetchData();

    this.route.queryParams.subscribe(params => {
      const specId = params['specId'] ? Number(params['specId']) : null;
      const action = params['action'];
      if (specId) {
        if (action === 'grade' || params['openGrade'] === 'true') {
          this.specificationService.getSpecificationById(specId).subscribe(spec => {
            if (spec) this.openGradesModal(spec);
          });
        } else if (action === 'view' || !action) {
          this.openViewModal(specId);
        }
      }
    });
  }

  initForm(): void {
    this.specificationForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[A-Z0-9_]+$/)]],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      standardReference: ['', [Validators.maxLength(300)]],
      standardOrganizationID: [null],
      description: ['', [Validators.maxLength(1000)]],
      isActive: [true]
    });
  }

  loadOrganizations(): void {
    this.specificationService.getStandardOrganizations().subscribe({
      next: (data) => {
        this.organizationList = data || [];
      },
      error: () => {
        this.organizationList = [];
      }
    });
  }
  fetchOrganizationsFn = (term: string, page: number, pageSize: number): Observable<any[]> => {
    let list = this.organizationList.map(org => {
      const displayName = org.code ? `${org.name} (${org.code})` : org.name;
      return {
        id: org.id,
        name: displayName,
        code: org.code,
        additionalValues: { fullDisplayName: displayName }
      };
    });
    
    if (term) {
      const lower = term.toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(lower) || o.code?.toLowerCase().includes(lower));
    }
    
    // Paginate client-side
    const start = page * pageSize;
    return of(list.slice(start, start + pageSize));
  };

  fetchData(): void {
    const filters: any[] = [];

    if (this.filterCode.trim()) {
      filters.push({ column: 'code', type: 'contains', value: this.filterCode.trim() });
    }
    if (this.filterName.trim()) {
      filters.push({ column: 'name', type: 'contains', value: this.filterName.trim() });
    }
    if (this.filterStandard.trim()) {
      filters.push({ column: 'standardreference', type: 'contains', value: this.filterStandard.trim() });
    }
    if (this.filterOrgId && this.filterOrgId > 0) {
      filters.push({ column: 'standardorganizationid', type: 'equals', value: this.filterOrgId.toString() });
    }
    if (this.filterStatus !== '') {
      filters.push({ column: 'isactive', type: 'equals', value: this.filterStatus });
    }

    const payload = {
      PageNumber: this.pageNumber - 1, // 0-indexed on backend
      PageSize: this.pageSize,
      SortByColumn: this.sortByColumn,
      SortOrder: this.sortOrder,
      Filter: filters
    };

    this.specificationService.getAllSpecifications(payload).subscribe({
      next: (response) => {
        this.specificationList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: () => {
        this.specificationList = [];
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
    this.filterStandard = '';
    this.filterOrgId = null;
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
    // Live normalization UX: uppercase, spaces to underscore, allowed chars only [A-Z0-9_]
    const normalized = input.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    this.specificationForm.get('code')?.setValue(normalized, { emitEvent: false });
  }

  openModal(type: string, id: number = 0): void {
    this.submitted = false;
    this.selectedId = id;

    if (type === 'view') {
      this.openViewModal(id);
      return;
    }

    this.specificationForm.reset({
      id: 0,
      code: '',
      name: '',
      standardReference: '',
      standardOrganizationID: null,
      description: '',
      isActive: true
    });
    this.specificationForm.enable();

    if (type === 'create') {
      this.isEditMode = false;
      this.formTitle = 'Add Specification Master';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.formTitle = 'Edit Specification Master';
      this.loadSpecificationData(id);
    }

    const modalEl = this.modalElement?.nativeElement || document.getElementById('specificationModal');
    if (modalEl) {
      if (!this.bsModal) {
        this.bsModal = new Modal(modalEl, { backdrop: 'static', keyboard: false });
      }
      this.bsModal.show();
    }
  }

  openViewModal(id: number): void {
    this.viewData = null;
    this.specificationService.getSpecificationById(id).subscribe({
      next: (data) => {
        this.viewData = data;
        const viewEl = this.viewModalElement?.nativeElement || document.getElementById('specificationViewModal');
        if (viewEl) {
          if (!this.bsViewModal) {
            this.bsViewModal = new Modal(viewEl, { backdrop: 'static', keyboard: false });
          }
          this.bsViewModal.show();
        }
      },
      error: () => {
        this.toastService.show('Failed to load specification details.', 'error');
      }
    });
  }

  loadSpecificationData(id: number): void {
    this.specificationService.getSpecificationById(id).subscribe({
      next: (data) => {
        if (this.selectedId !== id) return;
        this.specificationForm.patchValue({
          id: data.id,
          code: data.code,
          name: data.name,
          standardReference: data.standardReference || '',
          standardOrganizationID: data.standardOrganizationID || null,
          description: data.description || '',
          isActive: data.isActive
        });
      },
      error: () => {
        this.toastService.show('Failed to load specification data.', 'error');
      }
    });
  }

  closeModal(): void {
    this.submitted = false;
    if (this.bsModal) {
      this.bsModal.hide();
    } else {
      const modalEl = this.modalElement?.nativeElement || document.getElementById('specificationModal');
      if (modalEl) {
        const inst = Modal.getInstance(modalEl);
        inst?.hide();
      }
    }
    this.specificationForm.reset({
      id: 0,
      code: '',
      name: '',
      standardReference: '',
      standardOrganizationID: null,
      description: '',
      isActive: true
    });
    this.specificationForm.enable();
    this.selectedId = 0;
    this.isEditMode = false;
  }

  closeViewModal(): void {
    if (this.bsViewModal) {
      this.bsViewModal.hide();
    } else {
      const viewEl = this.viewModalElement?.nativeElement || document.getElementById('specificationViewModal');
      if (viewEl) {
        const inst = Modal.getInstance(viewEl);
        inst?.hide();
      }
    }
    this.viewData = null;
  }

  openGradesFromViewModal(data: any): void {
    if (!data) return;
    const specCopy = { ...data };
    this.closeViewModal();
    setTimeout(() => {
      this.openGradesModal(specCopy);
    }, 150);
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.specificationForm, path, this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.specificationForm);

    if (!this.specificationForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }

    const formVal = this.specificationForm.getRawValue();

    if (this.isEditMode) {
      const updateDto = {
        id: formVal.id,
        code: formVal.code?.trim().toUpperCase(),
        name: formVal.name?.trim(),
        standardReference: formVal.standardReference?.trim() || null,
        standardOrganizationID: formVal.standardOrganizationID ? Number(formVal.standardOrganizationID) : null,
        description: formVal.description?.trim() || null,
        isActive: formVal.isActive
      };

      this.specificationService.updateSpecification(updateDto).subscribe({
        next: (response) => {
          this.toastService.show(response?.message || 'Specification updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.message || 'Failed to update specification.', 'error');
        }
      });
    } else {
      const createDto = {
        code: formVal.code?.trim().toUpperCase(),
        name: formVal.name?.trim(),
        standardReference: formVal.standardReference?.trim() || null,
        standardOrganizationID: formVal.standardOrganizationID ? Number(formVal.standardOrganizationID) : null,
        description: formVal.description?.trim() || null,
        isActive: formVal.isActive
      };

      this.specificationService.createSpecification(createDto).subscribe({
        next: (response) => {
          this.toastService.show(response?.message || 'Specification created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.message || 'Failed to create specification.', 'error');
        }
      });
    }
  }

  toggleStatus(item: SpecificationListItem): void {
    if (!item?.id) return;
    const action = item.isActive ? 'deactivate' : 'activate';
    this.specificationService.toggleStatus(item.id).subscribe({
      next: (response) => {
        this.toastService.show(response?.message || `Specification ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || error?.message || `Failed to ${action} specification.`, 'error');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GRADE LIFECYCLE MANAGEMENT MODAL
  // ─────────────────────────────────────────────────────────────────────────────

  initGradeForm(): void {
    this.gradeForm = this.fb.group({
      id: [0],
      grade: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      remarks: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  openGradesModal(spec: any): void {
    if (!spec?.id) return;
    this.activeSpecForGrades = spec;
    this.isGradeEditMode = false;
    this.editingGradeId = 0;
    this.gradeSubmitted = false;
    this.initGradeForm();
    this.loadGrades(spec.id);

    const gradeEl = this.gradeModalElement?.nativeElement || document.getElementById('gradeManagementModal');
    if (gradeEl) {
      if (!this.bsGradeModal) {
        this.bsGradeModal = new Modal(gradeEl, { backdrop: 'static', keyboard: false });
      }
      this.bsGradeModal.show();
    }
  }

  loadGrades(specId: number): void {
    this.specificationService.getGrades(specId, this.includeInactiveGrades).subscribe({
      next: (data) => {
        this.gradesList = data || [];
      },
      error: () => {
        this.gradesList = [];
        this.toastService.show('Failed to load grades for this specification.', 'error');
      }
    });
  }

  onIncludeInactiveGradesChange(): void {
    if (this.activeSpecForGrades?.id) {
      this.loadGrades(this.activeSpecForGrades.id);
    }
  }

  isGradeFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.gradeForm, path, this.gradeSubmitted);
  }

  onGradeSubmit(): void {
    this.gradeSubmitted = true;
    FormValidationHelper.markAllTouched(this.gradeForm);

    if (!this.gradeForm.valid) {
      this.toastService.show('Please provide a valid Grade name.', 'warning');
      return;
    }

    const val = this.gradeForm.getRawValue();
    const trimmedGrade = val.grade ? val.grade.trim() : '';

    if (this.isGradeEditMode) {
      const updatePayload: SpecificationGradeUpdateDto = {
        id: this.editingGradeId,
        grade: trimmedGrade,
        remarks: val.remarks?.trim() || null,
        isActive: val.isActive
      };

      this.specificationService.updateGrade(this.editingGradeId, updatePayload).subscribe({
        next: (res) => {
          this.toastService.show(res?.message || 'Grade updated successfully.', 'success');
          this.cancelGradeEdit();
          this.loadGrades(this.activeSpecForGrades.id);
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to update grade.', 'error');
        }
      });
    } else {
      const createPayload: SpecificationGradeCreateDto = {
        grade: trimmedGrade,
        remarks: val.remarks?.trim() || null,
        isActive: val.isActive
      };

      this.specificationService.createGrade(this.activeSpecForGrades.id, createPayload).subscribe({
        next: (res) => {
          this.toastService.show(res?.message || 'Grade created successfully.', 'success');
          this.initGradeForm();
          this.gradeSubmitted = false;
          this.loadGrades(this.activeSpecForGrades.id);
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to create grade.', 'error');
        }
      });
    }
  }

  editGrade(g: SpecificationGradeDto): void {
    this.isGradeEditMode = true;
    this.editingGradeId = g.id;
    this.gradeSubmitted = false;
    this.gradeForm.patchValue({
      id: g.id,
      grade: g.grade,
      remarks: g.remarks || '',
      isActive: g.isActive
    });
  }

  cancelGradeEdit(): void {
    this.isGradeEditMode = false;
    this.editingGradeId = 0;
    this.gradeSubmitted = false;
    this.initGradeForm();
  }

  toggleGradeStatus(g: SpecificationGradeDto): void {
    const action = g.isActive ? 'deactivate' : 'activate';
    this.specificationService.toggleGradeStatus(g.id).subscribe({
      next: (res) => {
        this.toastService.show(res?.message || `Grade ${action}d successfully.`, 'success');
        this.loadGrades(this.activeSpecForGrades.id);
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || err?.message || `Failed to ${action} grade.`, 'error');
      }
    });
  }

  closeGradeModal(): void {
    if (this.bsGradeModal) {
      this.bsGradeModal.hide();
    } else {
      const gradeEl = this.gradeModalElement?.nativeElement || document.getElementById('gradeManagementModal');
      if (gradeEl) {
        const inst = Modal.getInstance(gradeEl);
        inst?.hide();
      }
    }
    this.activeSpecForGrades = null;
    this.gradesList = [];
    this.isGradeEditMode = false;
    this.editingGradeId = 0;
    this.gradeSubmitted = false;
    this.fetchData();
  }
}

