import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupplierEvaluationRecordService } from '../../../../services/supplier-evaluation-record.service';
import { SupplierEvaluationRecord } from '../../../../models/supplierEvaluationRecordModel';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-supplier-evaluation-record-preview',

    imports: [CommonModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './supplier-evaluation-record-preview.component.html',
    styleUrls: ['./supplier-evaluation-record-preview.component.css']
})
export class SupplierEvaluationRecordPreviewComponent implements OnInit {
    record: SupplierEvaluationRecord | null = null;
    isLoading = true;
    recordId: number | null = null;
    currentDate = new Date();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: SupplierEvaluationRecordService
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.recordId = +params['id'];
                this.loadRecord();
            } else {
                alert('No record identifier provided');
                this.router.navigate(['/supplier-evaluation']);
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
                    this.router.navigate(['/supplier-evaluation']);
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
        this.router.navigate(['/supplier-evaluation']);
    }
}
