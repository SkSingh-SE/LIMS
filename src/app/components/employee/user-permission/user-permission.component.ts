import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { UserService } from '../../../services/user.service';
import { Observable } from 'rxjs';
import { ToastService } from '../../../services/toast.service';
import { RouterLink } from '@angular/router';

interface Permission {
  id: number;
  displayName: string;
  type: string;
  menuID: number;
  menuTitle: string;
  isGranted: boolean;
  isOverride: boolean;
  color?: string;
  // UI helper
  isVisibleForCurrentUser?: boolean;
}

@Component({
  selector: 'app-user-permission',
  imports: [CommonModule, FormsModule, SearchableDropdownComponent, RouterLink],
  templateUrl: './user-permission.component.html',
  styleUrl: './user-permission.component.css'
})
export class UserPermissionComponent implements OnInit, OnChanges {
  selectedUser: string = '';

  // Master Data
  masterPermissionsByGroup: { [menuTitle: string]: Permission[] } = {};

  // Left Side (Available)
  filteredAvailableGroups: { name: string, permissions: Permission[] }[] = [];
  availableSelection: Set<number> = new Set();

  // Right Side (Assigned)
  assignedPermissions: { [menuTitle: string]: Permission[] } = {};
  filteredAssignedGroups: { name: string, permissions: Permission[] }[] = [];
  assignedSelection: Set<number> = new Set();

  permissionSearch: string = '';
  expandedGroupNames: Set<string> = new Set();

  @Input() targetUserId: string = '';
  @Input() allowUserSelection: boolean = true;
  @Input() containerClass: string = 'container-fluid';
  @Input() isViewMode: boolean = false;

  constructor(private userService: UserService, private toastService: ToastService) { }

  ngOnInit(): void {
    this.getPermissions();
    if (this.targetUserId) {
      this.selectedUser = this.targetUserId;
      this.fetchUserPermissions(this.targetUserId);
    }
  }

  ngOnChanges(changes: any) {
    if (changes.targetUserId && changes.targetUserId.currentValue) {
      this.selectedUser = changes.targetUserId.currentValue;
      this.fetchUserPermissions(this.selectedUser);
    }
  }

  // 1. Fetch Master Permissions
  getPermissions() {
    this.userService.getPermissions().subscribe({
      next: (data) => {
        const groupedMaster: { [menuTitle: string]: Permission[] } = {};

        data.forEach((group: any) => {
          const perms: Permission[] = (group.permissions || []).map((p: any) => ({
            id: p.id,
            displayName: p.displayName,
            type: p.type,
            menuID: p.menuID,
            menuTitle: p.menuTitle,
            isGranted: !!p.isGranted,
            isOverride: p.isOverride,
            color: p.color,
            isVisibleForCurrentUser: true
          }));
          if (perms.length > 0) {
            groupedMaster[group.menuTitle] = perms;
            this.expandedGroupNames.add(group.menuTitle);
          }
        });

        this.masterPermissionsByGroup = groupedMaster;
        this.filterPermissions();
      },
      error: (error) => {
        console.error('Error fetching permissions:', error);
        this.toastService.show('Failed to load permissions.', 'error');
      },
    });
  }

  // 2. Fetch User Permissions
  onUserSelected(item: any) {
    if (!item) { this.selectedUser = ''; return; }
    this.selectedUser = item.id;
    this.fetchUserPermissions(item.id);
  }

