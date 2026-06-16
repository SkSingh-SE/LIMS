import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { IncomingMaterialService } from '../../../services/incoming-material.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../services/toast.service';
@Component({
    selector: 'app-incoming-material-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './incoming-material-list.component.html'
})
export class IncomingMaterialListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Record Number', filter: true },
        { key: 'purchaseOrderNo', type: 'string', label: 'Purchase Order No', filter: true },
        { key: 'indentNoPoNo', type: 'string', label: 'Indent No', filter: true },
        { key: 'supplierName', type: 'string', label: 'Supplier', filter: true },
        { key: 'inspectionBy', type: 'number', label: 'Inspected By', filter: true },
        { key: 'receivedBy', type: 'number', label: 'Verified By', filter: true },
        { key: 'inspectionResult', type: 'string', label: 'Outcome', filter: true }
    ];

    records: any[] = [];
    totalItems = 0;

    constructor(private service: IncomingMaterialService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'desc',
            filter: []
        });
    }

    fetchData(payload: any) {
        this.service.getAll(payload).subscribe({
            next: (response) => {
                this.records = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
            },
            error: (error: any) => {
                console.error('Error fetching incoming material records:', error);
                this.records = [];
                this.totalItems = 0;
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
        deleteIncomingMaterial(id: number) {
        const confirm = window.confirm('Are you sure you want to delete this competence requirement?');
        if (confirm) {
            this.service.delete(id).subscribe({
                next: (response) => {
                    this.toastService.show(response.message, 'success');
                    this.fetchData({
                        PageNumber: 1,
                        PageSize: 10,
                        searchTerm: '',
                        sortByColumn: 'id',
                        sortOrder: 'desc',
                        filter: []
                    });
                },
                error: (err) => {
                    this.toastService.show(err.message, 'error');
                },
            });
        }
    }
}
