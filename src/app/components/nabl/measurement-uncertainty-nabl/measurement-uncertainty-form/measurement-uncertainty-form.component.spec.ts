// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { MeasurementUncertaintyFormComponent } from './measurement-uncertainty-form.component';
import { MeasurementUncertaintyService } from '../../../../services/measurement-uncertainty.service';
import { ToastService } from '../../../../services/toast.service';

describe('MeasurementUncertaintyFormComponent', () => {
  let component: MeasurementUncertaintyFormComponent;
  let fixture: ComponentFixture<MeasurementUncertaintyFormComponent>;
  let measurementUncertaintyServiceSpy: jasmine.SpyObj<MeasurementUncertaintyService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-54',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-54',
    testParameter: 'Tensile Strength',
    testMethod: 'IS 1608',
    equipmentUsed: 'UTM',
    sampleDescription: 'Steel specimens',
    numberOfReadings: 5,
    coverageFactor: 2,
    confidenceLevel: '95%',
    preparedBy: 'Lab Tech',
  };

  beforeEach(async () => {
    measurementUncertaintyServiceSpy = jasmine.createSpyObj('MeasurementUncertaintyService', [
      'create',
      'update',
      'getById',
      'save',
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    measurementUncertaintyServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    measurementUncertaintyServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    measurementUncertaintyServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    measurementUncertaintyServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [
        MeasurementUncertaintyFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: MeasurementUncertaintyService, useValue: measurementUncertaintyServiceSpy },
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

    fixture = TestBed.createComponent(MeasurementUncertaintyFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize uncertaintyForm on creation', () => {
    expect(component.uncertaintyForm).toBeDefined();
  });

  it('should have a readings FormArray', () => {
    const arr = component.uncertaintyForm.get('readings');
    expect(arr).toBeTruthy();
    expect(arr instanceof FormArray).toBeTrue();
  });

  it('should have an uncertaintySources FormArray', () => {
    const arr = component.uncertaintyForm.get('uncertaintySources');
    expect(arr).toBeTruthy();
    expect(arr instanceof FormArray).toBeTrue();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.uncertaintyForm.reset();
    expect(component.uncertaintyForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.uncertaintyForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.uncertaintyForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.uncertaintyForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark date as required', () => {
    const ctrl = component.uncertaintyForm.get('date');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentNo as required', () => {
    const ctrl = component.uncertaintyForm.get('documentNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark testParameter as required', () => {
    const ctrl = component.uncertaintyForm.get('testParameter');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark testMethod as required', () => {
    const ctrl = component.uncertaintyForm.get('testMethod');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark equipmentUsed as required', () => {
    const ctrl = component.uncertaintyForm.get('equipmentUsed');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark sampleDescription as required', () => {
    const ctrl = component.uncertaintyForm.get('sampleDescription');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark numberOfReadings as required', () => {
    const ctrl = component.uncertaintyForm.get('numberOfReadings');
    ctrl?.setValue(null);
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark coverageFactor as required', () => {
    const ctrl = component.uncertaintyForm.get('coverageFactor');
    ctrl?.setValue(null);
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark confidenceLevel as required', () => {
    const ctrl = component.uncertaintyForm.get('confidenceLevel');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark preparedBy as required', () => {
    const ctrl = component.uncertaintyForm.get('preparedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.uncertaintyForm.patchValue(validData);
    const readingsArr = component.uncertaintyForm.get('readings') as FormArray;
    const sourcesArr = component.uncertaintyForm.get('uncertaintySources') as FormArray;
    while (readingsArr.length > 0) readingsArr.removeAt(0);
    while (sourcesArr.length > 0) sourcesArr.removeAt(0);
    expect(component.uncertaintyForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.uncertaintyForm.patchValue(validData);
    const readingsArr = component.uncertaintyForm.get('readings') as FormArray;
    const sourcesArr = component.uncertaintyForm.get('uncertaintySources') as FormArray;
    while (readingsArr.length > 0) readingsArr.removeAt(0);
    while (sourcesArr.length > 0) sourcesArr.removeAt(0);
    component.onSubmit();
    expect(measurementUncertaintyServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/measurement-uncertainty']);
  });

  it('should show toast on successful save', () => {
    component.uncertaintyForm.patchValue(validData);
    const readingsArr = component.uncertaintyForm.get('readings') as FormArray;
    const sourcesArr = component.uncertaintyForm.get('uncertaintySources') as FormArray;
    while (readingsArr.length > 0) readingsArr.removeAt(0);
    while (sourcesArr.length > 0) sourcesArr.removeAt(0);
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });
});
