import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MethodValidationNablService } from '../../../../services/method-validation-nabl.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { NablSignatureBlockComponent } from '../../nabl-signature-block/nabl-signature-block.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-method-validation-nabl-preview',
    standalone: true,
    imports: [CommonModule, NablPrintHeaderComponent, NablPrintFooterComponent, NablSignatureBlockComponent, PrintFrameComponent],
    templateUrl: './method-validation-preview.component.html',
    styleUrl: './method-validation-preview.component.css'
})
export class MethodValidationNablPreviewComponent implements OnInit {
    recordId: number = 0;
    data: any = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: MethodValidationNablService
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
        this.router.navigate(['/nabl/method-validation']);
    }
}
