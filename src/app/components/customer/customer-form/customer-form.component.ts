import { CommonModule } from '@angular/common';
import { Component, OnInit , HostListener } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { CustomerService } from '../../../services/customer.service';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { DecimalOnlyDirective } from '../../../utility/directives/decimal-only.directive';
import { Observable } from 'rxjs';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { CompanyCategoryService } from '../../../services/company-category.service';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DispatchModeService } from '../../../services/dispatch-mode.service';
import { AreaService } from '../../../services/area.service';
import { ConfigService } from '../../../services/config.service';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
import { CurrencyService } from '../../../services/currency.service';
import { GstValidatorService } from '../../../services/gst-validator.service';


@Component({
  selector: 'app-customer-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NumberOnlyDirective, DecimalOnlyDirective, SearchableDropdownComponent, MultiSelectDropdownComponent, RouterLink, FormFieldErrorComponent],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.css']
})
export class CustomerFormComponent implements CanComponentDeactivate, OnInit {
  saved = false;
  customerForm!: FormGroup;
  areas: any[] = [];
  areaList: any[] = [];
  customerTypes: any[] = ['Walk In', 'Credit Customer', 'Relationship Credit Customer'];
  dispatchModes: any[] = [];
  specialAccountingCases = [
    { value: 'SEZ', name: 'SEZ' },
    { value: 'Bill in $', name: 'Bill in $' },
    { value: 'Govt X% GST', name: 'Govt X% GST' },
  ];
  isViewMode: boolean = false;
  customerId: number = 0;
  submitted = false;
  defaultCurrency: any = null;
  gstFetching = false;
  gstStateName = '';

  // ── Level 2 change request state ─────────────────────────────────────────────
  pendingChange: any = null;
  changeHistory: any[] = [];
  showHistory = false;

  private readonly GROUP_B_FIELDS = [
    'creditLimitAmount', 'creditLimitTime', 'constantDiscount', 'constantDiscountPercentage',
    'weeklyBillingCustomer', 'monthlyBillingCustomer', 'billingEvery', 'billingEveryDays',
  ];
  constructor(
    private fb: FormBuilder,
    private areaService: AreaService,
    private customerService: CustomerService,
    private companyCategoryService: CompanyCategoryService,
    private toastService: ToastService,
    private route: ActivatedRoute, private router: Router,
    private dispatchModeService: DispatchModeService,
    private configService: ConfigService,
    private unsavedChangesService: UnsavedChangesService,
    private currencyService: CurrencyService,
    private gstValidatorService: GstValidatorService) { }

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

    const nonZeroArea = (ctrl: AbstractControl) => (+ctrl.value !== 0 ? null : { required: true });

