
import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild , HostListener } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { StandardOrgnizationService } from '../../../services/standard-orgnization.service';
import { YearHelper } from '../../../utility/helper/year.helper';
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
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
  selector: 'app-material-specification-form',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent],
  templateUrl: './custom-material-specification-form.component.html',
  styleUrl: './custom-material-specification-form.component.css'
})
export class CustomMaterialSpecificationFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('scrollButton') scrollButton!: ElementRef;

  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;
  private scrollTimeout: any;

  materialSpecificationId: number = 0;
  materialSpecifications: any = null;
  MaterialSpecificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  yearOptions: number[] = YearHelper.standardYears();
  isCopyMode: boolean = false;
  standardOrganizations: any[] = [];
  parameterUnits: any[] = [];
  specimenOriantations: any[] = [];

  selectedStandardOrganization: any = null;
  productConditionsData: any[] = [];
  filteredProductOptions: any[] = [];

  submitted = false;
  openSections: { [key: string]: boolean } = { header: true };
  openGrades: { [key: number]: boolean } = { 0: true };

  selectedGradeIndex = 0;
  selectedSpecTab: { [gradeIndex: number]: string } = { 0: 'chemical' };
  currentTab: 'chemical' | 'mechanical' | 'other' = 'chemical';
  currentGradeIndex: number = 0;
  currentLineIndex: number = 0;
  modalVisible = false;

  lowerLimitOptions = [
    { label: '>', value: '>' },
    { label: '≥', value: '≥' },
    { label: '=', value: '=' }
  ];
  upperLimitOptions = [
    { label: '<', value: '<' },
    { label: '≤', value: '≤' },
    { label: '=', value: '=' }
  ];

  constructor(
    private fb: FormBuilder,
    private standardOrganizationService: StandardOrgnizationService,
    private parameterService: ParameterService,
    private prameterUnitService: ParameterUnitService,
    private heatTreatmentService: HeatTreatmentService,
    private productConditionService: ProductConditionService,
    private specimenService: SpecimenOrientationService,
    private dimensionalService: DimensionalFactorService,
    private metalService: MetalClassificationService,
    private route: ActivatedRoute,
    private router: Router,
    private materialSpecificationService: MaterialSpecificationService,
    private toastService: ToastService,
    private labTestService: LaboratoryTestService
  , private unsavedChangesService: UnsavedChangesService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
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
      if (state.mode === 'copy') {
        this.isCopyMode = true;
      }
    }

    this.initForm();
    this.getParameterUnit();
    this.getSpecimenOrientation();

    if (this.isViewMode) {
      this.MaterialSpecificationForm.disable();

    }
    if (this.materialSpecificationId) {
      this.loadMaterialSpecification();
    } else {
      this.addGrade();
      this.addSpecificationLine(0, 'chemical');
    }
  }

  initForm() {
    this.MaterialSpecificationForm = this.fb.group({
      id: [0],
      standardOrganizationID: [null],
      standard: [''],
      part: [''],
      standardYear: [''],
      aliasName: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      isCustom: [true],
      grades: this.fb.array([]),
    });
    // Custom specification: no standard fields shown, set aliasName as editable
    this.MaterialSpecificationForm.get('aliasName')?.enable();
  }
  get grades() {
    return this.MaterialSpecificationForm.get('grades') as FormArray;
  }

  private minMaxValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const min = group.get('minValue')?.value;
    const max = group.get('maxValue')?.value;
    if (min != null && max != null && min > max) {
      return { minGreaterThanMax: true };
    }
    return null;
  }

  private atLeastOneSpecLineValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const lines = group.get('specificationLines') as FormGroup;
    if (!lines) return null;
    const chemCount = (lines.get('chemical') as FormArray)?.length || 0;
    const mechCount = (lines.get('mechanical') as FormArray)?.length || 0;
    return (chemCount + mechCount) > 0 ? null : { noSpecLine: true };
  }

  addGrade() {
    const gradeGroup = this.fb.group({
      id: [0],
      specificationHeaderID: [this.MaterialSpecificationForm.get('id')?.value || 0],
      grade: ['', Validators.required],
      isUNS: [false],
      unsSteelNumber: [''],
      metalClassificationID: [null],
      specificationLines: this.fb.group({
        chemical: this.fb.array([]),
        mechanical: this.fb.array([]),
        other: this.fb.array([]),
      }),
    }, { validators: this.atLeastOneSpecLineValidator });
    this.openGrades[this.grades.length] = true;
    this.grades.push(gradeGroup);
  }

  removeGrade(index: number) {
    this.grades.removeAt(index);
  }

  getSpecificationLinesByTab(gradeIndex: number, tab: 'chemical' | 'mechanical' | 'other'): FormArray {
    const linesGroup = this.grades.at(gradeIndex).get('specificationLines') as FormGroup;
    return linesGroup.get(tab) as FormArray;
  }


  createSpecificationLineFormGroup(tab: 'chemical' | 'mechanical' | 'other'): FormGroup {
    return this.fb.group({
      id: [0],
      gradeID: [0],
      manualSelection: [false],
      parameterID: [null, Validators.required],
      minValue: [null, Validators.required],
      maxValue: [null, Validators.required],
      notes: [''],
      parameterUnitID: [null],
      minValueEquation: [0],
      maxValueEquation: [0],
      minTolerance: [0],
      maxTolerance: [0],
      specimenOrientationID: [null],
      dimensionalFactorID: [null],
      lowerLimitValue: [''],
      upperLimitValue: [''],
      heatTreatmentID: [null],
      productConditionID1: [null],
      productConditionID2: [null],
      laboratoryTests: this.fb.array([]),
      laboratoryTestIDs: this.fb.control([]),
      type: [tab]
    }, { validators: this.minMaxValidator });
  }

  addSpecificationLine(gradeIndex: number, tab: 'chemical' | 'mechanical' | 'other') {
    const lines = this.getSpecificationLinesByTab(gradeIndex, tab);
    lines.push(this.createSpecificationLineFormGroup(tab));
  }
  removeSpecificationLine(gradeIndex: number, lineIndex: number, tab: 'chemical' | 'mechanical' | 'other') {
    this.getSpecificationLinesByTab(gradeIndex, tab).removeAt(lineIndex);
  }
  getCurrentSpecificationLineFormGroup(tab: 'chemical' | 'mechanical' | 'other'): FormGroup {
    return this.getSpecificationLinesByTab(this.currentGradeIndex, tab)?.at(this.currentLineIndex) as FormGroup;
  }

  loadMaterialSpecification() {
    this.materialSpecificationService
      .getMaterialSpecificationById(this.materialSpecificationId)
      .subscribe({
        next: (data) => {
          this.MaterialSpecificationForm.patchValue({
            id: data.id,
            standardOrganizationID: data.standardOrganizationID,
            standard: data.standard,
            part: data.part,
            standardYear: data.standardYear,
            aliasName: data.aliasName,
            isCustom: data.isCustom
          });
          this.grades.clear(); // Clear existing grades if any

          data.grades?.forEach((grade: any) => {
            this.addGrade(); // Push a blank grade form

            const gradeIndex = this.grades.length - 1;
            const gradeGroup = this.grades.at(gradeIndex);

            gradeGroup.patchValue({
              id: grade.id,
              specificationHeaderID: grade.specificationHeaderID,
              grade: grade.grade,
              isUNS: grade.isUNS,
              unsSteelNumber: grade.unsSteelNumber,
              metalClassificationID: grade.metalClassificationID // typo from backend
            });

            const linesGroup = gradeGroup.get('specificationLines') as FormGroup;

            // Group lines by type and push them into their respective arrays
            grade.specificationLines?.forEach((line: any) => {
              const tab = line.type as 'chemical' | 'mechanical' | 'other';
              const formArray = linesGroup.get(tab) as FormArray;
              const lineGroup = this.createSpecificationLineFormGroup(tab);
              lineGroup.patchValue({
                id: line.id,
                gradeID: line.gradeID,
                manualSelection: line.manualSelection,
                parameterID: line.parameterID,
                minValue: line.minValue,
                maxValue: line.maxValue,
                notes: line.notes,
                parameterUnitID: line.parameterUnitID,
                minValueEquation: line.minValueEquation,
                maxValueEquation: line.maxValueEquation,
                minTolerance: line.minTolerance,
                maxTolerance: line.maxTolerance,
                specimenOrientationID: line.specimenOrientationID,
                dimensionalFactorID: line.dimensionalFactorID,
                lowerLimitValue: line.lowerLimitValue,
                upperLimitValue: line.upperLimitValue,
                heatTreatmentID: line.heatTreatmentID,
                productConditionID1: line.productConditionID1,
                productConditionID2: line.productConditionID2,
                laboratoryTestIDs: line.laboratoryTests?.map((lt: any) => lt.laboratoryTestID) || []
              });
              if (line.parameterID) {
                lineGroup.get('parameterUnitID')?.disable();
              }
              formArray.push(lineGroup);
            });
          });


          if (this.isViewMode) {
            this.MaterialSpecificationForm.disable();

          } else {
            this.MaterialSpecificationForm.enable();
          }
        },
        error: (error: any) => {
          this.toastService.show(error?.error?.message || 'Failed to load material specification', 'error');
        },
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
    const standardYear =
      this.MaterialSpecificationForm.get('standardYear')?.value;
    if (standardYear) {
      code += `-${standardYear}`;
    }

    if (code.length > 0) {
      this.MaterialSpecificationForm.patchValue({ aliasName: code });
    }
  }

  onSubmit() {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.MaterialSpecificationForm);
    this.grades.controls.forEach(g => g.markAsTouched());
    const formValue = this.MaterialSpecificationForm.getRawValue();
    const formattedData = this.formatedPayload(formValue);
    if (this.MaterialSpecificationForm.valid) {
      this.saveData(formattedData);
    } else {
      this.toastService.show('Please fill all required fields.', 'warning');
    }
  }
  formatedPayload(formValue: any): any {
    const formattedData = { ...formValue }; // shallow copy

    formattedData.grades = formValue?.grades?.map((grade: any) => {
      const { chemical = [], mechanical = [], other = [] } = grade.specificationLines || {};

      // Combine all specificationLines into one flat array
      const combinedSpecificationLines = [...chemical, ...mechanical, ...other];

      return {
        ...grade,
        specificationLines: combinedSpecificationLines
      };
    });
    return formattedData;
  }

  saveData(formValue: any) {
    if (this.isEditMode) {
      this.materialSpecificationService
        .updateMaterialSpecification(formValue)
        .subscribe({
          next: (response) => {
            this.saved = true;
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/custom-material-specification']);
          },
          error: (error) => {
            this.toastService.show(error?.error?.message || 'Operation failed', 'error');
          },
        });
    } else {
      this.materialSpecificationService
        .createMaterialSpecification(formValue)
        .subscribe({
          next: (response) => {
            this.saved = true;
            this.toastService.show(response.message, 'success');
            this.router.navigate(['/custom-material-specification']);
          },
          error: (error) => {
            this.toastService.show(error?.error?.message || 'Operation failed', 'error');
          },
        });
    }
  }

  getStandardOrganization = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.standardOrganizationService.getStandardOrganizationDropdown(term, page, pageSize);
  };
  onOrganizationSelected(item: any) {
    this.MaterialSpecificationForm.patchValue({
      standardOrganizationID: item.id,
    });
    this.selectedStandardOrganization = item;
  }
  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }
  getParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };
  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getChemicalParameterDropdown(term, page, pageSize);
  };
  getMechanicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getMechanicalParameterDropdown(term, page, pageSize);
  };
  onParameterSelected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const lines = this.getSpecificationLinesByTab(gradeIndex, tab);
    if (!item) {
      const specificationLine = lines.at(index) as FormGroup;
      specificationLine.patchValue({ parameterID: null });
      return;
    }
    const isDuplicate = lines.controls.some((ctrl, i) =>
      i !== index && ctrl.get('parameterID')?.value === item.id
    );
    if (isDuplicate) {
      this.toastService.show(`Parameter "${item.name}" is already added in this section.`, 'warning');
      const specificationLine = lines.at(index) as FormGroup;
      specificationLine.patchValue({ parameterID: -1, parameterUnitID: null });
      setTimeout(() => specificationLine.patchValue({ parameterID: '', parameterUnitID: null }), 0);
      return;
    }
    const specificationLine = lines.at(index) as FormGroup;
    const unitID = item?.additionalValues?.UnitID || item?.additionalValues?.unitID || '';
    specificationLine.patchValue({
      parameterID: item.id,
      parameterUnitID: unitID
    });
    // Disable unit dropdown after parameter auto-fills it
    const unitControl = specificationLine.get('parameterUnitID');
    if (unitID) {
      unitControl?.disable();
    } else {
      unitControl?.enable();
    }
  }
  getHeatTreatment = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.heatTreatmentService.getHeatTreatmentDropdown(term, page, pageSize);
  };
  onHeatTreatmentSelected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    if (!item) {
      specificationLine.patchValue({ heatTreatmentID: null });
      return;
    }
    specificationLine.patchValue({ heatTreatmentID: item.id });
  }
  getProductCondition = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.productConditionService.getProductConditionDropdown(term, page, pageSize);
  };
  onProductCondition1Selected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    if (!item) {
      specificationLine.patchValue({ productConditionID1: null });
      return;
    }
    specificationLine.patchValue({ productConditionID1: item.id });
  }
  onProductCondition2Selected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    if (!item) {
      specificationLine.patchValue({ productConditionID2: null });
      return;
    }
    specificationLine.patchValue({ productConditionID2: item.id });
  }

  getDimensionalFactor = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.dimensionalService.getDimensionalFactorDropdown(term, page, pageSize);
  };
  onDimensionalFactorSelected(item: any, gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    const specificationLine = this.getSpecificationLinesByTab(gradeIndex, tab).at(index) as FormGroup;
    if (!item) {
      specificationLine.patchValue({ dimensionalFactorID: null });
      return;
    }
    specificationLine.patchValue({ dimensionalFactorID: item.id });
  }

  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalService.getMetalClassificationDropdown(term, page, pageSize);
  };

  getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.labTestService.getLaboratoryTestDropdown(term, page, pageSize);
  }
  onMetalClassificationSelected(item: any, gradeIndex: number) {
    const grade = this.grades.at(gradeIndex);
    if (!item) {
      grade.patchValue({ metalClassificationID: null });
      return;
    }
    grade.patchValue({
      metalClassificationID: item.id,
    });
  }

  getParameterUnit() {
    this.prameterUnitService.getParameterUnitDropdown('', 0, 100).subscribe({
      next: (data) => {
        this.parameterUnits = data;
      },
      error: (error: any) => {
        this.toastService.show(error?.error?.message || 'Failed to load parameter units', 'error');
      },
    });
  }
  getSpecimenOrientation() {
    this.specimenService.getSpecimenOrientationDropdown('', 0, 100).subscribe({
      next: (data) => {
        this.specimenOriantations = data;
      },
      error: (error: any) => {
        this.toastService.show(error?.error?.message || 'Failed to load specimen orientations', 'error');
      },
    });
  }

  openModal(gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other'): void {
    this.currentGradeIndex = gradeIndex;
    this.currentLineIndex = index;
    this.modalVisible = true;
    this.currentTab = tab;
    // Wait for modal DOM to be rendered
    setTimeout(() => {
      this.bsModal = new Modal(this.modalElement.nativeElement);
      this.bsModal.show();
    });

  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.MaterialSpecificationForm.reset();
    this.MaterialSpecificationForm.enable();
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onLaboratoryTestChange(selectedItems: any[], tab: 'chemical' | 'mechanical' | 'other') {
    const line = this.getSpecificationLinesByTab(this.currentGradeIndex, tab).at(this.currentLineIndex) as FormGroup;
    const labTestsArray = line.get('laboratoryTests') as FormArray;
    const selectIds: number[] = [];
    // Reset and rebuild array
    labTestsArray.clear();
    selectedItems?.forEach((item) => {
      selectIds.push(item.id);
        labTestsArray.push(
          this.fb.group({
            specificationLineID: [line.get('id')?.value || 0],
            laboratoryTestID: [item.id]
          })
        );
    });
    line.patchValue({laboratoryTestIDs : selectIds})
  }

  copyMaterialSpecification() {
    const raw = this.MaterialSpecificationForm.getRawValue();
    const formatedData = this.formatedPayload(raw);
    this.isEditMode = false;
    this.saveData(formatedData);
  }

  toggleSection(section: string) {
    this.openSections[section] = !this.openSections[section];
  }

  toggleGrade(gradeIndex: number) {
    this.openGrades[gradeIndex] = !this.openGrades[gradeIndex];
    if (this.openGrades[gradeIndex]) {
      this.selectedSpecTab[gradeIndex] = this.selectedSpecTab[gradeIndex] || 'chemical';
    }
  }

  scrollToEnd(gradeIndex: number, tab: string) {
    const container = document.getElementById(`scroll-${tab}-${gradeIndex}`);
    if (container) container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
  }

  scrollToStart(gradeIndex: number, tab: string) {
    const container = document.getElementById(`scroll-${tab}-${gradeIndex}`);
    if (container) container.scrollTo({ left: 0, behavior: 'smooth' });
  }

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  // spinning icon
  spinningIndex: number | null = null;
  rotateOnce(gradeIndex: number, index: number, tab: 'chemical' | 'mechanical' | 'other') {
    this.spinningIndex = index;
    setTimeout(() => {
      if (this.spinningIndex === index) {
        this.spinningIndex = null;
      }
    }, 1000);

    this.openModal(gradeIndex, index, tab); // optional
  }
  selectSpecTab(gradeIndex: number, tab: string) {
    this.selectedSpecTab[gradeIndex] = tab;
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.MaterialSpecificationForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.MaterialSpecificationForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
