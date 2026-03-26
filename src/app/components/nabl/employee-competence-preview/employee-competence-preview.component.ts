import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeCompetenceService } from '../../../services/employee-competence.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { EmployeeCompetenceReport } from '../../../models/employeeCompetenceModel';

@Component({
    selector: 'app-employee-competence-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './employee-competence-preview.component.html',
    styleUrl: './employee-competence-preview.component.css'
})
export class EmployeeCompetencePreviewComponent implements OnInit {
    reportId: number = 0;
    report: EmployeeCompetenceReport | null = null;
    reports: any[] = [];
    isEmployeeMode = false;
    loading = false;
    ratingOptions = ['Excellent', 'Very Good', 'Good', 'Average', 'Poor'];
    orientation: 'portrait' | 'landscape' = 'portrait';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private competenceService: EmployeeCompetenceService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.isEmployeeMode = this.route.snapshot.data['mode'] === 'employee-report';
        this.route.paramMap.subscribe(params => {
            this.reportId = Number(params.get('id'));
            if (this.reportId > 0) {
                if (this.isEmployeeMode) {
                    this.loadEmployeeReports(this.reportId);
                } else {
                    this.loadReport();
                }
            }
        });
    }

    loadEmployeeReports(employeeId: number): void {
        this.loading = true;
        this.competenceService.getByEmployeeId(employeeId).subscribe({
            next: (res: any) => {
                this.reports = res.items || [];
                if (this.reports.length > 0) {
                    this.report = this.reports[0];
                }
                this.loading = false;
            },
            error: () => {
                this.reports = [];
                this.loading = false;
            }
        });
    }

    selectReport(r: any): void {
        this.report = r;
        this.orientationDetected = false;
        setTimeout(() => this.autoDetectOrientation(), 300);
    }

    loadReport(): void {
        this.loading = true;
        this.competenceService.getById(this.reportId).subscribe({
            next: (data) => {
                if (data) {
                    this.report = data;
                }
                this.loading = false;
                setTimeout(() => this.autoDetectOrientation(), 300);
            },
            error: (err) => {
                console.error('Error loading competence report:', err);
                this.loading = false;
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
        document.getElementById('ec-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'ec-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    goBack(): void {
        if (this.isEmployeeMode) {
            this.router.navigate(['/employee']);
        } else {
            this.router.navigate(['/employee/competence']);
        }
    }
}
