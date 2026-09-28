import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrganizationAdminService, OrganizationAdminItem, OrganizationDependency } from '../../../services/organization-admin.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { OrganizationFormComponent } from '../organization-form/organization-form.component';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';

@Component({
  selector: 'app-organization-list',
  standalone: true,
  imports: [CommonModule, FormsModule, OrganizationFormComponent, PaginationComponent],
  templateUrl: './organization-list.component.html',
  styleUrls: ['./organization-list.component.css']
})
export class OrganizationListComponent implements OnInit {
  private orgAdminService = inject(OrganizationAdminService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);

  organizations: OrganizationAdminItem[] = [];
  totalCount: number = 0;
  pageNo: number = 1;
  pageSize: number = 10;
  pageSizes: number[] = [10, 25, 50, 100];
  searchTerm: string = '';
  statusFilter: string = 'all';

  isSystemAdmin: boolean = false;
  isModalVisible: boolean = false;
  selectedOrgId: number | null = null;

  // Deactivation Modal State
  isDeactivateModalVisible: boolean = false;
  deactivatingOrg: OrganizationAdminItem | null = null;
  deactivationDependencies: OrganizationDependency | null = null;
  isLoadingDependencies: boolean = false;

  ngOnInit(): void {
    this.checkAdminRole();
    this.loadOrganizations();
  }

  checkAdminRole(): void {
    const user = this.authService.getUserData();
    this.isSystemAdmin = user?.role?.toLowerCase() === 'admin' || user?.isAdmin === true;
  }

  loadOrganizations(): void {
    const isActiveParam = this.statusFilter === 'active' ? true : (this.statusFilter === 'inactive' ? false : undefined);

    this.orgAdminService.getOrganizations({
      pageNo: this.pageNo,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm ? this.searchTerm.trim() : undefined,
      isActive: isActiveParam
    }).subscribe({
      next: (res) => {
        this.organizations = res.items || [];
        this.totalCount = res.totalCount || 0;
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to load organizations.', 'error');
      }
    });
  }

  onSearch(): void {
    this.pageNo = 1;
    this.loadOrganizations();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.pageNo = 1;
    this.loadOrganizations();
  }

  onStatusChange(): void {
    this.pageNo = 1;
    this.loadOrganizations();
  }

  onPageChange(page: number): void {
    this.pageNo = page;
    this.loadOrganizations();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageNo = 1;
    this.loadOrganizations();
  }

  openCreateModal(): void {
    this.selectedOrgId = null;
    this.isModalVisible = true;
  }

  openEditModal(org: OrganizationAdminItem): void {
    this.selectedOrgId = org.id;
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.selectedOrgId = null;
  }

  onFormSaved(): void {
    this.loadOrganizations();
  }

  navigateToBranches(org: OrganizationAdminItem): void {
    this.router.navigate(['/organization', org.id, 'branches']);
  }

  // Deactivation flow with authoritative dependency check
  promptToggleStatus(org: OrganizationAdminItem): void {
    if (org.isActive) {
      this.deactivatingOrg = org;
      this.isLoadingDependencies = true;
      this.isDeactivateModalVisible = true;
      this.orgAdminService.getOrganizationDependencies(org.id).subscribe({
        next: (dep) => {
          this.deactivationDependencies = dep;
          this.isLoadingDependencies = false;
        },
        error: (err) => {
          this.isLoadingDependencies = false;
          this.toastService.show(err.error?.message || 'Failed to load dependencies.', 'error');
        }
      });
    } else {
      // Direct activation
      if (!confirm(`Are you sure you want to reactivate organization '${org.labName}'?`)) return;
      this.orgAdminService.toggleOrganizationStatus(org.id).subscribe({
        next: (res) => {
          this.toastService.show(res.message || 'Organization activated successfully.', 'success');
          this.loadOrganizations();
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Failed to activate organization.', 'error');
        }
      });
    }
  }

  confirmDeactivation(): void {
    if (!this.deactivatingOrg) return;

    this.orgAdminService.toggleOrganizationStatus(this.deactivatingOrg.id).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Organization deactivated successfully.', 'success');
        this.closeDeactivateModal();
        this.loadOrganizations();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to deactivate organization.', 'error');
      }
    });
  }

  closeDeactivateModal(): void {
    this.isDeactivateModalVisible = false;
    this.deactivatingOrg = null;
    this.deactivationDependencies = null;
  }
}
