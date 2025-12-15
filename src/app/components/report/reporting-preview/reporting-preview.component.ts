import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReportingService, ReportingPreview } from '../../../services/reporting.service';

@Component({
  selector: 'app-reporting-preview',
  templateUrl: './reporting-preview.component.html',
  styleUrls: ['./reporting-preview.component.css'],
  imports: [CommonModule, RouterModule]
})
export class ReportingPreviewComponent implements OnInit {
  reportData: ReportingPreview | null = null;
  isLoading = signal(false);
  sampleId: string = '';

  // Active Tab
  activeTab: string = 'summary';

  constructor(
    private route: ActivatedRoute,
    private reportingService: ReportingService
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
    console.log('Approve report clicked for:', this.sampleId);
    // Dummy implementation
    alert('Report approval not implemented yet.');
  }

  rejectReport(): void {
    console.log('Reject report clicked for:', this.sampleId);
    // Dummy implementation
    alert('Report rejection not implemented yet.');
  }
}
