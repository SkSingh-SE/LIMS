import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { Observable } from 'rxjs';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { CuttingPriceMasterService } from '../../../services/cutting-price-master.service';
import { CuttingService } from '../../../services/cutting.service';

// ──────── Typed DTOs ────────
export interface PriceDto {
  id: string;
  cuttingType: string;
  unitType: string;
  rate: number;
}

export interface SampleDto {
  id: string;
  sampleNo: string;
  details: string;
  quantity: number;
  metalClassificationID?: number;
}

export interface CuttingChargePayload {
  id:number;
  inwardId: number;
  samples: Array<{
    id: string;
    cuttingChargeHeaderID: number
    sampleNo: string;
    sampleID: number;
    details: string;
    quantity: number;
    metalClassificationID: string;
    cuttingChargeDetails: Array<{
      id: number;
      cuttingChargeSampleID: number;
      cuttingID: string;
      cuttingType: string;
      unitType: string;
      rate: number;
      quantity: number;
      total: number;
    }>;
  }>;
  grandTotal: number;
}

export interface CuttingChargeResponse {
  id: number;
  inwardID: number;
  grandTotal: number;
  samples: Array<{
    id: number;
    cuttingChargeHeaderID: number;
    sampleID: number;
    sampleNo: string;
    metalClassificationID: number;
    sampleTotal: number;
    cuttingChargeDetails: Array<{
      id: number;
      cuttingChargeSampleID: number;
      cuttingID: number;
      cuttingType: string;
      unitType: string;
      rate: number;
      quantity: number;
      total: number;
    }>;
  }>;
}

@Component({
  selector: 'app-cutting-sample-form',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NumberOnlyDirective, SearchableDropdownComponent],
  templateUrl: './cutting-sample-form.component.html',
  styleUrl: './cutting-sample-form.component.css'
})
export class CuttingSampleFormComponent implements OnInit {
  // State Management
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  cuttingChargeId: number | null = null;

  // Cutting price list (master data)
  priceList: PriceDto[] = [];

  // Available samples loaded from API
  availableSamples: SampleDto[] = [];
  selectedInwardId: number = 0;
  selectedInwardItem: any = null;

