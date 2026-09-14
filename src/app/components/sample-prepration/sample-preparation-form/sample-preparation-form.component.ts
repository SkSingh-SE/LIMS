import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { SamplePreparationService } from '../../../services/sample-preparation.service';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { MachiningChargeMasterService } from '../../../services/machining-charge-master.service';
import { EquipmentService } from '../../../services/equipment.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';
import { environment } from '../../../../environments/environment';

export interface PrepItemRow {
  id: number | null;
  plannedTestMethodID: number;
  plannedTestType: string;
  testId: number;
  testName: string;
  standardId: number;
  standardName: string;
  quantity: number;
  specimenPreparationMasterID: number | null;
  specimenSize: string;
  specimenRawMaterialSize: string;
  drawingFilePath: string;
  fileName: string;
  resolvedMachiningRate: number;
  resolvedCuttingRate: number;
  requiresCutting: boolean;
  requiresMachining: boolean;
  noTesting: boolean;
  remarks: string;
  status: string;
}

@Component({
  selector: 'app-sample-preparation-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    SearchableDropdownComponent, TestStatusBadgeComponent
  ],
  templateUrl: './sample-preparation-form.component.html',
  styleUrl: './sample-preparation-form.component.css',
})
export class SamplePreparationFormComponent implements OnInit {
  prepId = 0;
  sampleId = 0;
  inwardId = 0;
  isViewMode = false;
  isEditMode = false;

  prepData: any = null;
  prepForm!: FormGroup;
  baseUrl = environment.baseUrl;

  specimenConfigsMap: { [testKey: string]: any[] } = {};
  selectedSpecimenMap: { [testIndex: number]: any } = {};
  selectedEquipment: any = null;

  isSaving = false;
  isPrinting = false;
  showNablSection = true;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private prepService: SamplePreparationService,
    private inwardService: SampleInwardService,
    private machiningMasterService: MachiningChargeMasterService,
    private equipmentService: EquipmentService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();

    const urlPath = this.router.url;
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (urlPath.includes('/preparation/details/')) {
      this.isViewMode = true;
      this.prepId = id;
    } else if (urlPath.includes('/preparation/edit/')) {
      this.isEditMode = true;
      this.prepId = id;
    } else if (urlPath.includes('/preparation/create/')) {
      this.sampleId = id;
    }

    const state = history.state as { mode?: string };
    if (state?.mode === 'view') this.isViewMode = true;
    if (state?.mode === 'edit') this.isEditMode = true;

