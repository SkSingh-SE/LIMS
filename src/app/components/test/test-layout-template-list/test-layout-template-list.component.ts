import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TestLayoutService } from '../../../services/test-layout.service';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-test-layout-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PaginationComponent],
  templateUrl: './test-layout-template-list.component.html',
  styleUrl: './test-layout-template-list.component.css'
})
export class TestLayoutTemplateListComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'layoutCode', type: 'string', label: 'Format Code', filter: true },
    { key: 'layoutName', type: 'string', label: 'Format Name', filter: true },
    { key: 'laboratoryTestName', type: 'string', label: 'Target Scope / Test', filter: true },
    { key: 'revision', type: 'string', label: 'Rev / Ver', filter: true },
    { key: 'sectionCount', type: 'number', label: 'Sections & Archetypes', filter: true },
    { key: 'isDefault', type: 'bool', label: 'Default Scope', filter: false },
    { key: 'status', type: 'string', label: 'Status', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified At', filter: true }
  ];

  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    layoutCode: 'string',
    layoutName: 'string',
    laboratoryTestName: 'string',
    revision: 'string',
    sectionCount: 'number',
    status: 'string',
    modifiedOn: 'date'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn = '';
  filterColumnTitle = '';
  filterType = 'Contains';
  filterValue = '';
  filterValue2 = '';

  layoutList: any[] = [];
  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];
  sortByColumn = 'id';
  sortOrder = 'desc';
  searchTerm = '';

  payload: {
    PageNumber: number;
    PageSize: number;
    searchTerm: string;
    sortByColumn: string;
    sortOrder: string;
    filter: { column: string; type: string; value: any; value2?: any }[] | null;
  } = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: null
  };

  constructor(
    private testLayoutService: TestLayoutService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLayoutTemplates();
  }

  loadLayoutTemplates(): void {
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm;
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.payload.filter = this.filters.length > 0 ? this.filters : null;

    this.testLayoutService.getAllLayouts(this.payload).subscribe({
      next: (res: any) => {
        const list = res?.items || res?.data || [];
        this.layoutList = list;
        this.totalItems = res?.totalRecords ?? list.length;
        this.pageSize = res?.pageSize || this.pageSize;
        this.pageNumber = res?.pageNumber || this.pageNumber;
      },
      error: (err: any) => {
        console.error('Failed to load layout templates', err);
        this.layoutList = [];
        this.toastService.show('Failed to load layout formats list', 'error');
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.loadLayoutTemplates();
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.loadLayoutTemplates();
  }

  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.loadLayoutTemplates();
  }

  applySorting(column: string): void {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.loadLayoutTemplates();
  }

  openFilterModal(column: string, event: MouseEvent): void {
    this.filterColumn = column;
    const colDef = this.columns.find(c => c.key === column);
    this.filterColumnTitle = colDef ? colDef.label : column;
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

  applyFilter(): void {
    if (!this.filterColumn || this.filterValue === '') return;

    const existingFilterIndex = this.filters.findIndex(f => f.column === this.filterColumn);
    const filterData = {
      column: this.filterColumn,
      type: this.filterType,
      value: this.filterValue,
      value2: this.filterValue2
    };

    if (existingFilterIndex > -1) {
      this.filters[existingFilterIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }

    this.pageNumber = 1;
    this.loadLayoutTemplates();
    this.closeFilterModal();
  }

  resetFilter(column: string): void {
    this.filters = this.filters.filter(filter => filter.column !== column);
    this.pageNumber = 1;
    this.loadLayoutTemplates();
  }

  closeFilterModal(): void {
    if (this.filterModal) {
      this.filterModal.nativeElement.style.display = 'none';
    }
  }

  hasFilter(column: string): boolean {
    return this.filters.some(f => f.column === column);
  }

  getColumnType(column: string): string {
    return this.filterColumnTypes[column] || 'string';
  }

  createNewLayout(): void {
    this.router.navigate(['/execution-layout-studio']);
  }

  editLayout(id: number): void {
    this.router.navigate(['/execution-layout-studio'], { queryParams: { id } });
  }

  viewLayout(id: number): void {
    this.router.navigate(['/execution-layout-studio'], { queryParams: { id, mode: 'view' } });
  }

  deleteLayout(item: any): void {
    if (confirm(`Are you sure you want to delete layout format "${item.layoutName}" (${item.layoutCode})?`)) {
      this.testLayoutService.deleteLayout(item.id).subscribe({
        next: () => {
          this.toastService.show(`Layout "${item.layoutName}" deleted successfully`, 'success');
          this.loadLayoutTemplates();
        },
        error: (err: any) => {
          console.error('Delete layout failed', err);
          this.toastService.show('Failed to delete layout', 'error');
        }
      });
    }
  }
}
