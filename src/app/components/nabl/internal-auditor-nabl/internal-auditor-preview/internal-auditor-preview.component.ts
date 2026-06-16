import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { InternalAuditorService } from '../../../../services/internal-auditor.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-internal-auditor-preview',
    standalone: true,
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './internal-auditor-preview.component.html',
    styleUrl: './internal-auditor-preview.component.css'
})
export class InternalAuditorPreviewComponent implements OnInit {
    data: any[] = [];
    headerInfo: any = {
        formatNo: 'F-49',
        docNo: 'DMSPL / Level-04 / Format / F-49',
        issueNo: '03',
        issueDate: '01.10.2021',
        revNo: '00',
        revDate: '--'
    };
    orientation: 'portrait' | 'landscape' = 'landscape';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private service: InternalAuditorService,
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
        document.getElementById('ia-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'ia-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    goBack() { this.router.navigate(['/internal-auditor']); }
}
