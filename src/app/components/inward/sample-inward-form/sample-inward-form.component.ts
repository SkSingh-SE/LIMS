import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { basePlacements } from '@popperjs/core';

@Component({
  selector: 'app-sample-inward-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MultiSelectDropdownComponent],
  templateUrl: './sample-inward-form.component.html',
  styleUrl: './sample-inward-form.component.css'
})
export class SampleInwardFormComponent implements OnInit {
  masterForm!: FormGroup;

  witnessList: string[] = ['Witness A', 'Witness B', 'Witness C', 'Witness D'];

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.masterForm = this.fb.group({
      /* ── CUSTOMER ────────────────────────────── */
      customerDetails: this.fb.group({
        customerName: ['', Validators.required],
        address: [''],
        state: [''],
        city: [''],
        pinCode: [''],
        country: ['India'],
        gstNo: [''],
        gstNotApplicable: [false],
        customerType: ['Walk In'],
        email: [false],
        whatsapp: [false],
        courier: [false],
        pickup: [false],
        dispatchMode: ['Courier'],
        sampleReturn: ['No'],
        advancePayment: [''],
        billRequired: ['No'],
        advancePIRequired: ['No'],
        holdTesting: [false],
        stampedBy: [''],
        sealedBy: [''],
        contacts: this.fb.array([]),
        tpiWitnesses: this.fb.array([]),
        conformityRequired: [false],
        courierAddress: [''],
        sameAsBillingAddress: [false],
        holdTestingUntilPiApproved: [false],
      }),

      /* ── COMPANY ─────────────────────────────── */
      companyDetails: this.fb.group({
        tallyLedgerName: [''],
        sameAsCustomerName: [false],
        typeOfCompany: [''],
        vendorCode: [''],
        specialAccountingCase: [''],
        creditLimitAmount: [''],
        creditLimitTime: [''],
        specialDiscount: [false],
        companyVerified: [false],
        monthlyBilling: [false],
        mandatoryPerformaInvoiceWithMonthlyBilling: [false],
      }),

      additionalCustomerDetails: this.fb.group({
        collectionTime: [{ value: this.getCurrentTime(), disabled: true }],
        collectionDate: [''],
        reportIssuedTo: [''],
        reportAddress: [''],
        country: ['India'],
        state: [''],
        city: [''],
        pinCode: [''],
        dispatchMode: ['Email'],
        contacts: this.fb.array([]),
      }),

      /* ── SAMPLES ─────────────────────────────── */
      sampleDetails: this.fb.array([]),
      sampleAdditionalDetails: this.fb.array([]),
      planDetails: this.fb.array([]),
    });

    /* initialise table with one contact + one sample row */
    this.addContact();
    this.addTpiWitness();
    this.addAdditionalContact();
    this.addSample();
    this.addAdditionalSample();

    this.addPlan();
    this.addPlan();
  }
  /* ---------- Time Helpers ------------------- */
  getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /* ---------- Form Controls ------------------- */
  get customerDetails(): FormGroup {
    return this.masterForm.get('customerDetails') as FormGroup;
  }

  /* ---------- Contact Helpers ----------------- */
  get contactControls(): FormArray {
    return this.masterForm.get('customerDetails.contacts') as FormArray;
  }

  addContact(): void {
    this.contactControls.push(
      this.fb.group({
        name: [''],
        department: [''],
        mobile: [''],
        email: [''],
      }),
    );
  }

  removeContact(i: number): void {
    this.contactControls.removeAt(i);
  }

  get tpiWitnesses(): FormArray {
    return this.customerDetails.get('tpiWitnesses') as FormArray;
  }

  addTpiWitness(): void {
    const witnessGroup = this.fb.group({
      witnessName: [''],
      email: ['']
    });
    this.tpiWitnesses.push(witnessGroup);
  }

  removeTpiWitness(index: number): void {
    this.tpiWitnesses.removeAt(index);
  }

  get additionalContactControls(): FormArray {
    return this.masterForm.get('additionalCustomerDetails.contacts') as FormArray;
  }

  addAdditionalContact(): void {
    this.additionalContactControls.push(
      this.fb.group({
        enabled: [true],
        name: [''],
        department: [''],
        mobile: [''],
        email: [''],
      }),
    );
  }
  removeAdditionalContact(i: number): void {
    this.additionalContactControls.removeAt(i);
  }

  /* ---------- Sample Helpers ------------------ */
  get sampleDetails(): FormArray {
    return this.masterForm.get('sampleDetails') as FormArray;
  }
  get sampleAdditionalDetails(): FormArray {
    return this.masterForm.get('sampleAdditionalDetails') as FormArray;
  }

  addSample(): void {
    this.sampleDetails.push(
      this.fb.group({
        labNo: [`Auto-${this.sampleDetails.length + 1}`],
        details: ['', Validators.required],
        identification: [''],
        nature: ['', Validators.required],
        remarks: [''],
        quantity: [1],
        attachPhoto: [false],
        disabled: [false],
      }),
    );
  }
  removeSample(i: number): void {
    this.sampleDetails.removeAt(i);
  }
  addAdditionalSample(): void {
    this.sampleAdditionalDetails.push(
      this.fb.group({
        labNo: [`Auto-${this.sampleAdditionalDetails.length + 1}`],
        details: ['', Validators.required],
        nature: ['', Validators.required],
        includeIdentification: [''],
        heatNo: [''],
        batchNo: [''],
        size: [''],
      }),
    );
  }

  get planDetails(): FormArray {
    return this.masterForm.get('planDetails') as FormArray;
  }

  addPlan(): void {
    this.planDetails.push(
      this.fb.group({
        sampleNo: ['24-003758'],
        sampleDetails: ['abc'],
        heatNo: ['H0239859'],
        batchNo: [''],
        size: [''],
        sampleIdentification: [true],
        includeHeatNo: [true],
        includeBatchNo: [false],
        includeSize: [false],
        parameters: this.fb.array([this.fb.control('')]), // multiple parameters
      })
    );
  }

  getParametersArray(index: number): FormArray {
    return this.planDetails.at(index).get('parameters') as FormArray;
  }

  addParameter(index: number): void {
    this.getParametersArray(index).push(this.fb.control(''));
  }

  removeParameter(index: number, paramIndex: number): void {
    this.getParametersArray(index).removeAt(paramIndex);
  }


  uploadedFile: File | null = null;

  onFileUpload(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.uploadedFile = file;
    }
  }

  removeAttachment(): void {
    this.uploadedFile = null;
  }
  onUploadSampleImage(index: number): void {
    const labNo = this.sampleDetails.at(index).get('labNo')?.value;
    alert(`Upload image for Sample: ${labNo}`);
    // TODO: Implement file dialog or image uploader
  }


  /* ---------- Submit -------------------------- */
  onSubmit(): void {
    if (this.masterForm.valid) {
      console.table(this.masterForm.value);
    } else {
      this.masterForm.markAllAsTouched();
    }
  }
}
