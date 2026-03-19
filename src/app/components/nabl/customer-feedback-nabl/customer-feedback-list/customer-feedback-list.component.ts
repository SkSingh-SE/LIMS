import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerFeedbackService } from '../../../../services/customer-feedback.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

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
        { key: 'date', label: 'Date', type: 'date', width: '120px', filter: true },
        { key: 'customerName', label: 'Customer Name', type: 'string', filter: true },
        { key: 'contactPerson', label: 'Contact Person', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: CustomerFeedbackService) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData(params: any = {}) {
        this.service.getAll().subscribe({
            next: (resp) => {
                this.data.set(resp);
                this.totalItems.set(resp.length);
            },
            error: (err) => {
                console.error('Error fetching customer feedback:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
