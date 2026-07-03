import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardCardComponent } from '../dashboard-card/dashboard-card.component';
import { DashboardChartComponent } from '../dashboard-chart/dashboard-chart.component';
import { DashboardNotificationPanelComponent } from '../dashboard-notification-panel/dashboard-notification-panel.component';
import { DashboardCardDto, DashboardChartDto, DashboardNotificationDto } from '../../models/dashboardModels';
import { BranchService, BranchInfo } from '../../services/branch.service';
import { effect } from '@angular/core';

@Component({
  selector: 'app-dashboard-branch-mockup',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardCardComponent, DashboardChartComponent, DashboardNotificationPanelComponent],
  templateUrl: './dashboard-branch-mockup.component.html',
  styleUrl: './dashboard-branch-mockup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardBranchMockupComponent implements OnInit {
  // Dummy Data Signals
  cards = signal<DashboardCardDto[]>([]);
  charts = signal<DashboardChartDto[]>([]);
  notifications = signal<DashboardNotificationDto[]>([]);
  
  // New metrics signals
  equipmentList = signal<{ name: string; status: string; nextCalibration: Date }[]>([]);
  oosList = signal<{ sampleNo: string; parameter: string; result: string; limit: string }[]>([]);

  currentUser = { userName: 'Admin User' };
  lastRefresh = signal<Date>(new Date());

  constructor(private router: Router, public branchService: BranchService) {
    effect(() => {
      const selectedBranch = this.branchService.selectedBranch();
      this.loadDataForBranch(selectedBranch.code);
    });
  }

  // Master Data
  private allBranchData = {
    cards: [
      { key: 'total-samples', title: 'Total Inward (All)', count: 1910, description: 'Samples across all branches', status: 'Normal', allowedRoles: [] } as DashboardCardDto,
      { key: 'in-progress', title: 'In Progress (All)', count: 680, description: 'Tests currently running', status: 'Normal', allowedRoles: [] } as DashboardCardDto,
      { key: 'pending-tests', title: 'Pending Approval (All)', count: 150, description: 'Tests pending across all branches', status: 'Warning', allowedRoles: [] } as DashboardCardDto,
      { key: 'completed-tests', title: 'Completed (All)', count: 1080, description: 'Successfully tested samples', status: 'Normal', allowedRoles: [] },
      { key: 'revenue', title: 'Total Revenue (INR)', count: 2880000, description: 'Revenue for current month', status: 'Normal', allowedRoles: [] } as DashboardCardDto,
      { key: 'pending-invoices', title: 'Unpaid Invoices', count: 85, description: 'Pending payments from clients', status: 'Critical', allowedRoles: [] },
      { key: 'avg-tat', title: 'Global Avg TAT', count: 52, description: 'Turnaround Time in Hours', status: 'Normal', allowedRoles: [] },
      { key: 'oos-count', title: 'Total OOS Results', count: 9, description: 'Out of specification samples', status: 'Critical', allowedRoles: [] }
    ],
    charts: [
      { key: 'samples-by-branch', title: 'Samples by Branch', chartType: 'Pie', allowedRoles: [], dataPoints: [{ label: 'Bengaluru', value: 850 }, { label: 'Delhi', value: 640 }, { label: 'Pune', value: 420 }] } as DashboardChartDto,
      { key: 'revenue-trend', title: 'Global Revenue Trend', chartType: 'Line', allowedRoles: [], dataPoints: [{ label: 'Jan', value: 1500000 }, { label: 'Feb', value: 2000000 }, { label: 'Mar', value: 2500000 }, { label: 'Apr', value: 2400000 }, { label: 'May', value: 2700000 }, { label: 'Jun', value: 2880000 }] } as DashboardChartDto,
      { key: 'top-customers', title: 'Global Top Customers', chartType: 'Doughnut', allowedRoles: [], dataPoints: [{ label: 'Tata Motors', value: 850000 }, { label: 'Maruti', value: 650000 }, { label: 'TCS', value: 450000 }] }
    ],
    notifications: [
      { id: 1, title: 'System Update', message: 'Global system update at midnight.', priority: 'Low', type: 'System', createdAt: new Date(), isRead: false } as DashboardNotificationDto,
      { id: 2, title: 'Target Reached', message: 'Overall revenue target reached!', priority: 'Normal', type: 'Alert', createdAt: new Date(), isRead: false } as DashboardNotificationDto,
      { id: 3, title: 'NABL Audit', message: 'NABL surveillance audit for all branches next month.', priority: 'High', type: 'System', createdAt: new Date(), isRead: false } as DashboardNotificationDto
    ],
    equipment: [
      { name: 'BLR - UTM Machine 1', status: 'Working', nextCalibration: new Date(Date.now() + 86400000 * 5) },
      { name: 'DEL - Gas Chromatograph', status: 'Working', nextCalibration: new Date(Date.now() + 86400000 * 12) },
      { name: 'PUN - Hardness Tester', status: 'Working', nextCalibration: new Date(Date.now() + 86400000 * 8) },
      { name: 'BLR - Spectrometer', status: 'Maintenance', nextCalibration: new Date(Date.now() - 86400000 * 2) }
    ],
    oos: [
      { sampleNo: 'BLR-2026-001', parameter: 'Tensile Strength', result: '420 MPa', limit: '450-500 MPa' },
      { sampleNo: 'DEL-2026-112', parameter: 'Lead Content', result: '1.2 ppm', limit: '< 1.0 ppm' },
      { sampleNo: 'PUN-2026-056', parameter: 'Hardness (HRC)', result: '58', limit: '60-65' }
    ]
  };

  private branchDataMap: Record<string, any> = {
    'BLR': {
      cards: [
        { key: 'total-samples', title: 'Total Inward', count: 850, description: 'Samples received in Bengaluru', status: 'Normal', allowedRoles: [] },
        { key: 'in-progress', title: 'In Progress', count: 320, description: 'Tests currently running', status: 'Normal', allowedRoles: [] },
        { key: 'pending-tests', title: 'Pending Approval', count: 45, description: 'Waiting for Manager approval', status: 'Warning', allowedRoles: [] },
        { key: 'completed-tests', title: 'Completed', count: 485, description: 'Successfully tested samples', status: 'Normal', allowedRoles: [] },
        { key: 'revenue', title: 'Revenue (INR)', count: 1250000, description: 'Monthly revenue for Bengaluru', status: 'Normal', allowedRoles: [] },
        { key: 'pending-invoices', title: 'Unpaid Invoices', count: 28, description: 'Pending payments from clients', status: 'Critical', allowedRoles: [] },
        { key: 'avg-tat', title: 'Avg TAT', count: 48, description: 'Turnaround Time in Hours', status: 'Normal', allowedRoles: [] },
        { key: 'oos-count', title: 'OOS Results', count: 3, description: 'Out of specification samples', status: 'Critical', allowedRoles: [] }
      ],
      charts: [
        { key: 'samples-trend', title: 'Inward Trend (6 Months)', chartType: 'Bar', allowedRoles: [], dataPoints: [{ label: 'Jan', value: 120 }, { label: 'Feb', value: 180 }, { label: 'Mar', value: 250 }, { label: 'Apr', value: 190 }, { label: 'May', value: 310 }, { label: 'Jun', value: 400 }] },
        { key: 'test-category', title: 'Test Categories', chartType: 'Pie', allowedRoles: [], dataPoints: [{ label: 'Chemical', value: 45 }, { label: 'Mechanical', value: 25 }, { label: 'Microbiology', value: 30 }] },
        { key: 'top-customers', title: 'Top Customers', chartType: 'Doughnut', allowedRoles: [], dataPoints: [{ label: 'TCS', value: 350000 }, { label: 'Infosys', value: 210000 }, { label: 'Wipro', value: 180000 }] }
      ],
      notifications: [
        { id: 1, title: 'Equipment Due', message: 'Calibration due for Universal Testing Machine.', priority: 'High', type: 'Alert', createdAt: new Date(), isRead: false },
        { id: 2, title: 'Report Delayed', message: 'Sample #1024 report is delayed by 2 days.', priority: 'Medium', type: 'Warning', createdAt: new Date(Date.now() - 3600000), isRead: false },
        { id: 3, title: 'New ISO Standard', message: 'Update procedure according to new ISO 17025.', priority: 'Normal', type: 'System', createdAt: new Date(Date.now() - 86400000), isRead: true }
      ],
      equipment: [
        { name: 'UTM Machine 1', status: 'Working', nextCalibration: new Date(Date.now() + 86400000 * 5) },
        { name: 'Spectrometer', status: 'Maintenance', nextCalibration: new Date(Date.now() - 86400000 * 2) },
        { name: 'pH Meter', status: 'Working', nextCalibration: new Date(Date.now() + 86400000 * 25) }
      ],
      oos: [
        { sampleNo: 'BLR-2026-001', parameter: 'Tensile Strength', result: '420 MPa', limit: '450-500 MPa' },
        { sampleNo: 'BLR-2026-045', parameter: 'Carbon Content', result: '0.45%', limit: '0.20-0.30%' }
      ]
    },
    'DEL': {
      cards: [
        { key: 'total-samples', title: 'Total Inward', count: 640, description: 'Samples received in Delhi', status: 'Normal', allowedRoles: [] },
        { key: 'in-progress', title: 'In Progress', count: 210, description: 'Tests currently running', status: 'Warning', allowedRoles: [] },
        { key: 'pending-tests', title: 'Pending Approval', count: 85, description: 'Waiting for Manager approval', status: 'Critical', allowedRoles: [] },
        { key: 'completed-tests', title: 'Completed', count: 345, description: 'Successfully tested samples', status: 'Normal', allowedRoles: [] },
        { key: 'revenue', title: 'Revenue (INR)', count: 980000, description: 'Monthly revenue for Delhi', status: 'Normal', allowedRoles: [] },
        { key: 'pending-invoices', title: 'Unpaid Invoices', count: 12, description: 'Pending payments from clients', status: 'Normal', allowedRoles: [] },
        { key: 'avg-tat', title: 'Avg TAT', count: 72, description: 'Turnaround Time in Hours', status: 'Warning', allowedRoles: [] },
        { key: 'oos-count', title: 'OOS Results', count: 1, description: 'Out of specification samples', status: 'Warning', allowedRoles: [] }
      ],
      charts: [
        { key: 'samples-trend', title: 'Inward Trend (6 Months)', chartType: 'Bar', allowedRoles: [], dataPoints: [{ label: 'Jan', value: 90 }, { label: 'Feb', value: 110 }, { label: 'Mar', value: 150 }, { label: 'Apr', value: 220 }, { label: 'May', value: 180 }, { label: 'Jun', value: 210 }] },
        { key: 'test-category', title: 'Test Categories', chartType: 'Pie', allowedRoles: [], dataPoints: [{ label: 'Chemical', value: 60 }, { label: 'Mechanical', value: 10 }, { label: 'Environmental', value: 30 }] },
        { key: 'top-customers', title: 'Top Customers', chartType: 'Doughnut', allowedRoles: [], dataPoints: [{ label: 'Maruti', value: 450000 }, { label: 'L&T', value: 320000 }, { label: 'DLF', value: 120000 }] }
      ],
      notifications: [
        { id: 4, title: 'Audit Alert', message: 'NABL Internal audit scheduled for tomorrow.', priority: 'High', type: 'System', createdAt: new Date(), isRead: false },
        { id: 5, title: 'Invoice Paid', message: 'Client XYZ cleared pending dues.', priority: 'Low', type: 'System', createdAt: new Date(Date.now() - 7200000), isRead: false }
      ],
      equipment: [
        { name: 'Gas Chromatograph', status: 'Working', nextCalibration: new Date(Date.now() + 86400000 * 12) },
        { name: 'Oven 1', status: 'Working', nextCalibration: new Date(Date.now() + 86400000 * 3) }
      ],
      oos: [
        { sampleNo: 'DEL-2026-112', parameter: 'Lead Content', result: '1.2 ppm', limit: '< 1.0 ppm' }
      ]
    },
    'PUN': {
      cards: [
        { key: 'total-samples', title: 'Total Inward', count: 420, description: 'Samples received in Pune', status: 'Normal', allowedRoles: [] },
        { key: 'in-progress', title: 'In Progress', count: 150, description: 'Tests currently running', status: 'Normal', allowedRoles: [] },
        { key: 'pending-tests', title: 'Pending Approval', count: 20, description: 'Waiting for Manager approval', status: 'Normal', allowedRoles: [] },
        { key: 'completed-tests', title: 'Completed', count: 250, description: 'Successfully tested samples', status: 'Normal', allowedRoles: [] },
        { key: 'revenue', title: 'Revenue (INR)', count: 650000, description: 'Monthly revenue for Pune', status: 'Normal', allowedRoles: [] },
        { key: 'pending-invoices', title: 'Unpaid Invoices', count: 45, description: 'Pending payments from clients', status: 'Critical', allowedRoles: [] },
        { key: 'avg-tat', title: 'Avg TAT', count: 36, description: 'Turnaround Time in Hours', status: 'Normal', allowedRoles: [] },
        { key: 'oos-count', title: 'OOS Results', count: 5, description: 'Out of specification samples', status: 'Critical', allowedRoles: [] }
      ],
      charts: [
        { key: 'samples-trend', title: 'Inward Trend (6 Months)', chartType: 'Bar', allowedRoles: [], dataPoints: [{ label: 'Jan', value: 50 }, { label: 'Feb', value: 70 }, { label: 'Mar', value: 90 }, { label: 'Apr', value: 110 }, { label: 'May', value: 160 }, { label: 'Jun', value: 140 }] },
        { key: 'test-category', title: 'Test Categories', chartType: 'Pie', allowedRoles: [], dataPoints: [{ label: 'Mechanical', value: 70 }, { label: 'Metallurgy', value: 30 }] },
        { key: 'top-customers', title: 'Top Customers', chartType: 'Doughnut', allowedRoles: [], dataPoints: [{ label: 'Tata Motors', value: 300000 }, { label: 'Bajaj', value: 200000 }, { label: 'Mahindra', value: 150000 }] }
      ],
      notifications: [
        { id: 6, title: 'New Client Onboarded', message: 'Enterprise client Tata Motors added.', priority: 'Normal', type: 'System', createdAt: new Date(), isRead: false },
        { id: 7, title: 'Resource Shortage', message: 'Technician on leave, expect delays in Mech dept.', priority: 'Medium', type: 'Warning', createdAt: new Date(Date.now() - 86400000), isRead: true }
      ],
      equipment: [
        { name: 'Hardness Tester', status: 'Working', nextCalibration: new Date(Date.now() + 86400000 * 8) },
        { name: 'Microscope', status: 'Working', nextCalibration: new Date(Date.now() + 86400000 * 15) }
      ],
      oos: [
        { sampleNo: 'PUN-2026-056', parameter: 'Hardness (HRC)', result: '58', limit: '60-65' },
        { sampleNo: 'PUN-2026-060', parameter: 'Yield Strength', result: '390 MPa', limit: '> 400 MPa' }
      ]
    }
  };

  ngOnInit(): void {
    // Initial load handled by effect
  }

  onBranchChange(event: any): void {
    const branchCode = event.target.value;
    this.branchService.setBranch(branchCode);
  }

  private loadDataForBranch(branchCode: string): void {
    let data = this.branchDataMap[branchCode] || this.allBranchData;
    
    this.cards.set(data.cards || []);
    this.charts.set(data.charts || []);
    this.notifications.set(data.notifications || []);
    this.equipmentList.set(data.equipment || []);
    this.oosList.set(data.oos || []);
    this.lastRefresh.set(new Date());
  }

  onRefresh(): void {
    this.loadDataForBranch(this.branchService.selectedBranch().code);
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleString();
  }
  
  onCardClick(card: any): void {}
  onNotificationClick(notif: any): void {}
  onViewAllNotifications(): void {}

  get isAllBranches(): boolean {
    return this.branchService.selectedBranch().code === 'ALL';
  }

  get branchSummaries(): any[] {
    return Object.keys(this.branchDataMap).map(key => {
      const bData = this.branchDataMap[key];
      const branchInfo = this.branchService.branches.find(b => b.code === key);
      return {
        code: key,
        name: branchInfo?.name || key,
        total: bData.cards.find((c: any) => c.key === 'total-samples')?.count || 0,
        pending: bData.cards.find((c: any) => c.key === 'pending-tests')?.count || 0,
        revenue: bData.cards.find((c: any) => c.key === 'revenue')?.count || 0,
        oos: bData.cards.find((c: any) => c.key === 'oos-count')?.count || 0,
      };
    });
  }

  trackByCardKey(index: number, card: any): string { return card.key; }
  trackByChartKey(index: number, chart: any): string { return chart.key; }
  getChartGridClass(): string {
    const chartCount = this.charts().length;
    if (chartCount === 1) return 'charts-full-width';
    // If there are exactly two, or an even number (like 4), we can use the dual grid.
    if (chartCount >= 2) return 'charts-dual-grid';
    return 'charts-stack-compact';
  }
}
