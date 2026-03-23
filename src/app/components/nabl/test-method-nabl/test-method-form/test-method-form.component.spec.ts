// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { TestMethodNablFormComponent } from './test-method-form.component';
import { TestMethodNablService } from '../../../../services/test-method-nabl.service';
import { ToastService } from '../../../../services/toast.service';

describe('TestMethodNablFormComponent', () => {
  let component: TestMethodNablFormComponent;
  let fixture: ComponentFixture<TestMethodNablFormComponent>;
  let testMethodServiceSpy: jasmine.SpyObj<TestMethodNablService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-11',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-11',
    listType: 'Accredited',
    title: 'List of Accredited Test Methods',
    preparedBy: 'Lab Tech',
    issuedBy: 'Lab Manager',
    reviewedBy: 'Quality Manager',
  };

  beforeEach(async () => {
    testMethodServiceSpy = jasmine.createSpyObj('TestMethodNablService', ['create', 'update', 'getById', 'save']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    testMethodServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    testMethodServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    testMethodServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    testMethodServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [TestMethodNablFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: TestMethodNablService, useValue: testMethodServiceSpy },
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

    fixture = TestBed.createComponent(TestMethodNablFormComponent);
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

  it('should have an entries FormArray', () => {
    const entriesArray = component.requestForm.get('entries');
    expect(entriesArray).toBeTruthy();
    expect(entriesArray instanceof FormArray).toBeTrue();
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

  it('should mark listType as required', () => {
    const ctrl = component.requestForm.get('listType');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark title as required', () => {
    const ctrl = component.requestForm.get('title');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark preparedBy as required', () => {
    const ctrl = component.requestForm.get('preparedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issuedBy as required', () => {
    const ctrl = component.requestForm.get('issuedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark reviewedBy as required', () => {
    const ctrl = component.requestForm.get('reviewedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.requestForm.patchValue(validData);
    const entriesArray = component.requestForm.get('entries') as FormArray;
    while (entriesArray.length > 0) {
      entriesArray.removeAt(0);
    }
    expect(component.requestForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.requestForm.patchValue(validData);
    const entriesArray = component.requestForm.get('entries') as FormArray;
    while (entriesArray.length > 0) {
      entriesArray.removeAt(0);
    }
    component.onSubmit();
    expect(testMethodServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/nabl/test-method']);
  });

  it('should show toast on successful save', () => {
    component.requestForm.patchValue(validData);
    const entriesArray = component.requestForm.get('entries') as FormArray;
    while (entriesArray.length > 0) {
      entriesArray.removeAt(0);
    }
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });

  it('should have entries as a FormArray instance', () => {
    const entriesCtrl = component.requestForm.get('entries');
    expect(entriesCtrl instanceof FormArray).toBeTrue();
  });
});
