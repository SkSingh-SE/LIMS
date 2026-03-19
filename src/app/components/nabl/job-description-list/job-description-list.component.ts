import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { JobDescriptionService } from '../../../services/job-description.service';
import { ToastService } from '../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-job-description-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './job-description-list.component.html',
    styleUrl: './job-description-list.component.css'
})
export class JobDescriptionListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'designationName', type: 'string', label: 'Designation', filter: true },
        { key: 'departmentName', type: 'string', label: 'Department', filter: true },
        { key: 'reportingTo', type: 'string', label: 'Reporting To', filter: true },
        { key: 'createdOn', type: 'date', label: 'Created At', filter: true }
    ];

    jobDescriptions: any[] = [];
    totalItems = 0;

    constructor(
        private jobDescriptionService: JobDescriptionService,
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

    fetchData(payload: any) {
        this.jobDescriptionService.getAll(payload).subscribe({
            next: (response) => {
                this.jobDescriptions = response?.items || [];
                this.totalItems = response?.totalRecords || 0;
            },
            error: (error) => {
                console.error('Error fetching job descriptions:', error);
                this.jobDescriptions = [];
                this.totalItems = 0;
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }

    deleteJobDescription(id: number) {
        const confirmed = window.confirm('Are you sure you want to delete this job description?');
        if (confirmed) {
            this.jobDescriptionService.delete(id).subscribe({
                next: (response) => {
                    this.toastService.show(response.message, 'success');
                    this.fetchData({
                        PageNumber: 1,
                        PageSize: 10,
                        searchTerm: '',
                        sortByColumn: 'id',
                        sortOrder: 'desc',
                        filter: []
                    });
                },
                error: (error) => {
                    this.toastService.show(error.message, 'error');
                }
            });
        }
    }
}
