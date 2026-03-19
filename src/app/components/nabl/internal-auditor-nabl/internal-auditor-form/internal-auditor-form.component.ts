import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InternalAuditorService } from '../../../../services/internal-auditor.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-internal-auditor-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './internal-auditor-form.component.html',
    styleUrl: './internal-auditor-form.component.css'
})
export class InternalAuditorFormComponent implements OnInit {
    auditorForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add Trained Internal Auditor';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        auditorDetails: true
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: InternalAuditorService
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
                this.formTitle = this.isViewMode ? 'View Internal Auditor' : 'Edit Internal Auditor';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.auditorForm = this.fb.group({
            formatNo: ['F-49', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-49', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            auditorName: ['', Validators.required],
            qualification: ['', Validators.required],
            trainingDate: ['', Validators.required],
            examScore: ['', Validators.required],
            remarks: ['']
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.auditorForm.patchValue(data);
                if (this.isViewMode) this.auditorForm.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.auditorForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.auditorForm.value).subscribe(() => this.onCancel());
            } else {
                this.service.create(this.auditorForm.value).subscribe(() => this.onCancel());
            }
        }
    }

    onCancel() {
        this.router.navigate(['/internal-auditor']);
    }
}
