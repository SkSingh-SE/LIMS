import { Component, OnInit, signal , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SampleInwardRegisterNablService } from '../../../../services/sample-inward-register-nabl.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { ToastService } from '../../../../services/toast.service';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-sample-inward-register-nabl-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, NablSignatureSectionComponent],
    templateUrl: './sample-inward-register-form.component.html'
})
export class SampleInwardRegisterNablFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
    requestForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Sample Inward Register (F-31)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        header: true,
        entries: true,
        signatures: true
    };

    constructor(
        private fb: FormBuilder,
        private service: SampleInwardRegisterNablService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('SampleInwardRegister').subscribe({
            next: (defaults) => {
                this.requestForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });
        this.recordId = Number(this.route.snapshot.params['id']);

        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Sample Inward Register';
            this.requestForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Sample Inward Register';
        }

        if (this.recordId) {
            this.loadData();
        } else {
            this.addEntry();
        }
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.requestForm = this.fb.group({
            id: [0],
            formatNo: ['F-31'],
            issueNo: ['03'],
            revNo: ['00'],
            date: [today, Validators.required],
            documentNo: [''],

            entries: this.fb.array([]),

            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: [''],
            status: ['Active']
        });

        // System-managed fields — always readonly
        this.requestForm.get('documentNo')?.disable();
        this.requestForm.get('issueNo')?.disable();
        this.requestForm.get('revNo')?.disable();
        this.requestForm.get('formatNo')?.disable();
    }

    get entries(): FormArray {
        return this.requestForm.get('entries') as FormArray;
    }

    addEntry(): void {
        const today = new Date().toISOString().split('T')[0];
        const group = this.fb.group({
            srNo: [this.entries.length + 1],
            receiptDate: [today, Validators.required],
            sampleDescription: ['', Validators.required],
            quantity: ['', Validators.required],
            customerName: ['', Validators.required],
            testRequestRef: ['', Validators.required],
            targetCompletionDate: ['', Validators.required],
            remarks: ['']
        });
        this.entries.push(group);
    }

    removeEntry(index: number): void {
        if (this.entries.length > 1) {
            this.entries.removeAt(index);
            // Re-index
            this.entries.controls.forEach((ctrl, idx) => {
                ctrl.get('srNo')?.setValue(idx + 1);
            });
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    if (data.entries) {
                        this.entries.clear();
                        data.entries.forEach(() => this.addEntry());
                    }
                    this.requestForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.requestForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.requestForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.requestForm.get('documentNo')?.disable();
                this.requestForm.get('issueNo')?.disable();
                this.requestForm.get('revNo')?.disable();
                this.requestForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => {
                this.toastService.show(error?.error?.message || 'Operation failed', 'error');
            }
        });
    }

    onSubmit(): void {
        if (this.requestForm.invalid) {
            this.requestForm.markAllAsTouched();
            return;
        }

        const formData = this.requestForm.getRawValue();

        const obs = this.isEditMode
            ? this.service.update(this.recordId, formData)
            : this.service.create(formData);

        obs.subscribe({
            next: (res) => {
              this.saved = true;
                this.toastService.show(res.message, 'success');
                this.router.navigate(['/nabl/sample-inward-register']);
            },
            error: (err) => {
                this.toastService.show(err.message || 'Operation failed', 'error');
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/nabl/sample-inward-register']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.requestForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.requestForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
