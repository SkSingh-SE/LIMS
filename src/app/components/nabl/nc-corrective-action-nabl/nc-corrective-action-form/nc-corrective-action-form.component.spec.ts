// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { NcCorrectiveActionFormComponent } from './nc-corrective-action-form.component';
import { NcCorrectiveActionService } from '../../../../services/nc-corrective-action.service';

describe('NcCorrectiveActionFormComponent', () => {
    let component: NcCorrectiveActionFormComponent;
    let fixture: ComponentFixture<NcCorrectiveActionFormComponent>;
    let mockNcCorrectiveActionService: jasmine.SpyObj<NcCorrectiveActionService>;
    let mockRouter: jasmine.SpyObj<Router>;

    const validData = {
        formatNo: 'F-49',
        docNo: 'DMSPL/F-49',
        issueNo: '01',
        issueDate: '2021-10-01',
        revNo: '00',
        revDate: '--',
        date: '2026-03-13',
        ncNo: 'NC-001',
        ncObserved: 'Calibration overdue for equipment EQ-001',
    };

    beforeEach(async () => {
        mockNcCorrectiveActionService = jasmine.createSpyObj('NcCorrectiveActionService', [
            'create',
            'update',
            'getById',
            'save',
        ]);
        mockNcCorrectiveActionService.create.and.returnValue(of({ message: 'Saved' }));
        mockNcCorrectiveActionService.save.and.returnValue(of({ message: 'Saved' }));
        mockNcCorrectiveActionService.getById.and.returnValue(of(null));
        mockNcCorrectiveActionService.update.and.returnValue(of({ message: 'Updated' }));

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [
                NcCorrectiveActionFormComponent,
                ReactiveFormsModule,
                RouterTestingModule,
                HttpClientTestingModule,
            ],
            providers: [
                { provide: NcCorrectiveActionService, useValue: mockNcCorrectiveActionService },
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

        fixture = TestBed.createComponent(NcCorrectiveActionFormComponent);
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
        expect(controls['date']).toBeDefined();
        expect(controls['ncNo']).toBeDefined();
        expect(controls['ncObserved']).toBeDefined();
    });

    it('should be invalid when required fields are empty', () => {
        component.ncForm.patchValue({
            date: '',
            ncNo: '',
            ncObserved: '',
        });
        expect(component.ncForm.valid).toBeFalse();
    });

    it('should be valid when all required fields are filled', () => {
        component.ncForm.patchValue(validData);
        expect(component.ncForm.valid).toBeTrue();
    });

    it('should pre-populate header fields with default values', () => {
        expect(component.ncForm.get('formatNo')?.value).toBe('F-42');
        expect(component.ncForm.get('issueNo')?.value).toBe('03');
        expect(component.ncForm.get('issueDate')?.value).toBe('2021-10-01');
        expect(component.ncForm.get('revNo')?.value).toBe('00');
        expect(component.ncForm.get('revDate')?.value).toBe('--');
    });

    it('should call service.create when submitting a new record', () => {
        component.ncForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockNcCorrectiveActionService.create).toHaveBeenCalledWith(component.ncForm.value);
    });

    it('should call service.update when submitting in edit mode', () => {
        component.ncForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 20;
        component.onSubmit();
        expect(mockNcCorrectiveActionService.update).toHaveBeenCalledWith(20, component.ncForm.value);
    });

    it('should not call any service method when form is invalid on submit', () => {
        component.ncForm.patchValue({ date: '', ncNo: '', ncObserved: '' });
        component.onSubmit();
        expect(mockNcCorrectiveActionService.create).not.toHaveBeenCalled();
        expect(mockNcCorrectiveActionService.update).not.toHaveBeenCalled();
    });

    it('should navigate to /nc-corrective-action on cancel', () => {
        component.onCancel();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/nc-corrective-action']);
    });

    it('should toggle section open state', () => {
        const initial = component.openSections['observation'];
        component.toggleSection('observation');
        expect(component.openSections['observation']).toBe(!initial);
    });

    it('should load record by id and patch form when in edit mode', () => {
        mockNcCorrectiveActionService.getById.and.returnValue(of(validData));
        component.recordId = 13;
        component.isEditMode = true;
        component['loadRecord']();
        expect(mockNcCorrectiveActionService.getById).toHaveBeenCalledWith(13);
        expect(component.ncForm.get('ncNo')?.value).toBe('NC-001');
    });

    it('should disable form in view mode after loading record', () => {
        mockNcCorrectiveActionService.getById.and.returnValue(of(validData));
        component.recordId = 14;
        component.isViewMode = true;
        component['loadRecord']();
        expect(component.ncForm.disabled).toBeTrue();
    });

    it('should navigate after successful create', () => {
        mockNcCorrectiveActionService.create.and.returnValue(of({ message: 'Saved' }));
        component.ncForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/nc-corrective-action']);
    });

    it('should navigate after successful update', () => {
        mockNcCorrectiveActionService.update.and.returnValue(of({ message: 'Updated' }));
        component.ncForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 21;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/nc-corrective-action']);
    });
});
