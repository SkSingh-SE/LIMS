import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-laboratory-test',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './laboratory-test.component.html',
  styleUrl: './laboratory-test.component.css'
})
export class LaboratoryTestComponent {
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;

  labTestForm!: FormGroup;

  testTypes = ['Spectro', 'ICP (Non Metallic)', 'ICP (Metallic)', 'Impact', 'Hardness'];
  invoiceCasesMap: { [key: string]: string[] } = {
    'Spectro': ['1 Element', '2 Element'],
    'ICP (Non Metallic)': ['Ag', 'Au', 'Pt'],
    'ICP (Metallic)': ['Ag', 'Au', 'Pt'],
    'Impact': ['24hr@RT', '24hr@HT'],
    'Hardness': ['1 Point', '2 Point', '3 Point']
  };
  invoiceCases: string[] = [];

  dropdownOpen = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.labTestForm = this.fb.group({
      department: ['', Validators.required],
      testGroup: ['', Validators.required],
      testSubGroup: ['', Validators.required],
      testType: ['', Validators.required],
      invoiceCase: [[], Validators.required],
      testCharge: ['', Validators.required],
      sampleSizeRequired: ['', Validators.required],
    });

    this.labTestForm.get('testType')?.valueChanges.subscribe(type => {
      this.invoiceCases = this.invoiceCasesMap[type] || [];
      this.labTestForm.get('invoiceCase')?.setValue([]);
    });
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.dropdownOpen && this.dropdownContainer && !this.dropdownContainer.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }

  toggleInvoiceCase(caseItem: string): void {
    debugger;
    const selectedCases = this.labTestForm.get('invoiceCase')?.value as string[];
    if (selectedCases.includes(caseItem)) {
      this.labTestForm.get('invoiceCase')?.setValue(selectedCases.filter(c => c !== caseItem));
    } else {
      this.labTestForm.get('invoiceCase')?.setValue([...selectedCases, caseItem]);
    }
  }

  isInvoiceCaseSelected(caseItem: string): boolean {
    const selectedCases = this.labTestForm.get('invoiceCase')?.value as string[];
    return selectedCases.includes(caseItem);
  }

  onSubmit(): void {
    if (this.labTestForm.valid) {
      console.log('Submitted:', this.labTestForm.value);
    }
  }
}
