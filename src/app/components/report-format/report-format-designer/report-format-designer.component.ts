import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { QuillModule } from 'ngx-quill';
import { ReportFormatService } from '../../../services/report-format.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import {
  ReportFormatSection,
  ReportFormatMapping,
  SECTION_TYPE_LABELS,
  SECTION_TYPE_ICONS,
} from '../../../models/report-format.model';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-report-format-designer',
  templateUrl: './report-format-designer.component.html',
  styleUrls: ['./report-format-designer.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DragDropModule,
    RouterModule,
    QuillModule,
    SearchableDropdownComponent,
  ],
})
export class ReportFormatDesignerComponent implements OnInit, CanComponentDeactivate {
  // Form
  formatForm!: FormGroup;
  submitted = false;
  saved = false;
  formatId = 0;
  isEditMode = false;

  // Section palette
  sectionPalette = Object.entries(SECTION_TYPE_LABELS).map(([key, label]) => ({
    type: +key,
    label,
    icon: SECTION_TYPE_ICONS[+key] || 'bi-square',
  }));

  // Canvas
  canvasSections: ReportFormatSection[] = [];
  selectedSection: ReportFormatSection | null = null;
  configForm!: FormGroup;

  // Mappings
  mappings: ReportFormatMapping[] = [];

  // Tab
  activeTab: 'design' | 'mappings' | 'preview' = 'design';

  // Preview
  previewSampleId = '';
  previewUrl: SafeResourceUrl | null = null;
  private rawPreviewUrl: string | null = null;

  // Labels
  SECTION_TYPE_LABELS = SECTION_TYPE_LABELS;
  SECTION_TYPE_ICONS = SECTION_TYPE_ICONS;

