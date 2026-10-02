import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { TrainingAttendanceService } from '../../../services/training-attendance.service';
import { TrainingAttendance } from '../../../models/trainingAttendanceModel';
import { PrintFrameComponent } from '../../nabl/print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../../nabl/nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl/nabl-print-footer/nabl-print-footer.component';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-training-attendance-preview',

    imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './training-attendance-preview.component.html',
    styleUrl: './training-attendance-preview.component.css'
})
export class TrainingAttendancePreviewComponent implements OnInit {
    record = signal<TrainingAttendance | null>(null);
    baseUrl = environment.baseUrl;
    orientation: 'portrait' | 'landscape' = 'portrait';
    orientationManual = false;
    private orientationDetected = false;
    constructor(
        private service: TrainingAttendanceService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const id = +this.route.snapshot.params['id'];
        if (id) {
            this.loadRecord(id);
        }
    }

    loadRecord(id: number): void {
        this.service.getTrainingattendancedetailsById(id).subscribe({
            next: (data) => {

                if (data) {

                    data?.participants.forEach(p => {
                        p.filePath = p.filePath ? this.baseUrl + p.filePath : '';
                    });
                    this.record.set(data);
                    setTimeout(() => this.autoDetectOrientation(), 300);
                }
            },

            error: () => { }
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
        document.getElementById('comp-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'comp-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }


    goBack(): void {
        this.router.navigate(['/training-attendance']);
    }
}
