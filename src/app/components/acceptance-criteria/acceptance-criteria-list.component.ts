import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { AcceptanceCriteriaService } from '../../services/acceptance-criteria.service';
import { ToastService } from '../../services/toast.service';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-acceptance-criteria-list',
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
  templateUrl: './acceptance-criteria-list.component.html',
  styleUrl: './acceptance-criteria-list.component.css'
})
export class AcceptanceCriteriaListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  filterCode: string = '';
  filterName: string = '';
  filterDecisionRule: string = '';
  filterStatus: string = '';

  acceptanceCriteriaList: any[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'displayOrder';
  sortOrder: string = 'asc';

  acceptanceCriteriaForm!: FormGroup;
  submitted: boolean = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  selectedId: number = 0;
  formTitle: string = 'Add Acceptance Criteria';

  evaluationTypes: string[] = ['TEST', 'PARAMETER'];
  comparisonTypes: string[] = ['RANGE', 'GE', 'LE', 'BETWEEN', 'EQUAL', 'TARGET_TOLERANCE'];
  decisionRules: string[] = ['ALL_REQUIRED_PASS', 'WITH_MOU_GUARD', 'INFORMATIONAL'];
  roundingRules: string[] = ['ROUND_NEAREST', 'FLOOR', 'CEILING', 'TRUNCATE'];

  constructor(
    private fb: FormBuilder,
    private acceptanceCriteriaService: AcceptanceCriteriaService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.fetchData();
  }

  private initForm(): void {
    this.acceptanceCriteriaForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern('^[A-Za-z0-9_ ]+$'), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(150), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(500)]],
      evaluationType: ['TEST', [Validators.required]],
      comparisonType: ['RANGE', [Validators.required]],
      decisionRule: ['ALL_REQUIRED_PASS', [Validators.required]],
      roundingRule: ['ROUND_NEAREST', [Validators.required]],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  onCodeInput(): void {
    const ctrl = this.acceptanceCriteriaForm.get('code');
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

    if (this.filterDecisionRule !== '') {
      filters.push({ column: 'DecisionRule', type: 'Equal', value: this.filterDecisionRule });
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

    this.acceptanceCriteriaService.getAllAcceptanceCriteria(payload).subscribe({
      next: (res: any) => {
        this.acceptanceCriteriaList = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageNumber = res?.pageNumber || 1;
        this.pageSize = res?.pageSize || 10;
      },
      error: (err: any) => {
        this.acceptanceCriteriaList = [];
        this.totalItems = 0;
        this.toastService.show(err?.error?.message || 'Failed to fetch acceptance criteria', 'error');
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
    this.filterDecisionRule = '';
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
      this.formTitle = 'Add Acceptance Criteria';
      this.acceptanceCriteriaForm.reset({ id: 0, code: '', name: '', description: '', evaluationType: 'TEST', comparisonType: 'RANGE', decisionRule: 'ALL_REQUIRED_PASS', roundingRule: 'ROUND_NEAREST', displayOrder: 0, isActive: true });
      this.acceptanceCriteriaForm.enable();
      this.showModal();
    } else {
      this.formTitle = mode === 'edit' ? 'Edit Acceptance Criteria' : 'View Acceptance Criteria';
      this.acceptanceCriteriaService.getAcceptanceCriteriaById(id).subscribe({
        next: (data: any) => {
          if (!data) {
            this.toastService.show('Acceptance criteria not found', 'error');
            return;
          }
          this.acceptanceCriteriaForm.patchValue({
            id: data.id ?? data.ID ?? 0,
            code: data.code ?? data.Code ?? '',
            name: data.name ?? data.Name ?? '',
            description: data.description ?? data.Description ?? '',
            evaluationType: data.evaluationType ?? data.EvaluationType ?? 'TEST',
            comparisonType: data.comparisonType ?? data.ComparisonType ?? 'RANGE',
            decisionRule: data.decisionRule ?? data.DecisionRule ?? 'ALL_REQUIRED_PASS',
            roundingRule: data.roundingRule ?? data.RoundingRule ?? 'ROUND_NEAREST',
            displayOrder: data.displayOrder ?? data.DisplayOrder ?? 0,
            isActive: data.isActive !== undefined ? data.isActive : (data.IsActive !== undefined ? data.IsActive : true)
          });

          if (this.isViewMode) this.acceptanceCriteriaForm.disable();
          else this.acceptanceCriteriaForm.enable();
          this.showModal();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to load acceptance criteria details', 'error');
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
    this.acceptanceCriteriaForm.reset();
    this.submitted = false;
  }

  saveAcceptanceCriteria(): void {
    this.submitted = true;
    if (this.acceptanceCriteriaForm.invalid || this.isViewMode) {
      this.acceptanceCriteriaForm.markAllAsTouched();
      return;
    }

    const val = this.acceptanceCriteriaForm.getRawValue();
    const code = ((val.code || '').trim().toUpperCase().replace(/\s+/g, '_'));

    if (this.isEditMode && (val.id || 0) > 0) {
      const payload = {
        id: val.id,
        code,
        name: (val.name || '').trim(),
        description: (val.description || '').trim() || null,
        evaluationType: val.evaluationType,
        comparisonType: val.comparisonType,
        decisionRule: val.decisionRule,
        roundingRule: val.roundingRule,
        displayOrder: Number(val.displayOrder) || 0,
        isActive: val.isActive !== undefined ? val.isActive : true
      };
      this.acceptanceCriteriaService.updateAcceptanceCriteria(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Acceptance criteria updated successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to update acceptance criteria', 'error');
        }
      });
    } else {
      const payload = {
        code,
        name: (val.name || '').trim(),
        description: (val.description || '').trim() || null,
        evaluationType: val.evaluationType,
        comparisonType: val.comparisonType,
        decisionRule: val.decisionRule,
        roundingRule: val.roundingRule,
        displayOrder: Number(val.displayOrder) || 0
      };
      this.acceptanceCriteriaService.createAcceptanceCriteria(payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message || 'Acceptance criteria created successfully.', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || err?.message || 'Failed to create acceptance criteria', 'error');
        }
      });
    }
  }

  toggleStatus(item: any): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} acceptance criteria '${item.name}'?`)) return;

    this.acceptanceCriteriaService.toggleAcceptanceCriteriaStatus(item.id).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || `Acceptance criteria ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || `Failed to ${action} acceptance criteria`, 'error');
      }
    });
  }
}
