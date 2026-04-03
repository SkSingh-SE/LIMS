import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnvironmentMonitoringService } from '../../services/environment-monitoring.service';
import { ToastService } from '../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl/nabl-register-table/nabl-register-table.component';

@Component({
  selector: 'app-environment-monitoring-list',

  imports: [CommonModule, NablRegisterTableComponent],
  templateUrl: './environment-monitoring-list.component.html',
  styleUrl: './environment-monitoring-list.component.css'
})
export class EnvironmentMonitoringListComponent implements OnInit {

  columns: RegisterColumn[] = [
    { key: 'documentNo', label: 'Document No', type: 'string', filter: true },
    { key: 'monitoringDate', label: 'Date', type: 'date', filter: true },
    { key: 'departmentName', label: 'Department', type: 'string', filter: true },
    { key: 'temperature', label: 'Temp (°C)', type: 'number', filter: false },
    { key: 'humidity', label: 'Humidity (%)', type: 'number', filter: false },
    { key: 'isWithinLimits', label: 'Within Limits', type: 'string', filter: true },
    { key: 'status', label: 'Status', type: 'string', filter: true }
  ];

  records: any[] = [];
  totalItems = 0;

  constructor(
    private environmentService: EnvironmentMonitoringService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.fetchData({
      PageNumber: 1,
      PageSize: 10,
      searchTerm: '',
      sortByColumn: 'id',
      sortOrder: 'desc',
      filter: []
    });
  }

  fetchData(payload: any): void {
    this.environmentService.getAll(payload).subscribe({
      next: (response: any) => {
        this.records = response.items || [];
        this.totalItems = response.totalRecords || 0;
      },
      error: (error: any) => {
        console.error('Error fetching environment monitoring records:', error);
      }
    });
  }

  onPageChange(payload: any): void {
    this.fetchData(payload);
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this environment monitoring record?')) {
      this.environmentService.delete(id).subscribe({
        next: (response: any) => {
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
        error: (error: any) => {
          console.error('Error deleting record:', error);
          this.toastService.show('Error deleting record', 'error');
        }
      });
    }
  }
}
