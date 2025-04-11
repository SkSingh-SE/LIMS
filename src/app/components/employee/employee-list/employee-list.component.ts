import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { EmployeeService } from '../../../services/employee.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-employee-list',
imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css'
})
export class EmployeeListComponent implements OnInit {
@ViewChild('filterModal') filterModal!: ElementRef;

columns = [
  { key: 'id', type:'number', label: 'SN',  filter:true },
  { key: 'name',type:'string', label: 'Name', filter:true },
  { key: 'emailId', type:'string', label: 'Email', filter:true },
  { key: 'dateOfJoin', type:'date', label: 'DOJ',filter:true },
  { key: 'dateOfBirth', type:'date', label: 'DOB',filter:true },
  { key: 'gender', type:'string', label: 'Gender',filter:true },
  { key: 'departmentName', type:'string', label: 'Department',filter:true },
  { key: 'designationName', type:'string', label: 'Designation',filter:true }
];
filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
  id: 'number',
  name: 'string',
  emailId: 'string',
  dateOfJoin: 'date',
  dateOfBirth: 'date',
  gender: 'string',
  departmentName: 'string',
  designationName: 'string'
};

filters: { column: string; type: string; value: any; value2?: any }[] = [];
filterColumn: string = 'string';
filterColumnTitle: string = 'string';
filterType: string = 'Contains';
filterValue: string = '';
filterValue2: string = '';
filterPosition = { top: '0px', left: '0px' };
isFilterOpen = false;
employeeForm: FormGroup;
employeeList: any[] = [];
filteredEmployeeList: any[] = [];

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

constructor(private fb: FormBuilder, private employeeService: EmployeeService) {
  this.employeeForm = this.fb.group({
    searchTerm: '',
    sortByColumn: '',
    sortOrder: '',
    filters: this.fb.group({})
  });
}

getDesignationValue(designation: any, key: string): any {
  return designation[key];
}

ngOnInit() {
  this.fetchData();
}

fetchData() {
  
  this.employeeService.getAllEmployees(this.payload).subscribe(
    (response) => {
      this.employeeList = response?.items || [];
      this.totalItems = response?.totalRecords || 0;
      this.pageSize = response?.pageSize || 10;
      this.pageNumber = response?.pageNumber || 1;
      this.filteredEmployeeList = this.employeeList;
      this.isLoading.set(false);
    },
    (error) => {
      console.error('Error fetching designations:', error);
      this.employeeList = this.filteredEmployeeList = [];
      this.isLoading.set(false);
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

openFilterModal(column: string, event: MouseEvent) {
  this.filterColumn = column;
  this.columns.forEach(col => {
    if (col.key === column) {
      this.filterColumnTitle = col.label;
    }
  })
  this.filterValue = '';
  this.filterValue2 = '';

  // Determine filter type dynamically
  const firstItem = this.employeeList[0];
  if (firstItem && typeof firstItem[column] === 'string') {
    this.filterType = 'Contains';
  } else if (firstItem && typeof firstItem[column] === 'number') {
    this.filterType = 'Equal';
  } else if (firstItem && firstItem[column] instanceof Date) {
    this.filterType = 'Between';
  } else {
    this.filterType = 'Contains'; // Default to text-based filter
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

}
