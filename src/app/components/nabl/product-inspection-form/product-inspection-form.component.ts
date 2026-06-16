import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { ProductInspectionService } from '../../../services/product-inspection.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-product-inspection-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './product-inspection-form.component.html'
})
export class ProductInspectionFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    inspectionForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Create Inspection Plan';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        product: true,
        parameters: true,
        signatories: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    categories = ['Product', 'Service'];
    stages = ['Incoming', 'In-process', 'Final'];
    risks = ['Low', 'Medium', 'High'];
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: ProductInspectionService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('ProductInspection').subscribe({
            next: (defaults) => {
                this.inspectionForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Inspection Plan';
            this.inspectionForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Inspection Plan';
        }
        if(path != "details" && path != "edit"){
            this.service.loadNextPlanNo().subscribe({
                  next: (res) => {
                    this.inspectionForm.patchValue({
                        planNo: res.planNo
                    })
                },
                error: () => { }
            });
        }
        if (this.recordId) {
            this.loadData();
        } else {
            this.addParameter();
        }
    }

    initForm(): void {
        this.inspectionForm = this.fb.group({
            id: [0],
            formatNo: ['F-23'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: [''],
            risklevel: ['Low'],

            productName: ['', Validators.required],
            productCode: ['', Validators.required],
            category: ['Product', Validators.required],
            inspectionStage: ['Incoming', Validators.required],

            parameters: this.fb.array([]),
            remarks: [''],
            planNo:[''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            approvedDate: [''],
            preparedDate: [this.today],
            reviewedDate: [''],
            status: ['Pending'],
            isActive: [true]
        });

        // System-managed fields — always readonly
        this.inspectionForm.get('documentNo')?.disable();
        this.inspectionForm.get('issueNo')?.disable();
        this.inspectionForm.get('revNo')?.disable();
        this.inspectionForm.get('formatNo')?.disable();
        this.inspectionForm.get('planNo')?.disable();
    }

    get parameters(): FormArray {
        return this.inspectionForm.get('parameters') as FormArray;
    }

    addParameter(): void {
        const paramForm = this.fb.group({
            parameterName: ['', Validators.required],
            requirement: ['', Validators.required],
            referenceStandard: ['', Validators.required],
            methodOfCheck: ['', Validators.required],
            frequency: ['', Validators.required],
            acceptanceCriteria: ['', Validators.required]
        });
        this.parameters.push(paramForm);
    }

    removeParameter(index: number): void {
        if (this.parameters.length > 1) {
            this.parameters.removeAt(index);
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = new Date().toISOString().split('T')[0];

                    this.parameters.clear();
                    data.parameters?.forEach(p => {
                        const paramForm = this.fb.group({
                            parameterName: [p.parameterName, Validators.required],
                            requirement: [p.requirement, Validators.required],
                            referenceStandard: [p.requirement, Validators.required],
                            methodOfCheck: [p.methodOfCheck, Validators.required],
                            frequency: [p.frequency, Validators.required],
                            acceptanceCriteria: [p.acceptanceCriteria, Validators.required]
                        });
                        this.parameters.push(paramForm);
                    });

                    this.inspectionForm.patchValue(formValues);
                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.inspectionForm.disable();
                        this.isViewMode = true;
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.inspectionForm.get('documentNo')?.disable();
                    this.inspectionForm.get('issueNo')?.disable();
                    this.inspectionForm.get('revNo')?.disable();
                    this.inspectionForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }

    onSubmit(): void {
        if (this.inspectionForm.invalid) {
            this.inspectionForm.markAllAsTouched();
            return;
        }

        const formData = this.inspectionForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Product & Service Inspection Plan updated successfully', 'success')
                    this.router.navigate(['/product-inspection']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Product & Service Inspection Plan created successfully', 'success')
                    this.router.navigate(['/product-inspection']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/product-inspection']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.inspectionForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.inspectionForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
