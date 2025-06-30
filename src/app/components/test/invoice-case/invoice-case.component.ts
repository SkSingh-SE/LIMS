import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { Observable } from 'rxjs';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { InvoiceCaseService } from '../../../services/invoice-case.service';
import { ToastService } from '../../../services/toast.service';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';

@Component({
  selector: 'app-invoice-case',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, SearchableDropdownComponent, DecimalOnlyDirective],
  templateUrl: './invoice-case.component.html',
  styleUrls: ['./invoice-case.component.css']
})
export class InvoiceCaseComponent implements OnInit {
  invoiceCaseForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  invoiceId: number = 0;
  validChemicalElements: string[] = [
    'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
    'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
    'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
    'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
    'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn',
    'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
    'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb',
    'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
    'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th',
    'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm',
    'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds',
    'Rg', 'Cn', 'Fl', 'Lv', 'Ts', 'Og'
  ];

  caseNameInputs: string[] = [];
  filteredSuggestionsList: string[][] = [];
  financialYears: string[] = [];

  constructor(private fb: FormBuilder, private labTestService: LaboratoryTestService, private invoiceService: InvoiceCaseService, private toastService: ToastService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.invoiceId = Number(params.get('id'));
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
    this.generateFinancialYears();
    if (this.invoiceId > 0) {
      this.getInvoiceCase(this.invoiceId);
      
    } else {

    }
  }
  initForm(): void {
    this.invoiceCaseForm = this.fb.group({
      id: [0],
      financialYear: ['', Validators.required],
      laboratoryTestID: [null],
      invoiceCasePrices: this.fb.array([])
    });
  }
  generateFinancialYears(): void {
    const startYear = 2020;
    const currentYear = new Date().getFullYear(); // Adjust to next year for financial year calculation
    const currentMonth = new Date().getMonth() + 1;

    const endYear = currentMonth >= 4 ? currentYear : currentYear - 1;

    for (let year = startYear; year <= endYear + 1; year++) {
      const fy = `${year}-${year + 1}`;
      this.financialYears.push(fy);

      // Set default selected financial year
      if (
        (currentMonth >= 4 && year === currentYear) ||
        (currentMonth < 4 && year === currentYear - 1)
      ) {
        if (this.invoiceId == 0)
          this.invoiceCaseForm.patchValue({ financialYear: fy });
      }
    }


  }
  get invoiceCases(): FormArray {
    return this.invoiceCaseForm.get('invoiceCasePrices') as FormArray;
  }

  addCase(): void {
    this.invoiceCases.push(this.fb.group({
      id: [0],
      name: ['', Validators.required],
      aliasName:['',Validators.required],
      price: [0, Validators.required],
      invoiceCaseConfigID: [null]
    }));
    this.caseNameInputs.push('');
    this.filteredSuggestionsList.push([]);
  }
  removeCase(index: number): void {
    this.invoiceCases.removeAt(index);
    this.caseNameInputs.splice(index, 1);
    this.filteredSuggestionsList.splice(index, 1);
  }


  // addCaseFromUserInput(name: string, price: number): void {
  //   const { type, logicConfig } = this.parseInvoiceCaseName(name);
  //   this.cases.push(this.fb.group({
  //     name: [name],
  //     type: [type],
  //     logicConfig: this.fb.group(logicConfig),
  //     price: [price, Validators.required]
  //   }));
  //   this.caseNameInputs.push('');
  //   this.filteredSuggestionsList.push([]);
  // }


  // onCaseNameInput(i: number): void {
  //   const caseGroup = this.cases.at(i) as FormGroup;
  //   const name = caseGroup.get('name')?.value;
  //   this.caseNameInputs[i] = name || '';
  //   const input = this.caseNameInputs[i]?.trim();
  //   this.filteredSuggestionsList[i] = [];

  //   if (!input) return;

  //   const isNumber = /^\d+$/.test(input);
  //   const normalizedInput = input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();

  //   if (isNumber) {
  //     this.filteredSuggestionsList[i] = [
  //       `${input} element`,
  //       `${input} hr`,
  //       `${input} mm`,
  //       `up to ${input} mm`,
  //       `${input} mm to ${+input + 10} mm`,
  //       `above ${input} mm`,
  //       `${input} kn`,
  //       `up to ${input} kn`,
  //       `${input} kn to ${+input + 100} kn`,
  //       `above ${input} kn`
  //     ];
  //   }

  //   if (this.validChemicalElements.includes(normalizedInput)) {
  //     this.filteredSuggestionsList[i].push(`special element (${input})`);
  //   }
  // }

