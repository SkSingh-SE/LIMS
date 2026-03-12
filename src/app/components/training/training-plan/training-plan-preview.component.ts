import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TrainingPlanService } from '../../../services/training-plan.service';
import { TrainingPlan } from '../../../models/trainingPlanModel';
import { NablPrintHeaderComponent } from '../../nabl/nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl/nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../nabl/print-frame/print-frame.component';

@Component({
  selector: 'app-training-plan-preview',

  imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
  templateUrl: './training-plan-preview.component.html',
  styleUrl: './training-plan-preview.component.css'
})
export class TrainingPlanPreviewComponent implements OnInit {
  planId: number = 0;
  plan: TrainingPlan | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trainingPlanService: TrainingPlanService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.planId = Number(params.get('id'));
      if (this.planId > 0) {
        this.loadPlan();
      } else {
        this.isLoading = false;
      }
    });
  }

  loadPlan(): void {
    this.isLoading = true;
    this.trainingPlanService.getById(this.planId).subscribe({
      next: (data) => {
        this.plan = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading training plan:', err);
        this.isLoading = false;
      }
    });
  }

  printPage(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/training-plan']);
  }
}
