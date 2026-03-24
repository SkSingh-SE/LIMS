import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InductionTrainingService } from '../../../services/induction-training.service';
import { TrainingPlanService } from '../../../services/training-plan.service';

@Component({
    selector: 'app-employee-job-training',

    imports: [CommonModule, FormsModule],
    templateUrl: './employee-job-training.component.html',
    styleUrl: './employee-job-training.component.css',
})
export class EmployeeJobTrainingComponent implements OnInit, OnChanges {
    @Input() employeeId!: number;
    @Input() isViewMode: boolean = false;
    @ViewChild('filterModal') filterModal!: ElementRef;

    // Active section tab
    activeSection: 'induction' | 'trainingPlan' = 'induction';

    // Loading states
    loadingInduction = false;
    loadingTrainingPlan = false;

    // ---- Induction Training (F-6) ----
    inductionRecords: any[] = [];
    inductionPageNumber = 1;
    inductionPageSize = 10;
    inductionTotalItems = 0;

    // ---- Training Plan (F-8) ----
    trainingPlanRecords: any[] = [];
    trainingPlanPageNumber = 1;
    trainingPlanPageSize = 10;
    trainingPlanTotalItems = 0;

    // Shared pagination options
    pageSizes = [5, 10, 20];

    // Search and Filter (shared for active section)
    searchTerm: string = '';
    sortByColumn: string = 'id';
    sortOrder: string = 'desc';
    filters: { column: string; type: string; value: any; value2?: any }[] = [];
    filterColumn: string = '';
    filterColumnTitle: string = '';
    filterType: string = 'Contains';
    filterValue: string = '';
    filterValue2: string = '';

    // Induction Training Columns
    inductionColumns = [
        { key: 'formCode', type: 'string', label: 'Form No', filter: true },
        { key: 'trainerName', type: 'string', label: 'Trainer', filter: true },
        { key: 'trainerDesignation', type: 'string', label: 'Trainer Designation', filter: true },
        { key: 'trainingDate', type: 'date', label: 'Training Date', filter: true },
        { key: 'parameter', type: 'string', label: 'Parameter', filter: true },
        { key: 'testMethodSop', type: 'string', label: 'Test Method/SOP', filter: true },
        { key: 'evaluationMode', type: 'string', label: 'Evaluation Mode', filter: true },
        { key: 'remarks', type: 'string', label: 'Remarks', filter: true },
    ];

    inductionFilterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
        formCode: 'string',
        trainerName: 'string',
        trainerDesignation: 'string',
        trainingDate: 'date',
        parameter: 'string',
        testMethodSop: 'string',
        evaluationMode: 'string',
        remarks: 'string',
    };

    // Training Plan Columns
    trainingPlanColumns = [
        { key: 'formCode', type: 'string', label: 'Form No', filter: true },
        { key: 'trainingTopic', type: 'string', label: 'Training Topic', filter: true },
        { key: 'trainingType', type: 'string', label: 'Type', filter: true },
        { key: 'trainerName', type: 'string', label: 'Trainer', filter: true },
        { key: 'plannedDate', type: 'date', label: 'Planned Date', filter: true },
        { key: 'actualDate', type: 'date', label: 'Actual Date', filter: true },
        { key: 'duration', type: 'string', label: 'Duration', filter: true },
        { key: 'trainingStatus', type: 'string', label: 'Status', filter: true },
    ];

    trainingPlanFilterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
        formCode: 'string',
        trainingTopic: 'string',
        trainingType: 'string',
        trainerName: 'string',
        plannedDate: 'date',
        actualDate: 'date',
        duration: 'string',
        trainingStatus: 'string',
    };

    // Summary
    summaryData = {
        totalInduction: 0,
        totalTrainingPlan: 0,
        completedTrainings: 0,
        plannedTrainings: 0,
    };

    constructor(
        private inductionTrainingService: InductionTrainingService,
        private trainingPlanService: TrainingPlanService
    ) {}

    ngOnInit(): void {
        if (this.employeeId) {
            this.fetchInductionData();
            this.fetchTrainingPlanData();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['employeeId'] && !changes['employeeId'].firstChange && this.employeeId) {
            this.fetchInductionData();
            this.fetchTrainingPlanData();
        }
    }

    switchSection(section: 'induction' | 'trainingPlan'): void {
        this.activeSection = section;
        this.searchTerm = '';
        this.filters = [];
        this.sortByColumn = 'id';
        this.sortOrder = 'desc';
    }

    // ---- Induction Training Data ----
    fetchInductionData(): void {
        this.loadingInduction = true;
        const payload = {
            PageNumber: this.inductionPageNumber,
            PageSize: this.inductionPageSize,
            searchTerm: this.activeSection === 'induction' ? this.searchTerm : '',
            sortByColumn: this.activeSection === 'induction' ? this.sortByColumn : 'id',
            sortOrder: this.activeSection === 'induction' ? this.sortOrder : 'desc',
            filter: [
                ...(this.activeSection === 'induction' ? this.filters : []),
                { column: 'employeeId', type: 'Equal', value: this.employeeId?.toString() || '0' },
            ],
        };

        this.inductionTrainingService.getAll(payload).subscribe({
            next: (response) => {
                this.inductionRecords = response?.items || [];
                this.inductionTotalItems = response?.totalRecords || 0;
                this.inductionPageSize = response?.pageSize || this.inductionPageSize;
                this.inductionPageNumber = response?.pageNumber || this.inductionPageNumber;
                this.summaryData.totalInduction = this.inductionTotalItems;
                this.loadingInduction = false;
            },
            error: (error) => {
                console.error('Error fetching induction training records:', error);
                this.inductionRecords = [];
                this.inductionTotalItems = 0;
                this.loadingInduction = false;
            },
        });
    }

    // ---- Training Plan Data ----
    fetchTrainingPlanData(): void {
        this.loadingTrainingPlan = true;
        const payload = {
            PageNumber: this.trainingPlanPageNumber,
            PageSize: this.trainingPlanPageSize,
            searchTerm: this.activeSection === 'trainingPlan' ? this.searchTerm : '',
            sortByColumn: this.activeSection === 'trainingPlan' ? this.sortByColumn : 'id',
            sortOrder: this.activeSection === 'trainingPlan' ? this.sortOrder : 'desc',
            filter: [
                ...(this.activeSection === 'trainingPlan' ? this.filters : []),
                { column: 'employeeId', type: 'Equal', value: this.employeeId?.toString() || '0' },
            ],
        };

        this.trainingPlanService.getAll(payload).subscribe({
            next: (response) => {
                this.trainingPlanRecords = response?.items || [];
                this.trainingPlanTotalItems = response?.totalRecords || 0;
                this.trainingPlanPageSize = response?.pageSize || this.trainingPlanPageSize;
                this.trainingPlanPageNumber = response?.pageNumber || this.trainingPlanPageNumber;
                this.summaryData.totalTrainingPlan = this.trainingPlanTotalItems;
                this.summaryData.completedTrainings = this.trainingPlanRecords.filter(
                    (r: any) => (r.trainingStatus || '').toLowerCase() === 'completed'
                ).length;
                this.summaryData.plannedTrainings = this.trainingPlanRecords.filter(
                    (r: any) => (r.trainingStatus || '').toLowerCase() === 'planned'
                ).length;
                this.loadingTrainingPlan = false;
            },
            error: (error) => {
                console.error('Error fetching training plan records:', error);
                this.trainingPlanRecords = [];
                this.trainingPlanTotalItems = 0;
                this.loadingTrainingPlan = false;
            },
        });
    }

    // ---- Search ----
    onSearch(): void {
        if (this.activeSection === 'induction') {
            this.inductionPageNumber = 1;
            this.fetchInductionData();
        } else {
            this.trainingPlanPageNumber = 1;
            this.fetchTrainingPlanData();
        }
    }

    // ---- Sorting ----
    applySorting(column: string): void {
        if (this.sortByColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortByColumn = column;
            this.sortOrder = 'asc';
        }
        if (this.activeSection === 'induction') {
            this.fetchInductionData();
        } else {
            this.fetchTrainingPlanData();
        }
    }

    // ---- Filters ----
    get activeColumns() {
        return this.activeSection === 'induction' ? this.inductionColumns : this.trainingPlanColumns;
    }

    get activeFilterColumnTypes() {
        return this.activeSection === 'induction' ? this.inductionFilterColumnTypes : this.trainingPlanFilterColumnTypes;
    }

    openFilterModal(column: string, event: MouseEvent): void {
        this.filterColumn = column;
        this.activeColumns.forEach((col) => {
            if (col.key === column) {
                this.filterColumnTitle = col.label;
            }
        });
        this.filterValue = '';
        this.filterValue2 = '';

        const columnType = this.activeFilterColumnTypes[column];
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

        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();

        if (this.filterModal) {
            const modal = this.filterModal.nativeElement;
            modal.style.display = 'block';
            modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
            modal.style.left = `${rect.left + window.scrollX}px`;
        }
    }

    applyFilter(): void {
        if (!this.filterColumn || this.filterValue === '') return;

        const existingFilterIndex = this.filters.findIndex((f) => f.column === this.filterColumn);
        const filterData = {
            column: this.filterColumn,
            type: this.filterType,
            value: this.filterValue,
            value2: this.filterValue2,
        };

        if (existingFilterIndex > -1) {
            this.filters[existingFilterIndex] = filterData;
        } else {
            this.filters.push(filterData);
        }

        if (this.activeSection === 'induction') {
            this.inductionPageNumber = 1;
            this.fetchInductionData();
        } else {
            this.trainingPlanPageNumber = 1;
            this.fetchTrainingPlanData();
        }
        this.closeFilterModal();
    }

    resetFilter(column: string): void {
        this.filters = this.filters.filter((filter) => filter.column !== column);
        if (this.activeSection === 'induction') {
            this.fetchInductionData();
        } else {
            this.fetchTrainingPlanData();
        }
    }

    closeFilterModal(): void {
        if (this.filterModal) {
            this.filterModal.nativeElement.style.display = 'none';
        }
    }

    hasFilter(column: string): boolean {
        return this.filters?.some((f) => f.column === column) ?? false;
    }

    getColumnType(columnKey: string): string | undefined {
        const column = this.activeColumns.find((col) => col.key === columnKey);
        return column ? column.type : undefined;
    }

    // ---- Pagination: Induction ----
    get inductionTotalPagesCount(): number {
        return Math.ceil(this.inductionTotalItems / this.inductionPageSize);
    }

    get inductionTotalPages(): number[] {
        return Array.from({ length: this.inductionTotalPagesCount }, (_, i) => i + 1);
    }

    getInductionStartRecord(): number {
        return this.inductionTotalItems === 0 ? 0 : (this.inductionPageNumber - 1) * this.inductionPageSize + 1;
    }

    getInductionEndRecord(): number {
        return Math.min(this.inductionPageNumber * this.inductionPageSize, this.inductionTotalItems);
    }

    onInductionPageChange(page: number): void {
        if (page >= 1 && page <= this.inductionTotalPagesCount) {
            this.inductionPageNumber = page;
            this.fetchInductionData();
        }
    }

    changeInductionPageSize(event: Event): void {
        this.inductionPageSize = Number((event.target as HTMLSelectElement).value);
        this.inductionPageNumber = 1;
        this.fetchInductionData();
    }

    // ---- Pagination: Training Plan ----
    get trainingPlanTotalPagesCount(): number {
        return Math.ceil(this.trainingPlanTotalItems / this.trainingPlanPageSize);
    }

    get trainingPlanTotalPages(): number[] {
        return Array.from({ length: this.trainingPlanTotalPagesCount }, (_, i) => i + 1);
    }

    getTrainingPlanStartRecord(): number {
        return this.trainingPlanTotalItems === 0 ? 0 : (this.trainingPlanPageNumber - 1) * this.trainingPlanPageSize + 1;
    }

    getTrainingPlanEndRecord(): number {
        return Math.min(this.trainingPlanPageNumber * this.trainingPlanPageSize, this.trainingPlanTotalItems);
    }

    onTrainingPlanPageChange(page: number): void {
        if (page >= 1 && page <= this.trainingPlanTotalPagesCount) {
            this.trainingPlanPageNumber = page;
            this.fetchTrainingPlanData();
        }
    }

    changeTrainingPlanPageSize(event: Event): void {
        this.trainingPlanPageSize = Number((event.target as HTMLSelectElement).value);
        this.trainingPlanPageNumber = 1;
        this.fetchTrainingPlanData();
    }

    // ---- Status Helpers ----
    getTrainingStatusClass(status: string): string {
        switch ((status || '').toLowerCase()) {
            case 'completed':
                return 'badge bg-success';
            case 'planned':
                return 'badge bg-info';
            case 'cancelled':
                return 'badge bg-danger';
            case 'in progress':
                return 'badge bg-warning text-dark';
            default:
                return 'badge bg-secondary';
        }
    }

    getEvaluationModeClass(mode: string): string {
        switch ((mode || '').toLowerCase()) {
            case 'retesting':
                return 'badge bg-primary';
            case 'replicate testing':
                return 'badge bg-info';
            default:
                return 'badge bg-secondary';
        }
    }

    getTrainingTypeClass(type: string): string {
        switch ((type || '').toLowerCase()) {
            case 'internal':
                return 'badge bg-primary';
            case 'external':
                return 'badge bg-warning text-dark';
            default:
                return 'badge bg-secondary';
        }
    }
}
