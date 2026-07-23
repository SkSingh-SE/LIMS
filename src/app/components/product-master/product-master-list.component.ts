import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductMasterService } from '../../services/product-master.service';
import { ToastService } from '../../services/toast.service';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-product-master-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaginationComponent],
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

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: null
  };

  constructor(
    private service: ProductMasterService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.payload.searchTerm = this.searchTerm;
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;

    this.service.getAll(this.payload).subscribe({
      next: (res) => {
        this.items = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Failed to load product masters', 'error');
        this.items = [];
      }
    });
  }

  onSearch() {
    this.pageNumber = 1;
    this.fetchData();
  }

  applySorting(col: string) {
    if (this.sortByColumn === col) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = col;
      this.sortOrder = 'asc';
    }
    this.fetchData();
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.fetchData();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1;
    this.fetchData();
  }

  deleteItem(id: number) {
    if (confirm('Are you sure you want to delete this Product Master?')) {
      this.service.delete(id).subscribe({
        next: () => {
          this.toastService.show('Product Master deleted successfully.', 'success');
          this.fetchData();
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'Failed to delete Product Master', 'error');
        }
      });
    }
  }

  navigateToCreate() {
    this.router.navigate(['/product-master/create']);
  }

  navigateToEdit(id: number) {
    this.router.navigate(['/product-master/edit', id]);
  }

  navigateToDetails(id: number) {
    this.router.navigate(['/product-master/details', id]);
  }
}
