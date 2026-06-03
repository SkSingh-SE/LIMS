import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EquipmentHistoryService } from '../../../services/equipment-history.service';
import { ToastService } from '../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl/nabl-register-table/nabl-register-table.component';

@Component({
  selector: 'app-equipment-history-list',

  imports: [CommonModule, NablRegisterTableComponent],
  templateUrl: './equipment-history-list.component.html',
  styleUrl: './equipment-history-list.component.css'
})
export class EquipmentHistoryListComponent implements OnInit {
  records: any[] = [];
  totalItems = 0;

  columns: RegisterColumn[] = [
    // { key: 'recordDate', type: 'date', label: 'Date', filter: true },
    { key: 'equipmentName', type: 'string', label: 'Equipment', filter: true },
    { key: 'equipmentNo', type: 'string', label: 'Equipment No', filter: true },
    { key: 'recordType', type: 'string', label: 'Type', filter: true },
    { key: 'performedBy', type: 'string', label: 'Performed By', filter: true },
    { key: 'agency', type: 'string', label: 'Agency', filter: true },
    { key: 'status', type: 'string', label: 'Status', filter: true }
  ];

  constructor(
    private equipmentHistoryService: EquipmentHistoryService,
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
    this.equipmentHistoryService.getAll(payload).subscribe({
      next: (response: any) => {
        this.records = response.items || [];
        this.totalItems = response.totalRecords || 0;
      },
      error: (error: any) => {
        console.error('Error fetching equipment history records:', error);
      }
    });
  }

  onPageChange(payload: any): void {
    this.fetchData(payload);
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this equipment history record?')) {
      this.equipmentHistoryService.delete(id).subscribe({
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
