import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { IncomingMaterialService } from '../../../services/incoming-material.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
    selector: 'app-incoming-material-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './incoming-material-form.component.html'
})
export class IncomingMaterialFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    materialForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Log Incoming Material Inspection';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        material: true,
        results: true,
        outcome: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    statuses = ['Accepted', 'Rejected', 'Conditional'];
    results = ['Pass', 'Fail', 'NA'];

    constructor(
        private fb: FormBuilder,
        private service: IncomingMaterialService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService) { }

    ngOnInit(): void {
        this.initForm();
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;

        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Inspection Record';
            this.materialForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Inspection Record';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addResult();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.materialForm = this.fb.group({
            id: [0],
            formatNo: ['F-24', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            materialName: ['', Validators.required],
            materialCode: ['', Validators.required],
            supplierName: ['', Validators.required],
            batchNo: ['', Validators.required],
            lotNo: [''],
            quantityReceived: [0, [Validators.required, Validators.min(0.01)]],
            unitOfMeasure: ['Nos', Validators.required],

            invoiceNo: ['', Validators.required],
            invoiceDate: [today],
            grnNo: [''],

            results: this.fb.array([]),

            inspectionStatus: ['Accepted', Validators.required],
            deviations: [''],
            correctiveActions: [''],

            inspectedBy: ['', Validators.required],
            verifiedBy: ['', Validators.required],
            isActive: [true]
        });
    }

    get resultsArray(): FormArray {
        return this.materialForm.get('results') as FormArray;
    }

    addResult(): void {
        const resultForm = this.fb.group({
            parameterName: ['', Validators.required],
            requirement: ['', Validators.required],
            observation: ['', Validators.required],
            result: ['Pass', Validators.required]
        });
        this.resultsArray.push(resultForm);
    }

    removeResult(index: number): void {
        if (this.resultsArray.length > 1) {
            this.resultsArray.removeAt(index);
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    const formValues = { ...data };
                    formValues.date = new Date().toISOString().split('T')[0];

                    if (this.isEditMode) {
                        const currentRev = parseInt(data.revNo || '0');
                        formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
                    }

                    this.resultsArray.clear();
                    data.results?.forEach(r => {
                        const rForm = this.fb.group({
                            parameterName: [r.parameterName, Validators.required],
                            requirement: [r.requirement, Validators.required],
                            observation: [r.observation, Validators.required],
                            result: [r.result, Validators.required]
                        });
                        this.resultsArray.push(rForm);
                    });

                    this.materialForm.patchValue(formValues);
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }

    onSubmit(): void {
        if (this.materialForm.invalid) {
            this.materialForm.markAllAsTouched();
            return;
        }

        const formData = this.materialForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/incoming-material']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => { this.saved = true; this.router.navigate(['/incoming-material']); },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/incoming-material']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.materialForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.materialForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
