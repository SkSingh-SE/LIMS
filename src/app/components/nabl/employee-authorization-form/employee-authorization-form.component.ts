import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EmployeeAuthorizationService } from '../../../services/employee-authorization.service';
import { ToastService } from '../../../services/toast.service';
import { QuillModule } from 'ngx-quill';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

@Component({
    selector: 'app-employee-authorization-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
    templateUrl: './employee-authorization-form.component.html',
    styleUrl: './employee-authorization-form.component.css'
})
export class EmployeeAuthorizationFormComponent implements OnInit {
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

    departments = ['Chemical', 'Mechanical', 'Metallography', 'Non-Destructive Testing', 'Civil'];

    constructor(
        private fb: FormBuilder,
        private authService: EmployeeAuthorizationService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.route.url.subscribe(url => {
            const path = url[url.length - 2]?.path; // check edit/details
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
        this.authForm = this.fb.group({
            id: [0],
            formatNo: ['F-7', [Validators.required]],
            department: ['', [Validators.required]],
            personnelName: ['', [Validators.required]],
            uid: ['', [Validators.required]],
            equipment: ['', [Validators.required]],
            testMethodAuthorization: ['', [Validators.required]],
            testAuthorization: ['', [Validators.required]]
        });
    }

    loadData(): void {
        this.authService.getById(this.recordId).subscribe({
            next: (data) => {
                if (data) {
                    this.authForm.patchValue(data);
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

    onSubmit(): void {
        if (this.authForm.invalid) {
            this.authForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields.', 'warning');
            return;
        }

        const formData = this.authForm.getRawValue();

        if (this.isEditMode) {
            this.authService.update(this.recordId, formData).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.toastService.show(res.message, 'success');
                        this.router.navigate(['/employee/equipment-authorization/list']);
                    } else {
                        this.toastService.show(res.message, 'error');
                    }
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.show('Error updating authorization', 'error');
                }
            });
        } else {
            this.authService.create(formData).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.toastService.show(res.message, 'success');
                        this.router.navigate(['/employee/equipment-authorization/list']);
                    } else {
                        this.toastService.show(res.message, 'error');
                    }
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.show('Error creating authorization', 'error');
                }
            });
        }
    }
}
