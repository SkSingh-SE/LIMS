import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

interface TrainingRecord {
    id: number;
    trainingType: string;
    testMethod: string;
    trainerName: string;
    trainingDate: string;
    validTill: string;
    evaluationResult: string;
    status: string;
    remarks?: string;
}

@Component({
    selector: 'app-employee-job-training',

    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './employee-job-training.component.html',
    styleUrl: './employee-job-training.component.css'
})
export class EmployeeJobTrainingComponent implements OnInit {
    @Input() employeeId!: number;
    @Input() isViewMode: boolean = false;
    @ViewChild('filterModal') filterModal!: ElementRef;

    isLoading = signal<boolean>(false);
    showTrainingModal = signal<boolean>(false);
    trainingForm!: FormGroup;

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
        { key: 'trainingType', type: 'string', label: 'Training Type', filter: true },
        { key: 'testMethod', type: 'string', label: 'Test Method / Equipment', filter: true },
        { key: 'trainerName', type: 'string', label: 'Trainer Name', filter: true },
        { key: 'trainingDate', type: 'date', label: 'Training Date', filter: true },
        { key: 'validTill', type: 'date', label: 'Valid Till', filter: true },
        { key: 'evaluationResult', type: 'string', label: 'Evaluation', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
        trainingType: 'string',
        testMethod: 'string',
        trainerName: 'string',
        trainingDate: 'date',
        validTill: 'date',
        evaluationResult: 'string',
        status: 'string'
    };

    // Summary Data (Mock)
    summaryData = {
        totalTrainings: 12,
        activeTrainings: 8,
        expiredTrainings: 2,
        upcomingExpiry: 2
    };

    // Mock Training Data
    trainingRecords: TrainingRecord[] = [
        {
            id: 1,
            trainingType: 'Initial',
            testMethod: 'HPLC Operation',
            trainerName: 'Dr. Sharma',
            trainingDate: '2024-01-15',
            validTill: '2025-01-15',
            evaluationResult: 'Pass',
            status: 'Active',
            remarks: 'Excellent performance'
        },
        {
            id: 2,
            trainingType: 'Refresher',
            testMethod: 'GC-MS Analysis',
            trainerName: 'Mr. Kumar',
            trainingDate: '2024-03-20',
            validTill: '2025-03-20',
            evaluationResult: 'Pass',
            status: 'Active',
            remarks: ''
        },
        {
            id: 3,
            trainingType: 'Initial',
            testMethod: 'UV-Vis Spectroscopy',
            trainerName: 'Dr. Patel',
            trainingDate: '2023-06-10',
            validTill: '2024-06-10',
            evaluationResult: 'Pass',
            status: 'Expired',
            remarks: 'Needs refresher training'
        },
        {
            id: 4,
            trainingType: 'Refresher',
            testMethod: 'Karl Fischer Titration',
            trainerName: 'Ms. Reddy',
            trainingDate: '2024-02-28',
            validTill: '2026-02-15',
            evaluationResult: 'Conditional',
            status: 'Active',
            remarks: 'Requires supervision for complex samples'
        },
        {
            id: 5,
            trainingType: 'Initial',
            testMethod: 'pH Meter Calibration',
            trainerName: 'Mr. Singh',
            trainingDate: '2024-04-05',
            validTill: '2025-04-05',
            evaluationResult: 'Pass',
            status: 'Active',
            remarks: ''
        }
    ];

    paginatedRecords: TrainingRecord[] = [];
    filteredRecords: TrainingRecord[] = [];

    constructor(private fb: FormBuilder) { }

    ngOnInit(): void {
        this.initForm();
        this.filteredRecords = [...this.trainingRecords];
        this.totalRecords = this.filteredRecords.length;
        this.applyFiltersAndSort();
    }

    initForm() {
        this.trainingForm = this.fb.group({
            id: [0],
            trainingType: ['', Validators.required],
            testMethod: ['', Validators.required],
            trainerName: ['', Validators.required],
            trainingDate: ['', Validators.required],
            validTill: ['', Validators.required],
            evaluationResult: ['', Validators.required],
            remarks: ['']
        });

        if (this.isViewMode) {
            this.trainingForm.disable();
        }
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
        let result = [...this.trainingRecords];

        // Apply search
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            result = result.filter(record =>
                record.trainingType.toLowerCase().includes(term) ||
                record.testMethod.toLowerCase().includes(term) ||
                record.trainerName.toLowerCase().includes(term) ||
                record.evaluationResult.toLowerCase().includes(term) ||
                record.status.toLowerCase().includes(term)
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

    openAddTrainingModal() {
        if (this.isViewMode) return;
        this.trainingForm.reset({ id: 0 });
        this.showTrainingModal.set(true);
    }

    viewTraining(record: TrainingRecord) {
        this.trainingForm.patchValue(record);
        this.trainingForm.disable();
        this.showTrainingModal.set(true);
    }

    closeModal() {
        this.showTrainingModal.set(false);
        this.trainingForm.reset();
        if (!this.isViewMode) {
            this.trainingForm.enable();
        }
    }

    saveTraining() {
        if (this.trainingForm.invalid) {
            this.trainingForm.markAllAsTouched();
            return;
        }

        console.log('Training saved:', this.trainingForm.value);
        this.closeModal();
    }

    getStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'active':
                return 'badge bg-success';
            case 'expired':
                return 'badge bg-danger';
            default:
                return 'badge bg-secondary';
        }
    }

    getEvaluationClass(result: string): string {
        switch (result.toLowerCase()) {
            case 'pass':
                return 'badge bg-success';
            case 'fail':
                return 'badge bg-danger';
            case 'conditional':
                return 'badge bg-warning text-dark';
            default:
                return 'badge bg-secondary';
        }
    }
}
