import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

export interface MachiningSample {
  id: string;
  sampleNo: string;
  test: string;
  method: string;
  material: string;
}

export interface MachiningCase {
  id: string;
  caseNo: string;
  samples: MachiningSample[];
}

@Component({
  selector: 'app-machining-challan',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './machining-challan.component.html',
  styleUrl: './machining-challan.component.css'
})
export class MachiningChallanComponent implements OnInit {

  cases: MachiningCase[] = [
    {
      id: 'case-1',
      caseNo: 'DMSPL-004567',
      samples: [
        { id: 's1', sampleNo: '24-000001', test: 'Tensile Test', method: 'ASTM A370', material: 'Stainless Steel' },
        { id: 's2', sampleNo: '24-000002', test: 'Tensile Test', method: 'ASTM A370', material: 'Stainless Steel' },
        { id: 's3', sampleNo: '24-000003', test: 'Tensile Test', method: 'ASTM A370', material: 'Stainless Steel' },
        { id: 's4', sampleNo: '24-000004', test: 'Tensile Test', method: 'ASTM A370', material: 'Stainless Steel' }
      ]
    }
  ];

  printedList: MachiningSample[] = [];
  challanForm!: FormGroup;

  testOptions = ['Tensile Test', 'Impact Test', 'Hardness Test'];
  methodOptions = ['ASTM A370', 'IS 1608', 'ISO 6892-1'];
  materialOptions = ['Stainless Steel', 'Mild Steel', 'Aluminium'];
  preparationOptions = ['Flat', 'Round', 'Notch'];

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.challanForm = this.fb.group({
      caseId: [null, Validators.required],
      samples: this.fb.array([])
    });
  }

  get samplesFA(): FormArray { return this.challanForm.get('samples') as FormArray; }

  onCaseChange(): void {
    const caseId = this.challanForm.get('caseId')!.value;
    const picked = this.cases.find(c => c.id === caseId);
    while (this.samplesFA.length) this.samplesFA.removeAt(0);
    if (picked) {
      picked.samples.forEach(s => this.samplesFA.push(
        this.fb.group({
          selected: [false],
          id: [s.id],
          sampleNo: [s.sampleNo],
          test: [s.test],
          method: [s.method],
          material: [s.material],
          preparation: ['']
        })
      ));
    }
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.samplesFA.controls.forEach(ctrl => ctrl.get('selected')!.setValue(checked));
  }

  printSelected(): void {
    const selectedSamples: MachiningSample[] = [];
    this.samplesFA.controls = this.samplesFA.controls.filter(ctrl => {
      if (ctrl.get('selected')!.value) {
        selectedSamples.push({
          id: ctrl.get('id')!.value,
          sampleNo: ctrl.get('sampleNo')!.value,
          test: ctrl.get('test')!.value,
          method: ctrl.get('method')!.value,
          material: ctrl.get('material')!.value
        });
        return false;
      }
      return true;
    });
    this.printedList.push(...selectedSamples);
    console.log('PRINT CHALLAN for', selectedSamples.map(s => s.sampleNo));
  }

  reprint(sample: MachiningSample): void {
    console.log('REPRINT CHALLAN for', sample.sampleNo);
  }
  hasSelectedSamples(): boolean {
    return this.samplesFA.controls.some(c => c.get('selected')!.value);
  }
}