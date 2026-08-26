import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { ParameterService } from '../../../services/parameter.service';
import { StandardOrgnizationService } from '../../../services/standard-orgnization.service';
import { ProductConditionService } from '../../../services/product-condition.service';
import { TPIService } from '../../../services/tpi.service';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkflowService } from '../../../services/workflow.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { PlanFormComponent } from '../../plan/plan-form/plan-form.component';
import { SampleStatus } from '../../../utility/status_flow/enums/sample-status.enum';

export interface TpiPerson {
  name: string;
  contactNo?: string;
  email?: string;
  role?: string;
}

@Component({
  selector: 'app-review-of-request-form',
  standalone: true,
  templateUrl: './review-of-request-form.component.html',
  styleUrls: ['./review-of-request-form.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SearchableDropdownComponent,
    PlanFormComponent
  ]
})
export class ReviewOfRequestFormComponent implements OnInit {
  inwardId: number = 0;

  // ─── Embedding support: used by CaseLifecycleWorkspaceComponent ───
  @Input() embeddedInwardId: number = 0;
  @Input() isEmbeddedMode: boolean = false;
  @Input() isEmbeddedReadOnly: boolean = false;
  @Output() reviewCompleted = new EventEmitter<any>();

  // Primary 4-Tab Navigation State
  activeTab: 'test-plan' | 'tpi' | 'approval' | 'history' = 'test-plan';

  @ViewChild('planFormRef') planFormRef?: PlanFormComponent;

  // Re-plan modal state
  showReplanModal: boolean = false;
  replanReason: string = '';

  plan: any = null;
  baseUrl = environment.baseUrl;
  reviewRemark: string = '';
  reviewStatus: SampleStatus = SampleStatus.UNDER_REVIEW_REQUEST;

  // Dropdown data maps
  specificationMap: { [id: string]: string } = {};
  standardMap: { [id: string]: string } = {};
  testMethodMap: { [id: string]: string } = {};
  metalClassificationMap: { [id: string]: string } = {};
  productConditionMap: { [id: string]: string } = {};
  parameterMap: { [id: string]: string } = {};
  tpiAgencyMap: { [id: string]: string } = {};

  // TPI and Sample Forms
  sampleForms: { [sampleId: number]: FormGroup } = {};
  sampleTpiPersons: { [sampleId: number]: TpiPerson[] } = {};
  tpiPersonsDirtyMap: { [sampleId: number]: boolean } = {};
  tpiAgencyContactDetails: { [sampleId: number]: { emailId: string; contactNo: string } } = {};

  constructor(
    private fb: FormBuilder,
    private inwardService: SampleInwardService,
    private materialSpecificationService: MaterialSpecificationService,
    private laboratoryTestService: LaboratoryTestService,
    private metalClassificationService: MetalClassificationService,
    private parameterService: ParameterService,
    private standardService: StandardOrgnizationService,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private toast: ToastService,
    private productConditionService: ProductConditionService,
    private tpiService: TPIService
  ) {}

  ngOnInit(): void {
    if (this.isEmbeddedMode && this.embeddedInwardId > 0) {
      this.inwardId = this.embeddedInwardId;
    } else {
      this.activeRoute.paramMap.subscribe(params => {
        this.inwardId = Number(params.get('id'));
      });
    }

    if (this.inwardId > 0) {
      this.fetchDropdowns();
      this.fetchSampleInwardDetails(this.inwardId);
    }
  }

  isPlanDirty(): boolean {
    return !!this.planFormRef?.planForm?.dirty;
  }

  isTpiDirty(): boolean {
    if (!this.sampleForms) return false;
    return Object.keys(this.sampleForms).some(id => {
      const sampleId = +id;
      const form = this.sampleForms[sampleId];
      const isTpiReq = form?.get('tpiRequired')?.value === true;
      // Only block tab switching if TPI is enabled AND has unsaved changes
      if (isTpiReq) {
        return form.dirty || !!this.tpiPersonsDirtyMap[sampleId];
      }
      return false;
    });
  }

  toggleTpi(sampleId: number, isRequired: boolean): void {
    const form = this.sampleForms[sampleId];
    if (!form) return;

    form.patchValue({ tpiRequired: isRequired });

    if (!isRequired) {
      // Direct auto-sync for No TPI so form remains pristine and unlocked
      const payload = {
        ...form.value,
        tpiRequired: false,
        tpiAgencyID: null,
        testInstructions: form.get('testInstructions')?.value || '',
        tpiInspectorsJson: null
      };

      this.inwardService.updateSamplePrep(sampleId, payload).subscribe({
        next: () => {
          form.markAsPristine();
          this.tpiPersonsDirtyMap[sampleId] = false;
          this.toast.show('Sample marked: No TPI Required.', 'success');
        },
        error: () => {
          form.markAsPristine();
          this.tpiPersonsDirtyMap[sampleId] = false;
        }
      });
    } else {
      form.markAsDirty();
    }
  }

