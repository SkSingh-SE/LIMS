import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { FeedbackAnalysisService } from '../../../../services/feedback-analysis.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';

@Component({
    selector: 'app-feedback-analysis-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
    templateUrl: './feedback-analysis-form.component.html',
    styleUrl: './feedback-analysis-form.component.css'
})
export class FeedbackAnalysisFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    analysisForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Customer Feedback Analysis';
    formNumbers = NablFormsHelper.getFormNumbers();
    relatedFeedback: any = null;

    openSections: { [key: string]: boolean } = {
        header: true,
        analysisDetails: true,
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
        private service: FeedbackAnalysisService
    , private unsavedChangesService: UnsavedChangesService) {
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
                this.formTitle = this.isViewMode ? 'View Feedback Analysis' : 'Edit Feedback Analysis';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.analysisForm = this.fb.group({
            formatNo: ['F-48', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-48', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            period: ['', Validators.required],
            totalFeedbackReceived: [null, [Validators.required, Validators.min(0)]],
            analysisSummary: ['', Validators.required],
            actionsTaken: ['', Validators.required]
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.analysisForm.patchValue(data);
                if (this.isViewMode) this.analysisForm.disable();
                // Load related Customer Feedback if linked
                const record = data as any;
                if (record.customerFeedbackId) {
                    this.relatedFeedback = {
                        id: record.customerFeedbackId,
                        documentNo: record.customerFeedback?.documentNo || 'N/A',
                        status: record.customerFeedback?.status || 'Draft'
                    };
                }
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.analysisForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.analysisForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
            } else {
                this.service.create(this.analysisForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
            }
        }
    }

    onCancel() {
        this.router.navigate(['/feedback-analysis']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.analysisForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.analysisForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
