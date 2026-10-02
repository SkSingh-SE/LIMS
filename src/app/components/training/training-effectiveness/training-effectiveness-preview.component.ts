import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  record: any = null;
  evaluationId: number | null = null;
  orientation: 'portrait' | 'landscape' = 'portrait';
  orientationManual = false;
  private orientationDetected = false;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trainingEffectivenessService: TrainingEffectivenessService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {

      this.evaluationId = params.get('id')
        ? Number(params.get('id'))
        : null;

      if (this.evaluationId && this.evaluationId > 0) {
        this.loadRecord(this.evaluationId);
      }

    });
  }

  loadRecord(evaluationId: number): void {
    this.trainingEffectivenessService.getById(evaluationId).subscribe({
      next: (data: any) => {
        this.record = data;
        setTimeout(() => this.autoDetectOrientation)
      },
      error: (err: any) => {
        console.error('Error loading training effectiveness record:', err);
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
    this.router.navigate(['/my-evaluations']);
  }
}