    if (this.prepId > 0) {
      this.loadPrepData(this.prepId);
    } else if (this.sampleId > 0) {
      this.loadBySample(this.sampleId);
    }
  }

  private initForm(): void {
    this.prepForm = this.fb.group({
      id: [0],
      sampleId: [0],
      inwardId: [0],
      status: ['Pending'],

      // NABL Tracking & Environment
      equipmentID: [null],
      preparationMethod: [''],
      temperature: [null],
      humidity: [null],
      preparationInstructions: [''],
      preConditionNotes: [''],
      postConditionNotes: [''],
      verificationRemarks: [''],

      // Cutting Parameters
      numberOfCuts: [null],
      cutThickness: [null],
      waterJetCuttingMins: [null],
      edmCutting: [''],
      edmCuttingCharge: [0],
      gasCutting: [''],
      gasCuttingCharge: [0],
      specialCutting: [''],
      specialCuttingCharge: [0],

      // Specimen Test Items Matrix
      tests: this.fb.array([])
    });

    if (this.isViewMode) {
      this.prepForm.disable();
    }
  }

  get tests(): FormArray {
    return this.prepForm.get('tests') as FormArray;
  }

  getTestGroup(index: number): FormGroup {
    return this.tests.at(index) as FormGroup;
  }

  // ── Data Loading ──

  private loadPrepData(id: number): void {
    this.prepService.getById(id).subscribe({
      next: (data) => {
        this.prepData = data;
        this.prepId = data.id;
        this.sampleId = data.sampleID;
        this.inwardId = data.inwardID;
        this.populateFormData(data);
        if (this.isViewMode) this.prepForm.disable();
        this.cdr.markForCheck();
      },
      error: () => this.toastService.show('Failed to load preparation data', 'error'),
    });
  }

  private loadBySample(sampleId: number): void {
    this.prepService.getBySample(sampleId).subscribe({
      next: (data) => {
        this.prepData = data;
        this.prepId = data.id;
        this.sampleId = data.sampleID;
        this.inwardId = data.inwardID;
        this.populateFormData(data);
        if (this.isViewMode) this.prepForm.disable();
        this.cdr.markForCheck();
      },
      error: () => {
        // Fallback to getOrCreate
        this.prepService.getOrCreateBySample(sampleId).subscribe({
          next: (data) => {
            this.prepData = data;
            this.prepId = data.id;
            this.sampleId = data.sampleID;
            this.inwardId = data.inwardID;
            this.populateFormData(data);
            this.cdr.markForCheck();
          },
          error: () => this.toastService.show('Failed to initialize preparation for sample', 'error')
        });
      },
    });
  }

  private populateFormData(data: any): void {
    this.prepForm.patchValue({
      id: data.id,
      sampleId: data.sampleID,
      inwardId: data.inwardID,
      status: data.status || 'Pending',
      equipmentID: data.equipmentID,
      preparationMethod: data.preparationMethod || '',
      temperature: data.temperature,
      humidity: data.humidity,
      preparationInstructions: data.preparationInstructions || '',
      preConditionNotes: data.preConditionNotes || '',
      postConditionNotes: data.postConditionNotes || '',
      verificationRemarks: data.verificationRemarks || '',
      numberOfCuts: data.numberOfCuts ?? null,
      cutThickness: data.cutThickness ?? null,
      waterJetCuttingMins: data.waterJetCuttingMins ?? null,
      edmCutting: data.edmCutting || '',
      edmCuttingCharge: data.edmCuttingCharge || 0,
      gasCutting: data.gasCutting || '',
      gasCuttingCharge: data.gasCuttingCharge || 0,
      specialCutting: data.specialCutting || '',
      specialCuttingCharge: data.specialCuttingCharge || 0,
    });

    if (data.equipmentID) {
      this.selectedEquipment = { id: data.equipmentID, name: data.equipmentName || `Equipment #${data.equipmentID}` };
    }

    // Build tests FormArray
    this.tests.clear();
    const rawItems: any[] = data.items || [];
    const isHard = this.isHardMetal();

    rawItems.forEach((item: any, index: number) => {
      const specSize = item.specimenSize || data.specimen || '';
      const masterId = item.specimenPreparationMasterID || null;
      const rawSize = item.specimenRawMaterialSize || '';

      // Eagerly populate selectedSpecimenMap
      if (specSize || masterId) {
        const displayName = specSize
          ? (rawSize ? `${specSize} (Raw: ${rawSize})` : specSize)
          : `Config #${masterId}`;
        this.selectedSpecimenMap[index] = {
          id: masterId || 0,
          name: displayName,
          rawObj: {
            id: masterId,
            specimenSize: specSize,
            specimenRawMaterialSize: rawSize
          }
        };
      }

      const cleanTestName = (name?: string | null): string => {
        if (!name) return '';
        const trimmed = name.trim();
        const lower = trimmed.toLowerCase();
        if (lower === 'general test' || lower === 'general' || lower === 'chemical test' || lower === 'chemical' || lower === 'test method' || lower === 'unknown test') {
          return '';
        }
        return trimmed;
      };
      const resolvedTestName = cleanTestName(item.laboratoryTestName) || cleanTestName(item.testName) || (item.standardName || item.testMethodName ? `${item.standardName || item.testMethodName} Test` : 'Laboratory Test');

      const group = this.fb.group({
        id: [item.id || null],
        plannedTestMethodID: [item.plannedTestMethodID || 0],
        plannedTestType: [item.plannedTestType || 'General'],
        laboratoryTestID: [item.laboratoryTestID || 0],
        testId: [item.laboratoryTestID || item.testId || 0],
        testName: [resolvedTestName],
        standardId: [item.testMethodSpecificationID || item.standardId || 0],
        standardName: [item.testMethodName || item.standardName || ''],
        quantity: [item.quantity || 1, [Validators.required, Validators.min(1)]],
        specimenPreparationMasterID: [masterId],
        specimenSize: [specSize],
        specimenRawMaterialSize: [rawSize],
        drawingFilePath: [item.drawingFilePath || ''],
        fileName: [item.fileName || ''],
        machiningRate: [item.resolvedMachiningRate || 0],
        cuttingRate: [item.resolvedCuttingRate || 0],
        machiningTotal: [item.machiningTotal || (item.resolvedMachiningRate ? item.resolvedMachiningRate * (item.quantity || 1) : 0)],
        cuttingTotal: [item.cuttingTotal || (item.resolvedCuttingRate ? item.resolvedCuttingRate * (item.quantity || 1) : 0)],
        requiresCutting: [item.cuttingRequired ?? item.requiresCutting ?? true],
        requiresMachining: [item.machiningRequired ?? item.requiresMachining ?? true],
        noTesting: [item.noTesting ?? false],
        remarks: [item.remarks || ''],
        status: [item.status || 'Required']
      });

      this.tests.push(group);

      // Load specimen preparation configs for dropdown
      const testId = item.laboratoryTestID || item.testId || 0;
      const standardId = item.testMethodSpecificationID || item.standardId || 0;
      this.loadSpecimenConfigsForTest(index, testId, standardId, isHard);
    });

    if (this.isViewMode) {
      this.prepForm.disable();
    }
  }

  private isHardMetal(): boolean {
    const metalName = (this.prepData?.materialClassification || this.prepData?.sampleDescription || '').toLowerCase();
    return metalName.includes('hard') || metalName.includes('super') || metalName.includes('titanium') || metalName.includes('inconel');
  }

  // ── Specimen Dropdown & Rates ──

  loadSpecimenConfigsForTest(testIndex: number, testId: number, standardId: number, isHard: boolean): void {
    if (!testId) return;

    const cacheKey = `${testId}_${standardId || 0}`;
    if (this.specimenConfigsMap[cacheKey]) {
      this.applySpecimenConfigs(testIndex, this.specimenConfigsMap[cacheKey], isHard);
      return;
    }

    this.machiningMasterService.getByTest(testId, standardId || 0).subscribe({
      next: (configs: any[]) => {
        this.specimenConfigsMap[cacheKey] = configs || [];
        this.applySpecimenConfigs(testIndex, this.specimenConfigsMap[cacheKey], isHard);
      },
      error: () => {
        this.specimenConfigsMap[cacheKey] = [];
      }
    });
  }

  private applySpecimenConfigs(testIndex: number, configs: any[], isHard: boolean): void {
    if (!configs || configs.length === 0) return;

    const testGroup = this.getTestGroup(testIndex);
    if (!testGroup) return;

    const existingMasterId = testGroup.get('specimenPreparationMasterID')?.value;
    const existingSize = (testGroup.get('specimenSize')?.value || '').trim().toLowerCase();
    const sampleSpecimen = (this.prepData?.specimen || '').trim().toLowerCase();

    // 1. Try to find matching config
    let matched: any = null;
    if (existingMasterId) {
      matched = configs.find(c => c.id === existingMasterId);
    }
    if (!matched && existingSize) {
      matched = configs.find(c => (c.specimenSize || '').trim().toLowerCase() === existingSize);
    }
    if (!matched && sampleSpecimen) {
      matched = configs.find(c => (c.specimenSize || '').trim().toLowerCase() === sampleSpecimen);
    }
    if (!matched && configs.length === 1) {
      matched = configs[0];
    }

    // 2. If matched, apply rates and update selectedSpecimenMap
    if (matched) {
      testGroup.patchValue({
        specimenPreparationMasterID: matched.id,
        specimenSize: matched.specimenSize || '',
        specimenRawMaterialSize: matched.specimenRawMaterialSize || '',
        drawingFilePath: matched.drawingFilePath || '',
        fileName: matched.fileName || ''
      }, { emitEvent: false });

      const mRate = isHard
        ? (matched.machiningRateHardMetal || matched.machiningRateSoftMetal || 0)
        : (matched.machiningRateSoftMetal || matched.machiningRateHardMetal || 0);
      const cRate = isHard
        ? (matched.cuttingRateHardMetal || matched.cuttingRateSoftMetal || 0)
        : (matched.cuttingRateSoftMetal || matched.cuttingRateHardMetal || 0);

      testGroup.patchValue({
        machiningRate: mRate,
        cuttingRate: cRate
      }, { emitEvent: false });

      this.selectedSpecimenMap[testIndex] = {
        id: matched.id,
        name: matched.specimenSize
          ? (matched.specimenRawMaterialSize ? `${matched.specimenSize} (Raw: ${matched.specimenRawMaterialSize})` : matched.specimenSize)
          : `Config #${matched.id}`,
        rawObj: matched
      };
    } else {
      // Preserve existing value in map if already present
      if (!this.selectedSpecimenMap[testIndex] && (testGroup.get('specimenSize')?.value || existingMasterId)) {
        const sz = testGroup.get('specimenSize')?.value || '';
        const raw = testGroup.get('specimenRawMaterialSize')?.value || '';
        this.selectedSpecimenMap[testIndex] = {
          id: existingMasterId || 0,
          name: sz ? (raw ? `${sz} (Raw: ${raw})` : sz) : `Config #${existingMasterId}`,
          rawObj: { id: existingMasterId, specimenSize: sz, specimenRawMaterialSize: raw }
        };
      }
    }
    this.cdr.markForCheck();
  }

  getSpecimenDropdownFn(testIndex: number): (search: string, page: number, pageSize: number) => Observable<any[]> {
    return (search: string, page: number, pageSize: number): Observable<any[]> => {
      const testGroup = this.getTestGroup(testIndex);
      if (!testGroup) return of([]);

      const testId = testGroup.get('testId')?.value || testGroup.get('laboratoryTestID')?.value || 0;
      const standardId = testGroup.get('standardId')?.value || 0;
      const cacheKey = `${testId}_${standardId || 0}`;
      const configs = this.specimenConfigsMap[cacheKey] || [];
      const isHard = this.isHardMetal();

      const term = (search || '').toLowerCase().trim();
      const filtered = configs.filter(c =>
        !term ||
        (c.specimenSize && c.specimenSize.toLowerCase().includes(term)) ||
        (c.specimenRawMaterialSize && c.specimenRawMaterialSize.toLowerCase().includes(term))
      );

      const mapped = filtered.map(c => {
        const mRate = isHard ? (c.machiningRateHardMetal || c.machiningRateSoftMetal || 0) : (c.machiningRateSoftMetal || 0);
        const cRate = isHard ? (c.cuttingRateHardMetal || c.cuttingRateSoftMetal || 0) : (c.cuttingRateSoftMetal || 0);
        const label = c.specimenSize
          ? `${c.specimenSize}${c.specimenRawMaterialSize ? ' (Raw: ' + c.specimenRawMaterialSize + ')' : ''} [₹${mRate}/pc]`
          : `Config #${c.id}`;
        return {
          id: c.id,
          name: label,
          rawObj: c,
          machiningRate: mRate,
          cuttingRate: cRate
        };
      });

      // Ensure currently selected item is included
      const currentSelected = this.selectedSpecimenMap[testIndex];
      if (currentSelected && !mapped.some(m => m.id === currentSelected.id)) {
        mapped.unshift(currentSelected);
      }

      return of(mapped);
    };
  }

  getSpecimenSelected(testIndex: number): any {
    const fromMap = this.selectedSpecimenMap[testIndex];
    if (fromMap) return fromMap;

    const testGroup = this.getTestGroup(testIndex);
    if (!testGroup) return null;

    const sz = testGroup.get('specimenSize')?.value;
    const masterId = testGroup.get('specimenPreparationMasterID')?.value;
    const raw = testGroup.get('specimenRawMaterialSize')?.value;

    if (sz || masterId) {
      const reconstructed = {
        id: masterId || 0,
        name: sz ? (raw ? `${sz} (Raw: ${raw})` : sz) : `Config #${masterId}`,
        rawObj: { id: masterId, specimenSize: sz, specimenRawMaterialSize: raw }
      };
      this.selectedSpecimenMap[testIndex] = reconstructed;
      return reconstructed;
    }
    return null;
  }

  onSpecimenSelected(item: any, testIndex: number): void {
    const testGroup = this.getTestGroup(testIndex);
    if (!testGroup) return;

    if (!item) {
      this.selectedSpecimenMap[testIndex] = null;
      testGroup.patchValue({
        specimenPreparationMasterID: null,
        specimenSize: '',
        specimenRawMaterialSize: '',
        drawingFilePath: '',
        fileName: '',
        machiningRate: 0,
        cuttingRate: 0
      });
      this.recalcRow(testIndex);
      return;
    }

    this.selectedSpecimenMap[testIndex] = item;
    const raw = item.rawObj || {};
    const isHard = this.isHardMetal();

    const mRate = isHard
      ? (raw.machiningRateHardMetal || raw.machiningRateSoftMetal || 0)
      : (raw.machiningRateSoftMetal || raw.machiningRateHardMetal || 0);
    const cRate = isHard
      ? (raw.cuttingRateHardMetal || raw.cuttingRateSoftMetal || 0)
      : (raw.cuttingRateSoftMetal || raw.cuttingRateHardMetal || 0);

    testGroup.patchValue({
      specimenPreparationMasterID: raw.id || item.id || null,
      specimenSize: raw.specimenSize || item.name || '',
      specimenRawMaterialSize: raw.specimenRawMaterialSize || '',
      drawingFilePath: raw.drawingFilePath || '',
      fileName: raw.fileName || '',
      machiningRate: mRate,
      cuttingRate: cRate
    });

    this.recalcRow(testIndex);
    this.cdr.markForCheck();
  }

  // ── Equipment Dropdown ──

  fetchEquipmentDropdown = (search: string, page: number, pageSize: number): Observable<any[]> => {
    return new Observable(obs => {
      this.equipmentService.getEquipmentDropdown(search, page, pageSize).subscribe({
        next: (res: any) => {
          const list = res?.data || res || [];
          obs.next(list.map((e: any) => ({ id: e.id, name: `${e.equipmentName || e.name} (${e.equipmentIDCode || e.equipmentCode || e.id})` })));
          obs.complete();
        },
        error: () => {
          obs.next([]);
          obs.complete();
        }
      });
    });
  };

  onEquipmentSelected(item: any): void {
    this.selectedEquipment = item;
    this.prepForm.patchValue({ equipmentID: item?.id || null });
  }

  // ── Financial Calculations ──

  recalcRow(index: number): void {
    const row = this.getTestGroup(index);
    if (!row) return;

    const qty = +(row.get('quantity')?.value || 1);
    const mRate = +(row.get('machiningRate')?.value || 0);
    const cRate = +(row.get('cuttingRate')?.value || 0);
    const reqM = row.get('requiresMachining')?.value ?? true;
    const reqC = row.get('requiresCutting')?.value ?? true;

    row.get('machiningTotal')?.setValue(reqM ? mRate * qty : 0, { emitEvent: false });
    row.get('cuttingTotal')?.setValue(reqC ? cRate * qty : 0, { emitEvent: false });
    this.cdr.markForCheck();
  }

  get waterJetCharge(): number {
    const mins = +(this.prepForm.get('waterJetCuttingMins')?.value || 0);
    return mins * 10;
  }

  get sampleCuttingTotal(): number {
    const edm = +(this.prepForm.get('edmCuttingCharge')?.value || 0);
    const gas = +(this.prepForm.get('gasCuttingCharge')?.value || 0);
    const spec = +(this.prepForm.get('specialCuttingCharge')?.value || 0);
    return this.waterJetCharge + edm + gas + spec;
  }

  get testMachiningTotal(): number {
    return this.tests.controls.reduce((sum, c) => {
      const reqM = c.get('requiresMachining')?.value ?? true;
      const rate = +(c.get('machiningRate')?.value || 0);
      const qty = +(c.get('quantity')?.value || 1);
      return sum + (reqM ? rate * qty : 0);
    }, 0);
  }

  get testCuttingTotal(): number {
    return this.tests.controls.reduce((sum, c) => {
      const reqC = c.get('requiresCutting')?.value ?? true;
      const rate = +(c.get('cuttingRate')?.value || 0);
      const qty = +(c.get('quantity')?.value || 1);
      return sum + (reqC ? rate * qty : 0);
    }, 0);
  }

  get grandTotal(): number {
    return this.sampleCuttingTotal + this.testMachiningTotal + this.testCuttingTotal;
  }

  // ── Drawing Blueprint Viewer ──

  viewDrawing(filePath: string): void {
    if (!filePath) return;
    const fullUrl = filePath.startsWith('http') ? filePath : `${this.baseUrl}/${filePath}`;
    window.open(fullUrl, '_blank');
  }

  // ── Save & Actions ──

  savePreparation(): void {
    if (this.isViewMode) return;
    this.isSaving = true;

    const val = this.prepForm.getRawValue();

    const testItems = val.tests.map((t: any) => ({
      id: t.id || 0,
      samplePreparationID: this.prepId,
      sampleID: this.sampleId,
      plannedTestType: t.plannedTestType || 'General',
      plannedTestMethodID: t.plannedTestMethodID || 0,
      laboratoryTestID: t.laboratoryTestID || t.testId || 0,
      laboratoryTestName: t.testName || '',
      testMethodSpecificationID: t.standardId || null,
      specimenPreparationMasterID: t.specimenPreparationMasterID || null,
      specimenSize: t.specimenSize || '',
      specimenRawMaterialSize: t.specimenRawMaterialSize || '',
      quantity: +(t.quantity || 1),
      cuttingRequired: t.requiresCutting,
      machiningRequired: t.requiresMachining,
      noTesting: t.noTesting,
      resolvedCuttingRate: +(t.cuttingRate || 0),
      resolvedMachiningRate: +(t.machiningRate || 0),
      cuttingTotal: +(t.cuttingTotal || 0),
      machiningTotal: +(t.machiningTotal || 0),
      status: t.status || 'Required',
      remarks: t.remarks || ''
    }));

    // 1. Update SamplePreparation via SamplePreparationService
    const updateDto = {
      ID: this.prepId,
      status: val.status,
      equipmentID: val.equipmentID,
      preparationMethod: val.preparationMethod,
      temperature: val.temperature,
      humidity: val.humidity,
      preparationInstructions: val.preparationInstructions,
      preConditionNotes: val.preConditionNotes,
      postConditionNotes: val.postConditionNotes,
      verificationRemarks: val.verificationRemarks,
      numberOfCuts: val.numberOfCuts,
      cutThickness: val.cutThickness,
      waterJetCuttingMins: val.waterJetCuttingMins,
      edmCutting: val.edmCutting,
      edmCuttingCharge: val.edmCuttingCharge,
      gasCutting: val.gasCutting,
      gasCuttingCharge: val.gasCuttingCharge,
      specialCutting: val.specialCutting,
      specialCuttingCharge: val.specialCuttingCharge,
      items: testItems
    };

    // 2. Also prepare SamplePrepReviewDto for inward service synchronization
    const inwardSyncPayload = {
      preparationRequired: true,
      machiningRequired: this.testMachiningTotal > 0,
      machiningAmount: this.testMachiningTotal,
      specimen: val.tests[0]?.specimenSize || this.prepData?.specimen || '',
      testInstructions: val.preparationInstructions,
      numberOfCuts: val.numberOfCuts,
      cutThickness: val.cutThickness,
      waterJetCuttingMins: val.waterJetCuttingMins,
      edmCutting: val.edmCutting,
      edmCuttingCharge: val.edmCuttingCharge,
      gasCutting: val.gasCutting,
      gasCuttingCharge: val.gasCuttingCharge,
      specialCutting: val.specialCutting,
      specialCuttingCharge: val.specialCuttingCharge,
      machiningChargesTotal: this.testMachiningTotal,
      cuttingChargesTotal: this.sampleCuttingTotal + this.testCuttingTotal,
      otherChargesTotal: 0,
      tests: val.tests.map((t: any) => ({
        id: t.id || 0,
        testId: t.laboratoryTestID || t.testId || 0,
        plannedTestMethodID: t.plannedTestMethodID || 0,
        plannedTestType: t.plannedTestType || 'General',
        testName: t.testName || '',
        standardId: t.standardId || null,
        standardName: t.standardName || '',
        specimenPreparationMasterID: t.specimenPreparationMasterID || null,
        specimenSize: t.specimenSize || '',
        specimenRawMaterialSize: t.specimenRawMaterialSize || '',
        drawingFilePath: t.drawingFilePath || '',
        fileName: t.fileName || '',
        quantity: +(t.quantity || 1),
        machiningRate: +(t.machiningRate || 0),
        cuttingRate: +(t.cuttingRate || 0),
        machiningTotal: +(t.machiningTotal || 0),
        cuttingTotal: +(t.cuttingTotal || 0),
        requiresCutting: t.requiresCutting,
        requiresMachining: t.requiresMachining,
        noTesting: t.noTesting,
        remarks: t.remarks || '',
        status: t.status || 'Pending'
      }))
    };

    const savePrepObs = this.prepId > 0
      ? this.prepService.update(updateDto)
      : this.prepService.create({
          sampleID: this.sampleId,
          inwardID: this.inwardId,
          equipmentID: val.equipmentID,
          preparationMethod: val.preparationMethod,
          preparationInstructions: val.preparationInstructions,
          preConditionNotes: val.preConditionNotes
        });

    savePrepObs.subscribe({
      next: (res) => {
        // Sync with inward service as well
        if (this.sampleId > 0) {
          this.inwardService.updateSamplePrep(this.sampleId, inwardSyncPayload).subscribe({
            next: () => {},
            error: () => {}
          });
        }
        this.isSaving = false;
        this.toastService.show('Sample preparation plan and charges saved successfully.', 'success');
        if (this.prepId > 0) this.loadPrepData(this.prepId);
        else if (this.sampleId > 0) this.loadBySample(this.sampleId);
      },
      error: (err) => {
        this.isSaving = false;
        this.toastService.show(err?.error?.message || 'Failed to save preparation details.', 'error');
      }
    });
  }

  updateStatus(status: string): void {
    if (!this.prepId) return;
    const remarks = (status === 'QCVerified' || status === 'Rejected') ? prompt(`Enter remarks for ${status}:`) : null;
    if (status === 'Rejected' && !remarks) return;

    this.prepService.updateStatus(this.prepId, { status, remarks }).subscribe({
      next: () => {
        this.toastService.show(`Status updated to ${status}`, 'success');
        this.loadPrepData(this.prepId);
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to update status', 'error'),
    });
  }

  markItemCompleted(index: number): void {
    const row = this.getTestGroup(index);
    if (!row) return;
    const itemId = row.get('id')?.value;
    if (!itemId) {
      row.patchValue({ status: 'Completed' });
      this.toastService.show('Item status set to Completed. Save the form to persist.', 'info');
      return;
    }

    this.prepService.updateItemStatus(itemId, {
      id: itemId,
      status: 'Completed',
      remarks: 'Completed from Sample Preparation form'
    }).subscribe({
      next: () => {
        row.patchValue({ status: 'Completed' });
        this.toastService.show(`Preparation for ${row.get('testName')?.value} marked as Completed`, 'success');
        this.cdr.markForCheck();
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to update item status', 'error')
    });
  }

  printJobCard(): void {
    this.isPrinting = true;
    setTimeout(() => {
      window.print();
      this.isPrinting = false;
    }, 150);
  }

  goBack(): void {
    this.router.navigate(['/sample/preparation']);
  }

  getStatusBadgeClass(status?: string): string {
    switch ((status || '').toLowerCase()) {
      case 'completed':
      case 'qcverified':
        return 'bg-success text-white';
      case 'inprogress':
      case 'cuttingcompleted':
      case 'machiningcompleted':
        return 'bg-warning text-dark';
      case 'rejected':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  }
}
