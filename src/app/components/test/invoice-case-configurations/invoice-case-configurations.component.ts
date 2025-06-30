import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ToastService } from '../../../services/toast.service';
import { InvoiceCaseConfigurationService } from '../../../services/invoice-case-configuration.service';
import { concat, debounceTime, distinctUntilChanged, Observable, Subject, switchMap, tap } from 'rxjs';
import { of } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';


@Component({
  selector: 'app-invoice-case-configurations',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './invoice-case-configurations.component.html',
  styleUrl: './invoice-case-configurations.component.css'
})
export class InvoiceCaseConfigurationsComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'name', type: 'string', label: 'Invoice Case Name', filter: true },
    { key: 'aliasName', type: 'string', label: 'Alias Name', filter: true },
    { key: 'value', type: 'string', label: 'Value', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    name: 'string',
    aliasName: 'string',
    value: 'string'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  invoiceList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

  sortByColumn: string = 'id';
  sortOrder: string = 'asc';
  searchTerm: string = '';
  isLoading = signal(false);

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  // form
  invoiceForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  customerTypeObject: any = null;
  invoiceId: number = 0;
  formTitle = 'Invoice Case Configuration Form';

  selectionTypes = [
    { label: 'Element', value: 'Element' },
    { label: 'Hours', value: 'Hours' },
    { label: 'Size', value: 'Size' },
    { label: 'Weight', value: 'Weight' },
    { label: 'Temprature', value: 'Temprature' },
    { label: 'Hours Range', value: 'HoursRange' },
    { label: 'Size Range', value: 'SizeRange' },
    { label: 'Weight Range', value: 'WeightRange' },
    { label: 'Temprature Range', value: 'TempratureRange' },
    { label: 'Spectro Combination', value: 'SpectroCombination' },
    { label: 'Other', value: 'Other' }
  ];

  unitMap: { [key: string]: string } = {
    Element: 'Element',
    Hours: 'hr',
    Size: 'mm',
    Weight: 'kn',
    Temprature: '°C',
    HoursRange: 'hr',
    SizeRange: 'mm',
    WeightRange: 'kn',
    TempratureRange: '°C',
    Other: 'other'
  };

  selectedSuggestion: any;
  suggestionList: {
    name: string;
    selectionType: string;
    value?: string;
    start?: string;
    end?: string;
    unit: string;
  }[] = [
      { selectionType: 'Element', name: 'Ag', value: 'Ag', unit: 'Element' },
      { selectionType: 'Element', name: 'Au', value: 'Au', unit: 'Element' },
      { selectionType: 'Element', name: 'Pt', value: 'Pt', unit: 'Element' },
      { selectionType: 'Element', name: 'Ir', value: 'Ir', unit: 'Element' },
      { selectionType: 'Element', name: 'Pd', value: 'Pd', unit: 'Element' },
      { selectionType: 'Element', name: 'Se', value: 'Se', unit: 'Element' },
      { selectionType: 'Element', name: 'Rh', value: 'Rh', unit: 'Element' },
      { selectionType: 'Element', name: 'Te', value: 'Te', unit: 'Element' },
      { selectionType: 'Element', name: '1 Element', value: '1', unit: 'Element' },
      { selectionType: 'Element', name: '2 Element', value: '2', unit: 'Element' },
      { selectionType: 'Element', name: '3 Element', value: '3', unit: 'Element' },
      { selectionType: 'Element', name: '4 Element', value: '4', unit: 'Element' },
      { selectionType: 'Element', name: '5 Element', value: '5', unit: 'Element' },
      { selectionType: 'Element', name: '6 Element', value: '6', unit: 'Element' },
      { selectionType: 'Element', name: '7 Element', value: '7', unit: 'Element' },
      { selectionType: 'Element', name: '8 Element', value: '8', unit: 'Element' },
      { selectionType: 'Element', name: '9 Element', value: '9', unit: 'Element' },
      { selectionType: 'Element', name: '10 Element', value: '10', unit: 'Element' },
      { selectionType: 'Element', name: '11 Element', value: '11', unit: 'Element' },
      { selectionType: 'Element', name: '12 Element', value: '12', unit: 'Element' },
      { selectionType: 'Element', name: '13 Element', value: '13', unit: 'Element' },
      { selectionType: 'Element', name: '14 Element', value: '14', unit: 'Element' },
      { selectionType: 'Element', name: '15 Element', value: '15', unit: 'Element' },
      { selectionType: 'Element', name: '16 Element', value: '16', unit: 'Element' },
      { selectionType: 'Element', name: '17 Element', value: '17', unit: 'Element' },
      { selectionType: 'Element', name: '18 Element', value: '18', unit: 'Element' },
      { selectionType: 'Element', name: '19 Element', value: '19', unit: 'Element' },
      { selectionType: 'Element', name: '20 Element', value: '20', unit: 'Element' },
      { selectionType: 'Hours', name: '24hr', value: '24', unit: 'hr' },
      { selectionType: 'Hours', name: '24hr@RT', value: '24', unit: 'hr' },
      { selectionType: 'Hours', name: '24hr@HT', value: '24', unit: 'hr' },
      { selectionType: 'Hours', name: '28days@RT', value: '672', unit: 'hr' },
      { selectionType: 'Hours', name: '28days@HT', value: '672', unit: 'hr' },
      { selectionType: 'Other', name: 'With Photograph', value: 'Yes', unit: '' },
      { selectionType: 'Other', name: 'Without Photograph', value: 'No', unit: '' },
      { selectionType: 'Size', name: '10mm', value: '10', unit: 'mm' },
      { selectionType: 'Size', name: '12mm', value: '12', unit: 'mm' },
      { selectionType: 'Size', name: '32mm', value: '32', unit: 'mm' },
      { selectionType: 'Size', name: '36mm', value: '36', unit: 'mm' },
      { selectionType: 'Size', name: '40mm', value: '40', unit: 'mm' },
      { selectionType: 'SizeRange', name: '10 to 12mm', start: '10', end: '12', unit: 'mm' },
      { selectionType: 'SizeRange', name: '16 to 20mm', start: '16', end: '20', unit: 'mm' },
      { selectionType: 'SizeRange', name: '<25mm', start: '0', end: '24', unit: 'mm' },
      { selectionType: 'SizeRange', name: '25 to 50mm', start: '25', end: '50', unit: 'mm' },
      { selectionType: 'Weight', name: 'Up to 600KN', value: '600', unit: 'kn' },
      { selectionType: 'WeightRange', name: '601KN to 1000KN', start: '601', end: '1000', unit: 'kn' },
      { selectionType: 'Weight', name: 'Above 1000KN', value: '>1000', unit: 'kn' },
      { selectionType: 'Temprature', name: 'ASTM@RT', value: 'RT', unit: '°C' },
      { selectionType: 'Temprature', name: 'ASTM@0°C', value: '0', unit: '°C' },
      { selectionType: 'TempratureRange', name: 'ASTM@-1to-50°C', start: '-1', end: '50', unit: '°C' },
      { selectionType: 'PointType', name: 'Single Point', value: 'Single', unit: '' },
      { selectionType: 'PointType', name: 'Multi Point', value: 'Multi', unit: '' },
      { selectionType: 'Other', name: '5 Field', value: '5', unit: '' },
      { selectionType: 'Other', name: '10 Field', value: '10', unit: '' },
      { selectionType: 'Other', name: '15 Field', value: '15', unit: '' },
      { selectionType: 'Other', name: '30 Field', value: '30', unit: '' },
      { selectionType: 'Other', name: 'E45 Method A', value: 'A', unit: '' },
      { selectionType: 'Other', name: 'E45 Method D', value: 'D', unit: '' },
      { selectionType: 'Other', name: 'ISO 643', value: 'ISO 643', unit: '' },
      { selectionType: 'SpectroCombination', name: 'Full', value: 'Full', unit: '' },
      { selectionType: 'SpectroCombination', name: 'Full + N', value: 'Full + N', unit: '' },
      { selectionType: 'SpectroCombination', name: 'Full + B', value: 'Full + B', unit: '' },
      { selectionType: 'SpectroCombination', name: 'Full + Ca', value: 'Full + Ca', unit: '' },
      { selectionType: 'SpectroCombination', name: 'Full + N + B', value: 'Full + N + B', unit: '' },
      { selectionType: 'SpectroCombination', name: 'Full + N + Ca', value: 'Full + N + Ca', unit: '' },
      { selectionType: 'SpectroCombination', name: 'Full + B + Ca', value: 'Full + B + Ca', unit: '' },
      { selectionType: 'SpectroCombination', name: 'Full + B + N + Ca', value: 'Full + B + N + Ca', unit: '' },

    ];

  nameInput$ = new Subject<string>();
  filteredSuggestions$!: Observable<any[]>;
  nameLoading = false;

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private invoiceCaseConfig: InvoiceCaseConfigurationService, private toastService: ToastService) {
    this.route.params.subscribe(params => {
      this.invoiceId = params['id'] || 0;
      if (this.invoiceId > 0) {
        this.getDetails();
      }
    });

  }


  ngOnInit() {
    this.initForm();
    this.fetchData();
    this.setupAutocomplete();
  }

  initForm() {
    this.invoiceForm = this.fb.group({
      id: [0],
      selectionType: ['', Validators.required],
      name: [''],
      aliasName: [''],
      aliasNames: this.fb.array([]),
      value: [''],
      start: [''],
      end: [''],
      unit: ['']
    });
  }
  setupAutocomplete(): void {

    this.filteredSuggestions$ = concat(
      of([]), // default items
      this.nameInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.nameLoading = true)),
        switchMap((term: string) => {
          const results = this.suggestionList.filter(s =>
            s.name?.toLowerCase().includes(term?.toLowerCase())
          );
          return of(results).pipe(tap(() => (this.nameLoading = false)));
        })
      ),
    );
  }


  get aliasNames(): FormArray {
    return this.invoiceForm.get('aliasNames') as FormArray;
  }
  createAliasNameGroup(): FormGroup {
    return this.fb.group({
      id: [0],
      invoiceConfigurationID: [this.invoiceForm.get('id')?.value || 0],
      name: ['']
    });
  }

  addAlias(): void {
    this.aliasNames.push(this.createAliasNameGroup());
  }

  removeAlias(index: number): void {
    this.aliasNames.removeAt(index);
  }

  onTypeChange(): void {
    const type = this.invoiceForm.get('selectionType')?.value;
    const isRange = type?.toLowerCase().includes('range') || false;

    const unit = this.unitMap[type] || '';
    this.invoiceForm.patchValue({
      unit,
      value: '',
      start: '',
      end: ''
    });

    // Set validators
    if (isRange) {
      this.invoiceForm.get('start')?.setValidators([Validators.required]);
      this.invoiceForm.get('end')?.setValidators([Validators.required]);
      this.invoiceForm.get('value')?.clearValidators();
    } else {
      this.invoiceForm.get('value')?.setValidators([Validators.required]);
      this.invoiceForm.get('start')?.clearValidators();
      this.invoiceForm.get('end')?.clearValidators();
    }

    this.invoiceForm.get('value')?.updateValueAndValidity();
    this.invoiceForm.get('start')?.updateValueAndValidity();
    this.invoiceForm.get('end')?.updateValueAndValidity();

    // Auto-update name if value exists
    this.updateName();
    this.updateRangeName();

  }



  updateName(): void {
    const value = this.invoiceForm.get('value')?.value;
    const unit = this.invoiceForm.get('unit')?.value;
    const name = value + " " + unit;
    this.onSuggestionSelected(name);
    this.invoiceForm.patchValue({ name });
  }

  updateRangeName(): void {
    const start = this.invoiceForm.get('start')?.value;
    const end = this.invoiceForm.get('end')?.value;
    const unit = this.invoiceForm.get('unit')?.value;
    const name = `${start} - ${end} ${unit}`;
    this.onSuggestionSelected(name);
    this.invoiceForm.patchValue({ name });
  }

  fetchData() {
    this.invoiceCaseConfig.getAllInvoiceCaseConfigs(this.payload).subscribe({
      next: (response) => {
        this.invoiceList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.invoiceList = [];
        this.isLoading.set(false);
      }
    }
    );
  }


  getDetails(): void {
    this.invoiceCaseConfig.getInvoiceCaseConfigById(this.invoiceId).subscribe({
      next: (res: any) => {
        if (res) {
          const aliasArray: FormArray<FormGroup> = this.fb.array<FormGroup>([]);
          (res.aliasNames || []).forEach((alias: any) => {
            aliasArray.push(this.fb.group({
              id: [alias.id],
              invoiceConfigurationID: [alias.invoiceConfigurationID],
              name: [alias.name]
            }));
          });

          this.invoiceForm.patchValue({
            id: res.id,
            selectionType: res.selectionType,
            name: res.name,
            aliasName: res.aliasName,
            value: res.value,
            start: res.start,
            end: res.end,
            unit: res.unit
          });

          this.invoiceForm.setControl('aliasNames', aliasArray);
          this.updateName();
          this.updateRangeName();
        }
      },
      error: err => {
        this.toastService.show(err.error.message, 'error');
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
      this.invoiceCaseConfig.deleteInvoiceCaseConfig(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error.message, 'error');
        }
      });
    }
  }
  openModal(type: string, id: number): void {
    if (id > 0) {
      this.invoiceId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      if (this.aliasNames.length === 0) {
        this.addAlias();
      }
      this.formTitle = 'Invoice Case Configuration Form';
      this.invoiceForm.enable();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Invoice Case Configuration Form';
      this.invoiceForm.enable();

    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Invoice Case Configuration';
      this.invoiceForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  onSubmit(): void {
    if (this.invoiceForm.valid) {
      const payload = this.invoiceForm.getRawValue();
      payload.aliasName = payload.aliasNames.map((a: any) => a.name).join(', ');


      const saveFn = this.invoiceId > 0
        ? this.invoiceCaseConfig.updateInvoiceCaseConfig
        : this.invoiceCaseConfig.createInvoiceCaseConfig;

      let configurations = [payload];
      saveFn.call(this.invoiceCaseConfig, configurations).subscribe({
        next: (res: any) => {
          this.toastService.show(res.message, 'success');
          this.closeModal();
          this.initForm();
          this.fetchData()
        },
        error: (err: any) => this.toastService.show(err.error.message, 'error')
      });
    } else {
      this.invoiceForm.markAllAsTouched();
    }
  }

  onSuggestionSelected(selection: any): void {
    let label = typeof selection === 'string' ? selection.trim() : selection?.name?.trim();
    if (!label) return;

    // Normalize spacing
    label = label.replace(/\s+/g, ' ').toLowerCase();

    // Try exact match
    let suggestion = this.suggestionList.find(s => s.name.toLowerCase() === label);

    if (!suggestion) {
      const spectro = this.processSpectroCombination(label);
      
      // Try to match "10mm to 30mm" or "10 mm to 30 mm"
      const complexRangeMatch = label.match(/^(\d+)\s*(mm|hr|kn|°c)?\s*(to|-)\s*(\d+)\s*(mm|hr|kn|°c)?$/i);
      const simpleRangeMatch = label.match(/^(\d+)\s*(to|-)\s*(\d+)\s*(mm|hr|kn|°c)?$/i);
      const singleValueMatch = label.match(/^(\d+)\s*(mm|hr|kn|°c)?$/i);

      if (spectro.valid && spectro.suggestion) {
        suggestion = {
          name: spectro.suggestion?.name,
          selectionType: spectro.suggestion?.selectionType,
          start: spectro.suggestion?.start || '',
          end:spectro.suggestion?.end || '',
          unit: spectro.suggestion?.unit || '',
          value: spectro.suggestion?.value || '',
        };
      }
      else if (complexRangeMatch) {
        const [, start, unit1, , end, unit2] = complexRangeMatch;
        const unit = unit1 || unit2 || '';
        const selectionType = Object.entries(this.unitMap).find(([type, u]) => u === unit && type.toLowerCase().includes('range'))?.[0] || 'SizeRange';

        suggestion = {
          name: `${start} to ${end}${unit ? ' ' + unit : ''}`,
          selectionType,
          start,
          end,
          unit
        };
      }
      else if (simpleRangeMatch) {
        const [, start, , end, unit] = simpleRangeMatch;
        const u = unit || '';
        const selectionType = Object.entries(this.unitMap).find(([type, v]) => v === u && type.toLowerCase().includes('range'))?.[0] || 'SizeRange';

        suggestion = {
          name: `${start} to ${end}${u ? ' ' + u : ''}`,
          selectionType,
          start,
          end,
          unit: u
        };
      }
      else if (singleValueMatch) {
        const [, value, unit] = singleValueMatch;
        const u = unit || '';
        const selectionType = Object.entries(this.unitMap).find(([type, v]) => v === u && !type.toLowerCase().includes('range'))?.[0] || 'Other';

        suggestion = {
          name: `${value}${u ? ' ' + u : ''}`,
          selectionType,
          value,
          unit: u
        };
      }
      else {
        // fallback
        const selectionType = this.invoiceForm.get('selectionType')?.value || 'Other';
        const unit = this.unitMap[selectionType] || '';
        const isRange = selectionType?.toLowerCase().includes('range');

        suggestion = {
          name: label,
          selectionType,
          unit,
          ...(isRange
            ? {
              start: this.invoiceForm.get('start')?.value || '',
              end: this.invoiceForm.get('end')?.value || ''
            }
            : {
              value: this.invoiceForm.get('value')?.value || ''
            })
        };
      }

      // Add new suggestion
      this.suggestionList.push(suggestion);
    }

    // Apply values to form
    this.invoiceForm.patchValue({
      name: suggestion.name,
      selectionType: suggestion.selectionType,
      unit: suggestion.unit || '',
      value: suggestion.value || '',
      start: suggestion.start || '',
      end: suggestion.end || ''
    });

    this.selectedSuggestion = suggestion;
    this.nameLoading = false;
  }

  processSpectroCombination(label: string): { valid: boolean, suggestion?: any } {
    const input = label.replace(/\s+/g, '').toLowerCase();

    if (!input.startsWith('full')) return { valid: false };

    const parts = input.split('+').map(p => p.trim());
    if (parts[0] !== 'full') return { valid: false };

    const elements = parts.slice(1);

    const existingElementNames = this.suggestionList
      .filter(s => s.selectionType === 'Element')
      .map(s => s.name.toLowerCase());

    const newElements: string[] = [];

    // Add any missing elements to suggestionList
    elements.forEach(el => {
      const capitalized = el.charAt(0).toUpperCase() + el.slice(1);
      if (!existingElementNames.includes(el)) {
        this.suggestionList.push({
          selectionType: 'Element',
          name: capitalized,
          value: capitalized,
          unit: 'Element'
        });
      }
      newElements.push(capitalized);
    });

    const formatted = ['Full', ...newElements].join(' + ');

    return {
      valid: true,
      suggestion: {
        name: formatted,
        selectionType: 'SpectroCombination',
        value: formatted,
        unit: ''
      }
    };
  }


  trackByFn(item: any) {
    return item.label;
  }
}