  setTab(tab: 'test-plan' | 'tpi' | 'approval' | 'history'): void {
    if (this.activeTab === tab) return;

    if (this.activeTab === 'test-plan' && this.isPlanDirty()) {
      this.toast.show('You have unsaved changes in Test Plan. Please save your changes before switching tabs.', 'warning');
      return;
    }

    if (this.activeTab === 'tpi' && this.isTpiDirty()) {
      this.toast.show('You have unsaved changes in TPI & Special Requirements. Please save your changes before switching tabs.', 'warning');
      return;
    }

    this.activeTab = tab;
  }

  fetchDropdowns(): void {
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
    this.productConditionService.getProductConditionDropdown('', 0, 1000).subscribe(list => {
      this.productConditionMap = {};
      (list || []).forEach((item: any) => this.productConditionMap[item.id] = item.name);
    });
    this.parameterService.getChemicalParameterDropdown('', 0, 1000).subscribe(list => {
      this.parameterMap = {};
      (list || []).forEach((item: any) => this.parameterMap[item.id] = item.name);
    });
    this.tpiService.getTPIDropdown('', 0, 1000).subscribe(list => {
      this.tpiAgencyMap = {};
      (list || []).forEach((item: any) => this.tpiAgencyMap[item.id] = item.name);
    });
  }

  getTPIAgencies = (searchTerm: string, pageNumber: number, pageSize: number): Observable<any[]> => {
    return this.tpiService.getTPIDropdown(searchTerm, pageNumber, pageSize);
  };

