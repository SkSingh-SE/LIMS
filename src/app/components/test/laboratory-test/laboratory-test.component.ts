import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../services/department.service';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { AnalysisTechniqueService } from '../../../services/analysis-technique.service';
import { ParameterService } from '../../../services/parameter.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { EquipmentService } from '../../../services/equipment.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { ProductMasterService } from '../../../services/product-master.service';
import { InvoiceCaseConfigurationService } from '../../../services/invoice-case-configuration.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-laboratory-test',
  templateUrl: './laboratory-test.component.html',
  styleUrl: './laboratory-test.component.css',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SearchableDropdownComponent,
    RouterLink,
    FormFieldErrorComponent
  ]
})
export class LaboratoryTestComponent implements OnInit {
  // Master List Tree State
  testMethodsList: any[] = [];
  deptsTree: any[] = [];
  searchTermLeft: string = '';

  // Active Test ID / Mode State
  labTestForm!: FormGroup;
  submitted = false;
  labTestId: number = 0;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  testNameSuggestions: string[] = [];

  private nameSearchSubject = new Subject<string>();

  // Detail Right Panel Tabs
  activeTab: 'overview' | 'techniques' | 'parameters' | 'methods' | 'equipment' | 'specifications' | 'invoicing' = 'overview';

  // SubGroups / AnalysisTypes Technical Tree Config Mappings
  subGroups: any[] = [];
  selectedSubGroup: any = null;
  selectedSubGroupDetails: any = null;
  selectedAnalysisType: any = null;
  selectedAnalysisTypeDetails: any = null;

  // Selected dropdown IDs for technical mappings flow
  activeSubGroupId: number | null = null;
  activeAnalysisTypeId: number | null = null;

  // New Node Modals / Add Forms
  showAddSubGroupForm = false;
  showAddAnalysisTypeForm = false;
  subGroupForm!: FormGroup;
  analysisTypeForm!: FormGroup;

  // Mapping Configuration Forms
  subGroupConfigForm!: FormGroup;
  analysisTypeConfigForm!: FormGroup;

  // Masters loaded for mapping selectors
  allTechniquesMaster: any[] = [];

  // Collapsible Sections State
  sectionsExpanded: { [key: string]: boolean } = {
    techs: false,
    params: false,
    methods: false,
    equipments: false,
    specs: false
  };

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private route: ActivatedRoute,
    public router: Router,
    private labService: LaboratoryTestService,
    private toastService: ToastService,
    private metalService: MetalClassificationService,
    private techMasterService: AnalysisTechniqueService,
    private parameterService: ParameterService,
    private methodService: TestMethodSpecificationService,
    private equipmentService: EquipmentService,
    private materialSpecService: MaterialSpecificationService,
    private productMasterService: ProductMasterService,
    private invoiceCaseConfigService: InvoiceCaseConfigurationService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      this.labTestId = idParam ? Number(idParam) : 0;
      this.isEditMode = this.labTestId > 0;
      this.submitted = false;

      // Re-read history state mode
      const state = history.state as { mode?: string };
      if (state) {
        if (state.mode === 'view') {
          this.isViewMode = true;
        } else if (state.mode === 'edit') {
          this.isEditMode = true;
          this.isViewMode = false;
        }
      }

      this.initForm();
      this.initNodeForms();
      this.resetSelectionStates();

