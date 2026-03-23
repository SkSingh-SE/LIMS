import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TechnicalRawDataNablService } from '../../../../services/technical-raw-data-nabl.service';
import { ToastService } from '../../../../services/toast.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';

@Component({
    selector: 'app-technical-raw-data-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './technical-raw-data-form.component.html',
    styleUrl: './technical-raw-data-form.component.css'
})
export class TechnicalRawDataFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    dataForm!: FormGroup;
    isEditMode: boolean = false;
    isViewMode: boolean = false;
    recordId: number = 0;
    formTitle = 'Create Technical Raw Data Record';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        testInfo: true,
        readings: true,
        conclusion: true,
        approval: true
    };

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private service: TechnicalRawDataNablService,
        private toastService: ToastService
    , private unsavedChangesService: UnsavedChangesService) { }

    ngOnInit(): void {
        this.initForm();

        this.route.paramMap.subscribe(params => {
            this.recordId = Number(params.get('id'));
            if (this.recordId > 0) {
                this.loadData();
            } else {
                this.addReading();
            }
        });

        const state = history.state as { mode?: string };
        if (state && state.mode === 'view') {
            this.formTitle = 'Technical Raw Data Details';
            this.isViewMode = true;
            this.dataForm.disable();
        } else if (state && state.mode === 'edit') {
            this.formTitle = 'Edit Technical Raw Data Record';
            this.isEditMode = true;
            this.isViewMode = false;
        } else {
            this.isEditMode = false;
            this.isViewMode = false;
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.dataForm = this.fb.group({
            id: [0],
            formatNo: ['F-34', Validators.required],
            issueNo: ['03', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],

            testMethodName: ['', Validators.required],
            testMethodRef: ['', Validators.required],
            equipmentUsed: ['', Validators.required],
            sampleDescription: ['', Validators.required],
            analystName: ['', Validators.required],

            readings: this.fb.array([]),

            conclusion: [''],
            preparedBy: [''],
            issuedBy: [''],
            reviewedApprovedBy: ['']
        });
    }

    get readings(): FormArray {
        return this.dataForm.get('readings') as FormArray;
    }

    addReading(): void {
        const group = this.fb.group({
            srNo: [this.readings.length + 1],
            sampleId: ['', Validators.required],
            parameter: ['', Validators.required],
            unit: [''],
            reading1: [null],
            reading2: [null],
            reading3: [null],
            mean: [null],
            sd: [null],
            rsd: [null],
            remarks: ['']
        });
        this.readings.push(group);
    }

    removeReading(index: number): void {
        if (this.readings.length > 1) {
            this.readings.removeAt(index);
            this.readings.controls.forEach((ctrl, idx) => {
                ctrl.get('srNo')?.setValue(idx + 1);
            });
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
                    this.dataForm.patchValue(data);
                }
            },
            error: (error) => {
                console.error('Error fetching record:', error);
                this.toastService.show('Error loading record', 'error');
                this.router.navigate(['/nabl/technical-raw-data']);
            }
        });
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit(): void {
        if (this.dataForm.valid) {
            const formData = this.dataForm.getRawValue();

            if (this.isEditMode) {
                formData.id = this.recordId;
                this.service.update(this.recordId, formData).subscribe({
                    next: (response) => {
                      this.saved = true;
                        this.toastService.show(response.message, 'success');
                        this.router.navigate(['/nabl/technical-raw-data']);
                    },
                    error: () => {
                        this.toastService.show('Error updating record', 'error');
                    }
                });
            } else {
                this.service.create(formData).subscribe({
                    next: (response) => {
                      this.saved = true;
                        this.toastService.show(response.message, 'success');
                        this.router.navigate(['/nabl/technical-raw-data']);
                    },
                    error: () => {
                        this.toastService.show('Error creating record', 'error');
                    }
                });
            }
        } else {
            this.dataForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields', 'warning');
        }
    }

    goBack(): void {
        this.router.navigate(['/nabl/technical-raw-data']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.dataForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.dataForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
