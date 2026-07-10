import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { MeetingMinutesService } from '../../../../services/meeting-minutes.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-meeting-minutes-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QuillModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './meeting-minutes-form.component.html',
    styleUrl: './meeting-minutes-form.component.css'
})
export class MeetingMinutesFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    minutesForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number = 0;
    formTitle = 'Minutes of Management Review Meeting';
    formNumbers = NablFormsHelper.getFormNumbers();
    meetingList: any[] = [];
    openSections: { [key: string]: boolean } = {
        header: true,
        meetingInfo: true,
        actionItems: true,
        agendaItems: true,
        conclusion: true,
        participants: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
        ]
    };
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private service: MeetingMinutesService
        , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private toastService: ToastService
    ) {
        this.initForm();
        this.nablHeaderService.getFormDefaults('MeetingMinutes').subscribe({
            next: (defaults) => {
                this.minutesForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
    }
    prioritys = [
        'High',
        'Medium',
        'Low'
    ]
    statuses = [
        'Open',
        'In Progress',
        'Completed',
        'On Hold',
        'Cancelled'
    ]

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            const mode = this.route.snapshot.url[1]?.path;
            this.loadMeetingList();
            if (id && id !== 'create') {
                this.recordId = +id;
                this.isEditMode = mode === 'edit';
                this.isViewMode = mode === 'details';
                this.formTitle = this.isViewMode ? 'View Meeting Minutes' : 'Edit Meeting Minutes';
                this.loadRecord();
            } else {
                // this.addDiscussion();
                this.addActionItem();
            }
        });
    }

    private initForm() {
        this.minutesForm = this.fb.group({
            formatNo: ['F-54'],
            docNo: ['F-54'],
            issueNo: ['03'],
            issueDate: [null],
            date: [this.today, Validators.required],
            overallConclusion: ['', Validators.required],
            revNo: ['00'],
            revDate: [null],

            meetingDate: [''],
            meetingNo: ['', Validators.required],
            meetingId: [null],
            meetingTime: [''],
            meetingVenue: [''],
            chairpersonName: [''],
            meetingType: [''],
            reviewPeriod: [''],
            participantItems: this.fb.array([]),
            agendalist: this.fb.array([]),
            actionItems: this.fb.array([]),
            preparedBy: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });

        // System-managed fields — always readonly
        this.minutesForm.get('docNo')?.disable();
        this.minutesForm.get('issueNo')?.disable();
        this.minutesForm.get('revNo')?.disable();
        this.minutesForm.get('formatNo')?.disable();
        this.minutesForm.get('date')?.disable();
    }

    get participantItems(): FormArray {
        return this.minutesForm.get('participantItems') as FormArray;
    }

    get agendalist(): FormArray {
        return this.minutesForm.get('agendalist') as FormArray;
    }


    get actionItems(): FormArray {
        return this.minutesForm.get('actionItems') as FormArray;
    }


    loadMeetingList(): void {
        this.service.getLoadMeetingList().subscribe({
            next: (data) => {
                this.meetingList = data;
            },
            error: () => {
                this.meetingList = [];
            }
        })
    }

    onChangeMeetingNo(event: any): void {
        const meetingNo = event.target.value;
        this.service.meetingDetails(meetingNo).subscribe({
            next: (data) => {
                this.minutesForm.patchValue({
                    meetingDate: NablFormsHelper.formatDateForInput(data.meetingDate),
                    meetingNo: data.meetingNo,
                    meetingTime: data.meetingTime,
                    meetingVenue: data.meetingVenue,
                    chairpersonName: data.chairpersonName,
                    meetingType: data.meetingType,
                    meetingId: data.meetingId
                });
                this.participantItems.clear();
                this.agendalist.clear();

                data.participantItems.forEach((x: any) => {
                    this.participantItems.push(
                        this.fb.group({
                            name: [x.name],
                            designation: [x.designation],
                            department: [x.department]

                        })
                    );
                });
                data.agendalist.forEach((x: any) => {
                    this.agendalist.push(
                        this.fb.group({
                            agendaItem: [x.agendaItem],
                            discussion: ['', Validators.required],
                            decisiontaken: ['', Validators.required]
                        })
                    )
                })

            }
        })

    }
    addActionItem() {
        const group = this.fb.group({
            action: ['', Validators.required],
            responsibility: ['', Validators.required],
            targetDate: ['', Validators.required],
            priority: ['Low', Validators.required],
            status: ['Open', Validators.required]
        });
        this.actionItems.push(group);
    }

    removeActionItem(index: number) {
        if (this.actionItems.length > 1) {
            this.actionItems.removeAt(index);
        }
    }

    private loadRecord() {
        this.service.getById(this.recordId).subscribe(data => {
            if (data) {
                
                this.minutesForm.patchValue(data);
                this.agendalist.clear();
                data.agendaList.forEach((item: any) => {
                    this.agendalist.push(
                        this.fb.group({
                            agendaItem: [item.agendaItem],
                            discussion: [item.discussion],
                            decisiontaken: [item.decisiontaken]
                        })
                    );
                });
                this.participantItems.clear();
                data.participantItems.forEach((item: any) => {
                    this.participantItems.push(
                        this.fb.group({
                            name: [item.name],
                            designation: [item.designation],
                            department: [item.department]
                        })
                    );
                })
                this.actionItems.clear();

                data.actionItems.forEach((item: any) => {
                    this.actionItems.push(
                        this.fb.group({
                            action: [item.action],
                            responsibility: [item.responsibility],
                            targetDate: [
                                NablFormsHelper.formatDateForInput(item.targetDate)
                            ],
                            priority: [item.priority],
                            status: [item.status]
                        })
                    );
                });
                // data.actionItems.forEach(() => this.addActionItem());

                this.minutesForm.patchValue({
                    meetingDate: NablFormsHelper.formatDateForInput(data.meetingDate),
                    date: NablFormsHelper.formatDateForInput(data.date),

                })
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.minutesForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.minutesForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.minutesForm.get('docNo')?.disable();
                this.minutesForm.get('issueNo')?.disable();
                this.minutesForm.get('revNo')?.disable();
                this.minutesForm.get('formatNo')?.disable();
            }
        });
    }

    toggleSection(section: string) {
        this.openSections[section] = !this.openSections[section];
    }

    onSubmit(): void {
        if (this.minutesForm.invalid) {
            this.minutesForm.markAllAsTouched();
            return;
        }

        const formData = this.minutesForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;


        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/meeting minutes']);
                    this.toastService.show('meeting minutes updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/meeting-minutes']);
                    this.toastService.show('meeting minutes created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel() {
        this.router.navigate(['/meeting-minutes']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.minutesForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.minutesForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
