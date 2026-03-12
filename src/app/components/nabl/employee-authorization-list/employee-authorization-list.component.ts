import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployeeAuthorizationService } from '../../../services/employee-authorization.service';
import { ToastService } from '../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-employee-authorization-list',

    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './employee-authorization-list.component.html',
    styleUrl: './employee-authorization-list.component.css'
})
export class EmployeeAuthorizationListComponent implements OnInit {

    columns: RegisterColumn[] = [
        { key: 'department', label: 'Department', type: 'string', filter: true },
        { key: 'personnelName', label: 'Personnel Name', type: 'string', filter: true },
        { key: 'uid', label: 'UID', type: 'string', filter: true },
        { key: 'equipment', label: 'Equipment', type: 'string', filter: true },
        { key: 'testMethodAuthorization', label: 'Test Method', type: 'string', filter: true },
        { key: 'testAuthorization', label: 'Test Authorization', type: 'string', filter: true }
    ];

    records: any[] = [];
    totalItems = 0;
    isLoading = signal(false);

    constructor(
        private authService: EmployeeAuthorizationService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'asc',
            filter: []
        });
    }

    fetchData(payload: any) {
        this.isLoading.set(true);
        this.authService.getAll(payload).subscribe({
            next: (res) => {
                this.records = res.items || [];
                this.totalItems = res.totalRecords || 0;
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error fetching authorizations:', err);
                this.toastService.show('Error loading authorizations', 'error');
                this.records = [];
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(payload: any) {
        this.fetchData(payload);
    }

    onDelete(id: number) {
        if (confirm('Are you sure you want to delete this authorization?')) {
            this.authService.delete(id).subscribe({
                next: (res) => {
                    this.toastService.show('Authorization deleted successfully', 'success');
                    this.fetchData({
                        PageNumber: 1,
                        PageSize: 10,
                        searchTerm: '',
                        sortByColumn: 'id',
                        sortOrder: 'asc',
                        filter: []
                    });
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.show('Error deleting authorization', 'error');
                }
            });
        }
    }
}
