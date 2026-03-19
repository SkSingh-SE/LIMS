import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { MeetingMinutesService } from '../../../../services/meeting-minutes.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-meeting-minutes-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule],
    templateUrl: './meeting-minutes-form.component.html',
    styleUrl: './meeting-minutes-form.component.css'
})
export class MeetingMinutesFormComponent implements OnInit {
    minutesForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Minutes of Management Review Meeting';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        meetingInfo: true,
        discussions: true,
        actionItems: true
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
        private service: MeetingMinutesService
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
                this.formTitle = this.isViewMode ? 'View Meeting Minutes' : 'Edit Meeting Minutes';
                this.loadRecord();
            } else {
                this.addDiscussion();
                this.addActionItem();
            }
        });
    }

    private initForm() {
        this.minutesForm = this.fb.group({
            formatNo: ['F-54', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-54', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            meetingDate: ['', Validators.required],
            chairperson: ['', Validators.required],
            reviewPeriod: ['', Validators.required],
            discussions: this.fb.array([]),
            actionItems: this.fb.array([])
        });
    }

    get discussions(): FormArray {
        return this.minutesForm.get('discussions') as FormArray;
    }

    get actionItems(): FormArray {
        return this.minutesForm.get('actionItems') as FormArray;
    }

    addDiscussion() {
        const group = this.fb.group({
            agendaItem: ['', Validators.required],
            discussion: ['', Validators.required],
            decision: ['', Validators.required]
        });
        this.discussions.push(group);
    }

    removeDiscussion(index: number) {
        this.discussions.removeAt(index);
    }

    addActionItem() {
        const group = this.fb.group({
            action: ['', Validators.required],
            responsibility: ['', Validators.required],
            targetDate: ['', Validators.required]
        });
        this.actionItems.push(group);
    }

    removeActionItem(index: number) {
        this.actionItems.removeAt(index);
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                while (this.discussions.length) this.discussions.removeAt(0);
                while (this.actionItems.length) this.actionItems.removeAt(0);

                data.discussions.forEach(() => this.addDiscussion());
                data.actionItems.forEach(() => this.addActionItem());

                this.minutesForm.patchValue(data);
                if (this.isViewMode) this.minutesForm.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.minutesForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.minutesForm.value).subscribe(() => this.onCancel());
            } else {
                this.service.create(this.minutesForm.value).subscribe(() => this.onCancel());
            }
        }
    }

    onCancel() {
        this.router.navigate(['/meeting-minutes']);
    }
}
