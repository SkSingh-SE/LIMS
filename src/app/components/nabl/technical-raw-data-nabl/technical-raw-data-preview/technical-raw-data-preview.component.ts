import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TechnicalRawDataNablService } from '../../../../services/technical-raw-data-nabl.service';
import { TechnicalRawDataNabl } from '../../../../models/technicalRawDataNablModel';
import { ToastService } from '../../../../services/toast.service';
import { NablPrintHeaderComponent } from '../../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../print-frame/print-frame.component';

@Component({
    selector: 'app-technical-raw-data-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './technical-raw-data-preview.component.html',
    styleUrl: './technical-raw-data-preview.component.css'
})
export class TechnicalRawDataPreviewComponent implements OnInit {
    record: TechnicalRawDataNabl | null = null;
    isLoading = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: TechnicalRawDataNablService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.service.getById(Number(idParam)).subscribe({
                next: (data) => {
                    if (data) {
                        this.record = data;
                    } else {
                        this.toastService.show('Record not found', 'error');
                        this.router.navigate(['/nabl/technical-raw-data']);
                    }
                    this.isLoading = false;
                },
                error: () => {
                    this.toastService.show('Error loading preview', 'error');
                    this.router.navigate(['/nabl/technical-raw-data']);
                    this.isLoading = false;
                }
            });
        }
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/nabl/technical-raw-data']);
    }
}
