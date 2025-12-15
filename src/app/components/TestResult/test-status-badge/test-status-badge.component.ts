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
    const baseClass = 'badge';
    switch (this.status) {
      case 'Pending':
        return `${baseClass} bg-secondary`;
      case 'Started':
        return `${baseClass} bg-info`;
      case 'In Progress':
        return `${baseClass} bg-warning text-dark`;
      case 'Completed':
        return `${baseClass} bg-success`;
      default:
        return `${baseClass} bg-secondary`;
    }
  }
}
