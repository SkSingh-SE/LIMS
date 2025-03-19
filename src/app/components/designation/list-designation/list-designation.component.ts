import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DesignationService } from '../../../services/designation.service';
import { Designation } from '../../../models/designationModel';
import { LoaderService } from '../../../services/loader.service';
import { GlobalLoaderComponent } from '../../global-loader/global-loader.component';


@Component({
  selector: 'app-list-designation',
  standalone: true,
  imports: [CommonModule, RouterModule,FormsModule,GlobalLoaderComponent],
  templateUrl: './list-designation.component.html',
  styleUrl: './list-designation.component.css'
})
export class ListDesignationComponent implements OnInit {
  designationForm: FormGroup;
  designations: Designation[] = [];
  filteredDesignations: Designation[] = [];

  pageNumber = 1; // Start from 1
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

  sortBy: { [key: string]: boolean } = {};
  filters: { [key: string]: string | null } = {};
  searchTerm: string = '';

  isLoading = signal(false);

  constructor(private fb: FormBuilder,private designationService: DesignationService, private loaderService: LoaderService) {
    this.designationForm = this.fb.group({
      searchTerm: '',
      filters: this.fb.group({
        department: '',
        status: ''
      }),
      sortBy: this.fb.group({})
    });
  }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: this.searchTerm,
      SortBy: this.sortBy,
      Filters: this.filters
    };
    this.loaderService.show();
    this.isLoading.set(true);
    this.designationService.getAllDesignations(payload).subscribe(
      (response) => {
        debugger;
        this.designations = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.applyFilters();
        this.isLoading.set(false);
      },
      (error) => {
        console.error('Error fetching designations:', error);
        this.isLoading.set(false);
        this.loaderService.hide();
      }
    );

    // Mock API call - Replace with real API service
    // this.designations = [
    //   { id: 1, name: 'Software Engineer', description: 'IT', createdOn: '2024-02-10' },
    //   { id: 2, name: 'Senior Developer', description: 'IT', createdOn: '2024-01-15' },
    //   { id: 3, name: 'HR Manager', description: 'Human Resources', createdOn: '2024-03-05' },
    //   { id: 4, name: 'Team Lead', description: 'Development', createdOn: '2023-12-20' },
    //   { id: 5, name: 'Project Manager', description: 'Operations', createdOn: '2024-02-01' },
    //   { id: 6, name: 'UI/UX Designer', description: 'Design', createdOn: '2024-01-28' },
    //   { id: 7, name: 'QA Engineer', description: 'Testing', createdOn: '2024-03-01' },
    //   { id: 8, name: 'Business Analyst', description: 'Management', createdOn: '2024-02-12' },
    //   { id: 9, name: 'System Administrator', description: 'IT', createdOn: '2024-01-22' },
    //   { id: 10, name: 'Data Scientist', description: 'Data Analytics', createdOn: '2024-03-10' },
    //   { id: 1, name: 'Software Engineer', description: 'IT', createdOn: '2024-02-10' },
    //   { id: 2, name: 'Senior Developer', description: 'IT', createdOn: '2024-01-15' },
    //   { id: 3, name: 'HR Manager', description: 'Human Resources', createdOn: '2024-03-05' },
    //   { id: 4, name: 'Team Lead', description: 'Development', createdOn: '2023-12-20' },
    //   { id: 5, name: 'Project Manager', description: 'Operations', createdOn: '2024-02-01' },
    //   { id: 6, name: 'UI/UX Designer', description: 'Design', createdOn: '2024-01-28' },
    //   { id: 7, name: 'QA Engineer', description: 'Testing', createdOn: '2024-03-01' },
    //   { id: 8, name: 'Business Analyst', description: 'Management', createdOn: '2024-02-12' },
    //   { id: 9, name: 'System Administrator', description: 'IT', createdOn: '2024-01-22' },
    //   { id: 10, name: 'Data Scientist', description: 'Data Analytics', createdOn: '2024-03-10' }
    // ];

    
  }

  applyFilters() {
    let filtered = [...this.designations];

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(designation =>
        designation.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Apply filters
    Object.keys(this.filters).forEach(key => {
      if (this.filters[key]) {
        filtered = filtered.filter(designation => designation[key as keyof Designation] === this.filters[key]);
      }
    });

    // Apply sorting (Multiple sorting support)
    Object.keys(this.sortBy).forEach(sortKey => {
      filtered.sort((a, b) => {
        const key = sortKey as keyof Designation;
        const result = String(a[key]).localeCompare(String(b[key]));
        return this.sortBy[sortKey] ? result : -result;
      });
    });

    // Pagination Logic
    this.totalItems = filtered.length;
    this.filteredDesignations = filtered.slice((this.pageNumber - 1) * this.pageSize, this.pageNumber * this.pageSize);
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.applyFilters();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1; // Reset to first page
    this.applyFilters();
  }

  updateSearch() {
    this.searchTerm = this.designationForm.value.searchTerm;
    this.applyFilters();
  }

  updateFilters() {
    this.filters = { ...this.designationForm.value.filters };
    console.log("Filters object",this.filters);
    this.applyFilters();
  }

  clearFilter(field: string) {
    this.filters[field] = null;
    this.applyFilters();
  }

  applySorting(column: string) {
    this.sortBy[column] = !this.sortBy[column]; // Toggle sorting order
    console.log("Sort object",this.sortBy);
    this.fetchData();
  }

  get totalPages(): number[] {
    return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
  }
}
