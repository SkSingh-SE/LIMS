import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild , HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartmentService } from '../../../services/department.service';
import { ToastService } from '../../../services/toast.service';
import { Modal } from 'bootstrap';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';

@Component({
  selector: 'app-department-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FormFieldErrorComponent],
  templateUrl: './department-form.component.html',
  styleUrl: './department-form.component.css'
})
export class DepartmentFormComponent implements CanComponentDeactivate, OnInit, AfterViewInit {
  saved = false;
  private bsModal!: Modal;
  @ViewChild('modalRef', {static:false}) modalElement!: ElementRef;

  departmentForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  departmentObject: any = null;
  departmentId: number = 0;
  formTitle = 'Department Form';
  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private departmentService: DepartmentService, private toastService: ToastService, private unsavedChangesService: UnsavedChangesService) { }
  ngOnInit(): void {
    this.departmentForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(500)]],
      isChemical: [false],
    });

    this.route.paramMap.subscribe(params => {
      this.departmentId = Number(params.get('id'));
      if (this.departmentId > 0) {
        this.loadDepartmentData();
      }
    });
    const state = history.state as { mode?: string };

    if (state && state.mode === 'view') {
      this.formTitle = 'Department Details';
      this.isViewMode = true;
      this.departmentForm.disable();
    } else if (state && state.mode === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
    } else {
      this.isEditMode = false;
      this.isViewMode = false;
    }

  }
  ngAfterViewInit(): void {
    this.openModal();
  }

  loadDepartmentData(): void {
    this.departmentService.getDepartmentById(this.departmentId).subscribe({
      next: (response) => {
        this.departmentObject = response;
        this.departmentForm.patchValue(this.departmentObject);
      },
      error: (error) => {
        console.error('Error fetching department data:', error);
      }
    });

  }


  openModal(): void {
    this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    this.bsModal.show();
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.departmentForm, path, this.submitted);
  }

  closeModal(): void {
    this.submitted = false;
    if (this.bsModal) {
      this.bsModal.hide();
      this.router.navigate(['/department']);
    }
    this.departmentForm.reset();
    this.departmentForm.enable();
    this.departmentId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.departmentForm);
    if (!this.departmentForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }
    const formData = this.departmentForm.value;
    if (this.isEditMode) {
      this.departmentService.updateDepartment(formData).subscribe({
        next: (response) => {
          this.saved = true;
          this.toastService.show('Department updated successfully', 'success');
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating department:', error);
        }
      });
    } else {
      this.departmentService.createDepartment(formData).subscribe({
        next: (response) => {
          this.toastService.show('Department created successfully', 'success');
          this.closeModal();
        },
        error: (error) => {
          console.error('Error creating department:', error);
        }
      });
    }
  }


  canDeactivate(): Observable<boolean> | boolean {
    if (!this.departmentForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.departmentForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
