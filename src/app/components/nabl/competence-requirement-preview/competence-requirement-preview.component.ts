import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CompetenceRequirementService } from '../../../services/competence-requirement.service';
import { CompetenceRequirement } from '../../../models/competenceRequirementModel';
import { ToastService } from '../../../services/toast.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';

@Component({
  selector: 'app-competence-requirement-preview',

  imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
  templateUrl: './competence-requirement-preview.component.html',
  styleUrl: './competence-requirement-preview.component.css'
})
export class CompetenceRequirementPreviewComponent implements OnInit {
  requirement: CompetenceRequirement | null = null;
  isLoading = true;
  orientation: 'portrait' | 'landscape' = 'portrait';
  orientationManual = false;
  private orientationDetected = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private competenceRequirementService: CompetenceRequirementService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.competenceRequirementService.getById(Number(idParam)).subscribe({
        next: (data) => {
          if (data) {
            this.requirement = data;
          } else {
            this.toastService.show('Competence Requirement not found', 'error');
            this.router.navigate(['/competence-requirement']);
          }
          this.isLoading = false;
          setTimeout(() => this.autoDetectOrientation(), 300);
        },
        error: () => {
          this.toastService.show('Error loading preview', 'error');
          this.router.navigate(['/competence-requirement']);
          this.isLoading = false;
        }
      });
    }
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
      document.getElementById('cr-print-size')?.remove();
      const styleEl = document.createElement('style');
      styleEl.id = 'cr-print-size';
      styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
      document.head.appendChild(styleEl);
      const originalTitle = document.title;
      document.title = '';
      window.print();
      document.title = originalTitle;
      document.head.removeChild(styleEl);
  }

  goBack(): void {
    this.router.navigate(['/competence-requirement']);
  }

  getDisplayText(): string {
    if (!this.requirement) return '';
    return this.requirement.isExternal ? (this.requirement.relatedActivity || '') : (this.requirement.positionName || '');
  }
}
