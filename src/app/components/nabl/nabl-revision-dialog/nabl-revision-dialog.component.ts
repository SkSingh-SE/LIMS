import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RevisionDialogResult {
    revisionType: 'Minor' | 'Major';
    reason: string;
}

@Component({
    selector: 'app-nabl-revision-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './nabl-revision-dialog.component.html',
    styleUrl: './nabl-revision-dialog.component.scss',
})
export class NablRevisionDialogComponent {
    @Input() visible = false;
    @Output() onConfirm = new EventEmitter<RevisionDialogResult>();
    @Output() onCancel = new EventEmitter<void>();

    revisionType: 'Minor' | 'Major' = 'Minor';
    reason = '';

    confirm(): void {
        if (!this.reason.trim()) return;
        this.onConfirm.emit({ revisionType: this.revisionType, reason: this.reason.trim() });
        this.reset();
    }

    cancel(): void {
        this.onCancel.emit();
        this.reset();
    }

    private reset(): void {
        this.revisionType = 'Minor';
        this.reason = '';
    }
}
