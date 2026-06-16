import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TestRequestNablService } from '../../../../services/test-request-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';
import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
@Component({
    selector: 'app-test-request-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './test-request-form.component.html'
})
export class TestRequestNablFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Test Request & Sample Receipt Record (F-27)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    dispatchModeOptions = ['Email', 'Courier', 'WhatsApp', 'Self Pickup', 'Speed Post'];
    quillModules = { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] };
    today = new Date().toISOString().split('T')[0];
    openSections: { [key: string]: boolean } = {
        header: true,
        customer: true,
        samples: true,
        requirements: true,
        signatures: true,
        note:true
    };

    constructor(
        private fb: FormBuilder,
        private service: TestRequestNablService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('TestRequest').subscribe({
            next: (defaults) => {
                this.requestForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);

        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Test Request & Sample Receipt Record';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Test Request & Sample Receipt Record';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addSample();
        }
    }

    initForm(): void {

        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-27'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-27'],

            customerName: ['', Validators.required],
            address: ['', Validators.required],
            contactPerson: ['', Validators.required],
            contactPhone: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
            contactEmail: ['', [Validators.required, Validators.email]],
            gstNo: ['', [Validators.required,Validators.pattern('^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')]],

            samples: this.fb.array([]),

            urgent: [false],
            returnSample: [false],
            holdTesting: [false],
            poNumber: [''],

            billRequired: [true],
            confirmityRequired: [false],
            advancePIRequired: [false],
            dispatchModes: [[]],
            note:[this.service.getDefaultNoteClause()],
            remarks: [''],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            status: ['Completed']
        });

        // System-managed fields — always readonly
        this.requestForm.get('documentNo')?.disable();
        this.requestForm.get('issueNo')?.disable();
        this.requestForm.get('revNo')?.disable();
        this.requestForm.get('formatNo')?.disable();
    }

    get samples(): FormArray {
        return this.requestForm.get('samples') as FormArray;
    }

    addSample(): void {
        const nextSampleNo = `S-${String(this.samples.length + 1).padStart(3, '0')}`;
        const sampleGroup = this.fb.group({
            sampleNo: [{ value: nextSampleNo, disabled: true }],
            description: ['', Validators.required],
            quantity: [0, [Validators.required, Validators.min(1)]],
            materialSpecification: ['', Validators.required],
            testToPerform: ['',Validators.required],
            metalClassification: ['',Validators.required]
        });
        this.samples.push(sampleGroup);
    }

    removeSample(index: number): void {
        if (this.samples.length > 1) {
            this.samples.removeAt(index);
            this.renumberSamples();
        }
    }
    private renumberSamples(): void {
        this.samples.controls.forEach((sample, index) => {
            const sampleNo = `S-${String(index + 1).padStart(3, '0')}`;
            sample.get('sampleNo')?.setValue(sampleNo);
        });
    }
    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (!data) {
                    return;
                }

                // Patch normal fields first
                data.date = NablFormsHelper.formatDateForInput(data?.date || '')
                this.requestForm.patchValue(data);
                // Clear old sample rows
                this.samples.clear();

                // Add rows according to fetched samples
                if (data.samples && data.samples.length > 0) {
                    data.samples.forEach((item: any, index: number) => {
                        this.samples.push(this.fb.group({
                            sampleNo: [`S-${String(index + 1).padStart(3, '0')}`],
                            description: [item.description || '', Validators.required],
                            quantity: [item.quantity || 1, [Validators.required, Validators.min(1)]],
                            materialSpecification: [item.materialSpecification || '', Validators.required],
                            testToPerform: [item.testToPerform || ''],
                            metalClassification: [item.metalClassification || '']
                        }));
                    });
                } else {
                    this.addSample();
                }

                this.renumberSamples();

                // Lock form if not editable
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.requestForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.requestForm.disable();
                }

                // Always disable system fields
                this.requestForm.get('documentNo')?.disable();
                this.requestForm.get('issueNo')?.disable();
                this.requestForm.get('revNo')?.disable();
                this.requestForm.get('formatNo')?.disable();
            },
            error: () => { }
        });
    }

    onDispatchModeToggle(mode: string, event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        const currentModes = this.requestForm.get('dispatchModes')?.value || [];
        if (checkbox.checked) {
            this.requestForm.get('dispatchModes')?.setValue([...currentModes, mode]);
        } else {
            this.requestForm.get('dispatchModes')?.setValue(currentModes.filter((m: string) => m !== mode));
        }
    }

    isDispatchModeSelected(mode: string): boolean {
        return (this.requestForm.get('dispatchModes')?.value || []).includes(mode);
    }

    onSubmit(): void {
        if (this.requestForm.invalid) {
            this.requestForm.markAllAsTouched();
            return;
        }

        const formData = this.requestForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Test Request updated successfully', 'success');
                    this.router.navigate(['/nabl/test-request']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
        else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Test Request created successfully', 'success');
                    this.router.navigate(['/nabl/test-request']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Operation failed', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/nabl/test-request']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.requestForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.requestForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
