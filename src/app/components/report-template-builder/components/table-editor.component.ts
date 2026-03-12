import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormComponent } from '../models/report-template.model';

type LocalSection = FormComponent & {
  title?: string;
  columns?: any[];
  tableColumns?: any[];
  isTable?: boolean;
  collapsed?: boolean;
};

@Component({
  selector: 'rtb-table-editor',

  imports: [CommonModule],
  template: `
    <div class="p-2 border rounded bg-white shadow-sm">
      <div class="d-flex justify-content-between align-items-center">
        <div><strong>{{section.title}}</strong> <small class="text-muted">Table</small></div>
      </div>
      <div class="mt-2 table-columns">
        <div *ngFor="let c of (section.columns || section.tableColumns || [])" class="p-1 border-bottom">{{c.header}}</div>
      </div>
    </div>
  `
})
export class TableEditorComponent {
  @Input() section!: LocalSection;
}
