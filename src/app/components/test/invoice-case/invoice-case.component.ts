import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-invoice-case',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,RouterLink],
  templateUrl: './invoice-case.component.html',
  styleUrls: ['./invoice-case.component.css']
})
export class InvoiceCaseComponent implements OnInit {
  form!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;

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
  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.initForm();
    this.generateFinancialYears();
  }
  initForm(): void {
    this.form = this.fb.group({
      financialYear: ['', Validators.required],
      cases: this.fb.array([])
    });
  }
  generateFinancialYears(): void {
    const startYear = 2020;
    const currentYear = new Date().getFullYear()+1; // Adjust to next year for financial year calculation
    const currentMonth = new Date().getMonth() + 1;

    const endYear = currentMonth >= 4 ? currentYear : currentYear - 1;

    for (let year = startYear; year <= endYear; year++) {
      this.financialYears.push(`${year}-${year + 1}`);
    }
  }
  get cases(): FormArray {
    return this.form.get('cases') as FormArray;
  }

  addCase(): void {
    this.cases.push(this.fb.group({
      name: ['', Validators.required],
      type: ['',],
      logicConfig: this.fb.group({}),
      price: [0, Validators.required]
    }));
    this.caseNameInputs.push('');
    this.filteredSuggestionsList.push([]);
  }
  removeCase(index: number): void {
    this.cases.removeAt(index);
    this.caseNameInputs.splice(index, 1);
    this.filteredSuggestionsList.splice(index, 1);
  }


  addCaseFromUserInput(name: string, price: number): void {
    const { type, logicConfig } = this.parseInvoiceCaseName(name);
    this.cases.push(this.fb.group({
      name: [name],
      type: [type],
      logicConfig: this.fb.group(logicConfig),
      price: [price, Validators.required]
    }));
    this.caseNameInputs.push('');
    this.filteredSuggestionsList.push([]);
  }


  onCaseNameInput(i: number): void {
    const caseGroup = this.cases.at(i) as FormGroup;
    const name = caseGroup.get('name')?.value;
    this.caseNameInputs[i] = name || '';
    const input = this.caseNameInputs[i]?.trim();
    this.filteredSuggestionsList[i] = [];

    if (!input) return;

    const isNumber = /^\d+$/.test(input);
    const normalizedInput = input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();

    if (isNumber) {
      this.filteredSuggestionsList[i] = [
        `${input} element`,
        `${input} hr`,
        `${input} mm`,
        `up to ${input} mm`,
        `${input} mm to ${+input + 10} mm`,
        `above ${input} mm`,
        `${input} kn`,
        `up to ${input} kn`,
        `${input} kn to ${+input + 100} kn`,
        `above ${input} kn`
      ];
    }

    if (this.validChemicalElements.includes(normalizedInput)) {
      this.filteredSuggestionsList[i].push(`special element (${input})`);
    }
  }

  selectSuggestion(i: number, suggestion: string): void {
    this.caseNameInputs[i] = suggestion;
    this.filteredSuggestionsList[i] = [];
    const caseGroup = this.cases.at(i) as FormGroup;
    const { type, logicConfig } = this.parseInvoiceCaseName(suggestion);
    caseGroup.patchValue({
      name: suggestion,
      type: type,
      logicConfig: this.fb.group(logicConfig)
    });
  }


  parseInvoiceCaseName(name: string): { type: string; logicConfig: any } {
    name = name.trim().toLowerCase();

    if (/^\d+ element$/.test(name)) {
      const count = parseInt(name);
      return { type: 'element-count', logicConfig: { min: count, max: count } };
    }

    if (/^\d+\s*mm$/.test(name)) {
      const size = parseInt(name);
      return { type: 'size-range', logicConfig: { min: size, max: size } };
    }

    if (name.includes('kn')) {
      if (name.includes('up to')) {
        const max = parseInt(name);
        return { type: 'test-load', logicConfig: { min: 0, max } };
      }
      if (name.includes('to')) {
        const [min, max] = name.split('to').map(s => parseInt(s));
        return { type: 'test-load', logicConfig: { min, max } };
      }
      if (name.includes('above')) {
        const min = parseInt(name);
        return { type: 'test-load', logicConfig: { min, max: Infinity } };
      }
    }

    if (name.startsWith('special element')) {
      const el = name.split('(')[1]?.replace(')', '').trim();
      return { type: 'element-name', logicConfig: { element: el } };
    }

    return { type: 'custom', logicConfig: {} };
  }

  submit(): void {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}