// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SampleMusterRegisterNablFormComponent } from './sample-muster-register-form.component';
import { SampleMusterRegisterNablService } from '../../../../services/sample-muster-register-nabl.service';
import { ToastService } from '../../../../services/toast.service';

describe('SampleMusterRegisterNablFormComponent', () => {
  let component: SampleMusterRegisterNablFormComponent;
  let fixture: ComponentFixture<SampleMusterRegisterNablFormComponent>;
  let sampleMusterServiceSpy: jasmine.SpyObj<SampleMusterRegisterNablService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-30',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-30',
    preparedBy: 'Lab Tech',
    reviewedBy: 'Lab Manager',
  };

  beforeEach(async () => {
    sampleMusterServiceSpy = jasmine.createSpyObj('SampleMusterRegisterNablService', [
      'create',
      'update',
      'getById',
      'save',
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    sampleMusterServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    sampleMusterServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    sampleMusterServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    sampleMusterServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [
        SampleMusterRegisterNablFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: SampleMusterRegisterNablService, useValue: sampleMusterServiceSpy },
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

    fixture = TestBed.createComponent(SampleMusterRegisterNablFormComponent);
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
    const arr = component.requestForm.get('entries');
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

  it('should be valid when all required fields are filled', () => {
    component.requestForm.patchValue(validData);
    const arr = component.requestForm.get('entries') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    expect(component.requestForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.requestForm.patchValue(validData);
    const arr = component.requestForm.get('entries') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(sampleMusterServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/nabl/sample-muster-register']);
  });

  it('should show toast on successful save', () => {
    component.requestForm.patchValue(validData);
    const arr = component.requestForm.get('entries') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });

  it('should have entries as a FormArray instance', () => {
    const entriesCtrl = component.requestForm.get('entries');
    expect(entriesCtrl instanceof FormArray).toBeTrue();
  });
});
