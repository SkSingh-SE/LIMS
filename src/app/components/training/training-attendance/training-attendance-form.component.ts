import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormGroupName, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TrainingAttendanceService } from '../../../services/training-attendance.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { NablSignatureSectionComponent } from '../../nabl/nabl-signature-section/nabl-signature-section.component';
import { environment } from '../../../../environments/environment';
import { EmployeeCompetenceService } from '../../../services/employee-competence.service';

@Component({
    selector: 'app-training-attendance-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, SearchableDropdownComponent, NablSignatureSectionComponent],
    templateUrl: './training-attendance-form.component.html',
    styleUrl: './training-attendance-form.component.css',
    providers: [DatePipe]
})
export class TrainingAttendanceFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    attendanceForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Create Training Attendance Record';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    baseUrl = environment.baseUrl;
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
    signatureFile: File | null = null;
    attendanceStatuses = ['Present', 'Absent'];
    typesofParticipants = ['Internal', 'External'];
    fileErrors: { [key: string]: string | null } = {
        organizationLogo: null,
        nablCertificate: null,
        nablLogo: null,
        signature: null
    };
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: TrainingAttendanceService,
        private router: Router,
        private route: ActivatedRoute,
        private datePipe: DatePipe,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private competenceService: EmployeeCompetenceService,
    ) { }

    ngOnInit(): void {
        const state = history.state as {
            trainingPlanId?: number;
            mode: string;
        };

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
            if (path != "details" && path != 'edit') {
                this.addParticipant();
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
            trainingProgramTitle: [''],
            venueMode: ['', Validators.required],
            trainerName: ['', Validators.required],
            trainingDatetime: ['', Validators.required],
            participants: this.fb.array([]),
            preparedBy: [],
            issuedBy: ['Quality Manager'],
            reviewedApprovedBy: ['Managing Director'],
            genearalRemarks: [''],
            approvedBy: [null],
            reviewedBy: [null],
            approvedDate: [''],
            reviewedDate: [''],
            preparedDate: [this.today],
            trainingPlanId: ['', Validators.required],
            trainingTopic: [null],
            planningYear: [''], // Agar required validation chahiye to rakh sakte hain
            month: [''],
            planDate: [''],
            audience: [''],
            providerAgencyName: [''],
            agency: [''],
            evaluationRequired: [""],
            participant: ["Internal"],
            questionSet: [''],
            questionSetId: ['']
        });

        // Add 5 default rows for participants
        // for (let i = 0; i < 5; i++) {
        //     this.addParticipant();
        // }
        this.attendanceForm.get('planningYear')?.disable();
        this.attendanceForm.get('month')?.disable();
        this.attendanceForm.get('audience')?.disable();
        this.attendanceForm.get('providerAgencyName')?.disable();
        this.attendanceForm.get('agency')?.disable();
        this.attendanceForm.get('evaluationRequired')?.disable();
        this.attendanceForm.get('questionSet')?.disable();
        this.attendanceForm.get('planDate')?.disable();
    }

    get participants(): FormArray {
        return this.attendanceForm.get('participants') as FormArray;
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {

                    const item = {
                        id: data.trainingPlanId,  // mapped to item.id
                        name: data.trainingTopic   // mapped to item.name
                    };
                    this.onTraningPlanSelect(item);

                    this.participants.clear();
                    data.participants?.forEach(p => {
                        this.participants.push(this.fb.group({
                            slNo: [p.slNo],
                            participantName: [p.participantName],
                            typesofParticipant: [p.typesofParticipant, Validators.required],
                            participantId: [p.participantId],
                            designation: [p.designation, Validators.required],
                            status: [p.status, Validators.required],
                            evaluation: [p.evaluation],
                            evaluationId: [p.evaluationId],
                            feedback: [p.feedback],
                            uploadReferenceID: [p.uploadReferenceID || 0],
                            filePath: [p.filePath || null],
                            fileName: [p.fileName || null],
                            signaturePreview: [p.filePath ? this.baseUrl + p.filePath : null]
                        }));
                    });

                    const formValues = { ...data };
                    formValues.date = NablFormsHelper.formatDateForInput(data.date)
                    formValues.planDate = NablFormsHelper.formatDateForInput(data.planDate)

                    if (this.isEditMode) {
                        const currentRev = parseInt(data.revNo || '0');
                        formValues.revNo = (currentRev + 1).toString().padStart(2, '0');
                    }
                    if (this.isViewMode) {
                        this.attendanceForm.disable();
                    }

                    this.attendanceForm.patchValue(formValues);
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }



    addParticipant(): void {

        const slNo = this.participants.length + 1;

        this.participants.push(this.fb.group({
            slNo: [slNo],
            typesofParticipant: ['Internal'],
            participantName: [''],
            participantId: [''],
            designation: ['', Validators.required],
            feedback: [''],
            status: ['Present'],
            signature: [''],
            signatureFile: [null],
            signaturePreview: [''],
            evaluation: [''],
            uploadReferenceID: [0],
            filePath: [''],
            fileName: [''],
            evaluationId: [null],
        }));

    }

    private isDelete = false;
    removeParticipant(control: any, event?: Event): void {
        if (event) {
            event?.preventDefault();
            event?.stopPropagation();
        }
        if (this.isDelete) return;
        const index = this.participants.controls.indexOf(control);

        if (index !== -1 && this.participants.length > 1) {
            this.isDelete = true;
            this.participants.removeAt(index);


            this.participants.controls.forEach((ctrl, i) => {
                ctrl.get('slNo')?.patchValue(i + 1, { emitEvent: false });
            });
            setTimeout(() => {
                this.isDelete = false;
            }, 100);
            // this.participants.controls.forEach((ctrl, i) => {
            //     ctrl.get('slNo')?.setValue(i + 1);
            // });
        }
    }

    trackByIndex(index: number, item: any) {
        return item;
    }
    onSignatureChange(event: Event, index: number): void {

        const input = event.target as HTMLInputElement;

        if (input.files && input.files[0]) {

            const file = input.files[0];

            const reader = new FileReader();



            this.service.uploadNABLFile(file).subscribe({
                next: (res) => {
                    // this.participants.at(index).get('signature')?.setValue(res.url);
                    this.participants.at(index).get('uploadReferenceID')?.setValue(res.id);
                    this.participants.at(index).get('filePath')?.setValue(res.filePath);
                    this.participants.at(index).get('fileName')?.setValue(res.originalFileName);
                    // this.participants.at(index).get('signaturePreview')?.setValue(`data:image/*;base64,${res.filePath}`);

                },
                error: (err) => {
                    this.toastService.show(err?.error?.message || 'Failed to upload signature', 'error');
                }

            });
            reader.onload = () => {

                this.participants.at(index).get('signaturePreview')?.setValue(reader.result as string);

            };

            reader.readAsDataURL(file);
        }
    }

    isEvaluationRequired(): boolean {
        return this.attendanceForm.get('evaluationRequired')?.value === true;
    }
    isParticipantEvaluationAllowed(index: number): boolean {

        const participantType =
            this.participants.at(index)
                .get('typesofParticipant')
                ?.value;

        return (
            this.isEvaluationRequired() &&
            participantType === 'Internal'
        );
    }

    isParticipantPresent(index: number): boolean {
        return this.participants
            .at(index)
            .get('status')
            ?.value === 'Present';
    }
    isAttendanceSaved(): boolean {
        const id = this.attendanceForm.get('id')?.value;

        return !!id && Number(id) > 0;
    }

    hasEvaluation(index: number): boolean {

        const evaluationId =
            this.participants.at(index).get('evaluationId')?.value;

        return !!evaluationId;
    }

    openEvaluation(index: number): void {

        const participant = this.participants.at(index);

        const attendanceId =
            this.attendanceForm.get('id')?.value;

        const trainingPlanId =
            this.attendanceForm.get('trainingPlanId')?.value;

        const questionSetId =
            this.attendanceForm.get('questionSetId')?.value;

        const evaluationRequired =
            this.attendanceForm.get('evaluationRequired')?.value;

        const participantName =
            participant.get('participantName')?.value;

        const designation =
            participant.get('designation')?.value;

        // IMPORTANT:
        // Evaluation / Effectiveness record ID
        const evaluationId =
            participant.get('evaluationId')?.value;
        const status =
            participant.get('status')?.value;
        const participantType =
            participant.get('typesofParticipant')?.value;


        // -----------------------------------------
        // 1. Evaluation not required
        // -----------------------------------------

        if (!evaluationRequired) {

            this.toastService.show(
                'Evaluation is not required for this training plan.',
                'warning'
            );

            return;
        }
        // -----------------------------------------
        // 2. External participant
        // -----------------------------------------

        if (participantType !== 'Internal') {

            this.toastService.show(
                'Evaluation is available only for Internal participants.',
                'warning'
            );

            return;
        }

        // -----------------------------------------
        // 3. Participant must be Present
        // -----------------------------------------

        if (!this.isParticipantPresent(index)) {

            this.toastService.show(
                'Evaluation is available only for Present participants.',
                'warning'
            );

            return;
        }


        // -----------------------------------------
        // 4. Attendance must be saved first
        // -----------------------------------------

        if (!attendanceId) {

            this.toastService.show(
                'Please save Training Attendance first.',
                'warning'
            );

            return;
        }


        // -----------------------------------------
        // 5. Question Set must exist
        // -----------------------------------------

        if (!questionSetId) {

            this.toastService.show(
                'Question Set is not available for this training plan.',
                'warning'
            );

            return;
        }


        // -----------------------------------------
        // 6. Participant Name Required
        // -----------------------------------------

        if (!participantName || !participantName.toString().trim()) {

            participant.get('participantName')?.markAsTouched();

            this.toastService.show(
                'Please enter participant name before starting evaluation.',
                'warning'
            );

            return;
        }


        // -----------------------------------------
        // 7. Designation Required
        // -----------------------------------------

        if (!designation || !designation.toString().trim()) {

            participant.get('designation')?.markAsTouched();

            this.toastService.show(
                'Please enter participant designation before starting evaluation.',
                'warning'
            );

            return;
        }


        // -----------------------------------------
        // 8. Existing Evaluation
        // -----------------------------------------

        if (evaluationId) {

            this.router.navigate(
                ['/training-effectiveness/details', evaluationId],

            );

            return;
        }


        // -----------------------------------------
        // 9. New Evaluation
        // -----------------------------------------

        this.router.navigate(
            ['/training-effectiveness/create'],
            {
                queryParams: {
                    attendanceId: attendanceId,
                    trainingPlanId: trainingPlanId,
                    questionSetId: questionSetId,
                    participantName: participantName,
                    designation: designation,
                    status: status,
                }
            }
        );
    }

    onSubmit(): void {
        if (this.attendanceForm.invalid) {
            this.attendanceForm.markAllAsTouched();
            return;
        }

        const formData = this.attendanceForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedDate || null;
        formData.reviewedDate = formData.reviewedDate || null;
        formData.participants = formData.participants.map((p: any) => {
            return {
                slNo: p.slNo,
                typesofParticipant: p.typesofParticipant,
                participantId: p.participantId,
                participantName: p.participantName,
                designation: p.designation,

                feedback: p.feedback,
                status: p.status,

                // Evaluation / Effectiveness ID
                evaluationId: p.evaluationId || null,

                // Sirf IDs/Paths bhejein jo upload se mile hain
                uploadReferenceID: p.uploadReferenceID,
                filePath: p.filePath,
                fileName: p.fileName

                // signaturePreview intentionally payload me nahi bhejna
            };
        });
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: (res) => {
                    this.saved = true;
                    this.toastService.show('Training Attendance Record updated successfully', 'success');
                    this.router.navigate(['/training-attendance']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: (res) => {
                    this.saved = true;
                    this.toastService.show('Training Attendance Record created successfully', 'success');
                    this.router.navigate(['/training-attendance']);
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    applyParticipantTypeToAll(): void {

        const participantType =
            this.attendanceForm.get('participant')?.value;

        if (!participantType) {

            this.toastService.show(
                'Please select Types of Participant first.',
                'warning'
            );

            return;
        }

        this.participants.controls.forEach((participant) => {

            participant.get('typesofParticipant')
                ?.setValue(participantType);

            // External ke case mein employee related data clear
            if (participantType === 'External') {

                participant.get('participantId')
                    ?.setValue(null);
                participant.get('participantName')
                    ?.setValue(null);

                participant.get('designation')
                    ?.setValue('');

            }

        });

        this.toastService.show(
            `${participantType} participant type applied to all participants.`,
            'success'
        );
    }
    clearSignature(index: number): void {

        // this.signaturePreviews[index] = '';
        this.participants.at(index).get('signature')?.setValue('');
        this.participants.at(index).get('signaturePreview')?.setValue('');
        const fileInput = document.getElementById(`signatureInput${index}`) as HTMLInputElement;
        if (fileInput) fileInput.value = '';

    }
    onCancel(): void {
        this.router.navigate(['/training-attendance']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }
    getEmployees = (
        term: string,
        page: number,
        pageSize: number
    ): Observable<any[]> => {

        return this.service
            .getEmployeesForCompetenceReportDropdown(
                term,
                page,
                pageSize,
                this.isEditMode ? this.recordId : null,
                this.attendanceForm.get('trainingPlanId')?.value
            );
    }

    onEmployeeSelected(item: any, index: number) {
        const row = this.participants.at(index) as FormGroup;

        if (!item) {
            row.patchValue({
                participantId: null,
                participantName: '',
                designation: ''
            });
            return;
        }

        // Check duplicate employee in current attendance
        const alreadySelected = this.participants.controls.some((control, i) => {
            if (i === index) {
                return false;
            }

            const participantId = control.get('participantId')?.value;

            return participantId != null &&
                Number(participantId) === Number(item.id);
        });

        if (alreadySelected) {
            row.patchValue({
                participantId: null,
                participantName: '',
                designation: ''
            });

            this.toastService.show(
                'This employee is already selected in this Training Attendance.',
                'warning'
            );

            return;
        }

        // Existing logic
        row.patchValue({
            participantId: item.id,
            participantName: item.name
        });

        this.competenceService.getEmployeesDesignation(item.id).subscribe({
            next: (data) => {
                row.patchValue({
                    designation: data
                });
            },
            error: () => {
                row.patchValue({
                    designation: ''
                });
            }
        });
    }

    onChangeParticipant(index: number) {
        const row = this.participants.at(index) as FormGroup;
        row.patchValue({
            participantId: null,
            participantName: "",
            designation: '',
        })
    }
    getTraningPlan = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Mock implementation - replace with actual service call
        return this.service.getTrainingPlanDropdown(term, page, pageSize, this.recordId > 0 ? this.recordId : null);
    }

    onTraningPlanSelect(item: any): void {
        this.attendanceForm.patchValue({ trainingPlanId: item?.id || 0, trainingTopic: item?.name });
        this.attendanceForm.patchValue({ trainingProgramTitle: item?.name || '' });
        this.attendanceForm.get('trainingPlanId')?.setValue(item?.id || '');
        this.attendanceForm.get('trainingTopic')?.setValue(item?.name || '');
        const planId = item.id;
        this.service.getTrainingPlanDetails(planId).subscribe({
            next: (data: any) => {
                this.attendanceForm.patchValue({
                    planningYear: data.planningYear,
                    month: data.month,
                    audience: data.audience,
                    providerAgencyName: data.providerAgencyName,
                    agency: data.agency,
                    evaluationRequired: data.evaluationRequired,
                    questionSet: data.questionSet,
                    planDate: NablFormsHelper.formatDateForInput(data.planDate),
                    questionSetId: data.questionSetId
                });
            },
        })
    }
    canDeactivate(): Observable<boolean> | boolean {
        if (!this.attendanceForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.attendanceForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
