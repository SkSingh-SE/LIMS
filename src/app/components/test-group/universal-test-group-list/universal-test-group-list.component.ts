import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UniversalTestGroupService } from '../../../services/universal-test-group.service';
import { UniversalTestGroupListItemDto } from '../../../models/universal-test-group.model';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';

@Component({
  selector: 'app-universal-test-group-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BreadcrumbComponent, PaginationComponent, HasPermissionDirective],
  templateUrl: './universal-test-group-list.component.html',
  styleUrls: ['./universal-test-group-list.component.css']
})
export class UniversalTestGroupListComponent implements OnInit {
  items: UniversalTestGroupListItemDto[] = [];
  filtered: UniversalTestGroupListItemDto[] = [];
  paged: UniversalTestGroupListItemDto[] = [];
  isLoading = true;

  searchTerm = '';
  selectedStatus: string = 'all';

  pageNumber = 1;
  pageSize = 10;
  pageSizes = [10, 25, 50, 100];
  totalItems = 0;

  constructor(private svc: UniversalTestGroupService, private router: Router) {}

  ngOnInit(): void {
    this.svc.getAll().subscribe({
      next: (res) => {
        this.items = res || [];
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.applyFilter();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.pageNumber = 1;
    this.applyFilter();
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    let result = this.items;

    if (term) {
      result = result.filter(x =>
        x.sampleNo.toLowerCase().includes(term) ||
        x.inwardCaseNo.toLowerCase().includes(term) ||
        x.laboratoryTestName.toLowerCase().includes(term) ||
        x.laboratoryTestCode.toLowerCase().includes(term) ||
        (x.branchName || '').toLowerCase().includes(term) ||
        (x.disciplineName || '').toLowerCase().includes(term)
      );
    }

    if (this.selectedStatus !== 'all') {
      result = result.filter(x => x.status === this.selectedStatus);
    }

    this.filtered = result;
    this.totalItems = this.filtered.length;
    this.updatePaged();
  }

  updatePaged(): void {
    const start = (this.pageNumber - 1) * this.pageSize;
    this.paged = this.filtered.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.updatePaged();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageNumber = 1;
    this.updatePaged();
  }

  openDetails(id: number): void {
    this.router.navigate(['/sample/test-group', id]);
  }

  openExecution(id: number, executionId?: number): void {
    const qp: any = { utgId: id, from: 'list' };
    if (executionId) {
      qp.executionId = executionId;
    }
    this.router.navigate(['/universal-test-execution'], { queryParams: qp });
  }
}
