import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-status-badge',
  standalone: true,
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
      // -------- Testing --------
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

      // -------- Reporting --------
      case 'Ready for Report':
        return `${base} bg-success`;

      case 'Report Pending':
        return `${base} bg-warning text-dark`;

      case 'Approved':
        return `${base} bg-success`;

      case 'Rejected':
        return `${base} bg-danger`;

      // -------- Optional --------
      case 'Draft':
        return `${base} bg-info`;

      default:
        return `${base} bg-secondary`;
    }
  }

}
