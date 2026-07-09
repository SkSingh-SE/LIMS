import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Modal } from 'bootstrap';
import { ToastService } from '../../../services/toast.service';
import { InvoiceCaseConfigurationService } from '../../../services/invoice-case-configuration.service';
import { ParameterService } from '../../../services/parameter.service';
import { concat, distinctUntilChanged, merge, Observable, Subject, switchMap, tap } from 'rxjs';
import { of } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';

interface TypeConfig {
  isRange: boolean;
  isSizeLoad?: boolean;
  inputType: 'text' | 'number' | 'select' | 'ecf';
  selectOptions?: { label: string; value: string }[];
  dimensionHint?: string;
  unit: string;
  valuePlaceholder: string;
  startPlaceholder: string;
  endPlaceholder: string;
  defaultValue: string;
}

@Component({
  selector: 'app-invoice-case-configurations',
  imports: [ CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NgSelectModule, PaginationComponent, MultiSelectDropdownComponent ],
  templateUrl: './invoice-case-configurations.component.html',
  styleUrl: './invoice-case-configurations.component.css'
})
export class InvoiceCaseConfigurationsComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'name', type: 'string', label: 'Invoice Case Name', filter: true },
    { key: 'aliasName', type: 'string', label: 'Alias Name', filter: true },
    { key: 'value', type: 'string', label: 'Value', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    name: 'string',
    aliasName: 'string',
    value: 'string',
    modifiedOn: 'date',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  isFilterOpen = false;
  invoiceList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  sortByColumn: string = 'modifiedOn';
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
  invoiceForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  invoiceId: number = 0;
  formTitle = 'Invoice Case Configuration Form';
  rangeError: string = '';

  // ElementCountFormula Override properties
  selectedOverrideParamIds: number[] = [];
  selectedOverrideParamItems: any[] = [];

  selectionTypes = [
    { label: 'Flat Rate',             value: 'FlatRate',           group: 'Fixed',        hint: 'Fixed price per test, no parameters needed' },
    { label: 'Element',               value: 'Element',            group: 'Single Value', hint: 'e.g. Ag, Fe, 10 Element' },
    { label: 'Hours',                 value: 'Hours',              group: 'Single Value', hint: 'e.g. 24hr, 672hr' },
    { label: 'Size',                  value: 'Size',               group: 'Single Value', hint: 'e.g. 10mm, 32mm' },
    { label: 'Load',                  value: 'Load',               group: 'Single Value', hint: 'e.g. 100kN, 500ton' },
    { label: 'Temperature',           value: 'Temperature',        group: 'Single Value', hint: 'e.g. RT, 0°C, -20°C' },
    { label: 'Day Wise',              value: 'DayWise',            group: 'Single Value', hint: 'e.g. 1 day, 7 days' },
    { label: 'Hours Range',           value: 'HoursRange',         group: 'Range',        hint: 'From – To hours' },
    { label: 'Size Range',            value: 'SizeRange',          group: 'Range',        hint: 'From – To mm' },
    { label: 'Load Range',            value: 'LoadRange',          group: 'Range',        hint: 'From – To kN/ton' },
    { label: 'Temperature Range',     value: 'TemperatureRange',   group: 'Range',        hint: 'From – To °C' },
    { label: 'Size + Load',           value: 'SizeLoad',           group: 'Combo',        hint: 'Size range + Max load capacity' },
    { label: 'Size + Load Range',     value: 'SizeAndLoad',        group: 'Combo',        hint: 'Size range + Load range' },
    { label: 'Spectro Combination',   value: 'SpectroCombination', group: 'Special',      hint: 'Full + extra elements (linked via parameter IDs)' },
    { label: 'Element Count Formula', value: 'ElementCountFormula', group: 'Formula',      hint: 'Tier pricing by element count + special element overrides' },
    { label: 'Per Indent',            value: 'PerIndent',          group: 'Quantity',     hint: 'HV 3 Readings, HV 5 Readings, Vickers 10 Values' },
    { label: 'Per Location',          value: 'PerLocation',        group: 'Quantity',     hint: '3 Locations, 5 Locations, 10 Locations' },
    { label: 'Per Field',             value: 'PerField',           group: 'Quantity',     hint: '5 Fields, 10 Fields, 30 Fields' },
    { label: 'Per Dolly',             value: 'PerDolly',           group: 'Quantity',     hint: '1 Dolly, 3 Dollies, 5 Dollies' },
    { label: 'With Image',            value: 'WithImage',          group: 'Conditional',  hint: 'Additional charge when test includes image capture' },
    { label: 'With Extensometer',     value: 'WithExtenso',        group: 'Conditional',  hint: 'Additional charge when extensometer is used' },
  ];

  /**
   * Drives ALL form behaviour per type.
   * To support a new type, add one entry here — no other code changes needed.
   */
  typeConfig: Record<string, TypeConfig> = {
    FlatRate:            { isRange: false, inputType: 'text',   unit: '',     valuePlaceholder: 'Flat',                        startPlaceholder: '', endPlaceholder: '', defaultValue: 'Flat' },
    Element:             { isRange: false, inputType: 'text',   unit: '',     valuePlaceholder: 'e.g. Ag, Fe, 10 Element',     startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    Hours:               { isRange: false, inputType: 'number', unit: 'hr',   valuePlaceholder: 'Enter hours (e.g. 24, 672)',  startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    Size:                { isRange: false, inputType: 'number', unit: 'mm',   valuePlaceholder: 'Enter size in mm',            startPlaceholder: '', endPlaceholder: '', defaultValue: '', dimensionHint: 'Value auto-detected from sample diameter (SampleDetail)' },
    Load:                { isRange: false, inputType: 'number', unit: 'kN',   valuePlaceholder: 'Enter load (e.g. 100, 500)',  startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    Temperature:         { isRange: false, inputType: 'text',   unit: '°C',   valuePlaceholder: 'e.g. RT, 0, -20',            startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    DayWise:             { isRange: false, inputType: 'number', unit: 'days', valuePlaceholder: 'Enter days (e.g. 1, 7)',      startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    HoursRange:          { isRange: true,  inputType: 'number', unit: 'hr',   valuePlaceholder: '', startPlaceholder: 'From (hr)', endPlaceholder: 'To (hr)', defaultValue: '' },
    SizeRange:           { isRange: true,  inputType: 'number', unit: 'mm',   valuePlaceholder: '', startPlaceholder: 'From (mm)', endPlaceholder: 'To (mm)', defaultValue: '', dimensionHint: 'Value auto-detected from sample diameter (SampleDetail)' },
    LoadRange:           { isRange: true,  inputType: 'number', unit: 'kN',   valuePlaceholder: '', startPlaceholder: 'From (kN)', endPlaceholder: 'To (kN)', defaultValue: '' },
    TemperatureRange:    { isRange: true,  inputType: 'text',   unit: '°C',   valuePlaceholder: '', startPlaceholder: 'From (°C)', endPlaceholder: 'To (°C)', defaultValue: '' },
    SizeLoad:            { isRange: false, isSizeLoad: true, inputType: 'number', unit: '', valuePlaceholder: 'Max Load (kN)', startPlaceholder: 'Min Size (mm)', endPlaceholder: 'Max Size (mm)', defaultValue: '' },
    SizeAndLoad:         { isRange: false, isSizeLoad: true, inputType: 'number', unit: '', valuePlaceholder: 'Max Load (kN)', startPlaceholder: 'Min Size (mm)', endPlaceholder: 'Max Size (mm)', defaultValue: '' },
    SpectroCombination:  { isRange: false, inputType: 'text',   unit: '',     valuePlaceholder: 'e.g. Full + N + B',           startPlaceholder: '', endPlaceholder: '', defaultValue: 'Full' },
    ElementCountFormula: { isRange: false, inputType: 'ecf',    unit: '',     valuePlaceholder: '',                            startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    PerIndent:           { isRange: false, inputType: 'number', unit: '×',    valuePlaceholder: 'No. of test readings (e.g. 3, 5, 10)',  startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    PerLocation:         { isRange: false, inputType: 'number', unit: '×',    valuePlaceholder: 'No. of locations (e.g. 3, 5, 10)',      startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    PerField:            { isRange: false, inputType: 'number', unit: '×',    valuePlaceholder: 'No. of fields (e.g. 5, 10, 30)',        startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    PerDolly:            { isRange: false, inputType: 'number', unit: '×',    valuePlaceholder: 'No. of dollies (e.g. 1, 3, 5)',         startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    WithImage:           { isRange: false, inputType: 'select', unit: '',     valuePlaceholder: 'Select',                      startPlaceholder: '', endPlaceholder: '', defaultValue: '1', selectOptions: [{ label: 'With Image', value: '1' }, { label: 'Without Image', value: '0' }] },
    WithExtenso:         { isRange: false, inputType: 'select', unit: '',     valuePlaceholder: 'Select',                      startPlaceholder: '', endPlaceholder: '', defaultValue: '1', selectOptions: [{ label: 'With Extensometer', value: '1' }, { label: 'Without Extensometer', value: '0' }] },
    // Legacy aliases — kept so existing DB records still render correctly
    Weight:              { isRange: false, inputType: 'number', unit: 'kN',   valuePlaceholder: 'Enter load (kN)',             startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    WeightRange:         { isRange: true,  inputType: 'number', unit: 'kN',   valuePlaceholder: '', startPlaceholder: 'From (kN)', endPlaceholder: 'To (kN)', defaultValue: '' },
    Temprature:          { isRange: false, inputType: 'text',   unit: '°C',   valuePlaceholder: 'e.g. RT, 0, -20',            startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
    TempratureRange:     { isRange: true,  inputType: 'text',   unit: '°C',   valuePlaceholder: '', startPlaceholder: 'From (°C)', endPlaceholder: 'To (°C)', defaultValue: '' },
    Other:               { isRange: false, inputType: 'text',   unit: '',     valuePlaceholder: 'Enter value',                 startPlaceholder: '', endPlaceholder: '', defaultValue: '' },
  };

  /** Returns true when the current type needs Start + End + Value (3+ fields). */
  get isSizeLoadType(): boolean {
    return this.currentConfig.isSizeLoad === true;
  }

  /** Returns true for SizeAndLoad (4-field variant: MinSize + MaxSize + MinLoad + MaxLoad). */
  get isSizeAndLoadType(): boolean {
    return this.invoiceForm?.get('selectionType')?.value === 'SizeAndLoad';
  }

  /** Dynamic placeholder for Name ng-select based on selected type. */
  get namePlaceholder(): string {
    const type = this.invoiceForm?.get('selectionType')?.value;
    if (!type) return 'Select type first';
    const found = this.selectionTypes.find(t => t.value === type);
    return found?.hint ? `e.g. ${found.hint}` : 'Type or select a name';
  }

  /** Returns config for the currently selected type. Falls back gracefully for unknown types. */
  get currentConfig(): TypeConfig {
    const type = this.invoiceForm?.get('selectionType')?.value as string;
    if (!type) return { isRange: false, inputType: 'text', unit: '', valuePlaceholder: 'Enter value', startPlaceholder: 'Start', endPlaceholder: 'End', defaultValue: '' };
    return this.typeConfig[type] ?? {
      isRange: type.toLowerCase().includes('range'),
      inputType: 'text',
      unit: '',
      valuePlaceholder: 'Enter value',
      startPlaceholder: 'Start',
      endPlaceholder: 'End',
      defaultValue: ''
    };
  }

  selectedSuggestion: any;
  suggestionList: {
    name: string;
    selectionType: string;
    value?: string;
    value2?: string;
    start?: string;
    end?: string;
    unit: string;
  }[] = [
      { selectionType: 'Element', name: 'Ag', value: 'Ag', unit: '' },
      { selectionType: 'Element', name: 'Au', value: 'Au', unit: '' },
      { selectionType: 'Element', name: 'Pt', value: 'Pt', unit: '' },
      { selectionType: 'Element', name: 'Ir', value: 'Ir', unit: '' },
      { selectionType: 'Element', name: 'Pd', value: 'Pd', unit: '' },
      { selectionType: 'Element', name: 'Se', value: 'Se', unit: '' },
      { selectionType: 'Element', name: 'Rh', value: 'Rh', unit: '' },
      { selectionType: 'Element', name: 'Te', value: 'Te', unit: '' },
      { selectionType: 'Element', name: '1 Element', value: '1', unit: '' },
      { selectionType: 'Element', name: '2 Element', value: '2', unit: '' },
      { selectionType: 'Element', name: '3 Element', value: '3', unit: '' },
      { selectionType: 'Element', name: '4 Element', value: '4', unit: '' },
      { selectionType: 'Element', name: '5 Element', value: '5', unit: '' },
      { selectionType: 'Element', name: '6 Element', value: '6', unit: '' },
      { selectionType: 'Element', name: '7 Element', value: '7', unit: '' },
      { selectionType: 'Element', name: '8 Element', value: '8', unit: '' },
      { selectionType: 'Element', name: '9 Element', value: '9', unit: '' },
      { selectionType: 'Element', name: '10 Element', value: '10', unit: '' },
      { selectionType: 'Element', name: '11 Element', value: '11', unit: '' },
      { selectionType: 'Element', name: '12 Element', value: '12', unit: '' },
      { selectionType: 'Element', name: '13 Element', value: '13', unit: '' },
      { selectionType: 'Element', name: '14 Element', value: '14', unit: '' },
      { selectionType: 'Element', name: '15 Element', value: '15', unit: '' },
      { selectionType: 'Element', name: '16 Element', value: '16', unit: '' },
      { selectionType: 'Element', name: '17 Element', value: '17', unit: '' },
      { selectionType: 'Element', name: '18 Element', value: '18', unit: '' },
      { selectionType: 'Element', name: '19 Element', value: '19', unit: '' },
      { selectionType: 'Element', name: '20 Element', value: '20', unit: '' },
      { selectionType: 'FlatRate', name: 'Flat', value: 'Flat', unit: '' },
      { selectionType: 'FlatRate', name: 'Standard Rate', value: 'Standard Rate', unit: '' },
      { selectionType: 'FlatRate', name: 'Premium Rate', value: 'Premium Rate', unit: '' },
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
      { selectionType: 'SizeRange', name: '10mm to 12mm', start: '10', end: '12', unit: 'mm' },
      { selectionType: 'SizeRange', name: '16mm to 20mm', start: '16', end: '20', unit: 'mm' },
      { selectionType: 'SizeRange', name: '<25mm', start: '0', end: '24', unit: 'mm' },
      { selectionType: 'SizeRange', name: '25mm to 50mm', start: '25', end: '50', unit: 'mm' },
      { selectionType: 'Weight', name: 'Up to 600KN', value: '600', unit: 'kn' },
      { selectionType: 'WeightRange', name: '601KN to 1000KN', start: '601', end: '1000', unit: 'kn' },
      { selectionType: 'Weight', name: 'Above 1000KN', value: '>1000', unit: 'kn' },
      { selectionType: 'Temprature', name: 'ASTM@RT', value: 'RT', unit: '°C' },
      { selectionType: 'Temprature', name: 'ASTM@0°C', value: '0', unit: '°C' },
      { selectionType: 'TempratureRange', name: 'ASTM@-1°C to -50°C', start: '-1', end: '-50', unit: '°C' },
      { selectionType: 'Other', name: '5 Field', value: '5', unit: '' },
      { selectionType: 'Other', name: '10 Field', value: '10', unit: '' },
      { selectionType: 'Other', name: '15 Field', value: '15', unit: '' },
      { selectionType: 'Other', name: '30 Field', value: '30', unit: '' },
      { selectionType: 'Other', name: 'E45 Method A', value: 'A', unit: '' },
      { selectionType: 'Other', name: 'E45 Method D', value: 'D', unit: '' },
      { selectionType: 'Other', name: 'ISO 643', value: 'ISO 643', unit: '' },
      { selectionType: 'SizeLoad', name: 'Size 0-20mm, Load ≤600kN', start: '0', end: '20', value: '600', unit: '' },
      { selectionType: 'SizeLoad', name: 'Size 0-20mm, Load ≤1000kN', start: '0', end: '20', value: '1000', unit: '' },
      { selectionType: 'SizeLoad', name: 'Size 20-40mm, Load ≤600kN', start: '20', end: '40', value: '600', unit: '' },
      { selectionType: 'SizeLoad', name: 'Size 20-40mm, Load ≤1000kN', start: '20', end: '40', value: '1000', unit: '' },
      { selectionType: 'SizeLoad', name: 'Size 40-60mm, Load ≤2000kN', start: '40', end: '60', value: '2000', unit: '' },
      { selectionType: 'SizeAndLoad', name: 'Size 0-25mm, Load 400-600kN', start: '0', end: '25', value: '400', value2: '600', unit: '' },
      { selectionType: 'SizeAndLoad', name: 'Size 0-25mm, Load 600-1000kN', start: '0', end: '25', value: '600', value2: '1000', unit: '' },
      { selectionType: 'SizeAndLoad', name: 'Size 25-50mm, Load 600-1000kN', start: '25', end: '50', value: '600', value2: '1000', unit: '' },
      { selectionType: 'SizeAndLoad', name: 'Size 25-50mm, Load 1000-2000kN', start: '25', end: '50', value: '1000', value2: '2000', unit: '' },
      // Load / LoadRange (replaces legacy Weight/WeightRange)
      { selectionType: 'Load', name: 'Up to 100kN', value: '100', unit: 'kN' },
      { selectionType: 'Load', name: 'Up to 300kN', value: '300', unit: 'kN' },
      { selectionType: 'Load', name: 'Up to 600kN', value: '600', unit: 'kN' },
      { selectionType: 'Load', name: 'Up to 1000kN', value: '1000', unit: 'kN' },
      { selectionType: 'Load', name: 'Up to 2000kN', value: '2000', unit: 'kN' },
      { selectionType: 'LoadRange', name: '100kN to 300kN', start: '100', end: '300', unit: 'kN' },
      { selectionType: 'LoadRange', name: '300kN to 600kN', start: '300', end: '600', unit: 'kN' },
      { selectionType: 'LoadRange', name: '600kN to 1000kN', start: '600', end: '1000', unit: 'kN' },
      { selectionType: 'LoadRange', name: '1000kN to 2000kN', start: '1000', end: '2000', unit: 'kN' },
      // Temperature / TemperatureRange
      { selectionType: 'Temperature', name: 'RT', value: 'RT', unit: '°C' },
      { selectionType: 'Temperature', name: '0°C', value: '0', unit: '°C' },
      { selectionType: 'Temperature', name: '-20°C', value: '-20', unit: '°C' },
      { selectionType: 'Temperature', name: '-40°C', value: '-40', unit: '°C' },
      { selectionType: 'Temperature', name: '-60°C', value: '-60', unit: '°C' },
      { selectionType: 'Temperature', name: '-80°C', value: '-80', unit: '°C' },
      { selectionType: 'Temperature', name: '-100°C', value: '-100', unit: '°C' },
      { selectionType: 'TemperatureRange', name: '-1°C to -20°C', start: '-1', end: '-20', unit: '°C' },
      { selectionType: 'TemperatureRange', name: '-20°C to -40°C', start: '-20', end: '-40', unit: '°C' },
      { selectionType: 'TemperatureRange', name: '-40°C to -60°C', start: '-40', end: '-60', unit: '°C' },
      { selectionType: 'TemperatureRange', name: '-60°C to -100°C', start: '-60', end: '-100', unit: '°C' },
      // DayWise
      { selectionType: 'DayWise', name: '1 Day', value: '1', unit: 'day' },
      { selectionType: 'DayWise', name: '3 Days', value: '3', unit: 'days' },
      { selectionType: 'DayWise', name: '7 Days', value: '7', unit: 'days' },
      { selectionType: 'DayWise', name: '14 Days', value: '14', unit: 'days' },
      { selectionType: 'DayWise', name: '28 Days', value: '28', unit: 'days' },
      { selectionType: 'DayWise', name: '56 Days', value: '56', unit: 'days' },
      { selectionType: 'DayWise', name: '90 Days', value: '90', unit: 'days' },
      { selectionType: 'DayWise', name: '180 Days', value: '180', unit: 'days' },
      // PerIndent — number of test readings/values given in the report per sample
      { selectionType: 'PerIndent', name: '3 Test Values', value: '3', unit: '' },
      { selectionType: 'PerIndent', name: '5 Test Values', value: '5', unit: '' },
      { selectionType: 'PerIndent', name: '10 Test Values', value: '10', unit: '' },
      { selectionType: 'PerIndent', name: '15 Test Values', value: '15', unit: '' },
      // PerLocation
      { selectionType: 'PerLocation', name: '1 Location', value: '1', unit: '' },
      { selectionType: 'PerLocation', name: '3 Locations', value: '3', unit: '' },
      { selectionType: 'PerLocation', name: '5 Locations', value: '5', unit: '' },
      { selectionType: 'PerLocation', name: '10 Locations', value: '10', unit: '' },
      // PerField
      { selectionType: 'PerField', name: '5 Fields', value: '5', unit: '' },
      { selectionType: 'PerField', name: '10 Fields', value: '10', unit: '' },
      { selectionType: 'PerField', name: '15 Fields', value: '15', unit: '' },
      { selectionType: 'PerField', name: '30 Fields', value: '30', unit: '' },
      // PerDolly
      { selectionType: 'PerDolly', name: '1 Dolly', value: '1', unit: '' },
      { selectionType: 'PerDolly', name: '3 Dollies', value: '3', unit: '' },
      { selectionType: 'PerDolly', name: '5 Dollies', value: '5', unit: '' },
      // WithImage / WithExtenso
      { selectionType: 'WithImage', name: 'With Image', value: '1', unit: '' },
      { selectionType: 'WithImage', name: 'Without Image', value: '0', unit: '' },
      { selectionType: 'WithExtenso', name: 'With Extensometer', value: '1', unit: '' },
      { selectionType: 'WithExtenso', name: 'Without Extensometer', value: '0', unit: '' },
      // ElementCountFormula Tiers
      { selectionType: 'ElementCountFormula', name: '<=1 elements', value: '<=1', unit: '' },
      { selectionType: 'ElementCountFormula', name: '==2 elements', value: '==2', unit: '' },
      { selectionType: 'ElementCountFormula', name: '==3 elements', value: '==3', unit: '' },
      { selectionType: 'ElementCountFormula', name: '>=3 elements', value: '>=3', unit: '' },
      { selectionType: 'ElementCountFormula', name: '>3 elements', value: '>3', unit: '' },
      { selectionType: 'ElementCountFormula', name: '<=3 elements', value: '<=3', unit: '' },
      { selectionType: 'ElementCountFormula', name: '==4 elements', value: '==4', unit: '' },
      { selectionType: 'ElementCountFormula', name: '>=4 elements', value: '>=4', unit: '' },
      { selectionType: 'ElementCountFormula', name: 'override (Special Element)', value: 'override', unit: '' }
    ];

  filteredSuggestions: any[] = [];
  nameInput$ = new Subject<string>();
  typeChange$ = new Subject<string>();
  filteredSuggestions$!: Observable<any[]>;
  nameLoading = false;

  // ─── Parameter picker state ──────────────────────────────────────────────────

  /** Category filter for the parameter picker. SpectroCombination is always Chemical. */
  parameterCategory: 'Chemical' | 'Mechanical' | 'All' = 'Chemical';

  /** Bumped on type/category change to force MultiSelectDropdown to reload. */
  paramPickerReloadKey = 0;

  /** Pre-selected parameter IDs for edit rebind (array of numeric IDs). */
  selectedParamIds: number[] = [];

  /** Full selected items (with names) — used to auto-generate SpectroCombination name. */
  selectedParamItems: any[] = [];

  /** Types that need the parameter multi-select picker.
   *  WithImage/WithExtenso excluded — ValueSource=UserInputAtEntry, user confirms at test entry, no parameter linking needed.
   *  SizeLoad/SizeAndLoad included — load dimension resolved from linked parameter. */
  private readonly paramPickerTypes = new Set([
    'SpectroCombination',
    'Hours', 'HoursRange',
    'Load', 'LoadRange',
    'Temperature', 'TemperatureRange',
    'DayWise',
    'SizeLoad', 'SizeAndLoad',
    'PerLocation', 'PerField', 'PerDolly',
  ]);

  /** Returns true when the selected type needs the parameter picker. */
  get showParamPicker(): boolean {
    const type = this.invoiceForm?.get('selectionType')?.value;
    return !!type && this.paramPickerTypes.has(type);
  }

  /** Returns true when SpectroCombination is selected (chemical-only picker, no category toggle). */
  get isSpectroType(): boolean {
    return this.invoiceForm?.get('selectionType')?.value === 'SpectroCombination';
  }

  /** Returns the default parameter category for a given selection type. */
  private defaultCategoryForType(type: string | null): 'Chemical' | 'Mechanical' | 'All' {
    if (!type || type === 'SpectroCombination') return 'Chemical';
    if (['Load', 'LoadRange', 'Weight', 'WeightRange', 'SizeLoad', 'SizeAndLoad'].includes(type)) return 'Mechanical';
    return 'All';
  }

  /** Returns true when IsBaseConfig toggle is on (Full base tier). */
  get isBaseConfig(): boolean {
    return !!this.invoiceForm?.get('isBaseConfig')?.value;
  }

  /** Called when IsBaseConfig toggle changes — reset name to match the new tier. */
  onBaseConfigToggle(): void {
    this.invoiceForm.patchValue({ name: '', value: '', sourceParameterIDs: '' });
    this.selectedParamIds = [];
    this.selectedParamItems = [];
    this.paramPickerReloadKey++;
  }

  /** fetchDataFn for MultiSelectDropdownComponent — switches based on category. */
  getLinkedParamsFn = (searchTerm: string, page: number, pageSize: number): Observable<any[]> => {
    const cat = this.isSpectroType ? 'Chemical' : this.parameterCategory;
    if (cat === 'Chemical') return this.parameterService.getChemicalParameterDropdown(searchTerm, page, pageSize);
    if (cat === 'Mechanical') return this.parameterService.getMechanicalParameterDropdown(searchTerm, page, pageSize);
    return this.parameterService.getParameterDropdown(searchTerm, page, pageSize);
  };

  getOverrideParamsFn = (searchTerm: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getParameterDropdown(searchTerm, page, pageSize, 'special,super');
  };

  onOverrideSelected(items: any[]): void {
    this.selectedOverrideParamItems = items || [];
    const ids = this.selectedOverrideParamItems.map((i: any) => i.id).join(',');
    this.invoiceForm.patchValue({ overrideParameterIDs: ids });
  }

  onParamSelected(items: any[]): void {
    this.selectedParamItems = items || [];
    const ids = this.selectedParamItems.map((i: any) => i.id).join(',');
    this.invoiceForm.patchValue({ sourceParameterIDs: ids });

    // SpectroCombination: auto-generate name (and value) from selected parameter names
    if (this.isSpectroType) {
      const paramNames = this.selectedParamItems.map((i: any) => i.name?.trim()).filter(Boolean);
      let generatedName: string;
      if (this.isBaseConfig) {
        // Base tier: name is always "Full" regardless of how many standard elements are selected
        generatedName = 'Full';
      } else {
        // Extra tier: "Full + Param1 + Param2..."
        generatedName = paramNames.length > 0 ? 'Full + ' + paramNames.join(' + ') : '';
      }
      this.invoiceForm.patchValue({ name: generatedName, value: generatedName });
      this.selectedSuggestion = { name: generatedName };
    }
  }

  onCategoryChange(): void {
    this.paramPickerReloadKey++;
    this.selectedParamIds = [];
    this.selectedParamItems = [];
    this.invoiceForm.patchValue({ sourceParameterIDs: '' });
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private invoiceCaseConfig: InvoiceCaseConfigurationService,
    private parameterService: ParameterService,
    private toastService: ToastService
  ) {
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
    this.updateSuggestionsList();
  }

  initForm() {
    this.invoiceForm = this.fb.group({
      id: [0],
      selectionType: [null, Validators.required],
      name: ['', Validators.required],
      aliasName: [''],
      aliasNames: this.fb.array([]),
      value: [''],
      value2: [''],
      start: [''],
      end: [''],
      unit: [''],
      sourceParameterIDs: [''],
      isBaseConfig: [false],
      fallbackToUserInput: [false],
      conditionPrefix: ['<='],
      conditionNumber: [null],
      isOverrideRow: [false],
      overrideParameterIDs: ['']
    });

    // Also auto-update stored value on ECF form control changes
    this.invoiceForm.get('conditionPrefix')?.valueChanges.subscribe(() => this.updateEcfValueName());
    this.invoiceForm.get('conditionNumber')?.valueChanges.subscribe(() => this.updateEcfValueName());
    this.invoiceForm.get('isOverrideRow')?.valueChanges.subscribe(isOverride => {
      if (isOverride) {
        this.invoiceForm.get('value')?.setValue('override');
      } else {
        this.updateEcfValueName();
      }
    });
  }

  private updateEcfValueName(): void {
    if (this.isFormulaType && !this.isOverrideRow) {
      const prefix = this.invoiceForm.get('conditionPrefix')?.value || '<=';
      const num = this.invoiceForm.get('conditionNumber')?.value;
      const combinedVal = prefix + (num != null ? String(num) : '');
      this.invoiceForm.get('value')?.setValue(combinedVal);
    }
  }

  get isFormulaType(): boolean {
    return this.invoiceForm?.get('selectionType')?.value === 'ElementCountFormula';
  }

  get isOverrideRow(): boolean {
    return this.invoiceForm?.get('isOverrideRow')?.value === true;
  }

  parseCondition(val: string): { prefix: string; number: number | null } {
    if (!val) return { prefix: '<=', number: null };
    const match = val.match(/^(<=|==|>=|<|>)\s*(\d+)$/);
    if (match) {
      return { prefix: match[1], number: parseInt(match[2], 10) };
    }
    return { prefix: '<=', number: null };
  }

  // Simulator properties




  setupAutocomplete(): void {
    const typeSearch$ = this.nameInput$.pipe(
      distinctUntilChanged(),
      tap(() => (this.nameLoading = true)),
      switchMap((term: string) => {
        const currentType = this.invoiceForm.get('selectionType')?.value;
        const results = this.suggestionList.filter(s =>
          (!currentType || s.selectionType === currentType) &&
          s.name?.toLowerCase().includes(term?.toLowerCase() || '')
        );
        return of(results).pipe(tap(() => (this.nameLoading = false)));
      })
    );

    const typeChanged$ = this.typeChange$.pipe(
      switchMap((type: string) => {
        const results = type
          ? this.suggestionList.filter(s => s.selectionType === type)
          : [];
        return of(results);
      })
    );

    this.filteredSuggestions$ = concat(of([]), merge(typeSearch$, typeChanged$));
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

  // ─── Type change ─────────────────────────────────────────────────────────────

  updateSuggestionsList(): void {
    const currentType = this.invoiceForm?.get('selectionType')?.value;
    this.filteredSuggestions = this.suggestionList.filter(s =>
      !currentType || s.selectionType === currentType
    );
  }

  onTypeChange(): void {
    const config = this.currentConfig;
    const type = this.invoiceForm.get('selectionType')?.value;
    this.rangeError = '';
    this.invoiceForm.patchValue({
      unit: config.unit,
      value: config.defaultValue,
      value2: '',
      start: '',
      end: '',
      name: '',
      sourceParameterIDs: '',
      isBaseConfig: false,
      fallbackToUserInput: false
    });
    this.selectedSuggestion = null;
    this.selectedParamIds = [];
    this.selectedParamItems = [];
    this.parameterCategory = this.defaultCategoryForType(type);
    this.paramPickerReloadKey++;
    this.applyValidatorsForType(config.isRange);
    // For select types with a defaultValue, auto-generate name from the default option label
    if (config.inputType === 'select' && config.defaultValue) {
      this.autoGenerateName();
    }
    // Emit type change so Name suggestions auto-filter for this type
    this.typeChange$.next(type || '');
    this.updateSuggestionsList();
  }

  private applyValidatorsForType(isRange: boolean): void {
    const config = this.currentConfig;
    if (config.isSizeLoad) {
      // SizeLoad/SizeAndLoad: Start + End + Value always required
      this.invoiceForm.get('start')?.setValidators([Validators.required]);
      this.invoiceForm.get('end')?.setValidators([Validators.required]);
      this.invoiceForm.get('value')?.setValidators([Validators.required]);
      // SizeAndLoad (4-field): value2 = MaxLoad also required
      if (this.isSizeAndLoadType) {
        this.invoiceForm.get('value2')?.setValidators([Validators.required]);
      } else {
        this.invoiceForm.get('value2')?.clearValidators();
      }
    } else if (isRange) {
      this.invoiceForm.get('start')?.setValidators([Validators.required]);
      this.invoiceForm.get('end')?.setValidators([Validators.required]);
      this.invoiceForm.get('value')?.clearValidators();
      this.invoiceForm.get('value2')?.clearValidators();
    } else {
      this.invoiceForm.get('value')?.setValidators([Validators.required]);
      this.invoiceForm.get('start')?.clearValidators();
      this.invoiceForm.get('end')?.clearValidators();
      this.invoiceForm.get('value2')?.clearValidators();
    }
    this.invoiceForm.get('value')?.updateValueAndValidity();
    this.invoiceForm.get('value2')?.updateValueAndValidity();
    this.invoiceForm.get('start')?.updateValueAndValidity();
    this.invoiceForm.get('end')?.updateValueAndValidity();
  }

  // ─── Auto name generation ────────────────────────────────────────────────────

  /**
   * Single unified method called by any value/start/end input event.
   * Generates the name based on the current type config.
   */
  autoGenerateName(): void {
    const config = this.currentConfig;
    const type = this.invoiceForm.get('selectionType')?.value;
    if (!type) return;

    this.rangeError = '';

    let generatedName = '';

    if (config.isSizeLoad) {
      const start = (this.invoiceForm.get('start')?.value ?? '').toString().trim();
      const end   = (this.invoiceForm.get('end')?.value ?? '').toString().trim();
      const value = (this.invoiceForm.get('value')?.value ?? '').toString().trim();

      // Size range validation
      if (start && end) {
        const s = parseFloat(start), e = parseFloat(end);
        if (!isNaN(s) && !isNaN(e) && s >= e) {
          this.rangeError = 'Min Size must be less than Max Size.';
          return;
        }
      }

      if (this.isSizeAndLoadType) {
        // SizeAndLoad: 4 fields → "Size 0-25mm, Load 400-1000kN"
        const value2 = (this.invoiceForm.get('value2')?.value ?? '').toString().trim();
        if (value && value2) {
          const v = parseFloat(value), v2 = parseFloat(value2);
          if (!isNaN(v) && !isNaN(v2) && v >= v2) {
            this.rangeError = 'Min Load must be less than Max Load.';
            return;
          }
        }
        if (!start && !end && !value && !value2) return;
        generatedName = `Size ${start}-${end}mm, Load ${value}-${value2}kN`;
      } else {
        // SizeLoad: 3 fields → "Size 0-20mm, Load ≤1000kN"
        if (!start && !end && !value) return;
        generatedName = `Size ${start}-${end}mm, Load ≤${value}kN`;
      }
    } else if (config.isRange) {
      const start = (this.invoiceForm.get('start')?.value ?? '').toString().trim();
      const end   = (this.invoiceForm.get('end')?.value ?? '').toString().trim();

      // Real-time numeric range validation
      if (config.inputType === 'number' && start && end) {
        const s = parseFloat(start), e = parseFloat(end);
        if (!isNaN(s) && !isNaN(e) && s >= e) {
          this.rangeError = 'Start value must be less than End value.';
          return;
        }
      }
      if (!start && !end) return;

      generatedName = config.unit
        ? `${start}${config.unit} to ${end}${config.unit}`
        : `${start} to ${end}`;
    } else {
      const value = (this.invoiceForm.get('value')?.value ?? '').toString().trim();
      if (!value) return;
      // For select-type inputs (e.g. WithImage, WithExtenso), use the option label, not raw value
      let displayValue = value;
      if (config.inputType === 'select' && config.selectOptions) {
        const opt = config.selectOptions.find(o => o.value === value);
        if (opt) displayValue = opt.label;
      }
      generatedName = config.unit ? `${displayValue}${config.unit}` : displayValue;
    }

    if (generatedName) {
      const prefix = `[${type}]`;
      const finalName = generatedName.startsWith(prefix) ? generatedName : `${prefix} ${generatedName}`;
      this.invoiceForm.patchValue({ name: finalName });
      this.selectedSuggestion = { name: finalName };
    }
  }

  // ─── Suggestion selection ────────────────────────────────────────────────────

  onSuggestionSelected(selection: any): void {
    if (!selection) {
      this.invoiceForm.patchValue({ name: '' });
      return;
    }

    // Full suggestion object from predefined list
    if (typeof selection === 'object' && selection.selectionType) {
      const cfg = this.typeConfig[selection.selectionType];
      const isRange = cfg?.isRange ?? selection.selectionType.toLowerCase().includes('range');
      
      let suggestionName = selection.name;
      const prefix = `[${selection.selectionType}]`;
      if (suggestionName && !suggestionName.startsWith(prefix)) {
        suggestionName = `${prefix} ${suggestionName}`;
      }

      this.invoiceForm.patchValue({
        name: suggestionName,
        selectionType: selection.selectionType,
        unit: selection.unit ?? cfg?.unit ?? '',
        value: selection.value || '',
        value2: selection.value2 || '',
        start: selection.start || '',
        end: selection.end || ''
      });
      this.applyValidatorsForType(isRange);
      this.selectedSuggestion = { ...selection, name: suggestionName };
      this.nameLoading = false;
      return;
    }

    // Custom typed string (ng-select addTag)
    const label = (typeof selection === 'string' ? selection : selection?.name)?.trim();
    if (!label) return;

    const spectro = this.processSpectroCombination(label.toLowerCase());
    if (spectro.valid && spectro.suggestion) {
      const s = spectro.suggestion;
      this.invoiceForm.patchValue({
        name: s.name, selectionType: s.selectionType,
        unit: s.unit || '', value: s.value || '', start: '', end: ''
      });
      this.applyValidatorsForType(false);
      this.selectedSuggestion = s;
    } else {
      // Just apply as the name; keep current type/value intact
      this.invoiceForm.patchValue({ name: label });
      this.selectedSuggestion = { name: label };
    }
    this.nameLoading = false;
  }

  processSpectroCombination(label: string): { valid: boolean; suggestion?: any } {
    const input = label.replace(/\s+/g, '').toLowerCase();
    if (!input.startsWith('full')) return { valid: false };

    const parts = input.split('+').map(p => p.trim());
    if (parts[0] !== 'full') return { valid: false };

    const elements = parts.slice(1);
    const existingNames = this.suggestionList
      .filter(s => s.selectionType === 'Element')
      .map(s => s.name.toLowerCase());

    const newElements: string[] = [];
    elements.forEach(el => {
      const cap = el.charAt(0).toUpperCase() + el.slice(1);
      if (!existingNames.includes(el)) {
        this.suggestionList.push({ selectionType: 'Element', name: cap, value: cap, unit: '' });
      }
      newElements.push(cap);
    });

    const formatted = ['Full', ...newElements].join(' + ');
    return {
      valid: true,
      suggestion: { name: formatted, selectionType: 'SpectroCombination', value: formatted, unit: '' }
    };
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────

  fetchData() {
    this.invoiceCaseConfig.getAllInvoiceCaseConfigs(this.payload).subscribe({
      next: (response) => {
        this.invoiceList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.invoiceList = [];
      }
    });
  }

  getDetails(): void {
    const requestId = this.invoiceId;
    this.invoiceCaseConfig.getInvoiceCaseConfigById(requestId).subscribe({
      next: (res: any) => {
        if (this.invoiceId !== requestId) return;
        if (!res) return;

        const aliasArray = this.fb.array<FormGroup>([]);
        (res.aliasNames || []).forEach((alias: any) => {
          aliasArray.push(this.fb.group({
            id: [alias.id],
            invoiceConfigurationID: [alias.invoiceConfigurationID],
            name: [alias.name]
          }));
        });

        // SizeAndLoad stores "minLoad-maxLoad" in value — split back for UI
        let loadValue = res.value;
        let loadValue2 = '';
        if (res.selectionType === 'SizeAndLoad' && res.value?.includes('-')) {
          const parts = res.value.split('-');
          loadValue = parts[0];
          loadValue2 = parts[1];
        }

        let prefix = '<=';
        let num: number | null = null;
        let isOverride = false;

        if (res.selectionType === 'ElementCountFormula') {
          if (res.value === 'override') {
            isOverride = true;
          } else {
            const parsed = this.parseCondition(res.value || '');
            prefix = parsed.prefix;
            num = parsed.number;
          }
        }

        this.invoiceForm.patchValue({
          id: res.id,
          selectionType: res.selectionType,
          name: res.name,
          aliasName: res.aliasName,
          value: loadValue,
          value2: loadValue2,
          start: res.start,
          end: res.end,
          unit: res.unit,
          sourceParameterIDs: res.sourceParameterIDs || '',
          isBaseConfig: res.isBaseConfig || false,
          fallbackToUserInput: res.fallbackToUserInput || false,
          conditionPrefix: prefix,
          conditionNumber: num,
          isOverrideRow: isOverride,
          overrideParameterIDs: res.overrideParameterIDs || ''
        });

        if (res.overrideParameterIDs) {
          this.selectedOverrideParamIds = res.overrideParameterIDs
            .split(',')
            .map((s: string) => parseInt(s.trim(), 10))
            .filter((id: number) => !isNaN(id) && id > 0);
        } else {
          this.selectedOverrideParamIds = [];
        }

        this.updateSuggestionsList();

        // Restore parameter category for the picker
        this.parameterCategory = this.defaultCategoryForType(res.selectionType);

        // Restore multi-select picker pre-selection from comma-separated IDs
        if (res.sourceParameterIDs) {
          this.selectedParamIds = res.sourceParameterIDs
            .split(',')
            .map((s: string) => parseInt(s.trim(), 10))
            .filter((id: number) => !isNaN(id) && id > 0);
        } else {
          this.selectedParamIds = [];
        }
        this.paramPickerReloadKey++;
        this.invoiceForm.setControl('aliasNames', aliasArray);

        // Restore ng-select display with the saved name
        this.selectedSuggestion = { name: res.name };

        // Re-apply validators based on the loaded type
        const cfg = this.typeConfig[res.selectionType];
        const isRange = cfg?.isRange ?? res.selectionType?.toLowerCase().includes('range') ?? false;
        this.applyValidatorsForType(isRange);
      },
      error: err => this.toastService.show(err.error?.message || err.message, 'error')
    });
  }

  // ─── Form submit ──────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      return;
    }

    // Block on live range error or run a fresh range check
    if (this.rangeError) {
      this.toastService.show(this.rangeError, 'error');
      return;
    }

    const payload = this.invoiceForm.getRawValue();

    // ECF formatting:
    if (payload.selectionType === 'ElementCountFormula') {
      if (payload.isOverrideRow) {
        payload.value = 'override';
      } else {
        payload.value = (payload.conditionPrefix || '<=') + String(payload.conditionNumber || 0);
        payload.overrideParameterIDs = null;
      }
    } else {
      payload.overrideParameterIDs = null;
    }
    delete payload.conditionPrefix;
    delete payload.conditionNumber;
    delete payload.isOverrideRow;

    // Backend expects string fields — number inputs produce numeric values
    payload.value = payload.value != null && payload.value !== '' ? String(payload.value) : '';
    payload.start = payload.start != null && payload.start !== '' ? String(payload.start) : '';
    payload.end = payload.end != null && payload.end !== '' ? String(payload.end) : '';
    // SizeAndLoad: combine MinLoad-MaxLoad into single value field for DB
    if (payload.selectionType === 'SizeAndLoad' && payload.value2 != null && payload.value2 !== '') {
      payload.value = `${payload.value}-${String(payload.value2)}`;
    }
    delete payload.value2; // Not in backend model
    payload.aliasName = payload.aliasNames.map((a: any) => a.name).join(', ');

    const saveFn = this.invoiceId > 0
      ? this.invoiceCaseConfig.updateInvoiceCaseConfig
      : this.invoiceCaseConfig.createInvoiceCaseConfig;

    saveFn.call(this.invoiceCaseConfig, [payload]).subscribe({
      next: (res: any) => {
        this.toastService.show(res.message, 'success');
        this.closeModal();
        this.initForm();
        this.fetchData();
      },
      error: (err: any) => this.toastService.show(err.error?.message || err.message, 'error')
    });
  }

  // ─── Modal ───────────────────────────────────────────────────────────────────

  openModal(type: string, id: number): void {
    this.invoiceForm.reset();
    this.invoiceForm.enable();
    this.invoiceId = 0;
    this.selectedSuggestion = null;
    this.rangeError = '';
    this.selectedOverrideParamIds = [];
    this.selectedOverrideParamItems = [];

    if (id > 0) {
      this.invoiceId = id;
      this.getDetails();
    }

    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      if (this.aliasNames.length === 0) this.addAlias();
      this.formTitle = 'Invoice Case Configuration Form';
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Invoice Case Configuration Form';
      this.invoiceForm.enable();
    } else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Invoice Case Configuration';
      this.invoiceForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  closeModal(): void {
    if (this.bsModal) this.bsModal.hide();
    this.invoiceForm.reset();
    this.invoiceForm.enable();
    this.invoiceId = 0;
    this.selectedSuggestion = null;
    this.rangeError = '';
    this.isEditMode = false;
    this.isViewMode = false;
    this.selectedParamIds = [];
    this.selectedParamItems = [];
    this.selectedOverrideParamIds = [];
    this.selectedOverrideParamItems = [];
    this.parameterCategory = 'Chemical';
    this.paramPickerReloadKey++;
  }

  // ─── Table helpers ────────────────────────────────────────────────────────────

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
    this.columns.forEach(col => { if (col.key === column) this.filterColumnTitle = col.label; });
    this.filterValue = '';
    this.filterValue2 = '';

    const columnType = this.filterColumnTypes[column];
    this.filterType = columnType === 'number' ? 'Equal' : columnType === 'date' ? 'Between' : 'Contains';

    this.isFilterOpen = true;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;

      // Clamp to viewport so the popup doesn't overflow
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
    this.payload.filter = this.filters;
    this.fetchData();
  }

  closeFilterModal() {
    if (this.filterModal) this.filterModal.nativeElement.style.display = 'none';
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.payload.PageNumber = this.pageNumber;
    this.fetchData();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
  }

  onSearch() {
    if (this.searchTerm !== this.payload.searchTerm) {
      this.pageNumber = 1;
      this.payload.PageNumber = 1;
      this.payload.searchTerm = this.searchTerm;
      this.fetchData();
    }
  }

  get totalPages(): number[] {
    return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
  }
  getStartRecord(): number { return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1; }
  getEndRecord(): number { return Math.min(this.pageNumber * this.pageSize, this.totalItems); }
  hasFilter(column: string): boolean { return this.filters?.some(f => f.column === column) ?? false; }

  deleteFn(id: number): void {
    if (id <= 0) return;
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    this.invoiceCaseConfig.deleteInvoiceCaseConfig(id).subscribe({
      next: (res) => { this.fetchData(); this.toastService.show(res.message, 'success'); },
      error: (err) => this.toastService.show(err.message, 'error')
    });
  }

  trackByFn(item: any) { return item.label; }
}