  // Quill RTE config
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ size: ['small', false, 'large'] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['clean'],
    ],
  };

  defaultFooterConditions =
    '<ol>' +
    '<li>DMSL certifies that the tests/calibrations were conducted on the sample submitted by the customer.</li>' +
    '<li>Reproduction of the report is not allowed without written permission of DMSL.</li>' +
    '<li>Customer-provided samples are stored for 15 days from the dispatch date.</li>' +
    '<li>DMSL shall not be responsible for result deviations due to sample discrepancy or variations in manufacturing processes.</li>' +
    '<li>The test results are valid only for the sample submitted.</li>' +
    '<li>Statement of Conformity for Y(E) is given without considering guardbands element.</li>' +
    '<li>This report shall not be used for any legal proceedings without prior written consent.</li>' +
    '</ol>';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private formatService: ReportFormatService,
    private labTestService: LaboratoryTestService,
    private toast: ToastService,
    private unsavedChangesService: UnsavedChangesService
  ) {}

  ngOnInit(): void {
    this.initForm();

    // Reset saved flag when user edits after save
    this.formatForm.valueChanges.subscribe(() => {
      if (this.saved) this.saved = false;
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.formatId = +id;
        this.isEditMode = true;
        this.loadFormat(this.formatId);
      }
    });
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.formatForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.formatForm.dirty && !this.saved) {
      $event.returnValue = true;
    }
  }

  initForm(): void {
    this.formatForm = this.fb.group({
      formatCode: ['', [Validators.required, Validators.maxLength(50)]],
      formatName: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      pageLayout: ['Portrait'],
      pageSize: ['A4'],
      isDefault: [false],
    });
  }

  loadFormat(id: number): void {
    this.formatService.getById(id).subscribe({
      next: (data) => {
        this.formatForm.patchValue({
          formatCode: data.formatCode,
          formatName: data.formatName,
          description: data.description,
          pageLayout: data.pageLayout,
          pageSize: data.pageSize,
          isDefault: data.isDefault,
        });

        this.canvasSections = (data.sections || []).map((s: any) => ({
          ...s,
          config: s.config || {},
        }));

        this.mappings = data.mappings || [];
        this.formatForm.markAsPristine();
      },
      error: () => this.toast.show('Failed to load format.', 'error'),
    });
  }

  // ── SECTION MANAGEMENT ──

  addSection(type: number): void {
    const newSection: ReportFormatSection = {
      id: 0,
      sectionType: type,
      sectionTypeName: SECTION_TYPE_LABELS[type],
      sortOrder: this.canvasSections.length,
      config: this.getDefaultConfig(type),
      isVisible: true,
    };
    this.canvasSections.push(newSection);
    this.selectSection(newSection);
    this.formatForm.markAsDirty();
  }

  removeSection(index: number): void {
    if (this.selectedSection === this.canvasSections[index]) {
      this.selectedSection = null;
    }
    this.canvasSections.splice(index, 1);
    this.reorderSections();
    this.formatForm.markAsDirty();
  }

  selectSection(section: ReportFormatSection): void {
    // Auto-save previous section's config before switching
    if (this.selectedSection && this.configForm) {
      this.selectedSection.config = this.configForm.getRawValue();
    }
    this.selectedSection = section;
    this.buildConfigForm(section);
  }

  toggleVisibility(section: ReportFormatSection): void {
    section.isVisible = !section.isVisible;
    this.formatForm.markAsDirty();
  }

  sectionDrop(event: CdkDragDrop<ReportFormatSection[]>): void {
    moveItemInArray(this.canvasSections, event.previousIndex, event.currentIndex);
    this.reorderSections();
    this.formatForm.markAsDirty();
  }

  private reorderSections(): void {
    this.canvasSections.forEach((s, i) => (s.sortOrder = i));
  }

  // ── CONFIG FORM (per section type) ──

  buildConfigForm(section: ReportFormatSection): void {
    const config = section.config || {};
    const type = section.sectionType;

    switch (type) {
      case 0: // Header
        this.configForm = this.fb.group({
          showCompanyLogo: [config.showCompanyLogo ?? true],
          showNablLogo: [config.showNablLogo ?? true],
          title: [config.title ?? 'Test Certificate'],
          showUlr: [config.showUlr ?? true],
          showCertIdentity: [config.showCertIdentity ?? true],
          showFormatNo: [config.showFormatNo ?? true],
          showFooterQr: [config.showFooterQr ?? false],
          footerConditionsText: [config.footerConditionsText || this.defaultFooterConditions],
        });
        break;

      case 1: // CustomerInfo
        this.configForm = this.fb.group({
          columns: [config.columns ?? 2],
          sectionTitle: [config.sectionTitle ?? 'INFORMATION PROVIDED BY THE CUSTOMER'],
          fields: [config.fields ?? ['POReference', 'SampleDescription', 'StampedAs', 'SampleDrawnBy', 'NatureOfSample', 'MaterialSpec']],
        });
        break;

      case 2: // SampleInfo
        this.configForm = this.fb.group({
          columns: [config.columns ?? 2],
          fields: [config.fields ?? ['SampleDescription', 'Grade', 'HeatNo', 'Dimensions', 'DateReceived', 'DateTested']],
        });
        break;

      case 3: // ResultTable
        this.configForm = this.fb.group({
          variant: [config.variant ?? 'grouped'],
          showSpecRow: [config.showSpecRow ?? true],
        });
        break;

      case 4: // ChemicalPivot
        this.configForm = this.fb.group({
          showSpecRow: [config.showSpecRow ?? true],
          showUnit: [config.showUnit ?? true],
        });
        break;

      case 5: // Observation
        this.configForm = this.fb.group({
          defaultText: [config.defaultText ?? ''],
          fontSize: [config.fontSize ?? 8],
        });
        break;

      case 6: // Conformity
        this.configForm = this.fb.group({
          passText: [config.passText ?? 'The sample conforms to the specified requirements.'],
          failText: [config.failText ?? 'The sample does NOT conform to the specified requirements.'],
          showDecisionRule: [config.showDecisionRule ?? true],
        });
        break;

      case 7: // ImageGallery
        this.configForm = this.fb.group({
          gridColumns: [config.gridColumns ?? 2],
          maxHeight: [config.maxHeight ?? 140],
          showCaptions: [config.showCaptions ?? true],
        });
        break;

      case 8: // CustomText
        this.configForm = this.fb.group({
          content: [config.content ?? ''],
          fontSize: [config.fontSize ?? 8],
          bold: [config.bold ?? false],
          italic: [config.italic ?? false],
        });
        break;

      case 9: // SignatureBlock
        this.configForm = this.fb.group({
          count: [config.count ?? 3],
          roles: [config.roles ?? ['Tested By', 'Reviewed By', 'Approved By']],
          showDesignation: [config.showDesignation ?? true],
          showStamp: [config.showStamp ?? true],
        });
        break;

      case 10: // ScopeNote
        this.configForm = this.fb.group({
          autoGenerate: [config.autoGenerate ?? true],
          customText: [config.customText ?? ''],
        });
        break;

      case 11: // QRCode
        this.configForm = this.fb.group({
          size: [config.size ?? 60],
        });
        break;

      case 12: // Divider
        this.configForm = this.fb.group({
          style: [config.style ?? 'line'],
          thickness: [config.thickness ?? 1],
        });
        break;

      default:
        this.configForm = this.fb.group({});
    }

    // Auto-sync config changes to section in real-time
    this.subscribeConfigChanges();
  }

  applyConfig(): void {
    if (!this.selectedSection) return;
    this.selectedSection.config = this.configForm.getRawValue();
    this.formatForm.markAsDirty();
    this.toast.show('Section config applied.', 'success');
  }

  // Auto-sync config to section on every form change
  private subscribeConfigChanges(): void {
    this.configForm.valueChanges.subscribe(() => {
      if (this.selectedSection) {
        this.selectedSection.config = this.configForm.getRawValue();
        this.formatForm.markAsDirty();
      }
    });
  }

  // ── FIELD TOGGLES (for CustomerInfo / SampleInfo) ──

  customerFields = [
    { key: 'CustomerName', label: 'Customer Name' },
    { key: 'Address', label: 'Address' },
    { key: 'GSTNo', label: 'GST No' },
    { key: 'POReference', label: 'PO Reference' },
    { key: 'ContactPerson', label: 'Contact Person' },
    { key: 'CertificateNo', label: 'Certificate No' },
    { key: 'UlrNo', label: 'ULR No' },
    { key: 'DateOfIssue', label: 'Date of Issue' },
    { key: 'SampleReceivedDate', label: 'Sample Received' },
    { key: 'TestPerformedAt', label: 'Test Performed At' },
    { key: 'StampedAs', label: 'Stamped As' },
    { key: 'NatureOfSample', label: 'Nature of Sample' },
    { key: 'SampleDrawnBy', label: 'Sample Drawn By' },
  ];

  sampleFields = [
    { key: 'CaseNo', label: 'Case No' },
    { key: 'SampleNo', label: 'Sample No' },
    { key: 'SampleDescription', label: 'Description' },
    { key: 'MaterialSpec', label: 'Material Spec' },
    { key: 'Grade', label: 'Grade' },
    { key: 'ProductForm', label: 'Product Form' },
    { key: 'SpecimenOrientation', label: 'Specimen Orientation' },
    { key: 'HeatTreatment', label: 'Heat Treatment' },
    { key: 'HeatNo', label: 'Heat No' },
    { key: 'BatchNo', label: 'Batch No' },
    { key: 'Quantity', label: 'Quantity' },
    { key: 'Dimensions', label: 'Dimensions' },
    { key: 'DateReceived', label: 'Date Received' },
    { key: 'DateTested', label: 'Date Tested' },
    { key: 'DateReported', label: 'Date Reported' },
    { key: 'Thickness', label: 'Thickness' },
    { key: 'Diameter', label: 'Diameter' },
    { key: 'Width', label: 'Width' },
    { key: 'Length', label: 'Length' },
    { key: 'CrossSectionArea', label: 'Cross Section Area' },
    { key: 'GaugeLength', label: 'Gauge Length' },
    { key: 'RoomTemperature', label: 'Room Temperature' },
    { key: 'RoomHumidity', label: 'Room Humidity' },
    { key: 'EquipmentUsed', label: 'Equipment Used' },
    { key: 'LabRoom', label: 'Lab Room' },
  ];

  isFieldSelected(fieldKey: string): boolean {
    const fields = this.configForm?.get('fields')?.value || [];
    return fields.includes(fieldKey);
  }

  toggleField(fieldKey: string): void {
    const fields: string[] = [...(this.configForm?.get('fields')?.value || [])];
    const idx = fields.indexOf(fieldKey);
    if (idx > -1) fields.splice(idx, 1);
    else fields.push(fieldKey);
    this.configForm.patchValue({ fields });
  }

  // ── MAPPING MANAGEMENT ──

  getLabTests = (term: string, page: number, pageSize: number) => {
    return this.labTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };

  addMapping(item: any): void {
    if (!item) return;
    const exists = this.mappings.find((m) => m.laboratoryTestID === item.id);
    if (exists) {
      this.toast.show('Test already mapped.', 'warning');
      return;
    }
    this.mappings.push({
      id: 0,
      laboratoryTestID: item.id,
      laboratoryTestName: item.name,
      priority: 0,
    });
    this.formatForm.markAsDirty();
  }

  removeMapping(index: number): void {
    this.mappings.splice(index, 1);
    this.formatForm.markAsDirty();
  }

  // ── PREVIEW ──

  getVerifiedSamples = (term: string, page: number, pageSize: number) => {
    return this.formatService.getVerifiedSamples(term, page, pageSize);
  };

  onPreviewSampleSelected(item: any): void {
    if (!item) {
      this.previewSampleId = '';
      return;
    }
    this.previewSampleId = item.id;
    this.loadPreview();
  }

  loadPreview(): void {
    if (!this.previewSampleId) {
      this.toast.show('Please select a sample.', 'warning');
      return;
    }

    this.formatService
      .previewPdf(+this.previewSampleId, this.formatId || undefined)
      .subscribe({
        next: (blob) => {
          if (this.rawPreviewUrl) URL.revokeObjectURL(this.rawPreviewUrl);
          this.rawPreviewUrl = URL.createObjectURL(blob);
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.rawPreviewUrl);
        },
        error: () => this.toast.show('Preview failed. Check sample ID.', 'error'),
      });
  }

  // ── SAVE ──

  onSubmit(): void {
    this.submitted = true;
    if (this.formatForm.invalid) {
      this.formatForm.markAllAsTouched();
      this.toast.show('Please fix validation errors.', 'warning');
      return;
    }

    // Auto-apply current config if a section is selected
    if (this.selectedSection && this.configForm) {
      this.selectedSection.config = this.configForm.getRawValue();
    }

    const dto = {
      id: this.formatId,
      ...this.formatForm.getRawValue(),
      sections: this.canvasSections.map((s) => ({
        id: s.id,
        sectionType: s.sectionType,
        sectionTypeName: s.sectionTypeName,
        sortOrder: s.sortOrder,
        config: s.config,
        isVisible: s.isVisible,
      })),
      mappings: this.mappings,
    };

    const obs$ = this.isEditMode
      ? this.formatService.update(dto)
      : this.formatService.create(dto);

    obs$.subscribe({
      next: (resp) => {
        this.toast.show(
          this.isEditMode ? 'Format updated.' : 'Format created.',
          'success'
        );
        this.saved = true;
        this.formatForm.markAsPristine();
        if (!this.isEditMode && resp?.id) {
          this.formatId = resp.id;
          this.isEditMode = true;
          this.router.navigate(['/report-format/designer', resp.id], {
            replaceUrl: true,
          });
        }

        // Save mappings separately
        if (this.formatId) {
          this.formatService.saveMappings(this.formatId, this.mappings).subscribe();
        }
      },
      error: (err) => {
        const msg = err?.error?.message || 'Save failed.';
        this.toast.show(msg, 'error');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/report-format']);
  }

  // ── DEFAULT CONFIGS ──

  private getDefaultConfig(type: number): any {
    switch (type) {
      case 0: return { showCompanyLogo: true, showNablLogo: true, title: 'Test Certificate', showUlr: true, showCertIdentity: true, showFormatNo: true, showFooterQr: false, footerConditionsText: this.defaultFooterConditions };
      case 1: return { columns: 2, sectionTitle: 'INFORMATION PROVIDED BY THE CUSTOMER', fields: ['POReference', 'SampleDescription', 'StampedAs', 'SampleDrawnBy', 'NatureOfSample', 'MaterialSpec'] };
      case 2: return { columns: 2, fields: ['SampleDescription', 'Grade', 'HeatNo', 'Dimensions', 'DateReceived', 'DateTested'] };
      case 3: return { variant: 'grouped', showSpecRow: true };
      case 4: return { showSpecRow: true, showUnit: true };
      case 5: return { defaultText: '', fontSize: 8 };
      case 6: return { passText: 'The sample conforms to the specified requirements.', failText: 'The sample does NOT conform to the specified requirements.', showDecisionRule: true };
      case 7: return { gridColumns: 2, maxHeight: 140, showCaptions: true };
      case 8: return { content: '', fontSize: 8, bold: false, italic: false };
      case 9: return { count: 3, roles: ['Tested By', 'Reviewed By', 'Approved By'], showDesignation: true, showStamp: true };
      case 10: return { autoGenerate: true, customText: '' };
      case 11: return { size: 60 };
      case 12: return { style: 'line', thickness: 1 };
      default: return {};
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.formatForm.get(field);
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  Math = Math;
}
