import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-sample-inward-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './sample-inward-form.component.html',
  styleUrl: './sample-inward-form.component.css'
})
export class SampleInwardFormComponent implements OnInit {
  masterForm!: FormGroup;

  witnessList: string[] = ['Witness A', 'Witness B', 'Witness C', 'Witness D'];
  sampleNumbers = ['25-052787', '25-052788', '25-052789', '25-052790', '25-052791'];
  testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];

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
      samplePlans: this.fb.array([]),
      sampleTestPlans: this.fb.array([]),
    });

    /* initialise table with one contact + one sample row */
    this.addContact();
    this.addTpiWitness();
    this.addAdditionalContact();
    this.addSample();

    // Initialize Additional Sample Details
    this.addAdditionalSampleRow('Sample Details');
    // Initialize Plan Table
    this.addPlanRow('Heat No');
    this.addPlanRow('Batch No');

    this.testTypeList = ['Spectro', 'Chemical', 'XRF', 'Full Analysis', 'ROHS'];

    this.sampleNumbers.forEach((sample, index) => {
      const generalTestGroup = this.createGeneralTestGroup();
      const productTestGroup = this.createProductTestGroup();
      const chemicalTestGroup = this.createChemicalTestGroup();

      // Add 1 method row for General & Product by default
      (generalTestGroup.get('methods') as FormArray).push(this.createTestMethodRow(`${sample}-${index + 1}`));
      (productTestGroup.get('methods') as FormArray).push(this.createTestMethodRow(`${sample}-${index + 1}`));

      this.sampleTestPlans.push(this.fb.group({
        sampleNo: [sample],
        generalTests: this.fb.array([generalTestGroup]),
        chemicalTests: this.fb.array([chemicalTestGroup]),
        productTests: this.fb.array([productTestGroup])
      }));
    });


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

  getAdditionSampleRowValues(rowIndex: number): FormControl[] {
    const row = this.sampleAdditionalDetails.at(rowIndex);
    const valuesArray = row.get('values') as FormArray;
    return valuesArray.controls as FormControl[];
  }
  addAdditionalSampleRow(label: string = ''): void {
    const valuesArray = this.fb.array(this.sampleNumbers.map(() => this.fb.control('')));
    this.sampleAdditionalDetails.push(
      this.fb.group({
        label: [label],
        enabled: [false], // ← checkbox control
        values: valuesArray
      })
    );
  }


  // --- 🔷 Dynamic Plan Section Logic ---
  get samplePlans(): FormArray {
    return this.masterForm.get('samplePlans') as FormArray;
  }


  addPlanRow(label: string = ''): void {
    const valuesArray = this.fb.array(this.sampleNumbers.map(() => this.fb.control('')));
    this.samplePlans.push(this.fb.group({ enabled:[false], label: [label], values: valuesArray }));
  }

  insertPlanRow(afterIndex: number): void {
    const newRow = this.fb.group({
      label: ['New Property'],
      values: this.fb.array(this.sampleNumbers.map(() => this.fb.control('')))
    });
    this.samplePlans.insert(afterIndex + 1, newRow);
  }

  getPlanRowValues(rowIndex: number): FormControl[] {
    const row = this.samplePlans.at(rowIndex);
    const valuesArray = row.get('values') as FormArray;
    return valuesArray.controls as FormControl[];
  }


  get sampleTestPlans(): FormArray {
    return this.masterForm.get('sampleTestPlans') as FormArray;
  }

  getTestArray(i: number, type: 'generalTests' | 'chemicalTests' | 'productTests'): FormArray {
    return this.sampleTestPlans.at(i).get(type) as FormArray;
  }

  getGeneralOrProductTestSection(i: number, type: 'generalTests' | 'productTests'): FormGroup {
    return (this.sampleTestPlans.at(i).get(type) as FormArray).at(0) as FormGroup;
  }

  getMethodRows(i: number, type: 'generalTests' | 'productTests'): FormArray {
    const sectionArray = this.sampleTestPlans.at(i).get(type) as FormArray;
    if (!sectionArray || sectionArray.length === 0) return this.fb.array([]);
    const section = sectionArray.at(0) as FormGroup;
    return section.get('methods') as FormArray;
  }

  addMethodRow(i: number, type: 'generalTests' | 'productTests'): void {
    const sampleNo = this.sampleTestPlans.at(i).get('sampleNo')?.value;
    this.getMethodRows(i, type).push(this.createTestMethodRow(`${sampleNo}-${i + 1}`));
  }

  createTestMethodRow(incrementSample: String | null): FormGroup {
    return this.fb.group({
      testMethod: [''],
      alternateMethod: [''],
      quantity: ['1'],
      reportNo: [''],
      ulrNo: [incrementSample ? incrementSample : ''],
      cancel: [false]
    });
  }

  asFormGroup(ctrl: AbstractControl | null): FormGroup {
    return ctrl as FormGroup;
  }

  // 🔧 Add Test Blocks
  addTestBlock(i: number, type: 'generalTests' | 'chemicalTests' | 'productTests'): void {
    const array = this.getTestArray(i, type);

    switch (type) {
      case 'generalTests':
        array.push(this.createGeneralTestGroup());
        break;

      case 'chemicalTests':
        array.push(this.createChemicalTestGroup());
        break;

      case 'productTests':
        array.push(this.createProductTestGroup());
        break;
    }
  }

  createGeneralTestGroup(): FormGroup {
    return this.fb.group({
      specification1: [''],
      specification2: [''],
      parameter: [''],
      methods: this.fb.array([])
    });
  }

  createChemicalTestGroup(): FormGroup {
    const testTypesGroup: { [key: string]: FormControl } = {};
    this.testTypeList.forEach(type => {
      testTypesGroup[type] = this.fb.control(false);
    });

    return this.fb.group({
      testTypes: this.fb.group(testTypesGroup),
      base: [''],
      specification1: [''],
      specification2: [''],
      testMethod: [''],
      elements: this.fb.array([])
    });
  }

  createProductTestGroup(): FormGroup {
    return this.fb.group({
      specification1: [''],
      specification2: [''],
      parameter: [''],
      methods: this.fb.array([])
    });
  }
  getElementRows(i: number): FormArray {
    return this.getTestArray(i, 'chemicalTests').at(0).get('elements') as FormArray;
  }

  addElementRow(i: number): void {
    this.getElementRows(i).push(this.fb.group({
      element: [''],
      selected: [false]
    }));
  }

  removeElementRow(i: number, j: number): void {
    this.getElementRows(i).removeAt(j);
  }


  // ---------- File Handling (Unchanged) ----------

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
