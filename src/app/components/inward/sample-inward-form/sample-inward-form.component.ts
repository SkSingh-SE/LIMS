import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from "../../../utility/components/searchable-dropdown/searchable-dropdown.component";
import { Observable } from 'rxjs';
import { CustomerService } from '../../../services/customer.service';
import { DispatchModeService } from '../../../services/dispatch-mode.service';
import { EmployeeService } from '../../../services/employee.service';
import { AreaService } from '../../../services/area.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { MetalClassificationService } from '../../../services/metal-classification.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PlanFormComponent } from '../../plan/plan-form/plan-form.component';
import { ProductConditionService } from '../../../services/product-condition.service';


@Component({
  selector: 'app-sample-inward-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, RouterLink, PlanFormComponent],
  templateUrl: './sample-inward-form.component.html',
  styleUrl: './sample-inward-form.component.css'
})
export class SampleInwardFormComponent implements OnInit {
  // ────────────── Constants & Data ──────────────
  caseNumber: string = 'DMSPL-000001';
  yearCode: string = new Date().getFullYear().toString().slice(-2);
  sampleNumber: string = '25-000001';
  lastSampleNumber: number = +this.sampleNumber.split('-')[1]; // fetched from DB
  readonly witnessList: string[] = ['Witness A', 'Witness B', 'Witness C', 'Witness D'];
  readonly descriptionOptions = ['Heat No', 'Batch No', 'Lot No', 'Identification', 'Sealed By', 'Witness By', 'Stamp By'];

