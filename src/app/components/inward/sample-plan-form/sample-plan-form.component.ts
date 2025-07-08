import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-sample-plan-form',
  imports: [CommonModule,FormsModule,ReactiveFormsModule],
  templateUrl: './sample-plan-form.component.html',
  styleUrl: './sample-plan-form.component.css'
})
export class SamplePlanFormComponent implements OnInit {

  planningForm!: FormGroup;
  cases = [
    {
      id: 'case-1',
      caseNo: 'DMSPL-004567',
      samples: [
        { id: 's1', sampleNo: '24-000001' },
        { id: 's2', sampleNo: '24-000002' },
        { id: 's3', sampleNo: '24-000003' }
      ]
    }
  ];

  productTypes = ['Forging', 'Casting', 'Sheet'];
  materialClasses = ['Carbon Steel', 'Stainless Steel', 'Aluminium'];
  testOptions = ['Tensile Test', 'Impact Test', 'Hardness Test'];
  methodOptions = ['ASTM A370', 'IS 1608', 'ISO 6892-1'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.planningForm = this.fb.group({
      caseId: [null],
      samples: this.fb.array([])
    });
  }

  get samplesFA(): FormArray {
    return this.planningForm.get('samples') as FormArray;
  }

  onCaseSelect(): void {
    const caseId = this.planningForm.get('caseId')!.value;
    const selectedCase = this.cases.find(c => c.id === caseId);
    this.samplesFA.clear();
    if (selectedCase) {
      selectedCase.samples.forEach(s => this.samplesFA.push(
        this.fb.group({
          sampleNo: [s.sampleNo],
          productType: [''],
          materialClass: [''],
          test: [''],
          method: ['']
        })
      ));
    }
  }

  savePlanning(): void {
    console.log('Planned Samples:', this.planningForm.value);
  }
}
