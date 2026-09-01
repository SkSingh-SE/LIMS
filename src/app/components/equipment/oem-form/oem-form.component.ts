import { CommonModule } from '@angular/common';
import { Component, OnInit , HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import { OEMService } from '../../../services/oem.service';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
  selector: 'app-oem-form',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NumberOnlyDirective, RouterLink],
  templateUrl: './oem-form.component.html',
  styleUrl: './oem-form.component.css'
})
export class OEMFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  isSubmitting = false;
  OEMForm!: FormGroup
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  equipmentId: number = 0;

  constructor(private fb: FormBuilder, private toastService: ToastService, private oemService: OEMService,
    private route: ActivatedRoute, private router: Router,
   private unsavedChangesService: UnsavedChangesService) {
  }
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.equipmentId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };

    if (state) {
      if (state.mode === 'view') {
        this.isViewMode = true;
      }
      if (state.mode === 'edit') {
        this.isEditMode = true;
      }
    }
    this.initForm();
    this.toggleBlacklistingReason();
    if (this.equipmentId > 0) {
      this.loadequipment(this.equipmentId);
    }
  }
  initForm() {
    this.OEMForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      contactPerson1: ['', Validators.maxLength(100)],
      contactNo1: ['', [Validators.maxLength(100), Validators.pattern(/^[0-9+ -]{7,20}$/)]],
      emailId1: ['', [Validators.maxLength(100), Validators.email]],
      contactPerson2: ['', Validators.maxLength(100)],
      contactNo2: ['', [Validators.maxLength(100), Validators.pattern(/^[0-9+ -]{7,20}$/)]],
      emailId2: ['', [Validators.maxLength(100), Validators.email]],
      contactPerson3: ['', Validators.maxLength(100)],
      contactNo3: ['', [Validators.maxLength(100), Validators.pattern(/^[0-9+ -]{7,20}$/)]],
      emailId3: ['', [Validators.maxLength(100), Validators.email]],
      address: ['', Validators.maxLength(100)],
      uploadReferenceID: [null],
      agreementFilePath: [''],
      fileName: [''],
      supplierApproved: [false],
      isBlacklisted: [false],
      reasonForBlacklisting: ['', Validators.maxLength(255)],
      file: [null]
    });
  }
  toggleBlacklistingReason() {
    this.OEMForm.get('isBlacklisted')?.valueChanges.subscribe(isBlacklisted => {
      const reasonControl = this.OEMForm.get('reasonForBlacklisting');
      if (isBlacklisted) {
        reasonControl?.setValidators([Validators.required, Validators.maxLength(255)]);
      } else {
        reasonControl?.clearValidators();
        reasonControl?.setValue('');
      }
      reasonControl?.updateValueAndValidity();
    });
  }

  loadequipment(id: number) {
    this.oemService.getOEMById(id).subscribe({
      next: (response) => {
        this.OEMForm.patchValue(response);
        if (this.isViewMode) {
          this.OEMForm.disable();
        }
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
      }
    })
  }
  onSubmit(): void {
    if (this.OEMForm.valid) {
      const raw = this.OEMForm.getRawValue();
      const formData = new FormData();
      formData.append('id', (raw.id || 0).toString());
      formData.append('name', (raw.name || '').trim());
      formData.append('contactPerson1', (raw.contactPerson1 || '').trim());
      formData.append('contactPerson2', (raw.contactPerson2 || '').trim());
      formData.append('contactPerson3', (raw.contactPerson3 || '').trim());
      formData.append('contactNo1', (raw.contactNo1 || '').trim());
      formData.append('contactNo2', (raw.contactNo2 || '').trim());
      formData.append('contactNo3', (raw.contactNo3 || '').trim());
      formData.append('emailId1', (raw.emailId1 || '').trim());
      formData.append('emailId2', (raw.emailId2 || '').trim());
      formData.append('emailId3', (raw.emailId3 || '').trim());
      formData.append('address', (raw.address || '').trim());
      if (raw.uploadReferenceID) {
        formData.append('uploadReferenceID', raw.uploadReferenceID.toString());
      }
      formData.append('agreementFilePath', raw.agreementFilePath || '');
      formData.append('fileName', raw.fileName || '');
      formData.append('supplierApproved', (!!raw.supplierApproved).toString());
      formData.append('isBlacklisted', (!!raw.isBlacklisted).toString());
      formData.append('reasonForBlacklisting', (raw.reasonForBlacklisting || '').trim());

      if (raw.file instanceof File && raw.file.size > 0) {
        formData.append('file', raw.file, raw.file.name);
      }

      this.isSubmitting = true;
      if (this.equipmentId > 0) {
        this.oemService.updateOEM(formData).subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.saved = true;
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/oem']);
          },
          error: (error) => {
            this.isSubmitting = false;
            this.toastService.show(error.message, 'error');
          }
        })
      } else {
        this.oemService.createOEM(formData).subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.saved = true;
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/oem']);
          },
          error: (error) => {
            this.isSubmitting = false;
            this.toastService.show(error.message, 'error');
          }
        })
      }
    }
    else {
      this.OEMForm.markAllAsTouched();
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
    }
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toastService.show(`File size  should be less than 5 MB.`, 'warning');
        event.target.value = '';
        return;
      }
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.toastService.show('Invalid file type', 'warning');
        event.target.value = '';
        return;
      }
      let previewUrl = '';
      const reader = new FileReader();
      reader.onload = () => {
        previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);

      this.OEMForm.patchValue({ fileName: file.name, file: file });
    }
  }

  openFileInNewTab(filePath: string): void {
    if (filePath) {
       const baseUrl = environment.baseUrl;
      const fullUrl = baseUrl + filePath;
      window.open(fullUrl, '_blank');
    } else {

    }
  }
  removeFile(): void {
    this.OEMForm.get('agreementFilePath')?.reset();
    this.OEMForm.get('fileName')?.reset();
  }
  checkPhoneNumber(event: any): void {
    const input: string = event.target.value;
    if (input) {
      const length = input.length;

      if (length === 12 && !input.startsWith('91')) {
        this.toastService.show('Phone number must start with "91" if it has 12 digits.', 'warning');
        event.target.value = '';
        return;
      }

      if (input.startsWith('0') && length > 11) {
        this.toastService.show('Invalid phone number starting with "0".', 'warning');
        event.target.value = '';
        return;
      }
    }
  }


  canDeactivate(): Observable<boolean> | boolean {
    if (!this.OEMForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.OEMForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}

