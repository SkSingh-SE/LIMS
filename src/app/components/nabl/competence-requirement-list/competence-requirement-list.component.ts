import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { CompetenceRequirementService } from '../../../services/competence-requirement.service';
import { ToastService } from '../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
  selector: 'app-competence-requirement-list',

  imports: [CommonModule, NablRegisterTableComponent],
  templateUrl: './competence-requirement-list.component.html',
  styleUrl: './competence-requirement-list.component.css'
})
export class CompetenceRequirementListComponent implements OnInit {

  columns: RegisterColumn[] = [
    { key: 'positionName', type: 'string', label: 'Position / Activity', filter: true },
    { key: 'minimumEducation', type: 'string', label: 'Minimum Education', filter: true },
    { key: 'minimumExperience', type: 'string', label: 'Minimum Experience', filter: true },
    { key: 'approvedBy', type: 'string', label: 'Approved By', filter: true }
  ];

  requirements: any[] = [];
  totalItems = 0;
  isLoading = signal(false);

  constructor(
    private competenceRequirementService: CompetenceRequirementService,
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
    this.isLoading.set(true);
    this.competenceRequirementService.getAll(payload).subscribe({
      next: (response) => {
        this.requirements = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error fetching competence requirements:', error);
        this.requirements = [];
        this.totalItems = 0;
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(payload: any) {
    this.fetchData(payload);
  }

  deleteRequirement(id: number) {
    const confirmed = window.confirm('Are you sure you want to delete this competence requirement?');
    if (confirmed) {
      this.competenceRequirementService.delete(id).subscribe({
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
