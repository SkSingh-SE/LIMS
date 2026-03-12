import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainingPlanService } from '../../../services/training-plan.service';
import { ToastService } from '../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl/nabl-register-table/nabl-register-table.component';

@Component({
  selector: 'app-training-plan-list',

  imports: [CommonModule, NablRegisterTableComponent],
  templateUrl: './training-plan-list.component.html',
  styleUrl: './training-plan-list.component.css'
})
export class TrainingPlanListComponent implements OnInit {

  columns: RegisterColumn[] = [
    { key: 'documentNo', label: 'Document No', type: 'string', filter: true },
    { key: 'planningYear', label: 'Year', type: 'number', filter: true },
    { key: 'approvalStatus', label: 'Status', type: 'string', filter: true }
  ];

  trainingPlans: any[] = [];
  totalItems = 0;
  isLoading = signal(false);

  constructor(
    private trainingPlanService: TrainingPlanService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.fetchData({
      PageNumber: 1,
      PageSize: 10,
      searchTerm: '',
      sortByColumn: 'id',
      sortOrder: 'asc',
      filter: []
    });
  }

  fetchData(payload: any): void {
    this.isLoading.set(true);
    this.trainingPlanService.getAll(payload).subscribe({
      next: (response) => {
        this.trainingPlans = response.items || [];
        this.totalItems = response.totalRecords || 0;
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error fetching training plans:', error);
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(payload: any): void {
    this.fetchData(payload);
  }

  deletePlan(id: number): void {
    if (confirm('Are you sure you want to delete this training plan?')) {
      this.trainingPlanService.delete(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.show('Training plan deleted successfully', 'success');
            this.fetchData({
              PageNumber: 1,
              PageSize: 10,
              searchTerm: '',
              sortByColumn: 'id',
              sortOrder: 'asc',
              filter: []
            });
          }
        },
        error: (error: any) => {
          console.error('Error deleting training plan:', error);
          this.toastService.show('Error deleting training plan', 'error');
        }
      });
    }
  }
}
