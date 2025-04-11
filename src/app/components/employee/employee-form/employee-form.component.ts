import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeService } from '../../../services/employee.service';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DesignationService } from '../../../services/designation.service';
import { DepartmentService } from '../../../services/department.service';
import { debounceTime, Observable, Subject, Subscription, switchMap } from 'rxjs';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
@Component({
  selector: 'app-employee-form',
  imports: [FormsModule, CommonModule, ReactiveFormsModule, NumberOnlyDirective, SearchableDropdownComponent],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.css',
})
export class EmployeeFormComponent {
  uploadedFiles: File[] = [];
  currentStep = signal(1);
  isLoading = signal(false);
  employeeId!: number;
  isViewMode: boolean = false;
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
  designations: any[] = [];
  departments: any[] = [];
  reportingManagers: any[] = [];
  maritalStatuses = ["Single", "Married", "Divorced", "Widowed"];
  bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  activeFormKey: number = 1;
  residentialAreas: any[] = [];
  permanentAreas: any[] = [];
  // Define the form group
  personalInfoForm!: FormGroup;
  qualificationForm!: FormGroup;

  documentsForm!: FormGroup;
  fileMap: { [key: string]: File | null } = {};
  predefinedKeys = [
    'photo', 'aadharCard', 'panCard', 'appointmentLetter', 'employeeContract',
    'resume', 'confidentialityAgreement', 'signature'
  ];

  keyLabels: { [key: string]: string } = {
    photo: 'Photo',
    aadharCard: 'Aadhar card',
    panCard: 'PAN card',
    appointmentLetter: 'Appointment letter',
    employeeContract: 'Employee Contract',
    resume: 'Resume',
    confidentialityAgreement: 'Confidentiality Agreement',
    signature: 'Signature',
  };

  fileValidationRules: { [key: string]: { maxSizeMB: number; allowedTypes: string[] } } = {
    photo: { maxSizeMB: 1, allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] },
    aadharCard: { maxSizeMB: 2, allowedTypes: ['application/pdf', 'image/jpg', 'image/jpeg', 'image/png'] },
    panCard: { maxSizeMB: 2, allowedTypes: ['application/pdf', 'image/jpg', 'image/jpeg', 'image/png'] },
    appointmentLetter: { maxSizeMB: 5, allowedTypes: ['application/pdf'] },
    employeeContract: { maxSizeMB: 5, allowedTypes: ['application/pdf'] },
    resume: { maxSizeMB: 5, allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
    confidentialityAgreement: { maxSizeMB: 5, allowedTypes: ['application/pdf'] },
    signature: { maxSizeMB: 1, allowedTypes: ['image/png', 'image/jpg', 'image/jpeg'] }
  };

  documentList: any[] = [];


  constructor(private fb: FormBuilder, private employeeService: EmployeeService, private toastService: ToastService, private route: ActivatedRoute, private router: Router, private designationService: DesignationService, private departmentService: DepartmentService) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.employeeId = Number(params.get('id'));

