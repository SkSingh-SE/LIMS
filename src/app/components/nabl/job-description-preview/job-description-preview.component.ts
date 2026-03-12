import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JobDescriptionService } from '../../../services/job-description.service';
import { JobDescription } from '../../../models/jobDescriptionModel';
import { ToastService } from '../../../services/toast.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';

@Component({
    selector: 'app-job-description-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './job-description-preview.component.html',
    styleUrl: './job-description-preview.component.css'
})

export class JobDescriptionPreviewComponent implements OnInit {
    jobDesc: JobDescription | null = null;
    isLoading = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private jobDescriptionService: JobDescriptionService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.jobDescriptionService.getById(Number(idParam)).subscribe({
                next: (data) => {
                    if (data) {
                        this.jobDesc = data;
                    } else {
                        this.toastService.show('Job Description not found', 'error');
                        this.router.navigate(['/job-description']);
                    }
                    this.isLoading = false;
                },
                error: () => {
                    this.toastService.show('Error loading preview', 'error');
                    this.router.navigate(['/job-description']);
                    this.isLoading = false;
                }
            });
        }
    }

    printPage(): void {
        const originalTitle = document.title;
        document.title = ''; // Temporarily clear title to remove "LIMS" from browser header
        window.print();
        document.title = originalTitle; // Restore title
    }

    goBack(): void {
        this.router.navigate(['/job-description']);
    }
}
