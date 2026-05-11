import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TruncatePipe } from '../../../utility/pipe/truncate.pipe';
import { NablWorkflowService } from '../../../services/nabl-workflow.service';
import { NablRevisionDialogComponent, RevisionDialogResult } from '../nabl-revision-dialog/nabl-revision-dialog.component';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';

export interface RegisterColumn {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'bool';
    width?: string;
    filter?: boolean;
}

@Component({
    selector: 'app-nabl-register-table',

    imports: [ CommonModule, FormsModule, RouterModule, TruncatePipe, NablRevisionDialogComponent, PaginationComponent ],
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

    // --- Workflow Inputs ---
    @Input() showWorkflowActions: boolean = false;
    @Input() formType: string = '';

    // --- Event Outputs ---
    @Output() onEdit = new EventEmitter<number>();
    @Output() onDelete = new EventEmitter<number>();
    @Output() onView = new EventEmitter<number>();
    @Output() onPreview = new EventEmitter<number>();
    @Output() onPageChange = new EventEmitter<any>();
    @Output() onRevise = new EventEmitter<{ id: number; newId: number }>();

    // --- Pagination State ---
    pageNumber = 1;
    pageSize = 10;
    pageSizes = [10, 25, 50, 100, 200, 500];
    sortByColumn: string = '';
    sortOrder: string = 'desc';
    searchTerm: string = '';

    // --- Filter State ---
    filters: { column: string; type: string; value: any; value2?: any }[] = [];
    filterColumn: string = '';
    filterColumnTitle: string = '';
    filterType: string = 'Contains';
    filterValue: string = '';
    filterValue2: string = '';
    isFilterOpen = false;

    // --- Revision Dialog State ---
    showRevisionDialog = false;
    revisionTargetId: number = 0;

    constructor(
        private workflowService: NablWorkflowService,
        private toastService: ToastService
    ) {}

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
            case 'bool': this.filterType = 'Equal'; break;
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

    // --- Workflow Actions ---

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'Draft': return 'bg-secondary';
            case 'Submitted': return 'bg-info';
            case 'Reviewed': return 'bg-warning text-dark';
            case 'Approved': return 'bg-success';
            case 'Rejected': return 'bg-danger';
            default: return 'bg-dark';
        }
    }

    canEdit(row: any): boolean {
        if (!this.showWorkflowActions) return true;
        return row.status === 'Draft' || row.status === 'Rejected';
    }

    canDelete(row: any): boolean {
        if (!this.showWorkflowActions) return true;
        return row.status === 'Draft';
    }

    doSubmit(row: any): void {
        if (!confirm('Submit this document for review?')) return;
        this.workflowService.submit(this.formType, row.id).subscribe({
            next: (res) => {
                this.toastService.show(res.message || 'Submitted successfully', 'success');
                this.emitPageChange();
            },
            error: (err) => this.toastService.show(err.error?.message || 'Submit failed', 'error')
        });
    }

    doReview(row: any): void {
        if (!confirm('Mark this document as reviewed?')) return;
        this.workflowService.review(this.formType, row.id).subscribe({
            next: (res) => {
                this.toastService.show(res.message || 'Reviewed successfully', 'success');
                this.emitPageChange();
            },
            error: (err) => this.toastService.show(err.error?.message || 'Review failed', 'error')
        });
    }

    doApprove(row: any): void {
        if (!confirm('Approve this document? This will lock it from further editing.')) return;
        this.workflowService.approve(this.formType, row.id).subscribe({
            next: (res) => {
                this.toastService.show(res.message || 'Approved successfully', 'success');
                this.emitPageChange();
            },
            error: (err) => this.toastService.show(err.error?.message || 'Approval failed', 'error')
        });
    }

    doReject(row: any): void {
        const remarks = prompt('Enter rejection remarks:');
        if (remarks === null) return;
        this.workflowService.reject(this.formType, row.id, remarks).subscribe({
            next: (res) => {
                this.toastService.show(res.message || 'Rejected', 'success');
                this.emitPageChange();
            },
            error: (err) => this.toastService.show(err.error?.message || 'Reject failed', 'error')
        });
    }

    openReviseDialog(row: any): void {
        this.revisionTargetId = row.id;
        this.showRevisionDialog = true;
    }

    onRevisionConfirm(result: RevisionDialogResult): void {
        this.showRevisionDialog = false;
        this.workflowService.revise(this.formType, this.revisionTargetId, result.revisionType, result.reason).subscribe({
            next: (res) => {
                this.toastService.show(res.message || 'Revision created', 'success');
                this.onRevise.emit({ id: this.revisionTargetId, newId: res.id });
                this.emitPageChange();
            },
            error: (err) => this.toastService.show(err.error?.message || 'Revision failed', 'error')
        });
    }

    onRevisionCancel(): void {
        this.showRevisionDialog = false;
    }
}
