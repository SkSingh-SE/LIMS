import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplaintService } from '../../../../services/complaint.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-complaint-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './complaint-list.component.html',
    styleUrl: './complaint-list.component.css'
})
export class ComplaintListComponent implements OnInit {
    title = 'F-40: Complaint Register';
    addRoute = '/complaint-register/create';
    baseRoute = '/complaint-register';
    printList = '/complaint-register/previewlist';

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'monthYear', label: 'Month & Year', type: 'date', width: '120px', filter: false },
        { key: 'complaintNo', label: 'Complaint No.', type: 'string', width: '120px', filter: true },
        { key: 'complaintDate', label: 'Complaint Date', type: 'date', width: '120px', filter: true },
        { key: 'complainantName', label: 'Complainant', type: 'string', filter: true },
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: ComplaintService, private toastService: ToastService) { }

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
                console.error('Error fetching complaints:', err);
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
