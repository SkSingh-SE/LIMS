import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PurchaseMaterialVerificationService } from '../../../../services/purchase-material-verification.service';
import { PurchaseMaterialVerification } from '../../../../models/purchaseMaterialVerificationModel';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
@Component({
    selector: 'app-purchase-material-verification-preview',
    imports: [CommonModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './purchase-material-verification-preview.component.html',
    styleUrls: ['./purchase-material-verification-preview.component.css']
})
export class PurchaseMaterialVerificationPreviewComponent implements OnInit {
    record: PurchaseMaterialVerification | null = null;
    isLoading = true;
    recordId: number | null = null;
    currentDate = new Date();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: PurchaseMaterialVerificationService
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.recordId = +params['id'];
                this.loadRecord();
            } else {
                alert('No record identifier provided');
                this.router.navigate(['/purchase-material-verification']);
            }
        });
    }

    loadRecord(): void {
        if (!this.recordId) return;

        this.isLoading = true;
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                this.isLoading = false;
                if (data) {
                    this.record = data;
                } else {
                    alert('Record not found');
                    this.router.navigate(['/purchase-material-verification']);
                }
            },
            error: () => {
                this.isLoading = false;
                alert('Error loading record details');
            }
        });
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/purchase-material-verification']);
    }
}
