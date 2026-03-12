import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MeetingAgendaService } from '../../../../services/meeting-agenda.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-meeting-agenda-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './meeting-agenda-form.component.html',
    styleUrl: './meeting-agenda-form.component.css'
})
export class MeetingAgendaFormComponent implements OnInit {
    agendaForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    isLoading = false;
    formTitle = 'Meeting Notice / Agenda for MRM';
    formNumbers = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        meetingDetails: true,
        attendees: true,
        agendaItems: true
    };

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: MeetingAgendaService
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
                this.formTitle = this.isViewMode ? 'View Meeting Notice' : 'Edit Meeting Notice';
                this.loadRecord();
            } else {
                // Add initial empty rows
                this.addAttendee();
                this.addAgendaItem();
            }
        });
    }

    private initForm() {
        this.agendaForm = this.fb.group({
            formatNo: ['F-53', Validators.required],
            docNo: ['DMSPL / Level-04 / Format / F-53', Validators.required],
            issueNo: ['03', Validators.required],
            issueDate: ['2021-10-01', Validators.required],
            revNo: ['00', Validators.required],
            revDate: ['--', Validators.required],

            meetingDate: ['', Validators.required],
            meetingTime: ['', Validators.required],
            venue: ['', Validators.required],
            chairperson: ['', Validators.required],
            attendees: this.fb.array([]),
            agendaItems: this.fb.array([])
        });
    }

    get attendees(): FormArray {
        return this.agendaForm.get('attendees') as FormArray;
    }

    get agendaItems(): FormArray {
        return this.agendaForm.get('agendaItems') as FormArray;
    }

    addAttendee() {
        const attendeeGroup = this.fb.group({
            name: ['', Validators.required],
            designation: ['', Validators.required]
        });
        this.attendees.push(attendeeGroup);
    }

    removeAttendee(index: number) {
        this.attendees.removeAt(index);
    }

    addAgendaItem() {
        const itemGroup = this.fb.group({
            item: ['', Validators.required]
        });
        this.agendaItems.push(itemGroup);
    }

    removeAgendaItem(index: number) {
        this.agendaItems.removeAt(index);
    }

    private loadRecord() {
        this.isLoading = true;
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                // Clear arrays first
                while (this.attendees.length) this.attendees.removeAt(0);
                while (this.agendaItems.length) this.agendaItems.removeAt(0);

                // Add items from data
                data.attendees.forEach(() => this.addAttendee());
                data.agendaItems.forEach(() => this.addAgendaItem());

                this.agendaForm.patchValue(data);
                if (this.isViewMode) this.agendaForm.disable();
            }
            this.isLoading = false;
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.agendaForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.agendaForm.value).subscribe(() => this.onCancel());
            } else {
                this.service.create(this.agendaForm.value).subscribe(() => this.onCancel());
            }
        }
    }

    onCancel() {
        this.router.navigate(['/meeting-agenda']);
    }
}
