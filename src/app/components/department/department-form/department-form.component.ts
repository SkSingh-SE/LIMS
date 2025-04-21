import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartmentService } from '../../../services/department.service';
import { ToastService } from '../../../services/toast.service';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-department-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './department-form.component.html',
  styleUrl: './department-form.component.css'
})
export class DepartmentFormComponent implements OnInit, AfterViewInit {
  private bsModal!: Modal;
  @ViewChild('modalRef', {static:false}) modalElement!: ElementRef;

  departmentForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  departmentObject: any = null;
  departmentId: number = 0;
  formTitle = 'Department Form';
  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private departmentService: DepartmentService, private toastService: ToastService) { }
  ngOnInit(): void {
    this.departmentForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      description: ['', Validators.required],
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
        this.departmentForm.patchValue({
          name: this.departmentObject.name,
          description: this.departmentObject.description
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
      this.router.navigate(['/department']);
    }
  }

  onSubmit(): void {
    if (this.departmentForm.valid) {
      const formData = this.departmentForm.value;
      if (this.isEditMode) {
        this.departmentService.updateDepartment(formData).subscribe({
          next: (response) => {
            this.toastService.show('Department updated successfully', 'success');
            this.closeModal();
          },
          error: (error) => {
            console.error('Error updating department:', error);
            this.toastService.show('Error updating department. Please try again.', 'error');
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
            this.toastService.show('Error creating department. Please try again.', 'error');
          }
        });
      }
    }
  }

}
