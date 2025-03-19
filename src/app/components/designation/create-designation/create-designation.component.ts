import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DesignationService } from '../../../services/designation.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-designation',
  imports: [FormsModule,CommonModule,ReactiveFormsModule],
  templateUrl: './create-designation.component.html',
  styleUrl: './create-designation.component.css'
})
export class CreateDesignationComponent {
 createForm!: FormGroup;
  designationId!: number;
  isLoading = signal(false);
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private designationService: DesignationService
  ) { }

  ngOnInit() {
    // Initialize Form
    this.createForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });


  }

  // Handle form submission
  onSubmit() {
    if (this.createForm.invalid) return;
    this.isLoading.set(true);
    const updatedData = this.createForm.value;
    this.designationService.createDesignation(updatedData).subscribe({
      next: () => {
        alert('Designation created successfully!');
        this.router.navigate(['/designation']);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error updating designation:', err);
        this.isLoading.set(false);
      }
    });
  }

  cancel() {
    this.router.navigate(['/designation']);
  }
}
