import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReportingService, ReportingPreview } from '../../../services/reporting.service';
import { Router } from '@angular/router';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';

@Component({
  selector: 'app-reporting-preview',
  templateUrl: './reporting-preview.component.html',
  styleUrls: ['./reporting-preview.component.css'],
  imports: [CommonModule, RouterModule, TestStatusBadgeComponent]
})
export class ReportingPreviewComponent implements OnInit {
  reportData: ReportingPreview | null = null;
  isLoading = signal(false);
  sampleId: string = '';

  // Active Tab
  activeTab: string = 'summary';

  constructor(
    private route: ActivatedRoute,
    private reportingService: ReportingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.sampleId = params.get('sampleId') || '';
      if (this.sampleId) {
        this.loadReportPreview(this.sampleId);
      }
    });
  }

  loadReportPreview(sampleId: string): void {
    this.isLoading.set(true);
    this.reportingService.getReportPreview(sampleId).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading report preview:', error);
        this.isLoading.set(false);
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  goBack(): void {
    window.history.back();
  }

  generatePDF(): void {
    console.log('Generate PDF clicked for:', this.sampleId);
    // Dummy implementation
    alert('PDF generation not implemented yet.');
  }

  approveReport(): void {
    if (!this.reportData?.workflowInstanceId) {
      alert('No workflow instance available for approval.');
      return;
    }
    const comments = prompt('Enter approval comments (optional):', '');
    if (comments === null) return;
    this.isLoading.set(true);
    this.reportingService.takeWorkflowAction(this.reportData.workflowInstanceId!, 'Approve', comments || '').subscribe({
      next: () => {
        alert('Report approved successfully.');
        this.isLoading.set(false);
        this.router.navigate(['/reporting']);
      },
      error: (err) => {
        console.error('Approve failed:', err);
        alert('Approve action failed. See console for details.');
        this.isLoading.set(false);
      }
    });
  }

  rejectReport(): void {
    if (!this.reportData?.workflowInstanceId) {
      alert('No workflow instance available for rejection.');
      return;
    }
    const comments = prompt('Enter rejection comments (optional):', '');
    if (comments === null) return;
    this.isLoading.set(true);
    this.reportingService.takeWorkflowAction(this.reportData.workflowInstanceId!, 'Reject', comments || '').subscribe({
      next: () => {
        alert('Report rejected successfully.');
        this.isLoading.set(false);
        this.router.navigate(['/reporting']);
      },
      error: (err) => {
        console.error('Reject failed:', err);
        alert('Reject action failed. See console for details.');
        this.isLoading.set(false);
      }
    });
  }
}
