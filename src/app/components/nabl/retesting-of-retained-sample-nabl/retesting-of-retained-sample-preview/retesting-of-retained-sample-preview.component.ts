import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RetestingOfRetainedSampleService } from '../../../../services/retesting-of-retained-sample.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-retesting-of-retained-sample-preview',
    standalone: true,
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './retesting-of-retained-sample-preview.component.html',
    styleUrl: './retesting-of-retained-sample-preview.component.css'
})
export class RetestingOfRetainedSamplePreviewComponent implements OnInit {
    recordId: number = 0;
    data: any = null;
    isLoading = signal(true);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: RetestingOfRetainedSampleService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.recordId = Number(params.get('id'));
            if (this.recordId > 0) this.fetchData();
        });
    }

    fetchData() {
        this.isLoading.set(true);
        this.service.getById(this.recordId).subscribe({
            next: (resp) => {
                this.data = resp;
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error fetching preview:', err);
                this.toastService.show('Error loading preview', 'error');
                this.isLoading.set(false);
            }
        });
    }

    printPage() { window.print(); }
    goBack() { this.router.navigate(['/retesting-retained-sample']); }
}
