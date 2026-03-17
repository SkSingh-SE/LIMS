// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { CustomerFeedbackFormComponent } from './customer-feedback-form.component';
import { CustomerFeedbackService } from '../../../../services/customer-feedback.service';

describe('CustomerFeedbackFormComponent', () => {
    let component: CustomerFeedbackFormComponent;
    let fixture: ComponentFixture<CustomerFeedbackFormComponent>;
    let mockCustomerFeedbackService: jasmine.SpyObj<CustomerFeedbackService>;
    let mockRouter: jasmine.SpyObj<Router>;

    const validData = {
        formatNo: 'F-41',
        docNo: 'DMSPL/F-41',
        issueNo: '01',
        issueDate: '2021-10-01',
        revNo: '00',
        revDate: '--',
        customerName: 'Test Corp',
        contactPerson: 'John Contact',
        date: '2026-03-13',
    };

    beforeEach(async () => {
        mockCustomerFeedbackService = jasmine.createSpyObj('CustomerFeedbackService', [
            'create',
            'update',
            'getById',
            'save',
        ]);
        mockCustomerFeedbackService.create.and.returnValue(of({ message: 'Saved' }));
        mockCustomerFeedbackService.save.and.returnValue(of({ message: 'Saved' }));
        mockCustomerFeedbackService.getById.and.returnValue(of(null));
        mockCustomerFeedbackService.update.and.returnValue(of({ message: 'Updated' }));

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [CustomerFeedbackFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
            providers: [
                { provide: CustomerFeedbackService, useValue: mockCustomerFeedbackService },
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

        fixture = TestBed.createComponent(CustomerFeedbackFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize feedbackForm on creation', () => {
        expect(component.feedbackForm).toBeDefined();
    });

    it('should default to create mode (isEditMode=false, isViewMode=false)', () => {
        expect(component.isEditMode).toBeFalse();
        expect(component.isViewMode).toBeFalse();
    });

    it('should have all required form controls', () => {
        const controls = component.feedbackForm.controls;
        expect(controls['formatNo']).toBeDefined();
        expect(controls['docNo']).toBeDefined();
        expect(controls['issueNo']).toBeDefined();
        expect(controls['issueDate']).toBeDefined();
        expect(controls['revNo']).toBeDefined();
        expect(controls['revDate']).toBeDefined();
        expect(controls['customerName']).toBeDefined();
        expect(controls['contactPerson']).toBeDefined();
        expect(controls['date']).toBeDefined();
    });

    it('should contain a ratings FormArray', () => {
        const ratingsArray = component.feedbackForm.get('ratings') as FormArray;
        expect(ratingsArray).toBeTruthy();
        expect(ratingsArray instanceof FormArray).toBeTrue();
    });

    it('should initialize ratings FormArray with feedback parameters', () => {
        const ratingsArray = component.feedbackForm.get('ratings') as FormArray;
        expect(ratingsArray.length).toBe(component.feedbackParameters.length);
    });

    it('should be invalid when required fields are empty', () => {
        component.feedbackForm.patchValue({
            customerName: '',
            contactPerson: '',
            date: '',
        });
        expect(component.feedbackForm.valid).toBeFalse();
    });

    it('should be valid when all required fields and ratings are filled', () => {
        component.feedbackForm.patchValue(validData);
        const ratingsArray = component.feedbackForm.get('ratings') as FormArray;
        ratingsArray.controls.forEach(ctrl => ctrl.patchValue({ rating: 5 }));
        expect(component.feedbackForm.valid).toBeTrue();
    });

    it('should pre-populate header fields with default values', () => {
        expect(component.feedbackForm.get('formatNo')?.value).toBe('F-47');
        expect(component.feedbackForm.get('issueNo')?.value).toBe('03');
        expect(component.feedbackForm.get('issueDate')?.value).toBe('2021-10-01');
        expect(component.feedbackForm.get('revNo')?.value).toBe('00');
        expect(component.feedbackForm.get('revDate')?.value).toBe('--');
    });

    it('should call service.create when submitting a new record', () => {
        component.feedbackForm.patchValue(validData);
        const ratingsArray = component.feedbackForm.get('ratings') as FormArray;
        ratingsArray.controls.forEach(ctrl => ctrl.patchValue({ rating: 4 }));
        component.isEditMode = false;
        component.onSubmit();
        expect(mockCustomerFeedbackService.create).toHaveBeenCalledWith(component.feedbackForm.value);
    });

    it('should call service.update when submitting in edit mode', () => {
        component.feedbackForm.patchValue(validData);
        const ratingsArray = component.feedbackForm.get('ratings') as FormArray;
        ratingsArray.controls.forEach(ctrl => ctrl.patchValue({ rating: 3 }));
        component.isEditMode = true;
        component.recordId = 7;
        component.onSubmit();
        expect(mockCustomerFeedbackService.update).toHaveBeenCalledWith(7, component.feedbackForm.value);
    });

    it('should not call any service method when form is invalid on submit', () => {
        component.feedbackForm.patchValue({ customerName: '', contactPerson: '', date: '' });
        component.onSubmit();
        expect(mockCustomerFeedbackService.create).not.toHaveBeenCalled();
        expect(mockCustomerFeedbackService.update).not.toHaveBeenCalled();
    });

    it('should navigate to /customer-feedback on cancel', () => {
        component.onCancel();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/customer-feedback']);
    });

    it('should toggle section open state', () => {
        const initial = component.openSections['customerInfo'];
        component.toggleSection('customerInfo');
        expect(component.openSections['customerInfo']).toBe(!initial);
    });

    it('should load record by id and patch form when in edit mode', () => {
        const serverData = { ...validData, comments: 'Good service' };
        mockCustomerFeedbackService.getById.and.returnValue(of(serverData));
        component.recordId = 4;
        component.isEditMode = true;
        component['loadRecord']();
        expect(mockCustomerFeedbackService.getById).toHaveBeenCalledWith(4);
        expect(component.feedbackForm.get('customerName')?.value).toBe('Test Corp');
    });

    it('should disable form in view mode after loading record', () => {
        mockCustomerFeedbackService.getById.and.returnValue(of(validData));
        component.recordId = 5;
        component.isViewMode = true;
        component['loadRecord']();
        expect(component.feedbackForm.disabled).toBeTrue();
    });

    it('should navigate after successful create', () => {
        mockCustomerFeedbackService.create.and.returnValue(of({ message: 'Saved' }));
        component.feedbackForm.patchValue(validData);
        const ratingsArray = component.feedbackForm.get('ratings') as FormArray;
        ratingsArray.controls.forEach(ctrl => ctrl.patchValue({ rating: 5 }));
        component.isEditMode = false;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/customer-feedback']);
    });

    it('should navigate after successful update', () => {
        mockCustomerFeedbackService.update.and.returnValue(of({ message: 'Updated' }));
        component.feedbackForm.patchValue(validData);
        const ratingsArray = component.feedbackForm.get('ratings') as FormArray;
        ratingsArray.controls.forEach(ctrl => ctrl.patchValue({ rating: 5 }));
        component.isEditMode = true;
        component.recordId = 6;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/customer-feedback']);
    });

    it('should expose ratingsArray getter returning FormArray', () => {
        expect(component.ratingsArray instanceof FormArray).toBeTrue();
    });
});
