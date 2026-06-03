import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
    feedbacks = ['Good', 'Satisfactory', 'Not Good'];
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
        private unsavedChangesService: UnsavedChangesService) { }

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
            trainingPlanId: ['',Validators.required],
            trainingTopic: [null]
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
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.participants.clear();
                    data.participants?.forEach(p => {
                        this.participants.push(this.fb.group({
                            slNo: [p.slNo],
                            participantName: [p.participantName, Validators.required],
                            feedback: [p.feedback, Validators.required],
                            uploadReferenceID: [p.uploadReferenceID || 0],
                            filePath: [p.filePath || ''],
                            fileName: [p.fileName || ''],
                            signaturePreview: [p.filePath ? this.baseUrl + p.filePath : '']
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
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }





    // addParticipant(): void {
    //     const slNo = this.participants.length + 1;
    //     this.participants.push(this.fb.group({
    //         slNo: [slNo],
    //         participantName: ['', Validators.required],
    //         feedback: ['Satisfactory', Validators.required],
    //         signature: ['']
    //     }));
    // }

    // removeParticipant(index: number): void {
    //     if (this.participants.length > 1) {
    //         this.participants.removeAt(index);
    //         // Re-index
    //         this.participants.controls.forEach((ctrl, i) => {
    //             ctrl.get('slNo')?.setValue(i + 1);
    //         });
    //     }
    // }


    addParticipant(): void {

        const slNo = this.participants.length + 1;

        this.participants.push(this.fb.group({
            slNo: [slNo],
            participantName: ['', Validators.required],
            feedback: ['Satisfactory', Validators.required],
            signature: [''],
            signatureFile: [null],
            signaturePreview: [''],
            uploadReferenceID: [0],
            filePath: [''],
            fileName: ['']
        }));

    }

    // removeParticipant(index: number): void {

    //     if (this.participants.length > 1) {

    //         // remove form row
    //         this.participants.removeAt(index);

    //         // remove preview image
    //         this.signaturePreviews.splice(index, 1);

    //         // re-index
    //         this.participants.controls.forEach((ctrl, i) => {
    //             ctrl.get('slNo')?.setValue(i + 1);
    //         });
    //     }
    // }
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
                participantName: p.participantName,
                feedback: p.feedback,
                // Sirf IDs/Paths bhejein jo upload se mile hain
                uploadReferenceID: p.uploadReferenceID,
                filePath: p.filePath,
                fileName: p.fileName
                // signaturePreview yahan include NA karein taaki payload chota rahe
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

    getTraningPlan = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Mock implementation - replace with actual service call
        return this.service.getTrainingPlanDropdown(term, page, pageSize);
    };

    onTraningPlanSelect(item: any): void {
        this.attendanceForm.patchValue({ Id: item?.id || 0 });
        this.attendanceForm.patchValue({ trainingProgramTitle: item?.name || '' });
        this.attendanceForm.get('trainingPlanId')?.setValue(item?.id || '');
        this.attendanceForm.get('trainingTopic')?.setValue(item?.name || '');
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
