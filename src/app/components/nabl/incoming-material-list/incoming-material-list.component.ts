import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { IncomingMaterialService } from '../../../services/incoming-material.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-incoming-material-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './incoming-material-list.component.html'
})
export class IncomingMaterialListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Record Number', filter: true },
        { key: 'materialName', type: 'string', label: 'Material Name', filter: true },
        { key: 'batchNo', type: 'string', label: 'Batch No', filter: true },
        { key: 'supplierName', type: 'string', label: 'Supplier', filter: true },
        { key: 'quantityReceived', type: 'number', label: 'Qty Recd', filter: true },
        { key: 'inspectionStatus', type: 'string', label: 'Outcome', filter: true }
    ];

    records: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(private service: IncomingMaterialService) { }

    ngOnInit() {
        this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'asc',
            filter: []
        });
    }

    fetchData(payload: any) {
        this.isLoading.set(true);
        this.service.getAll(payload).subscribe({
            next: (response) => {
                this.records = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: (error: any) => {
                console.error('Error fetching incoming material records:', error);
                this.records = [];
                this.totalItems = 0;
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
}
