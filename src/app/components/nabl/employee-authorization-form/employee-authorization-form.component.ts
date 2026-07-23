import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule, FormatWidth } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeAuthorizationService } from '../../../services/employee-authorization.service';
import { ToastService } from '../../../services/toast.service';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable, of } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../services/department.service';
import { EmployeeService } from '../../../services/employee.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import test from '@playwright/test';

@Component({
    selector: 'app-employee-authorization-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, SearchableDropdownComponent, NablSignatureSectionComponent, MultiSelectDropdownComponent],
    templateUrl: './employee-authorization-form.component.html',
    styleUrl: './employee-authorization-form.component.css'
})
export class EmployeeAuthorizationFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    isSubmitting = false;
    authForm!: FormGroup;
    recordId: number = 0;
    isEditMode: boolean = false;
    isViewMode: boolean = false;
    formTitle = 'Create Equipment Authorization';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();

    openSections: { [key: string]: boolean } = {
        details: true,
        equipment: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private authService: EmployeeAuthorizationService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private departmentService: DepartmentService,
        private employeeService: EmployeeService
        ,
        private nablHeaderService: NablHeaderService) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('EmployeeAuthorization').subscribe({
            next: (defaults) => {
                this.authForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.route.url.subscribe(url => {
            const path = url[url.length - 2]?.path;
            if (path === 'details') {
                this.isViewMode = true;
                this.formTitle = 'View Equipment Authorization';
                this.authForm.disable();
            } else if (path === 'edit') {
                this.isEditMode = true;
                this.formTitle = 'Edit Equipment Authorization';
            }
        });

        this.route.params.subscribe(params => {
            this.recordId = +params['id'];
            if (this.recordId) {
                this.loadData();
            }
        });
    }

    initForm(): void {
        const today = new Date().toISOString().split('T')[0];
        this.authForm = this.fb.group({
            id: [0],
            formatNo: ['F-7'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [today, Validators.required],
            documentNo: ['F-7'],
            departmentId: [null, [Validators.required]],
            departmentName: [''],
            employeeId: [null, [Validators.required]],
            personnelName: ['', [Validators.required]],
            // equipment: ['', [Validators.required]],
            preparedBy: [''],
            approvedBy: [null],
            reviewedBy: [null],
            approvedDate: [''],
            preparedDate: [this.today],
            reviewedDate: [''],
            employeeEquipmentAuth: this.fb.array([], Validators.required),
            testMethodAuth: this.fb.array([], Validators.required),
            labTestAuth: this.fb.array([], Validators.required),
            labTestIds: [[]],
            equipmentIds: [[]],
            testMethodIds: [[]]
        });

        // System-managed fields — always readonly
        this.authForm.get('formatNo')?.disable();
        this.authForm.get('documentNo')?.disable();
        this.authForm.get('issueNo')?.disable();
        this.authForm.get('revNo')?.disable();
    }

    
    loadData(): void {
        this.authService.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    // 1. Clear existing FormArrays
                    this.employeeEquipmentAuth.clear();
                    this.testMethodAuth.clear();
                    this.labTestAuth.clear();
                    let employeeIds: any[] = [];
                    // 2. Load Employee Equipment (Mapping exactly like onEquipmentSelected)
                    data.employeeEquipmentAuth?.forEach((x: any) => {
                        const combinedName = `${x.uid || ''} / ${x.equipmentName || ''}`;
                        this.employeeEquipmentAuth.push(this.fb.group({
                            UID: [x.uid || ''],
                            EmployeeAuthorizationID: [data.id || 0],
                            Name: [combinedName], // Dropdown match ke liye slash format
                            EquipmentId: [x.equipmentId],
                            EquipmentName: [x.equipmentName || '']
                        }));
                        employeeIds.push(x.EquipmentId || x.equipmentId);
                    });
                    this.authForm.get('equipmentIds')?.setValue(employeeIds);

                    // 3. Load Lab Test Auth (Mapping like onLabTestsSelected)
                    let selectIds: any[] = [];
                    data.labTestAuth.forEach((x: any) => {
                        this.labTestAuth.push(this.fb.group({
                            EmployeeAuthorizationID: [data.id || 0],
                            // Backend se aane wali property check karein (labTestName)
                            LabTestName: [x.labTestName || x.LabTestName || ''],
                            LabTestId: [x.labTestId || x.LabTestId]
                        }));
                        selectIds.push(x.labTestId || x.LabTestId);
                    });
                    this.authForm.get('labTestIds')?.setValue(selectIds); // Hidden field me selected IDs set karo

                    let testMethodSpecIds: any[] = [];
                    // 4. Load Test Method Auth (Mapping like onTestMethodSelected)
                    data.testMethodAuth?.forEach((x: any) => {
                        this.testMethodAuth.push(this.fb.group({
                            EmployeeAuthorizationID: [data.id || 0],
                            TestMethodName: [x.testMethodName || ''],
                            TestMethodId: [x.testMethodId]
                        }));
                        testMethodSpecIds.push(x.testMethodId);
                    });
                    this.authForm.get('testMethodIds')?.setValue(testMethodSpecIds);
                    // 5. Patch remaining single fields
                    const formValues = { ...data };
                    formValues.date = NablFormsHelper.formatDateForInput(data.date);
                    this.authForm.patchValue(formValues);

                    // 6. Sync UI
                    this.ReloadKey++;


                    // Lock logic
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.authForm.disable();
                        this.isViewMode = true;
                    }

                    // System fields disable
                    ['formatNo', 'documentNo', 'issueNo', 'revNo'].forEach(key => {
                        this.authForm.get(key)?.disable();
                    });
                    setTimeout(() => {
                        this.ReloadKey++;
                        console.log("UI Synced with Department ID:", data.departmentId);
                    }, 500); // 200ms ka delay safe hai

                } else {
                    this.toastService.show('Authorization not found', 'error');
                    this.router.navigate(['/employee/equipment-authorization/list']);
                }
            },
            error: (err) => {
                console.error(err);
                this.toastService.show('Error loading authorization', 'error');
            }
        });
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    // ─── Dropdown Data Functions ───
    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };

    getEmployees = (term: string, page: number, pageSize: number): Observable<any[]> => {
        const deptId = this.authForm.get('departmentId')?.value;

        // IMPORTANT: Agar departmentId null hai toh API call mat karo, seedha empty array bhej do
        if (!deptId) {
            return of([]);
        }

        return this.employeeService.getEmployeeDropdown(term, page, pageSize, deptId);
    };
    fetchEquipmentList = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Replace with actual service call to fetch equipment list
        return this.employeeService.getEquipmentDropdown(term, page, pageSize);
    }
    fetchTestMethods = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Replace with actual service call to fetch test methods
        return this.employeeService.getTestMethodsDropdown(term, page, pageSize);
    }
    fetchLabTests = (term: string, page: number, pageSize: number): Observable<any[]> => {
        // Replace with actual service call to fetch lab tests
        const deptId = this.authForm.get('departmentId')?.value;
        if (!deptId) {
            return of([]);
        }
        return this.employeeService.getLabTestsDropdown(term, page, pageSize, deptId);
    }

    ReloadKey = 0; // Dropdown reset karne ke liye key
    onDepartmentSelected(event: any) {
        // 1. Form values clear karein
        this.authForm.patchValue({
            departmentId: event?.id || null,
            departmentName: event?.name || '',
            employeeId: null,
            personnelName: '',

        });
        this.labTestAuth.clear();
        // 2. ReloadKey ko increment karein (Isse dropdown ko signal milega reset hone ka)
        this.ReloadKey++;

        console.log("Department changed, reloading employee dropdown...");
    }

    get employeeEquipmentAuth(): FormArray {
        return this.authForm.get('employeeEquipmentAuth') as FormArray;
    }
    get testMethodAuth(): FormArray {
        return this.authForm.get('testMethodAuth') as FormArray;
    }
    get labTestAuth(): FormArray {
        return this.authForm.get('labTestAuth') as FormArray;
    }
    onEquipmentSelected(item: any[]) {
        this.employeeEquipmentAuth.clear(); // Clear existing FormArray
        item.forEach((x) => {
            const additinal = x.additionalValues || {};
            this.employeeEquipmentAuth.push(
                this.fb.group({
                    // MetalClassificationID: [this.authForm.get('id')?.value || 0],
                    // Id: [x.id || x.Id], // Backend ID check
                    UID: [additinal['EquipmentNo '] || additinal['equipmentNo'] || ''],
                    EmployeeAuthorizationID: [this.authForm.get('id')?.value || 0],
                    Name: [x.name || ''],
                    EquipmentId: [x.id || x.Id],
                    EquipmentName: [additinal['EquipmentName'] || additinal['equipmentName'] || '']
                })

            );
        });
    }

    onTestMethodSelected(item: any[]) {
        this.testMethodAuth.clear(); // Clear existing FormArray
        item.forEach((x) => {
            this.testMethodAuth.push(
                this.fb.group({
                    EmployeeAuthorizationID: [this.authForm.get('id')?.value || 0],
                    // Id: [x.id || x.Id], // Backend ID check
                    TestMethodName: [x.name || ''],
                    TestMethodId: [x.id || x.Id]
                })
            );
        });
    }
    onLabTestsSelected(item: any[]) {
        this.labTestAuth.clear(); // Clear existing FormArray
        item.forEach((x) => {
            this.labTestAuth.push(
                this.fb.group({
                    EmployeeAuthorizationID: [this.authForm.get('id')?.value || 0],
                    LabTestName: [x.name || ''],
                    LabTestId: [x.id || x.Id]
                })
            );
        }
        );
    }
    onEmployeeSelected(item: any): void {
        if (!item) {
            this.authForm.patchValue({ employeeId: null, personnelName: '', uid: '' });
            return;
        }
        this.authForm.patchValue({
            employeeId: item.id,
            personnelName: item.name,
            uid: item.additionalValues?.employeeCode || item.additionalValues?.code || ''
        });
        console.log(this.labTestAuth.value);
    }

    onSubmit(): void {
        if (this.authForm.invalid) {
            this.authForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields.', 'warning');
            return;
        }

        const formData = this.authForm.getRawValue();
        this.isSubmitting = true;
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.authService.update(this.recordId, formData).subscribe({
                next: (res) => {
                    this.isSubmitting = false;
                    this.saved = true;
                    this.toastService.show('Employee Authorization updated successfully', 'success');
                    this.router.navigate(['/employee/equipment-authorization/list']);
                },
                error: (err) => {
                    this.isSubmitting = false;
                    console.error(err);
                    this.toastService.show('Error updating authorization', 'error');
                }
            });
        } else {
            this.authService.create(formData).subscribe({
                next: (res) => {
                    this.isSubmitting = false;
                    this.saved = true;
                    this.toastService.show('Employee Authorization created successfully', 'success');
                    this.router.navigate(['/employee/equipment-authorization/list']);
                },
                error: (err) => {
                    this.isSubmitting = false;
                    console.error(err);
                    this.toastService.show('Error creating authorization', 'error');
                }
            });
        }
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.authForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.authForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
