import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnInit, signal, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeePerformanceService } from '../../../services/employee-performance.service';
import { ToastService } from '../../../services/toast.service';

@Component({
    selector: 'app-employee-performance-record',
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './employee-performance-record.component.html',
    styleUrl: './employee-performance-record.component.css',
})
export class EmployeePerformanceRecordComponent implements OnInit, OnChanges {
    @Input() employeeId!: number;
    @Input() employeeName: string = '';
    @Input() designationName: string = '';
    @Input() isViewMode: boolean = false;
    @ViewChild('filterModal') filterModal!: ElementRef;

    showPerformanceModal = signal<boolean>(false);
    performanceForm!: FormGroup;
    editingId: number = 0;

    // Pagination
    pageNumber = 1;
    pageSize = 10;
    totalItems = 0;
    pageSizes = [5, 10, 20];

    // Search and Filter
    searchTerm: string = '';
    sortByColumn: string = 'id';
    sortOrder: string = 'desc';
    filters: { column: string; type: string; value: any; value2?: any }[] = [];
    filterColumn: string = '';
    filterColumnTitle: string = '';
    filterType: string = 'Contains';
    filterValue: string = '';
    filterValue2: string = '';
    isFilterOpen = false;

    // Column definitions
    columns = [
        { key: 'reviewPeriod', type: 'string', label: 'Review Period', filter: true },
        { key: 'technicalRating', type: 'number', label: 'Technical Rating', filter: true },
        { key: 'behavioralRating', type: 'number', label: 'Behavioral Rating', filter: true },
        { key: 'overallRating', type: 'number', label: 'Overall Rating', filter: true },
        { key: 'reviewerName', type: 'string', label: 'Reviewer', filter: true },
        { key: 'reviewDate', type: 'date', label: 'Review Date', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true },
    ];

    filterColumnTypes: Record<string, 'string' | 'number' | 'date'> = {
        reviewPeriod: 'string',
        technicalRating: 'number',
        behavioralRating: 'number',
        overallRating: 'number',
        reviewerName: 'string',
        reviewDate: 'date',
        status: 'string',
    };

    // Summary Data
    summaryData = {
        avgTechnicalRating: 0,
        avgBehavioralRating: 0,
        overallScore: 0,
        lastReviewDate: '',
    };

    performanceRecords: any[] = [];

    payload = {
        PageNumber: this.pageNumber,
        PageSize: this.pageSize,
        searchTerm: this.searchTerm,
        sortByColumn: this.sortByColumn,
        sortOrder: this.sortOrder,
        filter: this.filters ?? null,
    };

    constructor(
        private fb: FormBuilder,
        private performanceService: EmployeePerformanceService,
        private toastService: ToastService
    ) {}

    ngOnInit(): void {
        this.initForm();
        if (this.employeeId) {
            this.fetchData();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['employeeId'] && !changes['employeeId'].firstChange && this.employeeId) {
            this.fetchData();
        }
    }

