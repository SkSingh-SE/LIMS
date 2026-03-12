import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestRequestNablService } from '../../../../services/test-request-nabl.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { NablSignatureBlockComponent } from '../../nabl-signature-block/nabl-signature-block.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-test-request-nabl-preview',
    standalone: true,
    imports: [CommonModule, NablPrintHeaderComponent, NablPrintFooterComponent, NablSignatureBlockComponent, PrintFrameComponent],
    templateUrl: './test-request-preview.component.html',
    styleUrl: './test-request-preview.component.css'
})
export class TestRequestNablPreviewComponent implements OnInit {
    sampleId: number = 0;
    data: any = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: TestRequestNablService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.sampleId = Number(params.get('id'));
            if (this.sampleId > 0) {
                this.fetchData();
            }
        });
    }

    fetchData() {
        this.service.getById(this.sampleId).subscribe({
            next: (resp) => {
                this.data = resp;
            },
            error: (err) => console.error('Error fetching preview data:', err)
        });
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/nabl/test-request']);
    }
}
