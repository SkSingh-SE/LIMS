import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { ApprovedSupplierService } from '../../../services/approved-supplier.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-approved-supplier-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './approved-supplier-form.component.html'
})
export class ApprovedSupplierFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    supplierForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Approved Supplier';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        supplier: true,
        approval: true,
        evaluation: true,
        remarks: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    performanceGrades = ['A', 'B', 'C', 'D'];

    constructor(
        private fb: FormBuilder,
        private service: ApprovedSupplierService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('ApprovedSupplier').subscribe({
            next: (defaults) => {
                this.supplierForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Approved Supplier';
            this.supplierForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Approved Supplier';
        }

        if (this.recordId) {
            this.loadData();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.supplierForm = this.fb.group({
            id: [0],
            formatNo: ['F-20'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [today, Validators.required],
            documentNo: [''],

            supplierName: ['', Validators.required],
            contactDetails: ['', Validators.required],
            productsServicesSupplied: ['', Validators.required],

            registrationNo: [''],
            approvalDate: [today, Validators.required],
            validUpTo: [''],

            lastEvaluationDate: [''],
            lastScore: [null],
            performanceGrade: [''],

            isBlacklisted: [false],
            blacklistDate: [''],
            address: [''],
            agreementDate: [''],
            remarks: [''],
            isActive: [true],
            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: ['']
        });

        // System-managed fields — always readonly
        this.supplierForm.get('documentNo')?.disable();
        this.supplierForm.get('issueNo')?.disable();
        this.supplierForm.get('revNo')?.disable();
        this.supplierForm.get('formatNo')?.disable();
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = new Date().toISOString().split('T')[0];
                    this.supplierForm.patchValue(formValues);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.supplierForm.disable();
                    this.isViewMode = true;
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.supplierForm.get('documentNo')?.disable();
                this.supplierForm.get('issueNo')?.disable();
                this.supplierForm.get('revNo')?.disable();
                this.supplierForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
        });
    }

    onSubmit(): void {
        if (this.supplierForm.invalid) {
            this.supplierForm.markAllAsTouched();
            return;
        }

        const formData = this.supplierForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/approved-supplier']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/approved-supplier']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/approved-supplier']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.supplierForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.supplierForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
