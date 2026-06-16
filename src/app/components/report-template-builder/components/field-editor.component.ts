import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportField } from '../models/report-template.model';

@Component({
  selector: 'rtb-field-editor',

  imports: [CommonModule],
  template: `
    <div class="p-2 border rounded bg-white shadow-sm">
      <div class="d-flex justify-content-between">
        <div><strong>{{field.label}}</strong> <small class="text-muted">({{field.type}})</small></div>
        <div>
          <button class="btn btn-sm btn-outline-secondary" (click)="$emitCopy()">Copy</button>
          <button class="btn btn-sm btn-outline-danger" (click)="$emitDelete()">Del</button>
        </div>
      </div>
    </div>
  `
})
export class FieldEditorComponent {
  @Input() field!: ReportField;
  @Output() delete = new EventEmitter<void>();
  @Output() copy = new EventEmitter<void>();
  $emitDelete() { this.delete.emit(); }
  $emitCopy() { this.copy.emit(); }
}