    this.customerForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      tallyLedgerName: ['', [Validators.required, noWhitespaceValidator()]],
      sameAsCustomerName: [false],
      address: ['', [Validators.required, Validators.maxLength(500), noWhitespaceValidator()]],
      areaID: [0, nonZeroArea],
      cityID: [0],
      city: ['', [Validators.required]],
      stateID: [0],
      state: ['', [Validators.required]],
      countryID: [0],
      country: ['', [Validators.required]],
      pinCode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      customerType: ['', [Validators.required]],
      isBlock: [false],
      lastBillingDate: [null],
      currencyID: [0, (ctrl: AbstractControl) => (+ctrl.value !== 0 ? null : { required: true })],
      gstNo: ['', [Validators.required,
      Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/)
      ]],
      customerStateCode: [''],
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
      creditLimitTime: [0],
      remark: [''],
      blockReason: [''],
      isVerified: [false],
      verifiedBy: [0],
      verifiedOn: [null],
      contactPersons: this.fb.array([]),
      customerCompanyCategories: this.fb.array([], Validators.required),
      customerDispatchModes: this.fb.array([], Validators.required),
    });

    this.initFixedContacts();
    this.fetchDispatchModeDropdown();
    this.getCustomerTypes();
    if (this.customerId === 0) {
      this.setDefaultCurrency();
    }

    // Toggle GST validators when "GST not applicable" changes
    this.customerForm.get('gstna')?.valueChanges.subscribe((gstNotApplicable: boolean) => {
      const gstControl = this.customerForm.get('gstNo');
      if (gstNotApplicable) {
        gstControl?.clearValidators();
        gstControl?.setValue('');
      } else {
        gstControl?.setValidators([
          Validators.required,
          Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/)
        ]);
      }
      gstControl?.updateValueAndValidity();
    });

    // Auto-extract CustomerStateCode from first 2 digits of GSTIN on manual entry (fallback when Fetch not used)
    this.customerForm.get('gstNo')?.valueChanges.subscribe((val: string) => {
      const gstin = (val || '').toUpperCase().trim();
      const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
      if (pattern.test(gstin)) {
        this.customerForm.patchValue({ customerStateCode: gstin.substring(0, 2) }, { emitEvent: false });
      } else {
        this.customerForm.patchValue({ customerStateCode: '' }, { emitEvent: false });
        this.gstStateName = '';
      }
    });

    // ── SpecialAccountingCase ↔ GSTNA sync ──
    // SEZ means GST is not applicable → auto-check GSTNA
    this.customerForm.get('specialAccountingCase')?.valueChanges.subscribe((val: string) => {
      const gstnaControl = this.customerForm.get('gstna');
      const gstControl = this.customerForm.get('gstNo');
      if (val === 'SEZ') {
        gstnaControl?.setValue(true, { emitEvent: false });
        gstControl?.clearValidators();
        gstControl?.setValue('');
        gstControl?.updateValueAndValidity();
      }
    });

    // Reverse sync: GSTNA unchecked → clear SEZ if it was set by the checkbox
    this.customerForm.get('gstna')?.valueChanges.subscribe((checked: boolean) => {
      const specialCase = this.customerForm.get('specialAccountingCase')?.value;
      if (!checked && specialCase === 'SEZ') {
        this.customerForm.get('specialAccountingCase')?.setValue('', { emitEvent: false });
      }
    });

    // ── CustomerType: Walk-in resets billing; Relationship Credit Customer requires credit limit ──
    this.customerForm.get('customerType')?.valueChanges.subscribe((type: string) => {
      const amountCtrl = this.customerForm.get('creditLimitAmount');
      const timeCtrl   = this.customerForm.get('creditLimitTime');
      if (type.toLowerCase() === 'walk in' || type.toLowerCase() === 'walk-in') {
        this.customerForm.patchValue({
          creditLimitAmount: 0, creditLimitTime: 0,
          weeklyBillingCustomer: false, monthlyBillingCustomer: false,
          directTaxInvoiceNoPerforma: false, billingEvery: false, billingEveryDays: 0,
          performaInvoiceRequiredBeforeTesting: false,
        }, { emitEvent: false });
        amountCtrl?.clearValidators();
        timeCtrl?.clearValidators();
      } else if (type === 'Relationship Credit Customer') {
        amountCtrl?.setValidators([Validators.required, Validators.min(1)]);
        timeCtrl?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        amountCtrl?.clearValidators();
        timeCtrl?.clearValidators();
      }
      amountCtrl?.updateValueAndValidity({ emitEvent: false });
      timeCtrl?.updateValueAndValidity({ emitEvent: false });
    });

    // Invoice mode mutual exclusion: only one of directTax / performa can be active
    this.customerForm.get('directTaxInvoiceNoPerforma')?.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        this.customerForm.patchValue({ performaInvoiceRequiredBeforeTesting: false }, { emitEvent: false });
      }
    });
    this.customerForm.get('performaInvoiceRequiredBeforeTesting')?.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        this.customerForm.patchValue({ directTaxInvoiceNoPerforma: false }, { emitEvent: false });
      }
    });

    // E4 — billing options mutual exclusion: only one of Weekly / Monthly / BillingDays can be active
    this.customerForm.get('weeklyBillingCustomer')?.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        this.customerForm.patchValue({ monthlyBillingCustomer: false, billingEvery: false, billingEveryDays: 0 }, { emitEvent: false });
        // billingEvery set with emitEvent:false so its subscription won't fire — manually clear stale validators
        this.clearBillingEveryDaysValidators();
      }
    });
    this.customerForm.get('monthlyBillingCustomer')?.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        this.customerForm.patchValue({ weeklyBillingCustomer: false, billingEvery: false, billingEveryDays: 0 }, { emitEvent: false });
        this.clearBillingEveryDaysValidators();
      }
    });
    this.customerForm.get('billingEvery')?.valueChanges.subscribe((checked: boolean) => {
      const daysCtrl = this.customerForm.get('billingEveryDays');
      if (checked) {
        this.customerForm.patchValue({ weeklyBillingCustomer: false, monthlyBillingCustomer: false }, { emitEvent: false });
        daysCtrl?.setValidators([Validators.required, Validators.min(1), Validators.max(365)]);
      } else {
        this.customerForm.patchValue({ billingEveryDays: 0 }, { emitEvent: false });
        daysCtrl?.clearValidators();
      }
      daysCtrl?.updateValueAndValidity({ emitEvent: false });
    });

    // isBlock: blockReason required when blocking a customer
    this.customerForm.get('isBlock')?.valueChanges.subscribe((checked: boolean) => {
      const reasonCtrl = this.customerForm.get('blockReason');
      if (checked) {
        reasonCtrl?.setValidators([Validators.required, Validators.maxLength(250)]);
      } else {
        reasonCtrl?.clearValidators();
        reasonCtrl?.setValue('', { emitEvent: false });
      }
      reasonCtrl?.updateValueAndValidity({ emitEvent: false });
    });

    // G12 — sync tallyLedgerName when name changes and sameAsCustomerName is checked
    this.customerForm.get('name')?.valueChanges.subscribe((val: string) => {
      if (this.customerForm.get('sameAsCustomerName')?.value) {
        this.customerForm.patchValue({ tallyLedgerName: val }, { emitEvent: false });
      }
    });

    // G9 — constantDiscountPercentage: required > 0 when constantDiscount is enabled
    this.customerForm.get('constantDiscount')?.valueChanges.subscribe((checked: boolean) => {
      const ctrl = this.customerForm.get('constantDiscountPercentage');
      if (checked) {
        ctrl?.setValidators([Validators.min(0.01), Validators.max(100)]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValue(0, { emitEvent: false });
      }
      ctrl?.updateValueAndValidity({ emitEvent: false });
    });

    if (this.isViewMode) {
      this.customerForm.disable();
    }
    if (this.customerId) {
      this.loadCustomer();
    }
  }

  get isGstinValid(): boolean {
    const val = (this.customerForm.get('gstNo')?.value || '').toUpperCase().trim();
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(val);
  }

  get isWalkIn(): boolean {
    const type = (this.customerForm.get('customerType')?.value || '').toLowerCase();
    return type === 'walk in' || type === 'walk-in';
  }

  get isRelationshipCreditCustomer(): boolean {
    return this.customerForm.get('customerType')?.value === 'Relationship Credit Customer';
  }

  /* ===== FormArray Getters ===== */
  get contactPersonsArray(): FormArray {
    return this.customerForm.get('contactPersons') as FormArray;
  }

  get customerCompanyCategoriesArray(): FormArray {
    return this.customerForm.get('customerCompanyCategories') as FormArray;
  }

  get customerDispatchModesArray(): FormArray {
    return this.customerForm.get('customerDispatchModes') as FormArray;
  }

  // contact1 = first required contact; accountant = last optional; middle = everything in between
  get contact1(): FormGroup | null {
    return this.contactPersonsArray.controls
      .find(c => c.get('type')?.value === 'contact1') as FormGroup ?? null;
  }

  get accountant(): FormGroup | null {
    return this.contactPersonsArray.controls
      .find(c => c.get('type')?.value === 'accountant') as FormGroup ?? null;
  }

  get dynamicContacts(): FormGroup[] {
    return this.contactPersonsArray.controls
      .filter(c => this.isMiddleContact(c.get('type')?.value)) as FormGroup[];
  }

  // Middle contacts = anything that is not contact1 or accountant (handles legacy 'dynamic' type too)
  private isMiddleContact(type: string): boolean {
    return type !== 'contact1' && type !== 'accountant';
  }

  getContactTitle(arrayIndex: number): string {
    const type = this.contactPersonsArray.at(arrayIndex)?.get('type')?.value ?? '';
    if (type === 'contact1') return 'Contact Info 1';
    if (type === 'accountant') return 'Account Info';
    // Count middle contacts that appear before this index to get sequential number
    const middlesBefore = this.contactPersonsArray.controls
      .slice(0, arrayIndex)
      .filter(c => this.isMiddleContact(c.get('type')?.value)).length;
    return `Contact Info ${middlesBefore + 2}`;
  }

  /* ===== Initialize Fixed Contacts (create mode only) ===== */
  private initFixedContacts(): void {
    this.contactPersonsArray.push(this.createContact('contact1'));
    this.contactPersonsArray.push(this.createContact('accountant'));
  }

  /* ===== Contact FormGroup Factory ===== */
  // forceRequired: true for contact1 (always) and dynamic contacts added by user
  private createContact(type: string, forceRequired: boolean = false): FormGroup {
    const isRequired = type === 'contact1' || forceRequired;
    const nonZeroValidator = (ctrl: AbstractControl) => (+ctrl.value !== 0 ? null : { required: true });
    const group = this.fb.group({
      id:           [0],
      type:         [type],
      customerID:   [0],
      salutation:   ['Mr.', isRequired ? Validators.required : []],
      name:         ['',    isRequired ? Validators.required : []],
      department:   [''],
      emailId:      ['',    isRequired
        ? [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/)]
        : [Validators.pattern(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/)]],
      mobileNo:     ['',    isRequired
        ? [Validators.required, Validators.pattern(/^[+]?\d{10,13}$/)]
        : [Validators.pattern(/^[+]?\d{10,13}$/)]],
      isWhatsappNo: [false],
      telephoneNo:  ['',    [Validators.pattern(/^[+]?\d{10,13}$/)]],
      sendBill:     [false],
      sendReport:   [false],
      address:      ['',    isRequired ? Validators.required : []],
      pinCode:      ['',    isRequired ? [Validators.required, Validators.pattern('^[0-9]{6}$')] : [Validators.pattern('^[0-9]{6}$')]],
      areaID:       [0,     isRequired ? nonZeroValidator : []],
      city:         ['',    isRequired ? Validators.required : []],
      state:        ['',    isRequired ? Validators.required : []],
      country:      ['',    isRequired ? Validators.required : []],
      areaOptions:  [[]], // frontend-only — stripped before API call
    });
    if (this.isViewMode) group.disable();
    return group;
  }

  /* ===== Add / Remove Middle Contacts ===== */
  addContact(): void {
    // Always insert before accountant; dynamic contacts get full required validators
    this.contactPersonsArray.insert(
      this.contactPersonsArray.length - 1,
      this.createContact('dynamic', true)
    );
  }

  removeDynamicContact(contact: AbstractControl): void {
    const idx = this.contactPersonsArray.controls.indexOf(contact);
    if (idx !== -1 && this.isMiddleContact(contact.get('type')?.value)) {
      this.contactPersonsArray.removeAt(idx);
    }
  }

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.customerForm, path, this.submitted);
  }

  /* ===== Invoice Mode Management ===== */
  clearInvoiceMode(): void {
    this.customerForm.patchValue({
      directTaxInvoiceNoPerforma: false,
      performaInvoiceRequiredBeforeTesting: false,
    }, { emitEvent: false });
  }

  /* ===== Billing Frequency Management ===== */
  clearBillingFrequency(): void {
    this.customerForm.patchValue({
      weeklyBillingCustomer: false,
      monthlyBillingCustomer: false,
      billingEvery: false,
      billingEveryDays: 0
    }, { emitEvent: false });
    // billingEvery set with emitEvent:false — manually clear stale validators
    this.clearBillingEveryDaysValidators();
  }

  private clearBillingEveryDaysValidators(): void {
    const daysCtrl = this.customerForm.get('billingEveryDays');
    daysCtrl?.clearValidators();
    daysCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  /* ===== Form Value Transformation ===== */
  private convertFormToUppercase(): any {
    const formValue = { ...this.customerForm.value };

    // Convert main form fields to uppercase
    if (formValue.name) formValue.name = formValue.name.toUpperCase();
    if (formValue.tallyLedgerName) formValue.tallyLedgerName = formValue.tallyLedgerName.toUpperCase();
    if (formValue.address) formValue.address = formValue.address.toUpperCase();
    if (formValue.blockReason) formValue.blockReason = formValue.blockReason.toUpperCase();
    if (formValue.remark) formValue.remark = formValue.remark.toUpperCase();
    if (formValue.gstNo) formValue.gstNo = formValue.gstNo.toUpperCase();

    // Convert contact persons fields to uppercase and strip frontend-only fields
    if (formValue.contactPersons && Array.isArray(formValue.contactPersons)) {
      formValue.contactPersons = formValue.contactPersons.map((contact: any) => {
        const { areaOptions, ...contactData } = contact; // strip frontend-only field
        return {
          ...contactData,
          name:       contactData.name       ? contactData.name.toUpperCase()       : contactData.name,
          department: contactData.department ? contactData.department.toUpperCase() : contactData.department,
          address:    contactData.address    ? contactData.address.toUpperCase()    : contactData.address,
        };
      });
    }

    return formValue;
  }

  /* ===== Form Submission ===== */
  private isFormValidForSubmit(): boolean {
    // Validate all top-level controls except contactPersons
    for (const key of Object.keys(this.customerForm.controls)) {
      if (key === 'contactPersons') continue;
      const ctrl = this.customerForm.get(key);
      if (ctrl && ctrl.invalid && !ctrl.disabled) return false;
    }
    // contact1 — always required
    if (this.contact1 && this.contact1.invalid && !this.contact1.disabled) return false;
    // dynamic contacts — always validate (full validators applied on add)
    for (const contact of this.dynamicContacts) {
      if (contact.invalid && !contact.disabled) return false;
    }
    // accountant — optional, validate only if name is filled
    if (this.accountant) {
      const hasData = !!this.accountant.get('name')?.value?.trim();
      if (hasData && this.accountant.invalid && !this.accountant.disabled) return false;
    }
    return true;
  }

  onSubmit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.customerForm);
    if (!this.isFormValidForSubmit()) {
      const missing = this.getInvalidFieldNames();
      this.toastService.show(`Please fix: ${missing.join(', ')}`, 'warning');
      return;
    }

    const v = this.customerForm.value;

    // GST state vs address state mismatch warning
    if (this.gstStateName && v.state) {
      const gstState = this.gstStateName.trim().toLowerCase();
      const addressState = v.state.trim().toLowerCase();
      if (gstState !== addressState) {
        const proceed = window.confirm(
          `Warning: GST registered state is "${this.gstStateName}" but address state is "${v.state}".\n\nThis may affect IGST/CGST+SGST calculation.\n\nClick OK to save anyway, or Cancel to fix.`
        );
        if (!proceed) return;
      }
    }

    if (this.customerId > 0) {
      this.customerService.updateCustomer(this.convertFormToUppercase()).subscribe({
        next: resp => {
          this.saved = true;
          this.toastService.show(resp.message, 'success');
          this.router.navigate(['/customer']);
        },
        error: () => {
        }
      });
    } else {
      const formData = this.convertFormToUppercase();
      formData.customerID = 0;
      this.customerService.createCustomer(formData).subscribe({
        next: resp => {
          this.saved = true;
          this.toastService.show(resp.message, 'success');
          this.router.navigate(['/customer']);
        },
        error: () => {
        }
      });
    }
  }



  /* ===== Area / Location ===== */
  fetchAreaData(pinControl: string, updateOtherFields: boolean = false): void {
    const pin = this.customerForm.get(pinControl)?.value?.toString() ?? '';
    if (pin.length === 6) {
      this.areaService.getAreasWithPinCode(pin).subscribe({
        next: (resp) => {
          this.areas = resp || [];
          if (this.areas.length === 0) {
            this.toastService.show('No areas found for the entered pincode.', 'warning');
          }
          if (updateOtherFields && this.areas.length > 0) {
            this.fetchLocationData('areaID', 'city', 'state', 'country');
          }
        },
        error: (error) => {
          console.error('Error fetching areas:', error);
          this.toastService.show('Failed to fetch areas for the entered pincode.', 'error');
        }
      });
    }
  }

  fetchFromGst(): void {
    const gstin = this.customerForm.get('gstNo')?.value?.toString().toUpperCase();
    const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstin || !pattern.test(gstin)) {
      this.toastService.show('Enter a valid 15-character GSTIN first.', 'error');
      return;
    }
    this.gstFetching = true;
    this.gstValidatorService.validate(gstin).subscribe({
      next: (res) => {
        this.gstFetching = false;
        if (res.status === 0) {
          this.toastService.show(res.message || 'GST validation service error.', 'error');
          return;
        }
        if (!res.valid) {
          this.toastService.show('Invalid GSTIN. Please check the number.', 'error');
          return;
        }
        const d = res.company_details;
        const pradr = d?.pradr;
        const stateInfo = d?.state_info;
        const stateCode = stateInfo?.code || gstin.substring(0, 2);
        this.gstStateName = stateInfo?.name || '';

        const patchData: any = {
          name: d?.trade_name || d?.legal_name || '',
          address: pradr?.addr1 ? [pradr.addr1, pradr.addr2].filter(Boolean).join(', ') : (pradr?.addr || ''),
          pinCode: pradr?.pinc || pradr?.pincode || '',
          customerStateCode: stateCode,
        };
        if (this.customerForm.get('panNo')) {
          patchData['panNo'] = d?.pan || '';
        }
        this.customerForm.patchValue(patchData);
        if (pradr?.pinc || pradr?.pincode) {
          this.fetchAreaData('pinCode', true);
        }
        this.toastService.show('GST details fetched successfully.', 'success');
      },
      error: () => {
        this.gstFetching = false;
        this.toastService.show('Failed to validate GSTIN. Try again.', 'error');
      }
    });
  }

  fetchContactAreaData(contact: FormGroup): void {
    const pin = contact.get('pinCode')?.value?.toString() ?? '';
    if (pin.length === 6) {
      this.areaService.getAreasWithPinCode(pin).subscribe({
        next: (resp) => {
          this.areaList = resp || [];
          contact.patchValue({ areaOptions: resp }); // store it temporarily if needed
          contact.get('areaID')?.value ? this.fetchLocationDataForContact(contact) : null;
        },
        error: (err) => {
          this.toastService.show('Failed to fetch areas for contact pincode.', 'error');
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
        [countryControl]: loc.countryName,
        cityID: loc.cityId,
        stateID: loc.stateId,
        countryID: loc.countryId
      });
    }
  }
  fetchLocationDataForContact(contact: FormGroup): void {
    const areaId = contact.get('areaID')?.value;
    const areaList: any[] = contact.get('areaOptions')?.value;
    const selectedArea = areaList.find(a => a.areaId == areaId);
    if (selectedArea) {
      contact.patchValue({
        city: selectedArea.cityName,
        state: selectedArea.stateName,
        country: selectedArea.countryName
      });
    }
  }
  fetchCategoryDropdown = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.companyCategoryService.getCompanyCategoryDropdown(term, page, pageSize);
  };

  get selectedCategoryIds(): number[] {
    return this.customerCompanyCategoriesArray.controls.map(
      ctrl => ctrl.get('companyCategoryID')?.value
    ).filter(Boolean);
  }

  onCategoriesSelected(items: any[]): void {
    const formArray = this.customerCompanyCategoriesArray;
    const existingMap = new Map<number, any>(
      formArray.controls.map(ctrl => [ctrl.get('companyCategoryID')?.value, ctrl.get('id')?.value])
    );
    formArray.clear();
    items.forEach(item => {
      formArray.push(this.createCompanyCategory({
        id: existingMap.get(item.id) || 0,
        companyCategoryID: item.id
      }));
    });
    formArray.markAsTouched();
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
  getCurrencies = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.currencyService.getDropdown(term, page, pageSize);
  };

  onCurrencySelect(item: any): void {
    this.customerForm.patchValue({ currencyID: item?.id || 0 });
    if (item) this.defaultCurrency = item;
  }

  private setDefaultCurrency(): void {
    this.currencyService.getDefault().subscribe({
      next: (currency) => {
        if (currency) {
          this.defaultCurrency = currency;
          this.customerForm.patchValue({ currencyID: currency.id });
        }
      },
      error: () => {}
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
  copyCustomerAddressToContact(contact: FormGroup): void {
    contact.patchValue({
      address: this.customerForm.get('address')?.value,
      pinCode: this.customerForm.get('pinCode')?.value,
      areaID: this.customerForm.get('areaID')?.value,
      city: this.customerForm.get('city')?.value,
      state: this.customerForm.get('state')?.value,
      country: this.customerForm.get('country')?.value,
      areaOptions: this.areas
    });
  }

  copyContact1ToContact(target: FormGroup): void {
    const src = this.contact1;
    if (!src) return;
    target.patchValue({
      salutation: src.get('salutation')?.value,
      name: src.get('name')?.value,
      department: src.get('department')?.value,
      emailId: src.get('emailId')?.value,
      mobileNo: src.get('mobileNo')?.value,
      telephoneNo: src.get('telephoneNo')?.value,
      sendBill: src.get('sendBill')?.value,
      sendReport: src.get('sendReport')?.value,
      address: src.get('address')?.value,
      pinCode: src.get('pinCode')?.value,
      areaID: src.get('areaID')?.value,
      city: src.get('city')?.value,
      state: src.get('state')?.value,
      country: src.get('country')?.value,
      areaOptions: src.get('areaOptions')?.value
    });
  }

  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  onDispatchModeToggle(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const id = +checkbox.value;

    const formArray = this.customerForm.get('customerDispatchModes') as FormArray;

    if (checkbox.checked) {
      const exists = formArray.controls.some(ctrl => ctrl.get('dispatchModeID')?.value === id);
      if (!exists) {
        formArray.push(this.createDispatch({ dispatchModeID: id }));
      }
    } else {
      const index = formArray.controls.findIndex(ctrl => ctrl.get('dispatchModeID')?.value === id);
      if (index !== -1) {
        formArray.removeAt(index);
      }
    }
    formArray.markAsTouched();
  }


  isDispatchModeSelected(id: number): boolean {
    return this.customerDispatchModesArray.controls
      .some(ctrl => ctrl.get('dispatchModeID')?.value === id);
  }


  createCompanyCategory(companyCategory?: any): FormGroup {
    return this.fb.group({
      id: [companyCategory?.id || 0],
      customerID: [companyCategory?.customerID || 0],
      companyCategoryID: [companyCategory?.companyCategoryID || 0]
    });
  }
  private createDispatch(dispatchMode?: any): FormGroup {
    return this.fb.group({
      id: [dispatchMode?.id || 0],
      customerID: [dispatchMode?.customerID || 0],
      dispatchModeID: [dispatchMode?.dispatchModeID || 0]
    });
  }

  private fieldLabelMap: Record<string, string> = {
    name: 'Customer Name',
    tallyLedgerName: 'Tally Ledger Name',
    address: 'Address',
    areaID: 'Area',
    city: 'City',
    state: 'State',
    country: 'Country',
    pinCode: 'Pin Code',
    customerType: 'Customer Type',
    gstNo: 'GST No',
    customerCompanyCategories: 'Company Category',
    customerDispatchModes: 'Dispatch Mode',
    creditLimitAmount: 'Credit Limit Amount',
    creditLimitTime: 'Credit Limit Time (Days)',
    constantDiscountPercentage: 'Constant Discount %',
    billingEveryDays: 'Billing Interval Days',
    currencyID: 'Billing Currency',
    blockReason: 'Block Reason',
  };

  private contactLabelMap: Record<string, string> = {
    salutation: 'Salutation',
    name: 'Name',
    department: 'Department',
    emailId: 'Email',
    mobileNo: 'Mobile No',
    address: 'Address',
    pinCode: 'Pin Code',
    areaID: 'Area',
    city: 'City',
    state: 'State',
    country: 'Country',
  };

  private contactTypeLabel: Record<string, string> = {
    contact1: 'Contact Person 1',
    accountant: 'Accountant',
    dynamic: 'Additional Contact',
  };

  getInvalidFieldNames(): string[] {
    const labels: string[] = [];

    // Top-level fields
    Object.keys(this.customerForm.controls).forEach(key => {
      const control = this.customerForm.get(key);
      if (!control || control.valid || control.disabled) return;
      if (key === 'contactPersons') return; // handled below
      if (control instanceof FormArray) {
        labels.push(this.fieldLabelMap[key] || key);
        return;
      }
      if (control.invalid) {
        labels.push(this.fieldLabelMap[key] || key);
      }
    });

    // Contact persons — always validate contact1 and dynamic; skip accountant if name is empty
    this.contactPersonsArray.controls.forEach(c => {
      const group = c as FormGroup;
      const type = group.get('type')?.value || 'contact';
      const isAlwaysRequired = type === 'contact1' || type === 'dynamic';
      const hasData = !!group.get('name')?.value?.trim();
      if (!isAlwaysRequired && !hasData) return; // skip empty accountant only
      const invalidFields: string[] = [];
      Object.keys(group.controls).forEach(field => {
        const ctrl = group.get(field);
        if (ctrl && ctrl.invalid && !ctrl.disabled) {
          invalidFields.push(this.contactLabelMap[field] || field);
        }
      });
      if (invalidFields.length > 0) {
        const contactLabel = this.contactTypeLabel[type] || type;
        labels.push(`${contactLabel} (${invalidFields.join(', ')})`);
      }
    });

    return labels;
  }

  loadCustomer(): void {
    this.customerService.getCustomerById(this.customerId).subscribe({
      next: (response) => {
        this.contactPersonsArray.clear();

        // Separate contacts by type from API response
        const allContacts: any[] = response.contactPersons || [];
        const contact1Data = allContacts.find(c => c.type === 'contact1');
        const accountantData = allContacts.find(c => c.type === 'accountant');
        const dynamicsData = allContacts.filter(c => this.isMiddleContact(c.type));

        // Build FormArray: contact1 → dynamics → accountant (always last)
        this.contactPersonsArray.push(this.createContact('contact1'));
        dynamicsData.forEach(() => this.contactPersonsArray.push(this.createContact('dynamic', true)));
        this.contactPersonsArray.push(this.createContact('accountant'));

        // Populate company categories
        const companyCategoriesArray = this.customerCompanyCategoriesArray;
        companyCategoriesArray.clear();
        if (response.customerCompanyCategories?.length > 0) {
          response.customerCompanyCategories.forEach((category: any) => {
            companyCategoriesArray.push(this.createCompanyCategory(category));
          });
        }

        // Populate dispatch modes
        const dispatchModesArray = this.customerDispatchModesArray;
        dispatchModesArray.clear();
        if (response.customerDispatchModes?.length > 0) {
          response.customerDispatchModes.forEach((mode: any) => {
            dispatchModesArray.push(this.createDispatch(mode));
          });
        }

        // Patch scalar fields only (exclude FormArrays to prevent index-based corruption)
        const { contactPersons: _cp, customerCompanyCategories: _ccc, customerDispatchModes: _cdm, ...scalarFields } = response;
        this.customerForm.patchValue(scalarFields);

        // Re-apply conditional validators that depend on loaded values
        this.applyConditionalValidators(response);

        // Rebind currency dropdown
        if (response.currencyID) {
          this.currencyService.getDropdown('', 0, 100).subscribe({
            next: (list) => {
              const match = list.find((c: any) => c.id === response.currencyID);
              if (match) this.defaultCurrency = match;
            },
            error: () => {}
          });
        }

        this.fetchAreaData('pinCode', true);

        // Bind contact data — by type for fixed, by order within type-group for dynamics
        const bindContact = (data: any, type: string) => {
          const fg = this.contactPersonsArray.controls
            .find(c => c.get('type')?.value === type) as FormGroup | undefined;
          if (fg && data) {
            fg.patchValue(data);
            if (data.pinCode?.length === 6) this.fetchContactAreaData(fg);
          }
        };

        bindContact(contact1Data, 'contact1');
        bindContact(accountantData, 'accountant');

        const dynamicGroups = this.contactPersonsArray.controls
          .filter(c => c.get('type')?.value === 'dynamic') as FormGroup[];
        dynamicsData.forEach((contact, i) => {
          const fg = dynamicGroups[i];
          if (fg) {
            fg.patchValue(contact);
            if (contact.pinCode?.length === 6) this.fetchContactAreaData(fg);
          }
        });
      },
      error: (error) => {
        console.error('Error fetching customer data:', error);
      }
    });

    // Load pending change request and history
    this.customerService.getPendingChange(this.customerId).subscribe({
      next: r => {
        this.pendingChange = r ?? null;
        if (this.pendingChange) this.lockGroupBFields();
      },
      error: () => { this.pendingChange = null; }
    });
    this.customerService.getChangeRequests(this.customerId).subscribe({
      next: r => { this.changeHistory = r ?? []; },
      error: () => { this.changeHistory = []; }
    });
  }
  private applyConditionalValidators(data: any): void {
    // Relationship Credit Customer — credit limit fields required
    const amountCtrl = this.customerForm.get('creditLimitAmount');
    const timeCtrl   = this.customerForm.get('creditLimitTime');
    if (data.customerType === 'Relationship Credit Customer') {
      amountCtrl?.setValidators([Validators.required, Validators.min(1)]);
      timeCtrl?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      amountCtrl?.clearValidators();
      timeCtrl?.clearValidators();
    }
    amountCtrl?.updateValueAndValidity({ emitEvent: false });
    timeCtrl?.updateValueAndValidity({ emitEvent: false });

    // Constant discount percentage — required > 0 when constantDiscount is on
    const discountCtrl = this.customerForm.get('constantDiscountPercentage');
    if (data.constantDiscount) {
      discountCtrl?.setValidators([Validators.min(0.01), Validators.max(100)]);
    } else {
      discountCtrl?.clearValidators();
    }
    discountCtrl?.updateValueAndValidity({ emitEvent: false });

    // Billing every days — required when billingEvery is on
    const daysCtrl = this.customerForm.get('billingEveryDays');
    if (data.billingEvery) {
      daysCtrl?.setValidators([Validators.required, Validators.min(1), Validators.max(365)]);
    } else {
      daysCtrl?.clearValidators();
    }
    daysCtrl?.updateValueAndValidity({ emitEvent: false });

    // blockReason — required when customer is blocked
    const reasonCtrl = this.customerForm.get('blockReason');
    if (data.isBlock) {
      reasonCtrl?.setValidators([Validators.required, Validators.maxLength(250)]);
    } else {
      reasonCtrl?.clearValidators();
    }
    reasonCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  getCustomerTypes = (): any => {
    this.configService.getConfigurationValueBykey('Customer Type').subscribe({
      next: (res) => {
        if (res) {
          this.customerTypes = res;
        }
      },
      error: (err) => {
        console.error('Error fetching customer types:', err);
      }
    });
  }
  // ── Level 2 helpers ──────────────────────────────────────────────────────────

  private lockGroupBFields(): void {
    if (this.isViewMode) return;
    this.GROUP_B_FIELDS.forEach(f => this.customerForm.get(f)?.disable());
  }

  hasPendingChange(): boolean {
    return !!this.pendingChange;
  }

  getPendingNewValue(field: string): any {
    return this.pendingChange?.newValues?.[field];
  }

  getChangedFields(req: any): { label: string; oldValue: any; newValue: any }[] {
    const labels: Record<string, string> = {
      customerType: 'Customer Type',
      creditLimitAmount: 'Credit Limit Amount',
      creditLimitTime: 'Credit Limit (Days)',
      constantDiscount: 'Constant Discount',
      constantDiscountPercentage: 'Discount %',
      weeklyBillingCustomer: 'Weekly Billing',
      monthlyBillingCustomer: 'Monthly Billing',
      billingEvery: 'Billing Days',
      billingEveryDays: 'Billing Interval (Days)',
    };
    const result: { label: string; oldValue: any; newValue: any }[] = [];
    for (const key of Object.keys(labels)) {
      const oldVal = req.oldValues?.[key];
      const newVal = req.newValues?.[key];
      if (oldVal !== newVal && (oldVal !== null || newVal !== null)) {
        result.push({ label: labels[key], oldValue: oldVal ?? '—', newValue: newVal ?? '—' });
      }
    }
    return result;
  }

  getRequestStatusClass(status: string): string {
    switch (status) {
      case 'Approved':   return 'bg-success';
      case 'Rejected':   return 'bg-danger';
      case 'Pending':    return 'bg-warning text-dark';
      case 'Superseded': return 'bg-secondary';
      default:           return 'bg-secondary';
    }
  }

  verifyCustomer(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    var status = false;
    if (checkbox && checkbox.type === 'checkbox') {
      status = checkbox.checked;
    }
    this.customerService.verifyCustomer(this.customerId, status).subscribe({
      next: (res) => {
        this.toastService.show('Customer verified/unverified successfully', 'success');
        this.loadCustomer();
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Failed to verify customer', 'error');
      }
    });
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.customerForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.customerForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
