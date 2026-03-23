import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { NonConformingWorkService } from '../../../../services/non-conforming-work.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';

@Component({
    selector: 'app-non-conforming-work-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
    templateUrl: './non-conforming-work-form.component.html',
    styleUrl: './non-conforming-work-form.component.css'
})
export class NonConformingWorkFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    ncForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Non-Conforming Work Record';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        basicInfo: true,
        analysis: true,
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
        private service: NonConformingWorkService
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
                this.formTitle = this.isViewMode ? 'View NC Record' : 'Edit NC Record';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.ncForm = this.fb.group({
            formatNo: ['F-41', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-41', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            dateMonthYear: ['', Validators.required],
            ncDetail: ['', Validators.required],
            rootCauseAnalysis: [''],
            correctiveAction: [''],
            closerDate: [''],
            signatureTDQM: ['']
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.ncForm.patchValue(data);
                if (this.isViewMode) this.ncForm.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.ncForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.ncForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
            } else {
                this.service.create(this.ncForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
            }
        }
    }

    onCancel() {
        this.router.navigate(['/non-conforming-work']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.ncForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.ncForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
