import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ResponsibilityAuthorityService } from '../../../services/responsibility-authority.service';
import { ResponsibilityAuthorityMatrix } from '../../../models/responsibilityAuthorityMatrixModel';
import { ToastService } from '../../../services/toast.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';

@Component({
  selector: 'app-responsibility-authority-preview',
  imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
  templateUrl: './responsibility-authority-preview.component.html',
  styleUrl: './responsibility-authority-preview.component.css'
})
export class ResponsibilityAuthorityPreviewComponent implements OnInit {
  matrix: ResponsibilityAuthorityMatrix | null = null;
  isLoading = true;

  orientation: 'portrait' | 'landscape' = 'portrait';
  orientationManual = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private raService: ResponsibilityAuthorityService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.raService.getById(Number(idParam)).subscribe({
        next: (data) => {
          if (data) {
            this.matrix = data;
          } else {
            this.toastService.show('RA Matrix not found', 'error');
            this.router.navigate(['/responsibility-authority']);
          }
          this.isLoading = false;
        },
        error: () => {
          this.toastService.show('Error loading preview', 'error');
          this.router.navigate(['/responsibility-authority']);
          this.isLoading = false;
        }
      });
    }
  }

  setOrientation(o: 'portrait' | 'landscape'): void {
    this.orientation = o;
    this.orientationManual = true;
  }

  printPage(): void {
    document.getElementById('ra-print-page-size')?.remove();
    const styleEl = document.createElement('style');
    styleEl.id = 'ra-print-page-size';
    styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
    document.head.appendChild(styleEl);

    const originalTitle = document.title;
    document.title = '';
    window.print();
    document.title = originalTitle;

    document.head.removeChild(styleEl);
  }

  goBack(): void {
    this.router.navigate(['/responsibility-authority']);
  }
}
