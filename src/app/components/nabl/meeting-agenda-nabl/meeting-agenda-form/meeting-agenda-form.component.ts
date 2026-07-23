import { Component, OnInit, HostListener } from '@angular/core';
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
import { dateRangeValidator } from '../../../../utility/validators/custom-validators';
import { ToastService } from '../../../../services/toast.service';
import { errors } from '@playwright/test';
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
        participants: true,
        agendaItems: true
    };
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: MeetingAgendaService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private toastService: ToastService,
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('MeetingAgenda').subscribe({
            next: (defaults) => {
                this.agendaForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
    }
    meetingTypes = [
        'Quarterly',
        'Half Yearly',
        'Annual',
        'Special',
        'Emergency'
    ]
    attendances = [
        'Mandatory',
        'Required',
        'Optional',
        'Observer',
        'Invite if Available'
    ]

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
            } else if (id == null && mode == 'create') {
                // Add initial empty rows
                this.addAttendee();
                this.addAgendaItem();
                this.service.getNextMeetingNo().subscribe({
                    next: (res) => {
                        this.agendaForm.patchValue({
                            meetingNo: res.meetingNo,
                        })
                    },
                    error: () => { }
                });
            }
            else {
                // Add initial empty rows
                this.addAttendee();
                this.addAgendaItem();
            }
        });
    }

    private initForm() {
        this.agendaForm = this.fb.group({

            formatNo: ['F-53'],
            docNo: ['F-53'],
            issueNo: ['03'],
            issueDate: [null],
            date: [this.today, Validators.required],
            revNo: ['00'],
            revDate: [null],

            meetingDate: [this.today, Validators.required],
            meetingNo: ['', Validators.required],
            meetingTime: ['', Validators.required],
            meetingVenue: ['', Validators.required],
            chairpersonName: ['', Validators.required],
            participants: this.fb.array([]),
            agendaItems: this.fb.array([]),
            meetingType: ['', Validators.required],
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.agendaForm.get('docNo')?.disable();
        this.agendaForm.get('issueNo')?.disable();
        this.agendaForm.get('revNo')?.disable();
        this.agendaForm.get('formatNo')?.disable();
        this.agendaForm.get('date')?.disable();
        this.agendaForm.get('meetingNo')?.disable();
    }

    get participants(): FormArray {
        return this.agendaForm.get('participants') as FormArray;
    }

    get agendaItems(): FormArray {
        return this.agendaForm.get('agendaItems') as FormArray;
    }

    addAttendee() {
        const attendeeGroup = this.fb.group({
            name: ['', Validators.required],
            designation: ['', Validators.required],
            department: ['', Validators.required],
            attendance: ['Mandatory', Validators.required],
        });
        this.participants.push(attendeeGroup);
    }

    removeAttendee(index: number) {
        if (this.participants.length > 1) {
            this.participants.removeAt(index);
        }
    }

    addAgendaItem() {
        const itemGroup = this.fb.group({
            agendaItem: ['', Validators.required],
            presenter: ['', Validators.required],
            remarks: ['']
        });
        this.agendaItems.push(itemGroup);
    }

    removeAgendaItem(index: number): void {
        if (this.agendaItems.length > 1) {
            this.agendaItems.removeAt(index);
        }
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                // Clear arrays first
                while (this.participants.length) this.participants.removeAt(0);
                while (this.agendaItems.length) this.agendaItems.removeAt(0);

                // Add items from data
                data.participants.forEach(() => this.addAttendee());
                data.agendaItems.forEach(() => this.addAgendaItem());

                this.agendaForm.patchValue(data);
                this.agendaForm.patchValue({
                    date: NablFormsHelper.formatDateForInput(data.date),
                    meetingDate: NablFormsHelper.formatDateForInput(data.meetingDate),

                })
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

    onSubmit(): void {
        if (this.agendaForm.invalid) {
            this.agendaForm.markAllAsTouched();
            return;
        }

        const formData = this.agendaForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;


        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/meeting-agenda']);
                    this.toastService.show('meeting agenda updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/meeting-agenda']);
                    this.toastService.show('meeting agenda created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
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
