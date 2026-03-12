import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

interface PerformanceRecord {
    id: number;
    reviewPeriod: string;
    technicalRating: number;
    behavioralRating: number;
    overallRating: number;
    reviewerName: string;
    reviewDate: string;
    status: string;
    remarks?: string;
}

@Component({
    selector: 'app-employee-performance-record',

    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './employee-performance-record.component.html',
    styleUrl: './employee-performance-record.component.css'
})
export class EmployeePerformanceRecordComponent implements OnInit {
    @Input() employeeId!: number;
    @Input() isViewMode: boolean = false;
    @ViewChild('filterModal') filterModal!: ElementRef;

    isLoading = signal<boolean>(false);
    showPerformanceModal = signal<boolean>(false);
    performanceForm!: FormGroup;

    // Pagination
    currentPage = 1;
    pageSize = 10;
    totalRecords = 0;
    pageSizes = [5, 10, 20];

    // Search and Filter
    searchTerm: string = '';
    sortByColumn: string = 'id';
    sortOrder: string = 'asc';
    filters: { column: string; type: string; value: any; value2?: any }[] = [];
    filterColumn: string = '';
    filterColumnTitle: string = '';
    filterType: string = 'Contains';
    filterValue: string = '';
    filterValue2: string = '';
    isFilterOpen = false;

    // Column definitions
    columns = [
        { key: 'id', type: 'number', label: 'SN', filter: false },
        { key: 'reviewPeriod', type: 'string', label: 'Review Period', filter: true },
        { key: 'technicalRating', type: 'number', label: 'Technical Rating', filter: true },
        { key: 'behavioralRating', type: 'number', label: 'Behavioral Rating', filter: true },
        { key: 'overallRating', type: 'number', label: 'Overall Rating', filter: true },
        { key: 'reviewerName', type: 'string', label: 'Reviewer', filter: true },
        { key: 'reviewDate', type: 'date', label: 'Review Date', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
        reviewPeriod: 'string',
        technicalRating: 'number',
        behavioralRating: 'number',
        overallRating: 'number',
        reviewerName: 'string',
        reviewDate: 'date',
        status: 'string'
    };

    // Summary Data (Mock - calculated from records)
    summaryData = {
        avgTechnicalRating: 4.2,
        avgBehavioralRating: 4.5,
        overallScore: 4.35,
        lastReviewDate: '2024-12-15'
    };

    // Mock Performance Data
    performanceRecords: PerformanceRecord[] = [
        {
            id: 1,
            reviewPeriod: 'Q4 2024',
            technicalRating: 4,
            behavioralRating: 5,
            overallRating: 4.5,
            reviewerName: 'Dr. Sharma (Manager)',
            reviewDate: '2024-12-15',
            status: 'Finalized',
            remarks: 'Excellent performance, shows initiative'
        },
        {
            id: 2,
            reviewPeriod: 'Q3 2024',
            technicalRating: 4,
            behavioralRating: 4,
            overallRating: 4.0,
            reviewerName: 'Dr. Sharma (Manager)',
            reviewDate: '2024-09-20',
            status: 'Finalized',
            remarks: 'Good progress in analytical skills'
        },
        {
            id: 3,
            reviewPeriod: 'H1 2024',
            technicalRating: 5,
            behavioralRating: 5,
            overallRating: 5.0,
            reviewerName: 'Mr. Kumar (Supervisor)',
            reviewDate: '2024-06-30',
            status: 'Finalized',
            remarks: 'Outstanding performance across all parameters'
        },
        {
            id: 4,
            reviewPeriod: 'Q4 2023',
            technicalRating: 4,
            behavioralRating: 4,
            overallRating: 4.0,
            reviewerName: 'Dr. Patel (Manager)',
            reviewDate: '2023-12-28',
            status: 'Finalized',
            remarks: 'Consistent performer, good team player'
        },
        {
            id: 5,
            reviewPeriod: 'Annual 2023',
            technicalRating: 4,
            behavioralRating: 5,
            overallRating: 4.5,
            reviewerName: 'Dr. Patel (Manager)',
            reviewDate: '2023-12-31',
            status: 'Finalized',
            remarks: 'Strong year-end performance'
        }
    ];

    paginatedRecords: PerformanceRecord[] = [];
    filteredRecords: PerformanceRecord[] = [];

    constructor(private fb: FormBuilder) { }

    ngOnInit(): void {
        this.initForm();
        this.filteredRecords = [...this.performanceRecords];
        this.totalRecords = this.filteredRecords.length;
        this.applyFiltersAndSort();
    }

    initForm() {
        this.performanceForm = this.fb.group({
            id: [0],
            reviewPeriod: ['', Validators.required],
            technicalRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
            behavioralRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
            overallRating: [{ value: 0, disabled: true }],
            reviewerName: ['', Validators.required],
            reviewDate: ['', Validators.required],
            remarks: ['']
        });

        // Auto-calculate overall rating
        this.performanceForm.get('technicalRating')?.valueChanges.subscribe(() => this.calculateOverallRating());
        this.performanceForm.get('behavioralRating')?.valueChanges.subscribe(() => this.calculateOverallRating());

        if (this.isViewMode) {
            this.performanceForm.disable();
        }
    }

    calculateOverallRating() {
        const technical = this.performanceForm.get('technicalRating')?.value || 0;
        const behavioral = this.performanceForm.get('behavioralRating')?.value || 0;
        const overall = ((technical + behavioral) / 2).toFixed(1);
        this.performanceForm.get('overallRating')?.setValue(parseFloat(overall));
    }

    // Search functionality
    onSearch() {
        this.applyFiltersAndSort();
    }

    // Sorting functionality
    applySorting(column: string) {
        if (this.sortByColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortByColumn = column;
            this.sortOrder = 'asc';
        }
        this.applyFiltersAndSort();
    }

    // Filter functionality
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

    hasFilter(column: string): boolean {
        return this.filters?.some(f => f.column === column) ?? false;
    }

    getColumnType(columnKey: string): string | undefined {
        const column = this.columns.find(col => col.key === columnKey);
        return column ? column.type : undefined;
    }

    // Apply all filters, search, and sorting
    applyFiltersAndSort() {
        let result = [...this.performanceRecords];

        // Apply search
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            result = result.filter(record =>
                record.reviewPeriod.toLowerCase().includes(term) ||
                record.reviewerName.toLowerCase().includes(term) ||
                record.status.toLowerCase().includes(term) ||
                record.technicalRating.toString().includes(term) ||
                record.behavioralRating.toString().includes(term)
            );
        }

        // Apply filters
        this.filters.forEach(filter => {
            result = result.filter(record => {
                const value = (record as any)[filter.column];
                const filterVal = filter.value;

                switch (filter.type) {
                    case 'Contains':
                        return value?.toString().toLowerCase().includes(filterVal.toLowerCase());
                    case 'Equal':
                        return value?.toString() === filterVal.toString();
                    case 'NotEqual':
                        return value?.toString() !== filterVal.toString();
                    case 'GreaterThan':
                        return value > filterVal;
                    case 'LessThan':
                        return value < filterVal;
                    case 'Between':
                        return value >= filter.value && value <= filter.value2;
                    default:
                        return true;
                }
            });
        });

        // Apply sorting
        if (this.sortByColumn) {
            result.sort((a, b) => {
                const aVal = (a as any)[this.sortByColumn];
                const bVal = (b as any)[this.sortByColumn];

                if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }

        this.filteredRecords = result;
        this.totalRecords = result.length;
        this.currentPage = 1;
        this.updatePagination();
    }

    updatePagination() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.paginatedRecords = this.filteredRecords.slice(startIndex, endIndex);
    }

    get totalPages(): number {
        return Math.ceil(this.totalRecords / this.pageSize);
    }

    getPaginationArray(): number[] {
        return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagination();
        }
    }

