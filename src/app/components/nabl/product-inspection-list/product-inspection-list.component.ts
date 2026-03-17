import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ProductInspectionService } from '../../../services/product-inspection.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-product-inspection-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './product-inspection-list.component.html'
})
export class ProductInspectionListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Plan Number', filter: true },
        { key: 'productName', type: 'string', label: 'Product / Service Name', filter: true },
        { key: 'productCode', type: 'string', label: 'Code', filter: true },
        { key: 'category', type: 'string', label: 'Category', filter: true },
        { key: 'inspectionStage', type: 'string', label: 'Stage', filter: true },
        { key: 'status', type: 'string', label: 'Status', filter: true }
    ];

    plans: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(private service: ProductInspectionService) { }

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
        this.isLoading.set(true);
        this.service.getAll(payload).subscribe({
            next: (response) => {
                this.plans = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: (error: any) => {
                console.error('Error fetching inspection plans:', error);
                this.plans = [];
                this.totalItems = 0;
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }
}
