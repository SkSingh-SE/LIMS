import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-menu-management',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './menu-management.component.html',
  styleUrl: './menu-management.component.css'
})
export class MenuManagementComponent implements OnInit {
  menuForm!: FormGroup;

  constructor(public fb: FormBuilder) {}

  ngOnInit(): void {
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
    console.log('Menu Payload:', this.menuForm.value);
  }
}