import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeAuthorizationService } from '../../../services/employee-authorization.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';
import { EmployeeAuthorization } from '../../../models/employeeAuthorizationModel';

@Component({
    selector: 'app-employee-authorization-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './employee-authorization-preview.component.html',
    styleUrl: './employee-authorization-preview.component.css'
})
export class EmployeeAuthorizationPreviewComponent implements OnInit {
    authorizations: EmployeeAuthorization[] = [];
    isLoading: boolean = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authService: EmployeeAuthorizationService
    ) { }

    ngOnInit(): void {
        this.loadAuthorizations();
    }

    loadAuthorizations(): void {
        this.isLoading = true;
        this.authService.getAll({}).subscribe({
            next: (data) => {
                this.authorizations = data.items;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading authorizations:', err);
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
