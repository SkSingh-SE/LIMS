import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HasPermissionDirective } from '../../../utility/directives/has-permission.directive';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../../utility/components/pagination/pagination.component';
import { parseTestMethodSpecImport, ParsedTestMethodSpecRow } from '../test-method-spec-import.helper';
import * as ExcelJS from 'exceljs';

@Component({
  selector: 'app-test-method-specification-list',
  imports: [ CommonModule, RouterModule, FormsModule, HasPermissionDirective, PaginationComponent ],
  templateUrl: './test-method-specification-list.component.html',
  styleUrl: './test-method-specification-list.component.css'
})
export class TestMethodSpecificationListComponent implements OnInit {
  @ViewChild('filterModal') filterModal!: ElementRef;

  // Import-related state
  importBuilding = false;
  importPreviewVisible = false;
  importPreviewRows: ParsedTestMethodSpecRow[] = [];
  importing = false;

  // Import preview filter + sort
  importStatusFilter: 'all' | 'ok' | 'warning' | 'error' = 'all';
  importSortColumn = 'rowNumber';
  importSortOrder: 'asc' | 'desc' = 'asc';

  get importOkCount(): number { return this.importPreviewRows.filter(r => r.status === 'ok').length; }
  get importWarnCount(): number { return this.importPreviewRows.filter(r => r.status === 'warning').length; }
  get importErrorCount(): number { return this.importPreviewRows.filter(r => r.status === 'error').length; }
  get importHasImportable(): boolean { return this.importPreviewRows.some(r => r.status !== 'error'); }
  get importPdfCount(): number { return this.importPreviewRows.filter(r => r.pdfFound).length; }

  /** Filtered + sorted rows for the preview table */
  get importFilteredRows(): ParsedTestMethodSpecRow[] {
    let rows = [...this.importPreviewRows];

    // Filter by status
    if (this.importStatusFilter !== 'all') {
      rows = rows.filter(r => r.status === this.importStatusFilter);
    }

    // Sort
    const col = this.importSortColumn;
    const dir = this.importSortOrder === 'asc' ? 1 : -1;
    rows.sort((a: any, b: any) => {
      const av = a[col] ?? '';
      const bv = b[col] ?? '';
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });

    return rows;
  }

  onImportFilter(status: 'all' | 'ok' | 'warning' | 'error'): void {
    this.importStatusFilter = status;
  }

  formatMessages(messages: string[] | undefined): string {
    return messages ? messages.join('; ') : '';
  }

  onImportSort(column: string): void {
    if (this.importSortColumn === column) {
      this.importSortOrder = this.importSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.importSortColumn = column;
      this.importSortOrder = 'asc';
    }
  }

  importSortIcon(column: string): string {
    if (this.importSortColumn !== column) return 'bi-chevron-expand';
    return this.importSortOrder === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down';
  }

  columns = [
    { key: 'id', type: 'number', label: 'SN', filter: false },
    { key: 'displayTitle', type: 'string', label: 'Display Name', filter: true },
    { key: 'standardOrganizationName', type: 'string', label: 'Standard Organization', filter: true },
    { key: 'testMethodStandard', type: 'string', label: 'Standard', filter: true },
    { key: 'defaultVersion', type: 'string', label: 'Default Version', filter: true },
    { key: 'defaultVersionYear', type: 'string', label: 'Year', filter: true },
    { key: 'isDisabled', type: 'bool', label: 'Disabled', filter: true },
    { key: 'modifiedOn', type: 'date', label: 'Modified At', filter: true },
  ];
  filterColumnTypes: Record<string, 'string' | 'number' | 'date' | 'bool'> = {
    displayTitle: 'string',
    standardOrganizationName: 'string',
    testMethodStandard: 'string',
    defaultVersion: 'string',
    defaultVersionYear: 'string',
    isDisabled: 'bool',
    modifiedOn: 'date',
  };

  filters: { column: string; type: string; value: any; value2?: any }[] = [];
  filterColumn: string = 'string';
  filterColumnTitle: string = 'string';
  filterType: string = 'Contains';
  filterValue: string = '';
  filterValue2: string = '';
  filterPosition = { top: '0px', left: '0px' };
  isFilterOpen = false;

