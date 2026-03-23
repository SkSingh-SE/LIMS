// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { TestRequestNablFormComponent } from './test-request-form.component';
import { TestRequestNablService } from '../../../../services/test-request-nabl.service';
import { ToastService } from '../../../../services/toast.service';

describe('TestRequestNablFormComponent', () => {
  let component: TestRequestNablFormComponent;
  let fixture: ComponentFixture<TestRequestNablFormComponent>;
  let testRequestServiceSpy: jasmine.SpyObj<TestRequestNablService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-10',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-10',
    customerName: 'Test Corp',
    address: '123 Main St',
    contactPerson: 'John Customer',
    mobileNo: '9876543210',
    email: 'test@corp.com',
    preparedBy: 'Reception Staff',
  };

  beforeEach(async () => {
    testRequestServiceSpy = jasmine.createSpyObj('TestRequestNablService', ['create', 'update', 'getById', 'save']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    testRequestServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    testRequestServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    testRequestServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    testRequestServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [TestRequestNablFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: TestRequestNablService, useValue: testRequestServiceSpy },
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

    fixture = TestBed.createComponent(TestRequestNablFormComponent);
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

  it('should have a samples FormArray', () => {
    const samplesArray = component.requestForm.get('samples');
    expect(samplesArray).toBeTruthy();
    expect(samplesArray instanceof FormArray).toBeTrue();
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

  it('should mark customerName as required', () => {
    const ctrl = component.requestForm.get('customerName');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark address as required', () => {
    const ctrl = component.requestForm.get('address');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark contactPerson as required', () => {
    const ctrl = component.requestForm.get('contactPerson');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark mobileNo as required', () => {
    const ctrl = component.requestForm.get('mobileNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark email as required', () => {
    const ctrl = component.requestForm.get('email');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark preparedBy as required', () => {
    const ctrl = component.requestForm.get('preparedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.requestForm.patchValue(validData);
    const samplesArray = component.requestForm.get('samples') as FormArray;
    while (samplesArray.length > 0) {
      samplesArray.removeAt(0);
    }
    expect(component.requestForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.requestForm.patchValue(validData);
    const samplesArray = component.requestForm.get('samples') as FormArray;
    while (samplesArray.length > 0) {
      samplesArray.removeAt(0);
    }
    component.onSubmit();
    expect(testRequestServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/nabl/test-request']);
  });

  it('should show toast on successful save', () => {
    component.requestForm.patchValue(validData);
    const samplesArray = component.requestForm.get('samples') as FormArray;
    while (samplesArray.length > 0) {
      samplesArray.removeAt(0);
    }
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });

  it('should have samples as a FormArray instance', () => {
    const samplesCtrl = component.requestForm.get('samples');
    expect(samplesCtrl instanceof FormArray).toBeTrue();
  });
});
