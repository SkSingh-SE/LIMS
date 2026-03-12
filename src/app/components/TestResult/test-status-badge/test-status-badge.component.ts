import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-status-badge',

  imports: [CommonModule],
  template: `
    <span [ngClass]="getBadgeClass()">
      {{ status }}
    </span>
  `,
  styles: [`
    span {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: capitalize;
      display: inline-block;
    }
  `]
})
export class TestStatusBadgeComponent {
  @Input() status: string = 'Pending'; // 'Pending' | 'Started' | 'In Progress' | 'Completed' | 'Active'  | 'Paused'

  getBadgeClass(): string {
    const base = 'badge';

    switch (this.status) {

      // ===== Inward Flow =====
      case 'NOT_STARTED':
        return `${base} bg-secondary`;

      case 'INWARD_REGISTERED':
        return `${base} bg-info`;

      case 'INWARD_COMPLETED':
        return `${base} bg-success`;

      case 'UNDER_PLANNING':
        return `${base} bg-warning text-dark`;

      case 'UNDER_REVIEW':
        return `${base} bg-warning text-dark`;

      case 'REVIEW_COMPLETED':
        return `${base} bg-info`;

      case 'IN_PROGRESS':
        return `${base} bg-warning text-dark`;

      case 'PARTIALLY_COMPLETED':
        return `${base} bg-warning text-dark`;

      case 'COMPLETED':
        return `${base} bg-success`;

      case 'REJECTED':
        return `${base} bg-danger`;

      case 'CANCELLED':
        return `${base} bg-dark`;

      // ===== Existing Testing / Reporting statuses (unchanged) =====
      case 'Pending':
        return `${base} bg-secondary`;

      case 'Started':
        return `${base} bg-info`;

      case 'In Progress':
        return `${base} bg-warning text-dark`;

      case 'Long-Term':
        return `${base} bg-warning text-dark`;

      case 'Completed':
        return `${base} bg-success`;

      case 'Force Completed':
        return `${base} bg-warning text-dark`;

      case 'Ready for Report':
        return `${base} bg-success`;

      case 'Report Pending':
        return `${base} bg-warning text-dark`;

      case 'Approved':
        return `${base} bg-success`;

      case 'Rejected':
        return `${base} bg-danger`;

      case 'Report Generated':
        return `${base} bg-dark-1 text-white`;

      case 'Under Amendment Review':
        return `${base} bg-secondary`;

      case 'Draft':
        return `${base} bg-info`;

      default:
        return `${base} bg-secondary`;
    }
  }


}
