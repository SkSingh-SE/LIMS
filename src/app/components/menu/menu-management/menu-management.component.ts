import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MenuService } from '../../../services/menu.service';
import { ToastService } from '../../../services/toast.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';

@Component({
  selector: 'app-menu-management',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, FormFieldErrorComponent],
  templateUrl: './menu-management.component.html',
  styleUrl: './menu-management.component.css',
})
export class MenuManagementComponent implements OnInit {
  menuForm!: FormGroup;
  menuId: number = 0;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  submitted = false;

  constructor(
    public fb: FormBuilder,
    private menuService: MenuService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.menuId = Number(params.get('id'));
    });

    const state = history.state as { mode?: string };
    if (state?.mode === 'view') this.isViewMode = true;
    if (state?.mode === 'edit') this.isEditMode = true;

    if (this.menuId > 0) this.getMenuDetails(this.menuId);
  }

  initForm(): void {
    this.menuForm = this.fb.group({
      id: [0],
      title: ['', [Validators.maxLength(100), noWhitespaceValidator()]],
      icon: ['bi-layout-text-sidebar', [Validators.maxLength(100)]],
      route: ['', [Validators.maxLength(200)]],
      color: ['#' + Math.floor(Math.random() * 16777215).toString(16)],
      submenu: this.fb.array([]),
    });
  }

  get submenuArray(): FormArray {
    return this.menuForm.get('submenu') as FormArray;
  }

  // ── Helpers used by recursive template (bypass formArrayName context issue) ──

  getFormControl(group: AbstractControl, name: string): FormControl {
    return group.get(name) as FormControl;
  }

  getSubmenuFormArray(group: AbstractControl): FormArray {
    return group.get('submenu') as FormArray;
  }

  isSubFieldInvalid(group: AbstractControl, name: string): boolean {
    const ctrl = group.get(name);
    return !!(ctrl?.invalid && (ctrl.touched || this.submitted));
  }

  addSubmenu(parentArray: FormArray): void {
    parentArray.push(
      this.fb.group({
        id: [0],
        title: ['', [Validators.maxLength(100), noWhitespaceValidator()]],
        route: ['', [Validators.maxLength(200)]],
        color: ['#' + Math.floor(Math.random() * 16777215).toString(16)],
        submenu: this.fb.array([]),
      })
    );
  }

  removeSubmenu(parentArray: FormArray, index: number): void {
    parentArray.removeAt(index);
  }

  // ── Visual helpers ──

  depthBorderColor(depth: number): string {
    const colors = ['#da261c', '#0d6efd', '#198754', '#fd7e14', '#6f42c1'];
    return colors[(depth - 1) % colors.length];
  }

  depthBadgeClass(depth: number): string {
    const classes = ['bg-danger', 'bg-primary', 'bg-success', 'bg-warning text-dark', 'bg-purple'];
    return classes[(depth - 1) % classes.length];
  }

  // ── Save ──

  submit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.menuForm);
    if (this.menuForm.valid) {
      const payload = this.menuForm.getRawValue();
      const saveFn = this.menuId > 0 ? this.menuService.updateMenu : this.menuService.createMenu;
      saveFn.call(this.menuService, payload).subscribe({
        next: (res: any) => {
          this.toastService.show(res.message, 'success');
          this.router.navigate(['/menu']);
        },
        error: (err: any) => this.toastService.show(err.error?.message || 'Save failed', 'error'),
      });
    } else {
      this.toastService.show('Please fix validation errors before submitting.', 'warning');
    }
  }

  getMenuDetails(id: number): void {
    this.menuService.getMenuById(id).subscribe({
      next: (res: any) => {
        if (res) {
          this.menuForm.patchValue({ id: res.id, title: res.title, icon: res.icon, route: res.route, color: res.color });
          this.submenuArray.clear();
          if (res.subMenu?.length > 0) {
            this.buildSubmenuArray(res.subMenu).controls.forEach((g) => this.submenuArray.push(g));
          }
        }
        if (this.isViewMode) this.menuForm.disable();
      },
      error: (err: any) => this.toastService.show(err.error?.message || 'Load failed', 'error'),
    });
  }

  buildSubmenuArray(submenus: any[]): FormArray {
    const arr = this.fb.array<FormGroup>([]);
    submenus.forEach((sub) => {
      arr.push(
        this.fb.group({
          id: [sub.id || 0],
          title: [sub.title || '', [Validators.maxLength(100), noWhitespaceValidator()]],
          route: [sub.route || '', [Validators.maxLength(200)]],
          color: [sub.color || '#' + Math.floor(Math.random() * 16777215).toString(16)],
          submenu: sub.subMenu ? this.buildSubmenuArray(sub.subMenu) : this.fb.array([]),
        })
      );
    });
    return arr;
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.menuForm, path, this.submitted);
  }
}
