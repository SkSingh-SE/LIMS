import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonConformingWorkService } from '../../../../services/non-conforming-work.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-non-conforming-work-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './non-conforming-work-list.component.html',
    styleUrl: './non-conforming-work-list.component.css'
})
export class NonConformingWorkListComponent implements OnInit {
    title = 'F-41: Non-Conforming Work Records';
    addRoute = '/non-conforming-work/create';
    printList = '/non-conforming-work/previewlist';
    baseRoute = '/non-conforming-work';

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'ncDate', label: 'Non-Conformance Date', type: 'date', width: '150px', filter: true },
        { key: 'ncDescription', label: 'NC Detail', type: 'string', filter: true },
        { key: 'closerDate', label: 'Closer Date', type: 'date', width: '130px', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: NonConformingWorkService, private toastService: ToastService) { }

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

    fetchData(params: any) {
        this.service.getAll(params).subscribe({
            next: (resp) => {
                this.data.set(resp.items || []);
                this.totalItems.set(resp.totalRecords || 0);
            },
            error: (err) => {
                console.error('Error fetching NC records:', err);
            }
        });
    }
    deleteRecord(id: number) {
        if (confirm('Are you sure you want to delete this record?')) {
            this.service.delete(id).subscribe({
                next: (res) => {
                    this.toastService.show('Record deleted successfully', 'success');
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
                    this.toastService.show(err.message || 'Error deleting record', 'error');
                }
            });
        }
    }
    onPageChange(params: any) {
        this.fetchData(params);
    }
}
