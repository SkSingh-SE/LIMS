import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ProductSizeMasterService } from '../../../services/product-size-master.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-cutting-machining-plan-tab',
  templateUrl: './cutting-machining-plan-tab.component.html',
  styleUrls: ['./cutting-machining-plan-tab.component.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SearchableDropdownComponent]
})
export class CuttingMachiningPlanTabComponent implements OnInit, OnChanges {
  @Input() inwardId: number = 0;
  @Input() isReadOnly: boolean = false;

  samples: any[] = [];
  sampleForms: { [sampleId: number]: FormGroup } = {};
  selectedSizes: { [key: string]: any } = {}; // key: "sampleId_testIndex"

  getProductSizeDrop = (term: string, page: number, pageSize: number) =>
    this.productSizeService.getProductSizeDropdown(term, page, pageSize);

  constructor(
    private fb: FormBuilder,
    private inwardService: SampleInwardService,
    private productSizeService: ProductSizeMasterService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.inwardId > 0) {
      this.loadSamples();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inwardId'] && changes['inwardId'].currentValue > 0) {
      this.loadSamples();
    }
  }

  loadSamples(): void {
    this.inwardService.getSampleInwardById(this.inwardId).subscribe({
      next: (data: any) => {
        this.samples = data?.sampleDetails || data?.samples || [];
        this.samples.forEach((sample: any) => {
          this.buildSampleForm(sample);
        });
      },
      error: () => this.toast.show('Failed to load sample details.', 'error')
    });
  }

  buildSampleForm(sample: any): void {
    const tests = sample.tests || [];
    const testsArray = this.fb.array(
      tests.map((t: any) => this.fb.group({
        testId: [t.testId || t.id || 0],
        testName: [t.testName || t.name || ''],
        productSizeMasterID: [t.productSizeMasterID || null],
        requiresCutting: [t.requiresCutting ?? false],
        noTesting: [t.noTesting ?? false]
      }))
    );

    const form = this.fb.group({
      sampleId: [sample.id],
      numberOfCuts: [sample.numberOfCuts || null],
      cutThickness: [sample.cutThickness || null],
      waterJetCuttingMins: [sample.waterJetCuttingMins || null],
      edmCutting: [sample.edmCutting || null],
      gasCutting: [sample.gasCutting || null],
      specialCutting: [sample.specialCutting || null],
      tests: testsArray
    });

    if (this.isReadOnly) {
      form.disable();
    }

    this.sampleForms[sample.id] = form;
  }

  getTests(sampleId: number): FormArray {
    return this.sampleForms[sampleId]?.get('tests') as FormArray;
  }

  getTestGroup(sampleId: number, index: number): FormGroup {
    return this.getTests(sampleId)?.at(index) as FormGroup;
  }

  onSizeSelected(item: any, sampleId: number, testIndex: number): void {
    const key = `${sampleId}_${testIndex}`;
    this.selectedSizes[key] = item;
    this.getTestGroup(sampleId, testIndex)?.patchValue({ productSizeMasterID: item?.id ?? null });
  }

  getSizeSelected(sampleId: number, testIndex: number): any {
    return this.selectedSizes[`${sampleId}_${testIndex}`] || null;
  }

  saveSampleCuttingPlan(sampleId: number): void {
    const form = this.sampleForms[sampleId];
    if (!form || form.invalid) return;

    const payload = form.getRawValue();
    this.inwardService.updateSamplePrep(sampleId, payload).subscribe({
      next: () => this.toast.show('Cutting plan saved successfully.', 'success'),
      error: () => this.toast.show('Failed to save cutting plan.', 'error')
    });
  }

  getStatusBadgeClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'active': return 'bg-success';
      case 'pending': return 'bg-warning text-dark';
      case 'cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
