import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { ComplaintService } from '../../../../services/complaint.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-complaint-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './complaint-form.component.html',
    styleUrl: './complaint-form.component.css'
})
export class ComplaintFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
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
    , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('Complaint').subscribe({
            next: (defaults) => {
                this.complaintForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });
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
            formatNo: ['F-40'],
            docNo: [''],
            issueNo: ['03'],
            issueDate: ['', Validators.required],
            revNo: ['00'],
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
            signatureQM: [''],
            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: ['']
        });

        // System-managed fields — always readonly
        this.complaintForm.get('docNo')?.disable();
        this.complaintForm.get('issueNo')?.disable();
        this.complaintForm.get('revNo')?.disable();
        this.complaintForm.get('formatNo')?.disable();
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.complaintForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.complaintForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.complaintForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.complaintForm.get('docNo')?.disable();
                this.complaintForm.get('issueNo')?.disable();
                this.complaintForm.get('revNo')?.disable();
                this.complaintForm.get('formatNo')?.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.complaintForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.complaintForm.getRawValue()).subscribe(() => { this.saved = true; this.onCancel(); });
            } else {
                this.service.create(this.complaintForm.getRawValue()).subscribe(() => { this.saved = true; this.onCancel(); });
            }
        }
    }

    onCancel() {
        this.router.navigate(['/complaint-register']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.complaintForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.complaintForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
