import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../services/department.service';
import { Observable } from 'rxjs';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Select2, Select2Option, Select2SearchEvent, Select2UpdateEvent, Select2UpdateValue } from 'ng-select2-component';


@Component({
  selector: 'app-laboratory-test',
  templateUrl: './laboratory-test.component.html',
  styleUrl: './laboratory-test.component.css',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, RouterLink, Select2],

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
filteredInvoiceCaseOptions = this.invoiceCaseOptions;

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
    if (this.labTestId > 0) {
      this.getLabTestById(this.labTestId);
    }
    if (this.isViewMode) {
      this.labTestForm.disable();
    }
  }
  initForm() {
    this.labTestForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      labDepartmentID: [0, Validators.required],
      subGroup: ['', Validators.required],
      invoiceCase: [''],
      invoiceCases: [[]]
    });
  }

  getLabTestById(id: number) {
    this.labService.getLaboratoryTestById(id).subscribe({
      next: (response) => {
        this.labTestForm.patchValue(response);
        const invoiceCases = response?.invoiceCase?.split(',');
        if(invoiceCases)
          this.labTestForm.patchValue({invoiceCases : invoiceCases})
      },
      error: (error) => {
        console.error(error);
      }
    });
  }
  onSubmit(): void {
    if (this.labTestForm.valid) {
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
  onInvoiceCaseChange(selectedIds: Select2UpdateEvent<Select2UpdateValue>) {
    const invoiceCases: string[] = [];

    selectedIds?.options?.forEach((item: any) => {
      const selectedOption = this.invoiceCaseOptions.find(
        (x: Select2Option) => x.value === item.value
      );
      if (selectedOption) {
        invoiceCases.push(selectedOption.value);
      }
    });

    this.labTestForm.patchValue({ invoiceCase: invoiceCases.join(',') });
  }
   onInvoiceCaseSearch(term: Select2SearchEvent<Select2UpdateValue>) {
     
      const selectedIDs = this.labTestForm.get('invoiceCase')?.value || [];
      const searchTerm = term.search.toLowerCase();
  
      this.filteredInvoiceCaseOptions = this.invoiceCaseOptions.filter((option) => {
        const isSelected = selectedIDs.includes(option.value);
        const matchesSearch = option.label.toLowerCase().includes(searchTerm);
  
        return isSelected || matchesSearch;
      });
  
    }
}
