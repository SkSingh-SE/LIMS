import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RiskAssessmentService } from '../../../../services/risk-assessment.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';

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
        { key: 'riskNo', type: 'string', label: 'Risk No', filter: true },
        { key: 'riskDate', label: 'Risk Date', type: 'date', width: '120px', filter: true },
        { key: 'type', type: 'string', label: 'Risk Type', filter: true },
        { key: 'riskLevel', label: 'Risk Level', type: 'string', filter: true },
        { key: 'identifiedByName', label: 'Identified By', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: RiskAssessmentService, private toastService: ToastService) { }

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

    fetchData(params: any = {}) {
        this.service.getAll(params).subscribe({
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
}

