import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../services/department.service';
import { Observable } from 'rxjs';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';


@Component({
  selector: 'app-laboratory-test',
  templateUrl: './laboratory-test.component.html',
  styleUrl: './laboratory-test.component.css',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, DecimalOnlyDirective, NumberOnlyDirective, RouterLink],

})
export class LaboratoryTestComponent implements OnInit {
  labTestForm!: FormGroup;
  labTestId: number = 0;
  isViewMode: boolean = false;
  isEditMode: boolean = false;

  invoiceCaseOptions = [
    // Element Count
    ...Array.from({ length: 5 }, (_, i) => ({
      label: `${i + 1} Element`,
      value: `${i + 1} Element`
    })),

    // Element Types
    { label: 'Ag', value: 'Ag' },
    { label: 'Au', value: 'Au' },
    { label: 'Pt', value: 'Pt' },
    { label: 'Ir', value: 'Ir' },
    { label: 'Pd', value: 'Pd' },
    { label: 'Se', value: 'Se' },
    { label: 'Rh', value: 'Rh' },
    { label: 'Te', value: 'Te' },

    // Sizes
    { label: '10, 12mm', value: '10, 12mm' },
    { label: '16, 20mm', value: '16, 20mm' },
    { label: '25, 28mm', value: '25, 28mm' },
    { label: '32mm', value: '32mm' },
    { label: '36mm', value: '36mm' },
    { label: '40mm', value: '40mm' },
    { label: '45mm', value: '45mm' }
  ];

  constructor(private fb: FormBuilder, private departmentService: DepartmentService,
    private route: ActivatedRoute, private router: Router, private labService: LaboratoryTestService, private toastService: ToastService) {

  }
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.labTestId = Number(params.get('id'));
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
    if(this.labTestId > 0){
      this.getLabTestById(this.labTestId);
    }
    if(this.isViewMode){
      this.labTestForm.disable();
    }
  }
  initForm() {
    this.labTestForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      caption: [''],
      labDepartmentID: [0, Validators.required],
      subGroups: this.fb.array([this.createSubGroup()])
    });
  }

  createSubGroup(): FormGroup {
    return this.fb.group({
      id: [0],
      name: ['', Validators.required],
      invoiceCase: [''],
      testCharge: [0, [Validators.required, Validators.min(0)]],
      sampleSize: ['', [Validators.required, Validators.min(0)]],
      testMethodID: [0]
    });
  }

  get subGroups(): FormArray {
    return this.labTestForm.get('subGroups') as FormArray;
  }

  addSubGroup(): void {
    this.subGroups.push(this.createSubGroup());
  }

  removeSubGroup(index: number): void {
    this.subGroups.removeAt(index);
  }
  getLabTestById(id:number){
    this.labService.getLaboratoryTestById(id).subscribe({
      next:(response) => {
        this.labTestForm.patchValue(response);
      },
      error: (error) =>
      {
        console.error(error);
      }
    });
  }
  onSubmit(): void {
    if (this.labTestForm.valid) {
      console.log(this.labTestForm.value);
      if (this.labTestId > 0) {
        this.labService.updateLaboratoryTest(this.labTestForm.value).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/test']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        })
      } else {
        this.labService.createLaboratoryTest(this.labTestForm.value).subscribe({
          next: (response) => {
            this.labTestId = response.id;
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/test']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        })
      }
    } else {
      this.labTestForm.markAllAsTouched();
    }
  }

  getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.departmentService.getDepartmentDropdown(term, page, pageSize);
  };

  onDepartmentSelected(item: any) {
    this.labTestForm.patchValue({ labDepartmentID: item.id });
  }

}
