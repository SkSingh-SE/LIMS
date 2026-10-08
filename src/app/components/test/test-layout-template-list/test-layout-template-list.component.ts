import { Component, OnInit } from '@angular/core';
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
  layoutList: any[] = [];
  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100];
  sortByColumn = 'id';
  sortOrder = 'desc';
  searchTerm = '';

  constructor(
    private testLayoutService: TestLayoutService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLayoutTemplates();
  }

  loadLayoutTemplates(): void {
    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: this.searchTerm,
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      filter: null
    };

    this.testLayoutService.getAllLayouts(payload).subscribe({
      next: (res: any) => {
        const list = res?.items || res?.data || [];
        this.layoutList = list;
        this.totalItems = res?.totalRecords ?? list.length;
      },
      error: (err: any) => {
        console.error('Failed to load layout templates', err);
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

  onPageSizeChange(size: number): void {
    this.pageSize = size;
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
