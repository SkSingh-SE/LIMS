import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CustomerFeedbackService } from '../../../../services/customer-feedback.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-customer-feedback-preview',
    standalone: true,
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './customer-feedback-preview.component.html',
    styleUrl: './customer-feedback-preview.component.css'
})
export class CustomerFeedbackPreviewComponent implements OnInit {
    recordId: number = 0;
    data: any = null;
    isLoading = signal(true);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: CustomerFeedbackService
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
    goBack() { this.router.navigate(['/customer-feedback']); }
}
