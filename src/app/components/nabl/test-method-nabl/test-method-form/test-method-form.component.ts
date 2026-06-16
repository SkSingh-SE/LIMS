import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TestMethodNablService } from '../../../../services/test-method-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { YearHelper } from "../../../../utility/helper/year.helper";
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
@Component({
    selector: 'app-test-method-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './test-method-form.component.html'
})
export class TestMethodNablFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add List of Test Methods / Ext Documents (F-28)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    yearOptions: number[] = YearHelper.standardYears();

    openSections: { [key: string]: boolean } = {
        header: true,
        details: true,
        testMethod: true,
        externalDoc: true,
        signatures: true
    };
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: TestMethodNablService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('TestMethod').subscribe({
            next: (defaults) => {
                this.requestForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.recordId = Number(this.route.snapshot.params['id']);

        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View List of Test Methods / Ext Documents';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit List of Test Methods / Ext Documents';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addEntry();
            this.addDocEntry();
        }
    }

    initForm(): void {

        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-28'],
            issueNo: ['03'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-28'],
            testMethod: this.fb.array([]),
            docEntries: this.fb.array([]),


            preparedBy: [''],
            testMethodTitle: ['List of Test Methods / External Origin Documents'],
            approvedBy: [null],
            reviewedBy: [null],
            approvedDate: [''],
            preparedDate: [this.today],
            reviewedDate: [''],
            issuedBy: [''],

            status: ['Active']
        });

        // System-managed fields — always readonly
        this.requestForm.get('documentNo')?.disable();
        this.requestForm.get('issueNo')?.disable();
        this.requestForm.get('revNo')?.disable();
        this.requestForm.get('formatNo')?.disable();
        this.requestForm.get('testMethodTitle')?.disable();
    }

    get testMethod(): FormArray {
        return this.requestForm.get('testMethod') as FormArray;
    }

    get docEntries(): FormArray {
        return this.requestForm.get('docEntries') as FormArray;
    }
  
    addDocEntry(): void {
        const index = this.docEntries.length;
        const entryGroup = this.fb.group({
            docId: ['', Validators.required],
            description: ['', Validators.required],
            docSource: ['', Validators.required],
            docType: ['Standard'],
            issue: ['',Validators.required],
            monthYear: ['',Validators.required],
            status: ['Active']
        });

        this.docEntries.push(entryGroup);
    }

    removeDocEntry(index: number): void {
        if (this.docEntries.length > 1) {
            this.docEntries.removeAt(index);
            this.docEntries.controls.forEach((ctrl, idx) => {
                ctrl.get('srNo')?.setValue(idx + 1);

            });
        }
    }
    addEntry(): void {
        const index = this.testMethod.length;
        const entryGroup = this.fb.group({
            srNo: [this.testMethod.length + 1],
            methodName: ['', Validators.required],
            specificationCode: ['', Validators.required],
            referenceStandard: ['', Validators.required],
            revisionNo: ['', Validators.required],
            effectiveDate: ['', Validators.required],
            status: ['Active'],
            isVerified: [false],
            isValidated: [false]
        });

        this.testMethod.push(entryGroup);
    }

    removeEntry(index: number): void {
        if (this.testMethod.length > 1) {
            this.testMethod.removeAt(index);
            this.testMethod.controls.forEach((ctrl, idx) => {
                ctrl.get('srNo')?.setValue(idx + 1);
            });
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {

                    data.date = NablFormsHelper.formatDateForInput(data.date) || data.date;
                    this.testMethod.clear();
                    this.requestForm.patchValue(data);

                    data.testMethod.forEach((entry: any, index: number) => {
                        this.testMethod.push(this.fb.group({
                            srNo: [index + 1],
                            methodName: [entry.methodName || '', Validators.required],
                            specificationCode: [entry.specificationCode || '', Validators.required],
                            referenceStandard: [entry.referenceStandard || '', Validators.required],
                            revisionNo: [entry.revisionNo || '', Validators.required],
                            effectiveDate: NablFormsHelper.formatDateForInput(entry.effectiveDate) || null,
                            status: [entry.status || 'Active'],
                            isVerified: [entry.isVerified === true || entry.isVerified === 1],
                            isValidated: [entry.isValidated === true || entry.isValidated === 1]
                        }));
                    });

                    if (this.testMethod.length === 0) {
                        this.addEntry();
                    }
                    this.docEntries.clear();

                    data.docEntries.forEach((entry: any, index: number) => {
                        this.docEntries.push(this.fb.group({
                            srNo: [index + 1],
                            docId: [entry.docId || '', Validators.required],
                            description: [entry.description || '', Validators.required],
                            docSource: [entry.docSource || ''],
                            docType: [entry.docType || ''],
                            issue: [entry.issue || ''],
                            monthYear: NablFormsHelper.formatDateForInput(entry.monthYear) || null,
                            status: [entry.status || 'Active']
                        }));
                    });

                    if (this.docEntries.length === 0) {
                        this.addDocEntry();
                    }


                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.requestForm.disable();
                        this.isViewMode = true;
                    } else if (this.isViewMode) {
                        this.requestForm.disable();
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.requestForm.get('documentNo')?.disable();
                    this.requestForm.get('issueNo')?.disable();
                    this.requestForm.get('revNo')?.disable();
                    this.requestForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => {
                this.toastService.show(error?.error?.message || 'Operation failed', 'error');
            }
        });
    }

    onSubmit(): void {
        if (this.requestForm.invalid) {
            this.requestForm.markAllAsTouched();
            return;
        }

        const formData = this.requestForm.getRawValue();
        formData.prepareDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        const obs = this.isEditMode
            ? this.service.update(this.recordId, formData)
            : this.service.create(formData);

        obs.subscribe({
            next: (res) => {
                this.saved = true;
                this.toastService.show(res.message, 'success');
                this.router.navigate(['/nabl/test-method']);
            },
            error: (err) => {
                this.toastService.show(err.message || 'Operation failed', 'error');
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/nabl/test-method']);
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
