import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeAuthorizationService } from '../../../services/employee-authorization.service';
import { ToastService } from '../../../services/toast.service';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { DepartmentService } from '../../../services/department.service';
import { EmployeeService } from '../../../services/employee.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
    selector: 'app-employee-authorization-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, SearchableDropdownComponent, NablSignatureSectionComponent],
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
            error: () => {}
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
            documentNo: [''],
            departmentId: [null, [Validators.required]],
            departmentName: [''],
            employeeId: [null, [Validators.required]],
            personnelName: ['', [Validators.required]],
            equipment: ['', [Validators.required]],
            testMethodAuthorization: ['', [Validators.required]],
            testAuthorization: ['', [Validators.required]],
            preparedBy: [''],
            reviewedBy: [''],
            approvedBy: ['']
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
                    this.authForm.patchValue(data);
                // Lock form if not in editable status
                const status = (data as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.authForm.disable();
                    this.isViewMode = true;
                }
                // Re-disable system fields (in case form was enabled for Draft/Rejected)
                this.authForm.get('formatNo')?.disable();
                this.authForm.get('documentNo')?.disable();
                this.authForm.get('issueNo')?.disable();
                this.authForm.get('revNo')?.disable();
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
        return this.employeeService.getEmployeeDropdown(term, page, pageSize);
    };

    onDepartmentSelected(item: any): void {
        this.authForm.patchValue({
            departmentId: item.id,
            departmentName: item.name
        });
    }

    onEmployeeSelected(item: any): void {
        this.authForm.patchValue({
            employeeId: item.id,
            personnelName: item.name,
            uid: item.additionalValues?.employeeCode || item.additionalValues?.code || ''
        });
    }

    onSubmit(): void {
        if (this.authForm.invalid) {
            this.authForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields.', 'warning');
            return;
        }

        const formData = this.authForm.getRawValue();
        this.isSubmitting = true;

        if (this.isEditMode) {
            this.authService.update(this.recordId, formData).subscribe({
                next: (res) => {
                    this.isSubmitting = false;
                    this.saved = true;
                    if (res.success) {
                        this.toastService.show(res.message, 'success');
                        this.router.navigate(['/employee/equipment-authorization/list']);
                    } else {
                        this.toastService.show(res.message, 'error');
                    }
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
                    if (res.success) {
                        this.toastService.show(res.message, 'success');
                        this.router.navigate(['/employee/equipment-authorization/list']);
                    } else {
                        this.toastService.show(res.message, 'error');
                    }
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
