import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedbackAnalysisService } from '../../../../services/feedback-analysis.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-feedback-analysis-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './feedback-analysis-list.component.html',
    styleUrl: './feedback-analysis-list.component.css'
})
export class FeedbackAnalysisListComponent implements OnInit {
    title = 'F-48: Customer Feedback Analysis';
    addButtonLabel = 'New Analysis';
    addRoute = '/feedback-analysis/create';
    baseRoute = '/feedback-analysis';

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'period', label: 'Period', type: 'string', filter: true },
        { key: 'totalFeedbackReceived', label: 'Total Feedback Received', type: 'number', width: '200px' }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: FeedbackAnalysisService) { }

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
                console.error('Error fetching feedback analysis:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
