import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SpecificationRequirementService } from '../../services/specification-requirement.service';
import { SpecificationVersionService, SpecificationVersionDropdownItem } from '../../services/specification-version.service';
import { SpecificationMasterService, SpecificationGradeDto } from '../../services/specification-master.service';
import { ToastService } from '../../services/toast.service';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import {
  SpecificationRequirementContext,
  SpecificationRequirementItem,
  CopyVersionRequirementsPayload
} from '../../models/specification-requirement.model';
import { RequirementModalComponent } from './requirement-modal/requirement-modal.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-specification-requirement',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchableDropdownComponent,
    RequirementModalComponent,
    BreadcrumbComponent
  ],
  templateUrl: './specification-requirement.component.html',
  styleUrls: ['./specification-requirement.component.css']
})
export class SpecificationRequirementComponent implements OnInit {
  selectedSpec: any = null;
  versions: SpecificationVersionDropdownItem[] = [];
  selectedVersionId: number | null = null;
  selectedVersion: SpecificationVersionDropdownItem | null = null;

  grades: SpecificationGradeDto[] = [];
  selectedGradeId: number | null = null;
  selectedGrade: SpecificationGradeDto | null = null;

  context: SpecificationRequirementContext | null = null;
  requirements: SpecificationRequirementItem[] = [];
  filteredRequirements: SpecificationRequirementItem[] = [];

  searchTerm = '';

  // Modal States
  showRequirementModal = false;
  modalRequirementId = 0;
  modalIsViewMode = false;

  showCopyModal = false;
  copySourceVersionId: number | null = null;
  copyGradeOption: 'current' | 'all' = 'current';
  isCloning = false;

  showActivateModal = false;
  isActivating = false;

  getSpecDropdown = (term: string, page: number, size: number) =>
    this.specMasterService.getSpecificationDropdown(term, page, size);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reqService: SpecificationRequirementService,
    private versionService: SpecificationVersionService,
    private specMasterService: SpecificationMasterService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const specId = params['specId'] ? Number(params['specId']) : null;
      const versionId = params['versionId'] ? Number(params['versionId']) : null;
      const gradeId = params['gradeId'] ? Number(params['gradeId']) : null;

