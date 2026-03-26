import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeCompetenceService } from '../../../services/employee-competence.service';
import { EmployeeCompetenceReport } from '../../../models/employeeCompetenceModel';
import { ToastService } from '../../../services/toast.service';

@Component({
    selector: 'app-employee-competence-list',

    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './employee-competence-list.component.html',
    styleUrl: './employee-competence-list.component.css'
})
export class EmployeeCompetenceListComponent implements OnInit {
    records: EmployeeCompetenceReport[] = [];
    totalItems = 0;
    searchTerm = '';
    pageNumber = 1;
    pageSize = 10;
    pageSizes = [5, 10, 25, 50, 100];
    totalPages: number[] = [];
    sortByColumn = '';
    sortOrder = 'asc';
    filters: any[] = [];

    // Filter modal properties
    @ViewChild('filterModal') filterModal!: ElementRef;
    filterColumn: string = '';
    filterColumnTitle: string = '';
    filterType: string = 'Contains';
    filterValue: string = '';
    filterValue2: string = '';
    filterColumnTypes: { [key: string]: string } = {
        'id': 'number',
        'employeeName': 'string',
        'designationName': 'string',
        'evaluationDate': 'date',
        'overallRating': 'number',
        'evaluationDoneBy': 'string'
    };

    columns = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'id', label: 'ID', type: 'number', width: '60px' },
        { key: 'employeeName', label: 'Employee Name', type: 'string', filter: true },
        { key: 'designationName', label: 'Designation', type: 'string' },
        { key: 'evaluationDate', label: 'Evaluation Date', type: 'date', filter: true },
        { key: 'overallRating', label: 'Overall Rating', type: 'number' },
        { key: 'evaluationDoneBy', label: 'Evaluated By', type: 'string' }
    ];

    payload: any = {
        PageNumber: 1,
        PageSize: 10,
        searchTerm: '',
        sortByColumn: '',
        sortOrder: 'desc',
        filter: []
    };

    constructor(
        private competenceService: EmployeeCompetenceService,
        private router: Router,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.fetchData();
    }

    // Search functionality
    onSearch() {
        this.payload.searchTerm = this.searchTerm;
        this.payload.PageNumber = 1;
        this.pageNumber = 1;
        this.fetchData();
    }

    // Sorting functionality
    applySorting(columnKey: string) {
        if (this.sortByColumn === columnKey) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortByColumn = columnKey;
            this.sortOrder = 'asc';
        }
        this.payload.sortByColumn = this.sortByColumn;
        this.payload.sortOrder = this.sortOrder;
        this.fetchData();
    }

    // Filter functionality
    hasFilter(columnKey: string): boolean {
        return this.filters.some(filter => filter.column === columnKey);
    }

    openFilterModal(columnKey: string, event: MouseEvent) {
        this.filterColumn = columnKey;
        this.filterColumnTitle = this.columns.find(col => col.key === columnKey)?.label || columnKey;
        this.filterType = 'Contains';
        this.filterValue = '';
        this.filterValue2 = '';

        const modal = this.filterModal.nativeElement as HTMLElement;
        modal.style.display = 'block';
        modal.style.left = `${event.clientX}px`;
        modal.style.top = `${event.clientY}px`;
    }

    closeFilterModal() {
        const modal = this.filterModal.nativeElement as HTMLElement;
        modal.style.display = 'none';
    }

    applyFilter() {
        if (this.filterValue) {
            const existingFilterIndex = this.filters.findIndex(filter => filter.column === this.filterColumn);

            const filterData = {
                column: this.filterColumn,
                type: this.filterType,
                value: this.filterValue,
                value2: this.filterValue2
            };

            if (existingFilterIndex >= 0) {
                this.filters[existingFilterIndex] = filterData;
            } else {
                this.filters.push(filterData);
            }

            this.payload.filter = this.filters;
            this.payload.PageNumber = 1;
            this.pageNumber = 1;
            this.fetchData();
            this.closeFilterModal();
        }
    }

    resetFilter(columnKey: string) {
        this.filters = this.filters.filter(filter => filter.column !== columnKey);
        this.payload.filter = this.filters;
        this.fetchData();
    }

    // Pagination functionality
    changePageSize(event: any) {
        this.pageSize = parseInt(event.target.value);
        this.payload.PageSize = this.pageSize;
        this.payload.PageNumber = 1;
        this.pageNumber = 1;
        this.fetchData();
    }

    onPageChange(page: number) {
        if (page < 1 || page > this.totalPages.length) return;

        this.pageNumber = page;
        this.payload.PageNumber = page;
        this.fetchData();
    }

    // Calculate total pages
    calculateTotalPages() {
        const totalPagesCount = Math.ceil(this.totalItems / this.pageSize);
        this.totalPages = Array.from({ length: totalPagesCount }, (_, i) => i + 1);
    }

    fetchData() {
        this.competenceService.getAll(this.payload).subscribe({
            next: (res) => {
                this.records = res.items || [];
                this.totalItems = res.totalRecords || 0;
                this.payload.PageNumber = res.pageNumber || 1;
                this.payload.PageSize = res.pageSize || 10;
                this.pageNumber = res.pageNumber || 1;
                this.pageSize = res.pageSize || 10;
                this.calculateTotalPages();
            },
            error: (err) => {
                console.error('Error fetching records:', err);
                this.toastService.show('Error loading competence records', 'error');
                this.records = [];
            }
        });
    }


    onEdit(id: number) {
        this.router.navigate(['/employee/competence/edit', id]);
    }

    onView(id: number) {
        this.router.navigate(['/employee/competence/details', id]);
    }

    onPreview(id: number) {
        this.router.navigate(['/employee/competence/preview', id]);
    }

    onDelete(id: number) {
        if (confirm('Are you sure you want to delete this competence report?')) {
            this.competenceService.delete(id).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.toastService.show('Report deleted successfully', 'success');
                        this.fetchData();
                    } else {
                        this.toastService.show(res.message || 'Error deleting report', 'error');
                    }
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.show('Error deleting report', 'error');
                }
            });
        }
    }

    getStartRecord(): number {
        return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
    }

    getEndRecord(): number {
        return Math.min(this.pageNumber * this.pageSize, this.totalItems);
    }
}