  fetchSampleInwardDetails(inwardId: number): void {
    this.inwardService.getSampleInwardWithPlans(inwardId).subscribe({
      next: (data) => {
        if (data) {
          this.plan = {
            id: data.id,
            customerName: data.customerName || data.customer?.name,
            customerAddress: data.address,
            customerContact: data.contacts?.find((c: any) => c.selected)?.name || data.contacts?.[0]?.name || '-',
            caseNo: data.caseNo,
            sampleReceiptNote: data.sampleReceiptNote,
            urgent: data.urgent,
            returnSample: data.returnSample,
            notDestroyed: data.notDestroyed,
            statementOfConformity: data.statementOfConformity ?? 'Not Applicable',
            decisionRule: data.decisionRule ?? 'Not Applicable',

            samples: (data.sampleDetails || []).map((s: any) => {
              const additionalDetails = (data.sampleAdditionalDetails || [])
                .filter((ad: any) => ad.sampleID === s.id)
                .map((ad: any) => ({ label: ad.label, value: ad.value }));

              const testPlans = (data.sampleTestPlans || [])
                .filter((tp: any) => tp.sampleID === s.id)
                .map((tp: any) => ({
                  id: tp.id,
                  version: tp.version,
                  planStatus: tp.planStatus,
                  approvedByName: tp.approvedByName,
                  approvedAt: tp.approvedAt,
                  planHistories: tp.planHistories || [],
                  generalTests: (tp.generalTests || []).map((gt: any, gtIdx: number) => ({
                    id: gt.id || `gt_${s.id}_${gtIdx}`,
                    sampleNo: gt.sampleNo || s.sampleNo,
                    specification1: gt.specification1,
                    specification2: gt.specification2,
                    laboratoryTestSubGroupID: gt.laboratoryTestSubGroupID,
                    subGroupName: gt.subGroupName,
                    parameter: gt.parameter,
                    methods: (gt.methods || []).map((m: any) => ({
                      id: m.id,
                      testMethodID: m.testMethodID,
                      standardID: m.standardID,
                      standardName: m.standardName,
                      quantity: m.quantity,
                      reportNo: m.reportNo,
                      ulrNo: m.ulrNo,
                      cancel: m.cancel
                    }))
                  })),
                  chemicalTests: (tp.chemicalTests || []).map((ct: any, ctIdx: number) => ({
                    id: ct.id || `ct_${s.id}_${ctIdx}`,
                    sampleNo: ct.sampleNo || s.sampleNo,
                    reportNo: ct.reportNo,
                    ulrNo: ct.ulrNo,
                    laboratoryTestAnalysisTypeID: ct.laboratoryTestAnalysisTypeID,
                    analysisTypeName: ct.analysisTypeName,
                    testTypes: ct.testTypes,
                    metalClassificationID: ct.metalClassificationID,
                    specification1: ct.specification1,
                    specification2: ct.specification2,
                    standardID: ct.standardID ?? ct.testMethod,
                    elements: ct.elements || []
                  }))
                }));

              return {
                id: s.id,
                sampleNo: s.sampleNo,
                details: s.details,
                metalClassificationID: s.metalClassificationID,
                metalClassificationName: s.metalClassificationName,
                productConditionID: s.productConditionID,
                productConditionName: s.productConditionName,
                remarks: s.remarks,
                quantity: s.quantity,
                tpiRequired: s.tpiRequired ?? false,
                tpiAgencyID: s.tpiAgencyID ?? null,
                tpiInspectorsJson: s.tpiInspectorsJson ?? null,
                testInstructions: s.testInstructions ?? '',
                fileName: s.fileName ?? '',
                sampleFilePath: s.sampleFilePath ?? '',
                additionalDetails,
                testPlans
              };
            })
          };

          // Initialize sampleForms and parse TPI persons
          this.sampleForms = {};
          this.sampleTpiPersons = {};

          (this.plan.samples || []).forEach((s: any) => {
            this.sampleForms[s.id] = this.fb.group({
              tpiRequired: [s.tpiRequired],
              tpiAgencyID: [s.tpiAgencyID],
              testInstructions: [s.testInstructions || ''],
              specialInstructions: [s.specialInstructions || '']
            });

            // Initialize persons list: parse tpiInspectorsJson if present, or legacy text, or default row
            let parsedPersons: TpiPerson[] = [];
            if (s.tpiInspectorsJson) {
              try {
                parsedPersons = JSON.parse(s.tpiInspectorsJson);
              } catch {
                parsedPersons = [];
              }
            } else if (s.testInstructions && s.testInstructions.includes('TPI Inspectors:')) {
              try {
                const parts = s.testInstructions.split('TPI Inspectors:')[1].trim();
                const names = parts.split(',').map((p: string) => p.trim()).filter((p: string) => p);
                parsedPersons = names.map((n: string) => ({ name: n, role: 'Inspector' }));
              } catch {
                parsedPersons = [];
              }
            }

            if (parsedPersons.length === 0) {
              parsedPersons = [{ name: '', contactNo: '', email: '', role: 'Lead Inspector' }];
            }

            this.sampleTpiPersons[s.id] = parsedPersons;

            // Fetch contact details if TPI agency is already selected
            if (s.tpiAgencyID) {
              this.tpiService.getTPIById(s.tpiAgencyID).subscribe({
                next: (res: any) => {
                  this.tpiAgencyContactDetails[s.id] = {
                    emailId: res?.emailId || res?.email || '',
                    contactNo: res?.contactNo || res?.phone || res?.mobileNo || ''
                  };
                },
                error: () => {}
              });
            }
          });

          this.reviewStatus = data.status;
        }
      },
      error: (err) => {
        console.error('Error fetching sample inward details:', err);
      }
    });
  }

  get samples(): any[] {
    return this.plan?.samples || [];
  }

  // ─── Multiple TPI Persons Handlers ───
  getTpiPersons(sampleId: number): TpiPerson[] {
    if (!this.sampleTpiPersons[sampleId]) {
      this.sampleTpiPersons[sampleId] = [{ name: '', contactNo: '', email: '', role: 'Inspector' }];
    }
    return this.sampleTpiPersons[sampleId];
  }

  onTpiPersonModified(sampleId: number): void {
    this.tpiPersonsDirtyMap[sampleId] = true;
  }

  addTpiPerson(sampleId: number): void {
    if (!this.sampleTpiPersons[sampleId]) {
      this.sampleTpiPersons[sampleId] = [];
    }
    this.sampleTpiPersons[sampleId].push({ name: '', contactNo: '', email: '', role: 'Inspector' });
    this.tpiPersonsDirtyMap[sampleId] = true;
  }

  removeTpiPerson(sampleId: number, index: number): void {
    if (this.sampleTpiPersons[sampleId] && this.sampleTpiPersons[sampleId].length > 1) {
      this.sampleTpiPersons[sampleId].splice(index, 1);
    } else if (this.sampleTpiPersons[sampleId]) {
      this.sampleTpiPersons[sampleId][0] = { name: '', contactNo: '', email: '', role: 'Inspector' };
    }
    this.tpiPersonsDirtyMap[sampleId] = true;
  }