  // Reactive Form
  cuttingForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private inwardService: SampleInwardService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private metalService: MetalClassificationService,
    private cuttingPriceService: CuttingPriceMasterService,
    private cuttingService: CuttingService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.getPriceMasters();
    this.checkEditMode();
  }

  // ────────────── Mode Detection ──────────────
  private checkEditMode(): void {
    let id:number = 0;
    this.route.paramMap.subscribe(params => {
        id = Number(params.get('id'));
    });

    const state = history.state as { mode?: string };
    if (state?.mode === 'view') {
      this.isViewMode = true;
      this.cuttingChargeId = id;
    } else if (state?.mode === 'edit') {
      this.isEditMode = true;
      this.cuttingChargeId = id;
    }else if (state?.mode === 'create') {
      this.selectedInwardId = id;
    }

    if (this.cuttingChargeId) {
      this.loadCuttingChargeData(this.cuttingChargeId);
    }
  }

  private loadCuttingChargeData(id: number): void {
    this.cuttingService.getCuttingById(id).subscribe({
      next: (data: CuttingChargeResponse) => {
        this.cuttingChargeId = data.id;
        this.selectedInwardId = data.inwardID;
        this.populateFormWithData(data);

        if (this.isViewMode) {
          this.disableFormRecursively(this.cuttingForm);
        }
      },
      error: (err) => {
        console.error('Error loading cutting charge data:', err);
        this.toastService.show('Error loading data. Please try again.', 'error');
        this.router.navigate(['/sample/cutting']);
      }
    });
  }

  private populateFormWithData(data: CuttingChargeResponse): void {
    // Load inward details first
   // Populate samples
        data.samples.forEach(sampleData => {
          const sampleGroup = this.fb.group({
            id: [sampleData.id],
            cuttingChargeHeaderID: [sampleData.cuttingChargeHeaderID],
            sampleID: [sampleData.sampleID],
            sampleNo: [sampleData.sampleNo],
            details: [sampleData.id],
            quantity: [sampleData.id],
            metalClassificationID: [sampleData.metalClassificationID, Validators.required],
            cuttingChargeDetails: this.fb.array([])
          });

          // Populate cutting details
          sampleData.cuttingChargeDetails.forEach(cuttingData => {
            const cuttingGroup = this.fb.group({
              id: [cuttingData.id],
              cuttingChargeSampleID: [cuttingData.cuttingChargeSampleID],
              cuttingID: [cuttingData.cuttingID],
              cuttingType: [cuttingData.cuttingType],
              unitType: [cuttingData.unitType],
              rate: [{ value: cuttingData.rate, disabled: this.isViewMode }],
              quantity: [{ value: cuttingData.quantity, disabled: this.isViewMode }],
              total: [{ value: cuttingData.total, disabled: true }]
            });

            (sampleGroup.get('cuttingChargeDetails') as FormArray).push(cuttingGroup);
          });

          this.samplesFA.push(sampleGroup);
        });
  }

  // ────────────── Form Initialization ──────────────
  private initForm(): void {
    this.cuttingForm = this.fb.group({
      samples: this.fb.array([])
    });
  }

  // ────────────── Getters ──────────────
  get samplesFA(): FormArray {
    return this.cuttingForm.get('samples') as FormArray;
  }

  get allChecked(): boolean {
    return (
      this.availableSamples.length > 0 &&
      this.samplesFA.length === this.availableSamples.length
    );
  }

  cuttingsFA(sampleIdx: number): FormArray {
    return this.samplesFA.at(sampleIdx).get('cuttingChargeDetails') as FormArray;
  }

  // ────────────── Utility Methods ──────────────
  private disableFormRecursively(control: AbstractControl): void {
    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.keys(control.controls).forEach(key => {
        const childControl = control.get(key);
        if (childControl) {
          if (childControl instanceof FormGroup || childControl instanceof FormArray) {
            this.disableFormRecursively(childControl);
          } else {
            childControl.disable({ emitEvent: false });
          }
        }
      });
    } else {
      control.disable({ emitEvent: false });
    }
  }

  isSampleChecked(sampleId: string): boolean {
    return this.samplesFA.controls.some(c => c.get('id')?.value === sampleId);
  }

  private validateForm(): boolean {
    if (!this.selectedInwardId || this.selectedInwardId === 0) {
      this.toastService.show('Please select a collection number.', 'warning');
      return false;
    }

    if (this.samplesFA.length === 0) {
      this.toastService.show('Please select at least one sample.', 'warning');
      return false;
    }

    let isValid = true;
    this.samplesFA.controls.forEach((sampleCtrl, idx) => {
      const metalClassificationID = sampleCtrl.get('metalClassificationID')?.value;
      const cuttings = sampleCtrl.get('cuttingChargeDetails') as FormArray;

      if (!metalClassificationID) {
        this.toastService.show(`Sample ${idx + 1}: Material Type is required.`, 'warning');
        isValid = false;
        return;
      }

      if (cuttings.length === 0) {
        this.toastService.show(`Sample ${idx + 1}: Add at least one cutting type.`, 'warning');
        isValid = false;
        return;
      }

      cuttings.controls.forEach((cutting, cIdx) => {
        const qty = +cutting.get('quantity')?.value || 0;
        if (qty <= 0) {
          this.toastService.show(`Sample ${idx + 1}, Cutting ${cIdx + 1}: Quantity must be greater than 0.`, 'warning');
          isValid = false;
        }
      });
    });

    return isValid;
  }

  // ────────────── API Methods ──────────────
  fetchSampleInwardDropdown = (searchTerm: string, pageNumber: number, pageSize: number): Observable<any[]> => {
    return this.inwardService.getPreparationInwardDropdown(searchTerm, pageNumber, pageSize);
  };

  getPriceMasters(): void {
    this.cuttingPriceService.getAllCuttingPriceMastersWithoutFilter().subscribe({
      next: (data) => {
        this.priceList = data?.map((item: any) => ({
          id: item.id,
          cuttingType: item.cuttingType,
          unitType: item.unitType,
          rate: item.ratePerUnit
        })) || [];
      },
      error: (err) => {
        console.error('Error fetching cutting price masters:', err);
        this.toastService.show(err?.message || 'Error loading cutting prices.', 'error');
      }
    });
  }

  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalService.getMetalClassificationDropdown(term, page, pageSize);
  };

  // ────────────── Event Handlers ──────────────
  onInwardSelected(item: any): void {
    if (!item || !item.id) {
      this.resetSampleSelection();
      return;
    }

    this.selectedInwardId = item.id;
    this.selectedInwardItem = item;

    if(this.isEditMode || this.isViewMode) {
      return; // Do not reload samples in edit/view mode
    }
    this.inwardService.getSampleInwardById(item.id).subscribe({
      next: (data) => {
        if (!data?.sampleDetails || data.sampleDetails.length === 0) {
          this.toastService.show('No samples found for this collection.', 'warning');
          this.resetSampleSelection();
          return;
        }

        this.availableSamples = data.sampleDetails
          .filter((s: any) => s.preparationRequired === true)
          .map((s: any) => ({
            id: 0,
            sampleID: s.id,
            sampleNo: s.sampleNo,
            details: s.details,
            quantity: s.quantity,
            metalClassificationID: s.metalClassificationID
          }));

        this.samplesFA.clear();
        this.toastService.show(`${this.availableSamples.length} samples loaded.`, 'success');
      },
      error: (err) => {
        console.error('Error fetching inward details:', err);
        this.toastService.show('Error loading samples. Please try again.', 'error');
        this.resetSampleSelection();
      }
    });
  }

  onMetalClassificationSelected(item: any, sampleIndex: number): void {
    const sampleGroup = this.samplesFA.at(sampleIndex) as FormGroup;
    sampleGroup.patchValue({ metalClassificationID: item.id });
  }

  private resetSampleSelection(): void {
    this.availableSamples = [];
    this.samplesFA.clear();
    this.selectedInwardId = 0;
    this.selectedInwardItem = null;
  }

  // ────────────── Sample Selection ──────────────
  toggleAllSamples(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.samplesFA.clear();

    if (checked) {
      this.availableSamples.forEach(s => this.samplesFA.push(this.buildSampleGroup(s)));
    }
  }

  toggleSample(sample: SampleDto, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      if (!this.isSampleChecked(sample.id)) {
        this.samplesFA.push(this.buildSampleGroup(sample));
      }
    } else {
      const idx = this.samplesFA.controls.findIndex(c => c.get('id')?.value === sample.id);
      if (idx > -1) this.samplesFA.removeAt(idx);
    }
  }

  private buildSampleGroup(sample: SampleDto): FormGroup {
    return this.fb.group({
      id: [sample.id],
      sampleNo: [sample.sampleNo],
      details: [sample.details],
      quantity: [sample.quantity],
      metalClassificationID: [sample.metalClassificationID, Validators.required],
      cuttingChargeDetails: this.fb.array([])
    });
  }

  // ────────────── Cutting Rows ──────────────
  addCutting(sampleIdx: number, price: PriceDto): void {
    const cuts = this.cuttingsFA(sampleIdx);

    if (cuts.controls.some(c => c.get('cuttingID')?.value === price.id)) {
      this.toastService.show(`${price.cuttingType} already added for this sample.`, 'warning');
      return;
    }

    cuts.push(this.fb.group({
      cuttingID: [price.id],
      cuttingType: [price.cuttingType],
      unitType: [price.unitType],
      rate: [{ value: price.rate, disabled: this.isViewMode }],
      quantity: ['', [Validators.required, Validators.min(1)]],
      total: [{ value: 0, disabled: true }]
    }));
  }

  updateTotal(sampleIdx: number, rowIdx: number): void {
    const row = this.cuttingsFA(sampleIdx).at(rowIdx);
    const qty = +row.get('quantity')?.value || 0;
    const rate = +row.get('rate')?.value || 0;
    const total = qty * rate;

    row.get('total')?.setValue(total);
  }

  removeCutting(sampleIdx: number, rowIdx: number): void {
    if (this.isViewMode) return;
    this.cuttingsFA(sampleIdx).removeAt(rowIdx);
  }

  removeSample(sampleIdx: number): void {
    if (this.isViewMode) return;
    this.samplesFA.removeAt(sampleIdx);
  }

  // ────────────── Calculations ──────────────
  sampleTotal(sampleIdx: number): number {
    return this.cuttingsFA(sampleIdx).controls.reduce((sum, row) => {
      return sum + (+row.get('total')?.value || 0);
    }, 0);
  }

  grandTotal(): number {
    return this.samplesFA.controls.reduce((total, _, idx) => {
      return total + this.sampleTotal(idx);
    }, 0);
  }

  // ────────────── Submission ──────────────
  save(): void {
    if (!this.validateForm()) return;

    const samplesData = this.samplesFA.getRawValue();
    const payload: CuttingChargePayload = {
      id: 0,
      inwardId: this.selectedInwardId,
      samples: samplesData,
      grandTotal: this.grandTotal()
    };

    if (this.isEditMode && this.cuttingChargeId) {
      this.updateCuttingCharge(payload);
    } else {
      this.createCuttingCharge(payload);
    }
  }

  private createCuttingCharge(payload: CuttingChargePayload): void {
    this.cuttingService.createCutting(payload).subscribe({
      next: () => {
        this.toastService.show('Cutting charges saved successfully!', 'success');
        this.router.navigate(['/sample/cutting']);
      },
      error: (err) => {
        console.error('Error saving cutting charges:', err);
        this.toastService.show('Error saving cutting charges. Please try again.', 'error');
      }
    });
  }

  private updateCuttingCharge(payload: CuttingChargePayload): void {
    if (!this.cuttingChargeId) return;

    this.cuttingService.updateCutting(payload).subscribe({
      next: () => {
        this.toastService.show('Cutting charges updated successfully!', 'success');
        this.router.navigate(['/sample/cutting']);
      },
      error: (err) => {
        console.error('Error updating cutting charges:', err);
        this.toastService.show('Error updating cutting charges. Please try again.', 'error');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/sample/cutting']);
  }
}
