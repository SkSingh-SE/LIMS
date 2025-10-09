import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
}


@Component({
  selector: 'app-user-permission',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, RouterLink],
  templateUrl: './user-permission.component.html',
  styleUrl: './user-permission.component.css'
})
export class UserPermissionComponent implements OnInit {
  selectedUser: string = '';
  permissionsByGroup: { [menuTitle: string]: Permission[] } = {};
  allPermissions:any[] = [];
  allPermissionForm: FormGroup;
  assignedPermissions: { [menuTitle: string]: Permission[] } = {};
  assignedPermissionSelection: Set<string> = new Set();
  permissionSearch: string = '';
  expandedGroups: { [key: number]: boolean } = {};

  filteredGroups: [string, Permission[]][] = [];
  filteredAssignedGroups: [string, Permission[]][] = [];

  
  constructor(private fb: FormBuilder, private userService: UserService, private toastService: ToastService) {
    this.allPermissionForm = this.fb.group({
      allPermissions: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.getPermissions();
  }

  initAllPermissions() {
    const arr = this.fb.array([]);
    const allPermissions = Object.entries(this.permissionsByGroup).flatMap(([_, perms]) =>
      perms.map(() => this.fb.control(false))
    );
    allPermissions.forEach((ctrl) => arr.push(ctrl));
    this.allPermissionForm.setControl('allPermissions', arr);
  }

  get allPermissionsArray(): FormArray {
    return this.allPermissionForm.get('allPermissions') as FormArray;
  }

  getGroupedPermissionList(): [string, Permission[]][] {
    return Object.entries(this.permissionsByGroup);
  }

  moveToAssigned() {
    if (!this.selectedUser) {
      alert('Please select a user before assigning permissions.');
      return;
    }

    // Only assign permissions that are checked in the filteredGroups
    let idx = 0;
    for (let groupIndex = 0; groupIndex < this.filteredGroups.length; groupIndex++) {
      const [group, perms] = this.filteredGroups[groupIndex];
      for (let i = 0; i < perms.length; i++) {
        const ctrl = this.getPermissionControl(groupIndex, i);
        if (ctrl.value) {
          if (!this.assignedPermissions[group]) {
            this.assignedPermissions[group] = [];
          }
          const alreadyAssigned = this.assignedPermissions[group].some((perm) => perm.id === perms[i].id);
          if (!alreadyAssigned) {
            this.assignedPermissions[group].push(perms[i]);
          }
          // Clear checkbox after assigning
          ctrl.setValue(false, { emitEvent: false });
        }
        idx++;
      }
    }
    this.filterPermissions(); // Refresh filtered views
  }


  moveToAvailable() {
    if (this.assignedPermissionSelection.size === 0) return;

    const idsToRemove = new Set<number>();

    // Mark permissions for removal and collect their IDs
    for (const group in this.assignedPermissions) {
      const remaining = this.assignedPermissions[group].filter((perm) => {
        const key = `${group}-${perm.displayName}`;
        const shouldRemove = this.assignedPermissionSelection.has(key);
        if (shouldRemove) {
          idsToRemove.add(perm.id);
        }
        return !shouldRemove;
      });

      if (remaining.length > 0) {
        this.assignedPermissions[group] = remaining;
      } else {
        delete this.assignedPermissions[group];
      }
    }

    // Uncheck from the form array (left side)
    let idx = 0;
    for (const [_, perms] of this.getGroupedPermissionList()) {
      for (const perm of perms) {
        if (idsToRemove.has(perm.id)) {
          this.allPermissionsArray.at(idx).setValue(false, { emitEvent: false });
        }
        idx++;
      }
    }

    this.assignedPermissionSelection.clear();
  }


  getPermissionControl(groupIndex: number, permissionIndex: number): FormControl {
    const flatIndex = this.getFlatIndex(groupIndex, permissionIndex);
    return this.allPermissionsArray.at(flatIndex) as FormControl;
  }

  getFlatIndex(groupIndex: number, permissionIndex: number): number {
    let index = 0;
    const groups = this.getGroupedPermissionList();
    for (let i = 0; i < groupIndex; i++) {
      index += groups[i][1].length;
    }
    return index + permissionIndex;
  }

  getUsers = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.userService.getUserDropdown(term, page, pageSize);
  };

  onUserSelected(item: any) {
    this.selectedUser = item.id;
    this.fetchUserPermissions(item.id);
  }

  getPermissions() {
    this.userService.getPermissions().subscribe({
      next: (data) => {
        const grouped: { [menuTitle: string]: Permission[] } = {};
        data.forEach((group: any) => {
          grouped[group.menuTitle] = group.permissions;
        });
        this.permissionsByGroup = grouped;
        this.allPermissions = Object.entries(this.permissionsByGroup);
        this.initAllPermissions();
        this.filterPermissions();
      },
      error: (error) => {
        console.error('Error fetching permissions:', error);
        alert('Failed to load permissions.');
      },
    });
  }

  fetchUserPermissions(userId: string) {
    this.userService.getUserPermissions(userId).subscribe({
      next: (data) => {
        const grouped: { [menuTitle: string]: Permission[] } = {};
        const assignedIds = new Set<number>();

        data.forEach((group: any) => {
          grouped[group.menuTitle] = group.permissions;
          group.permissions.forEach((perm: Permission) => assignedIds.add(perm.id));
        });

        this.assignedPermissions = grouped;

        // Check permissions in form
        let idx = 0;
        for (const [_, perms] of this.getGroupedPermissionList()) {
          for (const perm of perms) {
            const isChecked = assignedIds.has(perm.id);
            this.allPermissionsArray.at(idx).setValue(isChecked, { emitEvent: false });
            idx++;
          }
        }
        this.filterPermissions(); // <-- Ensure right side updates
      },
      error: (error) => {
        console.error('Error fetching user permissions:', error);
        alert('Failed to load user permissions.');
      },
    });
  }

  onAssignedPermissionToggle(group: string, permissionName: string, event: Event) {
    event.preventDefault();
    const checked = (event.target as HTMLInputElement).checked;
    const key = `${group}-${permissionName}`;
    if (checked) {
      this.assignedPermissionSelection.add(key);
    } else {
      this.assignedPermissionSelection.delete(key);
    }
  }

  savePermissions() {
    if (!this.selectedUser) {
      alert('Please select a user before saving.');
      return;
    }

    const payload = [];
    const assignedIds: number[] = [];
    for (const group in this.assignedPermissions) {
      for (const perm of this.assignedPermissions[group]) {
        assignedIds.push(perm.id);
        payload.push({
          permissionID: perm.id
        });
      }
    }



    this.userService.updateUserPermissions(this.selectedUser, payload).subscribe({
      next: (data) => {
        this.toastService.show(data.message, 'success');
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.toastService.show(err.message, 'error');
      },
    });
    
  }

  // Returns true if all children in the group are checked
  isGroupChecked(groupIndex: number): boolean {
    const groups = this.getGroupedPermissionList();
    const groupLength = groups[groupIndex][1].length;
    for (let i = 0; i < groupLength; i++) {
      if (!this.getPermissionControl(groupIndex, i).value) {
        return false;
      }
    }
    return groupLength > 0;
  }

  // Handler for group checkbox change
  onGroupCheckboxChange(groupIndex: number, event: Event): void {
    event.preventDefault();
    const checked = (event.target as HTMLInputElement).checked;
    const groups = this.getGroupedPermissionList();
    const groupLength = groups[groupIndex][1].length;
    for (let i = 0; i < groupLength; i++) {
      this.getPermissionControl(groupIndex, i).setValue(checked, { emitEvent: false });
    }
  }

  // Add to your component class (UserPermissionComponent)
  onPermissionSearch(term: string) {
    this.permissionSearch = term;
    this.filterPermissions();
  }

  filterPermissions() {
    const search = this.permissionSearch.toLowerCase();
    // Filter only available permissions (left side)
    this.filteredGroups = this.getGroupedPermissionList()
      .filter(([group, perms]) =>
        perms.some(p =>
          p.displayName.toLowerCase().includes(search) ||
          group.toLowerCase().includes(search)
        )
      )
      .map(([group, perms]) => [
        group,
        perms.filter(p =>
          p.displayName.toLowerCase().includes(search) ||
          group.toLowerCase().includes(search)
        )
      ] as [string, Permission[]]);

    // Assigned permissions (right side) should always show all
    this.filteredAssignedGroups = Object.entries(this.assignedPermissions)
      .map(([group, perms]) => [group, perms] as [string, Permission[]]);
  }

  selectGroup(groupIndex: number) {
    const group = this.filteredGroups[groupIndex];
    if (!group) return;
    // Check if all are selected
    const allChecked = group[1].every((_, i) => this.getPermissionControl(groupIndex, i).value);
    group[1].forEach((_, i) => {
      this.getPermissionControl(groupIndex, i).setValue(!allChecked, { emitEvent: false });
    });
  }

  toggleGroup(groupIndex: number) {
    this.expandedGroups[groupIndex] = !this.expandedGroups[groupIndex];
  }

  removeAssignedPermission(group: string, permId: number) {
    if (this.assignedPermissions[group]) {
      this.assignedPermissions[group] = this.assignedPermissions[group].filter(p => p.id !== permId);
      // Optionally uncheck in allPermissionForm
      let idx = 0;
      for (const [g, perms] of this.getGroupedPermissionList()) {
        for (const perm of perms) {
          if (perm.id === permId) {
            this.allPermissionsArray.at(idx).setValue(false, { emitEvent: false });
          }
          idx++;
        }
      }
    }
  }

  // New method: select/unselect all assigned permissions in a right-side group
  selectAssignedGroup(groupIndex: number) {
    const group = this.filteredAssignedGroups[groupIndex];
    if (!group) return;
    const groupName = group[0];
    const perms = this.assignedPermissions[groupName] || [];

    const allSelected = perms.length > 0 && perms.every(p => this.assignedPermissionSelection.has(`${groupName}-${p.displayName}`));

    if (allSelected) {
      // Unselect all
      perms.forEach(p => this.assignedPermissionSelection.delete(`${groupName}-${p.displayName}`));
    } else {
      // Select all
      perms.forEach(p => this.assignedPermissionSelection.add(`${groupName}-${p.displayName}`));
    }
  }

}