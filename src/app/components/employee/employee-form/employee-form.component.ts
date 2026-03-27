import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, signal , HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeService } from '../../../services/employee.service';
import { NumberOnlyDirective } from '../../../utility/directives/number-only.directive';
import { ToastService } from '../../../services/toast.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DesignationService } from '../../../services/designation.service';
import { DepartmentService } from '../../../services/department.service';
import { debounceTime, Observable, Subject, Subscription, switchMap } from 'rxjs';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { UserPermissionComponent } from '../user-permission/user-permission.component';
import { RoleService } from '../../../services/role.service';
import { AreaService } from '../../../services/area.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { EmployeeUserManagementComponent } from '../employee-user-management/employee-user-management.component';
import { EmployeeJobTrainingComponent } from '../employee-job-training/employee-job-training.component';
import { EmployeePerformanceRecordComponent } from '../employee-performance-record/employee-performance-record.component';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { EmployeeAuthorizationService } from '../../../services/employee-authorization.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';
@Component({
  selector: 'app-employee-form',
  imports: [FormsModule, CommonModule, RouterModule, ReactiveFormsModule, NumberOnlyDirective, SearchableDropdownComponent, UserPermissionComponent, EmployeeUserManagementComponent, EmployeeJobTrainingComponent, EmployeePerformanceRecordComponent, FormFieldErrorComponent],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.css',
})
export class EmployeeFormComponent implements CanComponentDeactivate {
  saved = false;

  isAdminUser: boolean = false;
  uploadedFiles: File[] = [];
  currentStep = signal(1);
  showPassword = signal(false);
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
  designationRoleName: string = '';
  submitted = false;
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

  // Authorization tab data
  authorizationRecords: any[] = [];
  authorizationLoading = false;
  authorizationLoaded = false;

  constructor(private fb: FormBuilder, private employeeService: EmployeeService, private areaService: AreaService, private toastService: ToastService, private route: ActivatedRoute, private router: Router, private designationService: DesignationService, private departmentService: DepartmentService, private roleService: RoleService, private authService: AuthService, private unsavedChangesService: UnsavedChangesService, private employeeAuthorizationService: EmployeeAuthorizationService) {
    this.isAdminUser = this.authService.getUserData()?.isAdmin || false;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.employeeId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };

    if (state && state.mode === 'view') {
      this.isViewMode = true;
    } else {
      this.isViewMode = false;
    }

