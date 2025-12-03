import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { ParameterService } from '../../../services/parameter.service';
import { StandardOrgnizationService } from '../../../services/standard-orgnization.service';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { WorkflowService } from '../../../services/workflow.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-review-of-request-form',
  templateUrl: './review-of-request-form.component.html',
  styleUrls: ['./review-of-request-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class ReviewOfRequestFormComponent implements OnInit {
  inwardId: number = 0;
  plan: any = null;
  baseUrl = environment.baseUrl;
  showActionPanel = false;
  reviewAction: 'approve' | 'sendback' | 'reject' | null = null;
  reviewRemark: string = '';
  submitAttempted = false;
  testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];

  // Dropdown data maps
  specificationMap: { [id: string]: string } = {};
  standardMap: { [id: string]: string } = {};
  testMethodMap: { [id: string]: string } = {};
  metalClassificationMap: { [id: string]: string } = {};
  parameterMap: { [id: string]: string } = {};

  // Filtered test methods and standards for dependent dropdowns
  filteredTestMethods: { [key: string]: any[] } = {};
  filteredStandards: any[] = [];

  // Drag position for review panel
  dragPosition = { x: window.innerWidth - 140, y: 100 };
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  actions: any[] = [];
  selectedAction: any = null;
  showReviewButton = signal(true);

  constructor(
    private fb: FormBuilder,
    private inwardService: SampleInwardService,
    private materialSpecificationService: MaterialSpecificationService,
    private laboratoryTestService: LaboratoryTestService,
    private metalClassificationService: MetalClassificationService,
    private parameterService: ParameterService,
    private standardService: StandardOrgnizationService,
    private activeRoute: ActivatedRoute,
    private workflowService: WorkflowService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.activeRoute.paramMap.subscribe((params) => {
      this.inwardId = Number(params.get('id'));
    });

    this.fetchDropdowns();
    this.fetchSampleInwardDetails(this.inwardId);
  }

  fetchDropdowns(): void {
    // Fetch all dropdowns in parallel and build maps for ID->Name
    this.materialSpecificationService.getMaterialSpecificationGradeDropdown('', 0, 1000).subscribe(list => {
      this.specificationMap = {};
      (list || []).forEach((item: any) => this.specificationMap[item.id] = item.name);
    });
    this.standardService.getStandardOrganizationDropdown('', 0, 1000).subscribe(list => {
      this.standardMap = {};
      (list || []).forEach((item: any) => this.standardMap[item.id] = item.name);
    });
    this.laboratoryTestService.getLaboratoryTestDropdown('', 0, 1000).subscribe(list => {
      this.testMethodMap = {};
      (list || []).forEach((item: any) => this.testMethodMap[item.id] = item.name);
    });
    this.metalClassificationService.getMetalClassificationDropdown('', 0, 1000).subscribe(list => {
      this.metalClassificationMap = {};
      (list || []).forEach((item: any) => this.metalClassificationMap[item.id] = item.name);
    });
    this.parameterService.getChemicalParameterDropdown('', 0, 1000).subscribe(list => {
      this.parameterMap = {};
      (list || []).forEach((item: any) => this.parameterMap[item.id] = item.name);
    });
  }


  fetchSampleInwardDetails(inwardId: number): void {
    this.inwardService.getSampleInwardWithPlans(inwardId).subscribe({
      next: (data) => {
        if (data) {
          // Map API response to plan structure for review
          this.plan = {
            id: data.id,
            customerName: data.customerName,
            customerAddress: data.address,
            customerContact: data.customerContact,
            caseNo: data.caseNo,
            sampleReceiptNote: data.sampleReceiptNote,
            urgent: data.urgent,
            returnSample: data.returnSample,
            notDestroyed: data.notDestroyed,
            statementOfConformity: data.statementOfConformity ?? 'Not Applicable',
            decisionRule: data.decisionRule ?? 'Not Applicable',
            samples: (data.sampleDetails || []).map((s: any) => {
              // Find additional details for this sample
              const additionalDetails = (data.sampleAdditionalDetails || [])
                .filter((ad: any) => ad.sampleID === s.id)
                .map((ad: any) => ({
                  label: ad.label,
                  value: ad.value
                }));

              // Find test plans for this sample
              const testPlans = (data.sampleTestPlans || [])
                .filter((tp: any) => tp.sampleID === s.id)
                .map((tp: any) => ({
                  generalTests: (tp.generalTests || []).map((gt: any) => ({
                    sampleNo: gt.sampleNo,
                    specification1: gt.specification1,
                    specification2: gt.specification2,
                    parameter: gt.parameter,
                    methods: (gt.methods || []).map((m: any) => ({
                      testMethodID: m.testMethodID,
                      standardID: m.standardID,
                      quantity: m.quantity,
                      reportNo: m.reportNo,
                      ulrNo: m.ulrNo,
                      cancel: m.cancel
                    }))
                  })),
                  chemicalTests: (tp.chemicalTests || []).map((ct: any) => ({
                    sampleNo: ct.sampleNo,
                    reportNo: ct.reportNo,
                    ulrNo: ct.ulrNo,
                    testTypes: {
                      Spectro: ct.testTypes?.Spectro ?? false,
                      Chemical: ct.testTypes?.Chemical ?? false,
                      XRF: ct.testTypes?.XRF ?? false,
                      'Full Analysis': ct.testTypes?.['Full Analysis'] ?? false,
                      ROHS: ct.testTypes?.ROHS ?? false
                    },
                    metalClassificationID: ct.metalClassificationID,
                    specification1: ct.specification1,
                    specification2: ct.specification2,
                    standardID: ct.standardID ?? ct.testMethod,
                    elements: (ct.elements || []).map((el: any) => ({
                      parameterID: el.parameterID,
                      selected: el.selected
                    }))
                  }))
                }));

              return {
                sampleNo: s.sampleNo,
                details: s.details,
                category: s.category,
                nature: s.nature,
                remarks: s.remarks,
                quantity: s.quantity,
                preparationRequired: s.preparationRequired ?? false,
                machiningRequired: s.machiningRequired ?? false,
                machiningAmount: s.machiningAmount ?? 0,
                specimen: s.specimen ?? '',
                otherPreparation: s.otherPreparation ?? false,
                otherPreparationCharge: s.otherPreparationCharge ?? 0,
                tpiRequired: s.tpiRequired ?? false,
                testInstructions: s.testInstructions ?? '',
                fileName: s.fileName ?? '',
                sampleFilePath: s.sampleFilePath ?? '',
                additionalDetails,
                testPlans
              };
            })
          };
          this.showReviewButton.set(data.canTakeAction);
          this.actions = data.actions || [];
          if (this.actions.length > 0) {
            this.selectedAction = this.actions[0];
          }
        }
      },
      error: (err) => {
        console.error('Error fetching sample inward details:', err);
      }
    });
  }

  // Samples getter
  get samples(): any[] {
    return this.plan?.samples || [];
  }

  // Get all test plans for a sample (for accordion/tables)
  getTestPlansArray(sample: any): any[] {
    return sample?.testPlans || [];
  }

  // Get all general or chemical tests in a flat array for tables
  getFlatTests(sample: any, type: 'generalTests' | 'chemicalTests'): any[] {
    if (!sample?.testPlans) return [];
    const flat: any[] = [];
    sample.testPlans.forEach((plan: any) => {
      if (type === 'generalTests') {
        (plan.generalTests || []).forEach((gt: any) => {
          (gt.methods || []).forEach((method: any) => {
            flat.push({
              specification1: gt.specification1,
              specification2: gt.specification2,
              standardID: method.standardID,
              testMethodID: method.testMethodID,
              quantity: method.quantity,
              reportNo: method.reportNo,
              ulrNo: method.ulrNo
            });
          });
        });
      } else if (type === 'chemicalTests') {
        (plan.chemicalTests || []).forEach((ct: any) => {
          flat.push({
            reportNo: ct.reportNo,
            ulrNo: ct.ulrNo,
            testTypes: ct.testTypes, // <-- ADD THIS LINE
            metalClassificationID: ct.metalClassificationID,
            specification1: ct.specification1,
            specification2: ct.specification2,
            standardID: ct.standardID,
            elements: ct.elements || []
          });
        });
      }
    });
    return flat;
  }

  // For accordion: get general/chemical tests array for a testPlan
  getTestArray(sample: any, testPlan: any, type: 'generalTests' | 'chemicalTests'): any[] {
    return testPlan?.[type] || [];
  }

  // For accordion: get methods array for a general test
  getMethodRows(generalTest: any): any[] {
    return generalTest?.methods || [];
  }

  // For chemical test: get elements array
  getElementsArray(test: any): any[] {
    return test?.elements || [];
  }

  // For additional details (if you want to show extra sample info)
  getAdditionalDetailsArray(sample: any): any[] {
    return sample?.additionalDetails || [];
  }

  // --- Name mapping helpers ---
  getSpecificationName(id: any): string {
    if (!id) return '-';
    return this.specificationMap[id] || id;
  }
  getStandardName(id: any): string {
    if (!id) return '-';
    return this.standardMap[id] || id;
  }
  getMetalClassificationName(id: any): string {
    if (!id) return '-';
    return this.metalClassificationMap[id] || id;
  }
  getParameterName(id: any): string {
    if (!id) return '-';
    return this.parameterMap[id] || id;
  }

  // --- Dependent Dropdown Logic (reference from plan component) ---
  getTestMethodsForSpecifications(spec1: string, spec2: string): Observable<any[]> {
    const spec1Num = spec1 ? +spec1 : 0;
    const spec2Num = spec2 ? +spec2 : 0;
    return this.materialSpecificationService.getTestMethodsBySpecifications(spec1Num, spec2Num);
  }

  // For displaying test method name in table with dependency
  getTestMethodName(id: any, spec1?: any, spec2?: any): string {
    if (!id) return '-';
    // Try to use filteredTestMethods if available for this spec1+spec2
    const key = `${spec1 || ''}_${spec2 || ''}`;
    if (this.filteredTestMethods[key]) {
      const found = this.filteredTestMethods[key].find((tm: any) => tm.id == id);
      if (found) return found.name;
    }
    return this.testMethodMap[id] || id;
  }

  // When rendering table, prefetch dependent test methods for each spec1/spec2
  prefetchTestMethodsForSample(sample: any): void {
    // For each general test, fetch test methods for its spec1/spec2
    this.getFlatTests(sample, 'generalTests').forEach(test => {
      const key = `${test.specification1 || ''}_${test.specification2 || ''}`;
      if (!this.filteredTestMethods[key]) {
        this.getTestMethodsForSpecifications(test.specification1, test.specification2).subscribe(methods => {
          this.filteredTestMethods[key] = methods || [];
        });
      }
    });
  }

  openFileInNewTab(filePath: string): void {
    if (filePath) {
      window.open(this.baseUrl + filePath, '_blank');
    }
  }

  // Review action handlers
  onReviewActionChange() {
    if (this.reviewAction !== 'sendback') {
      this.reviewRemark = '';
    }
  }

  submitReview() {
    debugger;
    this.submitAttempted = true;
    if (!this.selectedAction) return;
    if (this.selectedAction?.action?.toLowerCase() !== 'next' && !this.reviewRemark) return;

    const payload = {
      id: this.selectedAction.id,
      action: this.selectedAction.action, // "Next" or "Cancel"
      name: this.selectedAction.name,
      remarks: this.reviewRemark
    };

    this.workflowService.performWorkflowAction(payload).subscribe({
      next: (response) => {
        this.toast.show(response.message, "success");
      },
      error: (error) => {
        console.error('Error performing action:', error);
        this.toast.show("Error performing action. Please try again.", "error");
      }
    });
  }

  // Drag and drop handlers
  startDrag(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this.isDragging = true;
    let clientX = (event as MouseEvent).clientX ?? (event as TouchEvent).touches[0].clientX;
    let clientY = (event as MouseEvent).clientY ?? (event as TouchEvent).touches[0].clientY;
    this.dragOffset = {
      x: clientX - this.dragPosition.x,
      y: clientY - this.dragPosition.y
    };
    window.addEventListener('mousemove', this.onDragMove);
    window.addEventListener('mouseup', this.stopDrag);
    window.addEventListener('touchmove', this.onDragMove, { passive: false });
    window.addEventListener('touchend', this.stopDrag);
  }

  onDragMove = (event: MouseEvent | TouchEvent) => {
    if (!this.isDragging) return;
    let clientX = (event as MouseEvent).clientX ?? (event as TouchEvent).touches[0].clientX;
    let clientY = (event as MouseEvent).clientY ?? (event as TouchEvent).touches[0].clientY;
    this.dragPosition = {
      x: clientX - this.dragOffset.x,
      y: clientY - this.dragOffset.y
    };
    event.preventDefault();
  };

  stopDrag = () => {
    this.isDragging = false;
    window.removeEventListener('mousemove', this.onDragMove);
    window.removeEventListener('mouseup', this.stopDrag);
    window.removeEventListener('touchmove', this.onDragMove);
    window.removeEventListener('touchend', this.stopDrag);
  };
}
