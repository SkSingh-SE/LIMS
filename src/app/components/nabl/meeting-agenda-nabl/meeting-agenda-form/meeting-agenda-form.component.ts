import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MeetingAgendaService } from '../../../../services/meeting-agenda.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-meeting-agenda-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './meeting-agenda-form.component.html',
    styleUrl: './meeting-agenda-form.component.css'
})
export class MeetingAgendaFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    agendaForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
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
    , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('MeetingAgenda').subscribe({
            next: (defaults) => {
                this.agendaForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });
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
            formatNo: ['F-53'],
            docNo: [''],
            issueNo: ['03'],
            issueDate: ['', Validators.required],
            revNo: ['00'],
            revDate: ['--', Validators.required],

            meetingDate: ['', Validators.required],
            meetingTime: ['', Validators.required],
            venue: ['', Validators.required],
            chairperson: ['', Validators.required],
            attendees: this.fb.array([]),
            agendaItems: this.fb.array([]),
            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: ['']
        });

        // System-managed fields — always readonly
        this.agendaForm.get('docNo')?.disable();
        this.agendaForm.get('issueNo')?.disable();
        this.agendaForm.get('revNo')?.disable();
        this.agendaForm.get('formatNo')?.disable();
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
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                // Clear arrays first
                while (this.attendees.length) this.attendees.removeAt(0);
                while (this.agendaItems.length) this.agendaItems.removeAt(0);

                // Add items from data
                data.attendees.forEach(() => this.addAttendee());
                data.agendaItems.forEach(() => this.addAgendaItem());

                this.agendaForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.agendaForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.agendaForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.agendaForm.get('docNo')?.disable();
                this.agendaForm.get('issueNo')?.disable();
                this.agendaForm.get('revNo')?.disable();
                this.agendaForm.get('formatNo')?.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit() {
        if (this.agendaForm.valid) {
            if (this.isEditMode) {
                this.service.update(this.recordId, this.agendaForm.getRawValue()).subscribe(() => { this.saved = true; this.onCancel(); });
            } else {
                this.service.create(this.agendaForm.getRawValue()).subscribe(() => { this.saved = true; this.onCancel(); });
            }
        }
    }

    onCancel() {
        this.router.navigate(['/meeting-agenda']);
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.agendaForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.agendaForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
