import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeService } from '../../../services/employee.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';

@Component({
    selector: 'app-impartiality-agreement-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './impartiality-agreement-preview.component.html',
    styleUrl: './impartiality-agreement-preview.component.css'
})
export class ImpartialityAgreementPreviewComponent implements OnInit {
    employeeId: number = 0;
    employee: any = null;
    isLoading: boolean = true;
    currentDate: Date = new Date();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private employeeService: EmployeeService
    ) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.employeeId = Number(params.get('id'));
            if (this.employeeId > 0) {
                this.loadEmployee();
            } else {
                this.isLoading = false;
            }
        });
    }

    loadEmployee(): void {
        this.isLoading = true;
        this.employeeService.getEmployeeById(this.employeeId).subscribe({
            next: (data) => {
                this.employee = data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading employee:', err);
                this.isLoading = false;
            }
        });
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/employee/edit', this.employeeId]);
    }
}
