// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { NonConformingWorkFormComponent } from './non-conforming-work-form.component';
import { NonConformingWorkService } from '../../../../services/non-conforming-work.service';

describe('NonConformingWorkFormComponent', () => {
    let component: NonConformingWorkFormComponent;
    let fixture: ComponentFixture<NonConformingWorkFormComponent>;
    let mockNonConformingWorkService: jasmine.SpyObj<NonConformingWorkService>;
    let mockRouter: jasmine.SpyObj<Router>;

    const validData = {
        formatNo: 'F-47',
        docNo: 'DMSPL/F-47',
        issueNo: '01',
        issueDate: '2021-10-01',
        revNo: '00',
        revDate: '--',
        dateMonthYear: 'March 2026',
        ncDetail: 'Test result exceeded tolerance',
    };

    beforeEach(async () => {
        mockNonConformingWorkService = jasmine.createSpyObj('NonConformingWorkService', [
            'create',
            'update',
            'getById',
            'save',
        ]);
        mockNonConformingWorkService.create.and.returnValue(of({ message: 'Saved' }));
        mockNonConformingWorkService.save.and.returnValue(of({ message: 'Saved' }));
        mockNonConformingWorkService.getById.and.returnValue(of(null));
        mockNonConformingWorkService.update.and.returnValue(of({ message: 'Updated' }));

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [
                NonConformingWorkFormComponent,
                ReactiveFormsModule,
                RouterTestingModule,
                HttpClientTestingModule,
            ],
            providers: [
                { provide: NonConformingWorkService, useValue: mockNonConformingWorkService },
                { provide: Router, useValue: mockRouter },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({})),
                        snapshot: { paramMap: convertToParamMap({}), url: [], params: {} },
                    },
                },
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(NonConformingWorkFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize ncForm on creation', () => {
        expect(component.ncForm).toBeDefined();
    });

    it('should default to create mode (isEditMode=false, isViewMode=false)', () => {
        expect(component.isEditMode).toBeFalse();
        expect(component.isViewMode).toBeFalse();
    });

    it('should have all required form controls', () => {
        const controls = component.ncForm.controls;
        expect(controls['formatNo']).toBeDefined();
        expect(controls['docNo']).toBeDefined();
        expect(controls['issueNo']).toBeDefined();
        expect(controls['issueDate']).toBeDefined();
        expect(controls['revNo']).toBeDefined();
        expect(controls['revDate']).toBeDefined();
        expect(controls['dateMonthYear']).toBeDefined();
        expect(controls['ncDetail']).toBeDefined();
    });

    it('should be invalid when required fields are empty', () => {
        component.ncForm.patchValue({
            dateMonthYear: '',
            ncDetail: '',
        });
        expect(component.ncForm.valid).toBeFalse();
    });

    it('should be valid when all required fields are filled', () => {
        component.ncForm.patchValue(validData);
        expect(component.ncForm.valid).toBeTrue();
    });

    it('should pre-populate header fields with default values', () => {
        expect(component.ncForm.get('formatNo')?.value).toBe('F-41');
        expect(component.ncForm.get('issueNo')?.value).toBe('03');
        expect(component.ncForm.get('issueDate')?.value).toBe('2021-10-01');
        expect(component.ncForm.get('revNo')?.value).toBe('00');
        expect(component.ncForm.get('revDate')?.value).toBe('--');
    });

    it('should call service.create when submitting a new record', () => {
        component.ncForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockNonConformingWorkService.create).toHaveBeenCalledWith(component.ncForm.value);
    });

    it('should call service.update when submitting in edit mode', () => {
        component.ncForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 14;
        component.onSubmit();
        expect(mockNonConformingWorkService.update).toHaveBeenCalledWith(14, component.ncForm.value);
    });

    it('should not call any service method when form is invalid on submit', () => {
        component.ncForm.patchValue({ dateMonthYear: '', ncDetail: '' });
        component.onSubmit();
        expect(mockNonConformingWorkService.create).not.toHaveBeenCalled();
        expect(mockNonConformingWorkService.update).not.toHaveBeenCalled();
    });

    it('should navigate to /non-conforming-work on cancel', () => {
        component.onCancel();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/non-conforming-work']);
    });

    it('should toggle section open state', () => {
        const initial = component.openSections['basicInfo'];
        component.toggleSection('basicInfo');
        expect(component.openSections['basicInfo']).toBe(!initial);
    });

    it('should load record by id and patch form when in edit mode', () => {
        mockNonConformingWorkService.getById.and.returnValue(of(validData));
        component.recordId = 8;
        component.isEditMode = true;
        component['loadRecord']();
        expect(mockNonConformingWorkService.getById).toHaveBeenCalledWith(8);
        expect(component.ncForm.get('ncDetail')?.value).toBe('Test result exceeded tolerance');
    });

    it('should disable form in view mode after loading record', () => {
        mockNonConformingWorkService.getById.and.returnValue(of(validData));
        component.recordId = 9;
        component.isViewMode = true;
        component['loadRecord']();
        expect(component.ncForm.disabled).toBeTrue();
    });

    it('should navigate after successful create', () => {
        mockNonConformingWorkService.create.and.returnValue(of({ message: 'Saved' }));
        component.ncForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/non-conforming-work']);
    });

    it('should navigate after successful update', () => {
        mockNonConformingWorkService.update.and.returnValue(of({ message: 'Updated' }));
        component.ncForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 15;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/non-conforming-work']);
    });
});
