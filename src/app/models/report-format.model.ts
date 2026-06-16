export interface ReportFormat {
  id: number;
  formatCode: string;
  formatName: string;
  description?: string;
  pageLayout: string;
  pageSize: string;
  headerConfig?: any;
  isDefault: boolean;
  isLocked: boolean;
  isActive: boolean;
  sections: ReportFormatSection[];
  mappings: ReportFormatMapping[];
}

export interface ReportFormatSection {
  id: number;
  sectionType: number;
  sectionTypeName: string;
  sortOrder: number;
  config?: any;
  isVisible: boolean;
}

export interface ReportFormatMapping {
  id: number;
  laboratoryTestID?: number;
  laboratoryTestName?: string;
  testMethodID?: number;
  testMethodName?: string;
  priority: number;
}

export interface GeneratedReport {
  id: number;
  reportFormatID: number;
  formatName: string;
  sampleID: number;
  sampleNo: string;
  reportNo: string;
  certificateNo?: string;
  status: string;
  pdfPath?: string;
  generatedBy: string;
  generatedAt: string;
}

export const SECTION_TYPE_LABELS: Record<number, string> = {
  0: 'Header',
  1: 'Customer Info',
  2: 'Sample Info',
  3: 'Result Table',
  4: 'Chemical Pivot',
  5: 'Observation',
  6: 'Conformity',
  7: 'Image Gallery',
  8: 'Custom Text',
  9: 'Signature Block',
  10: 'Scope Note',
  11: 'QR Code',
  12: 'Divider',
  13: 'Page Break',
};

export const SECTION_TYPE_ICONS: Record<number, string> = {
  0: 'bi-card-heading',
  1: 'bi-person-badge',
  2: 'bi-box',
  3: 'bi-table',
  4: 'bi-grid-3x3',
  5: 'bi-chat-left-text',
  6: 'bi-check-circle',
  7: 'bi-images',
  8: 'bi-fonts',
  9: 'bi-pen',
  10: 'bi-shield-check',
  11: 'bi-qr-code',
  12: 'bi-dash',
  13: 'bi-file-break',
};
