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
import { Modal } from 'bootstrap';
import { Select2, Select2Option, Select2SearchEvent, Select2UpdateEvent, Select2UpdateValue, Select2Value } from 'ng-select2-component';

@Component({
  selector: 'app-material-specification-form',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NumberOnlyDirective, SearchableDropdownComponent, Select2],
  templateUrl: './material-specification-form.component.html',
  styleUrl: './material-specification-form.component.css'
})
export class MaterialSpecificationFormComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('scrollButton') scrollButton!: ElementRef;

  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  materialSpecificationId: number = 0;
  materialSpecifications: any = null;
  MaterialSpecificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  standardOrganizations: any[] = [];
  parameterUnits: any[] = [];
  specimenOriantations: any[] = [];
  testMethods: any[] = [
    { value: 1, label: 'Test Method 1' },
    { value: 2, label: 'Test Method 2' },
    { value: 3, label: 'Test Method 3' },
    { value: 4, label: 'Test Method 4' },
    { value: 5, label: 'Test Method 5' },
  ];

  selectedStandardOrganization: any = null;
  private scrollTimeout: any;
  currentRowIndex: number = 0;
  productConditionsData: any[] = [];
  filteredProductOptions: any[] = [];

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

    if (state) {
      if (state.mode === 'view') {
        this.isViewMode = true;
      }
      if (state.mode === 'edit') {
        this.isEditMode = true;
      }
    }

    this.initForm();
    this.getParameterUnit();
    this.getSpecimenOrientation();
    this.getProductConditionDropdown();

    if (this.isViewMode) {
      this.MaterialSpecificationForm.disable();
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
        btnEl.style.left = `${visibleRight - btnEl.offsetWidth - 20}px`;
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
      aliasName: [{ value: '', disabled: true }, Validators.required],
      metalCalssificationID: [''],
      isCustom: [false],
      type: [0, Validators.required],
      specificationLines: this.fb.array([])
    });
  }
  get specificationLines() {
    return this.MaterialSpecificationForm.get('specificationLines') as FormArray;
  }

  addSpecificationLine() {
    const specificationLine = this.fb.group({
      id: [0],
      specificationHeaderID: [this.MaterialSpecificationForm.get('id')?.value || 0],
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
      productConditions: this.fb.array([]),
      laboratoryTests: this.fb.array([]),
      productConditionIDs: this.fb.control([]),
      laboratoryTestIDs: this.fb.control([])
    });
    this.specificationLines.push(specificationLine);
  }
  removeSpecificationLine(index: number) {
    this.specificationLines.removeAt(index);
  }
  copySpecificationLine(index: number) {
    const originalLine = this.specificationLines.at(index) as FormGroup;
    const originalValue = originalLine.getRawValue();

    // Deep clone productConditions
    const clonedProductConditions = (originalValue.productConditions || []).map((condition: any) =>
      this.fb.group({
        specificationLineID: [0], // reset ID
        productConditionID: [condition.productConditionID],
        productConditionName: [condition.productConditionName]
      })
    );

    // Deep clone laboratoryTests
    const clonedLaboratoryTests = (originalValue.laboratoryTests || []).map((test: any) =>
      this.fb.group({
        specificationLineID: [0], // reset ID
        laboratoryTestID: [test.laboratoryTestID],
        laboratoryTestName: [test.laboratoryTestName]
      })
    );

    // Create new line
    const newLine = this.fb.group({
      id: [0], // always reset to 0 when copying
      specificationHeaderID: [originalValue.specificationHeaderID],
      propertyType: [originalValue.propertyType],
      manualSelection: [originalValue.manualSelection],
      parameterID: [originalValue.parameterID],
      minValue: [originalValue.minValue],
      maxValue: [originalValue.maxValue],
      notes: [originalValue.notes],
      parameterUnitID: [originalValue.parameterUnitID],
      minValueEquation: [originalValue.minValueEquation],
      maxValueEquation: [originalValue.maxValueEquation],
      minTolerance: [originalValue.minTolerance],
      maxTolerance: [originalValue.maxTolerance],
      specimenOrientationID: [originalValue.specimenOrientationID],
      dimensionalFactorID: [originalValue.dimensionalFactorID],
      lowerLimitValue: [originalValue.lowerLimitValue],
      upperLimitValue: [originalValue.upperLimitValue],
      heatTreatmentID: [originalValue.heatTreatmentID],
      productConditionIDs: this.fb.control([...originalValue.productConditionIDs || []]),
      laboratoryTestIDs: this.fb.control([...originalValue.laboratoryTestIDs || []]),
      productConditions: this.fb.array(clonedProductConditions),
      laboratoryTests: this.fb.array(clonedLaboratoryTests)
    });

    this.specificationLines.insert(index + 1, newLine);
  }


  loadMaterialSpecification() {
    this.materialSpecificationService.getMaterialSpecificationById(this.materialSpecificationId).subscribe({
      next: (data) => {
        this.materialSpecifications = data;
        this.MaterialSpecificationForm.patchValue({
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

            let selectedIds: any[] = [];
            let selectedTestIds: any[] = [];
            if (line.productConditions) {
              line.productConditions.forEach((conditions: any) => {
                selectedIds.push(conditions.productConditionID);
              });
            }
            if (line.laboratoryTests) {
              line.laboratoryTests.forEach((test: any) => {
                selectedTestIds.push(test.laboratoryTestID);
              });
            }

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
              laboratoryTestIDs: [selectedTestIds],
              productConditionIDs: [selectedIds],
              productConditions: this.fb.array(
                line?.productConditions?.map((condition: any) => {
                  return this.fb.group({
                    specificationLineID: [condition.specificationLineID],
                    productConditionID: [condition.productConditionID],
                    productConditionName: [condition.productConditionName]
                  });
                }) || []
              ),
              laboratoryTests: this.fb.array(
                line?.laboratoryTests?.map((test: any) => {
                  return this.fb.group({
                    specificationLineID: [test.specificationLineID],
                    laboratoryTestID: [test.laboratoryTestID],
                    laboratoryTestName: [test.laboratoryTestName]
                  });
                }) || []
              )
            });

            this.specificationLines.push(specificationLine);
          }
        }
        if (this.isViewMode) {
          this.MaterialSpecificationForm.disable();
          this.specificationLines.controls.forEach(control => control.disable());
        } else {
          this.MaterialSpecificationForm.enable();
          this.specificationLines.controls.forEach(control => control.enable());
        }
      },
      error: (error) => {
        console.error('Error fetching material specification:', error);
      }
    });
  }

  generateSpecificationName() {
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
      this.MaterialSpecificationForm.patchValue({ aliasName: code });
    }
  }

  onSubmit() {
    const formValue = this.MaterialSpecificationForm.getRawValue();
    if (this.MaterialSpecificationForm.valid)
      this.saveData(formValue);
    else {
      this.toastService.show('Please fill all required fields.', 'warning');
      this.MaterialSpecificationForm.markAllAsTouched();
    }

  }

  saveData(formValue: any) {
    if (this.isEditMode) {
      this.materialSpecificationService.updateMaterialSpecification(formValue).subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          this.router.navigate(['/material-specification']);
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
          this.router.navigate(['/material-specification']);
        },
        error: (error) => {
          this.toastService.show(error.message, 'error');
          console.error('Error creating Material Specification:', error);
        }
      });
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
  getProductConditionDropdown() {
    this.productConditionService.getProductConditionDropdown("", 0, 100).subscribe({
      next: (data) => {
        this.filteredProductOptions = data.map((item: any) => ({
          label: item.name,
          value: item.id
        } as any)
        );
        this.productConditionsData = this.filteredProductOptions;
      },
      error: (error) => {
        console.error('Error fetching product conditions:', error);
      }
    });
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
    this.MaterialSpecificationForm.patchValue({ metalCalssificationID: item.id });
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

  openModal(index: number): void {
    this.currentRowIndex = index;
    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  onProductConditionChange(selectedIds: Select2UpdateEvent<Select2UpdateValue>) {
    const line = this.specificationLines.at(this.currentRowIndex) as FormGroup;
    const productConditionsArray = line.get('productConditions') as FormArray;

    // Reset and rebuild array
    productConditionsArray.clear();
    selectedIds?.options?.forEach(item => {
      const selectedOption = this.productConditionsData.find((x: any) => x.value === item.value) as Select2Option;
      if (selectedOption) {
        productConditionsArray.push(this.fb.group({
          id: [0],
          specificationLineID: [line.get('id')?.value || 0],
          productConditionID: [item.value],
          productConditionName: [selectedOption?.label || '']
        }));
      }
    });
  }

  onProductConditionSearch(term: Select2SearchEvent<Select2UpdateValue>) {
    console.log('Search term:', term.search);
    this.filteredProductOptions = this.productConditionsData.filter((option) =>
      option.label.toLowerCase().includes(term.search.toLowerCase())
    );

  }
  onLaboratoryTestChange(selectedIds: Select2UpdateEvent<Select2UpdateValue>) {
    const line = this.specificationLines.at(this.currentRowIndex) as FormGroup;
    const labTestsArray = line.get('laboratoryTests') as FormArray;
    // Reset and rebuild array
    labTestsArray.clear();
    selectedIds?.options?.forEach(item => {
      const selectedOption = this.testMethods.find((x: any) => x.value === item.value) as Select2Option;
      if (selectedOption) {
        labTestsArray.push(this.fb.group({
          id: [0],
          specificationLineID: [line.get('id')?.value || 0],
          laboratoryTestID: [item.value],
          laboratoryTestName: [selectedOption?.label || '']
        }));
      }
    });
  }

  copyMaterialSpecification() {
    const raw = this.MaterialSpecificationForm.getRawValue();
    raw.id = 0;
    raw.specificationLines.forEach((line: any) => {
      line.id = 0;
      line.specificationHeaderID = 0;
      line.productConditions?.forEach((pc: any) => pc.specificationLineID = 0);
      line.laboratoryTests?.forEach((lt: any) => lt.specificationLineID = 0);
    });
    this.isEditMode = false;
    this.saveData(raw);

  }

  // spinning icon
  spinningIndex: number | null = null;
  rotateOnce(index: number) {
    this.spinningIndex = index;
    setTimeout(() => {
      if (this.spinningIndex === index) {
        this.spinningIndex = null;
      }
    }, 1000);

    this.openModal(index); // optional
  }


}
