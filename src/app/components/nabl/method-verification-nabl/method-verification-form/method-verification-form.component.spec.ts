// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { MethodVerificationNablFormComponent } from './method-verification-form.component';
import { MethodVerificationNablService } from '../../../../services/method-verification-nabl.service';
import { ToastService } from '../../../../services/toast.service';

describe('MethodVerificationNablFormComponent', () => {
  let component: MethodVerificationNablFormComponent;
  let fixture: ComponentFixture<MethodVerificationNablFormComponent>;
  let methodVerificationServiceSpy: jasmine.SpyObj<MethodVerificationNablService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-12',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-12',
    testMethodName: 'Tensile Strength',
    referenceStandard: 'IS 1608',
    equipmentUsed: 'UTM',
    matrix: 'Steel',
    range: '100-500 MPa',
    conclusion: 'Method verified',
    preparedBy: 'Lab Tech',
    reviewedBy: 'Senior Tech',
    approvedBy: 'Lab Manager',
  };

  beforeEach(async () => {
    methodVerificationServiceSpy = jasmine.createSpyObj('MethodVerificationNablService', [
      'create',
      'update',
      'getById',
      'save',
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    methodVerificationServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    methodVerificationServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    methodVerificationServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    methodVerificationServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [MethodVerificationNablFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: MethodVerificationNablService, useValue: methodVerificationServiceSpy },
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

    fixture = TestBed.createComponent(MethodVerificationNablFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize requestForm on creation', () => {
    expect(component.requestForm).toBeDefined();
  });

  it('should have a performanceParameters FormArray', () => {
    const arr = component.requestForm.get('performanceParameters');
    expect(arr).toBeTruthy();
    expect(arr instanceof FormArray).toBeTrue();
  });

  it('should have a rawData FormArray', () => {
    const arr = component.requestForm.get('rawData');
    expect(arr).toBeTruthy();
    expect(arr instanceof FormArray).toBeTrue();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.requestForm.reset();
    expect(component.requestForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.requestForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.requestForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.requestForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark date as required', () => {
    const ctrl = component.requestForm.get('date');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentNo as required', () => {
    const ctrl = component.requestForm.get('documentNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark testMethodName as required', () => {
    const ctrl = component.requestForm.get('testMethodName');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark referenceStandard as required', () => {
    const ctrl = component.requestForm.get('referenceStandard');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark equipmentUsed as required', () => {
    const ctrl = component.requestForm.get('equipmentUsed');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark matrix as required', () => {
    const ctrl = component.requestForm.get('matrix');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark range as required', () => {
    const ctrl = component.requestForm.get('range');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark conclusion as required', () => {
    const ctrl = component.requestForm.get('conclusion');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark preparedBy as required', () => {
    const ctrl = component.requestForm.get('preparedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark reviewedBy as required', () => {
    const ctrl = component.requestForm.get('reviewedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark approvedBy as required', () => {
    const ctrl = component.requestForm.get('approvedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.requestForm.patchValue(validData);
    const ppArray = component.requestForm.get('performanceParameters') as FormArray;
    const rdArray = component.requestForm.get('rawData') as FormArray;
    while (ppArray.length > 0) ppArray.removeAt(0);
    while (rdArray.length > 0) rdArray.removeAt(0);
    expect(component.requestForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.requestForm.patchValue(validData);
    const ppArray = component.requestForm.get('performanceParameters') as FormArray;
    const rdArray = component.requestForm.get('rawData') as FormArray;
    while (ppArray.length > 0) ppArray.removeAt(0);
    while (rdArray.length > 0) rdArray.removeAt(0);
    component.onSubmit();
    expect(methodVerificationServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/nabl/method-verification']);
  });

  it('should show toast on successful save', () => {
    component.requestForm.patchValue(validData);
    const ppArray = component.requestForm.get('performanceParameters') as FormArray;
    const rdArray = component.requestForm.get('rawData') as FormArray;
    while (ppArray.length > 0) ppArray.removeAt(0);
    while (rdArray.length > 0) rdArray.removeAt(0);
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });
});