  fetchUserPermissions(userId: string) {
    this.userService.getUserPermissions(userId).subscribe({
      next: (data) => {
        this.assignedPermissions = {};
        this.assignedSelection.clear();
        this.availableSelection.clear();

        const userHasPermissionIds = new Set<number>();
        const assignedIds = new Set<number>();

        data.forEach((group: any) => {
          (group.permissions || []).forEach((p: any) => {
            userHasPermissionIds.add(p.id);
            if (p.isOverride) {
              assignedIds.add(p.id);
            }
          });
        });

        for (const [groupName, perms] of Object.entries(this.masterPermissionsByGroup)) {
          const userPerms = perms.filter(p => assignedIds.has(p.id)).map(p => ({ ...p, isOverride: true }));
          if (userPerms.length > 0) {
            this.assignedPermissions[groupName] = userPerms;
          }
        }

        this.updateAvailableVisibility(userHasPermissionIds);
        this.filterPermissions();
      },
      error: (error) => {
        console.error('Error fetching user permissions:', error);
        this.toastService.show('Failed to load user permissions.', 'error');
      },
    });
  }

  updateAvailableVisibility(excludeIds: Set<number>) {
    for (const groupName in this.masterPermissionsByGroup) {
      this.masterPermissionsByGroup[groupName].forEach(p => {
        p.isVisibleForCurrentUser = !excludeIds.has(p.id);
      });
    }
  }

