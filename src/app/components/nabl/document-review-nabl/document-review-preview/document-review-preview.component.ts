import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DocumentReviewService } from '../../../../services/document-review.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-document-review-preview',
    standalone: true,
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './document-review-preview.component.html',
    styleUrl: './document-review-preview.component.css'
})
export class DocumentReviewPreviewComponent implements OnInit {
    data: any[] = [];
    headerInfo: any = {
        formatNo: 'F-45',
        docNo: 'DMSPL / Level-04 / Format / F-45',
        issueNo: '03',
        issueDate: '01.10.2021',
        revNo: '00',
        revDate: '--'
    };
    orientation: 'portrait' | 'landscape' = 'landscape';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private service: DocumentReviewService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData() {
        this.service.getAll().subscribe(resp => {
            this.data = resp;
            if (resp.length > 0) {
                this.headerInfo.formatNo = resp[0].formatNo;
                this.headerInfo.docNo = resp[0].docNo;
            }
            setTimeout(() => this.autoDetectOrientation(), 300);
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
        this.orientation = 'landscape';
        setTimeout(() => this.autoDetectOrientation(), 100);
    }

    printPage(): void {
        document.getElementById('dr-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'dr-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    goBack() { this.router.navigate(['/document-review']); }
}
