// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { RiskAssessmentFormComponent } from './risk-assessment-form.component';
import { RiskAssessmentService } from '../../../../services/risk-assessment.service';

describe('RiskAssessmentFormComponent', () => {
    let component: RiskAssessmentFormComponent;
    let fixture: ComponentFixture<RiskAssessmentFormComponent>;
    let mockRiskAssessmentService: jasmine.SpyObj<RiskAssessmentService>;
    let mockRouter: jasmine.SpyObj<Router>;

    const validData = {
        formatNo: 'F-48',
        docNo: 'DMSPL/F-48',
        issueNo: '01',
        issueDate: '2021-10-01',
        revNo: '00',
        revDate: '--',
        date: '2026-03-13',
        activityProcess: 'Sample testing',
        riskIdentified: 'Cross-contamination',
        opportunity: 'Improved protocols',
        mitigationPlan: 'Regular cleaning',
        responsibility: 'Lab Technician',
        effectiveness: 'High',
    };

    beforeEach(async () => {
        mockRiskAssessmentService = jasmine.createSpyObj('RiskAssessmentService', [
            'create',
            'update',
            'getById',
            'save',
        ]);
        mockRiskAssessmentService.create.and.returnValue(of({ message: 'Saved' }));
        mockRiskAssessmentService.save.and.returnValue(of({ message: 'Saved' }));
        mockRiskAssessmentService.getById.and.returnValue(of(null));
        mockRiskAssessmentService.update.and.returnValue(of({ message: 'Updated' }));

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [RiskAssessmentFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
            providers: [
                { provide: RiskAssessmentService, useValue: mockRiskAssessmentService },
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

        fixture = TestBed.createComponent(RiskAssessmentFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize riskForm on creation', () => {
        expect(component.riskForm).toBeDefined();
    });

    it('should default to create mode (isEditMode=false, isViewMode=false)', () => {
        expect(component.isEditMode).toBeFalse();
        expect(component.isViewMode).toBeFalse();
    });

    it('should have all required form controls', () => {
        const controls = component.riskForm.controls;
        expect(controls['formatNo']).toBeDefined();
        expect(controls['docNo']).toBeDefined();
        expect(controls['issueNo']).toBeDefined();
        expect(controls['issueDate']).toBeDefined();
        expect(controls['revNo']).toBeDefined();
        expect(controls['revDate']).toBeDefined();
        expect(controls['date']).toBeDefined();
        expect(controls['activityProcess']).toBeDefined();
        expect(controls['riskIdentified']).toBeDefined();
        expect(controls['opportunity']).toBeDefined();
        expect(controls['mitigationPlan']).toBeDefined();
        expect(controls['responsibility']).toBeDefined();
        expect(controls['effectiveness']).toBeDefined();
    });

    it('should be invalid when required fields are empty', () => {
        component.riskForm.patchValue({
            date: '',
            activityProcess: '',
            riskIdentified: '',
            opportunity: '',
            mitigationPlan: '',
            responsibility: '',
            effectiveness: '',
        });
        expect(component.riskForm.valid).toBeFalse();
    });

    it('should be valid when all required fields are filled', () => {
        component.riskForm.patchValue(validData);
        expect(component.riskForm.valid).toBeTrue();
    });

    it('should pre-populate header fields with default values', () => {
        expect(component.riskForm.get('formatNo')?.value).toBe('F-46');
        expect(component.riskForm.get('issueNo')?.value).toBe('03');
        expect(component.riskForm.get('issueDate')?.value).toBe('2021-10-01');
        expect(component.riskForm.get('revNo')?.value).toBe('00');
        expect(component.riskForm.get('revDate')?.value).toBe('--');
    });

    it('should call service.create when submitting a new record', () => {
        component.riskForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockRiskAssessmentService.create).toHaveBeenCalledWith(component.riskForm.value);
    });

    it('should call service.update when submitting in edit mode', () => {
        component.riskForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 11;
        component.onSubmit();
        expect(mockRiskAssessmentService.update).toHaveBeenCalledWith(11, component.riskForm.value);
    });

    it('should not call any service method when form is invalid on submit', () => {
        component.riskForm.patchValue({
            date: '',
            activityProcess: '',
            riskIdentified: '',
            opportunity: '',
            mitigationPlan: '',
            responsibility: '',
            effectiveness: '',
        });
        component.onSubmit();
        expect(mockRiskAssessmentService.create).not.toHaveBeenCalled();
        expect(mockRiskAssessmentService.update).not.toHaveBeenCalled();
    });

    it('should navigate to /risk-assessment on cancel', () => {
        component.onCancel();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/risk-assessment']);
    });

    it('should toggle section open state', () => {
        const initial = component.openSections['riskDetails'];
        component.toggleSection('riskDetails');
        expect(component.openSections['riskDetails']).toBe(!initial);
    });

    it('should load record by id and patch form when in edit mode', () => {
        mockRiskAssessmentService.getById.and.returnValue(of(validData));
        component.recordId = 6;
        component.isEditMode = true;
        component['loadRecord']();
        expect(mockRiskAssessmentService.getById).toHaveBeenCalledWith(6);
        expect(component.riskForm.get('riskIdentified')?.value).toBe('Cross-contamination');
    });

    it('should disable form in view mode after loading record', () => {
        mockRiskAssessmentService.getById.and.returnValue(of(validData));
        component.recordId = 7;
        component.isViewMode = true;
        component['loadRecord']();
        expect(component.riskForm.disabled).toBeTrue();
    });

    it('should navigate after successful create', () => {
        mockRiskAssessmentService.create.and.returnValue(of({ message: 'Saved' }));
        component.riskForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/risk-assessment']);
    });

    it('should navigate after successful update', () => {
        mockRiskAssessmentService.update.and.returnValue(of({ message: 'Updated' }));
        component.riskForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 12;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/risk-assessment']);
    });
});
