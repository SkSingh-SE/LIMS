import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { AuditChecklistService } from '../../../../services/audit-checklist.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-audit-checklist-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
    templateUrl: './audit-checklist-form.component.html',
    styleUrl: './audit-checklist-form.component.css'
})
export class AuditChecklistFormComponent implements OnInit {
    checklistForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    isLoading = false;
    formTitle = 'Audit Checklist & Observation';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        auditDetails: true,
        checklistItems: true
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
        this.isLoading = true;
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                // Clear items first
                while (this.items.length) this.items.removeAt(0);

                // Add items from data
                data.items.forEach(() => this.addItem());

                this.checklistForm.patchValue(data);
                if (this.isViewMode) this.checklistForm.disable();
            }
            this.isLoading = false;
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.checklistForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.checklistForm.value).subscribe(() => this.onCancel());
            } else {
                this.service.create(this.checklistForm.value).subscribe(() => this.onCancel());
            }
        }
    }

    onCancel() {
        this.router.navigate(['/audit-checklist']);
    }
}
