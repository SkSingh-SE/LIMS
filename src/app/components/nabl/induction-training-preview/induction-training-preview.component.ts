import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InductionTrainingService } from '../../../services/induction-training.service';
import { InductionTrainingRecord } from '../../../models/inductionTrainingModel';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';

@Component({
    selector: 'app-induction-training-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './induction-training-preview.component.html',
    styleUrl: './induction-training-preview.component.css'
})
export class InductionTrainingPreviewComponent implements OnInit {
    recordId: number = 0;
    record: InductionTrainingRecord | null = null;
    isLoading: boolean = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private trainingService: InductionTrainingService
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
            },
            error: (err) => {
                console.error('Error loading induction record:', err);
                this.isLoading = false;
            }
        });
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/induction-training']);
    }
}