      if (this.employeeId) {
        this.loadEmployee();
      }
    });
    const state = history.state as { mode?: string };
   
    if (state && state.mode === 'view') {
      this.isViewMode = true;
    } else {
      this.isViewMode = false;
    }

    this.personalInfoForm = this.fb.group({
      id: [this.employeeId],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      dateOfBirth: ['', Validators.required],
      bloodGroup: ['', Validators.maxLength(5)],
      mobileNo: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{10}$|^\d{11}$|^\d{12}$/),
        ]
      ],
      gender: ['', Validators.required],
      emergencyMobileNo: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{10}$|^\d{11}$|^\d{12}$/),
        ]
      ],
      emailId: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      maritalStatus: ['', Validators.required],
      spouseName: ['', Validators.maxLength(100)],
      fatherName: ['', Validators.maxLength(100)],
      motherName: ['', Validators.maxLength(100)],
      residentialAddressLine1: ['', Validators.required],
      residentialAddressLine2: [''],
      residentialPinCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      residentialAreaID: ['', Validators.required],
      residentialCity: [{ value: '', disabled: true }, Validators.required],
      residentialState: [{ value: '', disabled: true }, Validators.required],
      residentialCountry: [{ value: '', disabled: true }, Validators.required],
      sameAsResidential: [false],
      permanentAddressLine1: ['', Validators.required],
      permanentAddressLine2: [''],
      permanentPinCode: ['', Validators.pattern(/^\d{6}$/)],
      permanentAreaID: [''],
      permanentCity: [{ value: '', disabled: true }],
      permanentState: [{ value: '', disabled: true }],
      permanentCountry: [{ value: '', disabled: true }],
      panNumber: ['', [Validators.maxLength(10), Validators.minLength(10), Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],
      bankName: ['', Validators.maxLength(100)],
      branch: ['', Validators.maxLength(100)],
      accountHolderName: ['', Validators.maxLength(100)],
      accountNumber: ['', [Validators.maxLength(20), Validators.pattern(/^\d+$/)]],
      ifscCode: ['', [Validators.maxLength(11), Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
      departmentID: [''],
      reportingManagerID: [''],
      designationID: [''],
      dateOfJoin: [''],
      relevantExperienceYears: [null, [Validators.min(0)]], // Ensures only positive values
    });

    this.qualificationForm = this.fb.group({
      qualifications: this.fb.array([]),
    });

    this.initForm();
    
    if(this.isViewMode){

      this.personalInfoForm.disable();
      this.qualificationArray.controls.forEach(control => control.disable());
      this.documentsForm.disable();
    }
  }


  setActiveForm(key: number) {
    if(this.employeeId > 0){
      this.activeFormKey = key;
      this.currentStep.set(key);
    }
  }
  loadEmployee() {
    this.isLoading.set(true);
    this.employeeService.getEmployeeById(this.employeeId).subscribe({
      next: (data) => {
        this.personalInfoForm.patchValue(data);
        this.personalInfoForm.patchValue({
          dateOfBirth: this.formatDateForInput(data.dateOfBirth),
          dateOfJoin: this.formatDateForInput(data.dateOfJoin)
        });

        this.setQualifications(data.qualifications || []);

        this.fetchAreaData('residentialPinCode', true, true);
        if (data.residentialPinCode !== data.permanentPinCode) {
          this.fetchAreaData('permanentPinCode', false, true);
        }

        this.loadEmployeeDocuments(data.documents || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.router.navigate(['/employee']);
        console.error('Error loading designation:', err);
        this.isLoading.set(false);
        this.toastService.show("Something went wrong", 'error');
      }

    });
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  // Fetching data for the dropdown

  getDesignations = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.designationService.getDesignationDropdown(term, page, pageSize);
  };
  getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.departmentService.getDepartmentDropdown(term, page, pageSize);
  };
  getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.employeeService.getEmployeeDropdown(term, page, pageSize);
  };
  onDesignationSelected(item: any) {
    this.personalInfoForm.patchValue({ designationID: item.id });
  }
  onDepartmentSelected(item: any) {
    this.personalInfoForm.patchValue({ departmentID: item.id });
  }
  onEmployeeSelected(item: any) {
    this.personalInfoForm.patchValue({ reportingManagerID: item.id });
  }



  submitForm() {
    if (this.personalInfoForm.valid) {
      console.log('Form Submitted', this.personalInfoForm.value);

      if (this.employeeId) {
        // Update employee
        this.employeeService.updateEmployee(this.employeeId, this.personalInfoForm.value).subscribe({
          next: (response) => {
            this.toastService.show(`${response.message || 'Employee updated successfully.'}`, 'success');
            // Optional: refresh or redirect
          },
          error: (error) => {
            console.error('Error updating employee:', error);
            this.toastService.show(`${error?.error?.message || 'Error updating employee'}`, 'error');
          }
        });
      } else {
        // Create new employee
        this.employeeService.createEmployee(this.personalInfoForm.value).subscribe({
          next: (response) => {
            this.toastService.show(`${response.message || 'Employee created successfully.'}`, 'success');
            this.personalInfoForm.reset(); // Optional: reset form after save
          },
          error: (error) => {
            console.error('Error creating employee:', error);
            this.toastService.show(`${error?.error?.message || 'Error creating employee'}`, 'error');
          }
        });
      }

    } else {
      this.toastService.show('Form is invalid. Please check the fields.', 'warning');
      this.personalInfoForm.markAllAsTouched(); // Mark all controls to show validation errors
    }
  }



  limitLength(event: any, limit: number) {
    if (event.target.value.length > limit) {
      event.target.value = event.target.value.slice(0, limit);
    }
  }

  fetchAreaData(pinControl: string, isReseidential: boolean, updateOtherFields: boolean = false) {
    // Check if the pin code is valid
    let pinCode: string = this.personalInfoForm.get(pinControl)?.value.toString();
    if (pinCode.length === 6) {
      // Simulate API response
      this.employeeService.getAreasWithPinCode(pinCode).subscribe({
        next: (response) => {
          if (isReseidential) {
            this.residentialAreas = response;
            if (updateOtherFields) {
              this.fetchLocationData('residentialAreaID', 'residentialCity', 'residentialState', 'residentialCountry', true);
            }
          } else {
            this.permanentAreas = response;
            if (updateOtherFields) {
              this.fetchLocationData('permanentAreaID', 'permanentCity', 'permanentState', 'permanentCountry', false);
            }
          }

        },
        error: (err) => {
          console.error('Error fetching location data:', err);
        },
        complete: () => {
          console.log('Fetching complete!');
        }
      });
    }
  }
  fetchLocationData(areaControl: string, cityControl: string, stateControl: string, countryControl: string, isResidential: boolean) {
    let area: string = this.personalInfoForm.get(areaControl)?.value.toString();

    const locationData = isResidential ? this.residentialAreas.find((areaObj) => areaObj.areaId == area) : this.permanentAreas.find((areaObj) => areaObj.areaId == area);
    if (locationData) {
      this.personalInfoForm.patchValue({
        [cityControl]: locationData.cityName,
        [stateControl]: locationData.stateName,
        [countryControl]: locationData.countryName
      });
    }
  }

  copyResidentialAddress() {
    if (this.personalInfoForm.get('sameAsResidential')?.value) {
      this.personalInfoForm.patchValue({
        permanentAddressLine1: this.personalInfoForm.get('residentialAddressLine1')?.value,
        permanentAddressLine2: this.personalInfoForm.get('residentialAddressLine2')?.value,
        permanentPinCode: this.personalInfoForm.get('residentialPinCode')?.value,
        permanentAreaID: this.personalInfoForm.get('residentialAreaID')?.value,
        permanentState: this.personalInfoForm.get('residentialState')?.value,
        permanentCountry: this.personalInfoForm.get('residentialCountry')?.value
      });
    } else {
      this.personalInfoForm.patchValue({
        permanentAddressLine1: '',
        permanentAddressLine2: '',
        permanentPinCode: '',
        permanentAreaID: '',
        permanentState: '',
        permanentCountry: ''
      });
    }
  }


  get qualificationArray(): FormArray {
    return this.qualificationForm.get('qualifications') as FormArray;
  }

  setQualifications(qualifications: any[]) {
    this.qualificationArray.clear(); // Clear existing rows

    qualifications.forEach(q => {
      const group = this.fb.group({
        id: [q.id || 0],
        employeeId: [q.employeeID || 0],
        qualification: [q.qualification || ''],
        schoolOrUniversity: [q.schoolOrUniversity || ''],
        passingYear: [q.passingYear || '']
      });
  
      if (this.isViewMode) {
        group.disable(); // Disable the whole group in view mode
      }
  
      this.qualificationArray.push(group);
    });
  }

  createRow(data?: any): FormGroup {
    const group =  this.fb.group({
      id: [data?.id || 0],
      employeeId: [data?.employeeID || this.employeeId || 0],
      qualification: [data?.qualification || '', Validators.required],
      schoolOrUniversity: [data?.schoolOrUniversity || '', Validators.required],
      passingYear: [data?.passingYear || '', [Validators.required, Validators.min(1900)]],
    });
    if (this.isViewMode) {
      group.disable(); // Disable the new group if in view mode
    }
    return group;
  }

  addQualification(data?: any): void {
    this.qualificationArray.push(this.createRow(data));
  }

  removeQualification(index: number): void {
    this.qualificationArray.removeAt(index);
  }

  saveQualification(): void {
    if (this.qualificationForm.valid) {
      const payload = this.qualificationArray.value.map((item: any, index: number) => ({
        id: item?.id || 0,
        year: parseInt(item.passingYear, 10),
        employeeID: this.employeeId,
        ...item,
      }));
      this.employeeService.updateQualifications(payload).subscribe({
        next: (response) => {
          this.toastService.show(`${response.message || 'Qualification updated successfully.'}`, 'success');

        },
        error: (error) => {
          console.error('Error updating employee:', error);
          this.toastService.show(`${error?.error?.message || 'Error updating qualifications'}`, 'error');
        }
      });
    } else {
      this.qualificationForm.markAllAsTouched();
    }
  }

  initForm() {
    this.documentsForm = this.fb.group({
      predefined: this.fb.group({}),
      additionalDocuments: this.fb.array([])
    });

    // Add form controls for predefined keys
    const predefinedGroup = this.documentsForm.get('predefined') as FormGroup;
    this.predefinedKeys.forEach(key => {
      predefinedGroup.addControl(key, this.fb.group({
        DocumentType: [key],
        file: [null],
        FileName: [''],
        ID: [0],
        UploadReferenceID: [0],
        FilePath: [''],
        IsAdditional: [false]
      }));
    });
  }

  get additionalDocuments(): FormArray {
    return this.documentsForm.get('additionalDocuments') as FormArray;
  }

  addAdditionalDocument() {
    const group = this.fb.group({
      DocumentType: ['', Validators.required],
      file: [null, Validators.required],
      FileName: [''],
      ID: [0],
      UploadReferenceID: [0],
      FilePath: [''],
      IsAdditional: [true]
    });
    this.additionalDocuments.push(group);
  }

  removeAdditionalDocument(index: number) {
    this.additionalDocuments.removeAt(index);
  }

  onFileChange(event: any, key: string) {
    const file = event.target.files[0];
    if (file) {

      const rule = this.fileValidationRules[key];
      const maxSize = rule.maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        this.toastService.show(`File size for ${this.keyLabels[key]} should be less than ${rule.maxSizeMB} MB.`, 'warning');
        event.target.value = '';
        return;
      }

      if (!rule.allowedTypes.includes(file.type)) {
        this.toastService.show(`Invalid file type for ${this.keyLabels[key]}. Allowed types: ${rule.allowedTypes.join(', ')}`, 'warning');
        event.target.value = '';
        return;
      }

      const control = (this.documentsForm.get('predefined') as FormGroup).get(key) as FormGroup;
      control.patchValue({
        file,
        FileName: file.name
      });
    }
  }
  getAcceptType(key: string): string {
    const rules = this.fileValidationRules[key];
    return rules?.allowedTypes.join(',') || '';
  }
  removePredefinedFile(key: string): void {
    const control = this.documentsForm.get('predefined')?.get(key);
    if (control && control instanceof FormGroup) {
      control.patchValue({
        File: null,
        FileName: ''
      });
    }
  }



  onAdditionalFileChange(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toastService.show(`File size  should be less than ${5} MB.`, 'warning');
        event.target.value = '';
        return;
      }

      const group = this.additionalDocuments.at(index) as FormGroup;
      group.patchValue({
        file,
        FileName: file.name
      });
    }
  }
  removeAdditionalFile(index: number): void {
    const group = this.additionalDocuments.at(index) as FormGroup;
    group.patchValue({
      File: null,
      FileName: null
    });
  }

  openFileInNewTab(filePath: string): void {
    const baseUrl = 'https://localhost:7049/';
    const fullUrl = baseUrl + filePath;
    window.open(fullUrl, '_blank');
  }

  loadEmployeeDocuments(data: any[]) {
    this.documentList = data;

    const predefinedGroup = this.documentsForm.get('predefined') as FormGroup;
    data.filter(doc => !doc.isAdditional).forEach(doc => {
      if (predefinedGroup.contains(doc.documentType)) {
        predefinedGroup.get(doc.documentType)?.patchValue({
          ID: doc.id,
          FilePath: doc.filePath,
          FileName: doc.fileName,
          UploadReferenceID: doc.uploadReferenceID,
        });
      }
    });

    const additionalDocs = data.filter(doc => doc.isAdditional);
    additionalDocs.forEach(doc => {
      const group = this.fb.group({
        DocumentType: [doc.documentType],
        file: [null],
        FileName: [doc.fileName],
        ID: [doc.id],
        UploadReferenceID: [doc.uploadReferenceID],
        FilePath: [doc.filePath],
        IsAdditional: [true]
      });
      this.additionalDocuments.push(group);
    });
  }


  saveDocuments() {
    if (this.documentsForm.invalid) {
      this.toastService.show('Please fill all required fields.', 'warning');
      return;
    }
    const predefinedGroup = this.documentsForm.get('predefined') as FormGroup;
    const predefinedPayload = this.predefinedKeys.map(key => {
      const value = predefinedGroup.get(key)?.value;
      return {
        ...value,
        EmployeeID: this.employeeId,
        DocumentType: key,
        IsAdditional: false
      };
    });

    const additionalPayload = this.additionalDocuments.controls.map(control => {
      return {
        ...control.value,
        EmployeeID: this.employeeId,
        IsAdditional: true
      };
    });

    const payload = [...predefinedPayload, ...additionalPayload];

    const formData = new FormData();
    payload.forEach((doc, index) => {
      // Basic fields
      formData.append(`Documents[${index}].ID`, doc.ID);
      formData.append(`Documents[${index}].EmployeeID`, doc.EmployeeID);
      formData.append(`Documents[${index}].UploadReferenceID`, doc.UploadReferenceID);
      formData.append(`Documents[${index}].DocumentType`, doc.DocumentType);
      formData.append(`Documents[${index}].FileName`, doc.FileName || '');
      formData.append(`Documents[${index}].FilePath`, doc.FilePath || '');
      formData.append(`Documents[${index}].IsAdditional`, doc.IsAdditional);

      // Optional: format if needed
      formData.append(`Documents[${index}].UploadedOn`, new Date().toISOString());

      // File (only append if it exists and is a File type)
      if (doc.file && doc.file instanceof File) {
        formData.append(`Documents[${index}].file`, doc.file);
      }
    });
    // Now call API to update or create documents
    this.employeeService.updateDocuments(formData).subscribe({
      next: (response) => {
        this.additionalDocuments.clear();
        this.loadEmployee(); // Reload updated data
        this.initForm();
        this.toastService.show(`${response.message || 'Documents saved successfully!'}`, 'success');
      },
      error: (error) => {
        console.error('Error saving documents:', error);
        this.toastService.show(`${error?.error?.message || 'Error saving documents'}`, 'error');
      }
    });
  }

}
