import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { ComplaintService } from '../../../../services/complaint.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-complaint-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
    templateUrl: './complaint-form.component.html',
    styleUrl: './complaint-form.component.css'
})
export class ComplaintFormComponent implements OnInit {
    complaintForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Complaint Entry';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        basicInfo: true,
        details: true,
        investigation: true,
        action: true
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
        private service: ComplaintService
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path; // create/edit/details

            if (id && id !== 'create') {
                this.recordId = +id;
                this.isEditMode = mode === 'edit';
                this.isViewMode = mode === 'details';
                this.formTitle = this.isViewMode ? 'View Complaint Details' : 'Edit Complaint Entry';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.complaintForm = this.fb.group({
            formatNo: ['F-40', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-40', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            monthYear: ['', Validators.required],
            complaintNo: ['', Validators.required],
            dateOfComplaint: ['', Validators.required],
            complainantName: ['', Validators.required],
            detailsOfComplaint: ['', Validators.required],
            validationOfComplaint: [''],
            outcomeOfInvestigation: [''],
            correctiveActionsTaken: [''],
            referenceNoDate: [''],
            signatureQM: ['']
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.complaintForm.patchValue(data);
                if (this.isViewMode) this.complaintForm.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.complaintForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.complaintForm.value).subscribe(() => this.onCancel());
            } else {
                this.service.create(this.complaintForm.value).subscribe(() => this.onCancel());
            }
        }
    }

    onCancel() {
        this.router.navigate(['/complaint-register']);
    }
}
