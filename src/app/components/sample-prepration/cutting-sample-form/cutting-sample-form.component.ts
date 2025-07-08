import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';

/* ──────── typed DTOs ──────── */
export interface CollectionDto {
  id: string;
  collectionNo: string;
  sampleCount: number;
}
export interface SampleDto {
  id: string;
  sampleNo: string;
}
export interface PriceDto {
  id: string;
  cuttingType: string;
  unitType: string;
  rate: number;
}

@Component({
  selector: 'app-cutting-sample-form',
  imports: [CommonModule, ReactiveFormsModule,FormsModule, NumberOnlyDirective],
  templateUrl: './cutting-sample-form.component.html',
  styleUrl: './cutting-sample-form.component.css'
})
export class CuttingSampleFormComponent implements OnInit {

  /* ---------------- Dummy master data ---------------- */
  collections = [
    { id: 'col-001', collectionNo: 'COL-2024-001', sampleCount: 3 },
    { id: 'col-002', collectionNo: 'COL-2024-002', sampleCount: 2 }
  ];

  priceList = [
    { id: 'p1', cuttingType: 'Hacksaw', unitType: 'Per Cut',    rate: 20 },
    { id: 'p2', cuttingType: 'EDM Wire', unitType: 'Per Minute', rate: 50 },
    { id: 'p3', cuttingType: 'Gas Cut',  unitType: 'Per Sample', rate: 30 }
  ];

  availableSamples: { id: string; sampleNo: string }[] = [];   // loaded after collection select

  /* ---------------- Reactive Form ---------------- */
  cuttingForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  /* ==================================================== */
  /*                 Life‑cycle                           */
  /* ==================================================== */
  ngOnInit(): void {
    this.cuttingForm = this.fb.group({
      collectionId: [null, Validators.required],
      samples: this.fb.array([])
    });
  }

  /* ==================================================== */
  /*            Convenient getters / helpers              */
  /* ==================================================== */
  get samplesFA(): FormArray {
    return this.cuttingForm.get('samples') as FormArray;
  }

  /** true if every available sample is checked */
  get allChecked(): boolean {
    return (
      this.availableSamples.length > 0 &&
      this.samplesFA.length === this.availableSamples.length
    );
  }

  isSampleChecked(sampleId: string): boolean {
    return this.samplesFA.controls.some(c => c.get('id')?.value === sampleId);
  }

  cuttingsFA(sampleIdx: number): FormArray {
    return this.samplesFA.at(sampleIdx).get('cuttings') as FormArray;
  }

  /* ==================================================== */
  /*               Collection handling                    */
  /* ==================================================== */
  onCollectionSelect(): void {
    const collectionId = this.cuttingForm.get('collectionId')?.value;

    // Dummy lookup – replace with API call later
    switch (collectionId) {
      case 'col-001':
        this.availableSamples = [
          { id: 's1', sampleNo: '24-000001' },
          { id: 's2', sampleNo: '24-000002' },
          { id: 's3', sampleNo: '24-000003' }
        ];
        break;
      case 'col-002':
        this.availableSamples = [
          { id: 's4', sampleNo: '24-000004' },
          { id: 's5', sampleNo: '24-000005' }
        ];
        break;
      default:
        this.availableSamples = [];
    }

    // reset selected samples
    while (this.samplesFA.length) this.samplesFA.removeAt(0);
  }

  /* ==================================================== */
  /*               Sample checkbox logic                  */
  /* ==================================================== */
  toggleAllSamples(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    // clear existing
    while (this.samplesFA.length) this.samplesFA.removeAt(0);

    if (checked) {
      this.availableSamples.forEach(s => this.samplesFA.push(this.buildSampleGroup(s)));
    }
  }

  toggleSample(sample: any, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.isSampleChecked(sample.id)) this.samplesFA.push(this.buildSampleGroup(sample));
    } else {
      const idx = this.samplesFA.controls.findIndex(c => c.get('id')?.value === sample.id);
      if (idx > -1) this.samplesFA.removeAt(idx);
    }
  }

  private buildSampleGroup(sample: any): FormGroup {
    return this.fb.group({
      id:        [sample.id],
      sampleNo:  [sample.sampleNo],
      material:  [''],
      cuttings:  this.fb.array([])
    });
  }

  /* ==================================================== */
  /*                 Cutting rows                         */
  /* ==================================================== */
  addCutting(sampleIdx: number, price: any): void {
    const cuts = this.cuttingsFA(sampleIdx);
    if (cuts.controls.some(c => c.get('priceId')?.value === price.id)) return; // prevent duplicates

    cuts.push(this.fb.group({
      priceId:      [price.id],
      cuttingType:  [price.cuttingType],
      unitType:     [price.unitType],
      rate:         [price.rate],
      quantity:     [0, [Validators.required, Validators.min(0)]],
      total:        [{ value: 0, disabled: true }]
    }));
  }

  updateTotal(sampleIdx: number, rowIdx: number): void {
    const row = this.cuttingsFA(sampleIdx).at(rowIdx);
    const qty  = +row.get('quantity')!.value || 0;
    const rate = +row.get('rate')!.value;
    row.get('total')!.setValue(qty * rate);
  }

  removeCutting(sampleIdx: number, rowIdx: number): void {
    this.cuttingsFA(sampleIdx).removeAt(rowIdx);
  }

  /* ==================================================== */
  /*                      Totals                          */
  /* ==================================================== */
  sampleTotal(sampleIdx: number): number {
    return this.cuttingsFA(sampleIdx).controls.reduce((sum, row) => sum + (+row.get('total')!.value || 0), 0);
  }

  grandTotal(): number {
    return this.samplesFA.controls.reduce((g, _ctrl, idx) => g + this.sampleTotal(idx), 0);
  }

  /* ==================================================== */
  /*                      Save                            */
  /* ==================================================== */
  save(): void {
    if (this.cuttingForm.invalid) {
      this.cuttingForm.markAllAsTouched();
      return;
    }

    const payload = this.cuttingForm.getRawValue();
    console.log('Submitting payload:', payload);
  }
}
