import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JobDescriptionService } from '../../../services/job-description.service';
import { JobDescription } from '../../../models/jobDescriptionModel';
import { ToastService } from '../../../services/toast.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';

@Component({
    selector: 'app-job-description-preview',
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './job-description-preview.component.html',
    styleUrl: './job-description-preview.component.css'
})
export class JobDescriptionPreviewComponent implements OnInit {
    jobDesc: JobDescription | null = null;
    isLoading = true;

    /** Current orientation — set by auto-detect or manual toggle */
    orientation: 'portrait' | 'landscape' = 'portrait';

    /** True after user manually clicks a toggle — stops auto-overriding their choice */
    orientationManual = false;

    private orientationDetected = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private jobDescriptionService: JobDescriptionService,
        private toastService: ToastService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.jobDescriptionService.getById(Number(idParam)).subscribe({
                next: (data) => {
                    if (data) {
                        this.jobDesc = data;
                        this.isLoading = false;
                        // Auto-detect orientation after Angular renders the content
                        setTimeout(() => this.autoDetectOrientation(), 300);
                    } else {
                        this.toastService.show('Job Description not found', 'error');
                        this.router.navigate(['/job-description']);
                    }
                },
                error: () => {
                    this.toastService.show('Error loading preview', 'error');
                    this.router.navigate(['/job-description']);
                    this.isLoading = false;
                }
            });
        }
    }

    /**
     * Measures rendered body content.
     * If any table or row overflows portrait width → switches to landscape.
     * Only runs once unless user resets manual mode.
     */
    private autoDetectOrientation(): void {
        if (this.orientationManual || this.orientationDetected) return;
        this.orientationDetected = true;

        const bodyBlock = document.querySelector('.body-block') as HTMLElement | null;
        if (!bodyBlock) return;

        let needsLandscape = false;

        // Check tables for horizontal overflow
        bodyBlock.querySelectorAll<HTMLElement>('table').forEach(table => {
            if (table.scrollWidth > table.clientWidth + 8) needsLandscape = true;
        });

        // Check rows with many columns (> 5 = likely needs landscape)
        bodyBlock.querySelectorAll<HTMLElement>('tr').forEach(row => {
            if (row.children.length > 5) needsLandscape = true;
        });

        const detected: 'portrait' | 'landscape' = needsLandscape ? 'landscape' : 'portrait';
        if (detected !== this.orientation) {
            this.orientation = detected;
            this.cdr.detectChanges();
        }
    }

    /** Manual orientation set — locks so auto-detect doesn't override */
    setOrientation(o: 'portrait' | 'landscape'): void {
        this.orientation = o;
        this.orientationManual = true;
    }

    /** Re-run auto-detect (clears manual lock) */
    resetToAuto(): void {
        this.orientationManual = false;
        this.orientationDetected = false;
        this.orientation = 'portrait';
        setTimeout(() => this.autoDetectOrientation(), 100);
    }

    printPage(): void {
        // Remove any stale injection from a previous print attempt
        document.getElementById('jd-print-page-size')?.remove();

        // Wrap inside @media print so it has the same cascade context as
        // the global styles.css @page rule — source order then wins (injected last).
        const styleEl = document.createElement('style');
        styleEl.id = 'jd-print-page-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);

        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;

        document.head.removeChild(styleEl);
    }

    goBack(): void {
        this.router.navigate(['/job-description']);
    }
}
