import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestMethodNablService } from '../../../../services/test-method-nabl.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { NablSignatureBlockComponent } from '../../nabl-signature-block/nabl-signature-block.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-test-method-nabl-preview',
    standalone: true,
    imports: [CommonModule, NablPrintHeaderComponent, NablPrintFooterComponent, NablSignatureBlockComponent, PrintFrameComponent],
    templateUrl: './test-method-preview.component.html',
    styleUrl: './test-method-preview.component.css'
})
export class TestMethodNablPreviewComponent implements OnInit {
    recordId: number = 0;
    data: any = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: TestMethodNablService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.recordId = Number(params.get('id'));
            if (this.recordId > 0) {
                this.fetchData();
            }
        });
    }

    fetchData() {
        this.service.getById(this.recordId).subscribe({
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
        this.router.navigate(['/nabl/test-method']);
    }
}
