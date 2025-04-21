import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { EmployeeService } from '../../../services/employee.service';
import { CustomerService } from '../../../services/customer.service';

@Component({
  selector: 'app-customer-form',
  // mark as standalone to use "imports"
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.css']
})
export class CustomerFormComponent implements OnInit {
  customerForm!: FormGroup;
  areas: any[] = [];
  departments: any[] = [];
  customerTypes: any[] = [];
  dispatchModes = [
    { id: 'Email', name: 'Email' },
    { id: 'WhatsApp', name: 'WhatsApp' },
    { id: 'Courier', name: 'Courier' },
    { id: 'Self pickup', name: 'Self pickup' }
  ];
  selectedDispatchModes: string[] = [];
  discountOptions = [
    { name: '5%', value: 5 },
    { name: '10%', value: 10 },
    { name: '15%', value: 15 }
  ];
  
  creditLimitDays = [
    { name: '7 Days', value: 7 },
    { name: '15 Days', value: 15 },
    { name: '30 Days', value: 30 }
  ];


  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private customerService: CustomerService
  ) { }

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      legalName: [''],
      tallyLedgerName: ['',[Validators.required]],
      sameAsCustomerName: [false],
      address: [''],
      areaID: [0],
      stateID: [null],
      cityID: [null],
      city: ['',[Validators.required]],
      state: ['',[Validators.required]],
      country: ['',[Validators.required]],
      pinCode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      currencyID: [0],
      customerTypeID: [0],
      isBlock: [false],
      industryID: [0],
      gstNo: ['', [Validators.required,
        Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/)
      ]],
      panNo: ['', [Validators.required,
        Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      ]],
      gstna: [false],
      dispatchModeIDs: [''],
      sampleReturn: [false],
      billingEvery: [false],
      billingEveryDays: [0],
      specialAccountingCase: [''],
      weeklyBillingCustomer: [false],
      monthlyBillingCustomer: [false],
      directTaxInvoiceNoPerforma: [false],
      performaInvoiceRequiredBeforeTesting: [false],
      constantDiscount: [false],
      constantDiscountPercentage: [0],
      creditLimitAmount: [0],
      creditLimitTime: 0,
      companyVerified: [false],
      remark: [''],
      dTestoLoginId: [''],
      dTestoPassword: [''],
      dTestoActive: [false],
      blockDTestoUser: [false],
      blockReason: [''],
      contactPersons: this.fb.array([])
    });

    this.initFixedContacts();
    this.customerTypeDropdown();
  }

  /* ===== FormArray Getters ===== */
  get contactPersonsArray(): FormArray {
    return this.customerForm.get('contactPersons') as FormArray;
  }

  get contact1(): FormGroup | null {
    return this.contactPersonsArray.controls
      .find(c => c.get('type')?.value === 'contact1') as FormGroup;
  }

  get contact2(): FormGroup | null {
    return this.contactPersonsArray.controls
      .find(c => c.get('type')?.value === 'contact2') as FormGroup;
  }

  get accountant(): FormGroup | null {
    return this.contactPersonsArray.controls
      .find(c => c.get('type')?.value === 'accountant') as FormGroup;
  }

  get dynamicContacts(): FormGroup[] {
    return this.contactPersonsArray.controls
      .filter(c => c.get('type')?.value === 'dynamic') as FormGroup[];
  }

  /* ===== Initialize Fixed Contacts ===== */
  private initFixedContacts() {
    this.contactPersonsArray.push(this.createContact('contact1'));
    this.contactPersonsArray.push(this.createContact('contact2'));
    this.contactPersonsArray.push(this.createContact('accountant'));
  }

  /* ===== Contact Factory ===== */
  private createContact(type: string): FormGroup {
    const isRequired = ['contact1', 'contact2', 'accountant'].includes(type);

    return this.fb.group({
      id: [0],
      key: [type],
      type: [type],
      salutation: [''],
      name: ['', isRequired ? Validators.required : []],
      departmentID: [0],
      emailId: ['', isRequired ? [Validators.required, Validators.email] : [Validators.email]],
      mobileNo: ['', isRequired ? [Validators.required, Validators.pattern('^[0-9]{10}$')] : [Validators.pattern('^[0-9]{10}$')]],
      isWhatsappNo: [false],
      telephoneNo: [''],
      sendBill: [false],
      sendReport: [false],
      billReportDeliveryAddress: [''],
      customerID: [0]
    });
  }


  /* ===== Add / Remove Dynamic Contacts ===== */
  addContact(): void {
    this.contactPersonsArray.push(this.createContact('dynamic'));
  }

  removeDynamicContact(contact: AbstractControl): void {
    const idx = this.contactPersonsArray.controls.indexOf(contact);
    if (idx !== -1 && contact.get('type')?.value === 'dynamic') {
      this.contactPersonsArray.removeAt(idx);
    }
  }

  /* ===== Form Submission ===== */
  onSubmit(): void {
    this.customerForm.markAllAsTouched();

    if (this.customerForm.valid) {
      console.log('Form Submitted', this.customerForm.value);
    }
  }

  /* ===== Dispatch Modes ===== */
  onDispatchModeChange(event: any): void {
    const { value, checked } = event.target;
    if (checked) this.selectedDispatchModes.push(value);
    else this.selectedDispatchModes = this.selectedDispatchModes.filter(v => v !== value);

    this.customerForm.get('dispatchModeIDs')?.setValue(this.selectedDispatchModes.join(','));
  }

  isDispatchModeSelected(mode: string): boolean {
    return this.selectedDispatchModes.includes(mode);
  }

  /* ===== Area / Location ===== */
  fetchAreaData(pinControl: string, updateOtherFields: boolean = false): void {
    const pin = this.customerForm.get(pinControl)?.value?.toString() ?? '';
    if (pin.length === 6) {
      this.employeeService.getAreasWithPinCode(pin).subscribe({
        next: resp => {
          this.areas = resp;
          if (updateOtherFields) {
            this.fetchLocationData('areaID', 'city', 'state', 'country');
          }
        }
      });
    }
  }

  fetchLocationData(areaControl: string, cityControl: string, stateControl: string, countryControl: string): void {
    const areaId = this.customerForm.get(areaControl)?.value;
    const loc = this.areas.find(a => a.areaId == areaId);
    if (loc) {
      this.customerForm.patchValue({
        [cityControl]: loc.cityName,
        [stateControl]: loc.stateName,
        [countryControl]: loc.countryName
      });
    }
  }
  customerTypeDropdown(): void {
    this.customerService.getCustomerTypeDropdown('', 0, 100).subscribe({
      next: resp => {
        this.customerTypes = resp;
      },
      error: err => {
        console.error('Error fetching customer types', err);
      }
    });
  }
  copyCustomerNameToLedgerName(event: MouseEvent): void {
    const target = event.target as HTMLInputElement;
    if (target && target.type === 'checkbox') {
      const isChecked = target.checked;
  
      this.customerForm.patchValue({
        sameAsCustomerName: isChecked,
        tallyLedgerName: isChecked ? this.customerForm.get('name')?.value : ''
      });
    }
  }
  
}
