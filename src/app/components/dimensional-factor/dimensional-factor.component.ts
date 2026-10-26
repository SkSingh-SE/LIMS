import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { CommonModule } from '@angular/common';
import { DimensionalFactorService } from '../../services/dimensional-factor.service';
import { ParameterUnitService } from '../../services/parameter-unit.service';
import { EquipmentTypeService } from '../../services/equipment-type.service';
import { SpecimenTypeService } from '../../services/specimen-type.service';
import { ToastService } from '../../services/toast.service';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { CustomSelectComponent } from '../../utility/components/custom-select/custom-select.component';
import { noWhitespaceValidator } from '../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { FormulaBuilderComponent } from '../../utility/components/formula-builder/formula-builder.component';

@Component({
  selector: 'app-dimensional-factor',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CustomSelectComponent,
    SearchableDropdownComponent,
    FormFieldErrorComponent,
    PaginationComponent,
    FormulaBuilderComponent
  ],
  templateUrl: './dimensional-factor.component.html',
  styleUrl: './dimensional-factor.component.css'
})
export class DimensionalFactorComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'code', type: 'string', label: 'Code', filter: true },
    { key: 'name', type: 'string', label: 'Name', filter: true },
    { key: 'factorType', type: 'string', label: 'Factor Type', filter: true },
    { key: 'unit', type: 'string', label: 'Unit', filter: true },
    { key: 'defaultEquipment', type: 'string', label: 'Default Equipment Type', filter: true },
    { key: 'toleranceType', type: 'string', label: 'Tolerance Type', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified By / At', filter: true },
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    code: 'string',
    name: 'string',
    factorType: 'string',
    unit: 'string',
    defaultEquipment: 'string',
    toleranceType: 'string',
    modifiedOn: 'date',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = '';
  filterColumnTitle: string = '';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  isFilterOpen = false;
  DimensionalFactorList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  sortByColumn: string = 'modifiedOn';
  sortOrder: string = 'desc';
  searchTerm: string = '';

  payload: any = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  // Form State
  DimensionalFactorForm!: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  dimensionalFactorId: number = 0;
  formTitle = 'Dimensional Factor Form';

  selectedUnitDropdownItem: any = null;
  selectedEquipmentTypeItem: any = null;

  // Formula Builder State
  showFormulaBuilder: boolean = false;
  activeFormulaIndex: number | null = null;
  currentFormulaForBuilder: string = '';
  currentFormulaDisplayForBuilder: string = '';

  toleranceTypes = [
    { name: 'Bilateral (±)', value: 'Bilateral', badge: '± Dual' },
    { name: 'Unilateral (+)', value: 'Unilateral', badge: '+ Single' },
    { name: 'Limit', value: 'Limit', badge: 'Range' }
  ];

  constructor(
    private fb: FormBuilder,
    private dimensionalService: DimensionalFactorService,
    private parameterUnitService: ParameterUnitService,
    private equipmentTypeService: EquipmentTypeService,
    private specimenTypeService: SpecimenTypeService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.initForm();
    this.fetchData();
  }

  /**
   * Initialize Reactive Form for Dimensional Factor Master.
   * NOTE (NABL Precision Standard): Decimal places and rounding precision are auto-inherited
   * from the bound Parameter Master in Material Specification (not stored on DimensionalFactorMaster directly).
   */
  initForm() {
    this.DimensionalFactorForm = this.fb.group({
      id: [0],
      code: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      factorType: ['Measured', [Validators.required]],
      parameterUnitID: [null],
      defaultEquipmentTypeID: [null],
      toleranceType: ['Bilateral'],
      shapeFormulas: this.fb.array([])
    });
  }

  get shapeFormulas(): FormArray {
    return this.DimensionalFactorForm.get('shapeFormulas') as FormArray;
  }

  setFactorType(type: 'Measured' | 'Calculated') {
    if (this.isViewMode) return;
    this.DimensionalFactorForm.patchValue({ factorType: type });
    if (type === 'Calculated' && this.shapeFormulas.length === 0) {
      // Add standard rectangular cross section by default
      this.addShapeFormula({ shape: 'Rectangular', formula: 'W0 * T0', vars: 'W0, T0' });
    }
    this.DimensionalFactorForm.markAsDirty();
  }

  addShapeFormula(preset?: { shape: string; formula: string; vars: string }) {
    if (this.isViewMode) return;
    const group = this.fb.group({
      id: [0],
      dimensionalFactorID: [this.dimensionalFactorId || 0],
      specimenTypeID: [null],
      specimenShape: [preset?.shape || '', [Validators.required, noWhitespaceValidator()]],
      formulaExpression: [preset?.formula || '', [Validators.required, noWhitespaceValidator()]],
      variables: [preset?.vars || '']
    });
    this.shapeFormulas.push(group);
    this.DimensionalFactorForm.markAsDirty();
  }

  removeShapeFormula(index: number) {
    if (this.isViewMode) return;
    this.shapeFormulas.removeAt(index);
    this.DimensionalFactorForm.markAsDirty();
  }

  /**
   * Evaluates and validates mathematical syntax of a formula expression.
   * Performs safety checks, checks balanced parentheses, validates operators,
   * extracts variables, and performs dry-run execution with simulated inputs.
   */
  validateExpression(formula: string): { isValid: boolean; error?: string; simulatedResult?: number; extractedVars: string[] } {
    if (!formula || !formula.trim()) {
      return { isValid: false, error: 'Formula expression cannot be empty', extractedVars: [] };
    }
    const cleanExpr = formula.trim();

    // Check balanced parentheses
    let parenDepth = 0;
    for (let i = 0; i < cleanExpr.length; i++) {
      const char = cleanExpr[i];
      if (char === '(') parenDepth++;
      else if (char === ')') {
        parenDepth--;
        if (parenDepth < 0) {
          return { isValid: false, error: 'Unmatched closing parenthesis ")"', extractedVars: [] };
        }
      }
    }
    if (parenDepth > 0) {
      return { isValid: false, error: 'Unclosed opening parenthesis "("\'', extractedVars: [] };
    }

    // Check for consecutive invalid operators like ++, --, **, //, */
    if (/[+\-*/]{2,}/.test(cleanExpr)) {
      return { isValid: false, error: 'Invalid operator sequence', extractedVars: [] };
    }

    // Check ending with operator
    if (/[+\-*/^]\s*$/.test(cleanExpr)) {
      return { isValid: false, error: 'Expression cannot end with an operator', extractedVars: [] };
    }

    // Extract variable tokens (exclude math constants and functions)
    const mathKeywords = new Set([
      'PI', 'pi', 'Pi', 'E', 'e', 'SQRT', 'sqrt', 'POW', 'pow', 'ABS', 'abs',
      'ROUND', 'round', 'SIN', 'sin', 'COS', 'cos', 'TAN', 'tan', 'LOG', 'log'
    ]);
    const tokenMatches = cleanExpr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const extractedVars = Array.from(new Set(tokenMatches.filter(t => !mathKeywords.has(t))));

    // Dry-run simulation using JS Math
    try {
      let evalStr = cleanExpr
        .replace(/\bPI\b/gi, 'Math.PI')
        .replace(/\bSQRT\b/gi, 'Math.sqrt')
        .replace(/\bPOW\b/gi, 'Math.pow')
        .replace(/\bABS\b/gi, 'Math.abs')
        .replace(/\bROUND\b/gi, 'Math.round');

      // Replace caret power e.g. (D0 ^ 2) or D0 ^ 2
      evalStr = evalStr.replace(/([a-zA-Z0-9_.]+)\s*\^\s*([0-9.]+)/g, 'Math.pow($1, $2)');

      // Assign mock values to variables (first=10, second=5, third=2, etc.)
      extractedVars.forEach((v, idx) => {
        const mockVal = idx === 0 ? 10 : idx === 1 ? 5 : 2;
        const regex = new RegExp(`\\b${v}\\b`, 'g');
        evalStr = evalStr.replace(regex, String(mockVal));
      });

      // Check for safety: only allowed math characters
      if (!/^[0-9\s+\-*/().,MathPIsqrtpowabsround]+$/.test(evalStr)) {
        return { isValid: false, error: 'Contains unsupported characters or invalid tokens', extractedVars };
      }

      const testResult = new Function(`return (${evalStr});`)();
      if (typeof testResult !== 'number' || isNaN(testResult) || !isFinite(testResult)) {
        return { isValid: false, error: 'Expression does not evaluate to a finite number', extractedVars };
      }

      return {
        isValid: true,
        simulatedResult: Math.round(testResult * 100) / 100,
        extractedVars
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Syntax error: ${err.message || 'Invalid formula'}`,
        extractedVars
      };
    }
  }

  getFormulaStatus(index: number): { isValid: boolean; error?: string; simulatedResult?: number } {
    const row = this.shapeFormulas.at(index);
    if (!row) return { isValid: false, error: 'Row not found' };
    const expr = row.get('formulaExpression')?.value;
    return this.validateExpression(expr);
  }

  onFormulaExpressionInput(index: number): void {
    const row = this.shapeFormulas.at(index);
    if (!row) return;
    const expr = row.get('formulaExpression')?.value || '';
    const status = this.validateExpression(expr);
    if (status.isValid && status.extractedVars && status.extractedVars.length > 0) {
      const currentVars = row.get('variables')?.value;
      if (!currentVars || currentVars.trim() === '') {
        row.patchValue({ variables: status.extractedVars.join(', ') });
      }
    }
    this.DimensionalFactorForm.markAsDirty();
  }

  openFormulaBuilder(index: number): void {
    if (this.isViewMode) return;
    this.activeFormulaIndex = index;
    const row = this.shapeFormulas.at(index);
    if (!row) return;

    const expr = row.get('formulaExpression')?.value || '';
    this.currentFormulaForBuilder = expr;
    this.currentFormulaDisplayForBuilder = expr;
    this.showFormulaBuilder = true;
  }

  onFormulaBuilderSaved(event: { formula: string; formulaDisplay: string; variables?: string[] }): void {
    if (this.activeFormulaIndex === null) return;
    const row = this.shapeFormulas.at(this.activeFormulaIndex);
    if (row) {
      const formulaVal = event.formula || event.formulaDisplay || '';
      row.patchValue({
        formulaExpression: formulaVal
      });

      // Auto-populate variables if derived or provided
      const validation = this.validateExpression(formulaVal);
      const extractedVars = event.variables && event.variables.length > 0 ? event.variables : validation.extractedVars;
      if (extractedVars && extractedVars.length > 0) {
        row.patchValue({
          variables: extractedVars.join(', ')
        });
      }
      this.DimensionalFactorForm.markAsDirty();
    }
    this.showFormulaBuilder = false;
    this.activeFormulaIndex = null;
  }

  onFormulaBuilderCleared(): void {
    if (this.activeFormulaIndex === null) return;
    const row = this.shapeFormulas.at(this.activeFormulaIndex);
    if (row) {
      row.patchValue({
        formulaExpression: '',
        variables: ''
      });
      this.DimensionalFactorForm.markAsDirty();
    }
    this.showFormulaBuilder = false;
    this.activeFormulaIndex = null;
  }

  fetchData() {
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm;
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.payload.filter = this.filters?.length ? this.filters : null;

    this.dimensionalService.getAllDimensionalFactors(this.payload).subscribe({
      next: (response) => {
        this.DimensionalFactorList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        this.DimensionalFactorList = [];
      }
    });
  }

  getDetails(): void {
    const requestId = this.dimensionalFactorId;
    this.dimensionalService.getDimensionalFactorById(requestId).subscribe({
      next: (response) => {
        if (this.dimensionalFactorId !== requestId) return;
        this.customerTypeObject = response;

        this.DimensionalFactorForm.patchValue({
          id: response.id,
          code: response.code,
          name: response.name,
          factorType: response.factorType || 'Measured',
          parameterUnitID: response.parameterUnitID,
          defaultEquipmentTypeID: response.defaultEquipmentTypeID,
          toleranceType: response.toleranceType || 'Bilateral'
        });

        // Set Unit Dropdown item
        if (response.parameterUnitID) {
          this.selectedUnitDropdownItem = {
            id: response.parameterUnitID,
            name: response.parameterUnit?.name || response.unitName
          };
        } else {
          this.selectedUnitDropdownItem = null;
        }

        // Set Equipment Type Dropdown item
        if (response.defaultEquipmentTypeID) {
          this.selectedEquipmentTypeItem = {
            id: response.defaultEquipmentTypeID,
            name: response.defaultEquipmentType?.name || response.defaultEquipmentTypeName
          };
        } else {
          this.selectedEquipmentTypeItem = null;
        }

        // Populate Shape Formulas FormArray
        this.shapeFormulas.clear();
        if (response.shapeFormulas && response.shapeFormulas.length > 0) {
          response.shapeFormulas.forEach((sf: any) => {
            this.shapeFormulas.push(this.fb.group({
              id: [sf.id || 0],
              dimensionalFactorID: [sf.dimensionalFactorID || requestId],
              specimenTypeID: [sf.specimenTypeID || null],
              specimenShape: [sf.specimenShape || '', [Validators.required, noWhitespaceValidator()]],
              formulaExpression: [sf.formulaExpression || '', [Validators.required, noWhitespaceValidator()]],
              variables: [sf.variables || '']
            }));
          });
        }

        if (this.isViewMode) {
          this.DimensionalFactorForm.disable();
        }
      },
      error: (error) => {
        this.toastService.show(error?.error?.message || 'Error loading dimensional factor details', 'error');
      }
    });
  }

  openModal(type: string, id: number): void {
    this.initForm();
    this.selectedUnitDropdownItem = null;
    this.selectedEquipmentTypeItem = null;
    this.dimensionalFactorId = 0;
    this.submitted = false;

    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Create Dimensional Factor';
      this.DimensionalFactorForm.enable();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Edit Dimensional Factor';
      this.DimensionalFactorForm.enable();
      this.dimensionalFactorId = id;
      this.getDetails();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Dimensional Factor';
      this.dimensionalFactorId = id;
      this.getDetails();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement, { focus: false });
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.selectedUnitDropdownItem = null;
    this.selectedEquipmentTypeItem = null;
    this.initForm();
    this.dimensionalFactorId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
    this.submitted = false;
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.DimensionalFactorForm, path, this.submitted);
  }

  onUnitSelected(item: any): void {
    this.selectedUnitDropdownItem = item;
    this.DimensionalFactorForm.patchValue({
      parameterUnitID: item?.id ?? null
    });
    this.DimensionalFactorForm.markAsDirty();
  }

  onEquipmentTypeSelected(item: any): void {
    this.selectedEquipmentTypeItem = item;
    this.DimensionalFactorForm.patchValue({
      defaultEquipmentTypeID: item?.id ?? null
    });
    this.DimensionalFactorForm.markAsDirty();
  }

  onSpecimenTypeSelected(item: any, index: number): void {
    const row = this.shapeFormulas.at(index);
    if (row) {
      row.patchValue({
        specimenTypeID: item?.id ?? null,
        specimenShape: item?.name ? item.name : row.get('specimenShape')?.value
      });
      this.DimensionalFactorForm.markAsDirty();
    }
  }

  // Dropdown Fetchers
  getUnitDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.parameterUnitService.getGroupedParameterUnitDropdown(searchTerm, pageNo, pageSize);
  };

  getEquipmentTypeDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.equipmentTypeService.getEquipmentTypeDropdown(searchTerm, pageNo, pageSize);
  };

  getSpecimenTypeDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.specimenTypeService.getSpecimenTypeDropdown(searchTerm, pageNo, pageSize);
  };

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  applySorting(column: string) {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.fetchData();
  }

  onSearch() {
    this.pageNumber = 1;
    this.fetchData();
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.fetchData();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.fetchData();
  }

  deleteFn(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this Dimensional Factor?');
    if (confirmed) {
      this.dimensionalService.deleteDimensionalFactor(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message || 'Dimensional factor deleted successfully', 'success');
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        }
      });
    }
  }

  openFilterModal(column: string, event: MouseEvent) {
    this.filterColumn = column;
    const col = this.columns.find(c => c.key === column);
    this.filterColumnTitle = col ? col.label : column;
    this.filterValue = '';
    this.filterValue2 = '';

    const columnType = this.filterColumnTypes[column] || 'string';
    this.filterType = columnType === 'number' ? 'Equal' : 'Contains';

    this.isFilterOpen = true;
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;

      requestAnimationFrame(() => {
        const modalRect = modal.getBoundingClientRect();
        if (modalRect.right > window.innerWidth) {
          modal.style.left = `${window.innerWidth - modalRect.width - 10 + window.scrollX}px`;
        }
        if (modalRect.bottom > window.innerHeight) {
          modal.style.top = `${rect.top + window.scrollY - modalRect.height - 5}px`;
        }
      });
    }
  }

  applyFilter() {
    if (!this.filterColumn || this.filterValue === '') return;
    const existingIndex = this.filters.findIndex(f => f.column === this.filterColumn);
    const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };

    if (existingIndex > -1) {
      this.filters[existingIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }
    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string) {
    this.filters = this.filters.filter(f => f.column !== column);
    this.fetchData();
  }

  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }

  closeFilterModal() {
    if (this.filterModal) {
      this.filterModal.nativeElement.style.display = 'none';
    }
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.DimensionalFactorForm);

    if (!this.DimensionalFactorForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }

    const formData = this.DimensionalFactorForm.getRawValue();

    // Shape Formula Validation for Calculated Mode
    if (formData.factorType === 'Calculated') {
      if (!formData.shapeFormulas || formData.shapeFormulas.length === 0) {
        this.toastService.show('Please configure at least one Shape Formula for Calculated mode.', 'warning');
        return;
      }
      for (let i = 0; i < formData.shapeFormulas.length; i++) {
        const sf = formData.shapeFormulas[i];
        const status = this.validateExpression(sf.formulaExpression);
        if (!status.isValid) {
          this.toastService.show(`Shape formula error in row ${i + 1} (${sf.specimenShape || 'Shape'}): ${status.error}`, 'warning');
          return;
        }
      }
    }

    if (this.isEditMode) {
      this.dimensionalService.updateDimensionalFactor(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Dimensional Factor updated successfully', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        }
      });
    } else {
      formData.id = 0;
      this.dimensionalService.createDimensionalFactor(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message || 'Dimensional Factor created successfully', 'success');
          this.closeModal();
          this.fetchData();
        },
        error: (error) => {
          this.toastService.show(error?.error?.message || error?.errorMessage || 'Operation failed', 'error');
        }
      });
    }
  }
}
