import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DesignationService } from '../../../services/designation.service';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-update-designation',
  imports: [FormsModule,CommonModule,ReactiveFormsModule],
  templateUrl: './update-designation.component.html',
  styleUrl: './update-designation.component.css'
})
export class UpdateDesignationComponent implements OnInit {
  updateForm!: FormGroup;
  designationId!: number;
  isLoading = signal(false);
  isSubmitting = false;
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private designationService: DesignationService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.designationId = Number(params.get('id'));

      if (this.designationId) {
        this.loadDesignation();
      }
    });
    // Initialize Form
    this.updateForm = this.fb.group({
      id: [''],
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });


  }

  // Load designation details from API
  loadDesignation() {
    this.isLoading.set(true);
    this.designationService.getDesignationById(this.designationId).subscribe({
      next: (data) => {
        this.updateForm.patchValue(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.router.navigate(['/designation']);
        console.error('Error loading designation:', err);
        this.isLoading.set(false);
        this.toastService.show("Something went wrong",'error');
      }

    });
  }

  // Handle form submission
  onSubmit() {
    if (this.updateForm.invalid) return;
    this.isLoading.set(true);
    const updatedData = this.updateForm.value;
    this.designationService.updateDesignation(this.designationId, updatedData).subscribe({
      next: () => {
        this.router.navigate(['/designation']);
        this.isLoading.set(false);
        this.toastService.show(`${this.updateForm.value.name} updated successfully!`,'success');
      },
      error: (err) => {
        console.error(`Error updating ${this.updateForm.value.name} designation:`, err);
        this.isLoading.set(false);
        this.toastService.show('Something went wrong!','error');
      }
    });
  }

  cancel() {
    this.router.navigate(['/designation']);
  }
}
