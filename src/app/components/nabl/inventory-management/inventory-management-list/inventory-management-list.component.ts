import { Component, OnInit, ElementRef, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { Inventorymanagement } from "../../../../models/inventory-managementModel";
import { InventorymanagementService } from "../../../../services/inventory-management.service";
import { ToastService } from "../../../../services/toast.service";
import { PaginationComponent } from "../../../../utility/components/pagination/pagination.component";
import { FormBuilder, FormGroup, FormsModule, Validators } from "@angular/forms";
import { ReactiveFormsModule } from "@angular/forms";
@Component({
    selector: 'app-inventory-management-list',

    imports: [CommonModule, RouterModule, FormsModule, PaginationComponent, ReactiveFormsModule],
    templateUrl: './inventory-management-list.component.html',
    styleUrl: './inventory-management-list.component.css',
})

export class InventoryManagementListComponent implements OnInit {
    @ViewChild('filterModal') filterModal!: ElementRef;

    columns = [
        { key: 'id', type: 'number', label: 'SN', filter: false },
        { key: 'itemCode', label: 'Item Code', type: 'string', filter: true },
        { key: 'itemName', label: 'Item Name', type: 'string', filter: true },
        { key: 'itemCategory', label: 'Item Category', type: 'string', filter: true },
        { key: 'unit', label: 'Unit', type: 'string', filter: true },
        { key: 'quantity', label: 'Quantity', type: 'string', filter: true },
        { key: 'date', label: 'Date', type: 'date', filter: true },
        // { key: 'manufacturer', label: 'Manufacturer', type: 'string' },
        // { key: 'type', label: 'Type', type: 'string' },
    ];
    filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
        name: 'string',
        description: 'string',
        createdBy: 'string',
        modifiedOn: 'date'
    };
    filters: { column: string; type: string; value: any; value2?: any }[] = [];
    filterColumn: string = 'string';
    filterType: string = 'Contains';
    filterValue: string = '';
    filterValue2: string = '';
    filterPosition = { top: '0px', left: '0px' };
    isFilterOpen = false;
    inventoryForm: FormGroup;
    qtyForm: FormGroup;
    inventories: any[] = [];
    filteredInventories: any[] = [];

    pageNumber = 1;
    pageSize = 10;
    totalItems = 0;
    pageSizes = [10, 25, 50, 100, 200, 500];

    sortByColumn: string = 'modifiedOn';
    sortOrder: string = 'desc';
    searchTerm: string = '';

    payload = {
        PageNumber: this.pageNumber,
        PageSize: this.pageSize,
        searchTerm: this.searchTerm,
        sortByColumn: this.sortByColumn,
        sortOrder: this.sortOrder,
        filter: this.filters ?? null
    }
    showQtyPopup = false;
    selectedInventory: any = null;
    quantityLogs: any[] = [];

    constructor(private fb: FormBuilder, private service: InventorymanagementService,
        private toastService: ToastService
    ) {
        this.inventoryForm = this.fb.group({
            searchTerm: '',
            sortByColumn: '',
            sortOrder: '',
            filters: this.fb.group({}),
        });
        this.qtyForm = this.fb.group({
            addedQuantity: [null, [Validators.required, Validators.min(1)]]
        });

    }

    ngOnInit(): void {
        this.loadRecords();
    }

    loadRecords() {

        this.service.getAll(this.payload).subscribe({
            next: (res) => {
                this.inventories = res?.items || [];
                this.totalItems = res?.totalRecords || 0;
                this.pageSize = res?.pageSize || 10;
                this.pageNumber = res?.pageNumber || 1;
                this.filteredInventories = this.inventories;
            },
            error: (error) => {
                console.error('Error fetching inventory managment:', error);
                this.inventories = this.filteredInventories = [];
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
        this.loadRecords();
    }

    openFilterModal(column: string, event: MouseEvent) {
        this.filterColumn = column;
        this.filterValue = '';
        this.filterValue2 = '';

        // Determine filter type dynamically
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

            // Clamp to viewport so the popup doesn't overflow
            requestAnimationFrame(() => {
                const modalRect = modal.getBoundingClientRect();
                if (modalRect.right > window.innerWidth) {
                    modal.style.left = `${window.innerWidth - modalRect.width - 10 + window.scrollX}px`;
                }
                if (modalRect.bottom > window.innerHeight) {
                    modal.style.top = `${rect.top + window.scrollY - modalRect.height - 5}px`;
                }
            });
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

        this.payload.filter = this.filters;
        this.loadRecords();
        this.closeFilterModal();
    }

    resetFilter(column: string) {
        this.filters = this.filters.filter(filter => filter.column !== column);
        this.payload.filter = this.filters;
        this.loadRecords();
    }

    closeFilterModal() {
        if (this.filterModal) {
            this.filterModal.nativeElement.style.display = 'none';
        }
    }


    onPageChange(page: number): void {
        this.pageNumber = page;
        this.payload.PageNumber = this.pageNumber;
        this.loadRecords();
    }
    changePageSize(event: Event) {
        this.pageSize = Number((event.target as HTMLSelectElement).value);
        this.pageNumber = 1; // Reset to first page
        this.payload.PageNumber = this.pageNumber;
        this.payload.PageSize = this.pageSize;
        this.loadRecords();
    }

    onSearch() {
        if (this.searchTerm !== this.payload.searchTerm) {
            this.pageNumber = 1;
            this.payload.PageNumber = 1;
            this.payload.searchTerm = this.searchTerm;
            this.loadRecords();
        }
    }

    get totalPages(): number[] {
        return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
    }
    getStartRecord(): number {
        return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
    }

    getEndRecord(): number {
        return Math.min(this.pageNumber * this.pageSize, this.totalItems);
    }


    hasFilter(column: string): boolean {
        return this.filters?.some(f => f.column === column) ?? false;
    }
    getColumnType(columnKey: string): string | undefined {
        const column = this.columns.find(col => col.key === columnKey);
        return column ? column.type : undefined;
    }

    openQtyPopup(row: any) {
        const inventoryId = row.id || row.ID;

        this.selectedInventory = {
            id: inventoryId,
            itemCode: row.itemCode || row.ItemCode,
            itemName: row.itemName || row.ItemName,
            quantity: row.quantity || row.Quantity
        };
        this.qtyForm.reset();
        this.quantityLogs = [];
        this.showQtyPopup = true;

        this.loadQuantityLogs(this.selectedInventory.id);
    }

    closeQtyPopup() {
        this.showQtyPopup = false;
        this.selectedInventory = null;
        this.qtyForm.reset();
        this.quantityLogs = [];
    }

    addQuantity() {
        if (this.qtyForm.invalid) {
            this.qtyForm.markAllAsTouched();
            return;
        }

        const payload = {
            inventoryId: this.selectedInventory?.id || this.selectedInventory?.ID,
            addedQuantity: this.qtyForm.value.addedQuantity
        };

        this.service.addQuantity(payload).subscribe({
            next: (res: any) => {
                this.toastService.show('Quantity added successfully', 'success');
                this.closeQtyPopup();
                this.loadRecords();
            },
            error: (error: any) => {
                console.error('Error adding quantity:', error);
                this.toastService.show('Failed to add quantity', 'error');
            }
        })
    }
    loadQuantityLogs(inventoryId: number) {
        this.service.getQuantityLogs(inventoryId).subscribe({
            next: (res: any) => {
                this.quantityLogs = res || [];
            },
            error: () => {
                this.toastService.show('Failed to load quantity logs', 'error');
            }
        });
    }

    onDelete(id: number) {
        if (id <= 0) return;
        const confirmed = window.confirm('Are you sure you want to delete this inventory Management?');
        if (confirmed) {
            this.service.delete(id).subscribe({
                next: (response) => {
                    this.loadRecords();
                    this.toastService.show(response.message, 'success');
                },
                error: (error) => {
                    this.toastService.show(error.message, 'error');
                }
            });
        }
    }

}
