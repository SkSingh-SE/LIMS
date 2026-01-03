import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-account-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './account-dashboard.component.html',
  styleUrl: './account-dashboard.component.css'
})
export class AccountDashboardComponent implements OnInit {
  isLoading = signal(false);
  dashboardData: any = {
    piPending: 0,
    invoicePending: 0,
    paymentPending: 0,
    fullySettled: 0
  };

  constructor(
    private accountService: AccountService,
    private router: Router,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.accountService.getDashboard().subscribe({
      next: (response) => {
        this.dashboardData = {
          piPending: response?.piPendingCount || 0,
          invoicePending: response?.invoicePendingCount || 0,
          paymentPending: response?.paymentPendingCount || 0,
          fullySettled: response?.fullySettledCount || 0
        };
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.toastService.show('Failed to load dashboard data', 'error');
        this.isLoading.set(false);
      }
    });
  }

  navigateToCaseList(filter?: string): void {
    const queryParams = filter ? { filter } : {};
    this.router.navigate(['/accounts/cases'], { queryParams });
  }
}

