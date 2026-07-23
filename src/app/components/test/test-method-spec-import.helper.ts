import * as ExcelJS from 'exceljs';

/**
 * Parsed row from the Test Method Specification import Excel file.
 * Sheet: "Published Standards"
 * Columns: Standard Organization | Test Method Standard | Part / Sec | Official Standard Title | Version | Year
 */
export interface ParsedTestMethodSpecRow {
  rowNumber: number;
  standardOrganization: string;
  testMethodStandard: string;
  part: string;
  officialTitle: string;
  version: string;
  year: string;
  status: 'ok' | 'warning' | 'error';
  messages: string[];
  // Resolved during validation
  standardOrganizationID?: number;
  exists?: boolean;
  existingSpecId?: number;
  // PDF matching (from backend validation)
  pdfFileName?: string;
  pdfFound?: boolean;
}

const SHEET_NAME = 'Published Standards';

/** Parse the "Published Standards" sheet from the uploaded Excel workbook. */
export async function parseTestMethodSpecImport(buffer: ArrayBuffer): Promise<ParsedTestMethodSpecRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const sheet = wb.getWorksheet(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found in the Excel file.`);

  const out: ParsedTestMethodSpecRow[] = [];

  sheet.eachRow((row, i) => {
    if (i === 1) return; // skip header row
    const getCell = (col: number): string => {
      const v = row.getCell(col).value;
      if (v == null) return '';
      if (typeof v === 'object') {
        const o = v as any;
        if ('text' in o) return (o.text ?? '').toString().trim();
        if ('result' in o) return (o.result ?? '').toString().trim();
      }
      return v.toString().trim();
    };

    // Columns: A=Standard Organization, B=Test Method Standard, C=Part / Sec, D=Official Standard Title, E=Version, F=Year
    const standardOrganization = getCell(1);
    const testMethodStandard = getCell(2);
    const part = getCell(3);
    const officialTitle = getCell(4);
    const version = getCell(5);
    const year = getCell(6);

    // Skip fully empty rows
    if (!standardOrganization && !testMethodStandard && !officialTitle) return;

    const messages: string[] = [];
    let status: ParsedTestMethodSpecRow['status'] = 'ok';
    const fail = (msg: string) => { messages.push(msg); status = 'error'; };
    const warn = (msg: string) => { messages.push(msg); if (status === 'ok') status = 'warning'; };

    if (!standardOrganization) fail('Standard Organization is required.');
    if (!testMethodStandard) fail('Test Method Standard is required.');
    if (!officialTitle) warn('Official Standard Title is empty — Name will be auto-generated.');
    if (!version) warn('Version is empty — will be set from Year.');
    if (!year) warn('Year is empty.');

    out.push({
      rowNumber: i,
      standardOrganization,
      testMethodStandard,
      part,
      officialTitle,
      version,
      year,
      status,
      messages,
    });
  });

  return out;
}

/** Generate a display title from import row fields. */
export function generateDisplayTitle(row: ParsedTestMethodSpecRow): string {
  let title = `${row.standardOrganization} ${row.testMethodStandard}`;
  if (row.part) title += ` ${row.part}`;
  if (row.version) title += ` ${row.version}`;
  if (row.year) title += ` (${row.year})`;
  return title;
}

/** Generate the Name (Official Standard Title fallback) from import row. */
export function generateName(row: ParsedTestMethodSpecRow): string {
  if (row.officialTitle) return row.officialTitle;
  // Fallback: build from parts
  let name = `${row.standardOrganization} ${row.testMethodStandard}`;
  if (row.part) name += ` ${row.part}`;
  return name;
}

/** Org name → PDF folder name (mirrors backend). */
const orgFolderMap: Record<string, string> = {
  'ANSI/NACE (AMPP)': 'NACE',
  'NACE (AMPP)': 'NACE',
};

/**
 * Generate the expected PDF filename for a given row.
 * Mirrors backend's ConstructPdfPrefix logic.
 */
export function generateExpectedPdfFileName(row: ParsedTestMethodSpecRow): string {
  const orgAbbr = orgFolderMap[row.standardOrganization?.trim()] || row.standardOrganization?.trim() || '';
  let stdPart = (row.testMethodStandard || '').replace(/\//g, '-').replace(/\s+/g, '-');
  while (stdPart.includes('--')) stdPart = stdPart.replace('--', '-');
  const prefix = `${orgAbbr}-${stdPart}`;

  // Same candidate logic as backend
  const candidates: string[] = [];
  if (row.version) {
    const verDigits = (row.version.match(/\d+/g) || []).join('');
    if (verDigits) candidates.push(`${prefix}-${verDigits}.pdf`);
    if (row.year && row.year.length >= 2) candidates.push(`${prefix}-${row.year.slice(-2)}.pdf`);
  }
  if (row.year) candidates.push(`${prefix}-${row.year}.pdf`);
  candidates.push(`${prefix}.pdf`);

  // Return the most specific candidate
  return candidates[0] || `${prefix}.pdf`;
}
