import { Component, OnInit , HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ResponsibilityAuthorityService } from '../../../services/responsibility-authority.service';
import { DesignationService } from '../../../services/designation.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { Observable } from 'rxjs';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
  selector: 'app-responsibility-authority-form',

  imports: [CommonModule, ReactiveFormsModule, RouterModule, SearchableDropdownComponent, QuillModule],
  templateUrl: './responsibility-authority-form.component.html',
  styleUrl: './responsibility-authority-form.component.css'
})
export class ResponsibilityAuthorityFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  raForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = false;
  matrixId: number = 0;
  formTitle = 'Create RA Matrix';
  formNumbers: string[] = NablFormsHelper.getFormNumbers();

  openSections: { [key: string]: boolean } = {
    header: true,
    matrix: true,
    approval: true
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
    private raService: ResponsibilityAuthorityService,
    private designationService: DesignationService,
    private toastService: ToastService
  , private unsavedChangesService: UnsavedChangesService) { }

  ngOnInit(): void {
    this.initForm();

    this.route.paramMap.subscribe(params => {
      this.matrixId = Number(params.get('id'));
      if (this.matrixId > 0) {
        this.loadData();
      }
    });

    const state = history.state as { mode?: string };
    if (state && state.mode === 'view') {
      this.formTitle = 'RA Matrix Details';
      this.isViewMode = true;
      this.raForm.disable();
    } else if (state && state.mode === 'edit') {
      this.formTitle = 'Edit RA Matrix';
      this.isEditMode = true;
      this.isViewMode = false;
    } else {
      this.isEditMode = false;
      this.isViewMode = false;
    }
  }

  initForm(): void {
    this.raForm = this.fb.group({
      id: [0],
      formatNo: ['F-4', Validators.required],
      designationId: [null, Validators.required],
      designationName: [''],
      issueNo: ['', Validators.required],
      date: ['', Validators.required],
      revNo: ['', Validators.required],
      responsibilities: ['', Validators.required],
      authorities: ['', Validators.required],
      employeeAccepted: [false],
      preparedBy: [''],
      issuedBy: [''],
      reviewedApprovedBy: ['']
    });
  }

  loadData(): void {
    this.raService.getById(this.matrixId).subscribe({
      next: (data) => {
        if (data) {
          this.raForm.patchValue(data);
        }
      },
      error: (error) => {
        console.error('Error fetching matrix:', error);
        this.toastService.show('Error loading RA matrix', 'error');
        this.router.navigate(['/responsibility-authority']);
      }
    });
  }

  getDesignations = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.designationService.getDesignationDropdown(term, page, pageSize);
  };

  onDesignationSelected(item: any): void {
    this.raForm.patchValue({
      designationId: item.id,
      designationName: item.name
    });
  }

  toggleSection(section: string): void {
    this.openSections[section] = !this.openSections[section];
  }

  onSubmit(): void {
    if (this.raForm.valid) {
      const formData = this.raForm.getRawValue();

      if (this.isEditMode) {
        formData.id = this.matrixId;
        this.raService.update(formData).subscribe({
          next: (response) => {
            this.saved = true;
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/responsibility-authority']);
          },
          error: (error) => {
            this.toastService.show('Error updating RA matrix', 'error');
          }
        });
      } else {
        this.raService.create(formData).subscribe({
          next: (response) => {
            this.saved = true;
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/responsibility-authority']);
          },
          error: (error) => {
            this.toastService.show('Error creating RA matrix', 'error');
          }
        });
      }
    } else {
      this.raForm.markAllAsTouched();
      this.toastService.show('Please fill all required fields', 'warning');
    }
  }

  goBack(): void {
    this.router.navigate(['/responsibility-authority']);
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.raForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.raForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
