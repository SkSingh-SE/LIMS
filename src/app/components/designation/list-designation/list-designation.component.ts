import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DesignationService } from '../../../services/designation.service';
import { Designation } from '../../../models/designationModel';
import { LoaderService } from '../../../services/loader.service';
import { GlobalLoaderComponent } from '../../global-loader/global-loader.component';
@Component({
  selector: 'app-list-designation',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule,GlobalLoaderComponent],
  templateUrl: './list-designation.component.html',
  styleUrl: './list-designation.component.css'
})
export class ListDesignationComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  columnTypes: { [key in keyof Designation]: 'string' | 'number' | 'date' } = {
    id: 'number',
    name: 'string',
    description: 'string',
    createdBy: 'string',
    createdOn: 'date',
    modifiedBy: 'string',
    modifiedOn: 'date',
  };

  filters: { column: keyof Designation; type: string; value: any; value2?: any }[] = [];
  filterColumn: keyof Designation | null = null;
  filterType: 'Contains' | 'Equal' | 'NotEqual' | 'GreaterThan' | 'LessThan' | 'Between' = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  designationForm: FormGroup;
  designations: Designation[] = [];
  filteredDesignations: Designation[] = [];

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

  constructor(private fb: FormBuilder, private designationService: DesignationService, private loaderService: LoaderService) {
    this.designationForm = this.fb.group({
      searchTerm: '',
      sortByColumn: '',
      sortOrder: '',
      filters: this.fb.group({})
    });
  }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.loaderService.show();
    this.isLoading.set(true);
    this.designationService.getAllDesignations(this.payload).subscribe(
      (response) => {
        this.designations = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.filteredDesignations = this.designations;
        this.isLoading.set(false);
        this.loaderService.hide();
      },
      (error) => {
        console.error('Error fetching designations:', error);
        this.designations= this.filteredDesignations = [];
        this.isLoading.set(false);
        this.loaderService.hide();
      }
    );
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

  openFilterModal(column: keyof Designation, event: MouseEvent) {
    this.filterColumn = column;
    this.filterValue = '';
    this.filterValue2 = '';
    this.filterType = this.columnTypes[column] === 'string' ? 'Contains' : this.columnTypes[column] === 'date' ? 'Between' : 'Equal';
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


  // applyAllFilters() {
  //   return this.filteredDesignations = this.designations.filter((item) => {
  //     return this.filters.every(({ column, type, value, value2 }) => {
  //       const validColumn: keyof Designation = column ?? "name";
  //       const fieldValue = this.getFieldValue(item[column], this.columnTypes[validColumn] ?? 'string');
  //       return this.applyFilterCondition(fieldValue, type, value, value2, this.columnTypes[column] ?? 'string');
  //     });
  //   });
  // }


  private getFieldValue(fieldValue: any, type: string) {
    if (type === 'string') return fieldValue?.toString().toLowerCase() || "";
    if (type === 'number') return Number(fieldValue) || 0;
    if (type === 'date') return fieldValue ? new Date(fieldValue).getTime() : 0;
    return fieldValue;
  }

  private applyFilterCondition(fieldValue: any, type: string, value: any, value2: any, columnType: string) {
    if (columnType === 'string') {
      const filterText = value.toLowerCase();
      switch (type) {
        case 'Contains': return fieldValue.includes(filterText);
        case 'Equal': return fieldValue === filterText;
        case 'NotEqual': return fieldValue !== filterText;
      }
    } else if (columnType === 'number') {
      const filterNum = Number(value);
      switch (type) {
        case 'Equal': return fieldValue === filterNum;
        case 'NotEqual': return fieldValue !== filterNum;
        case 'GreaterThan': return fieldValue > filterNum;
        case 'LessThan': return fieldValue < filterNum;
      }
    } else if (columnType === 'date') {
      const filterDate = new Date(value).getTime();
      if (type === 'Between' && value2) {
        const filterDate2 = new Date(value2).getTime();
        return fieldValue >= filterDate && fieldValue <= filterDate2;
      }
      switch (type) {
        case 'Equal': return fieldValue === filterDate;
        case 'NotEqual': return fieldValue !== filterDate;
        case 'GreaterThan': return fieldValue > filterDate;
        case 'LessThan': return fieldValue < filterDate;
      }
    }
    return false;
  }



  resetFilter(column: keyof Designation) {
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
  hasFilter(column: keyof Designation): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }
}
