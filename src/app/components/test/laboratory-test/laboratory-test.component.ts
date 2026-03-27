import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../services/department.service';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { InvoiceCaseConfigurationService } from '../../../services/invoice-case-configuration.service';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';


@Component({
  selector: 'app-laboratory-test',
  templateUrl: './laboratory-test.component.html',
  styleUrl: './laboratory-test.component.css',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, RouterLink, MultiSelectDropdownComponent, FormFieldErrorComponent],

})
export class LaboratoryTestComponent implements OnInit {
  labTestForm!: FormGroup;
  submitted = false;
  labTestId: number = 0;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  testNameSuggestions: string[] = [];

  private nameSearchSubject = new Subject<string>();

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
    private route: ActivatedRoute, private router: Router, private labService: LaboratoryTestService, private toastService: ToastService, private metalService: MetalClassificationService, private invoiceConfig: InvoiceCaseConfigurationService) {

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

    // Load initial suggestions
    this.loadTestNameSuggestions('');

    // Debounced search for test name autocomplete
    this.nameSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.loadTestNameSuggestions(term);
    });
  }
  initForm() {
    this.labTestForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      labDepartmentID: [0, Validators.required],
      subGroup: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      testCaption: [''],
      invoiceCaption: [''],
      testDuration: [null],
      invoiceCaseIDs: [''],
      invoiceCases: this.fb.array([]),
      equation: ['']
    });
  }

  loadTestNameSuggestions(term: string) {
    this.labService.getDistinctTestNames(term, 30).subscribe({
      next: (names) => { this.testNameSuggestions = names; },
      error: () => { this.testNameSuggestions = []; }
    });
  }

  onTestNameInput(event: any) {
    const value = event.target.value;
    this.nameSearchSubject.next(value);
  }

  getLabTestById(id: number) {
    this.labService.getLaboratoryTestById(id).subscribe({
      next: (response) => {
        this.labTestForm.patchValue(response);
        if (response?.invoiceCases) {
          const invoiceCaseArray = this.labTestForm.get('invoiceCases') as FormArray;
          const selectIds: number[] = [];
          invoiceCaseArray.clear();
          response?.invoiceCases?.forEach((item: any) => {
            selectIds.push(item.invoiceCaseConfigID);
            invoiceCaseArray.push(
              this.fb.group({
                id: [item.id],
                labTestID: [item.labTestID],
                invoiceCaseConfigID: [item.invoiceCaseConfigID]
              })
            );
          });
          // defer patchValue
          setTimeout(() => {
            this.labTestForm.patchValue({
              invoiceCaseIDs: selectIds
            });
          });

        }
      },
      error: (error) => {
        console.error(error);
      }
    });
  }
  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.labTestForm, path, this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.labTestForm);
    if (!this.labTestForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }
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
  }

  getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.departmentService.getDepartmentDropdown(term, page, pageSize);
  };

  onDepartmentSelected(item: any) {
    this.labTestForm.patchValue({ labDepartmentID: item.id });
  }

  getInvoiceCaseConfig = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.invoiceConfig.getInvoiceCaseConfigDropdown(term, page, pageSize);
  }
  onInvoiceCaseChange(selectedItems: any[]) {
    const invoiceCaseArray = this.labTestForm.get('invoiceCases') as FormArray;
    const selectIds: number[] = [];
    invoiceCaseArray.clear();
    selectedItems?.forEach((item) => {
      selectIds.push(item.id);
      invoiceCaseArray.push(
        this.fb.group({
          id: [0],
          labTestID: [this.labTestForm.get('id')?.value || 0],
          invoiceCaseConfigID: [item.id]
        })
      );
    });
    this.labTestForm.patchValue({ invoiceCaseIDs: selectIds })
  }


}
