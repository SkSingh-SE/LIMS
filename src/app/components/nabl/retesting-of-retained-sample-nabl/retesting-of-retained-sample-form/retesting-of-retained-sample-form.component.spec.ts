// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { RetestingOfRetainedSampleFormComponent } from './retesting-of-retained-sample-form.component';
import { RetestingOfRetainedSampleService } from '../../../../services/retesting-of-retained-sample.service';
import { ToastService } from '../../../../services/toast.service';

describe('RetestingOfRetainedSampleFormComponent', () => {
    let component: RetestingOfRetainedSampleFormComponent;
    let fixture: ComponentFixture<RetestingOfRetainedSampleFormComponent>;
    let mockRetestingService: jasmine.SpyObj<RetestingOfRetainedSampleService>;
    let mockToastService: jasmine.SpyObj<ToastService>;
    let mockRouter: jasmine.SpyObj<Router>;

    const validData = {
        formatNo: 'F-37',
        issueNo: '01',
        revNo: '00',
        date: '2026-03-13',
        documentNo: 'F-37',
        discipline: 'Mechanical',
        groupSubgroup: 'Metals',
        sampleName: 'Steel Bar',
        originalSampleId: 'SMP-001',
        dateOfOriginalTesting: '2026-01-15',
        dateOfRetesting: '2026-03-13',
        analyst: 'John Tech',
        authorizedSignatory: 'Lab Manager',
    };

    const mockParameter = {
        srNo: 1,
        parameterTested: 'Tensile Strength',
        originalResult: '450 MPa',
        retestResult: '452 MPa',
        acceptableLimits: '> 400 MPa',
        deviation: '0.44%',
        status: 'Satisfactory',
    };

    beforeEach(async () => {
        mockRetestingService = jasmine.createSpyObj('RetestingOfRetainedSampleService', [
            'create',
            'update',
            'getById',
            'save',
        ]);
        mockRetestingService.create.and.returnValue(of({ message: 'Saved' }));
        mockRetestingService.save.and.returnValue(of({ message: 'Saved' }));
        mockRetestingService.getById.and.returnValue(of(null));
        mockRetestingService.update.and.returnValue(of({ message: 'Updated' }));

        mockToastService = jasmine.createSpyObj('ToastService', ['show']);

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [
                RetestingOfRetainedSampleFormComponent,
                ReactiveFormsModule,
                RouterTestingModule,
                HttpClientTestingModule,
            ],
            providers: [
                { provide: RetestingOfRetainedSampleService, useValue: mockRetestingService },
                { provide: ToastService, useValue: mockToastService },
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

        fixture = TestBed.createComponent(RetestingOfRetainedSampleFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize retestForm on creation', () => {
        expect(component.retestForm).toBeDefined();
    });

    it('should default to create mode (isEditMode=false, isViewMode=false)', () => {
        expect(component.isEditMode).toBeFalse();
        expect(component.isViewMode).toBeFalse();
    });

    it('should have all required form controls', () => {
        const controls = component.retestForm.controls;
        expect(controls['formatNo']).toBeDefined();
        expect(controls['issueNo']).toBeDefined();
        expect(controls['revNo']).toBeDefined();
        expect(controls['date']).toBeDefined();
        expect(controls['documentNo']).toBeDefined();
        expect(controls['discipline']).toBeDefined();
        expect(controls['groupSubgroup']).toBeDefined();
        expect(controls['sampleName']).toBeDefined();
        expect(controls['originalSampleId']).toBeDefined();
        expect(controls['dateOfOriginalTesting']).toBeDefined();
        expect(controls['dateOfRetesting']).toBeDefined();
        expect(controls['analyst']).toBeDefined();
        expect(controls['authorizedSignatory']).toBeDefined();
    });

    it('should contain a parameters FormArray', () => {
        const parametersArray = component.retestForm.get('parameters') as FormArray;
        expect(parametersArray).toBeTruthy();
        expect(parametersArray instanceof FormArray).toBeTrue();
    });

    it('should auto-add one parameter row on init (new record)', () => {
        expect(component.parameters.length).toBeGreaterThanOrEqual(1);
    });

    it('should be invalid when required fields are empty', () => {
        component.retestForm.patchValue({
            documentNo: '',
            discipline: '',
            groupSubgroup: '',
            sampleName: '',
            originalSampleId: '',
            dateOfOriginalTesting: '',
            analyst: '',
            authorizedSignatory: '',
        });
        expect(component.retestForm.valid).toBeFalse();
    });

    it('should be valid when all required fields and at least one valid parameter are filled', () => {
        component.retestForm.patchValue(validData);
        const parametersArray = component.parameters;
        parametersArray.at(0).patchValue(mockParameter);
        expect(component.retestForm.valid).toBeTrue();
    });

    it('should pre-populate header fields with default values', () => {
        expect(component.retestForm.get('formatNo')?.value).toBe('F-38');
        expect(component.retestForm.get('issueNo')?.value).toBe('01');
        expect(component.retestForm.get('revNo')?.value).toBe('00');
    });

    it('should add a new parameter row when addParameter is called', () => {
        const initialCount = component.parameters.length;
        component.addParameter();
        expect(component.parameters.length).toBe(initialCount + 1);
    });

    it('should remove a parameter row when removeParameter is called (if more than one)', () => {
        component.addParameter();
        const countAfterAdd = component.parameters.length;
        component.removeParameter(0);
        expect(component.parameters.length).toBe(countAfterAdd - 1);
    });

    it('should not remove the last remaining parameter row', () => {
        while (component.parameters.length > 1) {
            component.removeParameter(0);
        }
        expect(component.parameters.length).toBe(1);
        component.removeParameter(0);
        expect(component.parameters.length).toBe(1);
    });

    it('should call service.create and show success toast when submitting new record', () => {
        component.retestForm.patchValue(validData);
        component.parameters.at(0).patchValue(mockParameter);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockRetestingService.create).toHaveBeenCalled();
        expect(mockToastService.show).toHaveBeenCalledWith('Saved', 'success');
    });

    it('should call service.update and show success toast when submitting in edit mode', () => {
        component.retestForm.patchValue(validData);
        component.parameters.at(0).patchValue(mockParameter);
        component.isEditMode = true;
        component.recordId = 25;
        component.onSubmit();
        expect(mockRetestingService.update).toHaveBeenCalledWith(25, component.retestForm.getRawValue());
        expect(mockToastService.show).toHaveBeenCalledWith('Updated', 'success');
    });

    it('should mark all as touched and not call service when form is invalid on submit', () => {
        spyOn(component.retestForm, 'markAllAsTouched').and.callThrough();
        component.retestForm.patchValue({
            documentNo: '',
            discipline: '',
            sampleName: '',
            analyst: '',
            authorizedSignatory: '',
        });
        component.parameters.at(0).patchValue({ parameterTested: '', originalResult: '', retestResult: '' });
        component.onSubmit();
        expect(component.retestForm.markAllAsTouched).toHaveBeenCalled();
        expect(mockRetestingService.create).not.toHaveBeenCalled();
        expect(mockRetestingService.update).not.toHaveBeenCalled();
    });

    it('should navigate to /retesting-retained-sample on cancel', () => {
        component.onCancel();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/retesting-retained-sample']);
    });

    it('should toggle section open state', () => {
        const initial = component.openSections['sampleInfo'];
        component.toggleSection('sampleInfo');
        expect(component.openSections['sampleInfo']).toBe(!initial);
    });

    it('should load record and patch form when recordId is set', () => {
        const serverData = {
            ...validData,
            parameters: [mockParameter],
        };
        mockRetestingService.getById.and.returnValue(of(serverData));
        component.recordId = 18;
        component.loadData();
        expect(mockRetestingService.getById).toHaveBeenCalledWith(18);
        expect(component.retestForm.get('sampleName')?.value).toBe('Steel Bar');
    });

    it('should disable form in view mode after loading record', () => {
        const serverData = { ...validData, parameters: [mockParameter] };
        mockRetestingService.getById.and.returnValue(of(serverData));
        component.recordId = 19;
        component.isViewMode = true;
        component.loadData();
        expect(component.retestForm.disabled).toBeTrue();
    });

    it('should show error toast when create fails', () => {
        mockRetestingService.create.and.returnValue(throwError(() => ({ message: 'Server error' })));
        component.retestForm.patchValue(validData);
        component.parameters.at(0).patchValue(mockParameter);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockToastService.show).toHaveBeenCalledWith('Server error', 'error');
    });

    it('should navigate to /retesting-retained-sample after successful create', () => {
        mockRetestingService.create.and.returnValue(of({ message: 'Saved' }));
        component.retestForm.patchValue(validData);
        component.parameters.at(0).patchValue(mockParameter);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/retesting-retained-sample']);
    });

    it('should navigate to /retesting-retained-sample after successful update', () => {
        mockRetestingService.update.and.returnValue(of({ message: 'Updated' }));
        component.retestForm.patchValue(validData);
        component.parameters.at(0).patchValue(mockParameter);
        component.isEditMode = true;
        component.recordId = 26;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/retesting-retained-sample']);
    });

    it('should expose parameters getter returning FormArray', () => {
        expect(component.parameters instanceof FormArray).toBeTrue();
    });
});