      if (this.labTestId > 0) {
        this.getLabTestById(this.labTestId);
        this.loadSubGroups();
      }
    });

    this.loadAllTests();
    this.loadTechniquesMaster();
    this.loadTestNameSuggestions('');

    this.nameSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.loadTestNameSuggestions(term);
    });
  }

  resetSelectionStates() {
    this.selectedSubGroup = null;
    this.selectedSubGroupDetails = null;
    this.selectedAnalysisType = null;
    this.selectedAnalysisTypeDetails = null;
    this.activeSubGroupId = null;
    this.activeAnalysisTypeId = null;
    this.showAddSubGroupForm = false;
    this.showAddAnalysisTypeForm = false;
    this.activeTab = 'overview';
  }

  openEditMode() {
    if (this.labTestId > 0) {
      this.router.navigate(['/test/edit', this.labTestId], { state: { mode: 'edit' } });
    }
  }

  duplicateTest() {
    if (this.labTestId <= 0) return;
    this.labService.duplicateLaboratoryTest(this.labTestId).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Test duplicated successfully.', 'success');
        const newId = res.id;
        this.loadAllTests();
        if (newId) {
          this.router.navigate(['/test/edit', newId], { state: { mode: 'edit' } });
        }
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Failed to duplicate test.', 'error');
      }
    });
  }

  initForm() {
    this.labTestForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      labDepartmentID: [null, Validators.required],
      isChemicalTest: [false],
      isMechanical: [true]
    });

    this.labTestForm.get('isChemicalTest')?.valueChanges.subscribe(isChem => {
      this.labTestForm.patchValue({
        isMechanical: !isChem
      }, { emitEvent: false });
      this.checkTabVisibility();
    });
  }

  initNodeForms() {
    this.subGroupForm = this.fb.group({
      name: ['', Validators.required],
      reportTestName: ['', Validators.required],
      testDuration: [null, [Validators.min(1)]],
      metalClassificationID: [null]
    });

    // Auto sync reportTestName when name input is typed in subgroup form
    this.subGroupForm.get('name')?.valueChanges.subscribe(val => {
      if (val && !this.subGroupForm.get('reportTestName')?.dirty) {
        this.subGroupForm.patchValue({ reportTestName: val }, { emitEvent: false });
      }
    });

    this.analysisTypeForm = this.fb.group({
      name: ['', Validators.required],
      testDuration: [null, [Validators.min(1)]],
      metalClassificationID: [null]
    });
  }

  loadTestNameSuggestions(term: string) {
    this.labService.getDistinctTestNames(term, 30).subscribe({
      next: (names) => { this.testNameSuggestions = names || []; },
      error: () => { this.testNameSuggestions = []; }
    });
  }

  onTestNameInput(event: any) {
    const value = event.target.value;
    this.nameSearchSubject.next(value);
  }

  // Cascading dropdown fetch functions
  getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.departmentService.getDepartmentDropdown(term, page, pageSize);
  };

  getMetals = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalService.getMetalClassificationDropdown(term, page, pageSize);
  };

  getParameters = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(term, page, pageSize);
  };

  getMethods = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.methodService.getTestMethodSpecificationVersionDropdown(term, page, pageSize);
  };

  getEquipments = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.equipmentService.getEquipmentDropdown(term, page, pageSize);
  };

  getProductMasters = (searchTerm: string, pageNumber: number = 0, pageSize: number = 20) => this.productMasterService.getDropdown(searchTerm, pageNumber, pageSize);
  getMaterialSpecs = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.materialSpecService.getMaterialSpecificationGradeDropdown(term, page, pageSize);
  };

  getInvoiceCaseConfigs = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.invoiceCaseConfigService.getInvoiceCaseConfigDropdown(term, page, pageSize);
  };

  loadTechniquesMaster() {
    this.techMasterService.getAllAnalysisTechniques({ PageNumber: 1, PageSize: 1000, filter: [] }).subscribe({
      next: (res) => {
        this.allTechniquesMaster = res?.items || [];
      }
    });
  }

  loadAllTests() {
    const filter = {
      PageNumber: 1,
      PageSize: 1000,
      searchTerm: this.searchTermLeft,
      sortByColumn: 'Name',
      sortOrder: 'asc',
      filter: []
    };
    this.labService.getAllLaboratoryTests(filter).subscribe({
      next: (res) => {
        this.testMethodsList = res?.items || [];
        this.buildDepartmentTree();
      }
    });
  }

  buildDepartmentTree() {
    const groups: { [key: string]: { id: number, tests: any[] } } = {};
    this.testMethodsList.forEach(t => {
      const deptName = t.departmentName || 'Unassigned';
      const deptId = t.labDepartmentID || 0;
      if (!groups[deptName]) {
        groups[deptName] = { id: deptId, tests: [] };
      }
      groups[deptName].tests.push(t);
    });

    this.deptsTree = Object.keys(groups).map(name => ({
      departmentName: name,
      departmentId: groups[name].id,
      tests: groups[name].tests,
      isExpanded: true
    }));
  }

  getLabTestById(id: number) {
    this.labService.getLaboratoryTestById(id).subscribe({
      next: (response) => {
        this.labTestForm.patchValue(response);
        if (this.isViewMode) {
          this.labTestForm.disable();
        } else if (this.isEditMode) {
          // Rule: user should not be allowed to update department and Type on edit mode
          this.labTestForm.get('labDepartmentID')?.disable();
          this.labTestForm.get('isChemicalTest')?.disable();
        }
      },
      error: (err) => {
        this.toastService.show(err.message || 'Failed to load details.', 'error');
      }
    });
  }

  loadSubGroups(): void {
    this.labService.getSubGroupsByLabTest(this.labTestId).subscribe({
      next: (list) => {
        this.subGroups = list || [];
        if (this.subGroups.length > 0) {
          // If previous subgroup is still in list, keep it selected, else select first
          const found = this.subGroups.find(x => x.id === this.activeSubGroupId);
          this.selectSubGroup(found || this.subGroups[0]);
        } else {
          this.resetSelectionStates();
        }
      },
      error: () => this.toastService.show('Failed to load sub-groups.', 'error')
    });
  }

  onDepartmentSelected(department: any) {
    if (department) {
      this.labTestForm.patchValue({
        labDepartmentID: department.id
      });
      const additionalIsChem = department.additionalValues?.isChemical ?? department.additionalValues?.['isChemical'] ?? department.additionalValues?.IsChemical ?? department.additionalValues?.['IsChemical'];
      const isChem = additionalIsChem !== undefined ? !!additionalIsChem : (department.name || '').toLowerCase().includes('chem');
      this.labTestForm.patchValue({
        isChemicalTest: isChem
      });
    } else {
      this.labTestForm.patchValue({
        labDepartmentID: null,
        isChemicalTest: false
      });
    }
  }

  isFieldInvalid(path: string): boolean {
    const ctrl = this.labTestForm.get(path);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  isSubGroupFieldInvalid(path: string): boolean {
    const ctrl = this.subGroupConfigForm?.get(path);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  isAnalysisTypeFieldInvalid(path: string): boolean {
    const ctrl = this.analysisTypeConfigForm?.get(path);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  // --- SubGroup Selection and Configurations ---
  onSubGroupDropdownChange(subGroupId: any) {
    const found = this.subGroups.find(x => x.id === Number(subGroupId));
    if (found) {
      this.selectSubGroup(found);
    } else {
      this.resetSelectionStates();
    }
  }

  selectSubGroup(sg: any) {
    this.selectedSubGroup = sg;
    this.activeSubGroupId = sg.id;
    this.selectedAnalysisType = null;
    this.selectedAnalysisTypeDetails = null;
    this.activeAnalysisTypeId = null;

    this.checkTabVisibility();

    this.labService.getSubGroupDetails(sg.id).subscribe({
      next: (data) => {
        this.selectedSubGroupDetails = data;
        this.initSubGroupConfigForm(data);
      }
    });
  }

  initSubGroupConfigForm(data: any) {
    this.subGroupConfigForm = this.fb.group({
      id: [data.id],
      laboratoryTestID: [data.laboratoryTestID],
      name: [data.name, Validators.required],
      reportTestName: [data.reportTestName, Validators.required],
      testDuration: [data.testDuration, [Validators.min(1)]],
      metalClassificationID: [data.metalClassificationID]
    });

    const params = this.fb.array([]) as FormArray;
    if (data.parameters) {
      data.parameters.forEach((p: any) => params.push(this.createParameterGroup(p)));
    }
    this.subGroupConfigForm.addControl('parameters', params);

    const methods = this.fb.array([]) as FormArray;
    if (data.testMethods) {
      data.testMethods.forEach((m: any) => methods.push(this.createMethodGroup(m)));
    }
    this.subGroupConfigForm.addControl('testMethods', methods);

    const equipments = this.fb.array([]) as FormArray;
    if (data.equipments) {
      data.equipments.forEach((e: any) => equipments.push(this.createEquipmentGroup(e)));
    }
    this.subGroupConfigForm.addControl('equipments', equipments);

    const specs = this.fb.array([]) as FormArray;
    if (data.specifications) {
      data.specifications.forEach((s: any) => specs.push(this.createSpecificationGroup(s)));
    }
    this.subGroupConfigForm.addControl('specifications', specs);

    const invoiceCases = this.fb.array([]) as FormArray;
    if (data.invoiceCases) {
      data.invoiceCases.forEach((ic: any) => invoiceCases.push(this.createInvoiceCaseGroup(ic)));
    }
    this.subGroupConfigForm.addControl('invoiceCases', invoiceCases);

    if (this.isViewMode) {
      this.subGroupConfigForm.disable();
    }
  }

  // --- SubGroup Technical Sub-arrays Getters ---
  get subGroupParams(): FormArray { return this.subGroupConfigForm?.get('parameters') as FormArray; }
  get subGroupMethods(): FormArray { return this.subGroupConfigForm?.get('testMethods') as FormArray; }
  get subGroupEquipments(): FormArray { return this.subGroupConfigForm?.get('equipments') as FormArray; }
  get subGroupSpecifications(): FormArray { return this.subGroupConfigForm?.get('specifications') as FormArray; }
  get subGroupInvoiceCases(): FormArray { return this.subGroupConfigForm?.get('invoiceCases') as FormArray; }

  // --- AnalysisType Selection and Configurations ---
  onAnalysisTypeDropdownChange(analysisTypeId: any) {
    const found = this.selectedSubGroupDetails?.analysisTypes?.find((x: any) => x.id === Number(analysisTypeId));
    if (found) {
      this.selectAnalysisType(found);
    } else {
      this.selectedAnalysisType = null;
      this.selectedAnalysisTypeDetails = null;
      this.activeAnalysisTypeId = null;
    }
  }

  selectAnalysisType(at: any) {
    this.selectedAnalysisType = at;
    this.activeAnalysisTypeId = at.id;
    this.checkTabVisibility();
    this.labService.getAnalysisTypeDetails(at.id).subscribe({
      next: (data) => {
        this.selectedAnalysisTypeDetails = data;
        this.initAnalysisTypeConfigForm(data);
      }
    });
  }

  initAnalysisTypeConfigForm(data: any) {
    this.analysisTypeConfigForm = this.fb.group({
      id: [data.id],
      laboratoryTestSubGroupID: [data.laboratoryTestSubGroupID],
      name: [data.name, Validators.required],
      testDuration: [data.testDuration, [Validators.min(1)]],
      metalClassificationID: [data.metalClassificationID]
    });

    const allowedTechs = this.fb.array([]) as FormArray;
    if (data.allowedTechniques) {
      data.allowedTechniques.forEach((t: any) => allowedTechs.push(this.createAllowedTechniqueGroup(t)));
    }
    this.analysisTypeConfigForm.addControl('allowedTechniques', allowedTechs);

    const params = this.fb.array([]) as FormArray;
    if (data.parameters) {
      data.parameters.forEach((p: any) => params.push(this.createParameterGroup(p)));
    }
    this.analysisTypeConfigForm.addControl('parameters', params);

    const methods = this.fb.array([]) as FormArray;
    if (data.testMethods) {
      data.testMethods.forEach((m: any) => methods.push(this.createMethodGroup(m)));
    }
    this.analysisTypeConfigForm.addControl('testMethods', methods);

    const equipments = this.fb.array([]) as FormArray;
    if (data.equipments) {
      data.equipments.forEach((e: any) => equipments.push(this.createEquipmentGroup(e)));
    }
    this.analysisTypeConfigForm.addControl('equipments', equipments);

    const specs = this.fb.array([]) as FormArray;
    if (data.specifications) {
      data.specifications.forEach((s: any) => specs.push(this.createSpecificationGroup(s)));
    }
    this.analysisTypeConfigForm.addControl('specifications', specs);

    const invoiceCases = this.fb.array([]) as FormArray;
    if (data.invoiceCases) {
      data.invoiceCases.forEach((ic: any) => invoiceCases.push(this.createInvoiceCaseGroup(ic)));
    }
    this.analysisTypeConfigForm.addControl('invoiceCases', invoiceCases);

    if (this.isViewMode) {
      this.analysisTypeConfigForm.disable();
    }
  }

  // --- AnalysisType Technical Sub-arrays Getters ---
  get analysisTypeParams(): FormArray { return this.analysisTypeConfigForm?.get('parameters') as FormArray; }
  get analysisTypeMethods(): FormArray { return this.analysisTypeConfigForm?.get('testMethods') as FormArray; }
  get analysisTypeEquipments(): FormArray { return this.analysisTypeConfigForm?.get('equipments') as FormArray; }
  get analysisTypeSpecifications(): FormArray { return this.analysisTypeConfigForm?.get('specifications') as FormArray; }
  get analysisTypeInvoiceCases(): FormArray { return this.analysisTypeConfigForm?.get('invoiceCases') as FormArray; }
  get analysisTypeAllowedTechniques(): FormArray { return this.analysisTypeConfigForm?.get('allowedTechniques') as FormArray; }

  // --- FormArray FormGroups Creation Helpers ---
  createParameterGroup(p?: any): FormGroup {
    const rawName = p?.parameter?.name || p?.additionalValues?.PureName || p?.parameterName || p?.name || p?.Name || '';
    const cleanName = rawName.replace(/\s*-\s*\((Chemical|Mechanical|Observation)\)$/i, '');
    const symbol = p?.parameter?.symbol || p?.parameterSymbol || p?.additionalValues?.Symbol || p?.symbol || p?.Symbol || '';
    const unit = p?.parameter?.parameterUnit?.name || p?.parameterUnit || p?.additionalValues?.Unit || p?.unitName || p?.parameterUnitName || p?.parameterUnit?.Name || '';
    return this.fb.group({
      id: [p?.id || 0],
      parameterID: [p?.parameterID || p?.parameter?.id || p?.parameter?.ID || p?.id || p?.ID || null, Validators.required],
      parameterName: [cleanName],
      parameterSymbol: [symbol],
      parameterUnit: [unit],
      isMandatory: [p?.isMandatory || false],
      isReportable: [p?.isReportable || true],
      sequence: [p?.sequence || 0]
    });
  }

  createMethodGroup(m?: any): FormGroup {
    const methodSpec = m?.testMethodSpecification || m?.testMethodSpecificationVersion?.testMethodSpecification;
    const specName = methodSpec?.name || m?.testMethodName || '';
    const standard = methodSpec?.testMethodStandard || m?.standard || m?.additionalValues?.TestMethodStandard || '';
    const version = m?.testMethodSpecificationVersion?.version || m?.version || m?.additionalValues?.Version || '';
    
    return this.fb.group({
      id: [m?.id || 0],
      testMethodSpecificationID: [m?.testMethodSpecificationID || null],
      testMethodSpecificationVersionID: [m?.testMethodSpecificationVersionID || null, Validators.required],
      testMethodName: [specName],
      standard: [standard],
      version: [version],
      isDefault: [m?.isDefault || false]
    });
  }

  createEquipmentGroup(e?: any): FormGroup {
    const model = e?.equipment?.modelNo || e?.modelNo || e?.additionalValues?.ModelNo || '';
    const manufacturer = e?.equipment?.internalExternal || e?.manufacturer || e?.additionalValues?.Manufacturer || '';
    return this.fb.group({
      id: [e?.id || 0],
      equipmentID: [e?.equipmentID || null, Validators.required],
      equipmentName: [e?.equipment?.name || e?.equipmentName || ''],
      modelNo: [model],
      manufacturer: [manufacturer],
      isDefault: [e?.isDefault || false]
    });
  }

  createSpecificationGroup(s?: any): FormGroup {
    const isProduct = s?.specificationType === 'Product' || !!s?.productMasterID || !!s?.productSpecificationID;
    const type = isProduct ? 'Product' : 'Material';

    let specDisplayName = s?.specName || s?.specDisplayName || '';

    if (!specDisplayName || specDisplayName.trim() === '') {
      const aliasName = s?.materialSpecification?.aliasName || s?.materialSpecification?.displayTitle || s?.materialSpecification?.title || '';
      const gradeName = s?.specificationGrade?.grade || s?.specificationGradeName || s?.gradeName || '';

      if (type === 'Material') {
        if (aliasName && gradeName) {
          specDisplayName = `${aliasName} - ${gradeName}`;
        } else if (aliasName) {
          specDisplayName = aliasName;
        } else if (gradeName) {
          specDisplayName = gradeName;
        } else {
          specDisplayName = s?.name || 'Material Specification';
        }
      } else {
        specDisplayName = s?.productMaster?.displayTitle || s?.productMaster?.productName || s?.productMasterName || s?.productSpecification?.specificationName || s?.name || 'Product Master';
      }
    }

    return this.fb.group({
      id: [s?.id || 0],
      specificationType: [type, Validators.required],
      specificationHeaderID: [type === 'Material' ? (s?.specificationHeaderID || s?.materialSpecification?.id || null) : null],
      specificationGradeID: [type === 'Material' ? (s?.specificationGradeID || s?.specificationGrade?.id || null) : null],
      productMasterID: [type === 'Product' ? (s?.productMasterID || s?.productSpecificationID || s?.productMaster?.id || null) : null],
      specName: [specDisplayName]
    });
  }

  createInvoiceCaseGroup(i?: any): FormGroup {
    return this.fb.group({
      id: [i?.id || 0],
      invoiceCaseConfigID: [i?.invoiceCaseConfigID || null, Validators.required],
      invoiceCaseConfigName: [i?.invoiceCaseConfiguration?.name || i?.invoiceCaseConfiguration?.aliasName || i?.invoiceCaseConfigName || ''],
      description: [i?.invoiceCaseConfiguration?.description || i?.description || ''],
      createdOn: [i?.invoiceCaseConfiguration?.createdOn || i?.createdOn || '']
    });
  }

  createAllowedTechniqueGroup(t?: any): FormGroup {
    return this.fb.group({
      id: [t?.id || 0],
      analysisTechniqueID: [t?.analysisTechniqueID || null, Validators.required]
    });
  }

  // Checkbox bindings for Chemical Allowed Techniques mapping
  isTechniqueChecked(techId: number): boolean {
    const arr = this.analysisTypeConfigForm?.get('allowedTechniques') as FormArray;
    if (!arr) return false;
    return arr.controls.some(ctrl => ctrl.get('analysisTechniqueID')?.value === techId);
  }

  onTechniqueCheckboxChange(techId: number, event: any) {
    if (this.isViewMode) return;
    const arr = this.analysisTypeConfigForm.get('allowedTechniques') as FormArray;
    if (event.target.checked) {
      arr.push(this.createAllowedTechniqueGroup({ analysisTechniqueID: techId }));
    } else {
      const idx = arr.controls.findIndex(ctrl => ctrl.get('analysisTechniqueID')?.value === techId);
      if (idx >= 0) {
        arr.removeAt(idx);
      }
    }
  }

  // Toggle sections collapse/expand
  toggleSection(sectionName: string) {
    this.sectionsExpanded[sectionName] = !this.sectionsExpanded[sectionName];
  }

  // --- Dynamic Items Push Actions ---
  addParamRow(form: FormGroup, item: any) {
    if (!item) return;
    const arr = form.get('parameters') as FormArray;
    if (arr.value.some((p: any) => p.parameterID === item.id)) {
      this.toastService.show('Parameter already added.', 'warning');
      return;
    }
    arr.push(this.createParameterGroup({
      parameterID: item.id,
      parameterName: item.Name || item.name,
      additionalValues: item.additionalValues,
      sequence: arr.length
    }));
  }

  removeParamRow(form: FormGroup, idx: number) {
    const arr = form.get('parameters') as FormArray;
    arr.removeAt(idx);
  }

  addMethodRow(form: FormGroup, item: any) {
    if (!item) return;
    const arr = form.get('testMethods') as FormArray;
    if (arr.value.some((m: any) => m.testMethodSpecificationVersionID === item.id)) {
      this.toastService.show('Method already added.', 'warning');
      return;
    }
    arr.push(this.createMethodGroup({
      testMethodSpecificationID: item.additionalValues?.TestMethodSpecificationID || null,
      testMethodSpecificationVersionID: item.id,
      testMethodName: item.Name || item.name,
      additionalValues: item.additionalValues,
      isDefault: arr.length === 0
    }));
  }

  removeMethodRow(form: FormGroup, idx: number) {
    const arr = form.get('testMethods') as FormArray;
    arr.removeAt(idx);
  }

  setMethodDefault(form: FormGroup, index: number) {
    const arr = form.get('testMethods') as FormArray;
    arr.controls.forEach((ctrl, i) => {
      ctrl.patchValue({ isDefault: i === index });
    });
  }

  addEquipmentRow(form: FormGroup, item: any) {
    if (!item) return;
    const arr = form.get('equipments') as FormArray;
    if (arr.value.some((e: any) => e.equipmentID === item.id)) {
      this.toastService.show('Equipment already added.', 'warning');
      return;
    }
    arr.push(this.createEquipmentGroup({
      equipmentID: item.id,
      equipmentName: item.Name || item.name,
      additionalValues: item.additionalValues,
      isDefault: arr.length === 0
    }));
  }

  removeEquipmentRow(form: FormGroup, idx: number) {
    const arr = form.get('equipments') as FormArray;
    arr.removeAt(idx);
  }

  setEquipmentDefault(form: FormGroup, index: number) {
    const arr = form.get('equipments') as FormArray;
    arr.controls.forEach((ctrl, i) => {
      ctrl.patchValue({ isDefault: i === index });
    });
  }

  addSpecRow(formGroup: FormGroup, item: any, type: 'Material' | 'Product') {
    if (!formGroup || !item) return;
    const arr = formGroup.get('specifications') as FormArray;
    if (!arr) return;

    const isMaterial = type === 'Material';
    const itemId = Number(item.id || item.Id || 0);

    if (!itemId) {
      this.toastService.show('Invalid item selected.', 'error');
      return;
    }

    const exists = arr.controls.some((ctrl: any) => {
      const s = ctrl.value;
      if (isMaterial) {
        return s.specificationType === 'Material' && Number(s.specificationGradeID) === itemId;
      } else {
        return s.specificationType === 'Product' && Number(s.productMasterID) === itemId;
      }
    });

    if (exists) {
      this.toastService.show(`${isMaterial ? 'Material Specification' : 'Product Master'} already added.`, 'warning');
      return;
    }

    const displayName = item.name || item.Name || item.text || item.title || item.code || '';

    arr.push(this.createSpecificationGroup({
      id: 0,
      specificationType: type,
      specificationHeaderID: null,
      specificationGradeID: isMaterial ? itemId : null,
      productMasterID: isMaterial ? null : itemId,
      specName: displayName
    }));
    arr.markAsDirty();
  }

  removeSpecRow(form: FormGroup, idx: number) {
    const arr = form.get('specifications') as FormArray;
    arr.removeAt(idx);
  }

  addInvoiceCaseRow(form: FormGroup, item: any) {
    if (!item) return;
    const arr = form.get('invoiceCases') as FormArray;
    if (arr.value.some((ic: any) => ic.invoiceCaseConfigID === item.id)) {
      this.toastService.show('Invoice case config already linked.', 'warning');
      return;
    }
    arr.push(this.createInvoiceCaseGroup({
      invoiceCaseConfigID: item.id,
      invoiceCaseConfigName: item.Name || item.name || item.aliasName,
      description: item.additionalValues?.Description || item.additionalValues?.Name || '',
      createdOn: new Date()
    }));
  }

  removeInvoiceCaseRow(form: FormGroup, idx: number) {
    const arr = form.get('invoiceCases') as FormArray;
    arr.removeAt(idx);
  }

  // --- Node CRUD Initiators ---
  startAddSubGroup() {
    this.showAddSubGroupForm = true;
    this.subGroupForm.reset();
  }

  saveNewSubGroup() {
    if (this.subGroupForm.invalid) {
      this.toastService.show('Sub-Group name and Report Test Name are required.', 'warning');
      return;
    }
    const payload = {
      ...this.subGroupForm.value,
      laboratoryTestID: this.labTestId
    };
    this.labService.createSubGroup(payload).subscribe({
      next: (res) => {
        this.toastService.show('Sub-Group added successfully.', 'success');
        this.showAddSubGroupForm = false;
        this.activeSubGroupId = res.id;
        this.loadSubGroups();
      },
      error: (err) => this.toastService.show(err.error?.message || 'Create failed.', 'error')
    });
  }

  deleteActiveSubGroup() {
    if (!this.activeSubGroupId) return;
    if (!confirm('Are you sure you want to delete this subgroup and all its mappings?')) return;
    this.labService.deleteSubGroup(this.activeSubGroupId).subscribe({
      next: () => {
        this.toastService.show('Sub-Group deleted successfully.', 'success');
        this.activeSubGroupId = null;
        this.selectedSubGroup = null;
        this.selectedSubGroupDetails = null;
        this.loadSubGroups();
      },
      error: (err) => this.toastService.show(err.error?.message || 'Delete failed.', 'error')
    });
  }

  startAddAnalysisType() {
    if (!this.selectedSubGroup) return;
    this.showAddAnalysisTypeForm = true;
    this.analysisTypeForm.reset();
  }

  saveNewAnalysisType() {
    if (this.analysisTypeForm.invalid) {
      this.toastService.show('Analysis Type name is required.', 'warning');
      return;
    }
    const subgroupToKeep = this.selectedSubGroup;
    const payload = {
      ...this.analysisTypeForm.value,
      laboratoryTestSubGroupID: subgroupToKeep.id
    };
    this.labService.createAnalysisType(payload).subscribe({
      next: (res) => {
        this.toastService.show('Analysis Type added successfully.', 'success');
        this.showAddAnalysisTypeForm = false;
        
        // Reload subgroups tree list immediately from backend
        this.labService.getSubGroupsByLabTest(this.labTestId).subscribe({
          next: (list) => {
            this.subGroups = list || [];
            
            // Find updated subgroup and select the new analysis type
            const foundSubGroup = this.subGroups.find(x => x.id === subgroupToKeep.id);
            if (foundSubGroup) {
              this.selectedSubGroup = foundSubGroup;
              this.activeSubGroupId = foundSubGroup.id;
              
              const foundAnalysisType = foundSubGroup.analysisTypes?.find((at: any) => at.id === res.id);
              if (foundAnalysisType) {
                this.selectAnalysisType(foundAnalysisType);
              } else {
                this.selectSubGroup(foundSubGroup);
              }
            }
          }
        });
      },
      error: (err) => this.toastService.show(err.error?.message || 'Create failed.', 'error')
    });
  }

  deleteActiveAnalysisType() {
    if (!this.activeAnalysisTypeId) return;
    if (!confirm('Are you sure you want to delete this Analysis Type?')) return;
    const subgroupToKeep = this.selectedSubGroup;
    this.labService.deleteAnalysisType(this.activeAnalysisTypeId).subscribe({
      next: () => {
        this.toastService.show('Analysis Type deleted.', 'success');
        this.activeAnalysisTypeId = null;
        this.selectedAnalysisType = null;
        this.selectedAnalysisTypeDetails = null;
        
        // Reload subgroups tree list immediately
        this.labService.getSubGroupsByLabTest(this.labTestId).subscribe({
          next: (list) => {
            this.subGroups = list || [];
            const foundSubGroup = this.subGroups.find(x => x.id === subgroupToKeep.id);
            if (foundSubGroup) {
              this.selectSubGroup(foundSubGroup);
            } else if (this.subGroups.length > 0) {
              this.selectSubGroup(this.subGroups[0]);
            } else {
              this.resetSelectionStates();
            }
          }
        });
      },
      error: (err) => this.toastService.show(err.error?.message || 'Delete failed.', 'error')
    });
  }

  // --- SAVE WORKFLOWS ---
  saveSubGroupConfig() {
    if (this.subGroupConfigForm.invalid) {
      this.toastService.show('Please fix the validation errors.', 'warning');
      return;
    }
    this.labService.updateSubGroup(this.subGroupConfigForm.value).subscribe({
      next: () => {
        this.toastService.show('Sub-Group technical configuration saved successfully.', 'success');
        this.loadSubGroups();
      },
      error: (err) => this.toastService.show(err.error?.message || 'Update failed.', 'error')
    });
  }

  saveAnalysisTypeConfig() {
    if (this.analysisTypeConfigForm.invalid) {
      this.toastService.show('Please fix the validation errors.', 'warning');
      return;
    }
    this.labService.updateAnalysisType(this.analysisTypeConfigForm.value).subscribe({
      next: () => {
        this.toastService.show('Analysis Type technical configuration saved successfully.', 'success');
        this.loadSubGroups();
      },
      error: (err) => this.toastService.show(err.error?.message || 'Update failed.', 'error')
    });
  }

  // Save Main Laboratory Test metadata
  submit(): void {
    this.submitted = true;
    if (this.labTestForm.invalid) {
      this.toastService.show('Please fix validation errors in General Info.', 'warning');
      return;
    }

    if (this.labTestId > 0) {
      // Rule: read raw value because some fields are disabled in edit mode
      this.labService.updateLaboratoryTest(this.labTestForm.getRawValue()).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Saved successfully.', 'success');
          this.labTestForm.markAsPristine();
          this.loadAllTests();
        },
        error: (error) => {
          this.toastService.show(error.message || 'Save failed.', 'error');
        }
      });
    } else {
      this.labService.createLaboratoryTest(this.labTestForm.value).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Created successfully.', 'success');
          this.router.navigate(['/test/edit', response.id], { replaceUrl: true });
        },
        error: (error) => {
          this.toastService.show(error.message || 'Creation failed.', 'error');
        }
      });
    }
  }

  // --- REDESIGN UTILITY TREE HELPERS ---
  getActiveConfigForm(): FormGroup | null {
    if (this.activeAnalysisTypeId) {
      return this.analysisTypeConfigForm;
    } else if (this.activeSubGroupId) {
      return this.subGroupConfigForm;
    }
    return null;
  }

  getActiveParameters(): FormArray {
    const form = this.getActiveConfigForm();
    return (form?.get('parameters') as FormArray) || this.fb.array([]);
  }

  getActiveMethods(): FormArray {
    const form = this.getActiveConfigForm();
    return (form?.get('testMethods') as FormArray) || this.fb.array([]);
  }

  getActiveEquipments(): FormArray {
    const form = this.getActiveConfigForm();
    return (form?.get('equipments') as FormArray) || this.fb.array([]);
  }

  getActiveSpecifications(): FormArray {
    const form = this.getActiveConfigForm();
    return (form?.get('specifications') as FormArray) || this.fb.array([]);
  }

  getActiveInvoiceCases(): FormArray {
    const form = this.getActiveConfigForm();
    return (form?.get('invoiceCases') as FormArray) || this.fb.array([]);
  }

  saveActiveConfig() {
    this.saveSubGroupConfig();
    this.saveAnalysisTypeConfig();
  }

  startAddAnalysisTypeInline(sg: any, event: Event) {
    event.stopPropagation();
    this.selectSubGroup(sg);
    this.startAddAnalysisType();
  }

  deleteSubGroupInline(sg: any, event: Event) {
    event.stopPropagation();
    this.activeSubGroupId = sg.id;
    this.deleteActiveSubGroup();
  }

  deleteAnalysisTypeInline(at: any, sg: any, event: Event) {
    event.stopPropagation();
    this.activeSubGroupId = sg.id;
    this.activeAnalysisTypeId = at.id;
    this.deleteActiveAnalysisType();
  }

  // --- REDESIGN UTILITY TREE & MOCKUP HELPERS ---
  get filteredSubGroups(): any[] {
    if (!this.searchTermLeft.trim()) {
      return this.subGroups;
    }
    const term = this.searchTermLeft.toLowerCase().trim();
    return this.subGroups.map(sg => {
      const matchesSg = sg.name.toLowerCase().includes(term);
      const filteredAt = sg.analysisTypes?.filter((at: any) => at.name.toLowerCase().includes(term)) || [];
      if (matchesSg || filteredAt.length > 0) {
        return { ...sg, analysisTypes: matchesSg ? sg.analysisTypes : filteredAt };
      }
      return null;
    }).filter(x => x !== null);
  }

  getMetalClassificationId(): number | null {
    let metalId = this.activeAnalysisTypeId 
      ? this.analysisTypeConfigForm?.get('metalClassificationID')?.value
      : this.subGroupConfigForm?.get('metalClassificationID')?.value;

    if (!metalId && this.subGroupConfigForm?.get('metalClassificationID')?.value) {
      metalId = this.subGroupConfigForm.get('metalClassificationID')?.value;
    }
    return metalId ? Number(metalId) : null;
  }

  getMetalName(): string {
    const metalId = this.getMetalClassificationId();
    if (metalId && this.selectedSubGroupDetails?.metalClassification) {
      return this.selectedSubGroupDetails.metalClassification.name;
    }
    return '';
  }

  fetchParametersFromMetalClassification(): void {
    const metalId = this.getMetalClassificationId();
    if (!metalId) {
      this.toastService.show('Please select a Metal Classification in Overview tab first.', 'warning');
      return;
    }

    const isChemical = !!this.labTestForm.get('isChemicalTest')?.value;
    const formGroup = this.getActiveConfigForm();
    if (!formGroup) {
      this.toastService.show('Please select a Subgroup or Analysis Type first.', 'warning');
      return;
    }

    this.metalService.getParameterByMetalId(metalId).subscribe({
      next: (params: any[]) => {
        if (!params || params.length === 0) {
          this.toastService.show('No parameters mapped for the selected Metal Classification.', 'info');
          return;
        }

        const filteredParams = params.filter(p => {
          const pType = (p.parameterType || '').trim().toLowerCase();
          if (isChemical) {
            return pType === 'chemical';
          } else {
            return pType === 'mechanical' || pType !== 'chemical';
          }
        });

        if (filteredParams.length === 0) {
          this.toastService.show(`No ${isChemical ? 'Chemical' : 'Mechanical'} parameters mapped in selected Metal Classification.`, 'info');
          return;
        }

        const currentArray = formGroup.get('parameters') as FormArray;
        let addedCount = 0;

        filteredParams.forEach(p => {
          const paramId = p.id || p.ID;
          const exists = currentArray.controls.some(ctrl => ctrl.get('parameterID')?.value === paramId);
          if (!exists) {
            currentArray.push(this.createParameterGroup({
              parameterID: paramId,
              parameterName: p.name || p.Name,
              parameterSymbol: p.symbol || p.Symbol || '',
              parameterUnit: p.parameterUnit?.name || p.unitName || p.parameterUnitName || '',
              sequence: currentArray.length
            }));
            addedCount++;
          }
        });

        if (addedCount > 0) {
          currentArray.markAsDirty();
          this.toastService.show(`Successfully fetched and added ${addedCount} parameter(s).`, 'success');
        } else {
          this.toastService.show('All parameters from Metal Classification are already added.', 'info');
        }
      },
      error: () => this.toastService.show('Failed to fetch parameters for Metal Classification.', 'error')
    });
  }

  fetchTestMethodsFromMetalClassification(): void {
    const metalId = this.getMetalClassificationId();
    if (!metalId) {
      this.toastService.show('Please select a Metal Classification in Overview tab first.', 'warning');
      return;
    }

    const formGroup = this.getActiveConfigForm();
    if (!formGroup) {
      this.toastService.show('Please select a Subgroup or Analysis Type first.', 'warning');
      return;
    }

    this.methodService.getTestMethodSpecificationVersionDropdown('', 0, 1000, metalId).subscribe({
      next: (methods: any[]) => {
        if (!methods || methods.length === 0) {
          this.toastService.show('No test methods found for the selected Metal Classification.', 'info');
          return;
        }

        const currentArray = formGroup.get('testMethods') as FormArray;
        let addedCount = 0;

        methods.forEach(m => {
          const versionId = m.id;
          const exists = currentArray.controls.some(ctrl => ctrl.get('testMethodSpecificationVersionID')?.value === versionId);
          if (!exists) {
            currentArray.push(this.createMethodGroup({
              testMethodSpecificationID: m.additionalValues?.TestMethodSpecificationID || null,
              testMethodSpecificationVersionID: versionId,
              testMethodName: m.additionalValues?.Name || m.name || m.Name,
              standard: m.additionalValues?.TestMethodStandard || '',
              version: m.additionalValues?.Version || '',
              isDefault: currentArray.length === 0
            }));
            addedCount++;
          }
        });

        if (addedCount > 0) {
          currentArray.markAsDirty();
          this.toastService.show(`Successfully fetched and added ${addedCount} test method(s).`, 'success');
        } else {
          this.toastService.show('All test methods for this Metal Classification are already added.', 'info');
        }
      },
      error: () => this.toastService.show('Failed to fetch test methods for Metal Classification.', 'error')
    });
  }

  fetchSpecificationsFromMetalClassification(): void {
    const metalId = this.getMetalClassificationId();
    if (!metalId) {
      this.toastService.show('Please select a Metal Classification in Overview tab first.', 'warning');
      return;
    }

    const formGroup = this.getActiveConfigForm();
    if (!formGroup) {
      this.toastService.show('Please select a Subgroup or Analysis Type first.', 'warning');
      return;
    }

    let addedGrades = 0;
    let addedProductMasters = 0;

    this.materialSpecService.getGradeDropdownByMetalId('', 0, 1000, metalId).subscribe({
      next: (grades: any[]) => {
        const currentArray = formGroup.get('specifications') as FormArray;
        if (grades && grades.length > 0) {
          grades.forEach(g => {
            const gradeId = Number(g.id || g.GradeID);
            const exists = currentArray.controls.some(ctrl => {
              const val = ctrl.value;
              return val.specificationType === 'Material' && Number(val.specificationGradeID) === gradeId;
            });
            if (!exists) {
              currentArray.push(this.createSpecificationGroup({
                id: 0,
                specificationType: 'Material',
                specificationGradeID: gradeId,
                specName: g.name || g.AliasName || g.Grade || 'Material Specification'
              }));
              addedGrades++;
            }
          });
        }

        this.productMasterService.getDropdown('', 0, 1000, metalId).subscribe({
          next: (products: any[]) => {
            if (products && products.length > 0) {
              products.forEach(p => {
                const pmId = Number(p.id || p.ID);
                const exists = currentArray.controls.some(ctrl => {
                  const val = ctrl.value;
                  return val.specificationType === 'Product' && Number(val.productMasterID) === pmId;
                });
                if (!exists) {
                  currentArray.push(this.createSpecificationGroup({
                    id: 0,
                    specificationType: 'Product',
                    productMasterID: pmId,
                    specName: p.name || p.ProductName || p.DisplayTitle || 'Product Master'
                  }));
                  addedProductMasters++;
                }
              });
            }

            const totalAdded = addedGrades + addedProductMasters;
            if (totalAdded > 0) {
              currentArray.markAsDirty();
              this.toastService.show(`Fetched ${addedGrades} material grade(s) and ${addedProductMasters} product master(s).`, 'success');
            } else {
              this.toastService.show('All applicable material grades and product masters are already added.', 'info');
            }
          },
          error: () => this.toastService.show('Failed to fetch Product Masters.', 'error')
        });
      },
      error: () => this.toastService.show('Failed to fetch Material Specification grades.', 'error')
    });
  }

  getTechniqueName(techId: number): string {
    const found = this.allTechniquesMaster.find(t => t.id === techId);
    return found ? found.name : '';
  }

  getTechniqueCode(techId: number): string {
    const found = this.allTechniquesMaster.find(t => t.id === techId);
    return found ? found.code : '';
  }

  getTechniqueDesc(techId: number): string {
    const found = this.allTechniquesMaster.find(t => t.id === techId);
    return found ? found.description : '';
  }

  getMaterialSpecsOnly(): any[] {
    const arr = this.getActiveSpecifications();
    return arr.controls.filter(ctrl => ctrl.get('specificationType')?.value === 'Material');
  }

  getProductMastersOnly(): any[] {
    const arr = this.getActiveSpecifications();
    return arr.controls.filter(ctrl => ctrl.get('specificationType')?.value === 'Product');
  }

  removeSpecRowInline(id: number, type: 'Material' | 'Product' = 'Material') {
    const arr = this.getActiveSpecifications();
    const idx = arr.controls.findIndex(ctrl => {
      const v = ctrl.value;
      if (v.id && v.id === id) return true;
      if (type === 'Product') {
        return Number(v.productMasterID) === Number(id) || Number(v.productSpecificationID) === Number(id);
      }
      return Number(v.specificationGradeID) === Number(id);
    });
    if (idx >= 0) {
      arr.removeAt(idx);
      arr.markAsDirty();
    }
  }

  getTechniqueDropdownFn = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.techMasterService.getAnalysisTechniqueDropdown(term, page, pageSize);
  };

  isTabVisible(tab: string): boolean {
    const isChemical = this.labTestForm?.get('isChemicalTest')?.value;
    
    if (isChemical) {
      if (this.activeAnalysisTypeId) {
        // Analysis Type selected: all tabs visible
        return true;
      } else {
        // Subgroup selected: only overview visible
        return tab === 'overview';
      }
    } else {
      // Mechanical: subgroup selected, show all except techniques
      if (tab === 'techniques') {
        return false;
      }
      return this.activeSubGroupId ? true : tab === 'overview';
    }
  }

  checkTabVisibility() {
    if (!this.isTabVisible(this.activeTab)) {
      this.activeTab = 'overview';
    }
  }
}
