import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeTrainingService } from '../../../services/employee-training.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { EmployeeTrainingRecord } from '../../../models/employeeTrainingModel';

@Component({
    selector: 'app-employee-training-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './employee-training-preview.component.html',
    styleUrl: './employee-training-preview.component.css'
})
export class EmployeeTrainingPreviewComponent implements OnInit {
    recordId: number = 0;
    record: EmployeeTrainingRecord | null = null;
    isLoading: boolean = true;
    orientation: 'portrait' | 'landscape' = 'portrait';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private trainingService: EmployeeTrainingService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.recordId = Number(params.get('id'));
            if (this.recordId > 0) {
                this.loadRecord();
            } else {
                this.isLoading = false;
            }
        });
    }

    loadRecord(): void {
        this.isLoading = true;
        this.trainingService.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.record = data;
                }
                this.isLoading = false;
                setTimeout(() => this.autoDetectOrientation(), 300);
            },
            error: (err) => {
                console.error('Error loading training record:', err);
                this.isLoading = false;
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
        document.getElementById('et-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'et-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    goBack(): void {
        this.router.navigate(['/employee']);
    }
}
