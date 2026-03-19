import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IntermediateCheckService } from '../../../services/intermediate-check.service';
import { IntermediateCheckRecord } from '../../../models/intermediateCheckModel';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-intermediate-check-list',

    imports: [CommonModule, RouterModule, NablRegisterTableComponent],
    templateUrl: './intermediate-check-list.component.html'
})
export class IntermediateCheckListComponent implements OnInit {
    items: IntermediateCheckRecord[] = [];
    totalItems = 0;
    searchTerm = '';

    columns: RegisterColumn[] = [
        { key: 'formatNo', label: 'Format No', type: 'string' },
        { key: 'equipmentName', label: 'Equipment Name', type: 'string' },
        { key: 'equipmentNo', label: 'Equipment No', type: 'string' },
        { key: 'checkMonth', label: 'Month', type: 'number' },
        { key: 'checkYear', label: 'Year', type: 'number' },
        { key: 'issueDate', label: 'Issue Date', type: 'date' },
        { key: 'revNo', label: 'Rev No', type: 'string' }
    ];

    constructor(
        private service: IntermediateCheckService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadRecords();
    }

    loadRecords(params: any = {}): void {
        const queryParams = {
            searchTerm: this.searchTerm,
            ...params
        };
        this.service.getAll(queryParams).subscribe({
            next: (res) => {
                this.items = res.items || [];
                this.totalItems = res.totalRecords || 0;
            },
            error: () => {
                this.items = [];
                this.totalItems = 0;
            }
        });
    }

    onPageChange(params: any): void {
        this.searchTerm = params.searchTerm || '';
        this.loadRecords(params);
    }

    onDelete(id: number): void {
        if (confirm('Are you sure you want to delete this record?')) {
            this.service.delete(id).subscribe(() => {
                this.loadRecords({ PageNumber: 1, PageSize: 10 });
            });
        }
    }
}
