import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { DisciplineService } from '../../../services/discipline.service';
import { DepartmentService } from '../../../services/department.service';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';
import { LaboratoryTestListDto } from '../../../models/laboratory-test.model';

@Component({
  selector: 'app-laboratory-test-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PaginationComponent,
    BreadcrumbComponent,
    HasPermissionDirective
  ],
  templateUrl: './laboratory-test-list.component.html',
  styleUrl: './laboratory-test-list.component.css'
})
export class LaboratoryTestListComponent implements OnInit {
  labTestList: LaboratoryTestListDto[] = [];
  disciplines: any[] = [];
  departments: any[] = [];

  // Filter Bar State
  searchTerm: string = '';
  selectedDisciplineId: number | null = null;
  selectedDepartmentId: number | null = null;
  selectedStatus: string = 'all'; // 'all' | 'active' | 'inactive'

  // Pagination & Sorting State
  pageNumber: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  pageSizes: number[] = [10, 25, 50, 100];
  sortByColumn: string = 'id';
  sortOrder: string = 'desc';

  constructor(
    private labService: LaboratoryTestService,
    private disciplineService: DisciplineService,
    private departmentService: DepartmentService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadDropdowns();
    this.fetchData();
  }

  loadDropdowns(): void {
    this.disciplineService.getDisciplineDropdown('', 0, 100).subscribe({
      next: (res) => {
        this.disciplines = Array.isArray(res) ? res : res?.items || [];
      },
      error: (err) => console.error('Error loading disciplines:', err)
    });

    this.departmentService.getDepartmentDropdown('', 0, 100).subscribe({
      next: (res) => {
        this.departments = Array.isArray(res) ? res : res?.items || [];
      },
      error: (err) => console.error('Error loading departments:', err)
    });
  }

  fetchData(): void {
    const payload = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm ? this.searchTerm.trim() : '',
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder,
      filter: null
    };

    let isActiveParam: boolean | null = null;
    if (this.selectedStatus === 'active') isActiveParam = true;
    else if (this.selectedStatus === 'inactive') isActiveParam = false;

    this.labService
      .getPagedUniversalTests(
        payload,
        this.selectedDisciplineId || null,
        this.selectedDepartmentId || null,
        isActiveParam
      )
      .subscribe({
        next: (res) => {
          this.labTestList = res?.items || [];
          this.totalItems = res?.totalRecords || 0;
          this.pageNumber = res?.pageNumber || 1;
          this.pageSize = res?.pageSize || 10;
        },
        error: (err) => {
          console.error('Error fetching Universal Tests:', err);
          this.labTestList = [];
          this.totalItems = 0;
          this.toastService.show(err?.error?.message || 'Error loading Laboratory Tests.', 'error');
        }
      });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  onFilterChange(): void {
    this.pageNumber = 1;
    this.fetchData();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedDisciplineId = null;
    this.selectedDepartmentId = null;
    this.selectedStatus = 'all';
    this.pageNumber = 1;
    this.sortByColumn = 'id';
    this.sortOrder = 'desc';
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

  toggleStatus(item: LaboratoryTestListDto): void {
    const action = item.isActive ? 'deactivate' : 'activate';
    const confirmed = window.confirm(`Are you sure you want to ${action} test '${item.name}'?`);
    if (!confirmed) return;

    this.labService.toggleTestStatus(item.id).subscribe({
      next: (res) => {
        item.isActive = !item.isActive;
        this.toastService.show(
          res?.message || `Test '${item.name}' status updated successfully.`,
          'success'
        );
      },
      error: (err) => {
        this.toastService.show(
          err?.error?.message || err?.message || `Failed to ${action} test '${item.name}'.`,
          'error'
        );
      }
    });
  }

  deleteTest(item: LaboratoryTestListDto): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete Universal Test '${item.name}' (${item.code})?\nThis operation will be validated against active inward and execution records.`
    );
    if (!confirmed) return;

    this.labService.deleteUniversalTest(item.id).subscribe({
      next: (res) => {
        this.toastService.show(res?.message || `Test '${item.name}' deleted successfully.`, 'success');
        this.fetchData();
      },
      error: (err) => {
        this.toastService.show(
          err?.error?.message || err?.message || 'Cannot delete Laboratory Test due to active dependencies.',
          'error'
        );
      }
    });
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

  getStartRecord(): number {
    return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }
}
