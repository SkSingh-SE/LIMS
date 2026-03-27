import { AfterViewInit, Component, ElementRef, OnInit, ViewChild , HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DesignationService } from '../../../services/designation.service';
import { RoleService } from '../../../services/role.service';
import { ToastService } from '../../../services/toast.service';
import { CommonModule } from '@angular/common';
import { Modal } from 'bootstrap';
import { Observable } from 'rxjs';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';

@Component({
  selector: 'app-designation-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, FormFieldErrorComponent],
  templateUrl: './designation-form.component.html',
  styleUrl: './designation-form.component.css'
})
export class DesignationFormComponent implements CanComponentDeactivate, OnInit, AfterViewInit {
  saved = false;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;
  designationForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  designationObjet: any = null;
  designationId: number = 0;
  formTitle = 'Designation Form';
  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private designationService: DesignationService, private roleService: RoleService, private toastService: ToastService, private unsavedChangesService: UnsavedChangesService) { }


  ngOnInit(): void {
    this.designationForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      description: ['', [Validators.maxLength(500)]],
      roleID: [null],
      qualification: [''],
      minExperience: [null],
      personalityTraits: [''],
      rolesAndResponsibilities: [''],
    });
    this.route.paramMap.subscribe(params => {
      this.designationId = Number(params.get('id'));
      if (this.designationId > 0) {
        this.loadDesignationData();
      }
    });
    // Determine mode from route path (reliable) or fallback to history.state
    const currentUrl = this.route.snapshot.url.map(seg => seg.path).join('/');
    const state = history.state as { mode?: string };

    if (currentUrl.includes('details') || (state && state.mode === 'view')) {
      this.formTitle = 'Designation Details';
      this.isViewMode = true;
      this.designationForm.disable();
    } else if (currentUrl.includes('edit') || (state && state.mode === 'edit')) {
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

  loadDesignationData(): void {
    this.designationService.getDesignationById(this.designationId).subscribe({
      next: (response) => {
        this.designationObjet = response;
        this.designationForm.patchValue({
          id: this.designationObjet.id,
          name: this.designationObjet.name,
          description: this.designationObjet.description,
          roleID: this.designationObjet.roleID,
          qualification: this.designationObjet.qualification,
          minExperience: this.designationObjet.minExperience,
          personalityTraits: this.designationObjet.personalityTraits,
          rolesAndResponsibilities: this.designationObjet.rolesAndResponsibilities
        });
      },
      error: (error) => {
        console.error('Error fetching department data:', error);
      }
    });

  }

  openModal(): void {
    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.designationForm, path, this.submitted);
  }

  closeModal(): void {
    this.submitted = false;
    if (this.bsModal) {
      this.bsModal.hide();
      this.router.navigate(['/designation']);
    }
    this.designationForm.reset();
    this.designationForm.enable();
    this.designationId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.designationForm);
    if (!this.designationForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }
    const formData = this.designationForm.value;
    if (this.isEditMode) {
      this.designationService.updateDesignation(formData).subscribe({
        next: (response) => {
          this.saved = true;
          this.toastService.show('Designation updated successfully', 'success');
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating designation:', error);
        }
      });
    } else {
      this.designationService.createDesignation(formData).subscribe({
        next: (response) => {
          this.toastService.show('Designation created successfully', 'success');
          this.closeModal();
        },
        error: (error) => {
          console.error('Error creating designation:', error);
        }
      });
    }
  }

  getRoles = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.roleService.getRoleDropdown(term, page, pageSize);
  };

  onRoleSelected(item: any) {
    this.designationForm.patchValue({ roleID: item.id });
  }


  canDeactivate(): Observable<boolean> | boolean {
    if (!this.designationForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.designationForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}

