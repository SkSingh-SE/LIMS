import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { AuditChecklistService } from '../../../../services/audit-checklist.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';

@Component({
    selector: 'app-audit-checklist-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
    templateUrl: './audit-checklist-form.component.html',
    styleUrl: './audit-checklist-form.component.css'
})
export class AuditChecklistFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    isSubmitting = false;
    checklistForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Audit Checklist & Observation';
    formNumbers = NablFormsHelper.getFormNumbers();
    relatedAuditPlan: any = null;

    openSections: { [key: string]: boolean } = {
        header: true,
        auditDetails: true,
        checklistItems: true,
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
        private service: AuditChecklistService
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
                this.formTitle = this.isViewMode ? 'View Audit Checklist' : 'Edit Audit Checklist';
                this.loadRecord();
            } else {
                // Add initial empty row
                this.addItem();
            }
        });
    }

    private initForm() {
        this.checklistForm = this.fb.group({
            formatNo: ['F-51', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-51', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            areaDepartment: ['', Validators.required],
            auditDate: ['', Validators.required],
            auditorName: ['', Validators.required],
            auditeeName: ['', Validators.required],
            items: this.fb.array([])
        });
    }

    get items(): FormArray {
        return this.checklistForm.get('items') as FormArray;
    }

    addItem() {
        const itemGroup = this.fb.group({
            clauseNo: ['', Validators.required],
            requirement: ['', Validators.required],
            observation: ['', Validators.required],
            compliance: ['Yes', Validators.required]
        });
        this.items.push(itemGroup);
    }

    removeItem(index: number) {
        this.items.removeAt(index);
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                // Clear items first
                while (this.items.length) this.items.removeAt(0);

                // Add items from data
                data.items.forEach(() => this.addItem());

                this.checklistForm.patchValue(data);
                if (this.isViewMode) this.checklistForm.disable();

                // Load related Audit Plan if linked
                const record = data as any;
                if (record.auditPlanId) {
                    this.relatedAuditPlan = {
                        id: record.auditPlanId,
                        documentNo: record.auditPlan?.documentNo || 'N/A',
                        status: record.auditPlan?.status || 'Draft'
                    };
                }
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.checklistForm.valid) {
            this.isSubmitting = true;
            if (this.isEditMode) {
                this.service.update(this.recordId, this.checklistForm.value).subscribe({
                    next: () => { this.isSubmitting = false; this.saved = true; this.onCancel(); },
                    error: () => { this.isSubmitting = false; }
                });
            } else {
                this.service.create(this.checklistForm.value).subscribe({
                    next: () => { this.isSubmitting = false; this.saved = true; this.onCancel(); },
                    error: () => { this.isSubmitting = false; }
                });
            }
        }
    }

    onCancel() {
        this.router.navigate(['/audit-checklist']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.checklistForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.checklistForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
