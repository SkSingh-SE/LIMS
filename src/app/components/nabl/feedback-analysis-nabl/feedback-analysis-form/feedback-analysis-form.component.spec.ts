// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { FeedbackAnalysisFormComponent } from './feedback-analysis-form.component';
import { FeedbackAnalysisService } from '../../../../services/feedback-analysis.service';

describe('FeedbackAnalysisFormComponent', () => {
    let component: FeedbackAnalysisFormComponent;
    let fixture: ComponentFixture<FeedbackAnalysisFormComponent>;
    let mockFeedbackAnalysisService: jasmine.SpyObj<FeedbackAnalysisService>;
    let mockRouter: jasmine.SpyObj<Router>;

    const validData = {
        formatNo: 'F-42',
        docNo: 'DMSPL/F-42',
        issueNo: '01',
        issueDate: '2021-10-01',
        revNo: '00',
        revDate: '--',
        period: 'Q1 2026',
        totalFeedbackReceived: 10,
        analysisSummary: 'Good feedback overall',
        actionsTaken: 'No action needed',
    };

    beforeEach(async () => {
        mockFeedbackAnalysisService = jasmine.createSpyObj('FeedbackAnalysisService', [
            'create',
            'update',
            'getById',
            'save',
        ]);
        mockFeedbackAnalysisService.create.and.returnValue(of({ message: 'Saved' }));
        mockFeedbackAnalysisService.save.and.returnValue(of({ message: 'Saved' }));
        mockFeedbackAnalysisService.getById.and.returnValue(of(null));
        mockFeedbackAnalysisService.update.and.returnValue(of({ message: 'Updated' }));

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [FeedbackAnalysisFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
            providers: [
                { provide: FeedbackAnalysisService, useValue: mockFeedbackAnalysisService },
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

        fixture = TestBed.createComponent(FeedbackAnalysisFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize analysisForm on creation', () => {
        expect(component.analysisForm).toBeDefined();
    });

    it('should default to create mode (isEditMode=false, isViewMode=false)', () => {
        expect(component.isEditMode).toBeFalse();
        expect(component.isViewMode).toBeFalse();
    });

    it('should have all required form controls', () => {
        const controls = component.analysisForm.controls;
        expect(controls['formatNo']).toBeDefined();
        expect(controls['docNo']).toBeDefined();
        expect(controls['issueNo']).toBeDefined();
        expect(controls['issueDate']).toBeDefined();
        expect(controls['revNo']).toBeDefined();
        expect(controls['revDate']).toBeDefined();
        expect(controls['period']).toBeDefined();
        expect(controls['totalFeedbackReceived']).toBeDefined();
        expect(controls['analysisSummary']).toBeDefined();
        expect(controls['actionsTaken']).toBeDefined();
    });

    it('should be invalid when required fields are empty', () => {
        component.analysisForm.patchValue({
            period: '',
            totalFeedbackReceived: null,
            analysisSummary: '',
            actionsTaken: '',
        });
        expect(component.analysisForm.valid).toBeFalse();
    });

    it('should be valid when all required fields are filled', () => {
        component.analysisForm.patchValue(validData);
        expect(component.analysisForm.valid).toBeTrue();
    });

    it('should pre-populate header fields with default values', () => {
        expect(component.analysisForm.get('formatNo')?.value).toBe('F-48');
        expect(component.analysisForm.get('issueNo')?.value).toBe('03');
        expect(component.analysisForm.get('issueDate')?.value).toBe('2021-10-01');
        expect(component.analysisForm.get('revNo')?.value).toBe('00');
        expect(component.analysisForm.get('revDate')?.value).toBe('--');
    });

    it('should reject negative totalFeedbackReceived', () => {
        component.analysisForm.patchValue({ ...validData, totalFeedbackReceived: -1 });
        expect(component.analysisForm.get('totalFeedbackReceived')?.valid).toBeFalse();
    });

    it('should accept zero as a valid totalFeedbackReceived', () => {
        component.analysisForm.patchValue({ ...validData, totalFeedbackReceived: 0 });
        expect(component.analysisForm.get('totalFeedbackReceived')?.valid).toBeTrue();
    });

    it('should call service.create when submitting a new record', () => {
        component.analysisForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockFeedbackAnalysisService.create).toHaveBeenCalledWith(component.analysisForm.value);
    });

    it('should call service.update when submitting in edit mode', () => {
        component.analysisForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 9;
        component.onSubmit();
        expect(mockFeedbackAnalysisService.update).toHaveBeenCalledWith(9, component.analysisForm.value);
    });

    it('should not call any service method when form is invalid on submit', () => {
        component.analysisForm.patchValue({ period: '', analysisSummary: '', actionsTaken: '' });
        component.onSubmit();
        expect(mockFeedbackAnalysisService.create).not.toHaveBeenCalled();
        expect(mockFeedbackAnalysisService.update).not.toHaveBeenCalled();
    });

    it('should navigate to /feedback-analysis on cancel', () => {
        component.onCancel();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/feedback-analysis']);
    });

    it('should toggle section open state', () => {
        const initial = component.openSections['analysisDetails'];
        component.toggleSection('analysisDetails');
        expect(component.openSections['analysisDetails']).toBe(!initial);
    });

    it('should load record by id and patch form when in edit mode', () => {
        mockFeedbackAnalysisService.getById.and.returnValue(of(validData));
        component.recordId = 3;
        component.isEditMode = true;
        component['loadRecord']();
        expect(mockFeedbackAnalysisService.getById).toHaveBeenCalledWith(3);
        expect(component.analysisForm.get('period')?.value).toBe('Q1 2026');
    });

    it('should disable form in view mode after loading record', () => {
        mockFeedbackAnalysisService.getById.and.returnValue(of(validData));
        component.recordId = 4;
        component.isViewMode = true;
        component['loadRecord']();
        expect(component.analysisForm.disabled).toBeTrue();
    });

    it('should navigate after successful create', () => {
        mockFeedbackAnalysisService.create.and.returnValue(of({ message: 'Saved' }));
        component.analysisForm.patchValue(validData);
        component.isEditMode = false;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/feedback-analysis']);
    });

    it('should navigate after successful update', () => {
        mockFeedbackAnalysisService.update.and.returnValue(of({ message: 'Updated' }));
        component.analysisForm.patchValue(validData);
        component.isEditMode = true;
        component.recordId = 10;
        component.onSubmit();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/feedback-analysis']);
    });
});
