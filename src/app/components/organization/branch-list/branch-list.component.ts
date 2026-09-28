import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrganizationAdminService, BranchAdminItem, BranchDependency, OrganizationAdminItem } from '../../../services/organization-admin.service';
import { ToastService } from '../../../services/toast.service';
import { BranchFormComponent } from '../branch-form/branch-form.component';
import { BranchDisciplineModalComponent } from '../branch-discipline-modal/branch-discipline-modal.component';
import { BreadcrumbComponent } from '../../../utility/components/breadcrumb/breadcrumb.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-branch-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BranchFormComponent, BranchDisciplineModalComponent, BreadcrumbComponent, PaginationComponent],
  templateUrl: './branch-list.component.html',
  styleUrls: ['./branch-list.component.css']
})
export class BranchListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orgAdminService = inject(OrganizationAdminService);
  private toastService = inject(ToastService);

  orgId!: number;
  organization: OrganizationAdminItem | null = null;
  branches: BranchAdminItem[] = [];
  totalCount: number = 0;
  pageNo: number = 1;
  pageSize: number = 10;
  pageSizes: number[] = [10, 25, 50, 100];
  searchTerm: string = '';
  statusFilter: string = 'all';

  // Branch Form Modal State
  isBranchModalVisible: boolean = false;
  selectedBranchId: number | null = null;

  // Discipline Modal State
  isDisciplineModalVisible: boolean = false;
  selectedDisciplineBranchId: number | null = null;
  selectedDisciplineBranchName: string = '';

  // Deactivation Modal State
  isDeactivateModalVisible: boolean = false;
  deactivatingBranch: BranchAdminItem | null = null;
  branchDependencies: BranchDependency | null = null;
  isLoadingDependencies: boolean = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('orgId');
      if (idStr) {
        this.orgId = Number(idStr);
        this.loadOrganizationHeader();
        this.loadBranches();
      }
    });
  }

  loadOrganizationHeader(): void {
    this.orgAdminService.getOrganizationDetails(this.orgId).subscribe({
      next: (res) => {
        this.organization = res;
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to load organization context.', 'error');
      }
    });
  }

  loadBranches(): void {
    const isActiveParam = this.statusFilter === 'active' ? true : (this.statusFilter === 'inactive' ? false : undefined);

    this.orgAdminService.getAdminBranches({
      organizationId: this.orgId,
      pageNo: this.pageNo,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm ? this.searchTerm.trim() : undefined,
      isActive: isActiveParam
    }).subscribe({
      next: (res) => {
        this.branches = res.items || [];
        this.totalCount = res.totalCount || 0;
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to load branches.', 'error');
      }
    });
  }

  onSearch(): void {
    this.pageNo = 1;
    this.loadBranches();
  }

  onStatusChange(): void {
    this.pageNo = 1;
    this.loadBranches();
  }

  onPageChange(page: number): void {
    this.pageNo = page;
    this.loadBranches();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageNo = 1;
    this.loadBranches();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.pageNo = 1;
    this.loadBranches();
  }

  openCreateModal(): void {
    this.selectedBranchId = null;
    this.isBranchModalVisible = true;
  }

  openEditModal(branch: BranchAdminItem): void {
    this.selectedBranchId = branch.id;
    this.isBranchModalVisible = true;
  }

  closeBranchModal(): void {
    this.isBranchModalVisible = false;
    this.selectedBranchId = null;
  }

  onBranchSaved(): void {
    this.loadBranches();
  }

  openDisciplineModal(branch: BranchAdminItem): void {
    this.selectedDisciplineBranchId = branch.id;
    this.selectedDisciplineBranchName = `${branch.name} (${branch.code})`;
    this.isDisciplineModalVisible = true;
  }

  closeDisciplineModal(): void {
    this.isDisciplineModalVisible = false;
    this.selectedDisciplineBranchId = null;
    this.selectedDisciplineBranchName = '';
  }

  onDisciplineUpdated(): void {
    this.loadBranches();
  }

  // Deactivation flow
  promptToggleStatus(branch: BranchAdminItem): void {
    if (branch.isActive) {
      this.deactivatingBranch = branch;
      this.isLoadingDependencies = true;
      this.isDeactivateModalVisible = true;
      this.orgAdminService.getBranchDependencies(branch.id).subscribe({
        next: (dep) => {
          this.branchDependencies = dep;
          this.isLoadingDependencies = false;
        },
        error: (err) => {
          this.isLoadingDependencies = false;
          this.toastService.show(err.error?.message || 'Failed to load branch dependencies.', 'error');
        }
      });
    } else {
      if (!confirm(`Are you sure you want to reactivate branch '${branch.name}'?`)) return;
      this.orgAdminService.toggleBranchStatus(branch.id).subscribe({
        next: (res) => {
          this.toastService.show(res.message || 'Branch activated successfully.', 'success');
          this.loadBranches();
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Failed to activate branch.', 'error');
        }
      });
    }
  }

  confirmDeactivation(): void {
    if (!this.deactivatingBranch) return;

    this.orgAdminService.toggleBranchStatus(this.deactivatingBranch.id).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Branch deactivated successfully.', 'success');
        this.closeDeactivateModal();
        this.loadBranches();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to deactivate branch.', 'error');
      }
    });
  }

  closeDeactivateModal(): void {
    this.isDeactivateModalVisible = false;
    this.deactivatingBranch = null;
    this.branchDependencies = null;
  }

}
