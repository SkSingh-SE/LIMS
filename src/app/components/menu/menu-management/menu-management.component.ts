import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuService } from '../../../services/menu.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-menu-management',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './menu-management.component.html',
  styleUrl: './menu-management.component.css'
})
export class MenuManagementComponent implements OnInit {
  menuForm!: FormGroup;
  menuId: number = 0;
  isViewMode: boolean = false;
  isEditMode: boolean = false;

  constructor(public fb: FormBuilder, private menuService: MenuService, private toastService: ToastService, private route: ActivatedRoute,
    private router: Router) {
      this.initForm();
     }

  ngOnInit(): void {

    this.route.paramMap.subscribe((params) => {
      this.menuId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };

    if (state) {
      if (state.mode === 'view') {
        this.isViewMode = true;
      }
      if (state.mode === 'edit') {
        this.isEditMode = true;
      }
    }

    if (this.menuId > 0) {
      this.getMenuDetails(this.menuId);
    } 
  }
  initForm(): void {
    this.menuForm = this.fb.group({
      id: [0],
      title: [''],
      icon: ['bi-layout-text-sidebar'],
      route: [''],
      color: ['#' + Math.floor(Math.random() * 16777215).toString(16)],
      submenu: this.fb.array([])
    });
  }

  get submenuArray(): FormArray {
    return this.menuForm.get('submenu') as FormArray;
  }

  getSubmenuArray(group: any): FormArray {
    return group.get('submenu') as FormArray;
  }

  addSubmenu(parentArray: FormArray): void {
    const group = this.fb.group({
      id: [0],
      title: [''],
      route: [''],
      color: ['#' + Math.floor(Math.random() * 16777215).toString(16)],
      submenu: this.fb.array([])
    });
    parentArray.push(group);
  }

  removeSubmenu(parentArray: FormArray, index: number): void {
    parentArray.removeAt(index);
  }

 submit(): void {
    if (this.menuForm.valid) {
      const payload = this.menuForm.getRawValue();

      const saveFn = this.menuId > 0
        ? this.menuService.updateMenu
        : this.menuService.createMenu;


      saveFn.call(this.menuService, payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res.message, 'success');
          this.router.navigate(['/menu']);
        },
        error: (err: any) => this.toastService.show(err.error.message, 'error')
      });
    } else {
      this.menuForm.markAllAsTouched();
    }
  }

  getMenuDetails(id: number): void {
    this.menuService.getMenuById(id).subscribe({
      next: (res: any) => {
       if(res) {
          this.menuForm.patchValue({
            id: res.id,
            title: res.title,
            icon: res.icon,
            route: res.route,
            color: res.color
          });
          this.submenuArray.clear();
          if (res.subMenu && res.subMenu.length > 0) {
            const subGroup = this.buildSubmenuArray(res.subMenu || []);
            subGroup.controls.forEach(group => this.submenuArray.push(group));
          }
        }

        if (this.isViewMode) {
          this.menuForm.disable();
        }
      },
      error: (err: any) => this.toastService.show(err.error.message, 'error')
    });
  }


  buildSubmenuArray(submenus: any[]): FormArray {
    const arr = this.fb.array<FormGroup>([]);
    submenus.forEach(sub => {
      const group = this.fb.group({
        id: [sub.id || 0],
        title: [sub.title || ''],
        route: [sub.route || ''],
        color: [sub.color || '#' + Math.floor(Math.random() * 16777215).toString(16)],
        submenu: sub.subMenu ? this.buildSubmenuArray(sub.subMenu) : this.fb.array([])
      });
      arr.push(group);
    });
    return arr;
  }

}