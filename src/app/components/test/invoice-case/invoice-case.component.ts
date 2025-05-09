import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-invoice-case',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './invoice-case.component.html',
  styleUrls: ['./invoice-case.component.css']
})
export class InvoiceCaseComponent {
  departments = ['Chemical', 'Mechanical', 'Corrosion', 'Spectro', 'Metallurgy'];
  caseTypes = ['element-count', 'range', 'fixed', 'custom'];
  elementsList = ['Au', 'Ag', 'Al', 'Pt', 'Cu', 'Fe', 'Zn'];

  invoiceForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.invoiceForm = this.fb.group({
      department: ['', Validators.required],
      caseType: ['', Validators.required],
      options: this.fb.array([])
    });
  }

  get options(): FormArray {
    return this.invoiceForm.get('options') as FormArray;
  }

  onDepartmentChange(): void {
    const department = this.invoiceForm.get('department')?.value;
    console.log('Department selected:', department);

    // Reset the options list for a new department
    this.options.clear();
  }

  addOption(): void {
    const newOption = this.fb.group({
      label: ['', Validators.required], // Option label
      value: ['', Validators.required], // Option value
      basePrice: [null, Validators.required], // Base price
      alias: [''], // Alias (optional)
      rangeText: [''] // Range text (optional)
    });

    this.options.push(newOption);
  }

  removeOption(index: number): void {
    this.options.removeAt(index);
  }

  isElementCount(): boolean {
    return this.invoiceForm.get('caseType')?.value === 'element-count';
  }

  onSubmit(): void {
    if (this.invoiceForm.valid) {
      console.log(this.invoiceForm.value);
      // Proceed to save or map this data as needed
    } else {
      alert('Please fill in all required fields.');
    }
  }
}