  testMethodSpecificationList: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100, 200, 500];

  sortByColumn: string = 'modifiedOn';
  sortOrder: string = 'desc';
  searchTerm: string = '';

  payload = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    searchTerm: this.searchTerm,
    sortByColumn: this.sortByColumn,
    sortOrder: this.sortOrder,
    filter: this.filters ?? null
  };

  constructor(private fb: FormBuilder, private testMethodService: TestMethodSpecificationService, private toastService: ToastService) {

  }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {

    this.testMethodService.getAllTestMethodSpecifications(this.payload).subscribe({
      next: (response) => {
        this.testMethodSpecificationList = response?.items || [];
        this.totalItems = response?.totalRecords || 0;
        this.pageSize = response?.pageSize || 10;
        this.pageNumber = response?.pageNumber || 1;
      },
      error: (error) => {
        this.testMethodSpecificationList = [];
      }

    });

  }

  // ── Download Template ──────────────────────────────────────────────────────
  async downloadTemplate(): Promise<void> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Published Standards');

    // Define columns
    ws.columns = [
      { header: 'Standard Organization', key: 'org', width: 28 },
      { header: 'Test Method Standard', key: 'std', width: 30 },
      { header: 'Part / Sec', key: 'part', width: 16 },
      { header: 'Official Standard Title', key: 'title', width: 50 },
      { header: 'Version', key: 'version', width: 12 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'File in Updated Std List', key: 'pdf', width: 28 },
    ];

    // Header styling
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDA261C' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;

    // Example data row (row 2)
    ws.addRow({
      org: 'IS',
      std: '2062',
      part: 'Part 1',
      title: 'Hot Rolled Medium and High Tensile Structural Steel',
      version: 'E250A',
      year: '2021',
      pdf: 'IS-2062-Part-1-E250A.pdf',
    });

    // Hint row (row 3) — light yellow, italic, explanatory
    const hintRow = ws.addRow({});
    hintRow.getCell(1).value = '→ Replace example data above. Leave "File in Updated Std List" blank if no PDF.';
    hintRow.font = { italic: true, color: { argb: 'FF666666' }, size: 9 };
    hintRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
    ws.mergeCells(`A${hintRow.number}:G${hintRow.number}`);

    // Bold headers row again as row 4 (repeated for clarity after hint)
    const headerRepeat = ws.addRow(headerRow.values as any);
    headerRepeat.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRepeat.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDA261C' } };
    headerRepeat.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRepeat.height = 22;

    // Freeze top row
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // Generate and download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TestMethodSpec_Import_Template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // ── Import: Parse + Validate + Commit ──────────────────────────────────────
  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rows = await parseTestMethodSpecImport(reader.result as ArrayBuffer);
        if (!rows.length) { this.toastService.show('No data rows found in the Published Standards sheet.', 'warning'); return; }

        // Validate against backend: check orgs, duplicates, and resolve PDF
        this.importBuilding = true;
        this.testMethodService.validateImport(rows.map(r => ({
          rowNumber: r.rowNumber,
          standardOrganization: r.standardOrganization,
          testMethodStandard: r.testMethodStandard,
          part: r.part,
          officialTitle: r.officialTitle,
          version: r.version,
          year: r.year,
          pdfFileName: r.fileInUpdatedStdList,  // column G — exact PDF filename from Excel
        }))).subscribe({
          next: (validationResults: any[]) => {
            // Merge backend validation into parsed rows
            validationResults.forEach(vr => {
              const row = rows.find(r => r.rowNumber === vr.rowNumber);
              if (row) {
                row.standardOrganizationID = vr.standardOrganizationID;
                row.exists = vr.exists;
                row.existingSpecId = vr.existingSpecId;
                row.pdfFileName = vr.pdfFileName;
                row.pdfFound = vr.pdfFound;
                if (vr.status === 'error' && vr.messages?.length) {
                  row.status = 'error';
                  vr.messages.forEach((m: string) => {
                    if (!row.messages.includes(m)) row.messages.push(m);
                  });
                }
              }
            });
            this.importPreviewRows = rows;
            this.importStatusFilter = 'all';
            this.importSortColumn = 'rowNumber';
            this.importSortOrder = 'asc';
            this.importPreviewVisible = true;
            this.importBuilding = false;
          },
          error: () => {
            this.importBuilding = false;
            this.toastService.show('Failed to validate import data.', 'error');
          }
        });
      } catch (e: any) {
        this.toastService.show(e?.message || 'Failed to read the Excel file.', 'error');
      } finally {
        input.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  cancelImport(): void {
    this.importPreviewVisible = false;
    this.importPreviewRows = [];
  }

  commitImport(): void {
    const rows = this.importPreviewRows.filter(r => r.status !== 'error');
    if (!rows.length) { this.toastService.show('No importable rows.', 'warning'); return; }

    this.importing = true;
    this.testMethodService.bulkImport(rows.map(r => ({
      rowNumber: r.rowNumber,
      standardOrganization: r.standardOrganization,
      testMethodStandard: r.testMethodStandard,
      part: r.part,
      officialTitle: r.officialTitle,
      version: r.version,
      year: r.year,
      pdfFileName: r.pdfFileName || r.fileInUpdatedStdList,  // resolved PDF filename
    }))).subscribe({
      next: (result: any) => {
        this.importing = false;
        let msg = `${result.imported} specification(s) imported successfully.`;
        if (result.skipped > 0) msg += ` ${result.skipped} skipped.`;
        if (result.errors?.length) {
          const sampleErrors = result.errors.slice(0, 3).join('; ');
          msg += ` Errors: ${sampleErrors}${result.errors.length > 3 ? '...' : ''}`;
        }
        this.toastService.show(msg, result.imported > 0 ? 'success' : 'warning');
        this.cancelImport();
        this.fetchData();
      },
      error: (err) => {
        this.importing = false;
        this.toastService.show(err?.error?.message || 'Bulk import failed.', 'error');
      }
    });
  }

  applySorting(column: string) {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.payload.sortByColumn = this.sortByColumn;
    this.payload.sortOrder = this.sortOrder;
    this.fetchData();
  }

  openFilterModal(column: string, event: MouseEvent) {
    this.filterColumn = column;
    this.columns.forEach(col => {
      if (col.key === column) {
        this.filterColumnTitle = col.label;
      }
    })
    this.filterValue = '';
    this.filterValue2 = '';

    // Determine filter type dynamically
    const columnType = this.filterColumnTypes[column];
    switch (columnType) {
      case 'string':
        this.filterType = 'Contains';
        break;
      case 'number':
        this.filterType = 'Equal';
        break;
      case 'date':
        this.filterType = 'Between';
        break;
      default:
        this.filterType = 'Contains';
    }

    this.isFilterOpen = true;
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (this.filterModal) {
      const modal = this.filterModal.nativeElement;
      modal.style.display = 'block';
      modal.style.top = `${rect.bottom + window.scrollY - 53}px`;
      modal.style.left = `${rect.left + window.scrollX}px`;

      // Clamp to viewport so the popup doesn't overflow
      requestAnimationFrame(() => {
        const modalRect = modal.getBoundingClientRect();
        if (modalRect.right > window.innerWidth) {
          modal.style.left = `${window.innerWidth - modalRect.width - 10 + window.scrollX}px`;
        }
        if (modalRect.bottom > window.innerHeight) {
          modal.style.top = `${rect.top + window.scrollY - modalRect.height - 5}px`;
        }
      });
    }
  }

  applyFilter() {
    if (!this.filterColumn || this.filterValue === '') return;

    const existingFilterIndex = this.filters.findIndex(f => f.column === this.filterColumn);
    const filterData = { column: this.filterColumn, type: this.filterType, value: this.filterValue, value2: this.filterValue2 };

    if (existingFilterIndex > -1) {
      this.filters[existingFilterIndex] = filterData;
    } else {
      this.filters.push(filterData);
    }

    this.payload.filter = this.filters;
    this.fetchData();
    this.closeFilterModal();
  }

  resetFilter(column: string) {
    this.filters = this.filters.filter(filter => filter.column !== column);
    this.payload.filter = this.filters;
    this.fetchData();
  }

  closeFilterModal() {
    if (this.filterModal) {
      this.filterModal.nativeElement.style.display = 'none';
    }
  }

  onPageChange(page: number) {
    this.pageNumber = page;
    this.payload.PageNumber = this.pageNumber;
    this.fetchData();
  }

  changePageSize(event: Event) {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageNumber = 1; // Reset to first page
    this.payload.PageNumber = this.pageNumber;
    this.payload.PageSize = this.pageSize;
    this.fetchData();
  }

  onSearch() {
    if (this.searchTerm !== this.payload.searchTerm) {
      this.pageNumber = 1;
      this.payload.PageNumber = 1;
      this.payload.searchTerm = this.searchTerm;
      this.fetchData();
    }
  }

  get totalPages(): number[] {
    return Array.from({ length: Math.ceil(this.totalItems / this.pageSize) }, (_, i) => i + 1);
  }
  getStartRecord(): number {
    return this.totalItems === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }


  hasFilter(column: string): boolean {
    return this.filters?.some(f => f.column === column) ?? false;
  }
  getColumnType(columnKey: string): string | undefined {
    const column = this.columns.find(col => col.key === columnKey);
    return column ? column.type : undefined;
  }
  deleteFn(id: number): void {
    if (id <= 0) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      this.testMethodService.deleteTestMethodSpecification(id).subscribe({
        next: (response) => {
          this.fetchData();
          this.toastService.show(response.message, 'success');
        },
        error: (error) => {
          this.toastService.show(error.message, 'error');
        }
      });
    }
  }
}

