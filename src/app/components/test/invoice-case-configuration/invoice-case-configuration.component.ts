import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-invoice-case-configuration',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './invoice-case-configuration.component.html',
  styleUrl: './invoice-case-configuration.component.css'
})
export class InvoiceCaseConfigurationComponent implements OnInit {
  invoiceForm!: FormGroup;

  selectionTypes = [
    'Element', 'Hours', 'Size', 'Weight', 'Temprature',
    'HoursRange', 'SizeRange', 'WeightRange', 'TempratureRange',
    'SpectroCombination'
  ];

  unitMap: { [key: string]: string } = {
    Element: 'Element',
    Hours: 'hr',
    Size: 'mm',
    Weight: 'kn',
    Temprature: '°C',
    HoursRange: 'hr',
    SizeRange: 'mm',
    WeightRange: 'kn',
    TempratureRange: '°C',
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.invoiceForm = this.fb.group({
      configurations: this.fb.array([]),
    });

    this.addConfiguration(); // one row to start
  }

  get configurations(): FormArray {
    return this.invoiceForm.get('configurations') as FormArray;
  }

  addConfiguration(): void {
    this.configurations.push(
      this.fb.group({
        selectionType: ['', Validators.required],
        name: [''],
        aliasName: [''],
        value: [''],
        start: [''],
        end: [''],
        unit: ['']
      })
    );
  }

  onTypeChange(index: number): void {
    const group = this.configurations.at(index) as FormGroup;
    const type = group.get('selectionType')?.value;

    const isRange = type.toLowerCase().includes('range');
    group.patchValue({
      value: '',
      start: '',
      end: '',
      unit: this.unitMap[type] || ''
    });

    if (isRange) {
      group.get('start')?.setValidators([Validators.required]);
      group.get('end')?.setValidators([Validators.required]);
      group.get('value')?.clearValidators();
    } else {
      group.get('value')?.setValidators([Validators.required]);
      group.get('start')?.clearValidators();
      group.get('end')?.clearValidators();
    }

    group.get('value')?.updateValueAndValidity();
    group.get('start')?.updateValueAndValidity();
    group.get('end')?.updateValueAndValidity();
  }

  updateName(index: number): void {
    const group = this.configurations.at(index) as FormGroup;
    let name = group.get('value')?.value;
    name = name + " " + group.get('unit')?.value;
    group.patchValue({ name: name });

  }
  updateRangeName(index: number): void {
    const group = this.configurations.at(index) as FormGroup;
    let name = group.get('start')?.value + " - " + group.get('end')?.value;
    name = name + " " + group.get('unit')?.value;
    group.patchValue({ name: name });
  }
  submit(): void {
    console.log(this.invoiceForm.value);
  }
}