import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { MachiningChargeMasterService } from '../../../services/machining-charge-master.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { environment } from '../../../../environments/environment';

export interface PlannedTestPrepItem {
  id?: number | null;
  plannedTestMethodID: number;
  plannedTestType: string;
  testId: number;
  testName: string;
  standardId: number;
  standardName: string;
  quantity: number;
  specimenPreparationMasterID?: number | null;
  specimenSize?: string;
  specimenRawMaterialSize?: string;
  drawingFilePath?: string;
  fileName?: string;
  priceGeneralMetal?: number;
  priceHardMetal?: number;
  cuttingRateGeneralMetal?: number;
  cuttingRateHardMetal?: number;
  resolvedMachiningRate?: number;
  resolvedCuttingRate?: number;
  cuttingTotal?: number;
  machiningTotal?: number;
  requiresCutting: boolean;
  requiresMachining: boolean;
  noTesting: boolean;
  remarks?: string;
  status?: string;
}

@Component({
  selector: 'app-cutting-machining-plan-tab',
  templateUrl: './cutting-machining-plan-tab.component.html',
  styleUrls: ['./cutting-machining-plan-tab.component.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SearchableDropdownComponent]
})
export class CuttingMachiningPlanTabComponent implements OnInit, OnChanges {
  @Input() inwardId: number = 0;
  @Input() isReadOnly: boolean = false;
  @Output() prepCompleted = new EventEmitter<void>();

  baseUrl = environment.baseUrl;
  samples: any[] = [];
  sampleForms: { [sampleId: number]: FormGroup } = {};
  samplePrepTests: { [sampleId: number]: PlannedTestPrepItem[] } = {};
  specimenConfigsMap: { [testKey: string]: any[] } = {}; // key: "testId_standardId"
  selectedSpecimenMap: { [key: string]: any } = {};     // key: "sampleId_testIndex"
  isSaving: { [sampleId: number]: boolean } = {};
  isCompleting = false;

  constructor(
    private fb: FormBuilder,
    private inwardService: SampleInwardService,
    private machiningMasterService: MachiningChargeMasterService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.inwardId > 0) {
      this.loadSampleDetailsWithPlans();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inwardId'] && changes['inwardId'].currentValue > 0) {
      this.loadSampleDetailsWithPlans();
    }
  }

  loadSampleDetailsWithPlans(): void {
    this.inwardService.getSampleInwardWithPlans(this.inwardId).subscribe({
      next: (data: any) => {
        const allPlans = data?.sampleTestPlans || [];
        this.samples = data?.sampleDetails || data?.samples || [];
        this.samples.forEach((sample: any) => {
          if (!sample.testPlans || sample.testPlans.length === 0) {
            sample.testPlans = allPlans.filter((tp: any) => tp.sampleID === sample.id || tp.sampleNo === sample.sampleNo);
          }
          this.extractAndBuildSamplePrep(sample);
        });
        this.cdr.markForCheck();
      },
      error: () => {
        // Fallback to getSampleInwardById if details-with-plan fails
        this.inwardService.getSampleInwardById(this.inwardId).subscribe({
          next: (data: any) => {
            const allPlans = data?.sampleTestPlans || [];
            this.samples = data?.sampleDetails || data?.samples || [];
            this.samples.forEach((sample: any) => {
              if (!sample.testPlans || sample.testPlans.length === 0) {
                sample.testPlans = allPlans.filter((tp: any) => tp.sampleID === sample.id || tp.sampleNo === sample.sampleNo);
              }
              this.extractAndBuildSamplePrep(sample);
            });
            this.cdr.markForCheck();
          },
          error: () => this.toast.show('Failed to load sample preparation details.', 'error')
        });
      }
    });
  }

  private isHardMetal(sample: any): boolean {
    const metalName = (sample?.metalClassificationName || sample?.metalClassification?.name || '').toLowerCase();
    return metalName.includes('hard') || metalName.includes('super') || metalName.includes('titanium') || metalName.includes('inconel');
  }

  extractAndBuildSamplePrep(sample: any): void {
    const isHard = this.isHardMetal(sample);
    const prepItems: PlannedTestPrepItem[] = [];
    const savedPrep = sample.preparationDetails || {};
    const savedTests: any[] = savedPrep.tests || [];

    const cleanTestName = (name?: string | null): string => {
      if (!name) return '';
      const trimmed = name.trim();
      const lower = trimmed.toLowerCase();
      if (lower === 'general test' || lower === 'general' || lower === 'chemical test' || lower === 'chemical' || lower === 'test method' || lower === 'unknown test') {
        return '';
      }
      return trimmed;
    };

    // Extract test methods requiring preparation from testPlans
    if (sample.testPlans && Array.isArray(sample.testPlans)) {
      sample.testPlans.forEach((plan: any) => {
        // General tests
        if (plan.generalTests && Array.isArray(plan.generalTests)) {
          plan.generalTests.forEach((gt: any) => {
            if (gt.methods && Array.isArray(gt.methods)) {
              gt.methods.forEach((m: any) => {
                if (!m.cancel && (m.preparationRequired || m.isPreparationRequired)) {
                  const saved = savedTests.find((st: any) => (m.id && st.plannedTestMethodID === m.id) || st.testId === (m.testMethodID || gt.laboratoryTestSubGroupID));
                  const specSize = saved?.specimenSize || sample.specimen || sample.Specimen || '';
                  const masterId = saved?.specimenPreparationMasterID || null;
                  const rawSize = saved?.specimenRawMaterialSize || '';
                  const resolvedTestName =
                    cleanTestName(m.laboratoryTestName) ||
                    cleanTestName(m.testMethodName) ||
                    cleanTestName(saved?.testName) ||
                    cleanTestName(gt.laboratoryTestName) ||
                    cleanTestName(gt.subGroupName) ||
                    (m.standardName ? `${m.standardName} Test` : 'Laboratory Test');
                  prepItems.push({
                    id: saved?.id || null,
                    plannedTestMethodID: m.id || 0,
                    plannedTestType: 'General',
                    testId: m.testMethodID || gt.laboratoryTestSubGroupID || 0,
                    testName: resolvedTestName,
                    standardId: m.standardID || gt.specification1 || 0,
                    standardName: m.standardName || '',
                    quantity: +(saved?.quantity || m.quantity || 1),
                    specimenPreparationMasterID: masterId,
                    specimenSize: specSize,
                    specimenRawMaterialSize: rawSize,
                    drawingFilePath: saved?.drawingFilePath || '',
                    fileName: saved?.fileName || '',
                    resolvedMachiningRate: saved?.machiningRate || 0,
                    resolvedCuttingRate: saved?.cuttingRate || 0,
                    requiresCutting: saved ? (saved.requiresCutting ?? true) : true,
                    requiresMachining: saved ? (saved.requiresMachining ?? true) : true,
                    noTesting: saved ? (saved.noTesting ?? false) : false,
                    remarks: saved?.remarks || '',
                    status: saved?.status || 'Pending'
                  });
                }
              });
            }
          });
        }

        // Chemical tests
        if (plan.chemicalTests && Array.isArray(plan.chemicalTests)) {
          plan.chemicalTests.forEach((ct: any) => {
            if (ct.methods && Array.isArray(ct.methods)) {
              ct.methods.forEach((m: any) => {
                if (!m.cancel && (m.preparationRequired || m.isPreparationRequired)) {
                  const saved = savedTests.find((st: any) => (m.id && st.plannedTestMethodID === m.id) || st.testId === (m.testMethodID || ct.laboratoryTestAnalysisTypeID));
                  const specSize = saved?.specimenSize || sample.specimen || sample.Specimen || '';
                  const masterId = saved?.specimenPreparationMasterID || null;
                  const rawSize = saved?.specimenRawMaterialSize || '';
                  const resolvedTestName =
                    cleanTestName(m.laboratoryTestName) ||
                    cleanTestName(m.testMethodName) ||
                    cleanTestName(saved?.testName) ||
                    cleanTestName(m.analysisTypeName) ||
                    cleanTestName(ct.analysisTypeName) ||
                    'Chemical Analysis';
                  prepItems.push({
                    id: saved?.id || null,
                    plannedTestMethodID: m.id || 0,
                    plannedTestType: 'Chemical',
                    testId: m.testMethodID || ct.laboratoryTestAnalysisTypeID || 0,
                    testName: resolvedTestName,
                    standardId: m.standardID || ct.specification1 || 0,
                    standardName: m.standardName || '',
                    quantity: +(saved?.quantity || m.quantity || 1),
                    specimenPreparationMasterID: masterId,
                    specimenSize: specSize,
                    specimenRawMaterialSize: rawSize,
                    drawingFilePath: saved?.drawingFilePath || '',
                    fileName: saved?.fileName || '',
                    resolvedMachiningRate: saved?.machiningRate || 0,
                    resolvedCuttingRate: saved?.cuttingRate || 0,
                    requiresCutting: saved ? (saved.requiresCutting ?? true) : true,
                    requiresMachining: saved ? (saved.requiresMachining ?? true) : true,
                    noTesting: saved ? (saved.noTesting ?? false) : false,
                    remarks: saved?.remarks || '',
                    status: saved?.status || 'Pending'
                  });
                }
              });
            }
          });
        }
      });
    }

    // Fallback if tests were directly on sample (legacy support)
    if (prepItems.length === 0 && sample.tests && Array.isArray(sample.tests)) {
      sample.tests.forEach((t: any) => {
        if (t.requiresCutting || t.preparationRequired) {
          const saved = savedTests.find((st: any) => st.testId === (t.testId || t.id));
          const specSize = saved?.specimenSize || sample.specimen || sample.Specimen || '';
          const masterId = saved?.specimenPreparationMasterID || null;
          const rawSize = saved?.specimenRawMaterialSize || '';
          const resolvedTestName =
            cleanTestName(saved?.testName) ||
            cleanTestName(t.laboratoryTestName) ||
            cleanTestName(t.testName) ||
            cleanTestName(t.name) ||
            (t.standardName ? `${t.standardName} Test` : 'Laboratory Test');
          prepItems.push({
            id: saved?.id || null,
            plannedTestMethodID: t.plannedTestMethodID || 0,
            plannedTestType: t.plannedTestType || 'General',
            testId: t.testId || t.id || 0,
            testName: resolvedTestName,
            standardId: t.standardId || t.standardID || 0,
            standardName: t.standardName || '',
            quantity: +(saved?.quantity || t.quantity || 1),
            specimenPreparationMasterID: masterId,
            specimenSize: specSize,
            specimenRawMaterialSize: rawSize,
            drawingFilePath: saved?.drawingFilePath || '',
            fileName: saved?.fileName || '',
            resolvedMachiningRate: saved?.machiningRate || 0,
            resolvedCuttingRate: saved?.cuttingRate || 0,
            requiresCutting: saved ? (saved.requiresCutting ?? true) : (t.requiresCutting ?? true),
            requiresMachining: saved ? (saved.requiresMachining ?? true) : true,
            noTesting: saved ? (saved.noTesting ?? false) : (t.noTesting ?? false),
            remarks: saved?.remarks || '',
            status: saved?.status || 'Pending'
          });
        }
      });
    }

    this.samplePrepTests[sample.id] = prepItems;

    // Eagerly pre-populate selectedSpecimenMap so the dropdown displays immediately on load
    prepItems.forEach((item, index) => {
      const key = `${sample.id}_${index}`;
      if (item.specimenSize || item.specimenPreparationMasterID) {
        const displayName = item.specimenSize
          ? (item.specimenRawMaterialSize ? `${item.specimenSize} (Raw: ${item.specimenRawMaterialSize})` : item.specimenSize)
          : `Config #${item.specimenPreparationMasterID}`;
        this.selectedSpecimenMap[key] = {
          id: item.specimenPreparationMasterID || 0,
          name: displayName,
          rawObj: {
            id: item.specimenPreparationMasterID,
            specimenSize: item.specimenSize,
            specimenRawMaterialSize: item.specimenRawMaterialSize
          }
        };
      }
    });

    // Build form
    const testsArray = this.fb.array(
      prepItems.map((item, index) => {
        const group = this.fb.group({
          id: [item.id || null],
          plannedTestMethodID: [item.plannedTestMethodID],
          plannedTestType: [item.plannedTestType],
          testId: [item.testId],
          testName: [item.testName],
          standardId: [item.standardId],
          standardName: [item.standardName],
          quantity: [item.quantity],
          specimenPreparationMasterID: [item.specimenPreparationMasterID || null],
          specimenSize: [item.specimenSize || ''],
          specimenRawMaterialSize: [item.specimenRawMaterialSize || ''],
          drawingFilePath: [item.drawingFilePath || ''],
          fileName: [item.fileName || ''],
          machiningRate: [item.resolvedMachiningRate || 0],
          cuttingRate: [item.resolvedCuttingRate || 0],
          requiresCutting: [item.requiresCutting],
          requiresMachining: [item.requiresMachining],
          noTesting: [item.noTesting],
          remarks: [item.remarks || ''],
          status: [item.status || 'Pending']
        });

        // Load Specimen Preparation Master configurations for this test & standard
        this.loadSpecimenConfigsForTest(sample.id, index, item, isHard);
        return group;
      })
    );

    const form = this.fb.group({
      sampleId: [sample.id],
      numberOfCuts: [savedPrep.numberOfCuts ?? sample.numberOfCuts ?? null],
      cutThickness: [savedPrep.cutThickness ?? sample.cutThickness ?? null],
      waterJetCuttingMins: [savedPrep.waterJetCuttingMins ?? sample.waterJetCuttingMins ?? null],
      edmCutting: [savedPrep.edmCutting ?? sample.edmCutting ?? ''],
      edmCuttingCharge: [savedPrep.edmCuttingCharge ?? 0],
      gasCutting: [savedPrep.gasCutting ?? sample.gasCutting ?? ''],
      gasCuttingCharge: [savedPrep.gasCuttingCharge ?? 0],
      specialCutting: [savedPrep.specialCutting ?? sample.specialCutting ?? ''],
      specialCuttingCharge: [savedPrep.specialCuttingCharge ?? 0],
      tests: testsArray
    });

    if (this.isReadOnly) {
      form.disable();
    }

    this.sampleForms[sample.id] = form;
  }

  loadSpecimenConfigsForTest(sampleId: number, testIndex: number, item: PlannedTestPrepItem, isHard: boolean): void {
    if (!item.testId) return;

    const cacheKey = `${item.testId}_${item.standardId || 0}`;
    if (this.specimenConfigsMap[cacheKey]) {
      this.applySpecimenConfigs(sampleId, testIndex, this.specimenConfigsMap[cacheKey], isHard);
      return;
    }

    this.machiningMasterService.getByTest(item.testId, item.standardId || 0).subscribe({
      next: (configs: any[]) => {
        this.specimenConfigsMap[cacheKey] = configs || [];
        this.applySpecimenConfigs(sampleId, testIndex, this.specimenConfigsMap[cacheKey], isHard);
      },
      error: () => {
        this.specimenConfigsMap[cacheKey] = [];
      }
    });
  }

  private applySpecimenConfigs(sampleId: number, testIndex: number, configs: any[], isHard: boolean): void {
    if (!configs || configs.length === 0) return;

    const testGroup = this.getTestGroup(sampleId, testIndex);
    if (!testGroup) return;

    const key = `${sampleId}_${testIndex}`;
    const existingMasterId = testGroup.get('specimenPreparationMasterID')?.value;
    const existingSize = (testGroup.get('specimenSize')?.value || '').trim().toLowerCase();
    const sample = this.samples.find(s => s.id === sampleId);
    const sampleSpecimen = (sample?.specimen || sample?.Specimen || '').trim().toLowerCase();

    // 1. Try to find matching config
    let matched: any = null;
    if (existingMasterId) {
      matched = configs.find(c => c.id === existingMasterId);
    }
    if (!matched && existingSize) {
      matched = configs.find(c => c.specimenSize && c.specimenSize.trim().toLowerCase() === existingSize);
    }
    if (!matched && sampleSpecimen) {
      matched = configs.find(c => c.specimenSize && c.specimenSize.trim().toLowerCase() === sampleSpecimen);
    }

    // 2. If no existing selection and configs has only 1, auto-select it
    if (!matched && configs.length === 1 && !existingMasterId && !existingSize) {
      matched = configs[0];
    }

    if (matched) {
      const { mRate, cRate } = this.resolveRates(matched, isHard);
      this.selectedSpecimenMap[key] = {
        id: matched.id,
        name: matched.specimenSize ? `${matched.specimenSize} (Raw: ${matched.specimenRawMaterialSize || 'Std'})` : `Config #${matched.id}`,
        rawObj: matched
      };

      testGroup.patchValue({
        specimenPreparationMasterID: matched.id,
        specimenSize: matched.specimenSize || '',
        specimenRawMaterialSize: matched.specimenRawMaterialSize || '',
        drawingFilePath: matched.drawingFilePath || '',
        machiningRate: mRate,
        cuttingRate: cRate
      });

      const prepItem = this.samplePrepTests[sampleId]?.[testIndex];
      if (prepItem) {
        prepItem.specimenPreparationMasterID = matched.id;
        prepItem.specimenSize = matched.specimenSize;
        prepItem.specimenRawMaterialSize = matched.specimenRawMaterialSize;
        prepItem.drawingFilePath = matched.drawingFilePath;
        prepItem.fileName = matched.fileName;
        prepItem.resolvedMachiningRate = mRate;
        prepItem.resolvedCuttingRate = cRate;
      }
    } else if (existingMasterId || existingSize) {
      // Rebind existing values even if not found in master configs list
      const rawSize = testGroup.get('specimenRawMaterialSize')?.value || '';
      const sizeVal = testGroup.get('specimenSize')?.value || '';
      this.selectedSpecimenMap[key] = {
        id: existingMasterId || 0,
        name: sizeVal ? (rawSize ? `${sizeVal} (Raw: ${rawSize})` : sizeVal) : `Config #${existingMasterId}`,
        rawObj: {
          id: existingMasterId,
          specimenSize: sizeVal,
          specimenRawMaterialSize: rawSize
        }
      };
    }
    this.cdr.markForCheck();
  }

  private resolveRates(raw: any, isHard: boolean): { mRate: number; cRate: number } {
    if (!raw) return { mRate: 0, cRate: 0 };
    const ver = raw.versions && raw.versions.length > 0
      ? [...raw.versions].sort((a: any, b: any) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0]
      : null;
    const mRate = isHard
      ? (ver?.priceHardMetal ?? raw.currentPriceHardMetal ?? raw.priceHardMetal ?? ver?.priceGeneralMetal ?? raw.currentPriceGeneralMetal ?? raw.priceGeneralMetal ?? 0)
      : (ver?.priceGeneralMetal ?? raw.currentPriceGeneralMetal ?? raw.priceGeneralMetal ?? 0);
    const cRate = isHard
      ? (ver?.cuttingRateHardMetal ?? raw.cuttingRateHardMetal ?? ver?.cuttingRateGeneralMetal ?? raw.cuttingRateGeneralMetal ?? 0)
      : (ver?.cuttingRateGeneralMetal ?? raw.cuttingRateGeneralMetal ?? 0);
    return { mRate: +mRate || 0, cRate: +cRate || 0 };
  }

  getSpecimenDropdownFn = (sampleId: number, testIndex: number) => {
    return (term: string, page: number, pageSize: number) => {
      const item = this.samplePrepTests[sampleId]?.[testIndex];
      const key = `${sampleId}_${testIndex}`;
      const currentSelected = this.selectedSpecimenMap[key];

      const cacheKey = item ? `${item.testId}_${item.standardId || 0}` : '';
      const configs = this.specimenConfigsMap[cacheKey] || [];
      const mapped = configs.map(c => ({
        id: c.id,
        name: c.specimenSize ? `${c.specimenSize} (Raw: ${c.specimenRawMaterialSize || 'Standard'})` : `Config #${c.id}`,
        rawObj: c
      }));

      if (currentSelected && !mapped.some(m => m.id === currentSelected.id || m.name === currentSelected.name)) {
        mapped.unshift(currentSelected);
      }

      if (term && term.trim()) {
        const t = term.toLowerCase();
        return of(mapped.filter(m => m.name.toLowerCase().includes(t)));
      }
      return of(mapped);
    };
  };

  onSpecimenSelected(item: any, sampleId: number, testIndex: number): void {
    const key = `${sampleId}_${testIndex}`;
    this.selectedSpecimenMap[key] = item;
    const testGroup = this.getTestGroup(sampleId, testIndex);
    if (!testGroup) return;

    const sample = this.samples.find(s => s.id === sampleId);
    const isHard = this.isHardMetal(sample);
    const raw = item?.rawObj;

    if (raw) {
      const { mRate, cRate } = this.resolveRates(raw, isHard);

      testGroup.patchValue({
        specimenPreparationMasterID: raw.id,
        specimenSize: raw.specimenSize || '',
        specimenRawMaterialSize: raw.specimenRawMaterialSize || '',
        drawingFilePath: raw.drawingFilePath || '',
        quantity: raw.specimenQuantity && raw.specimenQuantity > 0 ? raw.specimenQuantity : testGroup.get('quantity')?.value,
        requiresCutting: raw.cuttingRequired !== undefined ? raw.cuttingRequired : testGroup.get('requiresCutting')?.value,
        requiresMachining: raw.machiningRequired !== undefined ? raw.machiningRequired : testGroup.get('requiresMachining')?.value,
        machiningRate: mRate,
        cuttingRate: cRate
      });

      const prepItem = this.samplePrepTests[sampleId]?.[testIndex];
      if (prepItem) {
        prepItem.specimenPreparationMasterID = raw.id;
        prepItem.specimenSize = raw.specimenSize;
        prepItem.specimenRawMaterialSize = raw.specimenRawMaterialSize;
        prepItem.drawingFilePath = raw.drawingFilePath;
        prepItem.fileName = raw.fileName;
        prepItem.resolvedMachiningRate = mRate;
        prepItem.resolvedCuttingRate = cRate;
        if (raw.specimenQuantity) prepItem.quantity = raw.specimenQuantity;
        if (raw.cuttingRequired !== undefined) prepItem.requiresCutting = raw.cuttingRequired;
        if (raw.machiningRequired !== undefined) prepItem.requiresMachining = raw.machiningRequired;
      }
    } else {
      testGroup.patchValue({
        specimenPreparationMasterID: null,
        specimenSize: '',
        specimenRawMaterialSize: '',
        drawingFilePath: '',
        machiningRate: 0,
        cuttingRate: 0
      });
    }
    this.cdr.markForCheck();
  }

  getSpecimenSelected(sampleId: number, testIndex: number): any {
    const key = `${sampleId}_${testIndex}`;
    if (this.selectedSpecimenMap[key]) {
      return this.selectedSpecimenMap[key];
    }
    const testGroup = this.getTestGroup(sampleId, testIndex);
    if (testGroup) {
      const masterId = testGroup.get('specimenPreparationMasterID')?.value;
      const specSize = testGroup.get('specimenSize')?.value;
      const rawSize = testGroup.get('specimenRawMaterialSize')?.value;
      if (masterId || specSize) {
        const displayName = specSize
          ? (rawSize ? `${specSize} (Raw: ${rawSize})` : specSize)
          : `Config #${masterId}`;
        const item = {
          id: masterId || 0,
          name: displayName,
          rawObj: { id: masterId, specimenSize: specSize, specimenRawMaterialSize: rawSize }
        };
        this.selectedSpecimenMap[key] = item;
        return item;
      }
    }
    return null;
  }

  getTests(sampleId: number): FormArray {
    return this.sampleForms[sampleId]?.get('tests') as FormArray;
  }

  getTestGroup(sampleId: number, index: number): FormGroup {
    return this.getTests(sampleId)?.at(index) as FormGroup;
  }

  getMachiningSubtotal(sampleId: number): number {
    const tests = this.getTests(sampleId);
    if (!tests) return 0;
    return tests.controls.reduce((sum, ctrl) => {
      if (!ctrl.get('requiresMachining')?.value) return sum;
      const qty = +(ctrl.get('quantity')?.value || 1);
      const rate = +(ctrl.get('machiningRate')?.value || 0);
      return sum + (qty * rate);
    }, 0);
  }

  getCuttingSubtotal(sampleId: number): number {
    const form = this.sampleForms[sampleId];
    if (!form) return 0;
    const cuts = +(form.get('numberOfCuts')?.value || 0);
    const tests = this.getTests(sampleId);
    let maxCuttingRate = 0;
    if (tests && tests.length > 0) {
      tests.controls.forEach(ctrl => {
        if (!ctrl.get('requiresCutting')?.value) return;
        const rate = +(ctrl.get('cuttingRate')?.value || 0);
        if (rate > maxCuttingRate) maxCuttingRate = rate;
      });
    }
    return cuts * maxCuttingRate;
  }

  getOtherSubtotal(sampleId: number): number {
    const form = this.sampleForms[sampleId];
    if (!form) return 0;
    const waterJetMins = +(form.get('waterJetCuttingMins')?.value || 0);
    const edm = +(form.get('edmCuttingCharge')?.value || 0);
    const gas = +(form.get('gasCuttingCharge')?.value || 0);
    const special = +(form.get('specialCuttingCharge')?.value || 0);
    return (waterJetMins * 10) + edm + gas + special;
  }

  getTotalPreparationCost(sampleId: number): number {
    return this.getMachiningSubtotal(sampleId) + this.getCuttingSubtotal(sampleId) + this.getOtherSubtotal(sampleId);
  }

  viewDrawing(filePath: string): void {
    if (!filePath) return;
    const url = filePath.startsWith('http') ? filePath : this.baseUrl + (filePath.startsWith('/') ? '' : '/') + filePath;
    window.open(url, '_blank');
  }

  saveSampleCuttingPlan(sampleId: number): void {
    const form = this.sampleForms[sampleId];
    if (!form || form.invalid) return;

    this.isSaving[sampleId] = true;
    const formValue = form.getRawValue();

    const payload = {
      sampleId: sampleId,
      numberOfCuts: formValue.numberOfCuts,
      cutThickness: formValue.cutThickness,
      waterJetCuttingMins: formValue.waterJetCuttingMins,
      edmCutting: formValue.edmCutting,
      edmCuttingCharge: formValue.edmCuttingCharge,
      gasCutting: formValue.gasCutting,
      gasCuttingCharge: formValue.gasCuttingCharge,
      specialCutting: formValue.specialCutting,
      specialCuttingCharge: formValue.specialCuttingCharge,
      machiningChargesTotal: this.getMachiningSubtotal(sampleId),
      cuttingChargesTotal: this.getCuttingSubtotal(sampleId),
      otherChargesTotal: this.getOtherSubtotal(sampleId),
      tests: formValue.tests
    };

    this.inwardService.updateSamplePrep(sampleId, payload).subscribe({
      next: () => {
        this.isSaving[sampleId] = false;
        this.toast.show('Preparation and cutting plan saved successfully.', 'success');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSaving[sampleId] = false;
        this.toast.show(err?.error?.message || 'Failed to save preparation plan.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  completePreparationAndProceed(): void {
    if (!this.inwardId) return;

    // Save all sample plans
    const saveObservables: any[] = [];
    this.samples.forEach(sample => {
      const form = this.sampleForms[sample.id];
      if (form && form.valid) {
        const formValue = form.getRawValue();
        const payload = {
          sampleId: sample.id,
          numberOfCuts: formValue.numberOfCuts,
          cutThickness: formValue.cutThickness,
          waterJetCuttingMins: formValue.waterJetCuttingMins,
          edmCutting: formValue.edmCutting,
          edmCuttingCharge: formValue.edmCuttingCharge,
          gasCutting: formValue.gasCutting,
          gasCuttingCharge: formValue.gasCuttingCharge,
          specialCutting: formValue.specialCutting,
          specialCuttingCharge: formValue.specialCuttingCharge,
          machiningChargesTotal: this.getMachiningSubtotal(sample.id),
          cuttingChargesTotal: this.getCuttingSubtotal(sample.id),
          otherChargesTotal: this.getOtherSubtotal(sample.id),
          tests: formValue.tests
        };
        saveObservables.push(this.inwardService.updateSamplePrep(sample.id, payload));
      }
    });

    this.isCompleting = true;
    this.inwardService.completeSamplePreparation(this.inwardId).subscribe({
      next: (res: any) => {
        this.isCompleting = false;
        this.toast.show(res?.message || 'Sample Preparation completed. Case is now Under Testing.', 'success');
        this.prepCompleted.emit();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isCompleting = false;
        this.toast.show(err?.error?.message || 'Failed to complete preparation stage.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'active':
      case 'completed': return 'bg-success text-white';
      case 'in_progress':
      case 'inprogress':
      case 'sample_under_preparation': return 'bg-warning text-dark';
      case 'cancelled': return 'bg-danger text-white';
      default: return 'bg-secondary text-white';
    }
  }
}
