import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MeasurementUncertaintyService } from '../../../../services/measurement-uncertainty.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';

@Component({
    selector: 'app-measurement-uncertainty-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './measurement-uncertainty-form.component.html',
    styleUrl: './measurement-uncertainty-form.component.css'
})
export class MeasurementUncertaintyFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    isSubmitting = false;
    uncertaintyForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Measurement of Uncertainty Record (F-35)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        testInfo: true,
        readings: true,
        sources: true,
        analysis: true,
        approval: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'script': 'sub' }, { 'script': 'super' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean']
        ]
    };

    constructor(
        private fb: FormBuilder,
        private service: MeasurementUncertaintyService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    , private unsavedChangesService: UnsavedChangesService) { }

    ngOnInit(): void {
        this.initForm();
        this.recordId = Number(this.route.snapshot.params['id']);

        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Measurement of Uncertainty Record';
            this.uncertaintyForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Measurement of Uncertainty Record';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addReading();
            this.addUncertaintySource();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.uncertaintyForm = this.fb.group({
            id: [0],
            formatNo: ['F-35', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            documentNo: ['', Validators.required],

            testParameter: ['', Validators.required],
            testMethod: ['', Validators.required],
            equipmentUsed: ['', Validators.required],
            sampleDescription: ['', Validators.required],

            numberOfReadings: [10, [Validators.required, Validators.min(2)]],
            readings: this.fb.array([]),

            mean: [0],
            standardDeviation: [0],
            typeAUncertainty: [0],
            typeBUncertainty: [0],
            combinedUncertainty: [0],
            expandedUncertainty: [0],
            coverageFactor: [2, Validators.required],
            effectiveDegreesOfFreedom: [0],
            confidenceLevel: ['95%', Validators.required],

            uncertaintySources: this.fb.array([]),

            remarks: [''],
            preparedBy: ['', Validators.required],
            reviewedBy: [''],
            approvedBy: [''],
            status: ['Completed']
        });
    }

    get readings(): FormArray {
        return this.uncertaintyForm.get('readings') as FormArray;
    }

    get uncertaintySources(): FormArray {
        return this.uncertaintyForm.get('uncertaintySources') as FormArray;
    }

    addReading(): void {
        const readingGroup = this.fb.group({
            srNo: [this.readings.length + 1],
            measuredValue: [0, Validators.required],
            unit: ['', Validators.required]
        });
        this.readings.push(readingGroup);
    }

    removeReading(index: number): void {
        if (this.readings.length > 1) {
            this.readings.removeAt(index);
            this.readings.controls.forEach((ctrl, i) => {
                ctrl.get('srNo')?.setValue(i + 1);
            });
        }
    }

    addUncertaintySource(): void {
        const sourceGroup = this.fb.group({
            source: ['', Validators.required],
            type: ['Type A', Validators.required],
            distribution: ['Normal', Validators.required],
            standardUncertainty: [0, Validators.required],
            sensitivityCoefficient: [1, Validators.required],
            contribution: [0]
        });
        this.uncertaintySources.push(sourceGroup);
    }

    removeUncertaintySource(index: number): void {
        if (this.uncertaintySources.length > 1) {
            this.uncertaintySources.removeAt(index);
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.readings) {
                        this.readings.clear();
                        data.readings.forEach(() => this.addReading());
                    }
                    if (data.uncertaintySources) {
                        this.uncertaintySources.clear();
                        data.uncertaintySources.forEach(() => this.addUncertaintySource());
                    }
                    this.uncertaintyForm.patchValue(data);
                    if (this.isViewMode) this.uncertaintyForm.disable();
                }
            },
            error: () => {}
        });
    }

    onSubmit(): void {
        if (this.uncertaintyForm.invalid) {
            this.uncertaintyForm.markAllAsTouched();
            return;
        }

        const formData = this.uncertaintyForm.getRawValue();

        const obs = this.isEditMode
            ? this.service.update(this.recordId, formData)
            : this.service.create(formData);

        this.isSubmitting = true;
        obs.subscribe({
            next: (res) => {
              this.isSubmitting = false;
              this.saved = true;
                this.toastService.show(res.message, 'success');
                this.router.navigate(['/measurement-uncertainty']);
            },
            error: (err) => {
                this.isSubmitting = false;
                this.toastService.show(err.message || 'Operation failed', 'error');
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/measurement-uncertainty']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.uncertaintyForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.uncertaintyForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
