import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TruncatePipe } from '../../../utility/pipe/truncate.pipe';

export interface RegisterColumn {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date';
    width?: string;
    filter?: boolean;
}

@Component({
    selector: 'app-nabl-register-table',

    imports: [CommonModule, FormsModule, RouterModule,TruncatePipe],
    templateUrl: './nabl-register-table.component.html',
    styleUrl: './nabl-register-table.component.css'
})
export class NablRegisterTableComponent {
    @ViewChild('filterModal') filterModal!: ElementRef;
    Math = Math;

    // --- Card Header Inputs ---
    @Input() title: string = '';
    @Input() addButtonLabel: string = 'Add New';
    @Input() addRoute: string = '';
    @Input() showCardWrapper: boolean = true;

    // --- Table Data Inputs ---
    @Input() columns: RegisterColumn[] = [];
    @Input() data: any[] = [];
    @Input() totalItems: number = 0;
    @Input() isLoading: boolean = false;
    @Input() showSerialNumber: boolean = true;

    // --- Action Inputs ---
    @Input() showActions: boolean = true;
    @Input() showPagination: boolean = true;
    @Input() baseRoute: string = '';  // e.g. '/responsibility-authority'

    // --- Event Outputs ---
    @Output() onEdit = new EventEmitter<number>();
    @Output() onDelete = new EventEmitter<number>();
    @Output() onView = new EventEmitter<number>();
    @Output() onPreview = new EventEmitter<number>();
    @Output() onPageChange = new EventEmitter<any>();

    // --- Pagination State ---
    pageNumber = 1;
    pageSize = 10;
    pageSizes = [5, 10, 20];
    sortByColumn: string = '';
    sortOrder: string = 'asc';
    searchTerm: string = '';

    // --- Filter State ---
    filters: { column: string; type: string; value: any; value2?: any }[] = [];
    filterColumn: string = '';
    filterColumnTitle: string = '';
    filterType: string = 'Contains';
    filterValue: string = '';
    filterValue2: string = '';
    isFilterOpen = false;

    // --- Serial Number helper ---
    getSerialNumber(index: number): number {
        return (this.pageNumber - 1) * this.pageSize + index + 1;
    }

    applySorting(column: string) {
        if (this.sortByColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortByColumn = column;
            this.sortOrder = 'asc';
        }
        this.emitPageChange();
    }

    openFilterModal(column: string, event: MouseEvent) {
        const col = this.columns.find(c => c.key === column);
        if (!col) return;
        this.filterColumn = column;
        this.filterColumnTitle = col.label;
        this.filterValue = '';
        this.filterValue2 = '';

        switch (col.type) {
            case 'string': this.filterType = 'Contains'; break;
            case 'number': this.filterType = 'Equal'; break;
            case 'date': this.filterType = 'Between'; break;
            default: this.filterType = 'Contains';
        }

        this.isFilterOpen = true;
        const target = event.target as HTMLElement;
        if (this.filterModal) {
            const modal = this.filterModal.nativeElement;
            modal.style.display = 'block';

            const wrapper = target.closest('.register-table-wrapper');
            if (wrapper) {
                const targetRect = target.getBoundingClientRect();
                const wrapperRect = wrapper.getBoundingClientRect();
                modal.style.top = `${targetRect.bottom - wrapperRect.top + 5}px`;
                let leftPos = targetRect.left - wrapperRect.left;
                if (leftPos + 220 > wrapperRect.width) {
                    leftPos = wrapperRect.width - 220;
                }
                modal.style.left = `${Math.max(0, leftPos)}px`;
            } else {
                const rect = target.getBoundingClientRect();
                modal.style.top = `${rect.bottom + window.scrollY}px`;
                modal.style.left = `${rect.left + window.scrollX}px`;
            }
        }
    }

    applyFilter() {
        if (!this.filterColumn || this.filterValue === '') return;
        const existingIdx = this.filters.findIndex(f => f.column === this.filterColumn);
        const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };
        if (existingIdx > -1) {
            this.filters[existingIdx] = filterData;
        } else {
            this.filters.push(filterData);
        }
        this.emitPageChange();
        this.closeFilterModal();
    }

    resetFilter(column: string) {
        this.filters = this.filters.filter(f => f.column !== column);
        this.emitPageChange();
    }

    closeFilterModal() {
        if (this.filterModal) {
            this.filterModal.nativeElement.style.display = 'none';
        }
    }

    changePage(page: number) {
        if (page < 1 || page > this.totalPages.length) return;
        this.pageNumber = page;
        this.emitPageChange();
    }

    changePageSize(event: Event) {
        this.pageSize = Number((event.target as HTMLSelectElement).value);
        this.pageNumber = 1;
        this.emitPageChange();
    }

    onSearch() {
        this.pageNumber = 1;
        this.emitPageChange();
    }

    get totalPages(): number[] {
        return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
    }

    hasFilter(column: string): boolean {
        return this.filters?.some(f => f.column === column) ?? false;
    }

    getColumnType(columnKey: string): string | undefined {
        return this.columns.find(col => col.key === columnKey)?.type;
    }

    private emitPageChange() {
        this.onPageChange.emit({
            PageNumber: this.pageNumber,
            PageSize: this.pageSize,
            searchTerm: this.searchTerm,
            sortByColumn: this.sortByColumn,
            sortOrder: this.sortOrder,
            filter: this.filters
        });
    }
}
