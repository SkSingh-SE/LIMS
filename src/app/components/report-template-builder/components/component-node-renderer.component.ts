import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormComponent, ColumnDefinition } from '../models/report-template.model';

@Component({
  selector: 'rtb-component-node',

  imports: [CommonModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="component-node card shadow-sm mb-2 p-2" [class.selected]="selectedId === component.id">
    <div class="d-flex justify-content-between align-items-center">
      <div class="d-flex align-items-center gap-2">
        <span class="drag-handle" cdkDragHandle>☰</span>
        <div class="comp-title">{{component.label || component.type}}</div>
        <small class="text-muted">{{component.type}}</small>
      </div>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-secondary" (click)="$emitClone(); $event.stopPropagation()">Clone</button>
        <button class="btn btn-outline-danger" (click)="$emitDelete(); $event.stopPropagation()">Del</button>
      </div>
    </div>

    <div *ngIf="component.type === 'row'" class="row drop-row mt-2">
      <div *ngFor="let col of component.columns; let ci = index" class="col" [ngClass]="'col-md-' + col.width">
        <div class="drop-zone p-2" cdkDropList [cdkDropListData]="col.components" (cdkDropListDropped)="$emitDrop($event, col)">
          <div *ngIf="!col.components || !col.components.length" class="empty-hint">Drop components here</div>
          <rtb-component-node *ngFor="let child of col.components; trackBy: trackById" [component]="child" (select)="$emitSelect(child)" (delete)="$emitDeleteChild(col, child)" (clone)="$emitCloneChild(col, child)" (drop)="$emitDrop($event, col)"></rtb-component-node>
        </div>
      </div>
    </div>

    <div *ngIf="component.type === 'column'" class="drop-zone mt-2 p-2" cdkDropList [cdkDropListData]="component.components" (cdkDropListDropped)="$emitDrop($event, component)">
      <div *ngIf="!component.components || !component.components.length" class="empty-hint">Drop components here</div>
      <rtb-component-node *ngFor="let child of component.components; trackBy: trackById" [component]="child" (select)="$emitSelect(child)" (delete)="$emitDeleteChild(component, child)" (clone)="$emitCloneChild(component, child)" (drop)="$emitDrop($event, component)"></rtb-component-node>
    </div>

    <div *ngIf="isField(component)" class="field-render mt-2">
      <div class="p-2 bg-white border">{{component.label || component.key}}</div>
    </div>
  </div>
  `,
  styles: [
    `.component-node { border: 1px dashed transparent; }`,
    `.component-node.selected { border-color: #dc3545; }`,
    `.drop-zone { min-height: 40px; border: 1px dashed #e6e6e6; background: #fafafa; }`,
    `.empty-hint { color: #999; font-size: 12px; padding: 8px; }`,
    `.drag-handle { cursor: move; padding-right:6px; }`
  ]
})
export class ComponentNodeRenderer {
  @Input() component!: FormComponent;
  @Input() selectedId?: string | null;
  @Output() select = new EventEmitter<FormComponent>();
  @Output() delete = new EventEmitter<void>();
  @Output() clone = new EventEmitter<void>();
  @Output() drop = new EventEmitter<CdkDragDrop<any>>();

  isField(c: FormComponent) {
    return !['row', 'column', 'section', 'panel'].includes(c.type);
  }

  trackById(_: number, item: any) { return item.id; }

  $emitSelect(c: FormComponent) { this.select.emit(c); }
  $emitDelete() { this.delete.emit(); }
  $emitClone() { this.clone.emit(); }
  $emitDrop(e: CdkDragDrop<any>, target: any) { this.drop.emit(e); }
  $emitDeleteChild(container: any, child: FormComponent) { this.delete.emit(); }
  $emitCloneChild(container: any, child: FormComponent) { this.clone.emit(); }
}
