import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeCompetenceService } from '../../../services/employee-competence.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { EmployeeCompetenceReport } from '../../../models/employeeCompetenceModel';

@Component({
    selector: 'app-employee-competence-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './employee-competence-preview.component.html',
    styleUrl: './employee-competence-preview.component.css'
})
export class EmployeeCompetencePreviewComponent implements OnInit {
    reportId: number = 0;
    report: EmployeeCompetenceReport | null = null;
    isLoading: boolean = true;
    ratingOptions = ['Excellent', 'Very Good', 'Good', 'Average', 'Poor'];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private competenceService: EmployeeCompetenceService
    ) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.reportId = Number(params.get('id'));
            if (this.reportId > 0) {
                this.loadReport();
            } else {
                this.isLoading = false;
            }
        });
    }

    loadReport(): void {
        this.isLoading = true;
        this.competenceService.getById(this.reportId).subscribe({
            next: (data) => {
                if (data) {
                    this.report = data;
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading competence report:', err);
                this.isLoading = false;
            }
        });
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/employee']);
    }
}
