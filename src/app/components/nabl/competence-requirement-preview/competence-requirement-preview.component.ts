import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CompetenceRequirementService } from '../../../services/competence-requirement.service';
import { CompetenceRequirement } from '../../../models/competenceRequirementModel';
import { ToastService } from '../../../services/toast.service';
import { NablPrintHeaderComponent } from '../nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../print-frame/print-frame.component';

@Component({
  selector: 'app-competence-requirement-preview',

  imports: [CommonModule, RouterModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
  templateUrl: './competence-requirement-preview.component.html',
  styleUrl: './competence-requirement-preview.component.css'
})
export class CompetenceRequirementPreviewComponent implements OnInit {
  requirement: CompetenceRequirement | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private competenceRequirementService: CompetenceRequirementService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.competenceRequirementService.getById(Number(idParam)).subscribe({
        next: (data) => {
          if (data) {
            this.requirement = data;
          } else {
            this.toastService.show('Competence Requirement not found', 'error');
            this.router.navigate(['/competence-requirement']);
          }
          this.isLoading = false;
        },
        error: () => {
          this.toastService.show('Error loading preview', 'error');
          this.router.navigate(['/competence-requirement']);
          this.isLoading = false;
        }
      });
    }
  }

  printPage(): void {
    const originalTitle = document.title;
    document.title = '';
    window.print();
    document.title = originalTitle;
  }

  goBack(): void {
    this.router.navigate(['/competence-requirement']);
  }

  getDisplayText(): string {
    if (!this.requirement) return '';
    return this.requirement.isExternal ? (this.requirement.relatedActivity || '') : (this.requirement.positionName || '');
  }
}
