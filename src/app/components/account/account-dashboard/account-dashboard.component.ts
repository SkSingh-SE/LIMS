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
    this.accountService.getDashboard().subscribe({
      next: (response) => {
        this.dashboardData = {
          piPending: response?.piPendingCount || 0,
          invoicePending: response?.invoicePendingCount || 0,
          paymentPending: response?.paymentPendingCount || 0,
          fullySettled: response?.fullySettledCount || 0
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

  formatCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  formatTimestamp(date: Date | null): string {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  isEmpty(): boolean {
    return this.dashboardData.piPending === 0 && 
           this.dashboardData.invoicePending === 0 && 
           this.dashboardData.paymentPending === 0 && 
           this.dashboardData.fullySettled === 0;
  }
}

