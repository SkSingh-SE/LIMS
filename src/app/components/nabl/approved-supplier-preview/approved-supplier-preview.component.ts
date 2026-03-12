import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApprovedSupplierService } from '../../../services/approved-supplier.service';
import { ApprovedSupplier } from '../../../models/approvedSupplierModel';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-approved-supplier-preview',

    imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './approved-supplier-preview.component.html',
    styleUrl: './approved-supplier-preview.component.css'
})
export class ApprovedSupplierPreviewComponent implements OnInit {
    recordId: number = 0;
    record = signal<ApprovedSupplier | null>(null);
    isLoading = signal(false);

    constructor(
        private service: ApprovedSupplierService,
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
        this.router.navigate(['/approved-supplier']);
    }
}
