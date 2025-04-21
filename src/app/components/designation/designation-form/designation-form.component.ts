import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DesignationService } from '../../../services/designation.service';
import { ToastService } from '../../../services/toast.service';
import { CommonModule } from '@angular/common';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-designation-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './designation-form.component.html',
  styleUrl: './designation-form.component.css'
})
export class DesignationFormComponent implements OnInit, AfterViewInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;
  designationForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  designationObjet: any = null;
  designationId: number = 0;
  formTitle = 'Designation Form';
  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private designationService: DesignationService, private toastService: ToastService) { }
 

  ngOnInit(): void {
    this.designationForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      description: ['', Validators.required],
    });
    this.route.paramMap.subscribe(params => {
      this.designationId = Number(params.get('id'));
      if (this.designationId > 0) {
        this.loadDesignationData();
      }
    });
    const state = history.state as { mode?: string };

    if (state && state.mode === 'view') {
      this.formTitle = 'Designation Details';
      this.isViewMode = true;
      this.designationForm.disable();
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

  loadDesignationData(): void {
    this.designationService.getDesignationById(this.designationId).subscribe({
      next: (response) => {
        this.designationObjet = response;
        this.designationForm.patchValue({
          name: this.designationObjet.name,
          description: this.designationObjet.description
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

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
      this.router.navigate(['/designation']);
    }
  }

  onSubmit(): void {
    if (this.designationForm.valid) {
      const formData = this.designationForm.value;
      if (this.isEditMode) {
        this.designationService.updateDesignation(formData).subscribe({
          next: (response) => {
            this.toastService.show('Designation updated successfully', 'success');
            this.closeModal();
          },
          error: (error) => {
            console.error('Error updating designation:', error);
            this.toastService.show('Error updating designation. Please try again.', 'error');
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
            this.toastService.show('Error creating designation. Please try again.', 'error');
          }
        });
      }
    }
  }

}

