import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RiskAssessmentService } from '../../../../services/risk-assessment.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-risk-assessment-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './risk-assessment-list.component.html',
    styleUrl: './risk-assessment-list.component.css'
})
export class RiskAssessmentListComponent implements OnInit {
    title = 'F-46: Risk & Opportunity Assessment';
    addButtonLabel = 'New Assessment';
    addRoute = '/risk-assessment/create';
    baseRoute = '/risk-assessment';

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'date', label: 'Date', type: 'date', width: '120px', filter: true },
        { key: 'activityProcess', label: 'Activity/Process', type: 'string', filter: true },
        { key: 'responsibility', label: 'Responsibility', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: RiskAssessmentService) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData(params: any = {}) {
        this.service.getAll().subscribe({
            next: (resp) => {
                this.data.set(resp.items || []);
                this.totalItems.set(resp.totalRecords || 0);
            },
            error: (err) => {
                console.error('Error fetching risk assessments:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
