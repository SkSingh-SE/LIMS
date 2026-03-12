import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IncomingMaterialService } from '../../../services/incoming-material.service';
import { IncomingMaterial } from '../../../models/incomingMaterialModel';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-incoming-material-preview',

    imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './incoming-material-preview.component.html',
    styleUrl: './incoming-material-preview.component.css'
})
export class IncomingMaterialPreviewComponent implements OnInit {
    recordId: number = 0;
    record = signal<IncomingMaterial | null>(null);
    isLoading = signal(false);

    constructor(
        private service: IncomingMaterialService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.recordId = Number(this.route.snapshot.params['id']);
        if (this.recordId) {
            this.loadData();
        }
    }

    loadData(): void {
        this.isLoading.set(true);
        this.service.getById(this.recordId).subscribe({
            next: (data) => {
                this.record.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/incoming-material']);
    }
}
