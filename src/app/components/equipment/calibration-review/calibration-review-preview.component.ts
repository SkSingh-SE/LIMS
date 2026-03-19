import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CalibrationReviewService } from '../../../services/calibration-review.service';
import { NablPrintHeaderComponent } from '../../nabl/nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl/nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../nabl/print-frame/print-frame.component';

@Component({
  selector: 'app-calibration-review-preview',

  imports: [CommonModule, RouterModule, FormsModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
  templateUrl: './calibration-review-preview.component.html',
  styleUrl: './calibration-review-preview.component.css'
})
export class CalibrationReviewPreviewComponent implements OnInit {
  record: any = null;
  recordId: number | null = null;

  constructor(
    private calibrationReviewService: CalibrationReviewService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.recordId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.recordId) {
      this.loadRecord();
    }
  }

  private loadRecord(): void {
    this.calibrationReviewService.getById(this.recordId!).subscribe({
      next: (record) => {
        this.record = record;
      },
      error: (error) => {
        console.error('Error loading record:', error);
      }
    });
  }

  printRecord(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/calibration-review']);
  }

  getReviewStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'badge-success';
      case 'rejected': return 'badge-danger';
      case 'conditional-approval': return 'badge-warning';
      case 'requires-clarification': return 'badge-info';
      default: return 'badge-secondary';
    }
  }
}