    initForm() {
        this.performanceForm = this.fb.group({
            id: [0],
            employeeId: [this.employeeId],
            employeeName: [this.employeeName],
            designationName: [this.designationName],
            reviewPeriod: ['', Validators.required],
            technicalRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
            behavioralRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
            overallRating: [{ value: 0, disabled: true }],
            reviewerName: ['', Validators.required],
            reviewDate: ['', Validators.required],
            remarks: [''],
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

    fetchData(): void {
        this.payload.PageNumber = this.pageNumber;
        this.payload.PageSize = this.pageSize;
        this.payload.searchTerm = this.searchTerm;
        this.payload.sortByColumn = this.sortByColumn;
        this.payload.sortOrder = this.sortOrder;
        this.payload.filter = [
            ...(this.filters ?? []),
            { column: 'employeeId', type: 'Equal', value: this.employeeId?.toString() || '0' },
        ];

        this.performanceService.getAll(this.payload).subscribe({
            next: (response) => {
                this.performanceRecords = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
                this.pageSize = response?.pageSize || this.pageSize;
                this.pageNumber = response?.pageNumber || this.pageNumber;
                this.calculateSummary();
            },
            error: (error) => {
                console.error('Error fetching performance records:', error);
                this.performanceRecords = [];
            },
        });
    }

    calculateSummary(): void {
        if (this.performanceRecords.length === 0) {
            this.summaryData = { avgTechnicalRating: 0, avgBehavioralRating: 0, overallScore: 0, lastReviewDate: '' };
            return;
        }
        const records = this.performanceRecords;
        const avgTech = records.reduce((sum: number, r: any) => sum + (r.technicalRating || 0), 0) / records.length;
        const avgBeh = records.reduce((sum: number, r: any) => sum + (r.behavioralRating || 0), 0) / records.length;
        this.summaryData = {
            avgTechnicalRating: parseFloat(avgTech.toFixed(1)),
            avgBehavioralRating: parseFloat(avgBeh.toFixed(1)),
            overallScore: parseFloat(((avgTech + avgBeh) / 2).toFixed(2)),
            lastReviewDate: records[0]?.reviewDate || '',
        };
    }

    // Search
    onSearch() {
        this.pageNumber = 1;
        this.fetchData();
    }

    // Sorting
    applySorting(column: string) {
        if (this.sortByColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortByColumn = column;
            this.sortOrder = 'asc';
        }
        this.fetchData();
    }

    // Filter
    openFilterModal(column: string, event: MouseEvent) {
        this.filterColumn = column;
        this.columns.forEach((col) => {
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

        this.pageNumber = 1;
        this.fetchData();
        this.closeFilterModal();
    }

    resetFilter(column: string) {
        this.filters = this.filters.filter((filter) => filter.column !== column);
        this.fetchData();
    }

    closeFilterModal() {
        if (this.filterModal) {
            this.filterModal.nativeElement.style.display = 'none';
        }
    }

    hasFilter(column: string): boolean {
        return this.filters?.some((f) => f.column === column) ?? false;
    }

    getColumnType(columnKey: string): string | undefined {
        const column = this.columns.find((col) => col.key === columnKey);
        return column ? column.type : undefined;
    }

    // Pagination
    onPageChange(page: number) {
        if (page >= 1 && page <= this.totalPagesCount) {
            this.pageNumber = page;
            this.fetchData();
        }
    }

    changePageSize(event: Event) {
        this.pageSize = Number((event.target as HTMLSelectElement).value);
        this.pageNumber = 1;
        this.fetchData();
    }

    get totalPagesCount(): number {
        return Math.ceil(this.totalItems / this.pageSize);
    }

    get totalPages(): number[] {
        return Array.from({ length: this.totalPagesCount }, (_, i) => i + 1);
    }

    getStartRecord(): number {
        return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
    }

    getEndRecord(): number {
        return Math.min(this.pageNumber * this.pageSize, this.totalItems);
    }

    // Modal operations
    openAddPerformanceModal() {
        if (this.isViewMode) return;
        this.editingId = 0;
        this.performanceForm.reset({
            id: 0,
            employeeId: this.employeeId,
            employeeName: this.employeeName,
            designationName: this.designationName,
            technicalRating: 0,
            behavioralRating: 0,
            overallRating: 0,
        });
        this.performanceForm.enable();
        this.performanceForm.get('overallRating')?.disable();
        this.showPerformanceModal.set(true);
    }

    viewPerformance(record: any) {
        this.editingId = record.id;
        this.performanceForm.patchValue({
            ...record,
            reviewDate: record.reviewDate ? record.reviewDate.substring(0, 10) : '',
        });
        this.performanceForm.disable();
        this.showPerformanceModal.set(true);
    }

    editPerformance(record: any) {
        if (this.isViewMode) return;
        this.editingId = record.id;
        this.performanceForm.patchValue({
            ...record,
            reviewDate: record.reviewDate ? record.reviewDate.substring(0, 10) : '',
        });
        this.performanceForm.enable();
        this.performanceForm.get('overallRating')?.disable();
        this.showPerformanceModal.set(true);
    }

    closeModal() {
        this.showPerformanceModal.set(false);
        this.performanceForm.reset();
        this.editingId = 0;
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

        const formData = this.performanceForm.getRawValue();
        formData.employeeId = this.employeeId;
        formData.employeeName = this.employeeName;
        formData.designationName = this.designationName;
        formData.id = this.editingId;

        this.performanceService.save(formData).subscribe({
            next: () => {
                this.toastService.show(
                    this.editingId ? 'Performance record updated' : 'Performance record created',
                    'success'
                );
                this.closeModal();
                this.fetchData();
            },
            error: (err) => {
                console.error('Error saving performance record:', err);
                this.toastService.show('Error saving performance record', 'error');
            },
        });
    }

    deletePerformance(id: number) {
        if (this.isViewMode) return;
        if (!confirm('Are you sure you want to delete this performance record?')) return;

        this.performanceService.delete(id).subscribe({
            next: () => {
                this.toastService.show('Performance record deleted', 'success');
                this.fetchData();
            },
            error: (err) => {
                console.error('Error deleting performance record:', err);
                this.toastService.show('Error deleting performance record', 'error');
            },
        });
    }

    getStatusClass(status: string): string {
        switch ((status || '').toLowerCase()) {
            case 'approved':
                return 'badge bg-success';
            case 'draft':
                return 'badge bg-warning text-dark';
            case 'submitted':
                return 'badge bg-info';
            case 'reviewed':
                return 'badge bg-primary';
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
        return Array(5)
            .fill(false)
            .map((_, i) => i < Math.round(rating));
    }
}
