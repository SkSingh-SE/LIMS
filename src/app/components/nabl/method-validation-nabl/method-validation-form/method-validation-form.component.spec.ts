// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { MethodValidationNablFormComponent } from './method-validation-form.component';
import { MethodValidationNablService } from '../../../../services/method-validation-nabl.service';
import { ToastService } from '../../../../services/toast.service';

describe('MethodValidationNablFormComponent', () => {
  let component: MethodValidationNablFormComponent;
  let fixture: ComponentFixture<MethodValidationNablFormComponent>;
  let methodValidationServiceSpy: jasmine.SpyObj<MethodValidationNablService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-13',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-13',
    testMethodName: 'Tensile Strength',
    scope: 'Steel specimens',
    equipmentUsed: 'UTM',
    reagentsUsed: 'N/A',
    summaryOfResults: 'All parameters within limits',
    conclusion: 'Method validated',
    preparedBy: 'Lab Tech',
    reviewedBy: 'Senior Tech',
    approvedBy: 'Lab Manager',
  };

  beforeEach(async () => {
    methodValidationServiceSpy = jasmine.createSpyObj('MethodValidationNablService', [
      'create',
      'update',
      'getById',
      'save',
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    methodValidationServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    methodValidationServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    methodValidationServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    methodValidationServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [MethodValidationNablFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: MethodValidationNablService, useValue: methodValidationServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
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

    fixture = TestBed.createComponent(MethodValidationNablFormComponent);
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

  it('should have a validationParameters FormArray', () => {
    const arr = component.requestForm.get('validationParameters');
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

  it('should mark scope as required', () => {
    const ctrl = component.requestForm.get('scope');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark equipmentUsed as required', () => {
    const ctrl = component.requestForm.get('equipmentUsed');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark reagentsUsed as required', () => {
    const ctrl = component.requestForm.get('reagentsUsed');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark summaryOfResults as required', () => {
    const ctrl = component.requestForm.get('summaryOfResults');
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
    const arr = component.requestForm.get('validationParameters') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    expect(component.requestForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.requestForm.patchValue(validData);
    const arr = component.requestForm.get('validationParameters') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(methodValidationServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/nabl/method-validation']);
  });

  it('should show toast on successful save', () => {
    component.requestForm.patchValue(validData);
    const arr = component.requestForm.get('validationParameters') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });
});