  getUsers = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.userService.getUserDropdown(term, page, pageSize);
  };

  // 3. Search & Filter
  onPermissionSearch(term: string) {
    this.permissionSearch = term;
    this.filterPermissions();
  }

  filterPermissions() {
    const term = this.permissionSearch.toLowerCase().trim();

    // --- Filter Available (Left) ---
    const availGroups: { name: string, permissions: Permission[] }[] = [];

    for (const [groupName, perms] of Object.entries(this.masterPermissionsByGroup)) {
      const matchingPerms = perms.filter(p =>
        p.isVisibleForCurrentUser &&
        (p.displayName.toLowerCase().includes(term) || groupName.toLowerCase().includes(term))
      );

      if (matchingPerms.length > 0) {
        availGroups.push({ name: groupName, permissions: matchingPerms });
      }
    }
    this.filteredAvailableGroups = availGroups;

    // --- Filter Assigned (Right) ---
    const assignGroups: { name: string, permissions: Permission[] }[] = [];

    for (const [groupName, perms] of Object.entries(this.assignedPermissions)) {
      const filtered = perms.filter(p =>
        p.displayName.toLowerCase().includes(term) || groupName.toLowerCase().includes(term)
      );

      if (filtered.length > 0) {
        assignGroups.push({ name: groupName, permissions: filtered });
      }
    }
    this.filteredAssignedGroups = assignGroups;
  }

  // 4. Selection Logic

  // -- Available Side --
  isAvailableSelected(id: number): boolean {
    return this.availableSelection.has(id);
  }

  toggleAvailablePermission(id: number) {
    if (this.availableSelection.has(id)) {
      this.availableSelection.delete(id);
    } else {
      this.availableSelection.add(id);
    }
  }

  toggleAvailableGroup(groupName: string) {
    const group = this.filteredAvailableGroups.find(g => g.name === groupName);
    if (!group) return;

    const allSelected = group.permissions.every(p => this.availableSelection.has(p.id));

    if (allSelected) {
      group.permissions.forEach(p => this.availableSelection.delete(p.id));
    } else {
      group.permissions.forEach(p => this.availableSelection.add(p.id));
    }
  }

  isAvailableGroupAllSelected(groupName: string): boolean {
    const group = this.filteredAvailableGroups.find(g => g.name === groupName);
    if (!group) return false;
    return group.permissions.length > 0 && group.permissions.every(p => this.availableSelection.has(p.id));
  }

  // -- Assigned Side --
  isAssignedSelected(id: number): boolean {
    return this.assignedSelection.has(id);
  }

  toggleAssignedPermission(id: number) {
    if (this.assignedSelection.has(id)) {
      this.assignedSelection.delete(id);
    } else {
      this.assignedSelection.add(id);
    }
  }

  toggleAssignedGroup(groupName: string) {
    const group = this.filteredAssignedGroups.find(g => g.name === groupName);
    if (!group) return;

    const allSelected = group.permissions.every(p => this.assignedSelection.has(p.id));
    if (allSelected) {
      group.permissions.forEach(p => this.assignedSelection.delete(p.id));
    } else {
      group.permissions.forEach(p => this.assignedSelection.add(p.id));
    }
  }

  isAssignedGroupAllSelected(groupName: string): boolean {
    const group = this.filteredAssignedGroups.find(g => g.name === groupName);
    if (!group) return false;
    return group.permissions.length > 0 && group.permissions.every(p => this.assignedSelection.has(p.id));
  }


  // 5. Move Logic
  moveToAssigned() {
    if (!this.selectedUser) {
      this.toastService.show('Please select a user first.', 'warning');
      return;
    }
    if (this.availableSelection.size === 0) return;

    const movedWithGroup: { [key: string]: Permission[] } = {};

    this.availableSelection.forEach(id => {
      for (const groupName in this.masterPermissionsByGroup) {
        const perm = this.masterPermissionsByGroup[groupName].find(p => p.id === id);
        if (perm) {
          if (!movedWithGroup[groupName]) movedWithGroup[groupName] = [];

          movedWithGroup[groupName].push({ ...perm, isOverride: true });

          perm.isVisibleForCurrentUser = false;
          break;
        }
      }
    });

    for (const groupName in movedWithGroup) {
      if (!this.assignedPermissions[groupName]) {
        this.assignedPermissions[groupName] = [];
      }
      this.assignedPermissions[groupName].push(...movedWithGroup[groupName]);
    }

    this.availableSelection.clear();
    this.filterPermissions();
  }

  moveToAvailable() {
    if (this.assignedSelection.size === 0) return;

    for (const groupName in this.assignedPermissions) {
      const originalLength = this.assignedPermissions[groupName].length;

      const kept = [];
      const removedIds = [];

      for (const p of this.assignedPermissions[groupName]) {
        if (this.assignedSelection.has(p.id)) {
          removedIds.push(p.id);
        } else {
          kept.push(p);
        }
      }

      if (kept.length !== originalLength) {
        if (kept.length === 0) {
          delete this.assignedPermissions[groupName];
        } else {
          this.assignedPermissions[groupName] = kept;
        }
      }

      removedIds.forEach(id => {
        const masterPerm = this.masterPermissionsByGroup[groupName]?.find(mp => mp.id === id);
        if (masterPerm) {
          masterPerm.isVisibleForCurrentUser = true;
        }
      });
    }

    this.assignedSelection.clear();
    this.filterPermissions();
  }

  // 6. Save
  savePermissions() {
    if (!this.selectedUser) {
      this.toastService.show('Please select a user before saving.', 'warning');
      return;
    }

    const payload: { permissionID: number }[] = [];

    for (const groupName in this.assignedPermissions) {
      this.assignedPermissions[groupName].forEach(p => {
        payload.push({ permissionID: p.id });
      });
    }

    this.userService.updateUserPermissions(this.selectedUser, payload).subscribe({
      next: (data) => {
        this.toastService.show(data.message || 'Permissions saved successfully', 'success');
        this.fetchUserPermissions(this.selectedUser);
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.toastService.show(err.message || 'Failed to save permissions', 'error');
      },
    });
  }

  // UI Helpers
  isGroupExpanded(groupName: string): boolean {
    return this.expandedGroupNames.has(groupName);
  }

  toggleGroupExpansion(groupName: string) {
    if (this.expandedGroupNames.has(groupName)) {
      this.expandedGroupNames.delete(groupName);
    } else {
      this.expandedGroupNames.add(groupName);
    }
  }

  clearUserSelection() {
    this.selectedUser = '';
    this.assignedPermissions = {};
    this.assignedSelection.clear();
    this.availableSelection.clear();

    for (const group in this.masterPermissionsByGroup) {
      this.masterPermissionsByGroup[group].forEach(p => p.isVisibleForCurrentUser = true);
    }
    this.filterPermissions();
  }
}