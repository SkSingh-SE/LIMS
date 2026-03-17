// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SupplierEvaluationRecordFormComponent } from './supplier-evaluation-record-form.component';
import { SupplierEvaluationRecordService } from '../../../../services/supplier-evaluation-record.service';

describe('SupplierEvaluationRecordFormComponent', () => {
  let component: SupplierEvaluationRecordFormComponent;
  let fixture: ComponentFixture<SupplierEvaluationRecordFormComponent>;
  let mockService: jasmine.SpyObj<SupplierEvaluationRecordService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-20',
    documentNo: 'DMSPL/F-20',
    supplierName: 'ABC Supplies',
    materialsSupplied: 'Lab chemicals',
    evaluatingPeriodFrom: '2026-01-01',
    evaluatingPeriodTo: '2026-03-31',
    recommendation: 'Approved',
    evaluatedBy: 'Lab Manager',
    approvedBy: 'Quality Manager'
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('SupplierEvaluationRecordService', ['create', 'update', 'getById', 'save']);
    mockService.create.and.returnValue(of({ message: 'Saved', success: true }));
    mockService.save.and.returnValue(of({ message: 'Saved', success: true }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved', success: true }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    Object.defineProperty(mockRouter, 'url', { get: () => '/supplier-evaluation/new', configurable: true });

    await TestBed.configureTestingModule({
      imports: [
        SupplierEvaluationRecordFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: SupplierEvaluationRecordService, useValue: mockService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            params: of({}),
            snapshot: {
              paramMap: convertToParamMap({}),
              url: []
            }
          }
        }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierEvaluationRecordFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize evaluationForm on init', () => {
    expect(component.evaluationForm).toBeDefined();
  });

  it('should have a criteria FormArray', () => {
    const criteriaArray = component.evaluationForm.get('criteria') as FormArray;
    expect(criteriaArray).toBeTruthy();
    expect(criteriaArray instanceof FormArray).toBeTrue();
  });

  it('should populate default criteria on new record', () => {
    expect(component.criteria.length).toBeGreaterThan(0);
  });

  it('should be invalid when required fields are empty', () => {
    component.evaluationForm.patchValue({
      documentNo: '',
      supplierName: '',
      materialsSupplied: '',
      evaluatingPeriodFrom: '',
      evaluatingPeriodTo: '',
      recommendation: '',
      evaluatedBy: '',
      approvedBy: ''
    });
    expect(component.evaluationForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.evaluationForm.patchValue(validData);
    expect(component.evaluationForm.get('supplierName')?.valid).toBeTrue();
    expect(component.evaluationForm.get('materialsSupplied')?.valid).toBeTrue();
    expect(component.evaluationForm.get('evaluatedBy')?.valid).toBeTrue();
    expect(component.evaluationForm.get('approvedBy')?.valid).toBeTrue();
  });

  it('should add a criteria row', () => {
    const initialLength = component.criteria.length;
    component.addCriteria('Test Parameter', 10);
    expect(component.criteria.length).toBe(initialLength + 1);
  });

  it('should remove a criteria row', () => {
    component.addCriteria('Param', 10);
    const lengthBefore = component.criteria.length;
    component.removeCriteria(0);
    expect(component.criteria.length).toBe(lengthBefore - 1);
  });

  it('should calculate totals correctly', () => {
    component.criteria.clear();
    component.addCriteria('Param A', 40, 30);
    component.addCriteria('Param B', 60, 50);
    component.calculateTotals();
    expect(component.evaluationForm.get('totalScore')?.value).toBe(80);
    expect(component.evaluationForm.get('maxPossibleScore')?.value).toBe(100);
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.evaluationForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.evaluationForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.evaluationForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /supplier-evaluation-record on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/supplier-evaluation']);
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });

  it('should display correct formTitle for new record', () => {
    component.isEditMode = false;
    component.isViewMode = false;
    expect(component.formTitle).toBe('New Supplier Evaluation Record');
  });

  it('should display correct formTitle for edit mode', () => {
    component.isEditMode = true;
    component.isViewMode = false;
    expect(component.formTitle).toBe('Edit Supplier Evaluation Record');
  });

  it('should display correct formTitle for view mode', () => {
    component.isViewMode = true;
    expect(component.formTitle).toBe('View Supplier Evaluation Record');
  });
});