    this.personalInfoForm = this.fb.group({
      id: [this.employeeId],
      name: ['', [Validators.required, Validators.maxLength(100), noWhitespaceValidator()]],
      dateOfBirth: ['', Validators.required],
      bloodGroup: ['', Validators.maxLength(5)],
      mobileNo: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[+]?\d{10,13}$/),
        ]
      ],
      gender: ['', Validators.required],
      emergencyMobileNo: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[+]?\d{10,13}$/),
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
      permanentAreaID: [null],
      permanentCity: [{ value: '', disabled: true }],
      permanentState: [{ value: '', disabled: true }],
      permanentCountry: [{ value: '', disabled: true }],
      panNumber: ['', [Validators.required, Validators.maxLength(10), Validators.minLength(10), Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],
      bankName: ['', Validators.maxLength(100)],
      branch: ['', Validators.maxLength(100)],
      accountHolderName: ['', Validators.maxLength(100)],
      accountNumber: ['', [Validators.maxLength(20), Validators.pattern(/^\d+$/)]],
      ifscCode: ['', [Validators.maxLength(11), Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
      departmentID: [null],
      reportingManagerID: [null],
      designationID: [null],
      dateOfJoin: [''],
      // roleID derived from Designation → Role (not a form field)
      password: ['', [Validators.required, Validators.minLength(6)]],
      relevantExperienceYears: [null, [Validators.min(0)]], // Ensures only positive values
      qualificationSummary: [''],
      experience: [''],
      trainingRecordsJson: [''],
      competencyLevel: [''],
    });

    this.qualificationForm = this.fb.group({
      qualifications: this.fb.array([]),
    });

    this.initForm();
    if (this.isViewMode) {
      this.personalInfoForm.disable();
      this.qualificationArray.controls.forEach(control => control.disable());
    }
    if (this.employeeId) {
      this.loadEmployee();
    }
  }


  setActiveForm(key: number) {
    if (this.employeeId > 0) {
      this.activeFormKey = key;
      this.currentStep.set(key);
      if (key === 4) {
        this.loadAuthorizationRecords();
      }
    } else if (this.activeFormKey !== key) {
      this.toastService.show('Please save the employee first.', 'warning');
    }
  }

  loadAuthorizationRecords(): void {
    if (!this.employeeId || this.authorizationLoaded) return;
    this.authorizationLoading = true;
    this.employeeAuthorizationService.getAll({
      PageNumber: 1,
      PageSize: 50,
      searchTerm: '',
      sortByColumn: 'id',
      sortOrder: 'desc',
      filter: [{ column: 'employeeId', type: 'equals', value: this.employeeId.toString(), value2: null }]
    }).subscribe({
      next: (res: any) => {
        this.authorizationRecords = res.items || [];
        this.authorizationLoading = false;
        this.authorizationLoaded = true;
      },
      error: () => {
        this.authorizationLoading = false;
        this.authorizationRecords = [];
      }
    });
  }
  loadEmployee() {
    this.employeeService.getEmployeeById(this.employeeId).subscribe({
      next: (data) => {
        this.personalInfoForm.patchValue(data);
        this.personalInfoForm.patchValue({
          dateOfBirth: this.formatDateForInput(data.dateOfBirth),
          dateOfJoin: this.formatDateForInput(data.dateOfJoin)
        });

        // Resolve role name from designation
        if (data.designation?.role?.name) {
          this.designationRoleName = data.designation.role.name;
        } else if (data.designationID) {
          this.designationService.getDesignationById(data.designationID).subscribe({
            next: (designation) => {
              this.designationRoleName = designation?.role?.name || '';
            },
            error: () => {
              this.designationRoleName = '';
            }
          });
        }

        this.setQualifications(data.qualifications || []);

        this.fetchAreaData('residentialPinCode', true, true);
        if (data.residentialPinCode !== data.permanentPinCode) {
          this.fetchAreaData('permanentPinCode', false, true);
        }

        this.loadEmployeeDocuments(data.documents || []);
      },
      error: (err) => {
        this.router.navigate(['/employee']);
        console.error('Error loading designation:', err);
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
  getRoles = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.roleService.getRoleDropdown(term, page, pageSize);
  }
  onDesignationSelected(item: any) {
    this.personalInfoForm.patchValue({ designationID: item.id });
    // Fetch designation details to resolve the role from Designation -> Role
    this.designationService.getDesignationById(item.id).subscribe({
      next: (designation) => {
        if (designation?.role?.name) {
          this.designationRoleName = designation.role.name;
        } else {
          this.designationRoleName = '';
        }
      },
      error: () => {
        this.designationRoleName = '';
      }
    });
  }
  onDepartmentSelected(item: any) {
    this.personalInfoForm.patchValue({ departmentID: item.id });
  }
  onEmployeeSelected(item: any) {
    this.personalInfoForm.patchValue({ reportingManagerID: item.id });
  }
  // Role is derived from Designation — no manual role selection

  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.personalInfoForm, path, this.submitted);
  }

  submitForm() {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.personalInfoForm);
    if (!this.personalInfoForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }
    if (this.employeeId) {
      // Update employee
      this.employeeService.updateEmployee(this.employeeId, this.personalInfoForm.value).subscribe({
        next: (response) => {
          this.saved = true;
          this.toastService.show(`${response.message || 'Employee updated successfully.'}`, 'success');
          this.router.navigate(['/employee']);
        },
        error: (error) => {
          console.error('Error updating employee:', error);
        }
      });
    } else {
      // Create new employee
      this.employeeService.createEmployee(this.personalInfoForm.value).subscribe({
        next: (response) => {
          this.saved = true;
          this.employeeId = response.id;
          this.toastService.show(`${response.message || 'Employee created successfully.'}`, 'success');
          this.router.navigate(['/employee']);
        },
        error: (error) => {
          console.error('Error creating employee:', error);
        }
      });
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
      this.areaService.getAreasWithPinCode(pinCode).subscribe({
        next: (response) => {
          if (isReseidential) {
            this.residentialAreas = response;
            if (updateOtherFields) {
              this.fetchLocationData('residentialAreaID', 'residentialCity', 'residentialState', 'residentialCountry', true);
              if (this.personalInfoForm.get('residentialPinCode')?.value === this.personalInfoForm.get('permanentPinCode')?.value) {
                this.permanentAreas = response;
                this.personalInfoForm.patchValue({ sameAsResidential: true });
                this.copyResidentialAddress();
              }
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
      this.permanentAreas = this.residentialAreas;
      this.personalInfoForm.patchValue({
        permanentAddressLine1: this.personalInfoForm.get('residentialAddressLine1')?.value,
        permanentAddressLine2: this.personalInfoForm.get('residentialAddressLine2')?.value,
        permanentPinCode: this.personalInfoForm.get('residentialPinCode')?.value,
        permanentAreaID: this.personalInfoForm.get('residentialAreaID')?.value,
        permanentCity: this.personalInfoForm.get('residentialCity')?.value,
        permanentState: this.personalInfoForm.get('residentialState')?.value,
        permanentCountry: this.personalInfoForm.get('residentialCountry')?.value
      });
    } else {
      this.permanentAreas = [];
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
    const group = this.fb.group({
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
          this.loadEmployee();
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

      let previewUrl = '';
      const reader = new FileReader();
      reader.onload = () => {
        previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);

      const control = (this.documentsForm.get('predefined') as FormGroup).get(key) as FormGroup;
      control.patchValue({
        file,
        FileName: file.name,
        previewUrl
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
        FileName: '',
        FilePath: ''
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
      FileName: '',
      FilePath: ''
    });
  }

  openFileInNewTab(filePath: string): void {
    if (filePath) {
      const baseUrl = environment.baseUrl;
      const fullUrl = baseUrl + filePath;
      window.open(fullUrl, '_blank');
    } else {

    }
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

    // 🔒 Disable the entire form if in view mode
    if (this.isViewMode) {
      this.documentsForm.disable();
    }
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


  canDeactivate(): Observable<boolean> | boolean {
    if (!(this.personalInfoForm?.dirty || this.qualificationForm?.dirty || this.documentsForm?.dirty) || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if ((this.personalInfoForm?.dirty || this.qualificationForm?.dirty || this.documentsForm?.dirty) && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
