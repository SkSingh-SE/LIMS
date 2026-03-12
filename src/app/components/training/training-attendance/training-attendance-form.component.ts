import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TrainingAttendanceService } from '../../../services/training-attendance.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';

@Component({
    selector: 'app-training-attendance-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './training-attendance-form.component.html',
    providers: [DatePipe]
})
export class TrainingAttendanceFormComponent implements OnInit {
    attendanceForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    isLoading = signal(false);
    formTitle = 'Create Training Attendance Record';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        details: true,
        participants: true,
        approval: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    feedbacks = ['Good', 'Satisfactory', 'Not Good'];

    constructor(
        private fb: FormBuilder,
        private service: TrainingAttendanceService,
        private router: Router,
        private route: ActivatedRoute,
        private datePipe: DatePipe
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.route.url.subscribe(url => {
            const path = url[url.length - 2]?.path;
            if (path === 'details') {
                this.isViewMode = true;
                this.formTitle = 'View Training Attendance';
                this.attendanceForm.disable();
            } else if (path === 'edit') {
                this.isEditMode = true;
                this.formTitle = 'Edit Training Attendance';
            }
        });

        this.route.params.subscribe(params => {
            this.recordId = +params['id'];
            if (this.recordId) {
                this.loadData();
            }
        });
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.attendanceForm = this.fb.group({
            id: [0],
            formatNo: ['F-9', Validators.required],
            issueNo: ['03', Validators.required],
            revNo: ['00', Validators.required],
            date: [today, Validators.required],
            trainingProgramTitle: ['', Validators.required],
            trainingVenue: ['', Validators.required],
            facultyName: ['', Validators.required],
            dateTime: ['', Validators.required],
            participants: this.fb.array([]),
            preparedBy: ['General Manager'],
            issuedBy: ['Quality Manager'],
            reviewedApprovedBy: ['Managing Director'],
            remarks: ['']
        });

        // Add 5 default rows for participants
        for (let i = 0; i < 5; i++) {
            this.addParticipant();
        }
    }

    get participants(): FormArray {
        return this.attendanceForm.get('participants') as FormArray;
    }

    loadData(): void {
        this.isLoading.set(true);
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.participants.clear();
                    data.participants?.forEach(p => {
                        this.participants.push(this.fb.group({
                            slNo: [p.slNo],
                            participantName: [p.participantName, Validators.required],
                            feedback: [p.feedback, Validators.required]
                        }));
                    });

                    const formValues = { ...data };
                    formValues.date = new Date().toISOString().split('T')[0];

                    if (this.isEditMode) {
                        const currentRev = parseInt(data.revNo || '0');
                        formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
                    }

                    this.attendanceForm.patchValue(formValues);
                }
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    addParticipant(): void {
        const slNo = this.participants.length + 1;
        this.participants.push(this.fb.group({
            slNo: [slNo],
            participantName: ['', Validators.required],
            feedback: ['Satisfactory', Validators.required]
        }));
    }

    removeParticipant(index: number): void {
        if (this.participants.length > 1) {
            this.participants.removeAt(index);
            // Re-index
            this.participants.controls.forEach((ctrl, i) => {
                ctrl.get('slNo')?.setValue(i + 1);
            });
        }
    }

    onSubmit(): void {
        if (this.attendanceForm.invalid) {
            this.attendanceForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);
        const formData = this.attendanceForm.getRawValue();

        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => this.router.navigate(['/training-attendance']),
                error: () => this.isLoading.set(false)
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => this.router.navigate(['/training-attendance']),
                error: () => this.isLoading.set(false)
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/training-attendance']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
}
