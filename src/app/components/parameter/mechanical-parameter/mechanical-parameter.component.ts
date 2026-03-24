import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { ParameterUnitService } from '../../../services/parameter-unit.service';
import { ParameterCategoryService } from '../../../services/parameter-category.service';
import { SpecimenOrientationService } from '../../../services/specimen-orientation.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';

@Component({
  selector: 'app-mechanical-parameter',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, MultiSelectDropdownComponent],
  templateUrl: './mechanical-parameter.component.html',
  styleUrl: './mechanical-parameter.component.css'
})
export class MechanicalParameterComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  @ViewChild('formulaModal') formulaModal!: ElementRef;
  private bsModal!: Modal;
  private formulaBsModal!: Modal;

  allParameters: any[] = [];
  tempFormula: string = '';
  numericInput: string = '';
  formulaTokens: { type: string; value: string; display: string }[] = [];
  formulaPreview: string = '';
  isFormulaValid = true;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'name', type: 'string', label: 'Parameter Name', filter: true },
    { key: 'unitName', type: 'string', label: 'Unit Name', filter: true },
    { key: 'factor', type: 'string', label: 'Conversaion Factor', filter: true },
    { key: 'createdOn', type: 'date', label: 'Created At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    name: 'string',
    unitName: 'string',
    factor: 'string',
    createdOn: 'date'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  ParameterList: any[] = [];
  ParameterUnits: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

  sortByColumn: string = 'id';
  sortOrder: string = 'desc';
  searchTerm: string = '';

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  // form
  ParameterForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  parameterId: number = 0;
  formTitle = 'Parameter Form';

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private parameterService: ParameterService, private toastService: ToastService, private parameterUnitService: ParameterUnitService, private parameterCategoryService: ParameterCategoryService, private specimenOrientationService: SpecimenOrientationService) {
    this.route.params.subscribe(params => {
      this.parameterId = params['id'] || 0;
      if (this.parameterId > 0) {
        this.getDetails();
      }
    });

  }


  ngOnInit() {
    this.fetchData();
    this.fetchParameterUnits();
    this.initForm();
    this.fetchParameterDropdown();
  }
  initForm() {
    this.ParameterForm = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      code: ['', Validators.required],
      decimalPrecision: [1],
      defaultTestMethodID: [null],
      parameterCategoryID: [null],
      parameterUnitID: [0, Validators.required],
      note: [''],
      elementType: ['normal'],
      parameterType: ['Mechanical', Validators.required],
      isCalculated: [false],
      formula: [''],
      allowedOrientationIds: [[]],
      allowedOrientations: this.fb.array([])
    });
  }
  fetchData() {
    this.parameterService.getAllMechanicalParameters(this.payload).subscribe({
      next: (response) => {
        this.ParameterList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.ParameterList = [];
      }
    }
    );
  }
  fetchParameterUnits() {
    this.parameterUnitService.getParameterUnitDropdown("", 0, 100).subscribe({
      next: (response) => {
        this.ParameterUnits = response || [];
      },
      error: (error) => {
        console.error('Error fetching parameter units:', error);
      }
    });
  }

  getDetails(): void {
    this.parameterService.getParameterById(this.parameterId).subscribe({
      next: (response) => {
        this.customerTypeObject = response;
        this.ParameterForm.patchValue(response);
        if (response.allowedOrientations?.length > 0) {
          const ids = response.allowedOrientations.map((o: any) => o.specimenOrientationID);
          this.ParameterForm.get('allowedOrientationIds')?.setValue(ids);
        }
      },
      error: (error) => {
        console.error('Error fetching tax data:', error);
      }
    });
  }

  applySorting(column: string) {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.fetchData();
  }

  openFilterModal(column: string, event: MouseEvent) {
    this.filterColumn = column;
    this.columns.forEach(col => {
      if (col.key === column) {
        this.filterColumnTitle = col.label;
      }
    })
    this.filterValue = '';
    this.filterValue2 = '';

    const columnType = this.filterColumnTypes[column];
    switch (columnType) {
      case 'string':
        this.filterType = 'Contains';
        break;
      case 'number':
        this.filterType = 'Equal';
        break;
      case 'date':
        this.filterType = 'Between';
        break;
      default:
        this.filterType = 'Contains';
    }

    this.isFilterOpen = true;
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;
    }
  }

  applyFilter() {
    if (!this.filterColumn || this.filterValue === '') return;

    const existingFilterIndex = this.filters.findIndex(f => f.column === this.filterColumn);
    const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };

    if (existingFilterIndex > -1) {
      this.filters[existingFilterIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }

    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string) {
    this.filters = this.filters.filter(filter => filter.column !== column);
    this.payload.filter = this.filters;
    this.fetchData();
  }

  closeFilterModal() {
    if (this.filterModal) {
      this.filterModal.nativeElement.style.display = 'none';
    }
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.payload.PageNumber = this.pageNumber;
    this.fetchData();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1; // Reset to first page
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
  }

  onSearch() {
    if (this.searchTerm !== this.payload.searchTerm) {
      this.payload.searchTerm = this.searchTerm;
      this.fetchData();
    }
  }

  get totalPages(): number[] {
    return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
  }
  getStartRecord(): number {
    return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }


  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }
  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.type : undefined;
  }

  deleteFn(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      this.parameterService.deleteParameter(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error.errorMessage || error.error?.message || error.message, 'error');
        }
      });
    }
  }
  openModal(type: string, id: number): void {
    this.initForm();
    if (id > 0) {
      this.parameterId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.formTitle = 'Parameter Form';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Parameter Form';
    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Parameter';
      this.ParameterForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.initForm();
    this.parameterId = 0;
    this.isEditMode = false;
    this.isViewMode = false;
  }

  onSubmit(): void {
    if (this.ParameterForm.valid) {

      if (this.ParameterForm.value.isCalculated && !this.ParameterForm.value.formula) {
        this.toastService.show('Formula is required for calculated parameter', 'warning');
        return;
      }
      let formData = this.ParameterForm.value;
      const orientationIds = formData.allowedOrientationIds || [];
      formData.allowedOrientations = orientationIds.map((id: number) => ({ specimenOrientationID: id }));
      if (this.isEditMode) {
        this.parameterService.updateParameter(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.closeModal();
            this.fetchData();
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        });
      } else {
        formData.id = 0;
        this.parameterService.createParameter(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.closeModal();
            this.fetchData();
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        });
      }
    }
  }

  fetchParameterDropdown() {
    this.parameterService.getMechanicalParameterDropdown("", 0, 1000).subscribe({
      next: (response) => {
        this.allParameters = response || [];
      },
      error: (error) => {
        console.error('Error fetching parameters:', error);
      }
    });
  }

  onCalculatedToggle() {
    if (!this.ParameterForm.value.isCalculated) {
      this.ParameterForm.patchValue({ formula: '' });
    }
  }

  openFormulaBuilder() {
    this.tempFormula = this.ParameterForm.value.formula || '';
    this.parseFormulaToTokens(this.tempFormula);
    this.updateFormulaPreview();
    this.validateParentheses();
    this.formulaBsModal = new Modal(this.formulaModal.nativeElement);
    this.formulaBsModal.show();
  }

  addParamToken(paramId: number, paramName: string): void {
    this.formulaTokens.push({ type: 'param', value: `{P${paramId}}`, display: paramName });
    this.rebuildFormula();
  }

  addOperatorToken(op: string): void {
    const displayMap: Record<string, string> = { '+': '+', '-': '\u2212', '*': '\u00d7', '/': '\u00f7' };
    this.formulaTokens.push({ type: 'operator', value: ` ${op} `, display: displayMap[op] || op });
    this.rebuildFormula();
  }

  addParenToken(paren: string): void {
    this.formulaTokens.push({ type: 'paren', value: paren, display: paren });
    this.rebuildFormula();
  }

  addNumberToken(): void {
    if (!this.numericInput || this.numericInput === '') return;
    const numValue = parseFloat(this.numericInput);
    if (isNaN(numValue)) {
      this.toastService.show('Please enter a valid number', 'warning');
      return;
    }
    this.formulaTokens.push({ type: 'number', value: ` ${this.numericInput}`, display: this.numericInput });
    this.numericInput = '';
    this.rebuildFormula();
  }

  removeToken(index: number): void {
    this.formulaTokens.splice(index, 1);
    this.rebuildFormula();
  }

  undoLastToken(): void {
    this.formulaTokens.pop();
    this.rebuildFormula();
  }

  private rebuildFormula(): void {
    this.tempFormula = this.formulaTokens.map((t) => t.value).join('');
    this.updateFormulaPreview();
    this.validateParentheses();
  }

  private validateParentheses(): void {
    let count = 0;
    for (const token of this.formulaTokens) {
      if (token.value === '(') count++;
      if (token.value === ')') count--;
      if (count < 0) {
        this.isFormulaValid = false;
        return;
      }
    }
    this.isFormulaValid = count === 0;
  }

  private updateFormulaPreview(): void {
    let preview = this.tempFormula;
    this.allParameters.forEach((param) => {
      const regex = new RegExp(`\\{P${param.id}\\}`, 'g');
      preview = preview.replace(regex, param.name);
    });
    this.formulaPreview = preview;
  }

  private parseFormulaToTokens(formula: string): void {
    this.formulaTokens = [];
    if (!formula) return;
    const regex = /(\{P\d+\})|([+\-*/])|([()])|(\d+\.?\d*)/g;
    let match;
    while ((match = regex.exec(formula)) !== null) {
      if (match[1]) {
        const paramId = parseInt(match[1].replace(/[{}P]/g, ''));
        const param = this.allParameters.find((p: any) => p.id === paramId);
        this.formulaTokens.push({ type: 'param', value: match[1], display: param ? param.name : `P${paramId}` });
      } else if (match[2]) {
        const displayMap: Record<string, string> = { '+': '+', '-': '\u2212', '*': '\u00d7', '/': '\u00f7' };
        this.formulaTokens.push({ type: 'operator', value: ` ${match[2]} `, display: displayMap[match[2]] || match[2] });
      } else if (match[3]) {
        this.formulaTokens.push({ type: 'paren', value: match[3], display: match[3] });
      } else if (match[4]) {
        this.formulaTokens.push({ type: 'number', value: ` ${match[4]}`, display: match[4] });
      }
    }
  }

  saveFormula() {
    this.ParameterForm.patchValue({
      formula: this.tempFormula,
    });

    this.closeFormulaModal();
  }

  closeFormulaModal() {
    if (this.formulaBsModal) {
      this.formulaBsModal.hide();
    }
  }

  clearFormula() {
    this.tempFormula = '';
    this.formulaTokens = [];
    this.isFormulaValid = true;
    this.numericInput = '';
    this.ParameterForm.patchValue({
      formula: '',
    });
  }

  getCategoryDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.parameterCategoryService.getParameterCategoryDropdown(searchTerm, pageNo, pageSize);
  };

  getOrientationDropdown = (searchTerm: string, pageNo: number, pageSize: number) => {
    return this.specimenOrientationService.getSpecimenOrientationDropdown(searchTerm, pageNo, pageSize);
  };

  openLinkedMaster(route: string): void {
    window.open(route, '_blank');
  }

  onOrientationSelected(selectedItems: any[]): void {
    const orientationsArray = this.ParameterForm.get('allowedOrientations') as FormArray;
    orientationsArray.clear();
    const ids = selectedItems.map((item: any) => item.id || item);
    ids.forEach((id: number) => {
      orientationsArray.push(this.fb.group({ specimenOrientationID: [id] }));
    });
    this.ParameterForm.get('allowedOrientationIds')?.setValue(ids);
  }

  @HostListener('window:focus')
  onWindowFocus(): void {}
}



