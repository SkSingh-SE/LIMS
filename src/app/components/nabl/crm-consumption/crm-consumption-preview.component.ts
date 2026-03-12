import { Component, OnInit, signal } from '@angular/core';
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
    record = signal<CrmConsumptionRecord | null>(null);
    isLoading = signal(false);

    constructor(
        private service: CrmConsumptionService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        const id = Number(this.route.snapshot.params['id']);
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

    getMonthName(month: number): string {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1] || '';
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/reference-material-consumption']);
    }
}