    changePageSize() {
        this.currentPage = 1;
        this.updatePagination();
    }

    openAddPerformanceModal() {
        if (this.isViewMode) return;
        this.performanceForm.reset({
            id: 0,
            technicalRating: 0,
            behavioralRating: 0,
            overallRating: 0
        });
        this.performanceForm.enable();
        this.performanceForm.get('overallRating')?.disable();
        this.showPerformanceModal.set(true);
    }

    viewPerformance(record: PerformanceRecord) {
        this.performanceForm.patchValue(record);
        this.performanceForm.disable();
        this.showPerformanceModal.set(true);
    }

    closeModal() {
        this.showPerformanceModal.set(false);
        this.performanceForm.reset();
        if (!this.isViewMode) {
            this.performanceForm.enable();
            this.performanceForm.get('overallRating')?.disable();
        }
    }

    savePerformance() {
        if (this.performanceForm.invalid) {
            this.performanceForm.markAllAsTouched();
            return;
        }

        console.log('Performance saved:', this.performanceForm.getRawValue());
        this.closeModal();
    }

    getStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'finalized':
                return 'badge bg-success';
            case 'draft':
                return 'badge bg-warning text-dark';
            default:
                return 'badge bg-secondary';
        }
    }

    getRatingClass(rating: number): string {
        if (rating >= 4.5) return 'text-success fw-bold';
        if (rating >= 3.5) return 'text-primary fw-bold';
        if (rating >= 2.5) return 'text-warning fw-bold';
        return 'text-danger fw-bold';
    }

    getStarArray(rating: number): boolean[] {
        return Array(5).fill(false).map((_, i) => i < Math.round(rating));
    }
}
