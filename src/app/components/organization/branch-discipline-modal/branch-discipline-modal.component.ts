import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationAdminService, BranchDisciplineItem, AvailableDisciplineItem } from '../../../services/organization-admin.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-branch-discipline-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-discipline-modal.component.html',
  styleUrls: ['./branch-discipline-modal.component.css']
})
export class BranchDisciplineModalComponent implements OnInit, OnChanges {
  @Input() branchId: number | null = null;
  @Input() branchName: string = '';
  @Input() visible: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  private orgAdminService = inject(OrganizationAdminService);
  private toastService = inject(ToastService);

  assignedDisciplines: BranchDisciplineItem[] = [];
  availableDisciplines: AvailableDisciplineItem[] = [];
  selectedDisciplineId: number | null = null;
  selectedIsAccredited: boolean = false;
  isLoading: boolean = false;

  ngOnInit(): void {
    if (this.visible && this.branchId) {
      this.loadDisciplines();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.branchId) {
      this.loadDisciplines();
    }
  }

  loadDisciplines(): void {
    if (!this.branchId) return;
    this.isLoading = true;
    this.orgAdminService.getBranchDisciplines(this.branchId).subscribe({
      next: (res) => {
        this.assignedDisciplines = res.assignedDisciplines || [];
        this.availableDisciplines = res.availableDisciplines || [];
        this.selectedDisciplineId = this.availableDisciplines.length > 0 ? this.availableDisciplines[0].id : null;
        this.selectedIsAccredited = false;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.show(err.error?.message || 'Failed to load branch disciplines.', 'error');
      }
    });
  }

  assignDiscipline(): void {
    if (!this.branchId || !this.selectedDisciplineId) {
      this.toastService.show('Please select a discipline to assign.', 'error');
      return;
    }

    this.orgAdminService.assignDiscipline(this.branchId, {
      disciplineID: this.selectedDisciplineId,
      isAccredited: this.selectedIsAccredited
    }).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Discipline assigned successfully.', 'success');
        this.loadDisciplines();
        this.updated.emit();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to assign discipline.', 'error');
      }
    });
  }

  removeDiscipline(disciplineId: number, disciplineName: string): void {
    if (!this.branchId) return;
    if (!confirm(`Are you sure you want to remove '${disciplineName}' from this branch?`)) return;

    this.orgAdminService.removeDiscipline(this.branchId, disciplineId).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Discipline removed successfully.', 'success');
        this.loadDisciplines();
        this.updated.emit();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to remove discipline.', 'error');
      }
    });
  }

  toggleAccreditation(discipline: BranchDisciplineItem): void {
    if (!this.branchId) return;
    const newStatus = !discipline.isAccredited;

    this.orgAdminService.toggleDisciplineAccreditation(this.branchId, discipline.disciplineID, {
      isAccredited: newStatus
    }).subscribe({
      next: (res) => {
        discipline.isAccredited = newStatus;
        this.toastService.show(res.message || 'Accreditation status updated.', 'success');
        this.updated.emit();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to update accreditation status.', 'error');
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
