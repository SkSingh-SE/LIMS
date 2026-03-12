import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MasterDocumentService } from '../../../../services/master-document.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-master-document-preview',
    standalone: true,
    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './master-document-preview.component.html',
    styleUrl: './master-document-preview.component.css'
})
export class MasterDocumentPreviewComponent implements OnInit {
    data: any[] = [];
    isLoading = signal(true);
    headerInfo: any = {
        formatNo: 'F-43',
        docNo: 'DMSPL / Level-04 / Format / F-43',
        issueNo: '03',
        issueDate: '01.10.2021',
        revNo: '00',
        revDate: '--'
    };

    constructor(private service: MasterDocumentService, private router: Router) { }

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
    goBack() { this.router.navigate(['/master-document']); }
}
