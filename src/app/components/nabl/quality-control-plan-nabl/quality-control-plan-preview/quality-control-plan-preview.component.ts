import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';
import { ToastService } from '../../../../services/toast.service';

@Component({
    selector: 'app-quality-control-plan-preview',
    standalone: true,
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './quality-control-plan-preview.component.html',
    styleUrl: './quality-control-plan-preview.component.css'
})
export class QualityControlPlanPreviewComponent implements OnInit {
    recordId: number = 0;
    data: any = null;
    isLoading = signal(true);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: QualityControlPlanService,
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
    goBack() { this.router.navigate(['/quality-control-plan']); }
}
