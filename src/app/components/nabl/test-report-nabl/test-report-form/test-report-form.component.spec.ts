// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { TestReportFormComponent } from './test-report-form.component';
import { TestReportService } from '../../../../services/test-report.service';
import { ToastService } from '../../../../services/toast.service';

describe('TestReportFormComponent', () => {
  let component: TestReportFormComponent;
  let fixture: ComponentFixture<TestReportFormComponent>;
  let testReportServiceSpy: jasmine.SpyObj<TestReportService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-32',
    issueNo: '01',
    revNo: '00',
    documentNo: 'DMSPL/TR-001',
    dateOfIssue: '2026-03-13',
    customerName: 'Test Corp',
    customerAddress: '123 Main St',
    sampleDescription: 'Steel Rod',
    sampleId: 'SMP-001',
    conditionOnReceipt: 'Good',
    dateOfReceipt: '2026-03-10',
    dateOfTesting: '2026-03-12',
    preparedBy: 'Lab Tech',
    approvedBy: 'Lab Manager',
  };

  beforeEach(async () => {
    testReportServiceSpy = jasmine.createSpyObj('TestReportService', ['create', 'update', 'getById', 'save']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    testReportServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    testReportServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    testReportServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    testReportServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [TestReportFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: TestReportService, useValue: testReportServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
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

    fixture = TestBed.createComponent(TestReportFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize reportForm on creation', () => {
    expect(component.reportForm).toBeDefined();
  });

  it('should have a results FormArray', () => {
    const arr = component.reportForm.get('results');
    expect(arr).toBeTruthy();
    expect(arr instanceof FormArray).toBeTrue();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.reportForm.reset();
    expect(component.reportForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.reportForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.reportForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.reportForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentNo as required', () => {
    const ctrl = component.reportForm.get('documentNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark dateOfIssue as required', () => {
    const ctrl = component.reportForm.get('dateOfIssue');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark customerName as required', () => {
    const ctrl = component.reportForm.get('customerName');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark customerAddress as required', () => {
    const ctrl = component.reportForm.get('customerAddress');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark sampleDescription as required', () => {
    const ctrl = component.reportForm.get('sampleDescription');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark sampleId as required', () => {
    const ctrl = component.reportForm.get('sampleId');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark conditionOnReceipt as required', () => {
    const ctrl = component.reportForm.get('conditionOnReceipt');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark dateOfReceipt as required', () => {
    const ctrl = component.reportForm.get('dateOfReceipt');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark dateOfTesting as required', () => {
    const ctrl = component.reportForm.get('dateOfTesting');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark preparedBy as required', () => {
    const ctrl = component.reportForm.get('preparedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark approvedBy as required', () => {
    const ctrl = component.reportForm.get('approvedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.reportForm.patchValue(validData);
    const arr = component.reportForm.get('results') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    expect(component.reportForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.reportForm.patchValue(validData);
    const arr = component.reportForm.get('results') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(testReportServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/test-report']);
  });

  it('should show toast on successful save', () => {
    component.reportForm.patchValue(validData);
    const arr = component.reportForm.get('results') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });

  it('should have results as a FormArray instance', () => {
    const resultsCtrl = component.reportForm.get('results');
    expect(resultsCtrl instanceof FormArray).toBeTrue();
  });
});
