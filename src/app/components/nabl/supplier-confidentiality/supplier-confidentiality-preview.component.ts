import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { SupplierConfidentialityService } from '../../../services/supplier-confidentiality.service';
import { SupplierConfidentiality } from '../../../models/supplierConfidentialityModel';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';

@Component({
    selector: 'app-supplier-confidentiality-preview',

    imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
    templateUrl: './supplier-confidentiality-preview.component.html',
    styleUrl: './supplier-confidentiality-preview.component.css'
})
export class SupplierConfidentialityPreviewComponent implements OnInit {
    record = signal<SupplierConfidentiality | null>(null);
    isLoading = signal(false);

    constructor(
        private service: SupplierConfidentialityService,
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
        this.router.navigate(['/supplier-confidentiality-agreement']);
    }
}
