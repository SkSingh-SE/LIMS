import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SampleMusterRegisterNablService } from '../../../../services/sample-muster-register-nabl.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-sample-muster-register-nabl-preview',
    standalone: true,
    imports: [CommonModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './sample-muster-register-preview.component.html',
    styleUrl: './sample-muster-register-preview.component.css'
})
export class SampleMusterRegisterNablPreviewComponent implements OnInit {
    recordId: number = 0;
    data: any = null;
    protected readonly Math = Math;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: SampleMusterRegisterNablService
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
        this.router.navigate(['/nabl/sample-muster-register']);
    }
}
