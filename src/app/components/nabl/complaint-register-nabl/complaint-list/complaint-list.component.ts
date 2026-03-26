import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplaintService } from '../../../../services/complaint.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

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

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'monthYear', label: 'Month & Year', type: 'string', width: '120px', filter: true },
        { key: 'complaintNo', label: 'Complaint No.', type: 'string', width: '120px', filter: true },
        { key: 'dateOfComplaint', label: 'Date', type: 'date', width: '120px', filter: true },
        { key: 'complainantName', label: 'Complainant', type: 'string', filter: true },
        { key: 'referenceNoDate', label: 'Reference', type: 'string', width: '150px' }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: ComplaintService) { }

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
                console.error('Error fetching complaints:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
