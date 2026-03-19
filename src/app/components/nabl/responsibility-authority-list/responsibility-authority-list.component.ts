import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ResponsibilityAuthorityService } from '../../../services/responsibility-authority.service';
import { ToastService } from '../../../services/toast.service';
import { NablRegisterTableComponent, RegisterColumn } from '../nabl-register-table/nabl-register-table.component';

@Component({
  selector: 'app-responsibility-authority-list',

  imports: [CommonModule, NablRegisterTableComponent],
  templateUrl: './responsibility-authority-list.component.html',
  styleUrl: './responsibility-authority-list.component.css'
})
export class ResponsibilityAuthorityListComponent implements OnInit {

  columns: RegisterColumn[] = [
    { key: 'designationName', type: 'string', label: 'Designation', filter: true },
    { key: 'formatNo', type: 'string', label: 'Form Number', filter: true },
    { key: 'issueNo', type: 'string', label: 'Issue No', filter: true },
    { key: 'date', type: 'date', label: 'Date', filter: true },
    { key: 'revNo', type: 'string', label: 'Rev No', filter: true }
  ];

  matrixList: any[] = [];
  totalItems = 0;

  constructor(
    private raService: ResponsibilityAuthorityService,
    private toastService: ToastService,
    private router: Router
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
    this.raService.getAll(payload).subscribe({
      next: (response) => {
        this.matrixList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
      },
      error: (error: any) => {
        console.error('Error fetching RA matrix:', error);
        this.matrixList = [];
        this.totalItems = 0;
      }
    });
  }

  onPageChange(payload: any) {
    this.fetchData(payload);
  }

  deleteMatrix(id: number) {
    const confirmed = window.confirm('Are you sure you want to delete this matrix?');
    if (confirmed) {
      this.raService.delete(id).subscribe({
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
        error: (error: any) => {
          this.toastService.show(error.message, 'error');
        }
      });
    }
  }
}
