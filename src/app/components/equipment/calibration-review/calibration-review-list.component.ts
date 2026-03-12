import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalibrationReviewService } from '../../../services/calibration-review.service';
import { ToastService } from '../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl/nabl-register-table/nabl-register-table.component';

@Component({
  selector: 'app-calibration-review-list',

  imports: [CommonModule, NablRegisterTableComponent],
  templateUrl: './calibration-review-list.component.html',
  styleUrl: './calibration-review-list.component.css'
})
export class CalibrationReviewListComponent implements OnInit {
  records: any[] = [];
  totalItems = 0;
  isLoading = signal(false);

  columns: RegisterColumn[] = [
    { key: 'calibrationDate', type: 'date', label: 'Calibration Date', filter: true },
    { key: 'equipmentName', type: 'string', label: 'Equipment', filter: true },
    { key: 'certificateNo', type: 'string', label: 'Certificate No', filter: true },
    { key: 'calibratingAgency', type: 'string', label: 'Agency', filter: true },
    { key: 'reviewStatus', type: 'string', label: 'Status', filter: true },
    { key: 'nextCalibrationDate', type: 'date', label: 'Next Calibration', filter: true },
    { key: 'reviewedBy', type: 'string', label: 'Reviewed By', filter: true }
  ];

  constructor(
    private calibrationReviewService: CalibrationReviewService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.fetchData({
      PageNumber: 1,
      PageSize: 10,
      searchTerm: '',
      sortByColumn: 'calibrationDate',
      sortOrder: 'desc',
      filter: []
    });
  }

  fetchData(payload: any): void {
    this.isLoading.set(true);
    this.calibrationReviewService.getAll(payload).subscribe({
      next: (response: any) => {
        this.records = response.items || [];
        this.totalItems = response.totalRecords || 0;
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error fetching calibration review records:', error);
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(payload: any): void {
    this.fetchData(payload);
  }

  deleteRecord(id: number): void {
    if (confirm('Are you sure you want to delete this calibration review record?')) {
      this.calibrationReviewService.delete(id).subscribe({
        next: (response: any) => {
          this.toastService.show('Record deleted successfully', 'success');
          this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'calibrationDate',
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
