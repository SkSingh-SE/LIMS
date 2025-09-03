import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-review-of-request',
  templateUrl: './review-of-request.component.html',
  styleUrl: './review-of-request.component.css',
  imports: [CommonModule, ReactiveFormsModule]
})
export class ReviewOfRequestComponent implements OnInit {
  reviewForm!: FormGroup;
  yearCode: string = new Date().getFullYear().toString().slice(-2);
  globalTestCounter = 1;
  sampleNumbers: string[] = [];
  testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
    // For demo, add one sample and one test plan
    this.addSamplePlan();
  }

  private initForm(): void {
    this.reviewForm = this.fb.group({
      sampleTestPlans: this.fb.array([]),
      sampleDetails: this.fb.array([]),
      sampleAdditionalDetails: this.fb.array([]),
    });
  }

  get sampleTestPlans(): FormArray {
    return this.reviewForm.get('sampleTestPlans') as FormArray;
  }
  get sampleDetails(): FormArray {
    return this.reviewForm.get('sampleDetails') as FormArray;
  }
  get sampleAdditionalDetails(): FormArray {
    return this.reviewForm.get('sampleAdditionalDetails') as FormArray;
  }

  addSamplePlan(): void {
    const sampleNo = `${this.yearCode}-000001`;
    this.sampleNumbers.push(sampleNo);

    // Add dummy sample details
    this.sampleDetails.push(this.fb.group({
      sampleNo: [sampleNo],
      details: ['Sample 1'],
      category: ['Raw Material'],
      nature: ['Solid'],
      remarks: [''],
      quantity: [1]
    }));

    // Add dummy additional details
    this.sampleAdditionalDetails.push(this.fb.group({
      label: ['Heat No'],
      enabled: [true],
      values: this.fb.array([this.fb.control('12345')])
    }));

    // Add test plan
    const generalTestGroup = this.createGeneralTestGroup();
    const generalReportNo = `${sampleNo}-1`;
    const generalUrlNo = this.generateUrlNo(this.globalTestCounter);
    (generalTestGroup.get('methods') as FormArray).push(this.createTestMethodRow(generalReportNo, generalUrlNo));

    this.sampleTestPlans.push(this.fb.group({
      sampleNo: [sampleNo],
      generalTests: this.fb.array([generalTestGroup]),
      chemicalTests: this.fb.array([])
    }));

    this.globalTestCounter++;
  }

  getTestArray(i: number, type: 'generalTests' | 'chemicalTests'): FormArray {
    return this.sampleTestPlans.at(i).get(type) as FormArray;
  }
  getGeneralTestSection(i: number): FormGroup {
    return (this.sampleTestPlans.at(i).get('generalTests') as FormArray).at(0) as FormGroup;
  }
  getMethodRows(i: number): FormArray {
    const sectionArray = this.sampleTestPlans.at(i).get('generalTests') as FormArray;
    if (!sectionArray || sectionArray.length === 0) return this.fb.array([]);
    const section = sectionArray.at(0) as FormGroup;
    return section.get('methods') as FormArray;
  }
  addTestBlock(i: number, type: 'generalTests' | 'chemicalTests'): void {
    const array = this.getTestArray(i, type);
    const sampleNo = this.sampleNumbers[i];
    const reportN = array.length + 1;
    const reportNo = `${this.yearCode}-${sampleNo}-${reportN.toString().padStart(6, '0')}`;
    const urlNo = this.generateUrlNo(this.globalTestCounter);

    if (type === 'generalTests') {
      array.push(this.createGeneralTestGroup());
    } else if (type === 'chemicalTests') {
      array.push(this.createChemicalTestGroup(reportNo, urlNo));
    }
    this.globalTestCounter++;
  }
  createGeneralTestGroup(): FormGroup {
    return this.fb.group({
      sampleNo: [''],
      specification1: [''],
      specification2: [''],
      parameter: [''],
      methods: this.fb.array([])
    });
  }
  createChemicalTestGroup(reportNo: string, urlNo: string): FormGroup {
    const testTypesGroup: { [key: string]: any } = {};
    this.testTypeList.forEach(type => {
      testTypesGroup[type] = this.fb.control(false);
    });
    return this.fb.group({
      sampleNo: [''],
      reportNo: [reportNo || ''],
      urlNo: [urlNo || ''],
      testTypes: this.fb.group(testTypesGroup),
      metalClassificationID: [''],
      specification1: [''],
      specification2: [''],
      testMethod: [''],
      elements: this.fb.array([])
    });
  }
  createTestMethodRow(reportNo: string, urlNo: string): FormGroup {
    return this.fb.group({
      testMethodID: [''],
      standardID: [''],
      quantity: ['1'],
      reportNo: [reportNo],
      ulrNo: [urlNo],
      cancel: [false]
    });
  }
  generateUrlNo(counter: number): string {
    return `TC5098${this.yearCode}${counter.toString().padStart(9, '0')}F`;
  }
  asFormGroup(ctrl: AbstractControl | null): FormGroup {
    return ctrl as FormGroup;
  }
}
