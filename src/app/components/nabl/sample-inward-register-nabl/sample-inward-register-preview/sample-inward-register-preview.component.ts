import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SampleInwardRegisterNablService } from '../../../../services/sample-inward-register-nabl.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-sample-inward-register-nabl-preview',
    standalone: true,
    imports: [CommonModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './sample-inward-register-preview.component.html',
    styleUrl: './sample-inward-register-preview.component.css'
})
export class SampleInwardRegisterNablPreviewComponent implements OnInit {
    recordId: number = 0;
    data: any = null;
    protected readonly Math = Math;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: SampleInwardRegisterNablService
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
        const style = document.createElement('style');
        style.textContent = '@page { size: A4 landscape; }';
        document.head.appendChild(style);
        window.addEventListener('afterprint', () => document.head.removeChild(style), { once: true });
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/nabl/sample-inward-register']);
    }
}
