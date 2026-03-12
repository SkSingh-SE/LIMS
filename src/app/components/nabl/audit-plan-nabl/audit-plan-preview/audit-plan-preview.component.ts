import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { AuditPlanService } from '../../../../services/audit-plan.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-audit-plan-preview',
    standalone: true,
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './audit-plan-preview.component.html',
    styleUrl: './audit-plan-preview.component.css'
})
export class AuditPlanPreviewComponent implements OnInit {
    data: any[] = [];
    isLoading = signal(true);
    headerInfo: any = {
        formatNo: 'F-50',
        docNo: 'DMSPL / Level-04 / Format / F-50',
        issueNo: '03',
        issueDate: '01.10.2021',
        revNo: '00',
        revDate: '--'
    };

    constructor(
        private service: AuditPlanService,
        private router: Router
    ) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData() {
        this.isLoading.set(true);
        this.service.getAll().subscribe(resp => {
            this.data = resp;
            if (resp.length > 0) {
                this.headerInfo.formatNo = resp[0].formatNo;
                this.headerInfo.docNo = resp[0].docNo;
            }
            this.isLoading.set(false);
        });
    }

    printPage() { window.print(); }
    goBack() { this.router.navigate(['/audit-plan']); }
}
