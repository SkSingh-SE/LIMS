import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PurchaseMaterialVerificationService } from '../../../../services/purchase-material-verification.service';
import { PurchaseMaterialVerification } from '../../../../models/purchaseMaterialVerificationModel';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
@Component({
    selector: 'app-purchase-material-verification-preview',
    imports: [CommonModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './purchase-material-verification-preview.component.html',
    styleUrls: ['./purchase-material-verification-preview.component.css']
})
export class PurchaseMaterialVerificationPreviewComponent implements OnInit {
    record: PurchaseMaterialVerification | null = null;
    recordId: number | null = null;
    currentDate = new Date();
    orientation: 'portrait' | 'landscape' = 'portrait';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: PurchaseMaterialVerificationService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.recordId = +params['id'];
                this.loadRecord();
            } else {
                alert('No record identifier provided');
                this.router.navigate(['/purchase-material-verification']);
            }
        });
    }

    loadRecord(): void {
        if (!this.recordId) return;

        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.record = data;
                } else {
                    alert('Record not found');
                    this.router.navigate(['/purchase-material-verification']);
                }
                setTimeout(() => this.autoDetectOrientation(), 300);
            },
            error: () => {
                alert('Error loading record details');
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
        document.getElementById('pmv-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'pmv-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    goBack(): void {
        this.router.navigate(['/purchase-material-verification']);
    }
}
