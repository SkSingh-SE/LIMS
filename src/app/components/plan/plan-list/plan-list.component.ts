import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ToastService } from '../../../services/toast.service';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-plan-list',
  imports: [ CommonModule,RouterModule,FormsModule,TestStatusBadgeComponent, PaginationComponent, BreadcrumbComponent ],
  templateUrl: './plan-list.component.html',
  styleUrls: ['./plan-list.component.css']
})
export class PlanListComponent implements OnInit {
  listData: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  sortByColumn: string = 'modifiedOn';
  sortOrder: string = 'desc';
  searchTerm: string = '';
  selectedStatus: string = 'all';

  filters: { column: string; type: string; value: any; value2?: any }[] = [];

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  constructor(private fb: FormBuilder, private inwardService: SampleInwardService, private toastService: ToastService) {
  }


  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    const effectiveFilters = [...this.filters];
    if (this.selectedStatus && this.selectedStatus !== 'all') {
      const statusFilter = { column: 'planStatus', type: 'Equal', value: this.selectedStatus };
      const idx = effectiveFilters.findIndex(f => f.column === 'planStatus');
      if (idx > -1) {
        effectiveFilters[idx] = statusFilter;
      } else {
        effectiveFilters.push(statusFilter);
      }
    }

    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm ? this.searchTerm.trim() : '';
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.payload.filter = effectiveFilters;

    this.inwardService.getPlanList(this.payload).subscribe({
      next: (response) => {
        this.listData = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.listData = [];
        this.toastService.show(error?.error?.message || 'Error loading sample plans.', 'error');
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
    this.fetchData();
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.fetchData();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.pageNumber = 1;
    this.fetchData();
  }

  onSearch() {
    this.pageNumber = 1;
    this.fetchData();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.filters = [];
    this.pageNumber = 1;
    this.sortByColumn = 'modifiedOn';
    this.sortOrder = 'desc';
    this.fetchData();
  }

}
