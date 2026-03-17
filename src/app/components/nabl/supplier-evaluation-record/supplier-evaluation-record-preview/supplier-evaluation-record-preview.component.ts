import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupplierEvaluationRecordService } from '../../../../services/supplier-evaluation-record.service';
import { SupplierEvaluationRecord } from '../../../../models/supplierEvaluationRecordModel';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-supplier-evaluation-record-preview',

    imports: [CommonModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './supplier-evaluation-record-preview.component.html',
    styleUrls: ['./supplier-evaluation-record-preview.component.css']
})
export class SupplierEvaluationRecordPreviewComponent implements OnInit {
    record: SupplierEvaluationRecord | null = null;
    isLoading = true;
    recordId: number | null = null;
    currentDate = new Date();
    orientation: 'portrait' | 'landscape' = 'portrait';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: SupplierEvaluationRecordService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.recordId = +params['id'];
                this.loadRecord();
            } else {
                alert('No record identifier provided');
                this.router.navigate(['/supplier-evaluation']);
            }
        });
    }

    loadRecord(): void {
        if (!this.recordId) return;

        this.isLoading = true;
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                this.isLoading = false;
                if (data) {
                    this.record = data;
                } else {
                    alert('Record not found');
                    this.router.navigate(['/supplier-evaluation']);
                }
                setTimeout(() => this.autoDetectOrientation(), 300);
            },
            error: () => {
                this.isLoading = false;
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
        document.getElementById('ser-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'ser-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    goBack(): void {
        this.router.navigate(['/supplier-evaluation']);
    }
}
