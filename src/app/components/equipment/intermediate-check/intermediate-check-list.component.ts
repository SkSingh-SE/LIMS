import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IntermediateCheckService } from '../../../services/intermediate-check.service';

@Component({
  selector: 'app-intermediate-check-list',

  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './intermediate-check-list.component.html',
  styleUrl: './intermediate-check-list.component.css'
})
export class IntermediateCheckListComponent implements OnInit {
  records: any[] = [];
  filteredList: any[] = [];
  dateNow = new Date();

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

  searchTerm = '';
  sortByColumn = 'checkYear';
  sortOrder: 'desc' | 'asc' = 'desc';
  isLoading = signal(false);

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder
  };

  constructor(
    private intermediateCheckService: IntermediateCheckService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.isLoading.set(true);
    this.intermediateCheckService.getAll(this.payload).subscribe({
      next: (response: any) => {
        this.records = response.items || [];
        this.filteredList = this.records;
        this.totalItems = response.totalRecords || 0;
        this.pageSize = response.pageSize || 10;
        this.pageNumber = response.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error fetching intermediate check records:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    if (this.searchTerm !== this.payload.searchTerm) {
      this.payload.searchTerm = this.searchTerm;
      this.pageNumber = 1;
      this.payload.PageNumber = 1;
      this.fetchData();
    }
  }

  applySort(column: string): void {
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

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.payload.PageNumber = page;
    this.fetchData();
  }

  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.payload.PageNumber = 1;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
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


  editRecord(id: number): void {
    this.router.navigate(['/intermediate-check/edit', id]);
  }

  viewRecord(id: number): void {
    this.router.navigate(['/intermediate-check/details', id]);
  }

  previewRecord(id: number): void {
    this.router.navigate(['/intermediate-check/preview', id]);
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this intermediate check record?')) {
      this.intermediateCheckService.delete(id).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.fetchData();
          }
        },
        error: (error: any) => console.error('Error deleting record:', error)
      });
    }
  }

  createNew(): void {
    this.router.navigate(['/intermediate-check/create']);
  }

  getMonthName(month: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  }
}
