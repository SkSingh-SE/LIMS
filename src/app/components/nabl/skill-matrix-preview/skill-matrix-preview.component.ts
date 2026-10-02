import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SkillMatrixService } from '../../../services/skill-matrix.service';
import { DesignationService } from '../../../services/designation.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { SkillMatrix } from '../../../models/skillMatrixModel';

@Component({
    selector: 'app-skill-matrix-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './skill-matrix-preview.component.html',
    styleUrl: './skill-matrix-preview.component.css'
})
export class SkillMatrixPreviewComponent implements OnInit {
    data: any = null;
    matrixId: number = 0;
    designations: any[] = [];
    orientation: 'portrait' | 'landscape' = 'landscape';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private skillMatrixService: SkillMatrixService,
        private designationService: DesignationService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {

        this.route.paramMap.subscribe(params => {
            this.matrixId = Number(params.get('id'));
            if (this.matrixId > 0) {
                this.loadMatrix();
            }
        });
    }


    loadMatrix(): void {
        this.skillMatrixService.getById(this.matrixId).subscribe({
            next: (data) => {
                if (data) {
                    this.data = data;
                }
                setTimeout(() => this.autoDetectOrientation(), 300);
            },
            error: (err) => {
                console.error('Error loading skill matrix:', err);
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
        this.orientation = 'landscape';
        setTimeout(() => this.autoDetectOrientation(), 100);
    }

    printPage(): void {
        document.getElementById('sm-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'sm-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    resolveTitle() {
        if (this.data && this.designations.length) {
            const found = this.designations.find(d => d.id == this.data?.title);
            if (found) {
                this.data.title = found.name;
            }
        }
    }

    goBack(): void {
        if (this.matrixId > 0) {
            this.router.navigate(['/skill-matrix']);
        } else {
            this.router.navigate(['/employee']);
        }
    }
}
