// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { TechnicalRawDataFormComponent } from './technical-raw-data-form.component';
import { TechnicalRawDataNablService } from '../../../../services/technical-raw-data-nabl.service';
import { ToastService } from '../../../../services/toast.service';

describe('TechnicalRawDataFormComponent', () => {
  let component: TechnicalRawDataFormComponent;
  let fixture: ComponentFixture<TechnicalRawDataFormComponent>;
  let technicalRawDataServiceSpy: jasmine.SpyObj<TechnicalRawDataNablService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-31',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    testMethodName: 'Tensile Strength Test',
    testMethodRef: 'IS 1608:2005',
    equipmentUsed: 'Universal Testing Machine',
    sampleDescription: 'Steel Rod 16mm dia',
    analystName: 'John Tech',
  };

  beforeEach(async () => {
    technicalRawDataServiceSpy = jasmine.createSpyObj('TechnicalRawDataNablService', [
      'create',
      'update',
      'getById',
      'save',
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    technicalRawDataServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    technicalRawDataServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    technicalRawDataServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    technicalRawDataServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [TechnicalRawDataFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: TechnicalRawDataNablService, useValue: technicalRawDataServiceSpy },
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

    fixture = TestBed.createComponent(TechnicalRawDataFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize dataForm on creation', () => {
    expect(component.dataForm).toBeDefined();
  });

  it('should have a readings FormArray', () => {
    const arr = component.dataForm.get('readings');
    expect(arr).toBeTruthy();
    expect(arr instanceof FormArray).toBeTrue();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.dataForm.reset();
    expect(component.dataForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.dataForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.dataForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.dataForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark date as required', () => {
    const ctrl = component.dataForm.get('date');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark testMethodName as required', () => {
    const ctrl = component.dataForm.get('testMethodName');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark testMethodRef as required', () => {
    const ctrl = component.dataForm.get('testMethodRef');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark equipmentUsed as required', () => {
    const ctrl = component.dataForm.get('equipmentUsed');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark sampleDescription as required', () => {
    const ctrl = component.dataForm.get('sampleDescription');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark analystName as required', () => {
    const ctrl = component.dataForm.get('analystName');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.dataForm.patchValue(validData);
    const arr = component.dataForm.get('readings') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    expect(component.dataForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.dataForm.patchValue(validData);
    const arr = component.dataForm.get('readings') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(technicalRawDataServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to goBack route on goBack()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.goBack();
    expect(navigateSpy).toHaveBeenCalledWith(['/nabl/technical-raw-data']);
  });

  it('should show toast on successful save', () => {
    component.dataForm.patchValue(validData);
    const arr = component.dataForm.get('readings') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });

  it('should have readings as a FormArray instance', () => {
    const readingsCtrl = component.dataForm.get('readings');
    expect(readingsCtrl instanceof FormArray).toBeTrue();
  });
});
