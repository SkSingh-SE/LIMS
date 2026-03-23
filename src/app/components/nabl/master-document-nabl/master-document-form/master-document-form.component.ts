import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MasterDocumentService } from '../../../../services/master-document.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';

@Component({
    selector: 'app-master-document-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './master-document-form.component.html',
    styleUrl: './master-document-form.component.css'
})
export class MasterDocumentFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    docForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Add New Master Document Entry';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        docDetails: true
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: MasterDocumentService
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
                this.formTitle = this.isViewMode ? 'View Master Document Entry' : 'Edit Master Document Entry';
                this.loadRecord();
            }
        });
    }

    private initForm() {
        this.docForm = this.fb.group({
            formatNo: ['F-43', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-43', Validators.required],
            srNo: [null],
            documentName: ['', Validators.required],
            documentNo: ['', Validators.required],
            issueNo: ['', Validators.required],
            issueDate: ['', Validators.required],
            revNo: ['', Validators.required],
            revDate: ['', Validators.required],
            copyHolder: ['', Validators.required]
        });
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                this.docForm.patchValue(data);
                if (this.isViewMode) this.docForm.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.docForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.docForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
            } else {
                this.service.create(this.docForm.value).subscribe(() => { this.saved = true; this.onCancel(); });
            }
        }
    }

    onCancel() {
        this.router.navigate(['/master-document']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.docForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.docForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
