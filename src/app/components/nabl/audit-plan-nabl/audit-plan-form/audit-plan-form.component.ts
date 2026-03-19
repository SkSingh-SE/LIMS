import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuditPlanService } from '../../../../services/audit-plan.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-audit-plan-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './audit-plan-form.component.html',
    styleUrl: './audit-plan-form.component.css'
})
export class AuditPlanFormComponent implements OnInit {
    auditForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Audit Schedule & Plan';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        planDetails: true
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: AuditPlanService
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
                this.formTitle = this.isViewMode ? 'View Audit Plan' : 'Edit Audit Plan';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.auditForm = this.fb.group({
            formatNo: ['F-50', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-50', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            auditType: ['Internal Audit', Validators.required],
            period: ['', Validators.required],
            areaDepartment: ['', Validators.required],
            auditorName: ['', Validators.required],
            scheduleDate: ['', Validators.required],
            scope: ['', Validators.required]
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.auditForm.patchValue(data);
                if (this.isViewMode) this.auditForm.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.auditForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.auditForm.value).subscribe(() => this.onCancel());
            } else {
                this.service.create(this.auditForm.value).subscribe(() => this.onCancel());
            }
        }
    }

    onCancel() {
        this.router.navigate(['/audit-plan']);
    }
}
