import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { TrainingAttendanceService } from '../../../services/training-attendance.service';
import { TrainingAttendance } from '../../../models/trainingAttendanceModel';
import { PrintFrameComponent } from '../../nabl/print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../../nabl/nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl/nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-training-attendance-preview',

    imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './training-attendance-preview.component.html'
})
export class TrainingAttendancePreviewComponent implements OnInit {
    record = signal<TrainingAttendance | null>(null);
    isLoading = signal(false);

    constructor(
        private service: TrainingAttendanceService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        const id = +this.route.snapshot.params['id'];
        if (id) {
            this.loadRecord(id);
        }
    }

    loadRecord(id: number): void {
        this.isLoading.set(true);
        this.service.getById(id).subscribe({
            next: (data) => {
                this.record.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    print(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/training-attendance']);
    }
}
