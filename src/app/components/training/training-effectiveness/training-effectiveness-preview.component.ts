import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TrainingEffectivenessService } from '../../../services/training-effectiveness.service';
import { TrainingEffectiveness } from '../../../models/trainingEffectivenessModel';
import { NablPrintHeaderComponent } from '../../nabl/nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl/nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../nabl/print-frame/print-frame.component';

@Component({
  selector: 'app-training-effectiveness-preview',
  imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
  templateUrl: './training-effectiveness-preview.component.html',
  styleUrl: './training-effectiveness-preview.component.css'
})
export class TrainingEffectivenessPreviewComponent implements OnInit {
  recordId: number = 0;
  record: TrainingEffectiveness | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trainingEffectivenessService: TrainingEffectivenessService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.recordId = Number(params.get('id'));
      if (this.recordId > 0) {
        this.loadRecord();
      } else {
        this.isLoading = false;
      }
    });
  }

  loadRecord(): void {
    this.isLoading = true;
    this.trainingEffectivenessService.getById(this.recordId).subscribe({
      next: (data: any) => {
        this.record = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading training effectiveness record:', err);
        this.isLoading = false;
      }
    });
  }

  calculateImprovement(parameter: string): number {
    if (!this.record) return 0;
    const preScore = this.record.preTrainingAssessments.find(a => a.parameter === parameter)?.score || 0;
    const postScore = this.record.postTrainingAssessments.find(a => a.parameter === parameter)?.score || 0;
    return postScore - preScore;
  }

  printPage(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/training-effectiveness']);
  }
}
