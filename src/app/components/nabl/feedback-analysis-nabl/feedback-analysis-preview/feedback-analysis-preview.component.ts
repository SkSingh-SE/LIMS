import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FeedbackAnalysisService } from '../../../../services/feedback-analysis.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-feedback-analysis-preview',
    standalone: true,
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './feedback-analysis-preview.component.html',
    styleUrl: './feedback-analysis-preview.component.css'
})
export class FeedbackAnalysisPreviewComponent implements OnInit {
    recordId: number = 0;
    data: any = null;
    isLoading = signal(true);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: FeedbackAnalysisService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.recordId = Number(params.get('id'));
            if (this.recordId > 0) this.fetchData();
        });
    }

    fetchData() {
        this.isLoading.set(true);
        this.service.getById(this.recordId).subscribe(resp => {
            this.data = resp;
            this.isLoading.set(false);
        });
    }

    printPage() { window.print(); }
    goBack() { this.router.navigate(['/feedback-analysis']); }
}
