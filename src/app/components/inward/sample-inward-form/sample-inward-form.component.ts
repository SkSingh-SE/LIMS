import { CommonModule } from '@angular/common';
import { Component, OnInit , HostListener } from '@angular/core';
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
import { SampleStatus } from '../../../utility/status_flow/enums/sample-status.enum';
import { InwardStatus } from '../../../utility/status_flow/enums/inward-status.enum';
import { PlanFormComponent } from '../../plan/plan-form/plan-form.component';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';

@Component({
  selector: 'app-sample-inward-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, PlanFormComponent],
  templateUrl: './sample-inward-form.component.html',
  styleUrl: './sample-inward-form.component.css'
})
export class SampleInwardFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  // Constants
  caseNumber: string = 'DMSPL-000001';
  yearCode: string = new Date().getFullYear().toString().slice(-2);
  sampleNumber: string = '25-000001';
  lastSampleNumber: number = +this.sampleNumber.split('-')[1];
  readonly witnessList: string[] = ['Witness A', 'Witness B', 'Witness C', 'Witness D'];
  readonly descriptionOptions = ['Heat No', 'Batch No', 'Lot No', 'Identification', 'Sealed By', 'Witness By', 'Stamp By'];
  readonly testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];

  // Data
  contactPersons: any[] = [];
  billingToContactPerson: any[] = [];
  reportingToContactPerson: any[] = [];
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
    private unsavedChangesService: UnsavedChangesService,
    private customerPOService: CustomerPOService,
    private accountService: AccountService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.sampleId = Number(params.get('id'));
    });

    const state = history.state as { mode?: string };
    if (state?.mode === 'view') {
      this.isViewMode = true;
    } else if (state?.mode === 'edit') {
      this.isEditMode = true;
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
      gstNo: ['', Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)],
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
      requestFilePath: [''],
      requestFileName: [''],
      file: [null],
      contacts: this.fb.array([]),
      reportingTo: this.fb.group({
        id: [0],
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
        this.lastSampleNumber = +this.sampleNumber.split('-')[1];
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
        // PO is available for any customer type — check if customer has active POs
        this.selectedPODetails = null;
        this.sampleInwardForm.patchValue({ purchaseOrderId: null });
        this.checkCustomerHasPOs(data.id);

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
          returnSample: this.customerData.sampleReturn || false,
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

          if (Array.isArray(this.customerData?.contactPersons)) {
            const defaultSelected = this.sampleId === 0;

            this.customerData.contactPersons.forEach((contact: any) => {
              contact.contactID = contact.id;
              this.addContact(contact, defaultSelected);
              this.contactPersons.push(contact);
            });

            this.updateContactLists();
          }
        } else {
          // Edit mode: just update the contactPersons list for dropdowns
          this.contactPersons = this.customerData?.contactPersons?.map((c: any) => ({ ...c, contactID: c.id })) || [];
          this.updateContactLists();
        }

        // Update billing/reporting address helpers
        if (this.billingToContactPerson.length > 0) {
          this.updateAddressHelper(this.billingToContactPerson[0], 'billingTo');
        }
        if (this.reportingToContactPerson.length > 0) {
          this.updateAddressHelper(this.reportingToContactPerson[0], 'reportingTo');
        }
      },
      error: (error) => console.error('Error fetching customer details:', error)
    });
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
              this.checkCustomerHasPOs(customer.id);

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

            // Store current status for Plan tab control
            this.currentInwardStatus = data.status || '';

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
              requestFileName: data.requestFileName,
              requestFilePath: data.requestFilePath,
              uploadReferenceId: data.uploadReferenceID,
              status: data.status,
              collectionTime: data.collectionTime || this.getCurrentTime()
            });

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

            // Override Reporting To & Billing To
            if (data.reportingTo) {
              this.sampleInwardForm.get('reportingTo')?.patchValue(data.reportingTo);
            }
            if (data.billingTo) {
              this.sampleInwardForm.get('billingTo')?.patchValue(data.billingTo);
            }

            // Override Samples + Additional Details
            this.sampleDetails.clear();
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

            });
            // Disable form if not in SAMPLE_INWARD_REGISTERED status
            if (data?.status !== InwardStatus.INWARD_REGISTERED && data?.status !== SampleStatus.INWARD_COMPLETED) {
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
  onAddressCustomerChange(section: 'reportingTo' | 'billingTo', event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedValue = +target.value;
    const selectedCustomer = this.contactPersons.find(c => c.contactID === selectedValue);
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

    // Reset billingTo if sendBill is unchecked and this contact was selected
    if (!contact.sendBill && this.billingTo.get('contactPersonID')?.value === contact.contactID) {
      this.billingTo.reset();
    }
  }

  onSendReportChange(index: number): void {
    if (this.isViewMode) return;

    const contact = this.contactControls.at(index).value;

    // Update contact lists based on selected, sendBill, and sendReport
    this.updateContactLists();

    // Reset reportingTo if sendReport is unchecked and this contact was selected
    if (!contact.sendReport && this.reportingTo.get('contactPersonID')?.value === contact.contactID) {
      this.reportingTo.reset();
    }
  }

  onContactSelectedChange(index: number): void {
    if (this.isViewMode) return;

    const contact = this.contactControls.at(index).value;

    // Update contact lists based on selected, sendBill, and sendReport
    this.updateContactLists();

    // Reset billingTo/reportingTo if contact is deselected and was currently selected
    if (!contact.selected) {
      if (this.billingTo.get('contactPersonID')?.value === contact.contactID) {
        this.billingTo.reset();
      }
      if (this.reportingTo.get('contactPersonID')?.value === contact.contactID) {
        this.reportingTo.reset();
      }
    }
  }

  onCustomerSelect(item: any): void {
    if (!item) {
      this.sampleInwardForm.patchValue({ customerID: null });
      return;
    }
    this.sampleInwardForm.patchValue({
      customerID: item.id
    });
    this.getCustomerDetails(item.id);
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
  addContact(contact: any, selected: boolean = false): void {
    this.contactControls.push(this.fb.group({
      id: [contact.id || 0],
      selected: [selected],
      contactID: [contact.id || 0],
      name: [contact?.name || ''],
      mobileNo: [contact?.mobileNo || ''],
      emailId: [contact?.emailId || ''],
      sendBill: [contact?.sendBill || false],
      sendReport: [contact?.sendReport || false]
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
      thickness: [existingSample?.thickness || null],
      diameter: [existingSample?.diameter || null],
      width: [existingSample?.width || null],
      length: [existingSample?.length || null]
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


  removeSample(index: number): void {
    if (this.isViewMode) return;

    const removedSampleNo = this.sampleDetails.at(index).get('sampleNo')?.value;

    this.sampleDetails.removeAt(index);
    this.manageSampleNumber('remove', index);

    // Remove from buffered additional details if exists
    if (removedSampleNo && this.bufferedAdditionalDetails[removedSampleNo]) {
      delete this.bufferedAdditionalDetails[removedSampleNo];
    }

    this.sampleAdditionalDetails.controls.forEach(row => {
      const valuesArray = row.get('values') as FormArray;
      valuesArray.removeAt(index);
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

  getSpecimenOrientationDrop = (sampleIndex: number) => {
    return (term: string, page: number, pageSize: number): Observable<any[]> => {
      const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
      const metalClassificationID = sampleDetailGroup?.get('metalClassificationID')?.value;
      if (metalClassificationID) {
        return this.specimenOrientationService.getByClassification(metalClassificationID, term, page, pageSize);
      }
      return this.specimenOrientationService.getSpecimenOrientationDropdown(term, page, pageSize);
    };
  };

  onSpecimenOrientationSelected(item: any, sampleIndex: number): void {
    const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
    sampleDetailGroup.patchValue({
      specimenOrientationID: item?.id || null,
      specimenOrientationName: item?.name || '',
    });
  }

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
      gstNo: value.gstNo,
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

    // Contacts
    value.contacts?.forEach((c: any, i: number) => {
      formData.append(`contacts[${i}].id`, '0');
      formData.append(`contacts[${i}].selected`, String(c.selected));
      formData.append(`contacts[${i}].contactID`, String(c.contactID));
      formData.append(`contacts[${i}].name`, c.name || '');
      formData.append(`contacts[${i}].mobileNo`, c.mobileNo || '');
      formData.append(`contacts[${i}].emailId`, c.emailId || '');
      formData.append(`contacts[${i}].sendBill`, String(c.sendBill));
      formData.append(`contacts[${i}].sendReport`, String(c.sendReport));
    });

    // Reporting & Billing
    ['reportingTo', 'billingTo'].forEach(section => {
      const sec = value[section] || {};
      // Map camelCase to PascalCase for backend
      const fieldMapping: Record<string, string> = {
        'id': 'Id',
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
        if (val !== undefined && val !== null) {
          const pascalKey = fieldMapping[k] || k.charAt(0).toUpperCase() + k.slice(1);
          const sectionName = section === 'reportingTo' ? 'ReportingTo' : 'BillingTo';
          formData.append(`${sectionName}.${pascalKey}`, String(val));
        }
      });
    });

    // Sample details
    value.sampleDetails?.forEach((s: any, i: number) => {
      formData.append(`sampleDetails[${i}].id`, '0');
      formData.append(`sampleDetails[${i}].sampleNo`, s.sampleNo || '');
      formData.append(`sampleDetails[${i}].details`, s.details || '');
      formData.append(`sampleDetails[${i}].metalClassificationID`, s.metalClassificationID || '');
      formData.append(`sampleDetails[${i}].productConditionID`, s.productConditionID || '');
      formData.append(`sampleDetails[${i}].specimenOrientationID`, s.specimenOrientationID || '');
      formData.append(`sampleDetails[${i}].remarks`, s.remarks || '');
      formData.append(`sampleDetails[${i}].quantity`, String(s.quantity || '0'));
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

