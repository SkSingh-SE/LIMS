import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PlanFormComponent } from '../../plan/plan-form/plan-form.component';
import { ProductConditionService } from '../../../services/product-condition.service';
import { SampleStatus } from '../../../utility/status_flow/enums/sample-status.enum';
import { InwardStatus } from '../../../utility/status_flow/enums/inward-status.enum';

@Component({
  selector: 'app-sample-inward-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent],
  templateUrl: './sample-inward-form.component.html',
  styleUrl: './sample-inward-form.component.css'
})
export class SampleInwardFormComponent implements OnInit {
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
  sampleInwardForm!: FormGroup;
  globalTestCounter = 1;
  uploadedFile: File | null = null;
  customerData: any = null;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  sampleId: number = 0;

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
    private prodCondService: ProductConditionService
  ) {}

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
      file: [null],
      contacts: this.fb.array([]),
      reportingTo: this.fb.group({
        id: [0],
        contactPersonID: [''],
        contactPersonName: [''],
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
      sampleAdditionalDetails: this.fb.array([])
    });
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

          if (this.billingToContactPerson.length > 0) {
            this.updateAddressHelper(this.billingToContactPerson[0], 'billingTo');
          }
          if (this.reportingToContactPerson.length > 0) {
            this.updateAddressHelper(this.reportingToContactPerson[0], 'reportingTo');
          }
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
                additionalDetails: additionalSampleDetail
              };

              this.addSample(normalizedSample);
            });
            // Disable form if not in SAMPLE_INWARD_REGISTERED status
            if (data?.status != InwardStatus.NOT_STARTED) {
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
    if (this.isViewMode) return;

    const contact = this.contactControls.at(index).value;

    if (contact.sendBill) {
      if (!this.billingToContactPerson.some(c => c.id === contact.contactID)) {
        this.billingToContactPerson.push(contact);
      }
    } else {
      this.billingToContactPerson = this.billingToContactPerson.filter(c => c.id !== contact.id);
      this.billingTo.reset();
    }
  }

  onSendReportChange(index: number): void {
    if (this.isViewMode) return;

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
    if (this.sampleId === 0) {
      this.getCustomerDetails(item.id);
    }
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

  // Sample Helpers
  addSample(existingSample: any = null): void {
    const sampleNo = existingSample?.sampleNo ||
      `${this.yearCode}-${(this.lastSampleNumber + this.sampleDetails.length).toString().padStart(6, '0')}`;

    this.sampleNumbers.push(sampleNo);
    this.sampleNumber = sampleNo;

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
      file: [null]
    }));

    this.addAdditionalDetailsForSample(sampleNo, existingSample?.additionalDetails || []);
  }

  private addAdditionalDetailsForSample(sampleNo: string, additionalDetails: any[] = []): void {
    const formArray = this.sampleAdditionalDetails as FormArray;
    const existingLabels = formArray.controls.map((r) => r.get('label')?.value);

    formArray.controls.forEach((row) => {
      const valuesArray = row.get('values') as FormArray;
      const label = row.get('label')?.value;
      const match = additionalDetails.find((x: any) => x.label === label);
      valuesArray.push(this.fb.control(match?.value ?? ''));
    });

    additionalDetails
      .filter((ad: any) => !existingLabels.includes(ad.label))
      .forEach((ad: any) => {
        const valuesArray = this.fb.array([]);
        for (let k = 0; k < this.sampleNumbers.length - 1; k++) {
          valuesArray.push(this.fb.control(''));
        }
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
      formArray.controls.forEach((row) => {
        const valuesArray = row.get('values') as FormArray;
        valuesArray.push(this.fb.control(''));
      });
    }
  }

  removeSample(index: number): void {
    if (this.isViewMode) return;

    this.sampleDetails.removeAt(index);
    this.sampleNumbers.splice(index, 1);

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
      metalClassificationID: item.id,
    });
  }

  onProductConditionSelected(item: any, sampleIndex: number): void {
    const sampleDetailGroup = this.sampleDetails.at(sampleIndex) as FormGroup;
    sampleDetailGroup.patchValue({
      productConditionID: item.id,
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
    if (this.isViewMode) return;
    this.sampleDetails.at(index).patchValue({ fileName: '', file: null });
  }

  // Submission
  onSubmit(includePlans: boolean = false): void {
    if (!this.sampleInwardForm.valid) {
      this.sampleInwardForm.markAllAsTouched();
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

    // Sample additional details
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
    }

    const request$ = (value.id && value.id > 0)
      ? this.inwardService.updateSampleInward(formData)
      : this.inwardService.createSampleInward(formData);

    request$.subscribe({
      next: () => {
        this.toastService.show('Sample Inward saved successfully!', 'success');
        this.router.navigate(['/sample/inward']);
      },
      error: (err) => {
        console.error('Error saving sample inward:', err);
        this.toastService.show('Error saving sample inward. Please try again.', 'error');
      }
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
    this.router.navigate(['/sample/plan/inward']);
  }
}
