import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  orientation: 'portrait' | 'landscape' = 'portrait';
  orientationManual = false;
  private orientationDetected = false;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trainingPlanService: TrainingPlanService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.planId = Number(params.get('id'));
      if (this.planId > 0) {
        this.loadPlan();
      } else {
      }
    });
  }

  loadPlan(): void {
    this.trainingPlanService.getById(this.planId).subscribe({
      next: (data) => {
        this.plan = data;
        setTimeout(() => this.autoDetectOrientation)
      },
      error: (err: any) => {
        console.error('Error loading training plan:', err);
      }
    });
  }


  private autoDetectOrientation(): void {
    if (this.orientationManual || this.orientationDetected) return;
    this.orientationDetected = true;
    const bodyBlock = document.querySelector('.body-block') as HTMLElement | null;
    if (!bodyBlock) return;
    let needsLandscape = false;
    bodyBlock.querySelectorAll<HTMLElement>('table').forEach(table => {
      if (table.scrollWidth > table.clientWidth + 8) needsLandscape = true;
    });
    bodyBlock.querySelectorAll<HTMLElement>('tr').forEach(row => {
      if (row.children.length > 5) needsLandscape = true;
    });
    const detected: 'portrait' | 'landscape' = needsLandscape ? 'landscape' : 'portrait';
    if (detected !== this.orientation) {
      this.orientation = detected;
      this.cdr.detectChanges();
    }
  }

  setOrientation(o: 'portrait' | 'landscape'): void {
    this.orientation = o;
    this.orientationManual = true;
  }

  resetToAuto(): void {
    this.orientationManual = false;
    this.orientationDetected = false;
    this.orientation = 'portrait';
    setTimeout(() => this.autoDetectOrientation(), 100);
  }

  printPage(): void {
    document.getElementById('comp-print-size')?.remove();
    const styleEl = document.createElement('style');
    styleEl.id = 'comp-print-size';
    styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
    document.head.appendChild(styleEl);
    const originalTitle = document.title;
    document.title = '';
    window.print();
    document.title = originalTitle;
    document.head.removeChild(styleEl);
  }
  goBack(): void {
    this.router.navigate(['/training-plan']);
  }
}
