import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LabScopeService } from '../../services/lab-scope.service';
import { BranchService } from '../../services/branch.service';
import { LaboratoryTestService } from '../../services/laboratory-test.service';
import { ToastService } from '../../services/toast.service';
import { HasPermissionDirective } from '../../utility/directives/has-permission.directive';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-lab-scope-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HasPermissionDirective,
    PaginationComponent,
    BreadcrumbComponent,
    SearchableDropdownComponent
  ],
  templateUrl: './lab-scope-list.component.html',
  styleUrl: './lab-scope-list.component.css'
})
export class LabScopeListComponent implements OnInit {
  scopes: any[] = [];
  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100];
  sortByColumn = 'modifiedOn';
  sortOrder = 'desc';

  searchTerm = '';
  laboratoryTestID: number | null = null;
  selectedTest: any = null;
  branchID: string = '';
  status = 'active';
  validity = 'all';
  accreditation = 'all';

  constructor(
    private labScopeService: LabScopeService,
    public branchService: BranchService,
    private laboratoryTestService: LaboratoryTestService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    if (this.branchService.branches().length === 0) {
      this.branchService.loadUserBranches().subscribe({ error: () => undefined });
    }
    this.fetchData();
  }

  getTestDropdown = (term: string, page: number, pageSize: number) => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  onTestSelected(item: any): void {
    this.laboratoryTestID = item ? item.id : null;
    this.selectedTest = item || null;
    this.onSearch();
  }

  private buildPayload(): any {
    return {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm?.trim() || null,
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      laboratoryTestID: this.laboratoryTestID,
      branchID: this.branchID !== '' ? Number(this.branchID) : null,
      status: this.status,
      validity: this.validity,
      accreditation: this.accreditation
    };
  }

  fetchData(): void {
    this.labScopeService.queryScopes(this.buildPayload()).subscribe({
      next: (res: any) => {
        this.scopes = res?.items || [];
        this.totalItems = res?.totalRecords || 0;
        this.pageNumber = res?.pageNumber || 1;
        this.pageSize = res?.pageSize || 10;
      },
      error: (err: any) => {
        this.scopes = [];
        this.totalItems = 0;
        this.toastService.show(err?.error?.message || 'Failed to fetch lab scopes', 'error');
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onReset(): void {
    this.searchTerm = '';
    this.laboratoryTestID = null;
    this.selectedTest = null;
    this.branchID = '';
    this.status = 'active';
    this.validity = 'all';
    this.accreditation = 'all';
    this.pageNumber = 1;
    this.fetchData();
  }

  onSort(column: string): void {
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

  onPageSizeChange(event: any): void {
    this.pageSize = typeof event === 'number' ? event : Number(event?.target?.value || event);
    this.pageNumber = 1;
    this.fetchData();
  }

  validityBadgeClass(state: string): string {
    switch (state) {
      case 'Valid': return 'bg-success';
      case 'Open': return 'bg-info';
      case 'Scheduled': return 'bg-warning text-dark';
      case 'Expired': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  toggleStatus(item: any): void {
    const activate = !item.isActive;
    const action = activate ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} the scope for '${item.laboratoryTestName}'?`)) return;
    this.labScopeService.toggleScopeStatus(item.id, activate).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || `Scope ${action}d successfully.`, 'success');
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || `Failed to ${action} scope`, 'error');
      }
    });
  }

  deleteScope(item: any): void {
    if (!confirm(`Are you sure you want to delete the scope for '${item.laboratoryTestName}'? This will deactivate it.`)) return;
    this.labScopeService.deleteScope(item.id).subscribe({
      next: (res: any) => {
        this.toastService.show(res?.message || 'Scope deactivated successfully.', 'success');
        this.fetchData();
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to delete scope', 'error');
      }
    });
  }
}
