import { CommonModule } from '@angular/common';
import { Component, Input, OnInit , HostListener } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from "../../../utility/components/searchable-dropdown/searchable-dropdown.component";
import { Observable } from 'rxjs';
import { CustomerService } from '../../../services/customer.service';
import { DispatchModeService } from '../../../services/dispatch-mode.service';
import { AreaService } from '../../../services/area.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { CustomerPOService } from '../../../services/customer-po.service';
import { AccountService } from '../../../services/account.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ProductConditionService } from '../../../services/product-condition.service';
import { SpecimenOrientationService } from '../../../services/specimen-orientation.service';
import { ProductFormService } from '../../../services/product-form.service';
import { SampleStatus } from '../../../utility/status_flow/enums/sample-status.enum';
import { InwardStatus } from '../../../utility/status_flow/enums/inward-status.enum';
import { PlanFormComponent } from '../../plan/plan-form/plan-form.component';
import { TestStatusBadgeComponent } from '../../TestResult/test-status-badge/test-status-badge.component';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';

@Component({
  selector: 'app-sample-inward-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, PlanFormComponent, TestStatusBadgeComponent],
  templateUrl: './sample-inward-form.component.html',
  styleUrl: './sample-inward-form.component.css'
})
export class SampleInwardFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;

  // ─── Embedding support: used by CaseLifecycleWorkspaceComponent ───
  @Input() embeddedInwardId: number = 0;
  @Input() isEmbeddedMode: boolean = false;
  @Input() embeddedActiveTab: string = 'info'; // 'info' | 'sample' | 'plan'
  @Input() isEmbeddedReadOnly: boolean = false;
  // Constants
  caseNumber: string = 'DMSPL-000001';
  yearCode: string = new Date().getFullYear().toString().slice(-2);
  sampleNumber: string = '25-000001';
  lastSampleNumber: number = +this.sampleNumber.split('-')[1];
  readonly witnessList: string[] = ['Witness A', 'Witness B', 'Witness C', 'Witness D'];
  readonly descriptionOptions = ['Heat No', 'Batch No', 'Lot No', 'Description', 'Sealed By', 'Witness By', 'Stamp By'];
  readonly testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];

  // Data
  contactPersons: any[] = [];
  billingToContactPerson: any[] = [];
  reportingToContactPerson: any[] = [];
  reportingToOverrideContacts: any[] = [];
  billingToOverrideContacts: any[] = [];
  // Holds contact IDs to restore after override customer contacts load in edit mode
  private editRestoreContactIDs: { reporting?: number | null; billing?: number | null } = {};
  dispatchModes: any[] = [];
  selectedDispatchModes: number[] = [];
  sampleNumbers: string[] = [];

  // State
  submitted = false;
  sampleInwardForm!: FormGroup;
  globalTestCounter = 1;
  uploadedFile: File | null = null;
  customerData: any = null;
  showPODropdown: boolean = false;
  selectedCustomerType: string = '';
  selectedPODetails: any = null;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  sampleId: number = 0;
  currentInwardStatus: InwardStatus | string = '';
  planTabLoaded: boolean = false;
  private planLastSampleCount = 0;

  // Cancel sample dialog state
  showCancelDialog = false;
  cancelTargetIndex = -1;
  cancelReason = '';

  // Stop report state
  isReportStopped = false;
  stopReportReason = '';
  showStopReportDialog = false;
  stopReportReasonInput = '';

  private bufferedAdditionalDetails: Record<string, any[]> = {};


  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private dispatchModeService: DispatchModeService,
    private areaService: AreaService,
    private materialSpecificationService: MaterialSpecificationService,
    private laboratoryTestService: LaboratoryTestService,
    private metalService: MetalClassificationService,
    private testMethodSpecificationService: TestMethodSpecificationService,
    private parameterService: ParameterService,
    private toastService: ToastService,
    private inwardService: SampleInwardService,
    private route: ActivatedRoute,
    private router: Router,
    private prodCondService: ProductConditionService,
    private specimenOrientationService: SpecimenOrientationService,
    private productFormService: ProductFormService,
    private unsavedChangesService: UnsavedChangesService,
    private customerPOService: CustomerPOService,
    private accountService: AccountService) { }

  ngOnInit(): void {
    // If embedded by lifecycle workspace, use the provided inward ID
    if (this.isEmbeddedMode && this.embeddedInwardId > 0) {
      this.sampleId = this.embeddedInwardId;
      if (this.isEmbeddedReadOnly) {
        this.isViewMode = true;
      } else {
        this.isEditMode = true;
      }
    } else {
      this.route.paramMap.subscribe((params) => {
        this.sampleId = Number(params.get('id'));
      });

      const state = history.state as { mode?: string };
      if (state?.mode === 'view') {
        this.isViewMode = true;
      } else if (state?.mode === 'edit') {
        this.isEditMode = true;
      }
    }

    this.initForm();
    this.fetchDispatchModeDropdown();

    if (this.sampleId > 0) {
      this.fetchSampleInwardDetails(this.sampleId);
    } else {
      this.getCaseNumber();
    }
  }

  // Form Initialization
  private initForm(): void {
    this.sampleInwardForm = this.fb.group({
      id: [0],
      caseNo: [''],
      customerID: ['', Validators.required],
      address: [''],
      area: [''],
      state: [''],
      city: [''],
      pinCode: ['', Validators.pattern(/^[0-9]{6}$/)],
      country: ['India'],
      gstNo: [''],
      dispatchModes: this.fb.array([], Validators.required),
      purchaseOrderId: [null],
      advancePayment: [''],
      billRequired: [true],
      advancePIRequired: [false],
      holdTesting: [false],
      holdTestingUntilPIApproved: [false],
      collectionTime: [{ value: this.getCurrentTime(), disabled: true }],
      collectionDate: [{ value: new Date(), disabled: true }],
      urgent: [false],
      returnSample: [false],
      notDestroyed: [false],
      sampleReceiptNote: [''],
      statementOfConformity: ['Not Applicable'],
      decisionRule: ['Not Applicable'],
      requestFilePath: [''],
      requestFileName: [''],
      file: [null],
      contacts: this.fb.array([]),
      reportingTo: this.fb.group({
        id: [0],
        customerID: [null],
        contactPersonID: [null],
        contactPersonName: [''],
        address: [''],
        pinCode: ['', Validators.pattern(/^[0-9]{6}$/)],
        area: [''],
        city: [''],
        state: [''],
        country: [''],
        mobileNo: ['', Validators.pattern(/^[+]?\d{10,13}$/)],
        emailId: ['', Validators.email],
        type: ['reporting']
      }),
      billingTo: this.fb.group({
        id: [0],
        customerID: [null],
        contactPersonID: [null],
        contactPersonName: [''],
        address: [''],
        pinCode: ['', Validators.pattern(/^[0-9]{6}$/)],
        area: [''],
        city: [''],
        state: [''],
        country: [''],
        mobileNo: ['', Validators.pattern(/^[+]?\d{10,13}$/)],
        emailId: ['', Validators.email],
        type: ['billing']
      }),
      reportingToCustomers: this.fb.array([]),
      billingToCustomers: this.fb.array([]),
      sampleDetails: this.fb.array([], [
        Validators.required,
        this.minItemsValidator(1)  // At least 1 sample
      ]),
      sampleAdditionalDetails: this.fb.array([])
    });
  }

  // Custom validator:
  minItemsValidator(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const formArray = control as FormArray;
      return formArray.length >= min ? null : { minItems: true };
    };
  }

  // Getters
  get dispatchModesArray(): FormArray {
    return this.sampleInwardForm.get('dispatchModes') as FormArray;
  }

  get reportingTo(): FormGroup {
    return this.sampleInwardForm.get('reportingTo') as FormGroup;
  }

  get billingTo(): FormGroup {
    return this.sampleInwardForm.get('billingTo') as FormGroup;
  }

  get contactControls(): FormArray {
    return this.sampleInwardForm.get('contacts') as FormArray;
  }

  get sampleDetails(): FormArray {
    return this.sampleInwardForm.get('sampleDetails') as FormArray;
  }

  get sampleAdditionalDetails(): FormArray {
    return this.sampleInwardForm.get('sampleAdditionalDetails') as FormArray;
  }

  // Job card column visibility — only show a column if at least one sample has data
  get jcHasMetalClassification(): boolean {
    return this.sampleDetails.controls.some(s => !!s.get('metalClassificationName')?.value);
  }
  get jcHasProductCondition(): boolean {
    return this.sampleDetails.controls.some(s => !!s.get('productConditionName')?.value);
  }
  get jcHasSpecimenOrientation(): boolean {
    return this.sampleDetails.controls.some(s => !!s.get('specimenOrientationName')?.value);
  }
  get jcHasRemarks(): boolean {
    return this.sampleDetails.controls.some(s => !!s.get('remarks')?.value);
  }

  // Utility
  getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  // Recursively disable all form controls
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

  // API Calls
  getCaseNumber(): void {
    this.inwardService.getCaseNumber().subscribe({
      next: (data) => {
        this.caseNumber = data.caseNo || 'DMSPL-000001';
        this.sampleNumber = data.sampleNo;
        // API returns the NEXT number to assign; subtract 1 so the first addSample() generates it correctly
        this.lastSampleNumber = +this.sampleNumber.split('-')[1] - 1;
      },
      error: (error) => console.error('Error fetching case number:', error)
    });
  }

  getCustomers = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.customerService.getCustomerDropdown(term, page, pageSize);
  };

  checkCustomerHasPOs(customerId: number): void {
    this.customerPOService.getDropdown(customerId, '', 0, 1).subscribe({
      next: (pos) => {
        this.showPODropdown = pos && pos.length > 0;
      },
      error: () => {
        this.showPODropdown = false;
      }
    });
  }

  getPurchaseOrders = (term: string, page: number, pageSize: number): Observable<any[]> => {
    const customerId = this.sampleInwardForm.get('customerID')?.value;
    if (!customerId) return new Observable(subscriber => subscriber.next([]));
    return this.customerPOService.getDropdown(customerId, term, page, pageSize);
  };

  onPOSelect(item: any): void {
    if (!item) {
      this.sampleInwardForm.patchValue({ purchaseOrderId: null });
      this.selectedPODetails = null;
      return;
    }
    this.sampleInwardForm.patchValue({ purchaseOrderId: item.id });
    this.selectedPODetails = item;
  }

  getCustomerDetails(id: number): void {
    this.customerService.getCustomerById(id).subscribe({
      next: (data) => {
        if (!data) return;

        this.customerData = data;
        this.selectedCustomerType = (data.customerType || '').toLowerCase();

        // Only reset PO if user is actively changing customer (not during edit mode auto-resolve)
        const currentPO = this.sampleInwardForm.get('purchaseOrderId')?.value;
        if (!currentPO) {
          this.selectedPODetails = null;
          this.checkCustomerHasPOs(data.id);
        }

        // Credit limit advisory check for credit-type customers
        if (this.selectedCustomerType.includes('credit') || this.selectedCustomerType.includes('relationship')) {
          this.accountService.checkCreditLimit(data.id).subscribe({
            next: (res) => {
              if (res?.warning) {
                this.toastService.show(res.warning, 'warning');
              }
            },
            error: () => { /* silent — advisory only */ }
          });
        }

        this.sampleInwardForm.patchValue({
          caseNo: this.caseNumber,
          contactPersonName: this.customerData.name,
          address: this.customerData.address,
          pinCode: this.customerData.pinCode,
          // Auto-fill ReturnSample from customer only on CREATE (don't overwrite saved value on edit)
          ...(this.sampleId === 0 ? { returnSample: this.customerData.sampleReturn || false } : {}),
        });

        this.dispatchModesArray.clear();
        this.selectedDispatchModes = [];

        if (Array.isArray(this.customerData.customerDispatchModes)) {
          this.customerData.customerDispatchModes.forEach((mode: any) => {
            this.dispatchModesArray.push(this.createDispatch({ dispatchModeID: mode.dispatchModeID || mode.id }));
            this.selectedDispatchModes.push(mode.dispatchModeID || mode.id);
          });
        }

        this.fetchArea(this.customerData?.areaID, this.sampleInwardForm);

        // Only reload contacts from customer master if:
        // 1. Creating new inward (sampleId === 0), OR
        // 2. No contacts loaded yet from API (contacts array is empty)
        // This prevents overwriting saved Selected/SendBill/SendReport values on edit
        if (this.contactControls.length === 0 || this.sampleId === 0) {
          this.contactControls.clear();
          this.contactPersons = [];
          this.billingToContactPerson = [];
          this.reportingToContactPerson = [];
          this.reportingToOverrideContacts = [];
          this.billingToOverrideContacts = [];
          this.reportingTo.patchValue({ customerID: null });
          this.billingTo.patchValue({ customerID: null });

          if (Array.isArray(this.customerData?.contactPersons)) {
            const defaultSelected = false; // Note 3: By default all contacts unselected

            this.customerData.contactPersons.forEach((contact: any, idx: number) => {
              contact.contactID = contact.id;
              contact.isAccountant = contact.isAccountant !== undefined ? contact.isAccountant : (idx === 0);
              this.addContact(contact, defaultSelected);
              this.contactPersons.push(contact);
            });

            this.updateContactLists();
          }
        } else {
          // Edit mode: just update the contactPersons list for dropdowns
          this.contactPersons = this.customerData?.contactPersons?.map((c: any, idx: number) => ({
            ...c,
            contactID: c.id,
            isAccountant: c.isAccountant !== undefined ? c.isAccountant : (idx === 0)
          })) || [];
          this.updateContactLists();
        }

        // Update billing/reporting address helpers
        if (this.billingToContactPerson.length > 0) {
          this.updateAddressHelper(this.billingToContactPerson[0], 'billingTo');
        }
        if (this.reportingToContactPerson.length > 0) {
          this.updateAddressHelper(this.reportingToContactPerson[0], 'reportingTo');
        }

        // Sync Primary Customer to Card 0 for Reporting To & Billing To
        this.updatePrimaryCustomerCards(data);
      },
      error: (error) => console.error('Error fetching customer details:', error)
    });
  }

  private updatePrimaryCustomerCards(data: any): void {
    if (!data?.id) return;

    const primaryPayload = {
      id: data.id,
      name: data.name,
      address: data.address,
      area: data.area,
      city: data.city,
      state: data.state,
      pinCode: data.pinCode,
      gstNo: data.gstNo,
      contactPersons: data.contactPersons
    };

    const contacts = (data.contactPersons || []).map((c: any, idx: number) => ({
      ...c,
      contactID: c.id,
      isAccountant: c.isAccountant !== undefined ? c.isAccountant : (idx === 0)
    }));
    this.customerContactsCache.set(data.id, contacts);

    // Sync Reporting To Card 0
    if (this.reportingToCustomerControls.length === 0) {
      this.addReportingCustomerCard(primaryPayload);
    } else {
      const repCard = this.reportingToCustomerControls.at(0) as FormGroup;
      const currentRepCustId = repCard.get('customerID')?.value;
      if (!currentRepCustId || currentRepCustId === data.id) {
        repCard.patchValue({
          customerID: data.id,
          customerName: data.name,
          address: data.address,
          area: data.area,
          city: data.city,
          state: data.state,
          pinCode: data.pinCode,
          gstNo: data.gstNo
        });
      }
    }

    // Sync Billing To Card 0
    if (this.billingToCustomerControls.length === 0) {
      this.addBillingCustomerCard(primaryPayload);
    } else {
      const billCard = this.billingToCustomerControls.at(0) as FormGroup;
      const currentBillCustId = billCard.get('customerID')?.value;
      if (!currentBillCustId || currentBillCustId === data.id) {
        billCard.patchValue({
          customerID: data.id,
          customerName: data.name,
          address: data.address,
          area: data.area,
          city: data.city,
          state: data.state,
          pinCode: data.pinCode,
          gstNo: data.gstNo
        });
      }
    }

    // Auto-select primary/accountant contact for Card 0 if no contact selected yet
    if (contacts.length > 0) {
      const defaultContact = contacts.find((c: any) => c.isAccountant || c.designation === 'Accountant') || contacts[0];
      const contactId = defaultContact?.id || defaultContact?.contactID;
      if (contactId) {
        const repCard0 = this.reportingToCustomerControls.at(0) as FormGroup;
        const repSelected = repCard0.get('selectedContactIDs') as FormArray;
        if (repSelected && repSelected.length === 0) {
          repSelected.push(this.fb.control(contactId));
        }

        const billCard0 = this.billingToCustomerControls.at(0) as FormGroup;
        const billSelected = billCard0.get('selectedContactIDs') as FormArray;
        if (billSelected && billSelected.length === 0) {
          billSelected.push(this.fb.control(contactId));
        }
      }
    }
  }

  fetchDispatchModeDropdown(): void {
    this.dispatchModeService.getDispatchModeDropdown('', 0, 100).subscribe({
      next: resp => {
        this.dispatchModes = resp;
      },
      error: err => console.error('Error fetching dispatch modes:', err)
    });
  }

  fetchSampleInwardDetails(sampleId: number): void {
    this.inwardService.getSampleInwardById(sampleId).subscribe({
      next: (data) => {
        if (!data) return;

        this.customerService.getCustomerById(data.customerID).subscribe({
          next: (customer) => {
            if (customer) {
              this.customerData = customer;
              this.selectedCustomerType = (customer.customerType || '').toLowerCase();

              // In edit mode: if PO was saved, show dropdown directly; otherwise check if customer has POs
              if (data.purchaseOrderId) {
                this.showPODropdown = true;
              } else {
                this.checkCustomerHasPOs(customer.id);
              }

              this.sampleInwardForm.patchValue({
                caseNo: data.caseNumber,
                contactPersonName: customer.name,
                address: customer.address,
                pinCode: customer.pinCode
              });

              this.contactPersons = [];
              if (Array.isArray(customer.contactPersons)) {
                customer.contactPersons.forEach((contact: any) => {
                  contact.contactID = contact.id;
                  this.contactPersons.push(contact);
                });
              }

              this.fetchArea(customer?.areaID, this.sampleInwardForm);
            }

            // Store current status for Plan tab control and stop report flags
            this.currentInwardStatus = data.status || '';
            this.isReportStopped = data.isReportStopped || false;
            this.stopReportReason = data.stopReportReason || '';

            // Override with Inward Data
            this.sampleInwardForm.patchValue({
              id: data.id,
              caseNo: data.caseNo,
              customerID: data.customerID,
              address: data.address,
              area: data.area,
              state: data.state,
              city: data.city,
              pinCode: data.pinCode,
              country: data.country,
              gstNo: data.gstNo,
              purchaseOrderId: data.purchaseOrderId || null,
              advancePayment: data.advancePayment,
              billRequired: data.billRequired,
              advancePIRequired: data.advancePIRequired,
              holdTesting: data.holdTesting,
              holdTestingUntilPIApproved: data.holdTestingUntilPIApproved,
              urgent: data.urgent,
              returnSample: data.returnSample,
              notDestroyed: data.notDestroyed,
              sampleReceiptNote: data.sampleReceiptNote,
              statementOfConformity: data.statementOfConformity || 'Not Applicable',
              decisionRule: data.decisionRule || 'Not Applicable',
              requestFileName: data.requestFileName,
              requestFilePath: data.requestFilePath,
              uploadReferenceId: data.uploadReferenceID,
              status: data.status,
              collectionTime: data.collectionTime || this.getCurrentTime()
            });

            // Restore PO in edit mode
            if (data.purchaseOrderId) {
              this.showPODropdown = true;
              // Load PO details for badge display
              this.customerPOService.getById(data.purchaseOrderId).subscribe({
                next: (po: any) => {
                  if (po) {
                    this.selectedPODetails = {
                      id: po.id,
                      name: po.poNumber || po.PONumber,
                      additionalValues: {
                        POAmount: po.poAmount || po.POAmount,
                        RemainingAmount: po.remainingAmount || po.RemainingAmount,
                        ValidUntil: po.validUntil || po.ValidUntil
                      }
                    };
                  }
                },
                error: () => { }
              });
            }

            // Override Dispatch Modes
            if (Array.isArray(data.dispatchModes)) {
              this.dispatchModesArray.clear();
              this.selectedDispatchModes = [];
              data.dispatchModes.forEach((dm: any) => {
                this.dispatchModesArray.push(
                  this.fb.group({
                    id: dm.id,
                    inwardId: dm.inwardID,
                    dispatchModeID: dm.dispatchModeID
                  })
                );
                this.selectedDispatchModes.push(dm.dispatchModeID || dm.id);
              });
            }

            // Override Contacts
            if (Array.isArray(data.contacts)) {
              this.contactControls.clear();
              this.billingToContactPerson = [];
              this.reportingToContactPerson = [];
              data.contacts.forEach((c: any) => {
                this.contactControls.push(
                  this.fb.group({
                    id: c.id,
                    selected: c.selected !== undefined ? c.selected : true,
                    contactID: c.contactID,
                    name: c.name,
                    mobileNo: c.mobileNo,
                    emailId: c.emailId,
                    sendBill: c.sendBill,
                    sendReport: c.sendReport,
                    inwardID: c.inwardID
                  })
                );
              });

              // Update contact lists based on selected, sendBill, and sendReport
              this.updateContactLists();
            }

            // Restore Reporting To & Billing To customer cards (with override customer support)
            this.reportingToCustomerControls.clear();
            this.billingToCustomerControls.clear();

            if (data.reportingTo) {
              const repCustId = data.reportingTo.customerID || data.customerID;
              const repCardGroup = this.createCustomerCardGroup('reporting', {
                id: repCustId,
                name: data.reportingTo.customerName || data.customerName,
                address: data.reportingTo.address,
                area: data.reportingTo.area,
                city: data.reportingTo.city,
                state: data.reportingTo.state,
                pinCode: data.reportingTo.pinCode,
                country: data.reportingTo.country,
                gstNo: data.reportingTo.gstNo || data.gstNo
              });
              this.reportingToCustomerControls.push(repCardGroup);

              if (repCustId && !this.customerContactsCache.has(repCustId)) {
                this.customerService.getCustomerById(repCustId).subscribe({
                  next: (cData) => {
                    const contacts = (cData.contactPersons || []).map((c: any, idx: number) => ({
                      ...c,
                      contactID: c.id,
                      isAccountant: c.isAccountant !== undefined ? c.isAccountant : (idx === 0)
                    }));
                    this.customerContactsCache.set(cData.id, contacts);
                  }
                });
              }
            } else {
              this.addReportingCustomerCard();
            }

            if (data.billingTo) {
              const billCustId = data.billingTo.customerID || data.customerID;
              const billCardGroup = this.createCustomerCardGroup('billing', {
                id: billCustId,
                name: data.billingTo.customerName || data.customerName,
                address: data.billingTo.address,
                area: data.billingTo.area,
                city: data.billingTo.city,
                state: data.billingTo.state,
                pinCode: data.billingTo.pinCode,
                country: data.billingTo.country,
                gstNo: data.billingTo.gstNo || data.gstNo
              });
              this.billingToCustomerControls.push(billCardGroup);

              if (billCustId && !this.customerContactsCache.has(billCustId)) {
                this.customerService.getCustomerById(billCustId).subscribe({
                  next: (cData) => {
                    const contacts = (cData.contactPersons || []).map((c: any, idx: number) => ({
                      ...c,
                      contactID: c.id,
                      isAccountant: c.isAccountant !== undefined ? c.isAccountant : (idx === 0)
                    }));
                    this.customerContactsCache.set(cData.id, contacts);
                  }
                });
              }
            } else {
              this.addBillingCustomerCard();
            }

            // Restore selected contact IDs into Reporting To and Billing To cards
            if (Array.isArray(data.contacts)) {
              const repContacts = data.contacts.filter((c: any) => c.sendReport === true || c.sendReport === 'true' || c.sendReport === 1);
              const billContacts = data.contacts.filter((c: any) => c.sendBill === true || c.sendBill === 'true' || c.sendBill === 1);

              if (this.reportingToCustomerControls.length > 0) {
                const repCard0 = this.reportingToCustomerControls.at(0) as FormGroup;
                const repSelectedArr = repCard0.get('selectedContactIDs') as FormArray;
                if (repSelectedArr) {
                  repSelectedArr.clear();
                  repContacts.forEach((c: any) => {
                    const cId = c.contactID || c.id;
                    if (cId && !repSelectedArr.controls.some(ctrl => ctrl.value === cId)) {
                      repSelectedArr.push(this.fb.control(cId));
                    }
                  });
                }
              }

              if (this.billingToCustomerControls.length > 0) {
                const billCard0 = this.billingToCustomerControls.at(0) as FormGroup;
                const billSelectedArr = billCard0.get('selectedContactIDs') as FormArray;
                if (billSelectedArr) {
                  billSelectedArr.clear();
                  billContacts.forEach((c: any) => {
                    const cId = c.contactID || c.id;
                    if (cId && !billSelectedArr.controls.some(ctrl => ctrl.value === cId)) {
                      billSelectedArr.push(this.fb.control(cId));
                    }
                  });
                }
              }
            }

            // Override Samples + Additional Details
            this.sampleDetails.clear();
            this.sampleAdditionalDetails.clear();
            this.bufferedAdditionalDetails = {};
            this.sampleNumbers = [];
            data.sampleDetails?.forEach((sd: any) => {
              const additionalSampleDetail = data.sampleAdditionalDetails?.filter(
                (x: any) => x.sampleNo === sd.sampleNo
              ) || [];

              const normalizedSample = {
                ...sd,
                // Map navigation property names for dropdown rebinding
                metalClassificationName: sd.metalClassificationName || sd.metalClassification?.name || '',
                productConditionName: sd.productConditionName || sd.productCondition?.name || '',
                specimenOrientationName: sd.specimenOrientationName || sd.specimenOrientation?.name || '',
                additionalDetails: additionalSampleDetail
              };
              this.addSample(normalizedSample);
              // Disable the row if it's cancelled
              if (normalizedSample.isCancelled) {
                const lastIdx = this.sampleDetails.length - 1;
                (this.sampleDetails.at(lastIdx) as FormGroup).disable();
              }
            });
            // Full edit allowed during registration, intake-complete, and planning phases.
            // From UNDER_REVIEW onward, form is view-only but cancel button
            // stays enabled per-sample until testing is completed.
            const editableStatuses: string[] = [
              InwardStatus.INWARD_REGISTERED,
              InwardStatus.INWARD_COMPLETED,
              InwardStatus.UNDER_PLANNING,
            ];
            if (!editableStatuses.includes(data?.status)) {
              this.isViewMode = true;
              this.disableFormRecursively(this.sampleInwardForm);
            }
          },
          error: (err) => console.error('Error fetching customer details:', err)
        });
      },
      error: (err) => console.error('Error fetching sample inward details:', err)
    });
  }

  fetchArea(areaId: number, targetGroup: FormGroup): void {
    this.areaService.getAreaById(areaId).subscribe({
      next: (resp) => {
        targetGroup.patchValue({
          area: resp.name,
          city: resp.city?.name,
          state: resp.city?.state?.name,
          country: resp.city?.state?.country?.name
        });

        if (targetGroup === this.sampleInwardForm) {
          targetGroup.patchValue({ gstNo: this.customerData?.gstNo });
        }
      },
      error: (error) => console.error('Error fetching area:', error)
    });
  }

  // Event Handlers
  onAddressContactPersonChange(section: 'reportingTo' | 'billingTo', event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedValue = +target.value;
    const group = section === 'reportingTo' ? this.reportingTo : this.billingTo;

    if (!selectedValue || isNaN(selectedValue)) {
      group.patchValue({
        contactPersonID: null,
        contactPersonName: '',
        address: '',
        pinCode: '',
        area: '',
        city: '',
        state: '',
        country: '',
        mobileNo: '',
        emailId: ''
      });
      group.get('contactPersonID')?.markAsTouched();
      return;
    }

    const overrideList = section === 'reportingTo'
      ? this.reportingToOverrideContacts
      : this.billingToOverrideContacts;
    const selectedCustomer =
      overrideList.find(c => c.contactID === selectedValue) ||
      this.contactPersons.find(c => c.contactID === selectedValue);
    this.updateAddressHelper(selectedCustomer, section);
  }

  updateAddressHelper(selectedCustomer: any, section: 'reportingTo' | 'billingTo'): void {
    if (!selectedCustomer) return;

    const patch = {
      contactPersonID: selectedCustomer?.id || selectedCustomer?.contactID || '',
      contactPersonName: selectedCustomer?.name || '',
      address: selectedCustomer?.address || '',
      pinCode: selectedCustomer?.pinCode || '',
      area: selectedCustomer?.area || '',
      city: selectedCustomer?.city || '',
      state: selectedCustomer?.state || '',
      country: selectedCustomer?.country || 'India',
      mobileNo: selectedCustomer?.mobileNo || '',
      emailId: selectedCustomer?.emailId || ''
    };

    if (section === 'reportingTo') {
      this.reportingTo.patchValue(patch);
      this.fetchArea(selectedCustomer?.areaID, this.reportingTo);
    } else {
      this.billingTo.patchValue(patch);
      this.fetchArea(selectedCustomer?.areaID, this.billingTo);
    }
  }

  // Helper method to update billing and reporting contact lists based on selected, sendBill, and sendReport
  private updateContactLists(): void {
    this.billingToContactPerson = [];
    this.reportingToContactPerson = [];

    this.contactControls.controls.forEach((contactControl, index) => {
      const contactFormValue = contactControl.value;
      // Only include contacts that are selected
      if (contactFormValue.selected) {
        // Merge form control value with original contact from contactPersons to preserve properties like areaID
        const originalContact = this.contactPersons.find(c => c.contactID === contactFormValue.contactID || c.id === contactFormValue.contactID) || {};
        const mergedContact = { ...originalContact, ...contactFormValue };

        if (contactFormValue.sendBill) {
          this.billingToContactPerson.push(mergedContact);
        }
        if (contactFormValue.sendReport) {
          this.reportingToContactPerson.push(mergedContact);
        }
      }
    });
  }

  onSendBillChange(index: number): void {
    if (this.isViewMode) return;

    const contact = this.contactControls.at(index).value;

    // Update contact lists based on selected, sendBill, and sendReport
    this.updateContactLists();

    // Reset billingTo if sendBill is unchecked and this contact was selected (only if no override customer)
    if (!contact.sendBill && this.billingTo.get('contactPersonID')?.value === contact.contactID) {
      if (!this.billingTo.get('customerID')?.value) {
        this.billingTo.reset();
        this.billingTo.patchValue({ type: 'billing' });
      }
    }
  }

  onSendReportChange(index: number): void {
    if (this.isViewMode) return;

    const contact = this.contactControls.at(index).value;

    // Update contact lists based on selected, sendBill, and sendReport
    this.updateContactLists();

    // Reset reportingTo if sendReport is unchecked and this contact was selected (only if no override customer)
    if (!contact.sendReport && this.reportingTo.get('contactPersonID')?.value === contact.contactID) {
      if (!this.reportingTo.get('customerID')?.value) {
        this.reportingTo.reset();
        this.reportingTo.patchValue({ type: 'reporting' });
      }
    }
  }

  onContactSelectedChange(index: number): void {
    if (this.isViewMode) return;

    const contact = this.contactControls.at(index).value;

    // Update contact lists based on selected, sendBill, and sendReport
    this.updateContactLists();

    // Reset billingTo/reportingTo if contact is deselected and was currently selected (only if no override customer)
    if (!contact.selected) {
      if (this.billingTo.get('contactPersonID')?.value === contact.contactID
          && !this.billingTo.get('customerID')?.value) {
        this.billingTo.reset();
        this.billingTo.patchValue({ type: 'billing' });
      }
      if (this.reportingTo.get('contactPersonID')?.value === contact.contactID
          && !this.reportingTo.get('customerID')?.value) {
        this.reportingTo.reset();
        this.reportingTo.patchValue({ type: 'reporting' });
      }
    }
  }

  onCustomerSelect(item: any): void {
    if (!item) {
      this.sampleInwardForm.patchValue({ customerID: null, purchaseOrderId: null });
      this.showPODropdown = false;
      this.selectedPODetails = null;
      this.selectedCustomerType = '';
      return;
    }
    this.sampleInwardForm.patchValue({
      customerID: item.id
    });
    this.getCustomerDetails(item.id);
  }

  onReportingToCustomerChange(item: any): void {
    if (!item) {
      this.reportingToOverrideContacts = [];
      this.editRestoreContactIDs.reporting = undefined;
      this.reportingTo.patchValue({
        customerID: null, contactPersonID: null, contactPersonName: '',
        address: '', pinCode: '', area: '', city: '', state: '', country: '', mobileNo: '', emailId: ''
      });
      return;
    }
    this.reportingTo.patchValue({ customerID: item.id });
    this.customerService.getCustomerById(item.id).subscribe({
      next: (data) => {
        if (!data) return;
        this.reportingToOverrideContacts = (data.contactPersons || []).map((c: any) => ({ ...c, contactID: c.id }));
        const restoreId = this.editRestoreContactIDs.reporting;
        this.editRestoreContactIDs.reporting = undefined;
        if (restoreId) {
          // Edit-mode restore: contacts just loaded, re-bind the saved contact person
          setTimeout(() => this.reportingTo.patchValue({ contactPersonID: restoreId }));
        } else {
          // User manually changed customer: clear the contact selection
          this.reportingTo.patchValue({
            contactPersonID: null, contactPersonName: '', address: '', pinCode: '',
            area: '', city: '', state: '', country: '', mobileNo: '', emailId: ''
          });
        }
      },
      error: (err) => console.error('Error fetching reporting-to override customer:', err)
    });
  }

  onBillingToCustomerChange(item: any): void {
    if (!item) {
      this.billingToOverrideContacts = [];
      this.editRestoreContactIDs.billing = undefined;
      this.billingTo.patchValue({
        customerID: null, contactPersonID: null, contactPersonName: '',
        address: '', pinCode: '', area: '', city: '', state: '', country: '', mobileNo: '', emailId: ''
      });
      return;
    }
    this.billingTo.patchValue({ customerID: item.id });
    this.customerService.getCustomerById(item.id).subscribe({
      next: (data) => {
        if (!data) return;
        this.billingToOverrideContacts = (data.contactPersons || []).map((c: any) => ({ ...c, contactID: c.id }));
        const restoreId = this.editRestoreContactIDs.billing;
        this.editRestoreContactIDs.billing = undefined;
        if (restoreId) {
          // Edit-mode restore: contacts just loaded, re-bind the saved contact person
          setTimeout(() => this.billingTo.patchValue({ contactPersonID: restoreId }));
        } else {
          // User manually changed customer: clear the contact selection
          this.billingTo.patchValue({
            contactPersonID: null, contactPersonName: '', address: '', pinCode: '',
            area: '', city: '', state: '', country: '', mobileNo: '', emailId: ''
          });
        }
      },
      error: (err) => console.error('Error fetching billing-to override customer:', err)
    });
  }

  isDispatchModeSelected(id: number): boolean {
    return this.selectedDispatchModes?.includes(id);
  }

  onDispatchModeToggle(event: Event): void {
    if (this.isViewMode) return;

    const checkbox = event.target as HTMLInputElement;
    const id = +checkbox.value;
    const formArray = this.dispatchModesArray;

    if (checkbox.checked) {
      if (!this.selectedDispatchModes.includes(id)) {
        this.selectedDispatchModes.push(id);
        formArray.push(this.createDispatch({ dispatchModeID: id }));
      }
    } else {
      const idx = this.selectedDispatchModes.indexOf(id);
      if (idx !== -1) {
        this.selectedDispatchModes.splice(idx, 1);
      }
      const index = formArray.controls.findIndex(ctrl => ctrl.get('dispatchModeID')?.value === id);
      if (index !== -1) {
        formArray.removeAt(index);
      }
    }
    formArray.markAsTouched();
  }

  private createDispatch(dispatchMode?: any): FormGroup {
    return this.fb.group({
      id: [dispatchMode?.id || 0],
      inwardID: [dispatchMode?.inwardID || 0],
      dispatchModeID: [dispatchMode?.dispatchModeID || 0]
    });
  }

  // Contact Helpers
  isAccountantContact(index: number): boolean {
    if (index === 0) return true;
    const ctrl = this.contactControls.at(index);
    return ctrl?.get('isAccountant')?.value === true;
  }

  // Multi-Customer / Multi-Contact Cache & FormArrays
  customerContactsCache = new Map<number, any[]>();

  get reportingToCustomerControls(): FormArray {
    return this.sampleInwardForm.get('reportingToCustomers') as FormArray;
  }

  get billingToCustomerControls(): FormArray {
    return this.sampleInwardForm.get('billingToCustomers') as FormArray;
  }

  createCustomerCardGroup(type: 'reporting' | 'billing', customerData: any = null): FormGroup {
    return this.fb.group({
      id: [0],
      customerID: [customerData?.id || null],
      customerName: [customerData?.name || ''],
      address: [customerData?.address || ''],
      area: [customerData?.area || ''],
      city: [customerData?.city || ''],
      state: [customerData?.state || ''],
      pinCode: [customerData?.pinCode || ''],
      country: [customerData?.country || 'India'],
      gstNo: [customerData?.gstNo || ''],
      type: [type],
      selectedContactIDs: this.fb.array([])
    });
  }

  addReportingCustomerCard(customerData: any = null): void {
    const card = this.createCustomerCardGroup('reporting', customerData);
    this.reportingToCustomerControls.push(card);
    if (customerData?.id && customerData?.contactPersons) {
      const contacts = customerData.contactPersons?.map((c: any, idx: number) => ({
        ...c,
        contactID: c.id,
        isAccountant: c.isAccountant !== undefined ? c.isAccountant : (idx === 0)
      })) || [];
      this.customerContactsCache.set(customerData.id, contacts);
    }
  }

  getFormattedFullCustomerAddress(card: any): string {
    if (!card) return '-';

    const getVal = (key: string) => {
      const cardVal = card.get(key)?.value;
      if (cardVal && String(cardVal).trim().length > 0) return String(cardVal).trim();

      const isPrimaryReporting = this.reportingToCustomerControls?.length > 0 && card === this.reportingToCustomerControls.at(0);
      const isPrimaryBilling = this.billingToCustomerControls?.length > 0 && card === this.billingToCustomerControls.at(0);
      if ((isPrimaryReporting || isPrimaryBilling) && (this.customerData || this.sampleInwardForm)) {
        const mainVal = this.customerData?.[key] || this.sampleInwardForm?.get(key)?.value;
        if (mainVal && String(mainVal).trim().length > 0) return String(mainVal).trim();
      }
      return '';
    };

    const address = getVal('address');
    const area = getVal('area');
    const city = getVal('city');
    const state = getVal('state');
    const pinCode = getVal('pinCode');
    const country = getVal('country');

    const addressParts = [address, area, city, state].filter(p => p.length > 0);
    let fullAddr = addressParts.join(', ');

    if (pinCode.length > 0) {
      fullAddr += fullAddr ? ` - ${pinCode}` : pinCode;
    }
    if (country.length > 0 && country.toLowerCase() !== 'india') {
      fullAddr += fullAddr ? `, ${country}` : country;
    }

    return fullAddr || '-';
  }

  removeReportingCustomerCard(index: number): void {
    if (index > 0) {
      this.reportingToCustomerControls.removeAt(index);
    }
  }

  onReportingCustomerSelected(item: any, cardIndex: number): void {
    const card = this.reportingToCustomerControls.at(cardIndex) as FormGroup;
    const selectedArray = card?.get('selectedContactIDs') as FormArray;

    if (!item?.id) {
      card.patchValue({ customerID: null, customerName: '', address: '', area: '', city: '', state: '', pinCode: '', gstNo: '' });
      selectedArray?.clear();
      return;
    }

    // Check duplicate customer in Reporting To
    const isDuplicate = this.reportingToCustomerControls.controls.some((c, idx) => idx !== cardIndex && c.get('customerID')?.value === item.id);
    if (isDuplicate) {
      this.toastService.show(`Customer "${item.name || 'Selected Customer'}" is already added in Reporting To list. Duplicate customers are not allowed.`, 'warning');
      setTimeout(() => {
        card.patchValue({ customerID: null, customerName: '', address: '', area: '', city: '', state: '', pinCode: '', gstNo: '' });
        selectedArray?.clear();
      }, 0);
      return;
    }

    this.customerService.getCustomerById(item.id).subscribe({
      next: (data) => {
        card.patchValue({
          customerID: data.id,
          customerName: data.name,
          address: data.address,
          area: data.area,
          city: data.city,
          state: data.state,
          pinCode: data.pinCode,
          gstNo: data.gstNo
        });
        const contacts = data.contactPersons?.map((c: any, idx: number) => ({
          ...c,
          contactID: c.id,
          isAccountant: c.isAccountant !== undefined ? c.isAccountant : (idx === 0)
        })) || [];
        this.customerContactsCache.set(data.id, contacts);
      }
    });
  }

  addBillingCustomerCard(customerData: any = null): void {
    const card = this.createCustomerCardGroup('billing', customerData);
    this.billingToCustomerControls.push(card);
    if (customerData?.id && customerData?.contactPersons) {
      const contacts = customerData.contactPersons?.map((c: any, idx: number) => ({
        ...c,
        contactID: c.id,
        isAccountant: c.isAccountant !== undefined ? c.isAccountant : (idx === 0)
      })) || [];
      this.customerContactsCache.set(customerData.id, contacts);
    }
  }

  removeBillingCustomerCard(index: number): void {
    if (index > 0) {
      this.billingToCustomerControls.removeAt(index);
    }
  }

  onBillingCustomerSelected(item: any, cardIndex: number): void {
    const card = this.billingToCustomerControls.at(cardIndex) as FormGroup;
    const selectedArray = card?.get('selectedContactIDs') as FormArray;

    if (!item?.id) {
      card.patchValue({ customerID: null, customerName: '', address: '', area: '', city: '', state: '', pinCode: '', gstNo: '' });
      selectedArray?.clear();
      return;
    }

    // Check duplicate customer in Billing To
    const isDuplicate = this.billingToCustomerControls.controls.some((c, idx) => idx !== cardIndex && c.get('customerID')?.value === item.id);
    if (isDuplicate) {
      this.toastService.show(`Customer "${item.name || 'Selected Customer'}" is already added in Billing To list. Duplicate customers are not allowed.`, 'warning');
      setTimeout(() => {
        card.patchValue({ customerID: null, customerName: '', address: '', area: '', city: '', state: '', pinCode: '', gstNo: '' });
        selectedArray?.clear();
      }, 0);
      return;
    }

    this.customerService.getCustomerById(item.id).subscribe({
      next: (data) => {
        card.patchValue({
          customerID: data.id,
          customerName: data.name,
          address: data.address,
          area: data.area,
          city: data.city,
          state: data.state,
          pinCode: data.pinCode,
          gstNo: data.gstNo
        });
        const contacts = data.contactPersons?.map((c: any, idx: number) => ({
          ...c,
          contactID: c.id,
          isAccountant: c.isAccountant !== undefined ? c.isAccountant : (idx === 0)
        })) || [];
        this.customerContactsCache.set(data.id, contacts);
      }
    });
  }

  hasCustomerSelected(type: 'reporting' | 'billing', cardIndex: number): boolean {
    const controls = type === 'reporting' ? this.reportingToCustomerControls : this.billingToCustomerControls;
    const card = controls?.at(cardIndex);
    const customerId = card?.get('customerID')?.value || (cardIndex === 0 ? (this.customerData?.id || this.sampleInwardForm?.get('customerID')?.value) : null);
    return !!customerId;
  }

  getCustomerContactsList(type: 'reporting' | 'billing', cardIndex: number): any[] {
    const controls = type === 'reporting' ? this.reportingToCustomerControls : this.billingToCustomerControls;
    const card = controls?.at(cardIndex);
    const customerId = card?.get('customerID')?.value || (cardIndex === 0 ? (this.customerData?.id || this.sampleInwardForm?.get('customerID')?.value) : null);
    let list: any[] = [];

    if (!customerId) {
      return [];
    }

    if (this.customerContactsCache.has(customerId)) {
      list = this.customerContactsCache.get(customerId) || [];
    } else if (cardIndex === 0 && (this.contactPersons && this.contactPersons.length > 0)) {
      list = this.contactPersons;
    } else {
      list = [];
    }

    if (type === 'reporting') {
      const reportingContacts = list.filter(c => c.sendReport === true || c.sendReport === 'true' || c.sendReport === 1 || c.isReporting === true);
      return reportingContacts.length > 0 ? reportingContacts : list;
    } else {
      const billingContacts = list.filter(c => c.sendBill === true || c.sendBill === 'true' || c.sendBill === 1 || c.isBilling === true);
      return billingContacts.length > 0 ? billingContacts : list;
    }
  }

  isContactSelected(type: 'reporting' | 'billing', cardIndex: number, contactId: number): boolean {
    const controls = type === 'reporting' ? this.reportingToCustomerControls : this.billingToCustomerControls;
    const card = controls?.at(cardIndex);
    const selectedArray = card?.get('selectedContactIDs') as FormArray;
    return selectedArray?.controls.some(ctrl => ctrl.value === contactId) || false;
  }

  onContactToggle(type: 'reporting' | 'billing', cardIndex: number, contactId: number, event: any): void {
    const controls = type === 'reporting' ? this.reportingToCustomerControls : this.billingToCustomerControls;
    const card = controls?.at(cardIndex);
    const selectedArray = card?.get('selectedContactIDs') as FormArray;
    if (event.target.checked) {
      if (!selectedArray.controls.some(ctrl => ctrl.value === contactId)) {
        selectedArray.push(this.fb.control(contactId));
      }
    } else {
      const idx = selectedArray.controls.findIndex(ctrl => ctrl.value === contactId);
      if (idx !== -1) {
        selectedArray.removeAt(idx);
      }
    }
  }

  get requiresSupportingDoc(): boolean {
    const mainCustomer = this.sampleInwardForm?.get('customerID')?.value;
    if (!mainCustomer) return false;

    const hasReportingDiff = this.reportingToCustomerControls?.controls.some(card => {
      const cid = card.get('customerID')?.value;
      return cid && cid !== mainCustomer;
    });

    const hasBillingDiff = this.billingToCustomerControls?.controls.some(card => {
      const cid = card.get('customerID')?.value;
      return cid && cid !== mainCustomer;
    });

    const oldRep = this.reportingTo?.get('customerID')?.value;
    const oldBill = this.billingTo?.get('customerID')?.value;

    return hasReportingDiff || hasBillingDiff || (!!oldRep && oldRep !== mainCustomer) || (!!oldBill && oldBill !== mainCustomer);
  }

  openStopReportDialog(): void {
    this.stopReportReasonInput = '';
    this.showStopReportDialog = true;
  }

  confirmStopReport(): void {
    if (!this.stopReportReasonInput?.trim()) return;
    this.inwardService.stopReport(this.sampleId, this.stopReportReasonInput.trim()).subscribe({
      next: () => {
        this.isReportStopped = true;
        this.stopReportReason = this.stopReportReasonInput.trim();
        this.showStopReportDialog = false;
        this.toastService.show('Report generation has been stopped.', 'success');
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to stop report.', 'error');
      }
    });
  }

  onUnstopReport(): void {
    if (!window.confirm('Are you sure you want to remove the report stop?')) return;
    this.inwardService.unstopReport(this.sampleId).subscribe({
      next: () => {
        this.isReportStopped = false;
        this.stopReportReason = '';
        this.toastService.show('Report stop has been removed.', 'success');
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to unstop report.', 'error');
      }
    });
  }

  addContact(contact: any, selected: boolean = false): void {
    this.contactControls.push(this.fb.group({
      id: [contact.id || 0],
      selected: [selected],
      contactID: [contact.id || 0],
      name: [contact?.name || ''],
      mobileNo: [contact?.mobileNo || ''],
      emailId: [contact?.emailId || ''],
      sendBill: [{ value: contact?.sendBill || false, disabled: true }],
      sendReport: [{ value: contact?.sendReport || false, disabled: true }],
      isAccountant: [contact?.isAccountant || false]
    }));
  }

  // Sample Helpers
  addSample(existingSample: any = null): void {
    let sampleNo: string;

    if (existingSample?.sampleNo) {
      // Editing: use existing sample number
      sampleNo = existingSample.sampleNo;
      this.manageSampleNumber('init', undefined, sampleNo);
    } else {
      // Adding new: generate next sample number
      sampleNo = this.manageSampleNumber('add');
    }

    const sampleForm = this.fb.group({
      id: [existingSample?.id || 0],
      sampleNo: [sampleNo],
      details: [existingSample?.details || '', Validators.required],
      metalClassificationID: [existingSample?.metalClassificationID || ''],
      metalClassificationName: [existingSample?.metalClassificationName || ''],
      productConditionID: [existingSample?.productConditionID || ''],
      productConditionName: [existingSample?.productConditionName || ''],
      specimenOrientationID: [existingSample?.specimenOrientationID || ''],
      specimenOrientationName: [existingSample?.specimenOrientationName || ''],
      remarks: [existingSample?.remarks || ''],
      quantity: [existingSample?.quantity || 1],
      fileName: [existingSample?.fileName || ''],
      sampleFilePath: [existingSample?.sampleFilePath || ''],
      file: [null],
      productFormID: [existingSample?.productFormID || null],
      thickness: [existingSample?.thickness || null],
      diameter: [existingSample?.diameter || null],
      width: [existingSample?.width || null],
      length: [existingSample?.length || null],
      sampleStatus: [existingSample?.sampleStatus || ''],
      isCancelled: [existingSample?.isCancelled || false],
      cancellationReason: [existingSample?.cancellationReason || ''],
      preparationRequired: [existingSample?.preparationRequired ?? false],
      machiningRequired: [existingSample?.machiningRequired ?? false],
      machiningAmount: [existingSample?.machiningAmount ?? null],
      specimen: [existingSample?.specimen || ''],
      otherPreparation: [existingSample?.otherPreparation ?? false],
      otherPreparationCharge: [existingSample?.otherPreparationCharge ?? null],
      tpiRequired: [existingSample?.tpiRequired ?? false],
      tpiAgencyName: [existingSample?.tpiAgencyName || ''],
      testInstructions: [existingSample?.testInstructions || '']
    });

    this.sampleDetails.push(sampleForm);

    const additionalDetails =
      existingSample?.id > 0
        ? existingSample.additionalDetails || []
        : this.bufferedAdditionalDetails[sampleNo] || [];

    this.addAdditionalDetailsForSample(sampleNo, additionalDetails);
  }


  private addAdditionalDetailsForSample(
    sampleNo: string,
    additionalDetails: any[] = []
  ): void {
    const formArray = this.sampleAdditionalDetails as FormArray;
    const existingLabels = formArray.controls.map(r => r.get('label')?.value);

    formArray.controls.forEach(row => {
      const valuesArray = row.get('values') as FormArray;
      const label = row.get('label')?.value;
      const match = additionalDetails.find(x => x.label === label);
      if (match) {
        // push the matching value for this sample into the row's values array
        valuesArray.push(this.fb.control(match?.value ?? ''));
      }
    });

    additionalDetails
      .filter(ad => !existingLabels.includes(ad.label))
      .forEach(ad => {
        // create unique controls for each existing sample column (except the new one we will append below)
        const valuesArray = this.fb.array(
          Array.from({ length: Math.max(0, this.sampleNumbers.length - 1) }, () => this.fb.control(''))
        );

        // push the current sample's value as the last column
        valuesArray.push(this.fb.control(ad.value ?? ''));

        formArray.push(
          this.fb.group({
            id: [ad.id || 0],
            label: [ad.label],
            enabled: [true],
            values: valuesArray
          })
        );
      });

    if (!additionalDetails.length && formArray.length > 0) {
      formArray.controls.forEach(row => {
        // append a new empty control for the newly added sample
        (row.get('values') as FormArray).push(this.fb.control(''));
      });
    }

    if (!this.bufferedAdditionalDetails[sampleNo]) {
      this.bufferedAdditionalDetails[sampleNo] = additionalDetails;
    }
  }


  applyQty(index: number): void {
    const sample = this.sampleDetails.at(index) as FormGroup;
    const qty = Number(sample.get('quantity')?.value || 1);
    if (qty <= 1) return;

    // Capture all field values to replicate
    const data = sample.getRawValue();

    // Reset original row to qty=1
    sample.patchValue({ quantity: 1 });

    // Add qty-1 identical copies (addSample generates new sampleNos)
    for (let i = 1; i < qty; i++) {
      this.addSample({
        id: 0,
        sampleNo: '',
        details: data.details,
        metalClassificationID: data.metalClassificationID,
        metalClassificationName: data.metalClassificationName,
        productConditionID: data.productConditionID,
        productConditionName: data.productConditionName,
        specimenOrientationID: data.specimenOrientationID,
        specimenOrientationName: data.specimenOrientationName,
        remarks: data.remarks,
        quantity: 1,
        fileName: '',
        sampleFilePath: '',
        file: null,
        productFormID: data.productFormID,
        thickness: data.thickness,
        diameter: data.diameter,
        width: data.width,
        length: data.length,
      });
    }
  }

  removeSample(index: number): void {
    if (this.isViewMode) return;

    const sample = this.sampleDetails.at(index) as FormGroup;
    const sampleId = sample.get('id')?.value;
    const removedSampleNo = sample.get('sampleNo')?.value;

    if (sampleId && sampleId > 0) {
      // Saved row — call API to soft-delete on backend
      this.inwardService.deleteSample(sampleId).subscribe({
        next: () => {
          this.sampleDetails.removeAt(index);
          this.manageSampleNumber('remove', index);
          if (removedSampleNo && this.bufferedAdditionalDetails[removedSampleNo]) {
            delete this.bufferedAdditionalDetails[removedSampleNo];
          }
          this.sampleAdditionalDetails.controls.forEach(row => {
            const valuesArray = row.get('values') as FormArray;
            valuesArray.removeAt(index);
          });
          this.toastService.show('Sample deleted successfully.', 'success');
        },
        error: (err: any) => {
          this.toastService.show(err?.error?.message || 'Failed to delete sample.', 'error');
        }
      });
      return;
    }

    // Unsaved new row — remove from FormArray directly
    this.sampleDetails.removeAt(index);
    this.manageSampleNumber('remove', index);
    if (removedSampleNo && this.bufferedAdditionalDetails[removedSampleNo]) {
      delete this.bufferedAdditionalDetails[removedSampleNo];
    }
    this.sampleAdditionalDetails.controls.forEach(row => {
      const valuesArray = row.get('values') as FormArray;
      valuesArray.removeAt(index);
    });
  }

  // Cancel button is shown per-sample when the form is locked (not editable)
  // and the sample has not yet reached TESTING_COMPLETED.
  // During INWARD_REGISTERED / UNDER_PLANNING the user can delete the row instead.
  canCancelThisSample(sample: AbstractControl): boolean {
    const status = sample.get('sampleStatus')?.value as string;
    if (!status) return false;

    // Too early — form is still editable, delete is the right action
    const editableStatuses = new Set([
      SampleStatus.SAMPLE_INWARD_REGISTERED,
      SampleStatus.AWAITING_MISSING_INFORMATION,
      SampleStatus.INWARD_COMPLETED,
      SampleStatus.UNDER_PLANNING,
    ]);
    // Too late — testing done or already cancelled, cannot reverse
    const nonCancellableStatuses = new Set([
      SampleStatus.TESTING_COMPLETED,
      SampleStatus.TESTING_UNDER_VERIFICATION,
      SampleStatus.TESTING_VERIFICATION_REJECTED,
      SampleStatus.TESTING_VERIFIED,
      SampleStatus.REPORT_GENERATION_IN_PROGRESS,
      SampleStatus.REPORT_GENERATED,
      SampleStatus.REPORT_UNDER_REVIEW,
      SampleStatus.REPORT_REJECTED_BY_INTERNAL,
      SampleStatus.REPORT_AMENDED_BY_INTERNAL,
      SampleStatus.REPORT_AMENDED_REJECTED,
      SampleStatus.REPORT_AMENDMENT_APPROVED,
      SampleStatus.REPORT_SENT_FOR_CUSTOMER_REVIEW,
      SampleStatus.CUSTOMER_REQUESTED_AMENDMENT,
      SampleStatus.AMENDMENT_IN_PROGRESS,
      SampleStatus.AMENDMENT_COMPLETED,
      SampleStatus.PAYMENT_PENDING,
      SampleStatus.PAYMENT_COMPLETED,
      SampleStatus.FINAL_REPORT_APPROVED,
      SampleStatus.REPORT_DISPATCHED,
      SampleStatus.CASE_CLOSED,
      SampleStatus.SAMPLE_CANCELLED,
    ]);

    return !editableStatuses.has(status as SampleStatus) && !nonCancellableStatuses.has(status as SampleStatus);
  }

  switchToPlanTab(): void {
    if (this.sampleInwardForm.dirty) {
      this.toastService.show('Please save your changes before viewing the plan.', 'warning');
      return;
    }

    const activeSampleCount = this.sampleDetails.controls.filter(
      s => !s.get('isCancelled')?.value
    ).length;

    const needsReload = !this.planTabLoaded || activeSampleCount !== this.planLastSampleCount;

    if (needsReload) {
      this.planTabLoaded = false;
      this.planLastSampleCount = activeSampleCount;
      setTimeout(() => (this.planTabLoaded = true), 0);
    }
  }

  openCancelDialog(index: number): void {
    this.cancelTargetIndex = index;
    this.cancelReason = '';
    this.showCancelDialog = true;
  }

  confirmCancelSample(): void {
    const sample = this.sampleDetails.at(this.cancelTargetIndex) as FormGroup;
    const sampleId = sample.get('id')?.value;

    if (!sampleId || sampleId === 0) {
      // Unsaved new row — just remove from FormArray directly
      this.sampleDetails.removeAt(this.cancelTargetIndex);
      this.manageSampleNumber('remove', this.cancelTargetIndex);
      this.showCancelDialog = false;
      return;
    }

    this.inwardService.cancelSample(sampleId, this.cancelReason).subscribe({
      next: () => {
        sample.patchValue({
          sampleStatus: SampleStatus.SAMPLE_CANCELLED,
          isCancelled: true,
          cancellationReason: this.cancelReason
        });
        sample.disable();
        this.showCancelDialog = false;
        this.planLastSampleCount = 0; // force plan tab to reload — cancelled sample must be excluded
        this.toastService.show('Sample cancelled successfully.', 'success');
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to cancel sample.', 'error');
        this.showCancelDialog = false;
      }
    });
  }

  generateUrlNo(counter: number): string {
    return `TC5098${this.yearCode}${counter.toString().padStart(9, '0')}F`;
  }

  getAdditionSampleRowValues(rowIndex: number): FormControl[] {
    const row = this.sampleAdditionalDetails.at(rowIndex);
    const valuesArray = row.get('values') as FormArray;
    return valuesArray.controls as FormControl[];
  }

  addAdditionalSampleRow(label: string = ''): void {
    const valuesArray = this.fb.array(this.sampleNumbers.map(() => this.fb.control('')));
    this.sampleAdditionalDetails.push(this.fb.group({
      label: [label || ''],
      enabled: [false],
      values: valuesArray
    }));
  }

  onLabelChange(): void {
    // Trigger change detection for dropdown options
  }

  isOptionSelected(option: string, currentIndex: number): boolean {
    const selectedOptions = this.sampleAdditionalDetails.controls
      .map((group, index) => index !== currentIndex ? group.get('label')?.value : null)
      .filter(val => val !== null);
    return selectedOptions.includes(option);
  }

  // ─── Tab 2 Sample Details Redesign Helpers ───
  getTotalSampleQty(): number {
    return this.sampleDetails.controls.reduce((sum, ctrl) => {
      const qty = +ctrl.get('quantity')?.value || 1;
      return sum + qty;
    }, 0);
  }

  getSampleFilesCount(): number {
    return this.sampleDetails.controls.filter(ctrl => {
      return !!ctrl.get('sampleFilePath')?.value || !!ctrl.get('fileName')?.value;
    }).length;
  }

  appendReceiptNote(templateText: string): void {
    if (this.isViewMode) return;
    const currentNote = this.sampleInwardForm.get('sampleReceiptNote')?.value || '';
    if (currentNote.includes(templateText)) return;
    const updatedNote = currentNote ? `${currentNote.trim()}, ${templateText}` : templateText;
    this.sampleInwardForm.patchValue({ sampleReceiptNote: updatedNote });
    this.sampleInwardForm.markAsDirty();
  }

  quickAddAdditionalRow(labelName: string): void {
    if (this.isViewMode) return;
    const exists = this.sampleAdditionalDetails.controls.some(ctrl => ctrl.get('label')?.value === labelName);
    if (exists) {
      this.toastService.show(`"${labelName}" row is already added below.`, 'info');
      return;
    }
    this.addAdditionalSampleRow(labelName);
  }

  copyFirstValueToAll(rowIndex: number): void {
    if (this.isViewMode) return;
    const valuesArray = (this.sampleAdditionalDetails.at(rowIndex) as FormGroup).get('values') as FormArray;
    if (!valuesArray || valuesArray.length <= 1) return;
    const firstVal = valuesArray.at(0).value;
    if (!firstVal) {
      this.toastService.show('Please enter a value in Sample 1 column first.', 'warning');
      return;
    }
    valuesArray.controls.forEach((ctrl, idx) => {
      if (idx > 0) {
        ctrl.setValue(firstVal);
        ctrl.markAsDirty();
      }
    });
    this.toastService.show(`Copied "${firstVal}" across all sample columns.`, 'success');
  }

  // Dropdown Handlers
  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalService.getMetalClassificationDropdown(term, page, pageSize);
  };

  getProductConditions = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.prodCondService.getProductConditionDropdown(term, page, pageSize);
  };

  onMetalClassificationSelected(item: any, sampleIndex: number): void {
    const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
    sampleDetailGroup.patchValue({
      metalClassificationID: item?.id || null,
      metalClassificationName: item?.name || '',
      specimenOrientationID: null,
      specimenOrientationName: '',
    });
  }

  onProductConditionSelected(item: any, sampleIndex: number): void {
    const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
    sampleDetailGroup.patchValue({
      productConditionID: item?.id || null,
      productConditionName: item?.name || '',
    });
  }



  // Specimen Orientation & Product Form — commented out per client requirement
  // getSpecimenOrientationDrop = (sampleIndex: number) => {
  //   return (term: string, page: number, pageSize: number): Observable<any[]> => {
  //     const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
  //     const metalClassificationID = sampleDetailGroup?.get('metalClassificationID')?.value;
  //     if (metalClassificationID) {
  //       return this.specimenOrientationService.getByClassification(metalClassificationID, term, page, pageSize);
  //     }
  //     return this.specimenOrientationService.getSpecimenOrientationDropdown(term, page, pageSize);
  //   };
  // };

  // onSpecimenOrientationSelected(item: any, sampleIndex: number): void {
  //   const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
  //   sampleDetailGroup.patchValue({
  //     specimenOrientationID: item?.id || null,
  //     specimenOrientationName: item?.name || '',
  //   });
  // }

  // getProductFormDrop = (term: string, page: number, pageSize: number) => {
  //   return this.productFormService.getProductFormDropdown(term, page, pageSize);
  // };

  // onProductFormSelected(item: any, sampleIndex: number): void {
  //   const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
  //   sampleDetailGroup.patchValue({ productFormID: item?.id || null });
  // }

  // File Handling
  private validateFile(file: File, allowedTypes: string[], maxSizeMB = 5): boolean {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastService.show(`File size should be less than ${maxSizeMB} MB.`, 'warning');
      return false;
    }
    if (!allowedTypes.includes(file.type)) {
      this.toastService.show('Invalid file type', 'warning');
      return false;
    }
    return true;
  }

  onFileUpload(event: any): void {
    const file = event.target.files[0];
    if (file && this.validateFile(file, [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ])) {
      this.sampleInwardForm.patchValue({ requestFileName: file.name, file: file });
      this.uploadedFile = file;
    } else {
      event.target.value = '';
    }
  }

  removeAttachment(): void {
    this.uploadedFile = null;
  }

  onUploadSampleImage(index: number, event: any): void {
    const file = event.target.files[0];
    if (file && this.validateFile(file, ['image/jpeg', 'image/png'])) {
      // update file and fileName for preview; do not try to set input value programmatically
      this.sampleDetails.at(index).patchValue({ fileName: file.name, file: file, sampleFilePath: '' });
    } else {
      event.target.value = '';
    }
  }

  openFileInNewTab(filePath: string): void {
    if (filePath) {
      const baseUrl = environment.baseUrl;
      window.open(baseUrl + filePath, '_blank');
    }
  }

  removeSampleFile(index: number): void {
    if (this.isViewMode) return;
    this.sampleDetails.at(index).patchValue({ fileName: '', file: null });
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.sampleInwardForm, path, this.submitted);
  }

  // Submission
  onSubmit(includePlans: boolean = false): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.sampleInwardForm);
    if (!this.sampleInwardForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }

    const value = this.sampleInwardForm.getRawValue();

    // Validation: Duplicate customer check in Reporting To
    const repCustomerIds = this.reportingToCustomerControls.controls
      .map(c => c.get('customerID')?.value)
      .filter(id => id !== null && id !== undefined && id !== '');
    if (new Set(repCustomerIds).size !== repCustomerIds.length) {
      this.toastService.show('Duplicate customer selected in Reporting To list. Each customer can only be added once.', 'warning');
      return;
    }

    // Validation: Duplicate customer check in Billing To
    const billCustomerIds = this.billingToCustomerControls.controls
      .map(c => c.get('customerID')?.value)
      .filter(id => id !== null && id !== undefined && id !== '');
    if (new Set(billCustomerIds).size !== billCustomerIds.length) {
      this.toastService.show('Duplicate customer selected in Billing To list. Each customer can only be added once.', 'warning');
      return;
    }

    // Validation: At least one contact person must be selected for EACH Reporting To customer card
    for (let rIdx = 0; rIdx < this.reportingToCustomerControls.length; rIdx++) {
      const card = this.reportingToCustomerControls.at(rIdx) as FormGroup;
      const selectedContacts = card.get('selectedContactIDs')?.value || [];
      const customerName = card.get('customerName')?.value || (rIdx === 0 ? (this.customerData?.name || 'Customer 1') : `Customer ${rIdx + 1}`);
      if (selectedContacts.length === 0) {
        this.toastService.show(`Please select at least one contact person for Reporting To customer: ${customerName}`, 'warning');
        return;
      }
    }

    // Validation: At least one contact person must be selected for EACH Billing To customer card
    for (let bIdx = 0; bIdx < this.billingToCustomerControls.length; bIdx++) {
      const card = this.billingToCustomerControls.at(bIdx) as FormGroup;
      const selectedContacts = card.get('selectedContactIDs')?.value || [];
      const customerName = card.get('customerName')?.value || (bIdx === 0 ? (this.customerData?.name || 'Customer 1') : `Customer ${bIdx + 1}`);
      if (selectedContacts.length === 0) {
        this.toastService.show(`Please select at least one contact person for Billing To customer: ${customerName}`, 'warning');
        return;
      }
    }

    if (this.requiresSupportingDoc && !value.requestFileName && !this.uploadedFile) {
      this.toastService.show('Supporting document is mandatory when Reporting To or Billing To customer differs from main customer.', 'warning');
      return;
    }

    const formData = new FormData();

    const appendFields = (fields: any) => {
      Object.keys(fields).forEach(key => {
        const val = fields[key];
        if (val !== undefined && val !== null) {
          if (val instanceof File) {
            formData.append(key, val);
          } else {
            formData.append(key, String(val));
          }
        }
      });
    };

    appendFields({
      id: value.id || '0',
      caseNo: value.caseNo,
      customerID: value.customerID,
      address: value.address,
      area: value.area,
      state: value.state,
      city: value.city,
      pinCode: value.pinCode,
      country: value.country,
      purchaseOrderId: value.purchaseOrderId || '',
      advancePayment: value.advancePayment || '0',
      billRequired: value.billRequired || 'false',
      advancePIRequired: value.advancePIRequired || 'false',
      holdTesting: value.holdTesting || 'false',
      holdTestingUntilPIApproved: value.holdTestingUntilPIApproved || 'false',
      collectionTime: value.collectionTime || this.getCurrentTime(),
      collectionDate: value.collectionDate || '',
      urgent: value.urgent || 'false',
      returnSample: value.returnSample || 'false',
      notDestroyed: value.notDestroyed || 'false',
      sampleReceiptNote: value.sampleReceiptNote || '',
      requestFilePath: value.requestFilePath || '',
      requestFileName: value.requestFileName || '',
      file: value.file
    });

    // Dispatch modes
    value.dispatchModes?.forEach((d: any, i: number) => {
      formData.append(`dispatchModes[${i}].dispatchModeID`, d.dispatchModeID);
      formData.append(`dispatchModes[${i}].inwardID`, d.inwardID || '0');
      formData.append(`dispatchModes[${i}].id`, d.id || '0');
    });

    // Contacts: Gather actual selections from Reporting To and Billing To cards
    const repSelectedIDs = new Set<number>();
    this.reportingToCustomerControls.controls.forEach((card: any) => {
      const ids = card.get('selectedContactIDs')?.value || [];
      ids.forEach((id: any) => repSelectedIDs.add(Number(id)));
    });

    const billSelectedIDs = new Set<number>();
    this.billingToCustomerControls.controls.forEach((card: any) => {
      const ids = card.get('selectedContactIDs')?.value || [];
      ids.forEach((id: any) => billSelectedIDs.add(Number(id)));
    });

    const allAvailableContactsMap = new Map<number, any>();
    this.customerContactsCache.forEach((contactsList) => {
      contactsList.forEach((c: any) => {
        const cId = Number(c.contactID || c.id);
        if (cId) allAvailableContactsMap.set(cId, c);
      });
    });
    (this.contactPersons || []).forEach((c: any) => {
      const cId = Number(c.contactID || c.id);
      if (cId && !allAvailableContactsMap.has(cId)) {
        allAvailableContactsMap.set(cId, c);
      }
    });

    let contactIdx = 0;
    allAvailableContactsMap.forEach((c, cId) => {
      const isRep = repSelectedIDs.has(cId);
      const isBill = billSelectedIDs.has(cId);
      const isSelected = isRep || isBill;

      formData.append(`contacts[${contactIdx}].id`, '0');
      formData.append(`contacts[${contactIdx}].selected`, String(isSelected));
      formData.append(`contacts[${contactIdx}].contactID`, String(cId));
      formData.append(`contacts[${contactIdx}].name`, c.name || '');
      formData.append(`contacts[${contactIdx}].mobileNo`, c.mobileNo || '');
      formData.append(`contacts[${contactIdx}].emailId`, c.emailId || '');
      formData.append(`contacts[${contactIdx}].sendBill`, String(isBill));
      formData.append(`contacts[${contactIdx}].sendReport`, String(isRep));
      contactIdx++;
    });

    // Reporting & Billing
    const firstRepCard = value.reportingToCustomers?.[0] || value.reportingTo || {};
    const firstBillCard = value.billingToCustomers?.[0] || value.billingTo || {};

    const populateAddressSection = (sec: any, sectionName: 'ReportingTo' | 'BillingTo') => {
      const fieldMapping: Record<string, string> = {
        'id': 'Id',
        'customerID': 'CustomerID',
        'contactPersonID': 'ContactPersonID',
        'contactPersonName': 'ContactPersonName',
        'address': 'Address',
        'pinCode': 'PinCode',
        'area': 'Area',
        'city': 'City',
        'state': 'State',
        'country': 'Country',
        'mobileNo': 'MobileNo',
        'emailId': 'EmailId',
        'type': 'Type'
      };
      Object.keys(sec).forEach(k => {
        const val = sec[k];
        if (val !== undefined && val !== null && k !== 'selectedContactIDs') {
          const pascalKey = fieldMapping[k] || k.charAt(0).toUpperCase() + k.slice(1);
          formData.append(`${sectionName}.${pascalKey}`, String(val));
        }
      });
      // Ensure all address string and numeric properties exist so backend DTO model binding does not fail
      ['ContactPersonName', 'Address', 'PinCode', 'Area', 'City', 'State', 'Country', 'MobileNo', 'EmailId'].forEach(pascalKey => {
        if (!formData.has(`${sectionName}.${pascalKey}`)) {
          formData.append(`${sectionName}.${pascalKey}`, '');
        }
      });
      if (!formData.has(`${sectionName}.ContactPersonID`)) {
        formData.append(`${sectionName}.ContactPersonID`, '0');
      }
    };

    populateAddressSection(firstRepCard, 'ReportingTo');
    populateAddressSection(firstBillCard, 'BillingTo');

    // Sample details
    value.sampleDetails?.forEach((s: any, i: number) => {
      formData.append(`sampleDetails[${i}].id`, '0');
      formData.append(`sampleDetails[${i}].sampleNo`, s.sampleNo || '');
      formData.append(`sampleDetails[${i}].details`, s.details || '');
      formData.append(`sampleDetails[${i}].metalClassificationID`, s.metalClassificationID || '');
      formData.append(`sampleDetails[${i}].productConditionID`, s.productConditionID || '');
      formData.append(`sampleDetails[${i}].specimenOrientationID`, s.specimenOrientationID || '');
      formData.append(`sampleDetails[${i}].productFormID`, s.productFormID || '');
      formData.append(`sampleDetails[${i}].remarks`, s.remarks || '');
      formData.append(`sampleDetails[${i}].quantity`, String(s.quantity || '0'));
      formData.append(`sampleDetails[${i}].thickness`, s.thickness != null ? String(s.thickness) : '');
      formData.append(`sampleDetails[${i}].diameter`, s.diameter != null ? String(s.diameter) : '');
      formData.append(`sampleDetails[${i}].width`, s.width != null ? String(s.width) : '');
      formData.append(`sampleDetails[${i}].length`, s.length != null ? String(s.length) : '');
      formData.append(`sampleDetails[${i}].fileName`, s.fileName || '');
      formData.append(`sampleDetails[${i}].sampleFilePath`, s.sampleFilePath || '');
      if (s.file instanceof File) {
        formData.append(`sampleDetails[${i}].file`, s.file);
      }
    });

    // BUFFER additional details client-side
    const bufferedAdditionalDetails = value.sampleAdditionalDetails || [];

    // Sample additional details – ONLY send if samples exist
    let addIndex = 0;
    if (Array.isArray(value.sampleAdditionalDetails) && this.sampleNumbers.length > 0) {
      value.sampleAdditionalDetails.forEach((row: any) => {
        const label = row.label || '';
        const valuesArray = Array.isArray(row.values) ? row.values : [];
        for (let sampleIdx = 0; sampleIdx < Math.max(valuesArray.length, this.sampleNumbers.length); sampleIdx++) {
          const val = valuesArray[sampleIdx] ?? '';
          const sampleNo = this.sampleNumbers[sampleIdx] || '';
          formData.append(`SampleAdditionalDetails[${addIndex}].SampleNo`, sampleNo);
          formData.append(`SampleAdditionalDetails[${addIndex}].Label`, label);
          formData.append(`SampleAdditionalDetails[${addIndex}].Value`, val ?? '');
          addIndex++;
        }
      });
    } else if (Array.isArray(value.sampleAdditionalDetails) && this.sampleNumbers.length === 0) {
      // WARN user: additional details will not be saved
      this.toastService.show('⚠️ Please add at least one sample before saving additional details.', 'warning');
      return; // Prevent save
    }

    const isNew = !(value.id && value.id > 0);
    const request$ = isNew
      ? this.inwardService.createSampleInward(formData)
      : this.inwardService.updateSampleInward(formData);

    request$.subscribe({
      next: (response: any) => {
        this.saved = true;
        this.toastService.show('Sample Inward saved successfully!', 'success');
        // Show credit limit warning (advisory — inward is already saved)
        if (response?.creditWarning) {
          this.toastService.show(response.creditWarning, 'warning');
        }
        if (isNew && response?.id) {
          // Navigate to edit mode so Plan tab becomes visible
          this.router.navigate(['/sample/inward/edit', response.id], { state: { mode: 'edit' } });
        } else {
          // Already in edit mode, reload to refresh data
          this.sampleId = value.id;
          this.planLastSampleCount = 0; // force plan tab to reload after next save
          this.fetchSampleInwardDetails(this.sampleId);
          this.sampleInwardForm.markAsPristine();
        }
      },
      error: (err) => {
        console.error('Error saving sample inward:', err);
        this.toastService.show('Error saving sample inward. Please try again.', 'error');
      }
    });

    // In onSubmit(), BEFORE sending:
    const now = new Date();
    formData.append('collectionTime', this.getCurrentTime());
    formData.append('collectionDate', now.toISOString().split('T')[0]);
  }

  savePaymentInfo(): void {
    if (!this.sampleId) {
      this.toastService.show('Please save the inward first before updating payment info.', 'warning');
      return;
    }
    const v = this.sampleInwardForm.getRawValue();
    const payload = {
      purchaseOrderId: v.purchaseOrderId || null,
      advancePayment: v.advancePayment || 0,
      billRequired: v.billRequired ?? true,
      advancePIRequired: v.advancePIRequired ?? false,
      holdTestingUntilPIApproved: v.holdTestingUntilPIApproved ?? false,
    };
    this.inwardService.updatePaymentInfo(this.sampleId, payload).subscribe({
      next: (res) => {
        this.sampleInwardForm.patchValue({
          purchaseOrderId: res.purchaseOrderId ?? null,
          advancePayment: res.advancePayment,
          billRequired: res.billRequired,
          advancePIRequired: res.advancePIRequired,
          holdTestingUntilPIApproved: res.holdTestingUntilPIApproved,
        });
        this.sampleInwardForm.markAsPristine();
        this.toastService.show('Payment info saved successfully.', 'success');
      },
      error: () => this.toastService.show('Failed to save payment info. Please try again.', 'error'),
    });
  }

  goToSampleTab(): void {
    const tabBtn = document.getElementById('sample-tab') as HTMLElement | null;
    if (tabBtn) {
      tabBtn.click();
    }
  }

  onCancel(): void {
    this.sampleInwardForm.reset();
    this.router.navigate(['/sample/inward']);
  }

  printJobCard(): void {
    window.print();
  }

  getJobCardAdditionalDetails(sampleIdx: number): { label: string; value: string }[] {
    const result: { label: string; value: string }[] = [];
    (this.sampleAdditionalDetails as FormArray).controls.forEach(row => {
      const label = row.get('label')?.value;
      const valuesArray = row.get('values') as FormArray;
      const value = valuesArray.at(sampleIdx)?.value;
      if (label && value) result.push({ label, value });
    });
    return result;
  }

  // Custom method to check if inward is completed
  isInwardCompleted(inward: any): boolean {
    return inward.status === InwardStatus.COMPLETED;
  }


  private generateSampleNumber(counter: number): string {
    return `${this.yearCode}-${counter.toString().padStart(6, '0')}`;
  }

  private manageSampleNumber(
    action: 'init' | 'add' | 'remove',
    removeIndex?: number,
    sampleNo?: string
  ): string {

    // INIT → rebinding / edit / API load
    if (action === 'init') {
      // if sampleNo is provided, ensure it exists in list
      if (sampleNo && !this.sampleNumbers.includes(sampleNo)) {
        this.sampleNumbers.push(sampleNo);
      }

      if (!this.sampleNumbers.length) {
        this.lastSampleNumber = 0;
        this.sampleNumber = '';
        return '';
      }

      const maxCounter = Math.max(
        ...this.sampleNumbers.map(sn => Number(sn.split('-')[1]))
      );

      this.lastSampleNumber = maxCounter;
      this.sampleNumber = this.generateSampleNumber(maxCounter);
      return this.sampleNumber;
    }

    // ADD → new sample (increment by 1)
    if (action === 'add') {
      this.lastSampleNumber += 1;
      const newSampleNo = this.generateSampleNumber(this.lastSampleNumber);
      this.sampleNumbers.push(newSampleNo);
      this.sampleNumber = newSampleNo;
      return newSampleNo;
    }

    // REMOVE → existing sample (recalculate from remaining)
    if (action === 'remove' && typeof removeIndex === 'number') {
      // Remove from sampleNumbers array
      if (removeIndex >= 0 && removeIndex < this.sampleNumbers.length) {
        this.sampleNumbers.splice(removeIndex, 1);
      }

      // Recalculate lastSampleNumber from remaining samples
      if (this.sampleNumbers.length === 0) {
        this.lastSampleNumber = 0;
        this.sampleNumber = '';
        return '';
      }

      const maxCounter = Math.max(
        ...this.sampleNumbers.map(sn => Number(sn.split('-')[1]))
      );

      this.lastSampleNumber = maxCounter;
      this.sampleNumber = this.generateSampleNumber(maxCounter);
      return this.sampleNumber;
    }

    return this.sampleNumber;
  }


  trackByIndex(index: number) {
    return index;
  }


  canDeactivate(): Observable<boolean> | boolean {
    if (!this.sampleInwardForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.sampleInwardForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}