  onTPIAgencySelected(item: any, sampleId: number): void {
    this.sampleForms[sampleId]?.patchValue({ tpiAgencyID: item?.id ?? null });
    this.sampleForms[sampleId]?.markAsDirty();
    if (item?.id) {
      if (item?.additionalValues && (item.additionalValues['emailId'] || item.additionalValues['contactNo'])) {
        this.tpiAgencyContactDetails[sampleId] = {
          emailId: item.additionalValues['emailId'] || '',
          contactNo: item.additionalValues['contactNo'] || ''
        };
      } else {
        this.tpiService.getTPIById(item.id).subscribe({
          next: (res: any) => {
            this.tpiAgencyContactDetails[sampleId] = {
              emailId: res?.emailId || res?.email || '',
              contactNo: res?.contactNo || res?.phone || res?.mobileNo || ''
            };
          },
          error: () => {
            delete this.tpiAgencyContactDetails[sampleId];
          }
        });
      }
    } else {
      delete this.tpiAgencyContactDetails[sampleId];
    }
  }

  getTpiAgencyName(id: any): string {
    if (!id) return '-';
    return this.tpiAgencyMap[id] || String(id);
  }

  saveTPI(sampleId: number): void {
    const form = this.sampleForms[sampleId];
    if (!form) return;

    const persons = this.getTpiPersons(sampleId).filter(p => p.name && p.name.trim());

    const payload = {
      ...form.value,
      testInstructions: form.get('testInstructions')?.value || '',
      tpiInspectorsJson: persons.length > 0 ? JSON.stringify(persons) : null
    };

    this.inwardService.updateSamplePrep(sampleId, payload).subscribe({
      next: () => {
        form.markAsPristine();
        this.tpiPersonsDirtyMap[sampleId] = false;
        this.toast.show('TPI agencies and inspector persons saved successfully.', 'success');
      },
      error: () => this.toast.show('Failed to save TPI parameters.', 'error')
    });
  }

  // ─── Verification & Approval ───
  printInwardChallan(): void {
    if (this.inwardId > 0) {
      this.inwardService.downloadInwardChallanPdf(this.inwardId).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: () => {
          this.toast.show('Failed to print Inward Receipt Challan PDF.', 'error');
        }
      });
    }
  }

  verifyAndLockReview(): void {
    if (!this.inwardId) return;

    this.inwardService.verifyAndLockReview(this.inwardId, this.reviewRemark).subscribe({
      next: (res: any) => {
        this.toast.show('Review of Request verified & approved successfully!', 'success');
        this.fetchSampleInwardDetails(this.inwardId);
        this.reviewCompleted.emit(res);
      },
      error: () => {
        this.toast.show('Failed to verify and lock Review of Request.', 'error');
      }
    });
  }

  openReplanModal(): void {
    this.replanReason = '';
    this.showReplanModal = true;
  }

  closeReplanModal(): void {
    this.showReplanModal = false;
    this.replanReason = '';
  }

  submitReplan(): void {
    if (!this.replanReason.trim()) {
      this.toast.show('Please provide a reason to request a re-plan.', 'warning');
      return;
    }
    this.inwardService.requestInwardReplan(this.inwardId, this.replanReason).subscribe({
      next: () => {
        this.toast.show('Re-Plan requested successfully.', 'success');
        this.closeReplanModal();
        this.fetchSampleInwardDetails(this.inwardId);
      },
      error: () => {
        this.toast.show('Failed to submit Re-Plan request.', 'error');
      }
    });
  }

  // Pre-flight validation checks
  isAllSamplesPlanned(): boolean {
    if (!this.samples || this.samples.length === 0) return false;
    return this.samples.every(s => (s.testPlans || []).length > 0);
  }

  getHistoryEntries(): any[] {
    const list: any[] = [];
    (this.samples || []).forEach(s => {
      (s.testPlans || []).forEach((tp: any) => {
        (tp.planHistories || []).forEach((h: any) => {
          list.push({
            ...h,
            sampleNo: s.sampleNo,
            version: h.version || tp.version || 1,
            action: h.action || h.changeType || 'Modified',
            createdByName: h.createdByName || h.changedByName || h.createdBy || 'System',
            createdOn: h.createdOn || h.changedAt,
            remarks: h.remarks || h.fieldChangesJson || h.changedFieldsJson || '-'
          });
        });
      });
    });
    return list.sort((a, b) => new Date(b.createdOn || 0).getTime() - new Date(a.createdOn || 0).getTime());
  }
}
