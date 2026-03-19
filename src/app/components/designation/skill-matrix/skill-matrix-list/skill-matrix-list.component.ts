import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SkillMatrix } from '../../../../models/skillMatrixModel';
import { SkillMatrixService } from '../../../../services/skill-matrix.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-skill-matrix-list',

    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './skill-matrix-list.component.html',
    styleUrl: './skill-matrix-list.component.css'
})
export class SkillMatrixListComponent implements OnInit {
    @ViewChild('filterModal') filterModal!: ElementRef;

    columns = [
        { key: 'id', type: 'number', label: 'SN', filter: false },
        { key: 'designationName', type: 'string', label: 'Designation', filter: true },
        { key: 'formatNo', type: 'string', label: 'Form Number', filter: true },
        { key: 'issueNo', type: 'string', label: 'Issue No', filter: true },
        { key: 'date', type: 'date', label: 'Date', filter: true },
        { key: 'decision', type: 'string', label: 'Decision', filter: true }
    ];

    filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
        id: 'number',
        designationName: 'string',
        formatNo: 'string',
        issueNo: 'string',
        decision: 'string',
        date: 'date'
    };

    filters: { column: string; type: string; value: any; value2?: any }[] = [];
    filterColumn: string = 'string';
    filterColumnTitle: string = 'string';
    filterType: string = 'Contains';
    filterValue: string = '';
    filterValue2: string = '';
    isFilterOpen = false;

    matrices: SkillMatrix[] = [];
    filteredList: SkillMatrix[] = [];

    pageNumber = 1;
    pageSize = 10;
    totalItems = 0;
    pageSizes = [5, 10, 20];

    sortByColumn: string = 'id';
    sortOrder: string = 'desc';
    searchTerm: string = '';

    constructor(
        private skillMatrixService: SkillMatrixService,
        private toastService: ToastService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadList();
    }

    loadList() {
        this.skillMatrixService.getAll().subscribe(
            res => {
                this.matrices = res.items || [];
                this.totalItems = this.matrices.length;
                this.applyFiltersAndSort();
            },
            error => {
                console.error('Error loading skill matrices:', error);
                this.matrices = [];
            }
        );
    }

    applyFiltersAndSort() {
        let filtered = [...this.matrices];

        // Apply search
        if (this.searchTerm) {
            filtered = filtered.filter(m =>
                m.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                m.designationName?.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        }

        // Apply filters
        this.filters.forEach(filter => {
            filtered = filtered.filter(m => this.applyColumnFilter(m, filter));
        });

        // Apply sorting
        filtered.sort((a, b) => {
            const aVal = (a as any)[this.sortByColumn];
            const bVal = (b as any)[this.sortByColumn];
            const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });

        this.filteredList = filtered;
    }

    applyColumnFilter(matrix: SkillMatrix, filter: any): boolean {
        const value = (matrix as any)[filter.column];
        switch (filter.type) {
            case 'Contains':
                return value?.toString().toLowerCase().includes(filter.value.toLowerCase());
            case 'Equal':
                return value == filter.value;
            case 'Between':
                return value >= filter.value && value <= filter.value2;
            default:
                return true;
        }
    }

    applySorting(column: string) {
        if (this.sortByColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortByColumn = column;
            this.sortOrder = 'asc';
        }
        this.applyFiltersAndSort();
    }

    openFilterModal(column: string, event: MouseEvent) {
        this.filterColumn = column;
        this.columns.forEach(col => {
            if (col.key === column) {
                this.filterColumnTitle = col.label;
            }
        });
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

        this.applyFiltersAndSort();
        this.closeFilterModal();
    }

    resetFilter(column: string) {
        this.filters = this.filters.filter(filter => filter.column !== column);
        this.applyFiltersAndSort();
    }

    closeFilterModal() {
        if (this.filterModal) {
            this.filterModal.nativeElement.style.display = 'none';
        }
    }

    onPageChange(page: number) {
        this.pageNumber = page;
    }

    changePageSize(event: Event) {
        this.pageSize = Number((event.target as HTMLSelectElement).value);
        this.pageNumber = 1;
    }

    onSearch() {
        this.pageNumber = 1;
        this.applyFiltersAndSort();
    }

    get totalPages(): number[] {
        return Array.from({ length: Math.ceil(this.filteredList.length / this.pageSize) }, (_, i) => i + 1);
    }
  getStartRecord(): number {
    return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }


    get paginatedList(): SkillMatrix[] {
        const start = (this.pageNumber - 1) * this.pageSize;
        return this.filteredList.slice(start, start + this.pageSize);
    }

    hasFilter(column: string): boolean {
        return this.filters?.some(f => f.column === column) ?? false;
    }

    createNew() {
        this.router.navigate(['/skill-matrix/create']);
    }

    edit(id: number) {
        this.router.navigate(['/skill-matrix/edit', id], { state: { mode: 'edit' } });
    }

    preview(id: number) {
        this.router.navigate(['/skill-matrix/preview', id]);
    }

    deleteMatrix(id: number) {
        const confirmed = window.confirm('Are you sure you want to delete this skill matrix?');
        if (confirmed) {
            this.skillMatrixService.delete(id).subscribe({
                next: (response) => {
                    this.loadList();
                    this.toastService.show('Skill matrix deleted successfully', 'success');
                },
                error: (error: any) => {
                    this.toastService.show('Error deleting skill matrix', 'error');
                }
            });
        }
    }
}