  // selectSuggestion(i: number, suggestion: string): void {
  //   this.caseNameInputs[i] = suggestion;
  //   this.filteredSuggestionsList[i] = [];
  //   const caseGroup = this.cases.at(i) as FormGroup;
  //   const { type, logicConfig } = this.parseInvoiceCaseName(suggestion);
  //   caseGroup.patchValue({
  //     name: suggestion,
  //     type: type,
  //     logicConfig: this.fb.group(logicConfig)
  //   });
  // }


  // parseInvoiceCaseName(name: string): { type: string; logicConfig: any } {
  //   name = name.trim().toLowerCase();

  //   if (/^\d+ element$/.test(name)) {
  //     const count = parseInt(name);
  //     return { type: 'element-count', logicConfig: { min: count, max: count } };
  //   }

  //   if (/^\d+\s*mm$/.test(name)) {
  //     const size = parseInt(name);
  //     return { type: 'size-range', logicConfig: { min: size, max: size } };
  //   }

  //   if (name.includes('kn')) {
  //     if (name.includes('up to')) {
  //       const max = parseInt(name);
  //       return { type: 'test-load', logicConfig: { min: 0, max } };
  //     }
  //     if (name.includes('to')) {
  //       const [min, max] = name.split('to').map(s => parseInt(s));
  //       return { type: 'test-load', logicConfig: { min, max } };
  //     }
  //     if (name.includes('above')) {
  //       const min = parseInt(name);
  //       return { type: 'test-load', logicConfig: { min, max: Infinity } };
  //     }
  //   }

  //   if (name.startsWith('special element')) {
  //     const el = name.split('(')[1]?.replace(')', '').trim();
  //     return { type: 'element-name', logicConfig: { element: el } };
  //   }

  //   return { type: 'custom', logicConfig: {} };
  // }

  submit(): void {
    if (this.invoiceCaseForm.valid) {
      console.log(this.invoiceCaseForm.value);
      if (this.invoiceId > 0) {
        this.invoiceService.updateInvoiceCase(this.invoiceCaseForm.value).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.invoiceCaseForm.reset();
            this.router.navigate(['/invoice-case']);
          },
          error: (error) => {
            this.toastService.show(error.error.message, 'error');
          }
        })
      } else {
        this.invoiceService.createInvoiceCase(this.invoiceCaseForm.value).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.invoiceCaseForm.reset();
            this.router.navigate(['/invoice-case']);
          },
          error: (error) => {
            this.toastService.show(error.error.message, 'error');
          }
        })
      }
    }
  }
  getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.labTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  onLaboratorySelected(item: any) {
    this.invoiceCaseForm.patchValue({ laboratoryTestID: item.id });
    this.getLabTestById(item.id);
  };
  getLabTestById(id: number) {
    this.labTestService.getLaboratoryTestById(id).subscribe({
      next: (response) => {
        if (response?.invoiceCases) {
          if (this.invoiceId == 0) {
            const invoiceCaseArray = this.invoiceCases;
            invoiceCaseArray.clear();
            response?.invoiceCases?.forEach((item: any) => {
              invoiceCaseArray.push(
                this.fb.group({
                  id: [0],
                  name: [`${response.subGroup} - ${item?.invoiceCaseConfiguration?.name}`],
                  aliasName:['',Validators.required],
                  price: [0,[Validators.required, Validators.min(0.01)]],
                  invoiceCaseConfigID: [item?.invoiceCaseConfigID]
                })
              );
            });
          } else {
            const existingNames = this.invoiceCases.controls.map(ctrl =>
              ctrl.get('name')?.value?.trim().toLowerCase()
            );
            response.invoiceCases.forEach((item: any) => {
              const newName = `${response.subGroup} - ${item?.invoiceCaseConfiguration?.name}`.trim().toLowerCase();

              if (!existingNames.includes(newName)) {
                this.invoiceCases.push(
                  this.fb.group({
                    id: [0],
                    name: [newName],
                    price: [0, Validators.required],
                    invoiceCaseConfigID: [item?.invoiceCaseConfigID]
                  })
                );
              }
            });
          }
        }
      },
      error: (error) => {
        console.error(error);
      }
    });
  }
  getInvoiceCase(id: number) {
    this.invoiceService.getInvoiceCaseById(id).subscribe({
      next: (response) => {
        this.invoiceCaseForm.patchValue(response);
        response?.invoiceCasePrices?.forEach((item: any) => {
          this.invoiceCases.push(
            this.fb.group({
              id: [item.id],
              name: [item.name],
              aliasName:[item.aliasName],
              price: [item.price],
              invoiceCaseConfigID: [item?.invoiceCaseConfigID]
            })
          );
        });
        if(this.isViewMode){
          this.invoiceCaseForm.disable();
        }
      },
      error: (error) => {
        this.toastService.show(error.error.message, 'error');
      }
    });

  }
}