import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PurchaseIndentService } from '../../../services/purchase-indent.service';
import { PurchaseIndent } from '../../../models/purchaseIndentModel';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-purchase-indent-preview',

    imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './purchase-indent-preview.component.html',
    styleUrl: './purchase-indent-preview.component.css'
})
export class PurchaseIndentPreviewComponent implements OnInit {
    recordId: number = 0;
    record = signal<PurchaseIndent | null>(null);
    isLoading = signal(false);

    totalEstimatedCost = computed(() => {
        const items = this.record()?.items || [];
        return items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
    });

    constructor(
        private service: PurchaseIndentService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.recordId = Number(this.route.snapshot.params['id']);
        if (this.recordId) {
            this.loadData();
        }
    }

    loadData(): void {
        this.isLoading.set(true);
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                this.record.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/purchase-indent']);
    }
}
