export interface ReportTemplate {
  templateId?: number;
  templateName: string;
  moduleName: string;
  version?: number;
  // backwards compatible sections but a modern schema uses `components`
  sections?: ReportSection[];
  components?: FormComponent[];
}

export type ComponentType =
  | 'text' | 'number' | 'textarea' | 'date' | 'dropdown' | 'checkbox' | 'radio' | 'file'
  | 'section' | 'panel' | 'row' | 'column' | 'table' | 'html' | 'divider' | 'signature' | 'dynamic';

export interface FormComponentBase {
  id: string;
  type: ComponentType;
  key?: string;
  label?: string;
  cssClass?: string;
  hidden?: boolean;
  readonly?: boolean;
  locked?: boolean;
  width?: number; // bootstrap-like width (1-12)
  validate?: ValidationRules;
  conditional?: ConditionalLogic | null;
}

export interface FormComponent extends FormComponentBase {
  // layout components
  components?: FormComponent[]; // children for section, panel, column
  // row specific
  columns?: ColumnDefinition[];
  // field specific
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  tableColumns?: ReportColumn[];
}

export interface ColumnDefinition {
  id: string;
  width: number; // 1-12
  components: FormComponent[];
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: string; // expression
}

export interface ConditionalLogic {
  operator?: 'AND' | 'OR';
  conditions?: Array<{ when: string; eq: any }>; // simple eq conditions
}

export interface ReportSection extends FormComponent {
  title?: string;
  isTable?: boolean;
  collapsed?: boolean;
}

export interface ReportField extends FormComponent {
  // reuse base properties
}

export interface ReportColumn {
  id: string;
  header: string;
  key: string;
}
