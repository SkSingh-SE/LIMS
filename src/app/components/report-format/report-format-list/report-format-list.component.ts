import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ReportFormatService } from '../../../services/report-format.service';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-report-format-list',
  templateUrl: './report-format-list.component.html',
  imports: [ CommonModule, FormsModule, RouterModule, PaginationComponent ],
})
export class ReportFormatListComponent implements OnInit {
  formats: any[] = [];
  totalRecords = 0;
  pageNumber = 1;
  pageSize = 10;
  pageSizes = [10, 25, 50, 100, 200, 500];
  searchTerm = '';
  sortByColumn = 'ID';
  sortOrder = 'desc';

  columns = [
    { key: 'formatCode', label: 'Code', filter: true },
    { key: 'formatName', label: 'Format Name', filter: true },
    { key: 'pageLayout', label: 'Layout', filter: true },
    { key: 'isDefault', label: 'Default', filter: false },
    { key: 'sectionCount', label: 'Sections', filter: false },
    { key: 'mappingCount', label: 'Mappings', filter: false },
  ];

  constructor(
    private formatService: ReportFormatService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: this.searchTerm,
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
    };

    this.formatService.getList(payload).subscribe({
      next: (resp) => {
        this.formats = resp?.items || [];
        this.totalRecords = resp?.totalRecords || 0;
        this.pageSize = resp?.pageSize || this.pageSize;
        this.pageNumber = resp?.pageNumber || this.pageNumber;
      },
      error: () => {
        this.toast.show('Failed to load report formats.', 'error');
      },
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  applySorting(column: string): void {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.fetchData();
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.fetchData();
  }

  onPageSizeChange(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize) || 1;
  }

  editFormat(id: number): void {
    this.router.navigate(['/report-format/designer', id]);
  }

  cloneFormat(id: number): void {
    this.formatService.clone(id).subscribe({
      next: (resp) => {
        this.toast.show('Format cloned successfully.', 'success');
        this.fetchData();
      },
      error: () => this.toast.show('Clone failed.', 'error'),
    });
  }

  deleteFormat(id: number): void {
    if (!confirm('Are you sure you want to delete this format?')) return;

    this.formatService.delete(id).subscribe({
      next: () => {
        this.toast.show('Format deleted.', 'success');
        this.fetchData();
      },
      error: () => this.toast.show('Delete failed.', 'error'),
    });
  }

  createNew(): void {
    this.router.navigate(['/report-format/designer']);
  }
}
