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
  allPermissionForm: FormGroup;
  assignedPermissions: { [menuTitle: string]: Permission[] } = {};
  assignedPermissionSelection: Set<string> = new Set();

  
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

    const selectedIndexes = this.allPermissionsArray.controls
      .map((ctrl, i) => (ctrl.value ? i : -1))
      .filter((i) => i !== -1);

    if (!selectedIndexes.length) return;

    let idx = 0;
    for (const [group, perms] of this.getGroupedPermissionList()) {
      for (const p of perms) {
        if (selectedIndexes.includes(idx)) {
          if (!this.assignedPermissions[group]) {
            this.assignedPermissions[group] = [];
          }
          const alreadyAssigned = this.assignedPermissions[group].some((perm) => perm.id === p.id);
          if (!alreadyAssigned) {
            this.assignedPermissions[group].push(p);
          }

          // Clear checkbox after assigning
          // this.allPermissionsArray.at(idx).setValue(false, { emitEvent: false });
        }
        idx++;
      }
    }
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
        this.initAllPermissions();
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
      },
      error: (error) => {
        console.error('Error fetching user permissions:', error);
        alert('Failed to load user permissions.');
      },
    });
  }

  onAssignedPermissionToggle(group: string, permissionName: string, event: Event) {
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
    const checked = (event.target as HTMLInputElement).checked;
    const groups = this.getGroupedPermissionList();
    const groupLength = groups[groupIndex][1].length;
    for (let i = 0; i < groupLength; i++) {
      this.getPermissionControl(groupIndex, i).setValue(checked, { emitEvent: false });
    }
  }

}