      if (specId) {
        this.specMasterService.getSpecificationById(specId).subscribe({
          next: (spec) => {
            if (spec) {
              this.selectedSpec = {
                id: spec.id,
                name: spec.aliasName || spec.name,
                code: spec.code,
                standardReference: spec.standardReference
              };
              this.loadVersionsAndGrades(spec.id, versionId, gradeId);
            }
          },
          error: () => {}
        });
      }
    });
  }

  onSpecificationSelected(spec: any): void {
    this.selectedSpec = spec;
    this.versions = [];
    this.selectedVersionId = null;
    this.selectedVersion = null;
    this.grades = [];
    this.selectedGradeId = null;
    this.selectedGrade = null;
    this.context = null;
    this.requirements = [];
    this.filteredRequirements = [];

    if (!spec || !spec.id) return;

    this.loadVersionsAndGrades(spec.id);
  }

  private loadVersionsAndGrades(specId: number, targetVersionId?: number | null, targetGradeId?: number | null): void {
    // 1. Load Versions (including Draft and Superseded for configuration)
    this.versionService.getDropdownBySpecification(specId, true).subscribe({
      next: (versions) => {
        this.versions = versions || [];

        if (this.versions.length > 0) {
          if (targetVersionId && this.versions.some(v => v.id === targetVersionId)) {
            this.selectedVersionId = targetVersionId;
          } else {
            // Select default version, or active version, or first version
            const def = this.versions.find(v => v.isDefault) || this.versions.find(v => v.status === 1) || this.versions[0];
            this.selectedVersionId = def.id;
          }
          this.selectedVersion = this.versions.find(v => v.id === this.selectedVersionId) || null;
        }

        // 2. Load Grades from modern SpecificationMasterService (including inactive so requirements can be inspected)
        this.specMasterService.getGrades(specId, true).subscribe({
          next: (grades) => {
            this.grades = grades || [];
            if (this.grades.length > 0) {
              if (targetGradeId && this.grades.some(g => g.id === targetGradeId)) {
                this.selectedGradeId = targetGradeId;
              } else {
                this.selectedGradeId = this.grades[0].id;
              }
              this.selectedGrade = this.grades.find(g => g.id === this.selectedGradeId) || null;
            } else {
              this.selectedGradeId = null;
              this.selectedGrade = null;
            }

            this.onContextChanged();
          },
          error: () => {
            this.grades = [];
            this.selectedGradeId = null;
            this.selectedGrade = null;
            this.onContextChanged();
          }
        });
      },
      error: () => {}
    });
  }

  onVersionChange(versionId: any): void {
    this.selectedVersionId = Number(versionId);
    this.selectedVersion = this.versions.find(v => v.id === this.selectedVersionId) || null;
    this.onContextChanged();
  }

  onGradeChange(gradeId: any): void {
    this.selectedGradeId = Number(gradeId);
    this.selectedGrade = this.grades.find(g => g.id === this.selectedGradeId) || null;
    this.onContextChanged();
  }

  onContextChanged(): void {
    if (!this.selectedSpec?.id || !this.selectedVersionId || !this.selectedGradeId) {
      return;
    }

    // Update query params in URL for bookmarking/navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        specId: this.selectedSpec.id,
        versionId: this.selectedVersionId,
        gradeId: this.selectedGradeId
      },
      queryParamsHandling: 'merge'
    });

    this.loadRequirements();
  }

  loadRequirements(): void {
    if (!this.selectedSpec?.id || !this.selectedVersionId || !this.selectedGradeId) return;

    this.reqService.getContext(this.selectedSpec.id, this.selectedVersionId, this.selectedGradeId).subscribe({
      next: (ctx) => {
        this.context = ctx;
      },
      error: (err) => {
        this.toast.show(err?.error?.message || 'Failed to load requirement context', 'error');
      }
    });

    this.reqService.getList(this.selectedVersionId, this.selectedGradeId).subscribe({
      next: (list) => {
        this.requirements = list || [];
        this.applyFilters();
      },
      error: (err) => {
        this.toast.show(err?.error?.message || 'Failed to load requirements', 'error');
      }
    });
  }

  applyFilters(): void {
    let result = [...this.requirements];

    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.trim().toLowerCase();
      result = result.filter(r =>
        (r.parameterName && r.parameterName.toLowerCase().includes(q)) ||
        (r.parameterCode && r.parameterCode.toLowerCase().includes(q)) ||
        (r.parameterSymbol && r.parameterSymbol.toLowerCase().includes(q)) ||
        (r.formattedLimits && r.formattedLimits.toLowerCase().includes(q)) ||
        (r.conditionsSummary && r.conditionsSummary.toLowerCase().includes(q)) ||
        (r.testMethodsSummary && r.testMethodsSummary.toLowerCase().includes(q))
      );
    }

    this.filteredRequirements = result;
  }

  getStatusBadgeClass(status?: string | number): string {
    const s = String(status !== undefined && status !== null ? status : '').toLowerCase();
    if (s === 'draft' || s === '0') return 'bg-warning-subtle text-warning-emphasis border-warning-subtle';
    if (s === 'active' || s === '1') return 'bg-success-subtle text-success-emphasis border-success-subtle';
    if (s === 'superseded' || s === '2') return 'bg-secondary-subtle text-secondary-emphasis border-secondary-subtle';
    return 'bg-light text-dark border-secondary-subtle';
  }

  getStatusIcon(status?: string | number): string {
    const s = String(status !== undefined && status !== null ? status : '').toLowerCase();
    if (s === 'draft' || s === '0') return 'bi-pencil-fill';
    if (s === 'active' || s === '1') return 'bi-check-circle-fill';
    if (s === 'superseded' || s === '2') return 'bi-archive-fill';
    return 'bi-info-circle-fill';
  }

  getStatusLabel(status?: string | number): string {
    const s = String(status !== undefined && status !== null ? status : '').toLowerCase();
    if (s === 'draft' || s === '0') return 'Draft (Editable)';
    if (s === 'active' || s === '1') return 'Active (Immutable)';
    if (s === 'superseded' || s === '2') return 'Superseded (Immutable)';
    return 'Withdrawn';
  }

  openAddRequirement(): void {
    if (!this.context?.isEditable) {
      this.toast.show('Requirements can only be added to Draft versions.', 'warning');
      return;
    }
    this.modalRequirementId = 0;
    this.modalIsViewMode = false;
    this.showRequirementModal = true;
  }

  openEditRequirement(item: SpecificationRequirementItem): void {
    if (item.isLocked || !this.context?.isEditable) {
      this.openViewRequirement(item);
      return;
    }
    this.modalRequirementId = item.id;
    this.modalIsViewMode = false;
    this.showRequirementModal = true;
  }

  openViewRequirement(item: SpecificationRequirementItem): void {
    this.modalRequirementId = item.id;
    this.modalIsViewMode = true;
    this.showRequirementModal = true;
  }

  onModalClosed(refresh: boolean): void {
    this.showRequirementModal = false;
    this.modalRequirementId = 0;
    this.modalIsViewMode = false;
    if (refresh) {
      this.loadRequirements();
    }
  }

  deleteRequirement(item: SpecificationRequirementItem): void {
    if (item.isLocked || !this.context?.isEditable) {
      this.toast.show('Cannot delete requirements from an Active or Superseded version.', 'warning');
      return;
    }

    const confirmMsg = `Are you sure you want to delete requirement for '${item.parameterName}'?`;
    if (!confirm(confirmMsg)) return;

    this.reqService.delete(item.id).subscribe({
      next: (res) => {
        this.toast.show(res.message || 'Requirement deleted successfully', 'success');
        this.loadRequirements();
      },
      error: (err) => {
        this.toast.show(err?.error?.message || 'Failed to delete requirement', 'error');
      }
    });
  }

  openCopyModal(): void {
    if (!this.context?.isEditable) {
      this.toast.show('Copying requirements is only permitted into Draft versions.', 'warning');
      return;
    }
    // Default source version to active version or first other version
    const otherVer = this.versions.find(v => v.id !== this.selectedVersionId);
    this.copySourceVersionId = otherVer ? otherVer.id : null;
    this.copyGradeOption = 'current';
    this.showCopyModal = true;
  }

  submitCopyVersion(): void {
    if (!this.copySourceVersionId || !this.selectedVersionId) {
      this.toast.show('Please select a source version to copy from.', 'warning');
      return;
    }

    this.isCloning = true;
    const payload: CopyVersionRequirementsPayload = {
      sourceVersionID: this.copySourceVersionId,
      targetVersionID: this.selectedVersionId,
      specificationGradeID: this.copyGradeOption === 'current' ? (this.selectedGradeId || undefined) : undefined
    };

    this.reqService.copyVersion(payload).subscribe({
      next: (res) => {
        this.toast.show(res.message || 'Requirements cloned successfully', 'success');
        this.isCloning = false;
        this.showCopyModal = false;
        this.loadRequirements();
      },
      error: (err) => {
        this.isCloning = false;
        this.toast.show(err?.error?.message || 'Failed to clone requirements', 'error');
      }
    });
  }

  openActivateModal(): void {
    if (!this.context?.isEditable) {
      this.toast.show('Only Draft versions can be activated.', 'warning');
      return;
    }
    this.showActivateModal = true;
  }

  confirmActivateVersion(): void {
    if (!this.selectedVersionId) return;

    this.isActivating = true;
    this.reqService.activateVersion(this.selectedVersionId).subscribe({
      next: (res) => {
        this.toast.show(res.message || 'Version activated successfully', 'success');
        this.isActivating = false;
        this.showActivateModal = false;
        // Reload versions to reflect new status
        if (this.selectedSpec?.id) {
          this.loadVersionsAndGrades(this.selectedSpec.id, this.selectedVersionId, this.selectedGradeId);
        }
      },
      error: (err) => {
        this.isActivating = false;
        this.toast.show(err?.error?.message || 'Failed to activate version', 'error');
      }
    });
  }

  navigateToSpecificationMaster(): void {
    this.router.navigate(['/specification'], {
      queryParams: { specId: this.selectedSpec?.id }
    });
  }

  navigateToVersionMaster(): void {
    this.router.navigate(['/specification-version'], {
      queryParams: { specId: this.selectedSpec?.id }
    });
  }

  navigateToAddVersion(): void {
    this.router.navigate(['/specification-version'], {
      queryParams: { specId: this.selectedSpec?.id, action: 'add' }
    });
  }

  navigateToGradeMaster(): void {
    this.router.navigate(['/specification'], {
      queryParams: { specId: this.selectedSpec?.id, action: 'grade' }
    });
  }

  formatEquation(eq?: string): string {
    if (!eq) return '';
    return eq.replace(/\{P4\}/gi, '{BHN}')
             .replace(/\{P8\}/gi, '{HV}')
             .replace(/\{P9\}/gi, '{HRC}')
             .replace(/\{P1\}/gi, '{AG}')
             .replace(/\{P2\}/gi, '{AL}')
             .replace(/\{P3\}/gi, '{AS}')
             .replace(/\{P240\}/gi, '{YIELD_LOAD}')
             .replace(/\{P237\}/gi, '{CROSS_SECTION_AREA}');
  }
}
