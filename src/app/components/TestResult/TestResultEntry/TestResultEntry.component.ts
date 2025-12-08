import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TestResultService } from '../../../services/test-result.service';

@Component({
  selector: 'app-TestResultEntryComponent',
  templateUrl: './TestResultEntry.component.html',
  styleUrls: ['./TestResultEntry.component.css'],
  imports: [ReactiveFormsModule, CommonModule],
})
export class TestResultEntryComponent implements OnInit {


  inward: any = null;
  sample: any = null;
  plans: any[] = [];

  resultForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadDummyData();
    this.buildForm();
  }

  //-----------------------------------------------------
  // 1. Load Dummy Data (No API for now)
  //-----------------------------------------------------
  loadDummyData() {
    this.inward = {
      caseNo: "DMSPL-000001",
      customerName: "Harsh Gujral",
    };

    this.sample = {
      sampleNo: "25-000001",
      material: "TMT",
      metalClassification: "MS",
      productCondition: "Hot Rolled",
      batchNo: "1",
      remarks: "Tensile",
    };

    this.plans = [
      {
        type: "General",
        specification: "IS 1608",
        grade: "Fe500D",
        tests: [
          {
            id: 1,
            name: "Tensile Test",
            standard: "IS 1608",
            reportNo: "25-000001-1",
            parameters: [
              { parameterName: "Yield Strength", unit: "MPa", value: null, remarks: "" },
              { parameterName: "UTS", unit: "MPa", value: null, remarks: "" },
              { parameterName: "% Elongation", unit: "%", value: null, remarks: "" },
            ]
          }
        ]
      },
      {
        type: "Chemical",
        specification: "IS 1786",
        grade: "Fe500D",
        tests: [
          {
            id: 2,
            name: "Spectro Analysis",
            standard: "IS 1786",
            reportNo: "25-000001-2",
            parameters: [
              { parameterName: "C", unit: "%", value: null, remarks: "" },
              { parameterName: "Mn", unit: "%", value: null, remarks: "" },
              { parameterName: "S", unit: "%", value: null, remarks: "" },
            ]
          }
        ]
      }
    ];
  }

  //-----------------------------------------------------
  // 2. Build Main Form
  //-----------------------------------------------------
  buildForm() {
    this.resultForm = this.fb.group({
      plans: this.fb.array(this.plans.map(plan => this.createPlanGroup(plan)))
    });
  }

  get plansFA(): FormArray {
    return this.resultForm.get('plans') as FormArray;
  }

  createPlanGroup(plan: any): FormGroup {
    return this.fb.group({
      type: [plan.type],
      specification: [plan.specification],
      grade: [plan.grade],
      tests: this.fb.array(plan.tests.map((t: any) => this.createTestGroup(t)))
    });
  }

  getTests(planIndex: number): FormArray {
    return this.plansFA.at(planIndex).get('tests') as FormArray;
  }

  createTestGroup(test: any): FormGroup {
    return this.fb.group({
      id: [test.id],
      name: [test.name],
      standard: [test.standard],
      reportNo: [test.reportNo],
      parameters: this.fb.array(test.parameters.map((p: any) => this.createParamGroup(p)))
    });
  }

  getParameters(planIndex: number, testIndex: number): FormArray {
    return this.getTests(planIndex).at(testIndex).get('parameters') as FormArray;
  }

  createParamGroup(p: any): FormGroup {
    return this.fb.group({
      parameterName: [p.parameterName, Validators.required],
      unit: [p.unit],
      value: [p.value],
      remarks: [p.remarks]
    });
  }

  //-----------------------------------------------------
  // Add / Remove Parameter Rows
  //-----------------------------------------------------
  addParameter(planIndex: number, testIndex: number) {
    this.getParameters(planIndex, testIndex).push(
      this.createParamGroup({ parameterName: "", unit: "", value: null, remarks: "" })
    );
  }

  removeParameter(planIndex: number, testIndex: number, paramIndex: number) {
    this.getParameters(planIndex, testIndex).removeAt(paramIndex);
  }

  //-----------------------------------------------------
  // Save / Complete (Later API Integration)
  //-----------------------------------------------------
  saveResults() {
    console.log("SAVE:", this.resultForm.value);
    alert("Results saved.");
  }

  completeResults() {
    console.log("COMPLETE:", this.resultForm.value);
    alert("Test Completed.");
  }
}
