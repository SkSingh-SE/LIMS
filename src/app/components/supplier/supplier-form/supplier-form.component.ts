import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { SupplierService } from '../../../services/supplier.service';
import { CommonModule } from '@angular/common';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-supplier-form',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NumberOnlyDirective, RouterLink],
  templateUrl: './supplier-form.component.html',
  styleUrl: './supplier-form.component.css'
})
export class SupplierFormComponent implements OnInit {
  supplierForm!: FormGroup
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  supplierId: number = 0;

  constructor(private fb: FormBuilder, private toastService: ToastService, private supplierService: SupplierService,
    private route: ActivatedRoute, private router: Router,
  ) {
  }
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.supplierId = Number(params.get('id'));
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
    if (this.supplierId > 0) {
      this.loadSupplier(this.supplierId);
    }
  }
  initForm() {
    this.supplierForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      productType: ['Product', Validators.required],
      contactPerson1: ['', Validators.required],
      contactNo1: ['', Validators.required],
      emailId1: ['', [Validators.required, Validators.email]],
      contactPerson2: [''],
      contactNo2: [''],
      emailId2: ['', Validators.email],
      contactPerson3: [''],
      contactNo3: [''],
      emailId3: ['', Validators.email],
      address: [''],
      presentStatus: [1, Validators.required],
      uploadReferenceID: [null],
      agreementFilePath: [''],
      fileName: [''],
      supplierApproved: [false],
      isBlacklisted: [false],
      reasonForBlacklisting: [''],
      file: [File]
    });
  }
  toggleBlacklistingReason() {
    this.supplierForm.get('isBlacklisted')?.valueChanges.subscribe(isBlacklisted => {
      const reasonControl = this.supplierForm.get('reasonForBlacklisting');
      if (isBlacklisted) {
        reasonControl?.setValidators([Validators.required]);
      } else {
        reasonControl?.clearValidators();
        reasonControl?.setValue('');
      }
      reasonControl?.updateValueAndValidity();
    });
  }

  loadSupplier(id: number) {
    this.supplierService.getSupplierById(id).subscribe({
      next: (response) => {
        this.supplierForm.patchValue(response);
        if (this.isViewMode) {
          this.supplierForm.disable();
        }
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
      }
    })
  }
  onSubmit(): void {
    if (this.supplierForm.valid) {
      const raw = this.supplierForm.getRawValue();
      const formData = new FormData();
      formData.append('id', raw.id);
      formData.append('name', raw.name);
      formData.append('productType', raw.productType);
      formData.append('contactPerson1', raw.contactPerson1 || '');
      formData.append('contactPerson2', raw.contactPerson2 || '');
      formData.append('contactPerson3', raw.contactPerson3 || '');
      formData.append('contactNo1', raw.contactNo1 || '');
      formData.append('contactNo2', raw.contactNo2 || '');
      formData.append('contactNo3', raw.contactNo3 || '');
      formData.append('emailId1', raw.emailId1 || '');
      formData.append('emailId2', raw.emailId2 || '');
      formData.append('emailId3', raw.emailId3 || '');
      formData.append('address', raw.address || '');
      formData.append('presentStatus', raw.presentStatus.toString());
      formData.append('uploadReferenceID', raw.uploadReferenceID ?? '');
      formData.append('agreementFilePath', raw.agreementFilePath || '');
      formData.append('fileName', raw.fileName || '');
      formData.append('supplierApproved', raw.supplierApproved.toString());
      formData.append('isBlacklisted', raw.isBlacklisted.toString());
      formData.append('reasonForBlacklisting', raw.reasonForBlacklisting || '');

      if (raw.file) {
        formData.append('file', raw.file, raw.file.name);
      }

      if (this.supplierId > 0) {
        this.supplierService.updateSupplier(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/supplier']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        })
      } else {
        this.supplierService.createSupplier(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/supplier']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        })
      }
    }
    else {
      this.supplierForm.markAllAsTouched();
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

      this.supplierForm.patchValue({ fileName: file.name, file: file });
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
    this.supplierForm.get('agreementFilePath')?.reset();
    this.supplierForm.get('fileName')?.reset();
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

}
