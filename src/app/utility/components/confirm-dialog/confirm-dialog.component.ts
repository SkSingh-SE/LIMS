import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * Plain confirmation dialog (replaces native window.confirm).
 * Project pattern: @Input visible + @Output events, no MatDialog. Styles live in styles.css (.lims-confirm-*).
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="visible">
      <div class="lims-confirm-backdrop" (click)="cancel()"></div>
      <div class="lims-confirm-dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="'lims-confirm-title'">
        <div class="custom-modal-header">
          <strong id="lims-confirm-title" class="lims-confirm-title">{{ title }}</strong>
        </div>
        <div class="custom-modal-body lims-confirm-message">{{ message }}</div>
        <div class="custom-modal-footer lims-confirm-actions">
          <button type="button" class="btn-lims btn-lims-cancel" (click)="cancel()">
            <i class="bi bi-x-lg"></i><span>{{ cancelLabel }}</span>
          </button>
          <button type="button" class="btn-lims" [ngClass]="variant === 'danger' ? 'btn-lims-remove' : (variant === 'warning' ? 'btn-lims-edit' : 'btn-lims-save')" (click)="confirm()">
            <i class="bi" [ngClass]="variant === 'danger' ? 'bi-trash' : (variant === 'warning' ? 'bi-exclamation-triangle' : 'bi-check-lg')"></i><span>{{ confirmLabel }}</span>
          </button>
        </div>
      </div>
    </ng-container>
  `,
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Please confirm';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() variant: 'danger' | 'primary' | 'warning' = 'primary';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) this.cancel();
  }

  confirm(): void {
    this.confirmed.emit();
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
