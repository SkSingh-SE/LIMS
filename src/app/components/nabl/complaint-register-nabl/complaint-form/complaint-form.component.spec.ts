// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ComplaintFormComponent } from './complaint-form.component';
import { ComplaintService } from '../../../../services/complaint.service';

describe('ComplaintFormComponent', () => {
    let component: ComplaintFormComponent;
    let fixture: ComponentFixture<ComplaintFormComponent>;
    let mockComplaintService: jasmine.SpyObj<ComplaintService>;
    let mockRouter: jasmine.SpyObj<Router>;

    const validData = {
        formatNo: 'F-40',
        docNo: 'DMSPL/F-40',
        issueNo: '03',
        issueDate: '2021-10-01',
        revNo: '00',
        revDate: '--',
        monthYear: 'March 2026',
        complaintNo: 'CMP-001',
        dateOfComplaint: '2026-03-13',
        complainantName: 'Test Customer',
        detailsOfComplaint: 'Test result was incorrect',
    };

    beforeEach(async () => {
        mockComplaintService = jasmine.createSpyObj('ComplaintService', ['create', 'update', 'getById', 'save']);
        mockComplaintService.create.and.returnValue(of({ message: 'Saved' }));
        mockComplaintService.save.and.returnValue(of({ message: 'Saved' }));
        mockComplaintService.getById.and.returnValue(of(null));
        mockComplaintService.update.and.returnValue(of({ message: 'Updated' }));

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [ComplaintFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
            providers: [
                { provide: ComplaintService, useValue: mockComplaintService },
                { provide: Router, useValue: mockRouter },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({})),
                        snapshot: { paramMap: convertToParamMap({}), url: [] },
                    },
                },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(ComplaintFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize complaintForm on creation', () => {
        expect(component.complaintForm).toBeDefined();
    });

    it('should default to create mode (isEditMode=false, isViewMode=false)', () => {
        expect(component.isEditMode).toBeFalse();
        expect(component.isViewMode).toBeFalse();
    });

    it('should have all required form controls', () => {
        const controls = component.complaintForm.controls;
        expect(controls['formatNo']).toBeDefined();
        expect(controls['docNo']).toBeDefined();
        expect(controls['issueNo']).toBeDefined();
        expect(controls['issueDate']).toBeDefined();
        expect(controls['revNo']).toBeDefined();
        expect(controls['revDate']).toBeDefined();
        expect(controls['monthYear']).toBeDefined();
        expect(controls['complaintNo']).toBeDefined();
        expect(controls['dateOfComplaint']).toBeDefined();
        expect(controls['complainantName']).toBeDefined();
        expect(controls['detailsOfComplaint']).toBeDefined();
    });

    it('should be invalid when required fields are empty', () => {
        component.complaintForm.patchValue({
            monthYear: '',
            complaintNo: '',
            dateOfComplaint: '',
            complainantName: '',
            detailsOfComplaint: '',
        });
        expect(component.complaintForm.valid).toBeFalse();
    });

    it('should be valid when all required fields are filled', () => {
        component.complaintForm.patchValue(validData);
        expect(component.complaintForm.valid).toBeTrue();
    });

    it('should pre-populate header fields with default values', () => {
        expect(component.complaintForm.get('formatNo')?.value).toBe('F-40');
        expect(component.complaintForm.get('issueNo')?.value).toBe('03');
        expect(component.complaintForm.get('issueDate')?.value).toBe('2021-10-01');
        expect(component.complaintForm.get('revNo')?.value).toBe('00');
        expect(component.complaintForm.get('revDate')?.value).toBe('--');
    });

    it('should call service.create when submitting a new record', () => {
        component.complaintForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockComplaintService.create).toHaveBeenCalledWith(component.complaintForm.value);
    });

    it('should call service.update when submitting in edit mode', () => {
        component.complaintForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 5;
        component.onSubmit();
        expect(mockComplaintService.update).toHaveBeenCalledWith(5, component.complaintForm.value);
    });

    it('should not call any service method when form is invalid on submit', () => {
        component.complaintForm.patchValue({ monthYear: '', complainantName: '' });
        component.onSubmit();
        expect(mockComplaintService.create).not.toHaveBeenCalled();
        expect(mockComplaintService.update).not.toHaveBeenCalled();
    });

    it('should navigate to /complaint-register on cancel', () => {
        component.onCancel();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/complaint-register']);
    });

    it('should toggle section open state', () => {
        const initial = component.openSections['header'];
        component.toggleSection('header');
        expect(component.openSections['header']).toBe(!initial);
    });

    it('should load record by id and patch form when in edit mode', () => {
        mockComplaintService.getById.and.returnValue(of(validData));
        component.recordId = 1;
        component.isEditMode = true;
        component['loadRecord']();
        expect(mockComplaintService.getById).toHaveBeenCalledWith(1);
        expect(component.complaintForm.get('complaintNo')?.value).toBe('CMP-001');
    });

    it('should disable form in view mode after loading record', () => {
        mockComplaintService.getById.and.returnValue(of(validData));
        component.recordId = 2;
        component.isViewMode = true;
        component['loadRecord']();
        expect(component.complaintForm.disabled).toBeTrue();
    });

    it('should navigate after successful create', () => {
        mockComplaintService.create.and.returnValue(of({ message: 'Saved' }));
        component.complaintForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/complaint-register']);
    });

    it('should navigate after successful update', () => {
        mockComplaintService.update.and.returnValue(of({ message: 'Updated' }));
        component.complaintForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 3;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/complaint-register']);
    });
});
