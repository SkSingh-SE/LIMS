import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CrmConsumptionService } from '../../../services/crm-consumption.service';
import { CrmConsumptionRecord } from '../../../models/crmConsumptionModel';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-crm-consumption-preview',

    imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './crm-consumption-preview.component.html',
    styleUrl: './crm-consumption-preview.component.css'
})
export class CrmConsumptionPreviewComponent implements OnInit {
    record = signal<any | null>(null);
    orientation: 'portrait' | 'landscape' = 'portrait';
    orientationManual = false;
    private orientationDetected = false;

    constructor(
        private service: CrmConsumptionService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const id = Number(this.route.snapshot.params['id']);
        if (id) {
            this.loadRecord(id);
        }
    }

    loadRecord(id: number): void {
        this.service.getById(id).subscribe({
            next: (data: any) => {
                if (!data) return;

                const crm = data.crmDetails || {};
                const header = data.consumptionHeader || {};
                const logs = data.logs || [];

                const previewRecord = {
                    // material details
                    rmCode: crm.rmCode,
                    rmName: crm.rmName,
                    type: crm.type,
                    materialClassification: crm.materialClassification,
                    batchNo: crm.batchNo,
                    certificateNo: crm.certificateNo,
                    validityDate: crm.validityDate,
                    quantity: crm.quantity,
                    date: crm.date,
                    // remarks/header
                    remarks: header.remarks || header.notes || '',
                    preparedBy: crm?.preparedBy || null,
                    reviewedBy: crm?.reviewedBy || null,
                    approvedBy: crm?.approvedBy || null,

                    // logs
                    dailyConsumption: logs.map((x: any) => ({
                        id: x.id,
                        consumptionDate: x.consumptionDate,
                        quantityConsumed: x.quantityConsumed,
                        balanceQty: x.balanceQty,
                        purpose: x.purpose,
                        equipmentOrTest: x.equipmentOrTest,
                        usedBy: x.usedBy,
                        remarks: x.remarks
                    })),

                    // summary
                    openingQuantity: header.openingQuantity ?? crm.quantity ?? 0,
                    totalConsumed: header.totalConsumed ?? logs.reduce((sum: number, x: any) => sum + Number(x.quantityConsumed || 0), 0),
                    remainingQuantity: header.remainingQuantity ?? (logs.length ? logs[logs.length - 1].balanceQty : crm.quantity)
                };

                this.record.set(previewRecord);

                setTimeout(() => this.autoDetectOrientation(), 300);
            },
            error: () => { }
        });
    }

    getMonthName(month: number): string {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1] || '';
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
        document.getElementById('crm-print-size')?.remove();
        const styleEl = document.createElement('style');
        styleEl.id = 'crm-print-size';
        styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
        document.head.appendChild(styleEl);
        const originalTitle = document.title;
        document.title = '';
        window.print();
        document.title = originalTitle;
        document.head.removeChild(styleEl);
    }

    goBack(): void {
        this.router.navigate(['/reference-material-consumption']);
    }
}
