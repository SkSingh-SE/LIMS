import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { SkillMatrixService } from '../../../../services/skill-matrix.service';
import { NablPrintHeaderComponent } from '../../../nabl/nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../../nabl/nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../../nabl/print-frame/print-frame.component';
import { SkillMatrix } from '../../../../models/skillMatrixModel';
import { DesignationService } from '../../../../services/designation.service';

@Component({
    selector: 'app-skill-matrix-preview',

    imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
    templateUrl: './skill-matrix-preview.component.html',
    styleUrl: './skill-matrix-preview.component.css'
})
export class SkillMatrixPreviewComponent implements OnInit {
    matrix: SkillMatrix | null = null;
    matrixId: number = 0;

    designations: any[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private skillMatrixService: SkillMatrixService,
        private designationService: DesignationService
    ) { }

    ngOnInit(): void {
        this.loadDesignations();
        this.route.paramMap.subscribe(params => {
            this.matrixId = Number(params.get('id'));
            if (this.matrixId > 0) {
                this.loadMatrix();
            } else {
                // Default to first one for now if no ID
                this.loadFirstMatrix();
            }
        });
    }

    loadDesignations() {
        this.designationService.getDesignationDropdown('', 1, 100).subscribe({
            next: (res: any) => {
                this.designations = res?.items || [];
            },
            error: (err: any) => {
                console.error('Error loading designations:', err);
            }
        });
    }

    loadMatrix(): void {
        this.skillMatrixService.getById(this.matrixId).subscribe({
            next: (data: any) => {
                if (data) {
                    this.matrix = data;
                    this.resolveTitle();
                }
            },
            error: (err: any) => {
                console.error('Error loading skill matrix:', err);
            }
        });
    }

    loadFirstMatrix(): void {
        this.skillMatrixService.getAll().subscribe({
            next: (data: any) => {
                if (data && data.items.length > 0) {
                    this.matrix = data.items[0];
                    this.resolveTitle();
                }
            },
            error: (err: any) => {
                console.error('Error loading skill matrices:', err);
            }
        });
    }

    printPage(): void {
        window.print();
    }

    resolveTitle() {
        if (this.matrix && this.designations.length) {
            const found = this.designations.find(d => d.id == this.matrix?.title);
            if (found) {
                this.matrix.title = found.name;
            }
        }
    }

    goBack(): void {
        this.router.navigate(['/employee']);
    }
}
