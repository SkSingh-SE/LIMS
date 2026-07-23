import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedbackAnalysisService } from '../../../../services/feedback-analysis.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
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
        { key: 'analysisNo', type: 'string', label: 'Analysis No', filter: true },
        { key: 'analysisDate', type: 'date', label: 'Analysis Date', filter: true },
        { key: 'customerName', label: 'Customer Name', type: 'string', filter: true },
        { key: 'averageRating', label: 'Average Rating', type: 'string', filter: true },
        { key: 'overallGrade', label: 'Overall Grade', type: 'number' }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: FeedbackAnalysisService,
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
                console.error('Error fetching feedback analysis:', err);
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
