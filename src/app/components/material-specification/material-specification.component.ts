import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NumberOnlyDirective } from '../../utility/directives/number-only.directive';
import { StandardOrgnizationService } from '../../services/standard-orgnization.service';
import { ParameterService } from '../../services/parameter.service';
import { Observable } from 'rxjs';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ParameterUnitService } from '../../services/parameter-unit.service';
import { HeatTreatmentService } from '../../services/heat-treatment.service';
import { ProductConditionService } from '../../services/product-condition.service';
import { SpecimenOrientationService } from '../../services/specimen-orientation.service';
import { DimensionalFactorService } from '../../services/dimensional-factor.service';

@Component({
  selector: 'app-material-specification',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NumberOnlyDirective, SearchableDropdownComponent],
  templateUrl: './material-specification.component.html',
  styleUrl: './material-specification.component.css'
})
export class MaterialSpecificationComponent implements OnInit {
  materialSpecifications: any[] = [];
  MaterialSpecificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  standardOrganizations: any[] = [];
  parameterUnits: any[] = [];
  specimenOriantations: any[] = [];
  testMethods: any[] = [
    { id: 1, name: 'Test Method 1' },
    { id: 2, name: 'Test Method 2' },
    { id: 3, name: 'Test Method 3' },
    { id: 4, name: 'Test Method 4' },
    { id: 5, name: 'Test Method 5' },
  ];
  selectedStandardOrganization: any = null;

  constructor(private fb: FormBuilder, private standardOrganizationService: StandardOrgnizationService,
    private parameterService: ParameterService, private prameterUnitService: ParameterUnitService,
    private heatTreatmentService: HeatTreatmentService, private productConditionService: ProductConditionService,
    private specimenService: SpecimenOrientationService, private dimensionalService: DimensionalFactorService) { }

  ngOnInit(): void {
    this.initForm();
    this.getParameterUnit();
  }
  initForm() {
    this.MaterialSpecificationForm = this.fb.group({
      id: [0],
      specificationCode: [''],
      standardOrganizationID: ['', Validators.required],
      standard: ['', Validators.required],
      part: [''],
      standardYear: ['', Validators.required],
      grade: [''],
      isUNS: [false],
      unsSteelNumber: [''],
      aliasName: [''],
      metalCalssificationID: [''],
      specificationLines: this.fb.array([])
    });
  }
  get specificationLines() {
    return this.MaterialSpecificationForm.get('specificationLines') as FormArray;
  }
  addSpecificationLine() {
    const specificationLine = this.fb.group({
      id: [0],
      specificationHeaderID: [0],
      propertyType: [''],
      manualSelection: [false],
      parameterID: [''],
      minValue: [null],
      maxValue: [null],
      notes: [''],
      parameterUnitID: [''],
      minValueEquation: [0],
      maxValueEquation: [0],
      minTolerance: [0],
      maxTolerance: [0],
      specimenOrientationID: [''],
      dimensionalFactorID: [0],
      lowerLimitValue: [null],
      upperLimitValue: [null],
      heatTreatmentID: [''],
      productConditionID1: [''],
      productConditionID2: [''],
      laboratoryTestID1: [''],
      laboratoryTestID2: [''],
    });
    this.specificationLines.push(specificationLine);
  }
  removeSpecificationLine(index: number) {
    this.specificationLines.removeAt(index);
  }
  generateSpecificationCode() {
    debugger;
    let code = '';
    const standardOrganizationName = this.selectedStandardOrganization?.name;
    if (standardOrganizationName) {
      code = `${standardOrganizationName}`;
    }
    const standard = this.MaterialSpecificationForm.get('standard')?.value;
    if (standard) {
      code += `-${standard}`;
    }
    const part = this.MaterialSpecificationForm.get('part')?.value;
    if (part) {
      code += `-${part}`;
    }
    const standardYear = this.MaterialSpecificationForm.get('standardYear')?.value;
    if (standardYear) {
      code += `-${standardYear}`;
    }
    const grade = this.MaterialSpecificationForm.get('grade')?.value;
    if (grade) {
      code += `-${grade}`;
    }
    const isUNS = this.MaterialSpecificationForm.get('isUNS')?.value;
    if (isUNS) {
      const unsSteelNumber = this.MaterialSpecificationForm.get('unsSteelNumber')?.value;
      if (unsSteelNumber) {
        code += `-${unsSteelNumber}`;
      }
    }

    if (code.length > 0) {
      this.MaterialSpecificationForm.patchValue({ specificationCode: code });
    }
  }
  onSubmit() {
    if (this.MaterialSpecificationForm.valid) {
      console.log(this.MaterialSpecificationForm.value);
      // Perform your submission logic here
    } else {
      console.log('Form is invalid');
    }
  }

  getStandardOrganization = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.standardOrganizationService.getStandardOrganizationDropdown(term, page, pageSize);
  };
  onOrganizationSelected(item: any) {
    this.MaterialSpecificationForm.patchValue({ standardOrganizationID: item.id });
    this.selectedStandardOrganization = item;
  }
  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }
  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };
  onParameterSelected(item: any, index: number) {
    const specificationLine = this.specificationLines.at(index) as FormGroup;
    specificationLine.patchValue({ parameterID: item.id });
  }
  getHeatTreatment = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.heatTreatmentService.getHeatTreatmentDropdown(term, page, pageSize);
  };
  onHeatTreatmentSelected(item: any, index: number) {
    const specificationLine = this.specificationLines.at(index) as FormGroup;
    specificationLine.patchValue({ heatTreatmentID: item.id });
  }
  getProductCondition = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.productConditionService.getProductConditionDropdown(term, page, pageSize);
  };
  onProductConditionSelected(item: any, index: number, controlName: string) {
    // Check if the control name is valid
    if (controlName !== 'productConditionID1' && controlName !== 'productConditionID2') {
      console.error('Invalid control name:', controlName);
      return;
    }
    const specificationLine = this.specificationLines.at(index) as FormGroup;
    specificationLine.patchValue({ [controlName]: item.id });
  }

  getDimensionalFactor = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.dimensionalService.getDimensionalFactorDropdown(term, page, pageSize);
  }
  onDimensionalFactorSelected(item: any, index: number) {
    const specificationLine = this.specificationLines.at(index) as FormGroup;
    specificationLine.patchValue({ dimensionalFactorID: item.id });
  }

  getParameterUnit() {
    this.prameterUnitService.getParameterUnitDropdown("", 0, 100).subscribe({
      next: (data) => {
        this.parameterUnits = data;
      },
      error: (error) => {
        console.error('Error fetching parameter units:', error);
      }
    });
  };
  getSpecimenOrientation() {
    this.specimenService.getSpecimenOrientationDropdown("", 0, 100).subscribe({
      next: (data) => {
        this.specimenOriantations = data;
      },
      error: (error) => {
        console.error('Error fetching specimen orientation:', error);
      }
    });
  }

}
