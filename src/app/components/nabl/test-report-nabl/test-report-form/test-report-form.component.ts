import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TestReportService } from '../../../../services/test-report.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';

import { QuillModule } from 'ngx-quill';

@Component({
    selector: 'app-test-report-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './test-report-form.component.html',
    styleUrl: './test-report-form.component.css'
})
export class TestReportFormComponent implements OnInit {
    reportForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Test Report (F-39)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        customerInfo: true,
        sampleInfo: true,
        results: true,
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
        private service: TestReportService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') { this.isViewMode = true; this.formTitle = 'View Test Report'; this.reportForm.disable(); }
        else if (path === 'edit') { this.isEditMode = true; this.formTitle = 'Edit Test Report'; }
        if (this.recordId) { this.loadData(); } else { this.addResult(); }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.reportForm = this.fb.group({
            id: [0],
            formatNo: ['F-39', Validators.required],
            issueNo: ['01', Validators.required],
            revNo: ['00', Validators.required],
            documentNo: ['', Validators.required],
            dateOfIssue: [today, Validators.required],
            customerName: ['', Validators.required],
            customerAddress: ['', Validators.required],
            customerReference: [''],
            sampleDescription: ['', Validators.required],
            sampleId: ['', Validators.required],
            conditionOnReceipt: ['Satisfactory', Validators.required],
            quantity: [''],
            heatNoBatchNo: [''],
            dateOfReceipt: [today, Validators.required],
            dateOfTesting: [today, Validators.required],
            environmentalConditions: ['Temperature: 25±2°C, Humidity: 50±10% RH'],
            results: this.fb.array([]),
            remarks: [''],
            statementOfConformity: ['Conforming'],
            preparedBy: ['', Validators.required],
            reviewedBy: [''],
            approvedBy: ['', Validators.required],
            status: ['Draft']
        });
    }

    get results(): FormArray { return this.reportForm.get('results') as FormArray; }

    addResult(): void {
        const resGroup = this.fb.group({
            srNo: [this.results.length + 1],
            testParameter: ['', Validators.required],
            testMethod: ['', Validators.required],
            result: ['', Validators.required],
            unit: [''],
            requirement: ['']
        });
        this.results.push(resGroup);
    }

    removeResult(index: number): void {
        if (this.results.length > 1) {
            this.results.removeAt(index);
            this.results.controls.forEach((ctrl, i) => ctrl.get('srNo')?.setValue(i + 1));
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.results) { this.results.clear(); data.results.forEach(() => this.addResult()); }
                    this.reportForm.patchValue(data);
                    if (this.isViewMode) this.reportForm.disable();
                }
            },
            error: () => {}
        });
    }

    onSubmit(): void {
        if (this.reportForm.invalid) { this.reportForm.markAllAsTouched(); return; }
        const formData = this.reportForm.getRawValue();
        const obs = this.isEditMode ? this.service.update(this.recordId, formData) : this.service.create(formData);
        obs.subscribe({
            next: (res) => { this.toastService.show(res.message, 'success'); this.router.navigate(['/test-report']); },
            error: (err) => { this.toastService.show(err.message || 'Operation failed', 'error');  }
        });
    }

    onCancel(): void { this.router.navigate(['/test-report']); }
    toggleSection(section: string): void { this.openSections[section] = !this.openSections[section]; }
}
