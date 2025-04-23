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
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { DepartmentService } from '../../../services/department.service';
import { Observable } from 'rxjs';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { CompanyCategoryService } from '../../../services/company-category.service';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DispatchModeService } from '../../../services/dispatch-mode.service';

@Component({
  selector: 'app-customer-form',
  // mark as standalone to use "imports"
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NumberOnlyDirective, SearchableDropdownComponent],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.css']
})
export class CustomerFormComponent implements OnInit {
  customerForm!: FormGroup;
  areas: any[] = [];
  departments: any[] = [];
  customerTypes: any[] = ['Walk in', 'Credit Customer'];
  companyCategory: any[] = [];
  dispatchModes = [
    { id: 1, name: 'Email' },
    { id: 2, name: 'WhatsApp' },
    { id: 3, name: 'Courier' },
    { id: 4, name: 'Self pickup' }
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
  specialAccountingCases = [
    { value: 'SEZ', name: 'SEZ' },
    { value: 'No GST applicable', name: 'No GST applicable' },
    { value: 'Bill in $', name: 'Bill in $' },
    { value: 'Govt X% GST', name: 'Govt X% GST' },
  ];
  isViewMode: boolean = false;
  selectedCompanyCategoryIds: number[] = [];
  customerId: number = 0;
  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private customerService: CustomerService,
    private departmentService: DepartmentService,
    private companyCategoryService: CompanyCategoryService,
    private toastService: ToastService,
    private route: ActivatedRoute, private router: Router,
    private dispatchModeService: DispatchModeService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.customerId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };

    if (state && state.mode === 'view') {
      this.isViewMode = true;
    } else {
      this.isViewMode = false;
    }

    this.customerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      legalName: [''],
      tallyLedgerName: ['', [Validators.required]],
      sameAsCustomerName: [false],
      address: [''],
      areaID: [0],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      country: ['', [Validators.required]],
      pinCode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      customerType: ['', [Validators.required]],
      isBlock: [false],
      industryID: [0],
      gstNo: ['', [Validators.required,
      Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/)
      ]],
      // panNo: ['', [Validators.required,
      // Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      // ]],
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
      contactPersons: this.fb.array([]),
      customerCompanyCategories: this.fb.array([], Validators.required),
      customerDispatchModes: this.fb.array([], Validators.required),
    });

    this.initFixedContacts();
    this.fetchCompanyCategoryDropdown();
    this.fetchDispatchModeDropdown();

    if (this.isViewMode) {
      this.customerForm.disable();
    }
    if (this.customerId) {
      this.loadCustomer();
    }
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

  get customerCompanyCategoriesArray(): FormArray {
    return this.customerForm.get('customerCompanyCategories') as FormArray;
  }

  get customerDispatchModesArray(): FormArray {
    return this.customerForm.get('customerDispatchModes') as FormArray;
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
      mobileNo: ['', isRequired ? [Validators.required, Validators.pattern(/^\d{10}$|^\d{11}$|^\d{12}$/)] : [Validators.pattern(/^\d{10}$|^\d{11}$|^\d{12}$/)]],
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
    console.log('Form Submitted', this.customerForm.value);
    if (this.customerForm.valid) {
      this.customerService.createCustomer(this.customerForm.value).subscribe({
        next: resp => {
          this.toastService.show(resp.message, 'success');
        },
        error: err => {
          this.toastService.show(err.message, 'error');
        }
      });
    }
    this.logInvalidControls(this.customerForm);

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
  fetchCompanyCategoryDropdown(): void {
    this.companyCategoryService.getCompanyCategoryDropdown('', 0, 100).subscribe({
      next: resp => {
        this.companyCategory = resp;
      },
      error: err => {
        console.error('Error fetching customer types', err);
      }
    });
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
  getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.departmentService.getDepartmentDropdown(term, page, pageSize);
  };

  onDepartmentSelected(item: any, targetFormGroup: FormGroup) {
    targetFormGroup.patchValue({ departmentID: item.id });
  }
  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  onCategoryToggle(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const id = +checkbox.value;

    const formArray = this.customerForm.get('customerCompanyCategories') as FormArray;

    if (checkbox.checked) {
      const exists = formArray.controls.some(ctrl => ctrl.get('companyCategoryID')?.value === id);
      if (!exists) {
        formArray.push(this.createCompanyCategory(id));
      }
    } else {
      const index = formArray.controls.findIndex(ctrl => ctrl.get('companyCategoryID')?.value === id);
      if (index !== -1) {
        formArray.removeAt(index);
      }
    }
    formArray.markAsTouched();
  }

  onDispatchModeToggle(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const id = +checkbox.value;

    const formArray = this.customerForm.get('customerDispatchModes') as FormArray;

    if (checkbox.checked) {
      const exists = formArray.controls.some(ctrl => ctrl.get('dispatchModeID')?.value === id);
      if (!exists) {
        formArray.push(this.createDispatch(id));
      }
    } else {
      const index = formArray.controls.findIndex(ctrl => ctrl.get('dispatchModeID')?.value === id);
      if (index !== -1) {
        formArray.removeAt(index);
      }
    }
    formArray.markAsTouched();
  }


  isCategorySelected(id: number): boolean {
    const formArray = this.customerForm.get('customerCompanyCategories') as FormArray;
    return formArray.controls.some(ctrl => ctrl.get('companyCategoryID')?.value === id);
  }

  isDispatchModeSelected(id: number): boolean {
    return this.customerDispatchModesArray.controls
      .some(ctrl => ctrl.get('dispatchModeID')?.value === id);
  }


  getSelectedCategories() {
    const formArray = this.customerForm.get('customerCompanyCategories') as FormArray;
    const selectedIds = formArray.controls.map(ctrl => ctrl.get('companyCategoryID')?.value);
    return this.companyCategory.filter(cat => selectedIds.includes(cat.id));
  }

  getSelectedCategoriesText(): string {
    const selected = this.getSelectedCategories();

    if (selected.length === 1) {
      return selected[0].name;
    } else if (selected.length > 1) {
      return `Selected ${selected.length} items`;
    }
    return '';
  }

  createCompanyCategory(companyCategoryID: number): FormGroup {
    return this.fb.group({
      id: [0],
      customerID: [0],
      companyCategoryID: [companyCategoryID]
    });
  }
  private createDispatch(dispatchModeID: number): FormGroup {
    return this.fb.group({
      id: [0],
      customerID: [0],
      dispatchModeID: [dispatchModeID]
    });
  }

  logInvalidControls(formGroup: FormGroup, parentKey: string = ''): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (control instanceof FormGroup) {
        this.logInvalidControls(control, fullKey); // Recursive for nested groups
      } else if (control instanceof FormArray) {
        (control.controls as FormGroup[]).forEach((group, index) => {
          this.logInvalidControls(group, `${fullKey}[${index}]`);
        });
      } else if (control && control.invalid) {
        console.error(`Invalid field: ${fullKey}`, control.errors);
      }
    });
  }

  loadCustomer(): void {
    this.customerService.getCustomerById(this.customerId).subscribe({
      next: (response) => {
        this.customerForm.patchValue(response);
        this.customerForm.get('contactPersons')?.patchValue(response.contactPersons);
        this.customerForm.get('customerCompanyCategories')?.setValue(response.customerCompanyCategories);
        this.customerForm.get('customerDispatchModes')?.setValue(response.customerDispatchModes);
      },
      error: (error) => {
        console.error('Error fetching customer data:', error);
      }
    });
  }
}
