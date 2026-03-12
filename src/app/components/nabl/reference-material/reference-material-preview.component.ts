import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ReferenceMaterialService } from '../../../services/reference-material.service';
import { ReferenceMaterial } from '../../../models/referenceMaterialModel';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-reference-material-preview',

    imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './reference-material-preview.component.html',
    styleUrl: './reference-material-preview.component.css'
})
export class ReferenceMaterialPreviewComponent implements OnInit {
    record = signal<ReferenceMaterial | null>(null);
    isLoading = signal(false);

    constructor(
        private service: ReferenceMaterialService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        const id = Number(this.route.snapshot.params['id']);
        if (id) {
            this.loadRecord(id);
        }
    }

    loadRecord(id: number): void {
        this.isLoading.set(true);
        this.service.getById(id).subscribe({
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
        this.router.navigate(['/reference-material']);
    }
}
