import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeTrainingService } from '../../../services/employee-training.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { EmployeeTrainingRecord } from '../../../models/employeeTrainingModel';

@Component({
    selector: 'app-employee-training-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './employee-training-preview.component.html',
    styleUrl: './employee-training-preview.component.css'
})
export class EmployeeTrainingPreviewComponent implements OnInit {
    recordId: number = 0;
    record: EmployeeTrainingRecord | null = null;
    isLoading: boolean = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private trainingService: EmployeeTrainingService
    ) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.recordId = Number(params.get('id'));
            if (this.recordId > 0) {
                this.loadRecord();
            } else {
                this.isLoading = false;
            }
        });
    }

    loadRecord(): void {
        this.isLoading = true;
        this.trainingService.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.record = data;
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading training record:', err);
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
