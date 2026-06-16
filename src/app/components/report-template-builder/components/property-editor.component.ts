import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { FormComponent } from '../models/report-template.model';

@Component({
  selector: 'rtb-property-editor',

  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="property-editor">
    <form [formGroup]="form" (ngSubmit)="apply()">
      <div class="mb-2">
        <label class="form-label small">Label</label>
        <input class="form-control form-control-sm" formControlName="label" />
      </div>
      <div class="mb-2">
        <label class="form-label small">Key</label>
        <input class="form-control form-control-sm" formControlName="key" />
      </div>
      <div class="mb-2 d-flex gap-2">
        <div class="flex-fill">
          <label class="form-label small">Width (1-12)</label>
          <input class="form-control form-control-sm" type="number" min="1" max="12" formControlName="width" />
        </div>
        <div>
          <label class="form-label small">Hidden</label>
          <input type="checkbox" formControlName="hidden" />
        </div>
      </div>

      <div *ngIf="isDropdown()" class="mb-2">
        <label class="form-label small">Options (value | label per line)</label>
        <textarea class="form-control form-control-sm" rows="4" formControlName="options"></textarea>
      </div>

      <div class="mb-2">
        <label class="form-label small">Bind to LIMS Data</label>
        <select class="form-control form-control-sm" formControlName="bindTo">
          <option value="">-- none --</option>
          <option value="SampleNo">SampleNo</option>
          <option value="ReportNo">ReportNo</option>
          <option value="CustomerName">CustomerName</option>
          <option value="TestDate">TestDate</option>
          <option value="BatchNo">BatchNo</option>
        </select>
      </div>

      <div class="d-flex gap-1 mt-2">
        <button class="btn btn-sm btn-danger" type="submit">Apply</button>
        <button class="btn btn-sm btn-outline-secondary" type="button" (click)="close.emit()">Close</button>
      </div>
    </form>
  </div>
  `
})
export class PropertyEditorComponent implements OnInit {
  @Input() component!: FormComponent | null;
  @Output() changed = new EventEmitter<FormComponent>();
  @Output() close = new EventEmitter<void>();

  form!: FormGroup;
  private fb = new FormBuilder();

  ngOnInit() {
    const c = this.component || ({} as FormComponent);
    this.form = this.fb.group({
      label: [c.label || ''],
      key: [c.key || ''],
      width: [c.width || 12],
      hidden: [!!c.hidden],
      options: [(c.options || []).map((o: any) => (o.value || o).toString() + ' | ' + (o.label || o)).join('\n')],
      bindTo: [(c as any).bindTo || '']
    });
  }

  isDropdown() { return this.component?.type === 'dropdown' || this.component?.type === 'radio'; }

  apply() {
    if (!this.component) return;
    const v = this.form.value;
    this.component.label = v.label;
    this.component.key = v.key;
    this.component.width = +v.width;
    this.component.hidden = !!v.hidden;
    (this.component as any).bindTo = v.bindTo || null;
    if (this.isDropdown()) {
      const opts = (v.options || '').split(/\r?\n/).map((l: string) => {
        const parts = l.split('|').map((s: string) => s.trim());
        return { value: parts[0] || parts[1], label: parts[1] || parts[0] };
      }).filter((o: any) => o.label);
      this.component.options = opts as any;
    }
    this.changed.emit(this.component);
  }
}
