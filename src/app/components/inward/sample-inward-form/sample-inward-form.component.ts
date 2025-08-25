
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


@Component({
  selector: 'app-sample-inward-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent],
  templateUrl: './sample-inward-form.component.html',
  styleUrl: './sample-inward-form.component.css'
})
export class SampleInwardFormComponent implements OnInit {
  // ────────────── Constants & Data ──────────────
  caseNumber: string = 'DMSPL-000001';
  yearCode: string = new Date().getFullYear().toString().slice(-2);
  sampleNumber: string = '25-000011';
  lastSampleNumber: number = +this.sampleNumber.split('-')[1]; // fetched from DB
  readonly witnessList: string[] = ['Witness A', 'Witness B', 'Witness C', 'Witness D'];
  readonly descriptionOptions = ['Heat No', 'Batch No', 'Lot No', 'Identification', 'Sealed By', 'Witness By', 'Stamp By'];
  customers = [
    { name: 'Customer 1', address: 'Address 1', contact: 'Contact 1', pinCode: '380060', area: 'Science City', city: 'Ahmedabad', state: 'Gujarat', country: 'India', gstNo: 'JLNMSLR988687PA' },
    { name: 'Customer 2', address: 'Address 2', contact: 'Contact 2', pinCode: '400001', area: 'Marine Drive', city: 'Mumbai', state: 'Maharashtra', country: 'India', gstNo: 'BBNMSLR888888PA' },
    { name: 'Customer 3', address: 'Address 3', contact: 'Contact 3', pinCode: '500084', area: 'Hitech City', city: 'Hyderabad', state: 'Telangana', country: 'India', gstNo: 'HYDSLR777777PA' }
  ];
  contactPersons: any[] = [];
  billingToContactPerson: any[] = [];
  reportingToContactPerson: any[] = [];
  testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];
  dispatchModes: any[] = [];
  selectedDispatchModes: number[] = [];
  sampleCategories: string[] = ['Raw Material', 'Finished Product', 'Semi-finished Product'];

  // ────────────── State ──────────────
  sampleInwardForm!: FormGroup;
  sampleNumbers: string[] = [];
  globalTestCounter = 1;
  uploadedFile: File | null = null;
  customerData: any = null;
  isViewMode: boolean = false;
  sampleId: number = 0;


  constructor(private fb: FormBuilder, private customerService: CustomerService, private dispatchModeService: DispatchModeService, private areaService: AreaService, private materialSpecificationService: MaterialSpecificationService,
    private laboratoryTestService: LaboratoryTestService,
    private metalService: MetalClassificationService,
    private testMethodSpecificationService: TestMethodSpecificationService,
    private parameterService: ParameterService,
    private toastService: ToastService,
    private inwardService: SampleInwardService
  ) { }

  // ────────────── Lifecycle ──────────────
  ngOnInit(): void {
    this.getCaseNumber();
    this.initForm();
    // this.addSample();
    // this.addAdditionalSampleRow('Heat No');

    this.fetchDispatchModeDropdown();

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
        contactPersonId: [''],
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
        contactPersonId: [''],
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
        if (data) {
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
          if (this.customerData.customerDispatchModes && Array.isArray(this.customerData.customerDispatchModes)) {
            this.customerData.customerDispatchModes.forEach((mode: any) => {
              this.dispatchModesArray.push(this.createDispatch({ dispatchModeID: mode.dispatchModeID || mode.id }));
              this.selectedDispatchModes.push(mode.dispatchModeID || mode.id);
            });
          }
          this.fetchArea(this.customerData?.areaID, this.sampleInwardForm);
          this.contactControls.clear();
          var lastid = 0;
          if (this.customerData?.contactPersons && this.customerData.contactPersons.length > 0) {
            this.customerData.contactPersons.forEach((contact: any) => {
              contact.contactID = contact.id;

              this.addContact(contact);
              lastid = +contact.id;
              if (contact.sendBill) {
                this.billingToContactPerson.push(contact);
              }
              if (contact.sendReport) {
                this.reportingToContactPerson.push(contact);
              }
              this.contactPersons.push(contact);
            });
            this.updateAddressHelper(this.billingToContactPerson[0], 'billingTo');
            this.updateAddressHelper(this.reportingToContactPerson[0], 'reportingTo');
          }
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
    if (section === 'reportingTo') {
      this.reportingTo.patchValue({
        contactPersonId: selectedCustomer?.id || '',
        contactPersonName: selectedCustomer?.name || '',
        address: selectedCustomer?.address || '',
        pinCode: selectedCustomer?.pinCode || '',
        area: selectedCustomer?.area || '',
        city: selectedCustomer?.city || '',
        state: selectedCustomer?.state || '',
        country: selectedCustomer?.country || 'India'
      });
      // Fetch area details for reportingTo
      this.fetchArea(selectedCustomer?.areaID, this.sampleInwardForm.get('reportingTo') as FormGroup);
    } else {
      this.billingTo.patchValue({
        contactPersonId: selectedCustomer?.id || '',
        contactPersonName: selectedCustomer?.name || '',
        address: selectedCustomer?.address || '',
        pinCode: selectedCustomer?.pinCode || '',
        area: selectedCustomer?.area || '',
        city: selectedCustomer?.city || '',
        state: selectedCustomer?.state || '',
        country: selectedCustomer?.country || 'India'
      });
      this.fetchArea(selectedCustomer?.areaID, this.sampleInwardForm.get('billingTo') as FormGroup);
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
    })
    this.getCustomerDetails(item.id);
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
  addSample(): void {
    const sampleNo = `${this.yearCode}-${(this.lastSampleNumber + this.sampleDetails.length).toString().padStart(6, '0')}`;
    this.sampleNumbers.push(sampleNo);
    this.sampleDetails.push(this.fb.group({
      id: [0],
      sampleNo: [sampleNo],
      details: ['', Validators.required],
      nature: ['', Validators.required],
      category: ['', Validators.required],
      remarks: [''],
      quantity: [1],
      fileName: [''],
      sampleFilePath: [''],
      file: [File]
    }));
    // Add a new control for each existing Additional Sample Detail row
    this.sampleAdditionalDetails.controls.forEach(row => {
      const valuesArray = row.get('values') as FormArray;
      valuesArray.push(this.fb.control(''));
    });
    // Add to Sample Test Plans as well
    const generalTestGroup = this.createGeneralTestGroup();
    const generalReportNo = `${sampleNo}-${(generalTestGroup.get('methods') as FormArray).length + 1}`;
    const generalUrlNo = this.generateUrlNo(this.globalTestCounter);
    (generalTestGroup.get('methods') as FormArray).push(this.createTestMethodRow(generalReportNo, generalUrlNo));
    this.globalTestCounter++;
    this.sampleTestPlans.push(this.fb.group({
      sampleNo: [sampleNo],
      generalTests: this.fb.array([generalTestGroup]),
      chemicalTests: this.fb.array([]),
    }));
  }
  removeSample(index: number): void {
    this.sampleDetails.removeAt(index);
    this.sampleNumbers.splice(index, 1);
    // Remove corresponding value from each Additional Sample Detail row
    this.sampleAdditionalDetails.controls.forEach(row => {
      const valuesArray = row.get('values') as FormArray;
      valuesArray.removeAt(index);
    });
    // Remove from Sample Test Plans
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
      specification1: [''],
      specification2: [''],
      parameter: [''],
      methods: this.fb.array([])
    });
  }
  createChemicalTestGroup(sampleNo: string, urlNo: string): FormGroup {
    const testTypesGroup: { [key: string]: FormControl } = {};
    this.testTypeList.forEach(type => {
      testTypesGroup[type] = this.fb.control(false);
    });
    return this.fb.group({
      reportNo: [sampleNo || ''],
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

  // ────────────── File Handling ──────────────
  onFileUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toastService.show(`File size  should be less than 5 MB.`, 'warning');
        event.target.value = '';
        return;
      }
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.toastService.show('Invalid file type', 'warning');
        event.target.value = '';
        return;
      }
      this.sampleInwardForm.patchValue({ requestFileName: file.name, file: file });
      this.uploadedFile = file;
    }
  }
  removeAttachment(): void {
    this.uploadedFile = null;
  }
  onUploadSampleImage(index: number, event: any): void {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toastService.show(`File size  should be less than 5 MB.`, 'warning');
        event.target.value = '';
        return;
      }
      const allowedTypes = [
        'image/jpeg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.toastService.show('Invalid file type', 'warning');
        event.target.value = '';
        return;
      }
      this.sampleDetails.at(index).patchValue({ fileName: file.name, file: file });
    }
  }


  openFileInNewTab(filePath: string): void {
    if (filePath) {
      const baseUrl = 'https://localhost:7049/';
      const fullUrl = baseUrl + filePath;
      window.open(fullUrl, '_blank');
    } else {

    }
  }
  removeSampleFile(index: number): void {
    this.sampleDetails.at(index).patchValue({ fileName: '', file: null });
  }


  // ────────────── Submission ──────────────
  onSubmit(): void {
    if (this.sampleInwardForm.valid) {
      console.table(this.sampleInwardForm.value);
      const value = this.sampleInwardForm.value;
      const formData = new FormData();

      // 🔹 Top-level fields
      formData.append("caseNo", value.caseNo);
      formData.append("customerID", value.customerID);
      formData.append("address", value.address);
      formData.append("area", value.area);
      formData.append("state", value.state);
      formData.append("city", value.city);
      formData.append("pinCode", value.pinCode);
      formData.append("country", value.country);
      formData.append("gstNo", value.gstNo);

      // 🔹 Dispatch Modes (array of objects)
      value.dispatchModes.forEach((d: any, i: number) => {
        formData.append(`dispatchModes[${i}].dispatchModeID`, d.dispatchModeID);
        formData.append(`dispatchModes[${i}].inwardID`, d.inwardID || '0');
        formData.append(`dispatchModes[${i}].id`, d.id || '0');
      });

      // 🔹 Contacts (array of objects)
      value.contacts.forEach((c: any, i: number) => {
        formData.append(`contacts[${i}].id`, '0');
        formData.append(`contacts[${i}].selected`, c.selected);
        formData.append(`contacts[${i}].contactID`, c.contactID);
        formData.append(`contacts[${i}].name`, c.name);
        formData.append(`contacts[${i}].mobileNo`, c.mobileNo);
        formData.append(`contacts[${i}].emailId`, c.emailId);
        formData.append(`contacts[${i}].sendBill`, c.sendBill);
        formData.append(`contacts[${i}].sendReport`, c.sendReport);
      });

       // 🔹 Reporting To
      formData.append("reportingTo.id", value.reportingTo.id);
      formData.append("reportingTo.contactPersonId", value.reportingTo.contactPersonId);
      formData.append("reportingTo.contactPersonName", value.reportingTo.contactPersonName);
      formData.append("reportingTo.address", value.reportingTo.address);
      formData.append("reportingTo.pinCode", value.reportingTo.pinCode);
      formData.append("reportingTo.area", value.reportingTo.area);
      formData.append("reportingTo.city", value.reportingTo.city);
      formData.append("reportingTo.state", value.reportingTo.state);
      formData.append("reportingTo.country", value.reportingTo.country);
      formData.append("reportingTo.type", value.reportingTo.type);

      // 🔹 Billing To
      formData.append("billingTo.id", value.billingTo.id);
      formData.append("billingTo.contactPersonId", value.billingTo.contactPersonId);
      formData.append("billingTo.contactPersonName", value.billingTo.contactPersonName);
      formData.append("billingTo.address", value.billingTo.address);
      formData.append("billingTo.pinCode", value.billingTo.pinCode);
      formData.append("billingTo.area", value.billingTo.area);
      formData.append("billingTo.city", value.billingTo.city);
      formData.append("billingTo.state", value.billingTo.state);
      formData.append("billingTo.country", value.billingTo.country);
      formData.append("billingTo.type", value.billingTo.type);

      // 🔹 Sample Details (with file support)
      value.sampleDetails.forEach((s: any, i: number) => {
        formData.append(`sampleDetails[${i}].id`, '0');
        formData.append(`sampleDetails[${i}].sampleNo`, s.sampleNo || '');
        formData.append(`sampleDetails[${i}].details`, s.details || '');
        formData.append(`sampleDetails[${i}].nature`, s.nature || '');
        formData.append(`sampleDetails[${i}].category`, s.category || '');
        formData.append(`sampleDetails[${i}].remarks`, s.remarks || '');
        formData.append(`sampleDetails[${i}].quantity`, s.quantity || '0');
        formData.append(`sampleDetails[${i}].fileName`, s.fileName || '');
        formData.append(`sampleDetails[${i}].sampleFilePath`, s.sampleFilePath || '');
        if (s.file instanceof File) {
          formData.append(`sampleDetails[${i}].file`, s.file);
        }
      });

      var index = 0;
      value.sampleAdditionalDetails.forEach((a: any, i: number) => {
        a.values.forEach((v: any, j: number) => {
          formData.append(`sampleAdditionalDetails[${index}].id`, a.id || '0');
          formData.append(`sampleAdditionalDetails[${index}].sampleId`, '0');
          formData.append(`sampleAdditionalDetails[${index}].sampleNo`, this.sampleNumbers[j]);
          formData.append(`sampleAdditionalDetails[${index}].label`, a.label);
          formData.append(`sampleAdditionalDetails[${index}].enabled`, a.enabled);
          formData.append(`sampleAdditionalDetails[${index}].value`, v);
          index++;
        });
      });


      // 🔹 Plans
      // value.plans.forEach((p: any, i: number) => {
      //   formData.append(`plans[${i}].planName`, p.planName);
      //   formData.append(`plans[${i}].planDetails`, p.planDetails);
      // });

      // 🔹 Root-level file
      if (value.file instanceof File) {
        formData.append("file", value.file);
      }
      this.inwardService.createSampleInward(formData).subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          // this.router.navigate(['/inward/sample-list']);
        },
        error: (error) => {
          console.error('Error submitting sample inward:', error);
          this.toastService.show('Error submitting sample inward', 'error');
        }
      });
    } else {
      this.sampleInwardForm.markAllAsTouched();
    }
  }

}
