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
  // UI helper
  isVisibleForCurrentUser?: boolean;
}

@Component({
  selector: 'app-user-permission',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, RouterLink],
  templateUrl: './user-permission.component.html',
  styleUrl: './user-permission.component.css'
})
export class UserPermissionComponent implements OnInit {
  selectedUser: string = '';

  // master list (never mutated except on full refresh)
  masterPermissionsByGroup: { [menuTitle: string]: Permission[] } = {};

  // current available list used for left-side UI (we will toggle isVisibleForCurrentUser on it)
  permissionsByGroup: { [menuTitle: string]: Permission[] } = {};

  allPermissions: any[] = [];
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

  // Build form controls based on master ordering
  initAllPermissions() {
    const arr = this.fb.array([]);
    const masterList = this.getMasterGroupedList();
    const controls = masterList.flatMap(([_, perms]) => perms.map(() => this.fb.control(false)));
    controls.forEach((ctrl) => arr.push(ctrl));
    this.allPermissionForm.setControl('allPermissions', arr);
  }

  get allPermissionsArray(): FormArray {
    return this.allPermissionForm.get('allPermissions') as FormArray;
  }

  // Helpers to get grouped lists
  getMasterGroupedList(): [string, Permission[]][] {
    return Object.entries(this.masterPermissionsByGroup);
  }

  getAvailableGroupedList(): [string, Permission[]][] {
    return Object.entries(this.permissionsByGroup);
  }

  // Find flat index in master ordering for a given permission id
  private getFlatIndexByPermissionId(id: number): number {
    let index = 0;
    const groups = this.getMasterGroupedList();
    for (let gi = 0; gi < groups.length; gi++) {
      const perms = groups[gi][1];
      for (let pi = 0; pi < perms.length; pi++) {
        if (perms[pi].id === id) return index;
        index++;
      }
    }
    return -1;
  }

  getPermissionControlById(id: number): FormControl | null {
    const idx = this.getFlatIndexByPermissionId(id);
    if (idx >= 0 && this.allPermissionsArray.at(idx)) {
      return this.allPermissionsArray.at(idx) as FormControl;
    }
    return null;
  }

  // When assigning from left -> right, we iterate visible left items; get their master control by id
  moveToAssigned() {
    if (!this.selectedUser) {
      alert('Please select a user before assigning permissions.');
      return;
    }

    // Only assign permissions that are checked in the filteredGroups (visible left)
    for (let groupIndex = 0; groupIndex < this.filteredGroups.length; groupIndex++) {
      const [group, perms] = this.filteredGroups[groupIndex];
      for (let i = 0; i < perms.length; i++) {
        const perm = perms[i];
        const control = this.getPermissionControlById(perm.id);
        if (control && control.value) {
          if (!this.assignedPermissions[group]) {
            this.assignedPermissions[group] = [];
          }
          const alreadyAssigned = this.assignedPermissions[group].some((p) => p.id === perm.id);
          if (!alreadyAssigned) {
            this.assignedPermissions[group].push(perm);
          }
          // Clear checkbox after assigning
          control.setValue(false, { emitEvent: false });
        }
      }
    }

    this.filterPermissions(); // Refresh filtered views
  }

  moveToAvailable() {
    if (this.assignedPermissionSelection.size === 0) return;

    const idsToRemove = new Set<number>();

    // Remove selected assigned permissions and collect their ids
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

    // Uncheck from the form array (master ordering)
    let idx = 0;
    const master = this.getMasterGroupedList();
    for (const [_, perms] of master) {
      for (const perm of perms) {
        if (idsToRemove.has(perm.id)) {
          if (this.allPermissionsArray.at(idx)) {
            this.allPermissionsArray.at(idx).setValue(false, { emitEvent: false });
          }
        }
        idx++;
      }
    }

    this.assignedPermissionSelection.clear();
    this.filterPermissions();
  }

  getPermissionControl(groupIndex: number, permissionIndex: number): FormControl {
    // This function retained for compatibility but uses master ordering mapping
    const masterGroups = this.getMasterGroupedList();
    let flatIndex = 0;
    for (let i = 0; i < groupIndex; i++) {
      flatIndex += masterGroups[i][1].length;
    }
    flatIndex += permissionIndex;
    return this.allPermissionsArray.at(flatIndex) as FormControl;
  }

