import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from 'bootstrap';
import { ToastService } from '../../../services/toast.service';
import { MenuService } from '../../../services/menu.service';
import { Observable } from 'rxjs';
import { SearchableDropdownModalComponent } from '../../../utility/components/searchable-dropdown-modal/searchable-dropdown-modal.component';

@Component({
  selector: 'app-menu-permission',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SearchableDropdownModalComponent],
  templateUrl: './menu-permission.component.html',
  styleUrl: './menu-permission.component.css'
})
export class MenuPermissionComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: true },
    { key: 'title', type: 'string', label: 'Title', filter: true }
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
    id: 'number',
    title: 'string'
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;
  permissionList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [5, 10, 20];

  sortByColumn: string = 'id';
  sortOrder: string = 'asc';
  searchTerm: string = '';
  isLoading = signal(false);

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  // form
  permissionForm!: FormGroup;
  isEditMode: boolean = false;
  isViewMode: boolean = true;
  menuId: number = 0;
  formTitle = 'Permission Form';

  menuItems = [
    { id: 1, name: 'Administration', parentId: null },
    { id: 2, name: 'Employee Master', parentId: 1 },
    { id: 3, name: 'Department Master', parentId: 1 },
    { id: 4, name: 'Specification', parentId: null },
    { id: 5, name: 'Heat Treatment', parentId: 4 },
    { id: 6, name: 'Material Specification', parentId: 4 },
    { id: 7, name: 'Customer', parentId: null },
    { id: 8, name: 'Customer Master', parentId: 7 }
  ];
  groupedMenuItems: any[] = [];

  constructor(private fb: FormBuilder, private toastService: ToastService, private menuService: MenuService) {

  }

  ngOnInit() {
    this.initForm();
    this.fetchData();

  }
// Form Initiated
  initForm() {
    this.permissionForm = this.fb.group({
      menuId: ['', Validators.required],
      permissions: this.fb.array([]),
    });
  }
  get permissionsArray() {
    return this.permissionForm.get('permissions') as FormArray;
  }
  addPermission() {
    const permissionGroup = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      displayName: ['', Validators.required],
      menuID: [0],
      description: [''],
      type: [''],
    });
    this.permissionsArray.push(permissionGroup);
  }
  removePermission(index: number) {
    this.permissionsArray.removeAt(index);
  }

  // calling list api
  fetchData() {
    this.menuService.getAllSubMenus(this.payload).subscribe({
      next: (response) => {
        this.permissionList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        this.permissionList = [];
        this.isLoading.set(false);
      }
    }
    );
  }


  getDetails(): void {
    this.menuService.getPermissions(this.menuId).subscribe({
      next: (res: any) => {
        if (res) {
          this.permissionForm.patchValue({
            menuId: this.menuId
          });

          if(res.length > 0){
            res.map((permission: any) => {
              this.permissionsArray.push(this.fb.group({
                id: permission.id,
                name: permission.name,
                displayName: permission.displayName,
                menuID: permission.menuID,
                description: permission.description,
                type: permission.type
              }))
            })
          }
        }
      },
      error: err => {
        this.toastService.show(err.error.message, 'error');
      }
    });
  }

  applySorting(column: string) {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.fetchData();
  }

  openFilterModal(column: string, event: MouseEvent) {
    this.filterColumn = column;
    this.columns.forEach(col => {
      if (col.key === column) {
        this.filterColumnTitle = col.label;
      }
    })
    this.filterValue = '';
    this.filterValue2 = '';

    const columnType = this.filterColumnTypes[column];
    switch (columnType) {
      case 'string':
        this.filterType = 'Contains';
        break;
      case 'number':
        this.filterType = 'Equal';
        break;
      case 'date':
        this.filterType = 'Between';
        break;
      default:
        this.filterType = 'Contains';
    }

    this.isFilterOpen = true;
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;
    }
  }

  applyFilter() {
    if (!this.filterColumn || this.filterValue === '') return;

    const existingFilterIndex = this.filters.findIndex(f => f.column === this.filterColumn);
    const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };

    if (existingFilterIndex > -1) {
      this.filters[existingFilterIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }

    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string) {
    this.filters = this.filters.filter(filter => filter.column !== column);
    this.payload.filter = this.filters;
    this.fetchData();
  }

  closeFilterModal() {
    if (this.filterModal) {
      this.filterModal.nativeElement.style.display = 'none';
    }
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.payload.PageNumber = this.pageNumber;
    this.fetchData();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1; // Reset to first page
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
  }

  onSearch() {
    if (this.searchTerm !== this.payload.searchTerm) {
      this.payload.searchTerm = this.searchTerm;
      this.fetchData();
    }
  }

  get totalPages(): number[] {
    return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
  }

  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }
  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.type : undefined;
  }

  deleteFn(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      this.menuService.deleteMenu(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error.message, 'error');
        }
      });
    }
  }
  openModal(type: string, id: number): void {
    if (id > 0) {
      this.menuId = id;
      this.getDetails();
    }
    if (type === 'create') {
      this.isEditMode = false;
      this.isViewMode = false;
      this.initForm();
      this.formTitle = 'Permission Form';
      this.permissionForm.enable();
    } else if (type === 'edit') {
      this.isEditMode = true;
      this.isViewMode = false;
      this.formTitle = 'Permission Form';
      this.permissionForm.enable();

    }
    else if (type === 'view') {
      this.isViewMode = true;
      this.isEditMode = false;
      this.formTitle = 'View Permission';
      this.permissionForm.disable();
    }

    this.bsModal = new Modal(this.modalElement.nativeElement);
    this.bsModal.show();
  }

  closeModal(): void {
    this.initForm();
    if (this.bsModal) {
      this.bsModal.hide();
    }
  }

  onSubmit(): void {
    if (this.permissionForm.valid) {
      const payload = this.permissionForm.getRawValue();
      const updatedPermissions = payload.permissions;
      this.menuService.updatePermission(this.menuId, updatedPermissions).subscribe({
        next: (res: any) => {
          this.toastService.show(res.message, 'success');
          this.closeModal();
          this.initForm();
          this.fetchData()
        },
        error: (err: any) => this.toastService.show(err.error.message, 'error')
      });
    } else {
      this.permissionForm.markAllAsTouched();
    }
  }

  trackByFn(item: any) {
    return item.label;
  }

  getMenus = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.menuService.getSubMenuDropdown(term, page, pageSize);
  };
  onMenuSelected(item: any) {
    this.permissionForm.patchValue({ menuId: item.id });
  }

}