  contactPersons: any[] = [];
  billingToContactPerson: any[] = [];
  reportingToContactPerson: any[] = [];
  testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];
  dispatchModes: any[] = [];
  selectedDispatchModes: number[] = [];

  // ────────────── State ──────────────
  sampleInwardForm!: FormGroup;
  sampleNumbers: string[] = [];
  globalTestCounter = 1;
  uploadedFile: File | null = null;
  customerData: any = null;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  sampleId: number = 0;


  constructor(private fb: FormBuilder, private customerService: CustomerService, private dispatchModeService: DispatchModeService, private areaService: AreaService, private materialSpecificationService: MaterialSpecificationService,
    private laboratoryTestService: LaboratoryTestService,
    private metalService: MetalClassificationService,
    private testMethodSpecificationService: TestMethodSpecificationService,
    private parameterService: ParameterService,
    private toastService: ToastService,
    private inwardService: SampleInwardService,
    private route: ActivatedRoute,
    private router: Router,
    private prodCondService: ProductConditionService
  ) { }

  // ────────────── Lifecycle ──────────────
  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.sampleId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };

    if (state) {
      if (state.mode === 'view') {
        this.isViewMode = true;
      }
      if (state.mode === 'edit') {
        this.isEditMode = true;
      }
    }

    this.initForm();
    // this.addSample();
    // this.addAdditionalSampleRow('Heat No');

    this.fetchDispatchModeDropdown();
    if (this.sampleId > 0) {
      this.fetchSampleInwardDetails(this.sampleId);
    } else {
      this.getCaseNumber();
    }
  }

  // ────────────── Form Initialization ──────────────
  private initForm(): void {
    this.sampleInwardForm = this.fb.group({
      id: [0],
      caseNo: [''],
      customerID: ['', Validators.required],
      address: [''],
      area: [''],
      state: [''],
      city: [''],
      pinCode: [''],
      country: ['India'],
      gstNo: [''],
      dispatchModes: this.fb.array([], Validators.required),
      poNumber: [''],
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
      file: [File],
      contacts: this.fb.array([]),
      reportingTo: this.fb.group({
        id: [0],
        contactPersonID: [''],
        contactPersonName: ['1'],
        address: [''],
        pinCode: [''],
        area: [''],
        city: [''],
        state: [''],
        country: [''],
        type: ['reporting']
      }),
      billingTo: this.fb.group({
        id: [0],
        contactPersonID: [''],
        contactPersonName: [''],
        address: [''],
        pinCode: [''],
        area: [''],
        city: [''],
        state: [''],
        country: [''],
        type: ['billing']
      }),
      sampleDetails: this.fb.array([]),
      sampleAdditionalDetails: this.fb.array([]),
      sampleTestPlans: this.fb.array([]),

    });
  }

  get dispatchModesArray(): FormArray {
    return this.sampleInwardForm.get('dispatchModes') as FormArray;
  }
  get reportingTo(): FormGroup {
    return this.sampleInwardForm.get('reportingTo') as FormGroup;
  }
  get billingTo(): FormGroup {
    return this.sampleInwardForm.get('billingTo') as FormGroup;
  }
  // ────────────── Utility Helpers ──────────────
  getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }


  // ────────────── API Calls ──────────────

  getCaseNumber(): void {
    this.inwardService.getCaseNumber().subscribe({
      next: (data) => {
        this.caseNumber = data.caseNo || 'DMSPL-000001';
        this.sampleNumber = data.sampleNo;
        this.lastSampleNumber = +this.sampleNumber.split('-')[1];
      },
      error: (error) => {
        console.error('Error fetching case number:', error);
      }
    });
  }
  getCustomers = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.customerService.getCustomerDropdown(term, page, pageSize);
  };
  getCustomerDetails(id: number): void {
    this.customerService.getCustomerById(id).subscribe({
      next: (data) => {
        if (!data) return;

        this.customerData = data;
        this.sampleInwardForm.patchValue({
          caseNo: this.caseNumber,
          contactPersonName: this.customerData.name,
          address: this.customerData.address,
          pinCode: this.customerData.pinCode,
        });
        this.dispatchModesArray.clear();
        this.selectedDispatchModes = [];
        // If customer has dispatchModes, set them
        if (Array.isArray(this.customerData.customerDispatchModes)) {
          this.customerData.customerDispatchModes.forEach((mode: any) => {
            this.dispatchModesArray.push(this.createDispatch({ dispatchModeID: mode.dispatchModeID || mode.id }));
            this.selectedDispatchModes.push(mode.dispatchModeID || mode.id);
          });
        }
        this.fetchArea(this.customerData?.areaID, this.sampleInwardForm);
        this.contactControls.clear();
        this.contactPersons = [];
        this.billingToContactPerson = [];
        this.reportingToContactPerson = [];
        if (Array.isArray(this.customerData?.contactPersons)) {
          this.customerData.contactPersons.forEach((contact: any) => {
            contact.contactID = contact.id;

            this.addContact(contact);
            if (contact.sendBill) this.billingToContactPerson.push(contact);
            if (contact.sendReport) this.reportingToContactPerson.push(contact);
            this.contactPersons.push(contact);
          });
          this.updateAddressHelper(this.billingToContactPerson[0], 'billingTo');
          this.updateAddressHelper(this.reportingToContactPerson[0], 'reportingTo');
        }
      },
      error: (error) => {
        console.error(error);
      }
    })
  }
  fetchDispatchModeDropdown(): void {
    this.dispatchModeService.getDispatchModeDropdown('', 0, 100).subscribe({
      next: resp => {
        this.dispatchModes = resp;

      },
      error: err => {
        console.error('Error fetching dispatch modes', err);
      }
    });
  }

  fetchSampleInwardDetails(sampleId: number): void {
    this.inwardService.getSampleInwardById(sampleId).subscribe({
      next: (data) => {
        if (!data) return;

        // Step 1: Call Customer Details API
        this.customerService.getCustomerById(data.customerID).subscribe({
          next: (customer) => {
            if (customer) {
              // Load customer details first
              this.customerData = customer;
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

              // Fill Area/City/State info
              this.fetchArea(customer?.areaID, this.sampleInwardForm);
            }

            // Step 2: Override with Inward Data
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

            // Override DispatchModes
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
                    selected: c.selected,
                    contactID: c.contactID,
                    name: c.name,
                    mobileNo: c.mobileNo,
                    emailId: c.emailId,
                    sendBill: c.sendBill,
                    sendReport: c.sendReport,
                    inwardID: c.inwardID
                  })
                );
                if (c.sendBill) this.billingToContactPerson.push(c);
                if (c.sendReport) this.reportingToContactPerson.push(c);
              });
            }

            // Override ReportingTo & BillingTo
            if (data.reportingTo) {
              this.sampleInwardForm.get('reportingTo')?.patchValue(data.reportingTo);
            }
            if (data.billingTo) {
              this.sampleInwardForm.get('billingTo')?.patchValue(data.billingTo);
            }

            // Samples + Additional Details
            this.sampleDetails.clear();
            this.sampleNumbers = [];
            data.sampleDetails?.forEach((sd: any) => {
              const additionalSampleDetail = data.sampleAdditionalDetails?.filter(
                (x: any) => x.sampleNo === sd.sampleNo
              ) || [];

              const normalizedSample = {
                ...sd,
                additionalDetails: additionalSampleDetail,
                testPlans: sd.testPlans || []
              };

              this.addSample(normalizedSample);
            });

          },
          error: (err) => console.error('Error fetching customer details:', err)
        });
      },
      error: (err) => console.error('Error fetching sample inward details:', err)
    });
  }

  /* ===== Area / Location ===== */
  fetchArea(areaId: number, targetGroup: FormGroup): void {
    this.areaService.getAreaById(areaId).subscribe({
      next: (resp) => {
        targetGroup.patchValue({
          area: resp.name,
          city: resp.city?.name,
          state: resp.city?.state?.name,
          country: resp.city?.state?.country?.name
        });

        // Only if GST is relevant to this form group (e.g., for main customer)
        if (targetGroup === this.sampleInwardForm) {
          targetGroup.patchValue({ gstNo: this.customerData?.gstNo });
        }
      },
      error: (error) => {
        console.error('Error fetching area:', error);
      }
    });
  }

  // ────────────── Event Handlers ──────────────

  onAddressCustomerChange(section: 'reportingTo' | 'billingTo', event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedValue = +target.value;
    const selectedCustomer = this.contactPersons.find(c => c.contactID === selectedValue);
    this.updateAddressHelper(selectedCustomer, section);
  }

  updateAddressHelper(selectedCustomer: any, section: 'reportingTo' | 'billingTo'): void {
    if (!selectedCustomer) return;
    const patch = {
      contactPersonID: selectedCustomer?.id || '',
      contactPersonName: selectedCustomer?.name || '',
      address: selectedCustomer?.address || '',
      pinCode: selectedCustomer?.pinCode || '',
      area: selectedCustomer?.area || '',
      city: selectedCustomer?.city || '',
      state: selectedCustomer?.state || '',
      country: selectedCustomer?.country || 'India'
    };
    if (section === 'reportingTo') {
      this.reportingTo.patchValue(patch);
      this.fetchArea(selectedCustomer?.areaID, this.reportingTo);
    } else {
      this.billingTo.patchValue(patch);
      this.fetchArea(selectedCustomer?.areaID, this.billingTo);
    }
  }
  onSendBillChange(index: number): void {
    const contact = this.contactControls.at(index).value;

    if (contact.sendBill) {
      // Add if not already present
      if (!this.billingToContactPerson.some(c => c.id === contact.contactID)) {
        this.billingToContactPerson.push(contact);
      }
    } else {
      // Remove if unchecked
      this.billingToContactPerson = this.billingToContactPerson.filter(c => c.id !== contact.id);
      this.billingTo.reset(); // Reset billingTo if no contacts left
    }
  }

  onSendReportChange(index: number): void {
    const contact = this.contactControls.at(index).value;

    if (contact.sendReport) {
      if (!this.reportingToContactPerson.some(c => c.id === contact.contactID)) {
        this.reportingToContactPerson.push(contact);
      }
    } else {
      this.reportingToContactPerson = this.reportingToContactPerson.filter(c => c.id !== contact.id);
    }
  }

  onCustomerSelect(item: any): void {
    this.sampleInwardForm.patchValue({
      customerID: item.id
    });
    if (this.sampleId == 0) {
      this.getCustomerDetails(item.id);
    }
  }

  isDispatchModeSelected(id: number): boolean {
    return this.selectedDispatchModes?.includes(id)
  }
  onDispatchModeToggle(event: Event) {
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
  // ────────────── Contact Helpers ──────────────
  get contactControls(): FormArray {
    return this.sampleInwardForm.get('contacts') as FormArray;
  }
  addContact(contact: any): void {
    this.contactControls.push(this.fb.group({
      id: [contact.id || 0],
      selected: [false],
      contactID: [contact.id || 0],
      name: [contact?.name || ''],
      mobileNo: [contact?.mobileNo || ''],
      emailId: [contact?.emailId || ''],
      sendBill: [contact?.sendBill || false],
      sendReport: [contact?.sendReport || false]
    }));
  }


  // ────────────── Sample Helpers ──────────────
  get sampleDetails(): FormArray {
    return this.sampleInwardForm.get('sampleDetails') as FormArray;
  }
  get sampleAdditionalDetails(): FormArray {
    return this.sampleInwardForm.get('sampleAdditionalDetails') as FormArray;
  }
  addSample(existingSample: any = null): void {
    const sampleNo = existingSample?.sampleNo ||
      `${this.yearCode}-${(this.lastSampleNumber + this.sampleDetails.length).toString().padStart(6, '0')}`;

    this.sampleNumbers.push(sampleNo);
    this.sampleNumber = sampleNo;

    // --- Sample details
    this.sampleDetails.push(this.fb.group({
      id: [existingSample?.id || 0],
      sampleNo: [sampleNo],
      details: [existingSample?.details || '', Validators.required],
      metalClassificationID: [existingSample?.metalClassificationID || ''],
      productConditionID: [existingSample?.productConditionID || ''],
      remarks: [existingSample?.remarks || ''],
      quantity: [existingSample?.quantity || 1],
      fileName: [existingSample?.fileName || ''],
      sampleFilePath: [existingSample?.sampleFilePath || ''],
      file: [null] // placeholder for new upload
    }));

    // --- Additional sample detail values
    this.addAdditionalDetailsForSample(sampleNo, existingSample?.additionalDetails || []);


    // --- Test Plans
    if (existingSample?.testPlans?.length) {
      //  Rebind from DB
      this.sampleTestPlans.push(this.fb.group({
        sampleNo: [sampleNo],
        generalTests: this.fb.array(
          existingSample.testPlans
            .filter((p: any) => p.type === 'general')
            .map((gt: any) => this.fb.group({
              sampleNo: [sampleNo],
              specification1: [gt.specification1],
              specification2: [gt.specification2],
              parameter: [gt.parameter],
              methods: this.fb.array(
                gt.methods?.map((m: any) => this.fb.group({
                  testMethodID: [m.testMethodID],
                  standardID: [m.standardID],
                  quantity: [m.quantity],
                  reportNo: [m.reportNo],
                  ulrNo: [m.ulrNo],
                  cancel: [m.cancel || false]
                })) || []
              )
            }))
        ),
        chemicalTests: this.fb.array(
          existingSample.testPlans
            .filter((p: any) => p.type === 'chemical')
            .map((ct: any) => this.fb.group({
              sampleNo: [sampleNo],
              reportNo: [ct.reportNo],
              urlNo: [ct.urlNo],
              testTypes: this.fb.group(this.testTypeList.reduce((acc, t) => {
                acc[t] = this.fb.control(ct.testTypes?.[t] || false);
                return acc;
              }, {} as any)),
              metalClassificationID: [ct.metalClassificationID],
              specification1: [ct.specification1],
              specification2: [ct.specification2],
              testMethod: [ct.testMethod],
              elements: this.fb.array(
                ct.elements?.map((el: any) => this.fb.group({
                  parameterID: [el.parameterID],
                  selected: [el.selected]
                })) || []
              )
            }))
        )
      }));
    } else {
      //  Fresh dummy
      const generalTestGroup = this.createGeneralTestGroup();
      const generalReportNo = `${sampleNo}-${(generalTestGroup.get('methods') as FormArray).length + 1}`;
      const generalUrlNo = this.generateUrlNo(this.globalTestCounter);
      (generalTestGroup.get('methods') as FormArray).push(this.createTestMethodRow(generalReportNo, generalUrlNo));

      this.sampleTestPlans.push(this.fb.group({
        sampleNo: [sampleNo],
        generalTests: this.fb.array([generalTestGroup]),
        chemicalTests: this.fb.array([])
      }));

      this.globalTestCounter++;
    }
  }

  private addAdditionalDetailsForSample(sampleNo: string, additionalDetails: any[] = []): void {
    const formArray = this.sampleAdditionalDetails as FormArray;
    const existingLabels = formArray.controls.map((r) => r.get('label')?.value);

    // Handle all known labels (already in form)
    formArray.controls.forEach((row) => {
      const valuesArray = row.get('values') as FormArray;
      const label = row.get('label')?.value;
      const match = additionalDetails.find((x: any) => x.label === label);
      valuesArray.push(this.fb.control(match?.value ?? ''));
    });

    // Handle any new labels coming from DB
    additionalDetails
      .filter((ad: any) => !existingLabels.includes(ad.label))
      .forEach((ad: any) => {
        const valuesArray = this.fb.array([]);
        // Backfill blanks for previous samples
        for (let k = 0; k < this.sampleNumbers.length - 1; k++) {
          valuesArray.push(this.fb.control(''));
        }
        // Add current sample's value
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

    // Case: new sample with no additional details at all
    if (!additionalDetails.length && formArray.length > 0) {
      formArray.controls.forEach((row) => {
        const valuesArray = row.get('values') as FormArray;
        valuesArray.push(this.fb.control(''));
      });
    }
  }

  removeSample(index: number): void {
    this.sampleDetails.removeAt(index);
    this.sampleNumbers.splice(index, 1);

    // Remove corresponding values from additional details
    this.sampleAdditionalDetails.controls.forEach(row => {
      const valuesArray = row.get('values') as FormArray;
      valuesArray.removeAt(index);
    });

    // Remove its test plan only (don’t rebuild all!)
    this.sampleTestPlans.removeAt(index);
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
    // Trigger change detection to refresh disabled options in dropdowns
  }
  isOptionSelected(option: string, currentIndex: number): boolean {
    const selectedOptions = this.sampleAdditionalDetails.controls
      .map((group, index) => index !== currentIndex ? group.get('label')?.value : null)
      .filter(val => val !== null);
    return selectedOptions.includes(option);
  }

  // ────────────── Test Plan Helpers ──────────────
  get sampleTestPlans(): FormArray {
    return this.sampleInwardForm.get('sampleTestPlans') as FormArray;
  }
  getTestArray(i: number, type: 'generalTests' | 'chemicalTests'): FormArray {
    return this.sampleTestPlans.at(i).get(type) as FormArray;
  }
  getGeneralTestSection(i: number): FormGroup {
    return (this.sampleTestPlans.at(i).get('generalTests') as FormArray).at(0) as FormGroup;
  }
  getChemicalTestSection(i: number): FormGroup {
    return (this.sampleTestPlans.at(i).get('chemicalTests') as FormArray).at(0) as FormGroup;
  }
  getMethodRows(i: number): FormArray {
    const sectionArray = this.sampleTestPlans.at(i).get('generalTests') as FormArray;
    if (!sectionArray || sectionArray.length === 0) return this.fb.array([]);
    const section = sectionArray.at(0) as FormGroup;
    return section.get('methods') as FormArray;
  }
  addMethodRow(sampleIndex: number): void {
    const sampleNo = this.sampleTestPlans.at(sampleIndex).get('sampleNo')?.value;
    const reportNo = `${sampleNo}-${this.getMethodRows(sampleIndex).length + 1}`;
    const urlNo = this.generateUrlNo(this.globalTestCounter);
    this.getMethodRows(sampleIndex).push(this.createTestMethodRow(reportNo, urlNo));
    this.globalTestCounter++;
  }
  createTestMethodRow(reportNo: string, urlNo: string): FormGroup {
    return this.fb.group({
      testMethodID: [''],
      standardID: [''],
      quantity: ['1'],
      reportNo: [reportNo],
      ulrNo: [urlNo],
      cancel: [false]
    });
  }
  asFormGroup(ctrl: AbstractControl | null): FormGroup {
    return ctrl as FormGroup;
  }
  getAdditionalSampleValue(row: AbstractControl, sampleIndex: number): string {
    const valuesArray = row.get('values') as FormArray;
    return valuesArray?.at(sampleIndex)?.value || '-';
  }
  addTestBlock(i: number, type: 'generalTests' | 'chemicalTests'): void {
    const array = this.getTestArray(i, type);
    const sampleNo = +this.sampleNumbers[i].split('-')[1];
    const reportN = this.getTestArray(i, 'chemicalTests').length + this.getMethodRows(i).length;
    const chemicalReportNo = `${this.yearCode}-${sampleNo}-${reportN.toString().padStart(6, '0')}`;
    const chemicalUrlNo = this.generateUrlNo(this.globalTestCounter);
    switch (type) {
      case 'generalTests':
        array.push(this.createGeneralTestGroup());
        break;
      case 'chemicalTests':
        array.push(this.createChemicalTestGroup(chemicalReportNo, chemicalUrlNo));
        break;
    }
    this.globalTestCounter++;
  }
  createGeneralTestGroup(): FormGroup {
    return this.fb.group({
      sampleNo: [''],
      specification1: [''],
      specification2: [''],
      parameter: [''],
      methods: this.fb.array([])
    });
  }
  createChemicalTestGroup(reportNo: string, urlNo: string): FormGroup {
    const testTypesGroup: { [key: string]: FormControl } = {};
    this.testTypeList.forEach(type => {
      testTypesGroup[type] = this.fb.control(false);
    });
    return this.fb.group({
      sampleNo: [''],
      reportNo: [reportNo || ''],
      urlNo: [urlNo || ''],
      testTypes: this.fb.group(testTypesGroup),
      metalClassificationID: [''],
      specification1: [''],
      specification2: [''],
      testMethod: [''],
      elements: this.fb.array([])
    });
  }
  getElementRows(i: number): FormArray {
    return this.getTestArray(i, 'chemicalTests').at(0).get('elements') as FormArray;
  }
  addElementRow(i: number): void {
    this.getElementRows(i).push(this.fb.group({
      parameterID: [''],
      selected: [false]
    }));
  }
  removeElementRow(i: number, j: number): void {
    this.getElementRows(i).removeAt(j);
  }

  // ────────────── API Calls ──────────────

  getMaterialSpecificationGrade = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.materialSpecificationService.getMaterialSpecificationGradeDropdown(term, page, pageSize);
  };
  getLaboratoryTest = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.laboratoryTestService.getLaboratoryTestDropdown(term, page, pageSize);
  };
  getMetalClassification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.metalService.getMetalClassificationDropdown(term, page, pageSize);
  };
  getTestMethodSpecification = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.testMethodSpecificationService.getTestMethodSpecificationDropdown(term, page, pageSize);
  };
  getChemicalParameter = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.parameterService.getChemicalParameterDropdown(term, page, pageSize);
  };

  getProductConditions = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.prodCondService.getProductConditionDropdown(term, page, pageSize);
  };

  // Event handler for Material Specification selection
  onSpecificationGradeSelected(
    index: number,
    item: any,
    field: 'specification1' | 'specification2',
    testType: 'generalTests' | 'chemicalTests'
  ) {
    const section = testType === 'generalTests'
      ? this.getGeneralTestSection(index)
      : this.getChemicalTestSection(index);

    section.patchValue({ [field]: item.id });
  }


  onLaboratorySelected(item: any, sampleIndex: number, methodIndex: number) {
    this.getMethodRows(sampleIndex).at(methodIndex).patchValue({
      testMethodID: item.id,
    });
  }
  onMetalSelected(sampleIndex: number, item: any) {
    const chemicalTestGroup = this.getTestArray(sampleIndex, 'chemicalTests').at(0) as FormGroup;
    chemicalTestGroup.patchValue({
      metalClassificationID: item.id,
    });
  }
  onGeneralTestStandardSelected(item: any, sampleIndex: number, methodIndex: number) {
    this.getMethodRows(sampleIndex).at(methodIndex).patchValue({
      standardID: item.id,
    });
  }
  onChemicalStandardSelected(item: any, sampleIndex: number) {
    const chemicalTestGroup = this.getTestArray(sampleIndex, 'chemicalTests').at(0) as FormGroup;
    chemicalTestGroup.patchValue({
      standardID: item.id,
    });
  }
  onParameterSelected(item: any, sampleIndex: number, testIndex: number, index: number) {
    this.getElementRows(sampleIndex).at(index).patchValue({
      parameterID: item.id,
    });
  }

  // ───────── Dropdown sample details Handlers ──────────────
  onMetalClassificationSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
    sampleDetailGroup.patchValue({
      metalClassificationID: item.id,
    });
  }
  onProductConditionSelected(item: any, sampleIndex: number) {
    const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
    sampleDetailGroup.patchValue({
      productConditionID: item.id,
    });
  }

  // ────────────── File Handling ──────────────
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
      this.sampleDetails.at(index).patchValue({ fileName: file.name, file: file });
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
    this.sampleDetails.at(index).patchValue({ fileName: '', file: null });
  }


  // ────────────── Submission ──────────────
  onSubmit(includePlans: boolean = false): void {
    if (!this.sampleInwardForm.valid) {
      this.sampleInwardForm.markAllAsTouched();
      return;
    }

    const value = this.sampleInwardForm.value;
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
      poNumber: value.poNumber,
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
      Object.keys(sec).forEach(k => {
        formData.append(`${section}.${k}`, sec[k] ?? '');
      });
    });

    // Sample details
    value.sampleDetails?.forEach((s: any, i: number) => {
      formData.append(`sampleDetails[${i}].id`, '0');
      formData.append(`sampleDetails[${i}].sampleNo`, s.sampleNo || '');
      formData.append(`sampleDetails[${i}].details`, s.details || '');
      formData.append(`sampleDetails[${i}].metalClassificationID`, s.metalClassificationID || '');
      formData.append(`sampleDetails[${i}].productConditionID`, s.productConditionID || '');
      formData.append(`sampleDetails[${i}].remarks`, s.remarks || '');
      formData.append(`sampleDetails[${i}].quantity`, String(s.quantity || '0'));
      formData.append(`sampleDetails[${i}].fileName`, s.fileName || '');
      formData.append(`sampleDetails[${i}].sampleFilePath`, s.sampleFilePath || '');
      if (s.file instanceof File) {
        formData.append(`sampleDetails[${i}].file`, s.file);
      }
    });

    // Sample additional details (flatten values) - FIXED: backend expects flattened list with SampleNo & Value
    // Build entries like SampleAdditionalDetails[0].SampleNo, SampleAdditionalDetails[0].Label, SampleAdditionalDetails[0].Value
    let addIndex = 0;
    if (Array.isArray(value.sampleAdditionalDetails) && this.sampleNumbers.length > 0) {
      value.sampleAdditionalDetails.forEach((row: any, rowIndex: number) => {
        const label = row.label || '';
        const valuesArray = Array.isArray(row.values) ? row.values : [];
        // For each sample column in this row, create a flattened entry
        for (let sampleIdx = 0; sampleIdx < Math.max(valuesArray.length, this.sampleNumbers.length); sampleIdx++) {
          const val = valuesArray[sampleIdx] ?? '';
          // Prefer sampleNumbers (kept in component) otherwise fall back to sampleDetails in form
          const sampleNo = this.sampleNumbers[sampleIdx]
            || (value.sampleDetails && value.sampleDetails[sampleIdx] && value.sampleDetails[sampleIdx].sampleNo)
            || '';
          formData.append(`SampleAdditionalDetails[${addIndex}].SampleNo`, sampleNo);
          formData.append(`SampleAdditionalDetails[${addIndex}].Label`, label);
          formData.append(`SampleAdditionalDetails[${addIndex}].Value`, val ?? '');
          addIndex++;
        }
      });
    } else {
      // If no sampleNumbers yet (edge case when creating first sample), try to generate from sampleDetails
      if (Array.isArray(value.sampleAdditionalDetails) && Array.isArray(value.sampleDetails)) {
        value.sampleAdditionalDetails.forEach((row: any, rowIndex: number) => {
          const label = row.label || '';
          const valuesArray = Array.isArray(row.values) ? row.values : [];
          for (let sampleIdx = 0; sampleIdx < valuesArray.length; sampleIdx++) {
            const val = valuesArray[sampleIdx] ?? '';
            const sampleNo = (value.sampleDetails && value.sampleDetails[sampleIdx] && value.sampleDetails[sampleIdx].sampleNo) || '';
            formData.append(`SampleAdditionalDetails[${addIndex}].SampleNo`, sampleNo);
            formData.append(`SampleAdditionalDetails[${addIndex}].Label`, label);
            formData.append(`SampleAdditionalDetails[${addIndex}].Value`, val ?? '');
            addIndex++;
          }
        });
      }
    }

    // IMPORTANT: Only include sampleTestPlans if includePlans === true.
    if (includePlans && value.sampleTestPlans) {
      // Append plan data (existing logic) - keep it minimal here
      value.sampleTestPlans.forEach((sp: any, i: number) => {
        formData.append(`sampleTestPlans[${i}].sampleNo`, sp.sampleNo || '');
        // Append generalTests and chemicalTests as required
        // (assuming backend expects structure similar to previous implementation)
      });
    }

    // Call appropriate service to save Sample Inward (customer + sample)
    const request$ = (value.id && value.id > 0)
      ? this.inwardService.updateSampleInward(formData)
      : this.inwardService.createSampleInward(formData);

    request$.subscribe({
      next: (res) => {
        this.toastService.show('Sample Inward saved successfully!', 'success');
        this.router.navigate(['/sample/inward']);
      },
      error: (err) => {
        console.error('Error saving sample inward:', err);
        this.toastService.show('Error saving sample inward. Please try again.', 'error');
      }
    });
  }

  // Programmatically navigate to the Sample Details tab
  goToSampleTab(): void {
    // Primary: click the tab button (Bootstrap/tab markup)
    const tabBtn = document.getElementById('sample-tab') as HTMLElement | null;
    if (tabBtn) {
      tabBtn.click();
      return;
    }

    // Fallback: toggle classes manually if DOM structure differs
    try {
      // deactivate info tab button/pane
      const infoBtn = document.getElementById('info-tab');
      const infoPane = document.getElementById('info');
      const samplePane = document.getElementById('sample');
      const sampleBtnFallback = document.querySelector('[data-bs-target="#sample"]') as HTMLElement | null;

      infoBtn?.classList.remove('active');
      infoPane?.classList.remove('show', 'active');

      sampleBtnFallback?.classList.add('active');
      samplePane?.classList.add('show', 'active');
    } catch (err) {
      // no-op
      console.error('Error switching to sample tab', err);
    }
  };
  onCancel(): void {
    // You can reset the form or navigate away as needed
    this.sampleInwardForm.reset();
    this.router.navigate(['/sample/plan/inward']);
    // Optionally, navigate away
  };
}
