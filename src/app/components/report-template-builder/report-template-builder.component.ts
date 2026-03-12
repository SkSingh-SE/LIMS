import { Component, inject, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ReportTemplate, ReportSection, ReportField, FormComponent } from './models/report-template.model';
import { ReportTemplateService } from './services/report-template.service';
import { ComponentNodeRenderer } from './components/component-node-renderer.component';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

function uuid() {
  if ((window as any).crypto?.randomUUID) return (window as any).crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2, 9);
}

@Component({
  selector: 'app-report-template-builder',

  imports: [CommonModule, ReactiveFormsModule, FormsModule, DragDropModule, HttpClientModule, ComponentNodeRenderer],
  templateUrl: './report-template-builder.component.html',
  styleUrls: ['./report-template-builder.component.scss']
})
export class ReportTemplateBuilderComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ReportTemplateService);
  private route = inject(ActivatedRoute);

  template: ReportTemplate = {
    templateName: 'New Template',
    moduleName: 'Default',
    components: []
  };

  livePreview = false;

  // currently selected component
  selectedComponent: FormComponent | null = null;

  @ViewChild('propertyHost', { read: ViewContainerRef, static: true }) propertyHost!: ViewContainerRef;

  palette = [
    {
      group: 'Basic', items: [
        { type: 'text', label: 'Text' }, { type: 'number', label: 'Number' }, { type: 'textarea', label: 'TextArea' }, { type: 'date', label: 'Date' }, { type: 'dropdown', label: 'Dropdown' }, { type: 'checkbox', label: 'Checkbox' }, { type: 'radio', label: 'Radio' }, { type: 'file', label: 'File' }
      ]
    },
    {
      group: 'Layout', items: [
        { type: 'section', label: 'Section' }, { type: 'panel', label: 'Panel' }, { type: 'row', label: 'Row' }, { type: 'column', label: 'Column' }, { type: 'table', label: 'Table' }
      ]
    },
    {
      group: 'Advanced', items: [
        { type: 'html', label: 'HTML Block' }, { type: 'divider', label: 'Divider' }, { type: 'signature', label: 'Signature' }, { type: 'dynamic', label: 'Dynamic Data Field' }
      ]
    }
  ];

  propertyForm: FormGroup = this.fb.group({});

  // undo/redo stacks
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadTemplate(+id);
    this.pushHistory();
    // migrate older sections to components if present
    if ((this.template as any).sections && !(this.template as any).components) {
      (this.template as any).components = (this.template as any).sections.map((s: any) => ({ ...s, type: 'section' }));
    }
  }

  pushHistory() {
    this.undoStack.push(JSON.stringify(this.template));
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length < 2) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.template = JSON.parse(prev);
  }

  redo() {
    if (!this.redoStack.length) return;
    const next = this.redoStack.pop()!;
    this.template = JSON.parse(next);
    this.undoStack.push(next);
  }

  dropToCanvas(event: CdkDragDrop<any[]>) {
    const data = event.item.data;
    const comp: FormComponent = {
      id: uuid(),
      type: data.type,
      label: data.label || data.type,
      key: this.generateUniqueKey((data.type || 'comp').toString()),
      components: []
    } as any;

    // special handling for row -> create 2 columns
    if (data.type === 'row') {
      (comp as any).columns = [
        { id: uuid(), width: 6, components: [] },
        { id: uuid(), width: 6, components: [] }
      ];
    }

    this.template.components = this.template.components || [];
    this.template.components.splice(event.currentIndex, 0, comp);
    this.pushHistory();
  }

  sectionDrop(event: any) {
    if (!this.template.components) return;
    moveItemInArray(this.template.components, event.previousIndex, event.currentIndex);
    this.pushHistory();
  }

  addFieldToSection(section: any, fieldType: string) {
    // legacy support for older section model
    const field: any = {
      id: uuid(),
      type: fieldType as any,
      label: fieldType.charAt(0).toUpperCase() + fieldType.slice(1),
      key: this.generateUniqueKey(fieldType),
      required: false,
      visible: true
    };
    section.fields = section.fields || [];
    section.fields.push(field);
    this.pushHistory();
  }

  generateUniqueKey(base: string) {
    let key = base + '_' + Math.random().toString(36).slice(2, 6);
    const exists = () => this.iterateComponents((c: any) => {
      if (c && c.key === key) return true; return false;
    });
    while (exists()) key = base + '_' + Math.random().toString(36).slice(2, 6);
    return key;
  }

  iterateComponents(fn: (c: any) => boolean) {
    const comps = this.template.components || [];
    const stack = [...comps];
    while (stack.length) {
      const c = stack.shift()!;
      if (!c) continue;
      if (fn(c)) return true;
      if (c.components) stack.push(...c.components);
      if (c.columns) stack.push(...(c.columns as any[]).flatMap((col: any) => col.components || []));
    }
    return false;
  }

  // simplified: handle drops within nested lists (ComponentNodeRenderer emits drops)
  handleDrop(event: CdkDragDrop<any[]>, targetContainer?: any) {
    if (!event) return;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const data = event.item.data;
      const field: any = {
        id: uuid(),
        type: data.type,
        label: data.label || data.type,
        key: this.generateUniqueKey((data.type || 'field').toString())
      };
      event.container.data.splice(event.currentIndex, 0, field);
    }
    this.pushHistory();
  }

  selectComponent(c: FormComponent) {
    this.selectedComponent = c;
    this.loadPropertyEditor();
  }

  async loadPropertyEditor() {
    try {
      this.propertyHost.clear();
      const mod = await import('./components/property-editor.component');
      const compRef = this.propertyHost.createComponent(mod.PropertyEditorComponent);
      compRef.instance.component = this.selectedComponent;
      compRef.instance.changed.subscribe((updated: FormComponent) => {
        // nothing else required, model updated in editor
        this.pushHistory();
      });
      compRef.instance.close.subscribe(() => this.propertyHost.clear());
    } catch (e) {
      console.error('Failed to load property editor', e);
    }
  }

  // kept for backward compatibility
  applyProperties() { this.pushHistory(); }

  deleteComponentAtIndex(idx: number) {
    if (!confirm('Delete this component?')) return;
    (this.template.components || []).splice(idx, 1);
    this.pushHistory();
  }

  addColumn(section: ReportSection) {
    section.columns = section.columns || [];
    const col = { id: uuid(), header: 'Column', key: this.generateUniqueKey('col') };
    section.columns.push(col as any);
    this.pushHistory();
  }

  deleteColumn(section: ReportSection, idx: number) {
    if (!confirm('Delete this column?')) return;
    section.columns!.splice(idx, 1);
    this.pushHistory();
  }

  saveTemplate() {
    const body = {
      templateName: this.template.templateName,
      moduleName: this.template.moduleName,
      version: (this.template.version || 0) + 1,
      schemaJson: JSON.stringify(this.template)
    };
    this.service.saveTemplate(body).subscribe(res => {
      alert('Saved');
      this.template.version = body.version;
      this.pushHistory();
    }, err => { alert('Save failed'); });
  }

  loadTemplate(id: number) {
    this.service.loadTemplate(id).subscribe(res => {
      try {
        const parsed = JSON.parse(res.jsonStructure);
        this.template = parsed;
        this.template.templateName = res.templateName || this.template.templateName;
        this.pushHistory();
      } catch (e) { alert('Invalid template JSON'); }
    });
  }

  exportJson() {
    const data = JSON.stringify(this.template, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (this.template.templateName || 'template') + '.json';
    a.click(); URL.revokeObjectURL(url);
  }

  importJson(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result as string);
        this.template = parsed;
        this.pushHistory();
      } catch (e) { alert('Invalid JSON'); }
    };
    r.readAsText(file);
  }

  handleImport(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input || !input.files || !input.files.length) return;
    const file = input.files[0];
    this.importJson(file);
    // reset input value so same file can be re-imported if needed
    input.value = '';
  }
  trackByComp(_: number, item: any) { return item.id; }

  cloneComponent(comp: FormComponent) {
    const copy = JSON.parse(JSON.stringify(comp));
    const regenerate = (c: any) => {
      c.id = uuid();
      if (c.components) c.components.forEach((cc: any) => regenerate(cc));
      if (c.columns) c.columns.forEach((col: any) => col.components && col.components.forEach((cc: any) => regenerate(cc)));
    };
    regenerate(copy);
    this.template.components = this.template.components || [];
    this.template.components.push(copy);
    this.pushHistory();
  }

  copyComponentTo(container: any, component: FormComponent) {
    const copy = JSON.parse(JSON.stringify(component));
    copy.id = uuid();
    copy.key = this.generateUniqueKey(copy.type || 'field');
    container.components = container.components || [];
    container.components.push(copy);
    this.pushHistory();
  }
}