  getFlatIndex(groupIndex: number, permissionIndex: number): number {
    // compute using master ordering
    let index = 0;
    const groups = this.getMasterGroupedList();
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

  // ---------- CHANGED: keep ALL permissions in master list (do NOT filter by isOverride) ----------
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
            isVisibleForCurrentUser: true // default visible until a user selection may filter some
          }));
          if (perms.length > 0) {
            groupedMaster[group.menuTitle] = perms;
          }
        });

        // Save master and initialize available (left) as a deep copy
        this.masterPermissionsByGroup = JSON.parse(JSON.stringify(groupedMaster));
        // Convert back into typed objects and keep isVisible flag
        this.permissionsByGroup = Object.fromEntries(
          Object.entries(groupedMaster).map(([k, v]) => [k, v.map(x => ({ ...x }))])
        );

        this.allPermissions = Object.entries(this.masterPermissionsByGroup);
        // initialize form controls based on master ordering
        this.initAllPermissions();
        this.filterPermissions();
      },
      error: (error) => {
        console.error('Error fetching permissions:', error);
        alert('Failed to load permissions.');
      },
    });
  }

  // ---------- CHANGED: when fetching user's assigned permissions, intersect with master and filter out isOverride === false from left & right ----------
  fetchUserPermissions(userId: string) {
    this.userService.getUserPermissions(userId).subscribe({
      next: (data) => {
        const groupedAssigned: { [menuTitle: string]: Permission[] } = {};
        const assignedIds = new Set<number>();
        const nonOverrideIds = new Set<number>();

        // build master id set for intersection
        const masterIdSet = new Set<number>();
        for (const [, perms] of Object.entries(this.masterPermissionsByGroup)) {
          perms.forEach(p => masterIdSet.add(p.id));
        }

        // Process user data:
        data.forEach((group: any) => {
          (group.permissions || []).forEach((p: any) => {
            if (!p || !p.id) return;
            if (!masterIdSet.has(p.id)) return; // ignore unknown perms
            if (p.isOverride === false) {
              // collect non-override ids to hide from left and right
              nonOverrideIds.add(p.id);
            } else {
              // treat as assigned for user (override-able assigned perms)
              assignedIds.add(p.id);
            }
          });
        });

        // Build assignedPermissions grouped by master menuTitle using assignedIds only
        for (const [menuTitle, perms] of Object.entries(this.masterPermissionsByGroup)) {
          const assignedInGroup = perms
            .filter(pm => assignedIds.has(pm.id))
            .map(pm => ({ ...pm } as Permission));
          if (assignedInGroup.length > 0) {
            groupedAssigned[menuTitle] = assignedInGroup;
          }
        }

        this.assignedPermissions = groupedAssigned;

        // Mark visibility on available (left) permissions: hide any permission that is present in nonOverrideIds
        for (const [menuTitle, perms] of Object.entries(this.permissionsByGroup)) {
          perms.forEach(p => {
            p.isVisibleForCurrentUser = !nonOverrideIds.has(p.id);
          });
        }

        // Sync master form checkboxes: mark those present in assignedIds
        // Ensure form array is initialized
        if (!this.allPermissionsArray || this.allPermissionsArray.length === 0) {
          this.initAllPermissions();
        }

        // Reset all to false then set assigned ones true (defensive)
        for (let i = 0; i < this.allPermissionsArray.length; i++) {
          this.allPermissionsArray.at(i).setValue(false, { emitEvent: false });
        }

        // Set assigned checkboxes true by id mapping
        assignedIds.forEach(id => {
          const ctrl = this.getPermissionControlById(id);
          if (ctrl) ctrl.setValue(true, { emitEvent: false });
        });

        this.filterPermissions(); // refresh filtered views
      },
      error: (error) => {
        console.error('Error fetching user permissions:', error);
        alert('Failed to load user permissions.');
      },
    });
  }

  // Clear user selection and reset both sides to master state
  clearUserSelection() {
    this.selectedUser = '';
    this.assignedPermissions = {};
    this.assignedPermissionSelection.clear();

    // restore available list from master and mark all visible
    this.permissionsByGroup = Object.fromEntries(
      Object.entries(this.masterPermissionsByGroup).map(([k, v]) =>
        [k, v.map(p => ({ ...p, isVisibleForCurrentUser: true }))]
      )
    );

    // reset all form controls to false
    if (!this.allPermissionsArray || this.allPermissionsArray.length === 0) {
      this.initAllPermissions();
    }
    for (let i = 0; i < this.allPermissionsArray.length; i++) {
      this.allPermissionsArray.at(i).setValue(false, { emitEvent: false });
    }

    this.filterPermissions();
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
        this.assignedPermissionSelection.clear();
        this.fetchUserPermissions(this.selectedUser); // Refresh from server
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.toastService.show(err.message, 'error');
      },
    });
  }

  isGroupChecked(groupIndex: number): boolean {
    const groups = this.getMasterGroupedList();
    const groupLength = groups[groupIndex][1].length;
    for (let i = 0; i < groupLength; i++) {
      if (!this.getPermissionControl(groupIndex, i).value) {
        return false;
      }
    }
    return groupLength > 0;
  }

  onGroupCheckboxChange(groupIndex: number, event: Event): void {
    event.preventDefault();
    const checked = (event.target as HTMLInputElement).checked;
    const groups = this.getMasterGroupedList();
    const groupLength = groups[groupIndex][1].length;
    for (let i = 0; i < groupLength; i++) {
      this.getPermissionControl(groupIndex, i).setValue(checked, { emitEvent: false });
    }
  }

  onPermissionSearch(term: string) {
    this.permissionSearch = term;
    this.filterPermissions();
  }

  filterPermissions() {
    const search = this.permissionSearch.toLowerCase();

    // Left side: available, skip permissions hidden for current user (isVisibleForCurrentUser === false)
    this.filteredGroups = this.getAvailableGroupedList()
      .filter(([group, perms]) =>
        perms.some(p =>
          (p.isVisibleForCurrentUser !== false) &&
          (p.displayName.toLowerCase().includes(search) || group.toLowerCase().includes(search))
        )
      )
      .map(([group, perms]) => [
        group,
        perms.filter(p =>
          (p.isVisibleForCurrentUser !== false) &&
          (p.displayName.toLowerCase().includes(search) || group.toLowerCase().includes(search))
        )
      ] as [string, Permission[]]);

    // Right side: assignedPermissions already excludes non-override perms (we filtered earlier)
    this.filteredAssignedGroups = Object.entries(this.assignedPermissions)
      .map(([group, perms]) => [group, perms] as [string, Permission[]]);
  }

  selectGroup(groupIndex: number) {
    const group = this.filteredGroups[groupIndex];
    if (!group) return;
    const allChecked = group[1].every((_, i) => {
      // map visible group's (groupIndex,i) to master id then control value
      const perm = group[1][i];
      const ctrl = this.getPermissionControlById(perm.id);
      return ctrl ? ctrl.value : false;
    });
    group[1].forEach((perm, i) => {
      const ctrl = this.getPermissionControlById(perm.id);
      if (ctrl) ctrl.setValue(!allChecked, { emitEvent: false });
    });
  }

  toggleGroup(groupIndex: number) {
    this.expandedGroups[groupIndex] = !this.expandedGroups[groupIndex];
  }

  removeAssignedPermission(group: string, permId: number) {
    if (this.assignedPermissions[group]) {
      this.assignedPermissions[group] = this.assignedPermissions[group].filter(p => p.id !== permId);
      // uncheck corresponding master control
      const ctrl = this.getPermissionControlById(permId);
      if (ctrl) ctrl.setValue(false, { emitEvent: false });
    }
  }

  selectAssignedGroup(groupIndex: number) {
    const group = this.filteredAssignedGroups[groupIndex];
    if (!group) return;

    const groupName = group[0];
    const perms = this.assignedPermissions[groupName] || [];
    const overridePerms = perms.filter(p => p.isOverride);

    if (overridePerms.length === 0) return;

    const allSelected =
      overridePerms.length > 0 &&
      overridePerms.every(p =>
        this.assignedPermissionSelection.has(`${groupName}-${p.displayName}`)
      );

    if (allSelected) {
      overridePerms.forEach(p =>
        this.assignedPermissionSelection.delete(`${groupName}-${p.displayName}`)
      );
    } else {
      overridePerms.forEach(p =>
        this.assignedPermissionSelection.add(`${groupName}-${p.displayName}`)
      );
    }
  }
}