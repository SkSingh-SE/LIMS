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
  lastUpdated: Date | null = null;
  dashboardData: any = {
    piPending: 0,
    invoicePending: 0,
    paymentPending: 0,
    fullySettled: 0,
    totalRevenue: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    todayCollection: 0,
    customerTypeBreakdown: []
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
    this.accountService.getDashboard().subscribe({
      next: (response) => {
        this.dashboardData = {
          piPending: response?.piPendingCount || 0,
          invoicePending: response?.invoicePendingCount || 0,
          paymentPending: response?.paymentPendingCount || 0,
          fullySettled: response?.fullySettledCount || 0,
          totalRevenue: response?.totalRevenue || 0,
          totalOutstanding: response?.totalOutstanding || 0,
          totalOverdue: response?.totalOverdue || 0,
          todayCollection: response?.todayCollection || 0,
          customerTypeBreakdown: response?.customerTypeBreakdown || []
        };
        this.lastUpdated = new Date();
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.toastService.show('Failed to load dashboard data', 'error');
      }
    });
  }

  navigateToCaseList(filter?: string): void {
    const queryParams = filter ? { filter } : {};
    this.router.navigate(['/accounts/cases'], { queryParams });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  formatCount(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }

  formatCurrency(amount: number): string {
    if (amount >= 10000000) return '\u20B9' + (amount / 10000000).toFixed(2) + ' Cr';
    if (amount >= 100000) return '\u20B9' + (amount / 100000).toFixed(2) + ' L';
    if (amount >= 1000) return '\u20B9' + (amount / 1000).toFixed(1) + 'K';
    return '\u20B9' + amount.toFixed(0);
  }

  formatTimestamp(date: Date | null): string {
    if (!date) return 'Never';
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }

  isEmpty(): boolean {
    return this.dashboardData.piPending === 0 &&
           this.dashboardData.invoicePending === 0 &&
           this.dashboardData.paymentPending === 0 &&
           this.dashboardData.fullySettled === 0 &&
           this.dashboardData.totalRevenue === 0;
  }
}
