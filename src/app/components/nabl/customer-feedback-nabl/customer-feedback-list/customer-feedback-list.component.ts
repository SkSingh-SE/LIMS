import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerFeedbackService } from '../../../../services/customer-feedback.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
@Component({
    selector: 'app-customer-feedback-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './customer-feedback-list.component.html',
    styleUrl: './customer-feedback-list.component.css'
})
export class CustomerFeedbackListComponent implements OnInit {
    title = 'F-47: Customer Feedback Form';
    addButtonLabel = 'New Feedback';
    addRoute = '/customer-feedback/create';
    baseRoute = '/customer-feedback';

    columns: RegisterColumn[] = [
        { key: 'companyName', type: 'string', label: 'Company Name', filter: true },
        { key: 'contactPerson', type: 'string', label: 'Contact Person', filter: true },
        { key: 'email', label: 'Email', type: 'string', filter: true },
        { key: 'mobileNo', label: 'Mobile No', type: 'string', filter: true },
        { key: 'feedbackDate', label: 'feedback Date', type: 'date', width: '120px', filter: true },
        { key: 'reportedBy', label: 'Reported By', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: CustomerFeedbackService,
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

    fetchData(params: any) {
        this.service.getAll(params).subscribe({
            next: (resp) => {
                this.data.set(resp.items || []);
                this.totalItems.set(resp.totalRecords || 0);
            },
            error: (err) => {
                console.error('Error fetching customer feedback:', err);
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
