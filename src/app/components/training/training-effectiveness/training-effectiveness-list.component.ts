import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainingEffectivenessService } from '../../../services/training-effectiveness.service';
import { ToastService } from '../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl/nabl-register-table/nabl-register-table.component';

@Component({
  selector: 'app-training-effectiveness-list',

  imports: [CommonModule, NablRegisterTableComponent],
  templateUrl: './training-effectiveness-list.component.html',
  styleUrl: './training-effectiveness-list.component.css'
})
export class TrainingEffectivenessListComponent implements OnInit {

  columns: RegisterColumn[] = [
    { key: 'documentNo', label: 'Document No', type: 'string', filter: true },
    { key: 'trainingName', label: 'Training Name', type: 'string', filter: true },
    { key: 'trainingDate', label: 'Training Date', type: 'date', filter: true },
    { key: 'participants', label: 'Participants', type: 'number', filter: true },
    { key: 'overallEffectivenessRating', label: 'Rating', type: 'number', filter: true }
  ];

  records: any[] = [];
  totalItems = 0;
  isLoading = signal(false);

  constructor(
    private trainingEffectivenessService: TrainingEffectivenessService,
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
    this.isLoading.set(true);
    this.trainingEffectivenessService.getAll(payload).subscribe({
      next: (response: any) => {
        this.records = response.items || [];
        this.totalItems = response.totalRecords || 0;
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error fetching training effectiveness records:', error);
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(payload: any): void {
    this.fetchData(payload);
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this training effectiveness record?')) {
      this.trainingEffectivenessService.delete(id).subscribe({
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
