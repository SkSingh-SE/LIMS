import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { SamplePreparationService } from '../../../services/sample-preparation.service';
import { CuttingService } from '../../../services/cutting.service';
import { CuttingPriceMasterService } from '../../../services/cutting-price-master.service';
import { TestResultService } from '../../../services/test-result.service';
import { SpecimenTypeService } from '../../../services/specimen-type.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';

@Component({
  selector: 'app-sample-preparation-form',
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
  activeTab: 'cutting' | 'machining' | 'other' | 'summary' = 'cutting';

  prepData: any = null;
  prepForm!: FormGroup;

  // Cutting
  cuttingPriceList: any[] = [];
  cuttingForm!: FormGroup;
  cuttingHeaderId = 0;
  cuttingSampleId = 0;
  cuttingSampleHeaderId = 0;

  // Machining
  machiningItems: any[] = [];
  newMachiningDesc = '';
  newMachiningAmount: number | null = null;
  newMachiningRemark = '';

  // Other
  otherPrepRequired = false;
  otherPrepCharge = 0;
  machiningRequired = false;
  machiningAmount = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private prepService: SamplePreparationService,
    private cuttingService: CuttingService,
    private cuttingPriceMasterService: CuttingPriceMasterService,
    private testResultService: TestResultService,
    private specimenTypeService: SpecimenTypeService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadCuttingPriceMasters();

    const urlPath = this.router.url;
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (urlPath.includes('/preparation/details/')) { this.isViewMode = true; this.prepId = id; }
    else if (urlPath.includes('/preparation/edit/')) { this.isEditMode = true; this.prepId = id; }
    else if (urlPath.includes('/preparation/create/')) { this.sampleId = id; }

    const state = history.state as { mode?: string };
    if (state?.mode === 'view') this.isViewMode = true;
    if (state?.mode === 'edit') this.isEditMode = true;

    if (this.prepId > 0) this.loadPrepData(this.prepId);
    else if (this.sampleId > 0) this.loadBySample(this.sampleId);
  }

  private initForms(): void {
    this.prepForm = this.fb.group({
      id: [0],
      status: ['Pending'],
      equipmentID: [null],
      preparationMethod: [''],
      temperature: [null],
      humidity: [null],
      preparationInstructions: [''],
      preConditionNotes: [''],
      postConditionNotes: [''],
      verificationRemarks: [''],
    });

    this.cuttingForm = this.fb.group({
      specimenTypeId: [null],
      length: [null],
      width: [null],
      thickness: [null],
      diameter: [null],
      orientation: [null],
      cuttingDetails: this.fb.array([]),
    });
  }

  // ── Data Loading ──

  private loadPrepData(id: number): void {
    this.prepService.getById(id).subscribe({
      next: (data) => {
        this.prepData = data;
        this.sampleId = data.sampleID;
        this.inwardId = data.inwardID;
        this.patchPrepForm(data);
        this.loadCuttingData();
        this.loadMachiningData();
        this.loadOtherPrepData();
        if (this.isViewMode) this.prepForm.disable();
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
        this.patchPrepForm(data);
        this.loadCuttingData();
        this.loadMachiningData();
        this.loadOtherPrepData();
      },
      error: () => this.toastService.show('Failed to load preparation data', 'error'),
    });
  }

  private patchPrepForm(data: any): void {
    this.prepForm.patchValue({
      id: data.id,
      status: data.status,
      equipmentID: data.equipmentID,
      preparationMethod: data.preparationMethod || '',
      temperature: data.temperature,
      humidity: data.humidity,
      preparationInstructions: data.preparationInstructions || '',
      preConditionNotes: data.preConditionNotes || '',
      postConditionNotes: data.postConditionNotes || '',
      verificationRemarks: data.verificationRemarks || '',
    });
  }

  // ── Cutting ──

  private loadCuttingPriceMasters(): void {
    this.cuttingPriceMasterService.getAllCuttingPriceMastersWithoutFilter().subscribe({
      next: (data) => {
        this.cuttingPriceList = data?.map((item: any) => ({
          id: item.id, cuttingType: item.cuttingType, unitType: item.unitType, rate: item.ratePerUnit
        })) || [];
      },
    });
  }

  private loadCuttingData(): void {
    if (!this.inwardId) return;
    this.cuttingService.getCuttingByInward(this.inwardId).subscribe({
      next: (data) => {
        if (!data) return;
        this.cuttingHeaderId = data.id;
        const sample = data.samples?.find((s: any) => s.sampleID === this.sampleId) || data.samples?.[0];
        if (sample) {
          this.cuttingSampleId = sample.id;
          this.cuttingSampleHeaderId = sample.cuttingChargeHeaderID || this.cuttingHeaderId;
          this.cuttingForm.patchValue({
            specimenTypeId: sample.specimenTypeId,
            length: sample.length,
            width: sample.width,
            thickness: sample.thickness,
            diameter: sample.diameter,
            orientation: sample.orientation,
          });

          const detailsArray = this.cuttingForm.get('cuttingDetails') as FormArray;
          detailsArray.clear();
          sample.cuttingChargeDetails?.forEach((d: any) => {
            detailsArray.push(this.fb.group({
              id: [d.id || 0],
              cuttingID: [d.cuttingID],
              cuttingType: [d.cuttingType],
              unitType: [d.unitType],
              rate: [d.rate],
              quantity: [d.quantity, [Validators.required, Validators.min(1)]],
              total: [{ value: d.total, disabled: true }],
            }));
          });
        }
      },
    });
  }

  get cuttingDetails(): FormArray {
    return this.cuttingForm.get('cuttingDetails') as FormArray;
  }

  addCuttingType(price: any): void {
    if (this.cuttingDetails.controls.some(c => c.get('cuttingID')?.value === price.id)) {
      this.toastService.show(`${price.cuttingType} already added`, 'warning');
      return;
    }
    this.cuttingDetails.push(this.fb.group({
      id: [0],
      cuttingID: [price.id],
      cuttingType: [price.cuttingType],
      unitType: [price.unitType],
      rate: [price.rate],
      quantity: [1, [Validators.required, Validators.min(1)]],
      total: [{ value: price.rate, disabled: true }],
    }));
    this.recalcCuttingRow(this.cuttingDetails.length - 1);
  }

  removeCuttingRow(index: number): void {
    this.cuttingDetails.removeAt(index);
  }

  recalcCuttingRow(index: number): void {
    const row = this.cuttingDetails.at(index);
    const rate = row.get('rate')?.value || 0;
    const qty = row.get('quantity')?.value || 0;
    row.get('total')?.setValue(rate * qty);
  }

  get cuttingSubtotal(): number {
    return this.cuttingDetails.controls.reduce((sum, c) => sum + (c.get('total')?.value || 0), 0);
  }

  fetchSpecimenTypeDropdown = (term: string, page: number, pageSize: number) =>
    this.specimenTypeService.getSpecimenTypeDropdown(term, page, pageSize);

  onSpecimenTypeSelected(item: any): void {
    this.cuttingForm.patchValue({ specimenTypeId: item?.id || null });
  }

  // ── Machining ──

  private loadMachiningData(): void {
    if (!this.sampleId) return;
    this.testResultService.getMachiningItems(this.sampleId).subscribe({
      next: (data) => this.machiningItems = data || [],
    });
  }

  addMachiningItem(): void {
    if (!this.newMachiningDesc?.trim() || !this.newMachiningAmount) return;
    this.testResultService.addMachiningItem(this.sampleId, {
      description: this.newMachiningDesc.trim(),
      amount: this.newMachiningAmount,
      remark: this.newMachiningRemark?.trim() || undefined,
    }).subscribe({
      next: () => {
        this.newMachiningDesc = '';
        this.newMachiningAmount = null;
        this.newMachiningRemark = '';
        this.loadMachiningData();
        this.refreshCharges();
        this.toastService.show('Machining charge added', 'success');
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to add', 'error'),
    });
  }

  deleteMachiningItem(itemId: number): void {
    if (!confirm('Delete this machining charge?')) return;
    this.testResultService.deleteMachiningItem(itemId).subscribe({
      next: () => {
        this.loadMachiningData();
        this.refreshCharges();
        this.toastService.show('Machining charge deleted', 'success');
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to delete', 'error'),
    });
  }

  get machiningTotal(): number {
    return this.machiningItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  // ── Other Preparation ──

  private loadOtherPrepData(): void {
    if (!this.prepData) return;
    this.otherPrepRequired = this.prepData.otherChargesTotal > 0;
    this.otherPrepCharge = this.prepData.otherChargesTotal || 0;
    this.machiningRequired = this.prepData.machiningChargesTotal > 0;
    this.machiningAmount = this.prepData.machiningChargesTotal || 0;
  }

  // ── Save ──

  saveCutting(): void {
    const cutVal = this.cuttingForm.getRawValue();
    const samples = [{
      id: this.cuttingSampleId || 0,
      cuttingChargeHeaderID: this.cuttingHeaderId || 0,
      sampleID: this.sampleId,
      sampleNo: this.prepData?.sampleNo || '',
      metalClassificationID: 0,
      specimenTypeId: cutVal.specimenTypeId,
      length: cutVal.length,
      width: cutVal.width,
      thickness: cutVal.thickness,
      diameter: cutVal.diameter,
      orientation: cutVal.orientation,
      preparationStatus: 'InProgress',
      cuttingChargeDetails: cutVal.cuttingDetails.map((d: any) => ({
        id: d.id || 0,
        cuttingID: d.cuttingID,
        cuttingType: d.cuttingType,
        unitType: d.unitType,
        rate: d.rate,
        quantity: d.quantity,
        total: d.rate * d.quantity,
      })),
      sampleTotal: this.cuttingSubtotal,
    }];

    const payload = {
      id: this.cuttingHeaderId || 0,
      inwardId: this.inwardId,
      samples,
      grandTotal: this.cuttingSubtotal,
    };

    const obs = this.cuttingHeaderId > 0
      ? this.cuttingService.updateCutting(payload)
      : this.cuttingService.createCutting(payload);

    obs.subscribe({
      next: () => {
        this.toastService.show('Cutting charges saved', 'success');
        this.loadCuttingData();
        this.refreshCharges();
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to save cutting', 'error'),
    });
  }

  savePrepDetails(): void {
    const val = this.prepForm.getRawValue();
    this.prepService.update({
      ...val, ID: this.prepId,
    }).subscribe({
      next: (res) => {
        this.prepData = res.data || res;
        this.toastService.show('Preparation details saved', 'success');
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to save', 'error'),
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
      error: (err) => this.toastService.show(err?.error?.message || 'Failed', 'error'),
    });
  }

  refreshCharges(): void {
    if (!this.sampleId) return;
    this.prepService.refreshCharges(this.sampleId).subscribe({
      next: () => {
        if (this.prepId > 0) this.loadPrepData(this.prepId);
      },
    });
  }

  get grandTotal(): number {
    return this.cuttingSubtotal + this.machiningTotal + this.otherPrepCharge;
  }

  isPrinting = false;

  printJobCard(): void {
    this.isPrinting = true;
    setTimeout(() => {
      window.print();
      this.isPrinting = false;
    }, 100);
  }

  goBack(): void {
    this.router.navigate(['/sample/preparation']);
  }
}
