import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { ReferenceMaterialService } from '../../../services/reference-material.service';

@Component({
    selector: 'app-complaint-register-preview-list',
    standalone: true,
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './reference-material-preview-list.component.html',
    styleUrl: './reference-material-preview-list.component.css'
})

export class ReferenceMaterialPreviewListComponent implements OnInit {
    data: any = null;


    orientation: 'portrait' | 'landscape' = 'portrait';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: ReferenceMaterialService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.fetchData();
        });
    }

    fetchData() {

        this.service.getAll({
            PageNumber: 1,
            PageSize: 100,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'desc',
            filter: []
        }).subscribe({

            next: (resp) => {

                this.data = resp.items || [];

                setTimeout(() => this.autoDetectOrientation(), 300);

            },

            error: err => {

                console.error(err);

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
        document.getElementById('ncw-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'ncw-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    goBack() { this.router.navigate(['/reference-material']); }
}