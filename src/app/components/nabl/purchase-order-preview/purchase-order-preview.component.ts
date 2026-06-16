import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { PurchaseOrder } from '../../../models/purchaseOrderModel';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-purchase-order-preview',

    imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './purchase-order-preview.component.html',
    styleUrl: './purchase-order-preview.component.css'
})
export class PurchaseOrderPreviewComponent implements OnInit {
    recordId: number = 0;
    record = signal<PurchaseOrder | null>(null);

    totalQty = computed(() => {
        const items = this.record()?.items || [];
        return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    });

    orientation: 'portrait' | 'landscape' = 'portrait';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private service: PurchaseOrderService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.recordId = Number(this.route.snapshot.params['id']);
        if (this.recordId) {
            this.loadData();
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                this.record.set(data);
                setTimeout(() => this.autoDetectOrientation(), 300);
            },
            error: () => {}
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
        document.getElementById('po-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'po-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    goBack(): void {
        this.router.navigate(['/purchase-order']);
    }
}
