
import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { StandardOrgnizationService } from '../../../services/standard-orgnization.service';
import { ParameterService } from '../../../services/parameter.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';
import { HeatTreatmentService } from '../../../services/heat-treatment.service';
import { ProductConditionService } from '../../../services/product-condition.service';
import { SpecimenOrientationService } from '../../../services/specimen-orientation.service';
import { DimensionalFactorService } from '../../../services/dimensional-factor.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { ToastService } from '../../../services/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-material-specification-form',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NumberOnlyDirective, SearchableDropdownComponent],
  templateUrl: './custom-material-specification-form.component.html',
  styleUrl: './custom-material-specification-form.component.css'
})
export class CustomMaterialSpecificationFormComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('scrollButton') scrollButton!: ElementRef;

  materialSpecificationId: number = 0;
  materialSpecifications: any = null;
  CustomMaterialSpecificationForm!: FormGroup;
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
  private scrollTimeout: any;

  constructor(private fb: FormBuilder, private standardOrganizationService: StandardOrgnizationService,
    private parameterService: ParameterService, private prameterUnitService: ParameterUnitService,
    private heatTreatmentService: HeatTreatmentService, private productConditionService: ProductConditionService,
    private specimenService: SpecimenOrientationService, private dimensionalService: DimensionalFactorService,
    private metalService: MetalClassificationService, private route: ActivatedRoute, private router: Router,
    private materialSpecificationService: MaterialSpecificationService, private toastService: ToastService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.materialSpecificationId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };

    if (state && state.mode === 'view') {
      this.isViewMode = true;
    } else {
      this.isViewMode = false;
    }

    this.initForm();
    this.getParameterUnit();
    this.getSpecimenOrientation();

    if (this.isViewMode) {
      this.CustomMaterialSpecificationForm.disable();
      this.specificationLines.controls.forEach(control => control.disable());
    }
    if (this.materialSpecificationId) {
      this.loadMaterialSpecification();
    }
  }
  
  ngAfterViewInit() {
    this.updateButtonPosition();
  }
  scrollToRight(): void {
    const el = this.scrollContainer.nativeElement;
    el.scrollTo({
      left: el.scrollWidth,   // scroll to the far right
      behavior: 'smooth'      // smooth animation
    });
  }
  updateButtonPosition(): void {
    requestAnimationFrame(() => {
      const scrollEl = this.scrollContainer.nativeElement;
      const btnEl = this.scrollButton.nativeElement;
  
      const visibleRight = scrollEl.scrollLeft + scrollEl.clientWidth;
  
      // Hide button if at end
      if (visibleRight >= scrollEl.scrollWidth - 1) {
        btnEl.style.display = 'none';
      } else {
        btnEl.style.display = 'block';
        btnEl.style.left = `${visibleRight - btnEl.offsetWidth - 10}px`;
      }
    });
  }
  onScroll(): void {
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.updateButtonPosition();
    }, 10); // Adjust delay as needed
  }
  

  initForm() {
    this.CustomMaterialSpecificationForm = this.fb.group({
      id: [0],
      specificationCode: [''],
      standardOrganizationID: [null],
      standard: [''],
      part: [''],
      standardYear: ['', Validators.required],
      grade: [''],
      isUNS: [false],
      unsSteelNumber: [''],
      aliasName: ['', Validators.required],
      metalCalssificationID: [''],
      isCustom: [true],
      specificationLines: this.fb.array([])
    });
  }
  get specificationLines() {
    return this.CustomMaterialSpecificationForm.get('specificationLines') as FormArray;
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

  loadMaterialSpecification() {
    this.materialSpecificationService.getMaterialSpecificationById(this.materialSpecificationId).subscribe({
      next: (data) => {
        this.materialSpecifications = data;
        this.CustomMaterialSpecificationForm.patchValue({
          id: this.materialSpecifications.id,
          specificationCode: this.materialSpecifications.specificationCode,
          standardOrganizationID: this.materialSpecifications.standardOrganizationID,
          standard: this.materialSpecifications.standard,
          part: this.materialSpecifications.part,
          standardYear: this.materialSpecifications.standardYear,
          grade: this.materialSpecifications.grade,
          isUNS: this.materialSpecifications.isUNS,
          unsSteelNumber: this.materialSpecifications.unsSteelNumber,
          aliasName: this.materialSpecifications.aliasName,
          metalCalssificationID: this.materialSpecifications.metalCalssificationID,
          isCustom: this.materialSpecifications.isCustom,
        });
        if (this.materialSpecifications.specificationLines) {
          for (const line of this.materialSpecifications.specificationLines) {
            const specificationLine = this.fb.group({
              id: [line.id],
              specificationHeaderID: [line.specificationHeaderID],
              propertyType: [line.propertyType],
              manualSelection: [line.manualSelection],
              parameterID: [line.parameterID],
              minValue: [line.minValue],
              maxValue: [line.maxValue],
              notes: [line.notes],
              parameterUnitID: [line.parameterUnitID],
              minValueEquation: [line.minValueEquation],
              maxValueEquation: [line.maxValueEquation],
              minTolerance: [line.minTolerance],
              maxTolerance: [line.maxTolerance],
              specimenOrientationID: [line.specimenOrientationID],
              dimensionalFactorID: [line.dimensionalFactorID],
              lowerLimitValue: [line.lowerLimitValue],
              upperLimitValue: [line.upperLimitValue],
              heatTreatmentID: [line.heatTreatmentID],
              productConditionID1: [line.productConditionID1],
              productConditionID2: [line.productConditionID2],
              laboratoryTestID1: [line.laboratoryTestID1],
              laboratoryTestID2: [line.laboratoryTestID2]
            });
            this.specificationLines.push(specificationLine);
          }
        }
        if(this.isViewMode) {
          this.CustomMaterialSpecificationForm.disable();
          this.specificationLines.controls.forEach(control => control.disable());
        }else{
          this.CustomMaterialSpecificationForm.enable();
          this.specificationLines.controls.forEach(control => control.enable());
        }
      },
      error: (error) => {
        console.error('Error fetching material specification:', error);
      }
    });
  }

  onSubmit() {
    console.log('Form submitted:', this.CustomMaterialSpecificationForm.getRawValue());
    if (this.CustomMaterialSpecificationForm.valid) {
      const formValue = this.CustomMaterialSpecificationForm.getRawValue();
      if (this.materialSpecificationId > 0) {
        this.materialSpecificationService.updateMaterialSpecification(formValue).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/custom-material-specification']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
            console.error('Error updating Material Specification:', error);
          }
        });
      } else {
        this.materialSpecificationService.createMaterialSpecification(formValue).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/custom-material-specification']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
            console.error('Error creating Material Specification:', error);
          }
        });
      }
    }
    else {
      this.toastService.show('Please fill all required fields.', 'warning');
      this.CustomMaterialSpecificationForm.markAllAsTouched(); 
    }
  }

  getStandardOrganization = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.standardOrganizationService.getStandardOrganizationDropdown(term, page, pageSize);
  };
  onOrganizationSelected(item: any) {
    this.CustomMaterialSpecificationForm.patchValue({ standardOrganizationID: item.id });
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

  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalService.getMetalClassificationDropdown(term, page, pageSize);
  }
  onMetalClassificationSelected(item: any) {
    this.CustomMaterialSpecificationForm.patchValue({ metalCalssificationID: item.id });
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
