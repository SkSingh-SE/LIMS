import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { NcCorrectiveActionService } from '../../../../services/nc-corrective-action.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-nc-corrective-action-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
    templateUrl: './nc-corrective-action-form.component.html',
    styleUrl: './nc-corrective-action-form.component.css'
})
export class NcCorrectiveActionFormComponent implements OnInit {
    ncForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New NC & Corrective Action Report';
    formNumbers = NablFormsHelper.getFormNumbers();
    relatedNcWork: any = null;

    openSections: { [key: string]: boolean } = {
        header: true,
        basicInfo: true,
        observation: true,
        proposed: true,
        taken: true,
        preventive: true,
        effectiveness: true,
        relatedForms: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
        ]
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: NcCorrectiveActionService
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path;

            if (id && id !== 'create') {
                this.recordId = +id;
                this.isEditMode = mode === 'edit';
                this.isViewMode = mode === 'details';
                this.formTitle = this.isViewMode ? 'View NC Report' : 'Edit NC Report';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.ncForm = this.fb.group({
            formatNo: ['F-42', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-42', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            date: ['', Validators.required],
            ncNo: ['', Validators.required],
            clauseNo: [''],
            section: [''],
            activityAssessed: [''],
            auditor: [''],
            auditee: [''],
            ncObserved: ['', Validators.required],
            correctiveActionProposed: [''],
            timeRequired: [''],
            proposedBy: [''],
            approvedBy: [''],
            correctiveActionTaken: [''],
            preventiveAction: [''],
            effectivenessOfAction: ['']
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.ncForm.patchValue(data);
                if (this.isViewMode) this.ncForm.disable();
                // Load related Non-Conforming Work if linked
                const record = data as any;
                if (record.ncId || record.nCId) {
                    this.relatedNcWork = {
                        id: record.ncId || record.nCId,
                        documentNo: record.nc?.documentNo || record.ncRef || 'N/A',
                        status: record.nc?.status || 'Draft'
                    };
                }
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.ncForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.ncForm.value).subscribe(() => this.onCancel());
            } else {
                this.service.create(this.ncForm.value).subscribe(() => this.onCancel());
            }
        }
    }

    onCancel() {
        this.router.navigate(['/nc-corrective-action']);
    }
}
