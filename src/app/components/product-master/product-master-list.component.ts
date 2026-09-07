import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductMasterService } from '../../services/product-master.service';
import { ToastService } from '../../services/toast.service';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-product-master-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent, BreadcrumbComponent],
  templateUrl: './product-master-list.component.html',
  styleUrls: ['./product-master-list.component.css']
})
export class ProductMasterListComponent implements OnInit {
  items: any[] = [];
  totalItems = 0;
  pageNumber = 1;
  pageSize = 10;
  pageSizes = [10, 25, 50, 100];
  searchTerm = '';
  sortByColumn = 'createdOn';
  sortOrder = 'desc';

  // Filter criteria
  filterProductName = '';
  filterApplicability = '';
  filterSpecification = '';
  filterStatus = 'active'; // 'all', 'active', 'inactive'

  constructor(
    private service: ProductMasterService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    const filters: any[] = [];
    if (this.filterProductName.trim()) {
      filters.push({ column: 'productname', value: this.filterProductName.trim(), type: 'text' });
    }
    if (this.filterApplicability.trim()) {
      filters.push({ column: 'applicability', value: this.filterApplicability.trim(), type: 'text' });
    }
    if (this.filterSpecification.trim()) {
      filters.push({ column: 'specification', value: this.filterSpecification.trim(), type: 'text' });
    }
    if (this.filterStatus && this.filterStatus !== 'all') {
      filters.push({ column: 'status', value: this.filterStatus, type: 'text' });
    } else if (this.filterStatus === 'all') {
      filters.push({ column: 'status', value: 'all', type: 'text' });
    }

    const payload = {
      PageNumber: this.pageNumber,
      PageSize: this.pageSize,
      searchTerm: this.searchTerm.trim(),
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      Filter: filters
    };

    this.service.getAll(payload).subscribe({
      next: (res) => {
        this.items = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Failed to load Product / Material records.', 'error');
        this.items = [];
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onReset(): void {
    this.searchTerm = '';
    this.filterProductName = '';
    this.filterApplicability = '';
    this.filterSpecification = '';
    this.filterStatus = 'active';
    this.pageNumber = 1;
    this.fetchData();
  }

  applySorting(col: string): void {
    if (this.sortByColumn === col) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = col;
      this.sortOrder = 'asc';
    }
    this.fetchData();
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.fetchData();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.pageNumber = 1;
    this.fetchData();
  }

  changePageSize(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.fetchData();
  }

  toggleStatus(item: any): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} Product / Material "${item.productName}"?`)) {
      this.service.toggleStatus(item.id).subscribe({
        next: (res) => {
          this.toastService.show(res?.message || `Product / Material ${action}d successfully.`, 'success');
          item.isActive = !item.isActive;
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || `Failed to ${action} Product / Material.`, 'error');
        }
      });
    }
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this Product / Material Master?')) {
      this.service.delete(id).subscribe({
        next: () => {
          this.toastService.show('Product / Material Master deleted successfully.', 'success');
          this.fetchData();
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'Failed to delete Product / Material Master.', 'error');
        }
      });
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/product-master/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/product-master/edit', id]);
  }

  navigateToDetails(id: number): void {
    this.router.navigate(['/product-master/details', id]);
  }
}
