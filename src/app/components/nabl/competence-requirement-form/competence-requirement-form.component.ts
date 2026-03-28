import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CompetenceRequirementService } from '../../../services/competence-requirement.service';
import { DesignationService } from '../../../services/designation.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { Observable } from 'rxjs';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
  selector: 'app-competence-requirement-form',

  imports: [CommonModule, ReactiveFormsModule, RouterModule, SearchableDropdownComponent, QuillModule, NablSignatureSectionComponent],
  templateUrl: './competence-requirement-form.component.html',
  styleUrl: './competence-requirement-form.component.css'
})
export class CompetenceRequirementFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  isSubmitting = false;
  requirementForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  requirementId: number = 0;
  formTitle = 'Create Competence Requirement';
  formNumbers: string[] = NablFormsHelper.getFormNumbers();

  openSections: { [key: string]: boolean } = {
    header: true,
    criteria: true
  };

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],               // custom button values
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
      [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
      [{ 'direction': 'rtl' }],                         // text direction
      [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean']                                         // remove formatting button
    ]
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private competenceRequirementService: CompetenceRequirementService,
    private designationService: DesignationService,
    private toastService: ToastService
  , private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

  ngOnInit(): void {
    this.initForm();
        this.nablHeaderService.getFormDefaults('CompetenceRequirement').subscribe({
            next: (defaults) => {
                this.requirementForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => {}
        });

    this.route.paramMap.subscribe(params => {
      this.requirementId = Number(params.get('id'));
      if (this.requirementId > 0) {
        this.loadData();
      }
    });

    const state = history.state as { mode?: string };
    if (state && state.mode === 'view') {
      this.formTitle = 'Competence Requirement Details';
      this.isViewMode = true;
      this.requirementForm.disable();
    } else if (state && state.mode === 'edit') {
      this.formTitle = 'Edit Competence Requirement';
      this.isEditMode = true;
      this.isViewMode = false;
    }
  }

  initForm(): void {
    this.requirementForm = this.fb.group({
      id: [0],
      formatNo: ['F-4'],
      issueNo: ['01'],
      revNo: ['00'],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      isExternal: [false],
      positionId: [null],
      positionName: [''],
      relatedActivity: [''],
      minimumEducation: ['', Validators.required],
      minimumExperience: ['', Validators.required],
      preparedBy: [''],
      reviewedBy: [''],
      approvedBy: ['']
    });

        // System-managed fields — always readonly
        this.requirementForm.get('issueNo')?.disable();
        this.requirementForm.get('revNo')?.disable();
        this.requirementForm.get('formatNo')?.disable();

    // Handle conditional validation based on isExternal
    this.requirementForm.get('isExternal')?.valueChanges.subscribe(isExternal => {
      if (isExternal) {
        this.requirementForm.get('positionId')?.clearValidators();
        this.requirementForm.get('relatedActivity')?.setValidators([Validators.required]);
      } else {
        this.requirementForm.get('positionId')?.setValidators([Validators.required]);
        this.requirementForm.get('relatedActivity')?.clearValidators();
      }
      this.requirementForm.get('positionId')?.updateValueAndValidity();
      this.requirementForm.get('relatedActivity')?.updateValueAndValidity();
    });
  }

  loadData(): void {
    this.competenceRequirementService.getById(this.requirementId).subscribe({
      next: (data) => {
        if (data) {
          const formValues = { ...data };

          this.requirementForm.patchValue(formValues);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.requirementForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.requirementForm.disable();
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.requirementForm.get('issueNo')?.disable();
                this.requirementForm.get('revNo')?.disable();
                this.requirementForm.get('formatNo')?.disable();
        }
      },
      error: (error) => {
        console.error('Error fetching requirement:', error);
        this.toastService.show('Error loading competence requirement', 'error');
        this.router.navigate(['/competence-requirement']);
      }
    });
  }

  getDesignations = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.designationService.getDesignationDropdown(term, page, pageSize);
  };

  onDesignationSelected(item: any): void {
    if (!item) {
      this.requirementForm.patchValue({ positionId: null, positionName: '' });
      return;
    }
    this.requirementForm.patchValue({
      positionId: item.id,
      positionName: item.name
    });
  }

  toggleSection(section: string): void {
    this.openSections[section] = !this.openSections[section];
  }

  onSubmit(): void {
    if (this.requirementForm.valid) {
      const formData = this.requirementForm.getRawValue();

      this.isSubmitting = true;
      if (this.isEditMode) {
        formData.id = this.requirementId;
        this.competenceRequirementService.update(formData).subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.saved = true;
            this.toastService.show(response.message || 'Updated successfully', 'success');
            this.router.navigate(['/competence-requirement']);
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error updating requirement:', error);
            this.toastService.show('Error updating competence requirement', 'error');
          }
        });
      } else {
        this.competenceRequirementService.create(formData).subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.saved = true;
            this.toastService.show(response.message || 'Created successfully', 'success');
            this.router.navigate(['/competence-requirement']);
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error creating requirement:', error);
            this.toastService.show('Error creating competence requirement', 'error');
          }
        });
      }
    } else {
      this.requirementForm.markAllAsTouched();
      this.toastService.show('Please fill all required fields', 'warning');
    }
  }

  goBack(): void {
    this.router.navigate(['/competence-requirement']);
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.requirementForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.requirementForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
