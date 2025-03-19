import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeService } from '../../../services/employee.service';
@Component({
  selector: 'app-employee-form',
  imports: [FormsModule,CommonModule,ReactiveFormsModule],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.css',
})
export class EmployeeFormComponent {
  uploadedFiles: File[] = [];
  currentStep = signal(1);
  formHeaders: { key: number, label: string }[] = [
    { key: 1, label: 'Basic Details' },
    { key: 2, label: 'Qualification' },
    { key: 3, label: 'Documents' },
    { key: 4, label: 'Authorization' },
    { key: 5, label: 'Job Training' },
    { key: 6, label: 'Performance Record' },
    { key: 7, label: 'User Management' },
    { key: 8, label: 'User Permission' }
  ];
  areas = ["Area 1", "Area 2", "Area 3"];
  designations = ["Designation 1", "Designation 2", "Designation 3"];
  departments = ["Department 1", "Department 2", "Department 3"];
  reportingManagers = ["Manager 1", "Manager 2", "Manager 3"];
  maritalStatuses = ["Single", "Married", "Divorced", "Widowed"];
  bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  activeFormKey: number = 1;
  personalInfoForm!: FormGroup;

  constructor(private fb: FormBuilder,private employeeService:EmployeeService) {}

  ngOnInit() {
    this.personalInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      dateOfBirth: ['', Validators.required],
      bloodGroup: ['', Validators.maxLength(5)],
      mobileNo: ['', [Validators.required, Validators.maxLength(15)]],
      gender: ['', Validators.required],
      emergencyMobileNo: ['', Validators.maxLength(15)],
      emailId: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      maritalStatus: ['', Validators.required],
      spouseName: ['', Validators.maxLength(100)],
      fatherName: ['', Validators.maxLength(100)],
      motherName: ['', Validators.maxLength(100)],
      residentialAddressLine1: ['', Validators.required],
      residentialAddressLine2: [''],
      residentialPinCode: ['', Validators.required],
      residentialArea: ['', Validators.required],
      residentialCity: [{ value: '', disabled: true }, Validators.required],
      residentialState: [{ value: '', disabled: true }, Validators.required],
      residentialCountry: [{ value: '', disabled: true }, Validators.required],
      sameAsResidential: [false],
      permanentAddressLine1: [''],
      permanentAddressLine2: [''],
      permanentPinCode: [''],
      permanentArea: [''],
      permanentCity: [{ value: '', disabled: true }],
      permanentState: [{ value: '', disabled: true }],
      permanentCountry: [{ value: '', disabled: true }],
      panNumber: ['', Validators.maxLength(15)],
      bankName: ['', Validators.maxLength(100)],
      branch: ['', Validators.maxLength(100)],
      accountHolderName: ['', Validators.maxLength(100)],
      accountNumber: ['', Validators.maxLength(20)],
      ifscCode: ['', Validators.maxLength(15)],
      departmentID: [''],
      reportingManagerID: [''],
      designationID: [''],
      dateOfJoin: [''],
      relevantExperienceYears: [0],
    });
  }

  setActiveForm(key: number) {
    this.activeFormKey = key;
    this.currentStep.set(key);
  }

  submitForm() {
    if (this.personalInfoForm.valid) {
      console.log('Form Submitted', this.personalInfoForm.value);
      this.employeeService.createEmployee(this.personalInfoForm.value).subscribe(
        (response) => {
          console.log('Employee created:', response);
        },
        (error) => {
          console.error('Error creating employee:', error);
        }
      );
    } else {
      console.log('Form Invalid');
    }
  }

  limitLength(event: any, limit: number) {
    if (event.target.value.length > limit) {
      event.target.value = event.target.value.slice(0, limit);
    }
  }

  fetchLocationData(pinControl: string,cityControl: string, stateControl: string, countryControl: string) {
    let pinCode : string = this.personalInfoForm.get(pinControl)?.value.toString();
    if (pinCode.length === 6) {
      // Simulate API response
      const locationData = {
        city: "Bhopal",
        state: "Madhya Pradesh",
        country: "India"
      };

      this.personalInfoForm.patchValue({
        [cityControl]: locationData.city,
        [stateControl]: locationData.state,
        [countryControl]: locationData.country
      });
    }
  }

  copyResidentialAddress() {
    if (this.personalInfoForm.get('sameAsResidential')?.value) {
      this.personalInfoForm.patchValue({
        permanentAddressLine1: this.personalInfoForm.get('residentialAddressLine1')?.value,
        permanentAddressLine2: this.personalInfoForm.get('residentialAddressLine2')?.value,
        permanentPinCode: this.personalInfoForm.get('residentialPinCode')?.value,
        permanentArea: this.personalInfoForm.get('residentialArea')?.value,
        permanentState: this.personalInfoForm.get('residentialState')?.value,
        permanentCountry: this.personalInfoForm.get('residentialCountry')?.value
      });
    } else {
      this.personalInfoForm.patchValue({
        permanentAddressLine1: '',
        permanentAddressLine2: '',
        permanentPinCode: '',
        permanentArea: '',
        permanentState: '',
        permanentCountry: ''
      });
    }
  }
  
  // get qualifications(): FormArray {
  //   return this.employeeForm.get('qualifications') as FormArray;
  // }

  // addQualification() {
  //   const qualificationGroup = this.fb.group({
  //     school: ['', Validators.required],
  //     year: ['', Validators.required]
  //   });

  //   this.qualifications.push(qualificationGroup);
  // }

  // removeQualification(index: number) {
  //   this.qualifications.removeAt(index);
  // }

  // onFileSelected(event: any) {
  //   if (event.target.files.length > 0) {
  //     for (let file of event.target.files) {
  //       this.uploadedFiles.push(file);
  //     }
  //   }
  // }

 
}
