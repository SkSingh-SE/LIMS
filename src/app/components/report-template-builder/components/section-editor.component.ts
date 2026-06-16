import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormComponent } from '../models/report-template.model';
import { DragDropModule } from '@angular/cdk/drag-drop';

type LocalSection = FormComponent & {
  collapsed?: boolean;
  fields?: any[];
  components?: any[];
  tableColumns?: any[];
  columns?: any[];
  isTable?: boolean;
  title?: string;
};

@Component({
  selector: 'rtb-section-editor',

  imports: [CommonModule, DragDropModule],
  template: `
  <div class="card shadow-sm mb-2 section-card" [class.collapsed]="section.collapsed">
    <div class="card-body p-2" (click)="$event.stopPropagation()">
      <div class="d-flex justify-content-between align-items-center">
        <div class="section-title" (click)="toggle()">{{section.title}}</div>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-danger" (click)="$emitDeleteSection(); $event.stopPropagation()">Del</button>
          <button class="btn btn-sm btn-outline-secondary" (click)="$emitCloneSection(); $event.stopPropagation()">Clone</button>
        </div>
      </div>
      <div *ngIf="!section.collapsed" class="mt-2">
        <ng-container *ngIf="!section.isTable">
          <div class="fields-list">
            <div *ngFor="let f of (section.fields || section.components || []); let i = index" class="field-row d-flex justify-content-between align-items-center p-1" (click)="$emitSelect(f); $event.stopPropagation()">
              <div>{{f.label}} <small class="text-muted">({{f.type}})</small></div>
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-secondary" (click)="$emitCopyField(f); $event.stopPropagation()">Copy</button>
                <button class="btn btn-sm btn-outline-danger" (click)="$emitDeleteField(i); $event.stopPropagation()">Del</button>
              </div>
            </div>
          </div>
        </ng-container>
        <ng-container *ngIf="section.isTable">
          <div class="columns-list">
            <div *ngFor="let c of (section.tableColumns || section.columns || []); let i = index" class="column-row d-flex justify-content-between align-items-center p-1">
              <div>{{c.header}}</div>
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-danger" (click)="$emitDeleteColumn(i); $event.stopPropagation()">Del</button>
              </div>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  </div>
  `
})
export class SectionEditorComponent {
  @Input() section!: LocalSection;
  @Output() select = new EventEmitter<any>();
  @Output() deleteSection = new EventEmitter<void>();
  @Output() cloneSection = new EventEmitter<void>();
  @Output() deleteField = new EventEmitter<number>();
  @Output() copyField = new EventEmitter<any>();
  @Output() deleteColumn = new EventEmitter<number>();

  toggle() { this.section.collapsed = !this.section.collapsed; }
  $emitSelect(f: any) { this.select.emit(f); }
  $emitDeleteSection() { this.deleteSection.emit(); }
  $emitCloneSection() { this.cloneSection.emit(); }
  $emitDeleteField(i: number) { this.deleteField.emit(i); }
  $emitCopyField(f: any) { this.copyField.emit(f); }
  $emitDeleteColumn(i: number) { this.deleteColumn.emit(i); }
}
