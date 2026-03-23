// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { QualityControlPlanFormComponent } from './quality-control-plan-form.component';
import { QualityControlPlanService } from '../../../../services/quality-control-plan.service';
import { ToastService } from '../../../../services/toast.service';

describe('QualityControlPlanFormComponent', () => {
  let component: QualityControlPlanFormComponent;
  let fixture: ComponentFixture<QualityControlPlanFormComponent>;
  let qualityControlPlanServiceSpy: jasmine.SpyObj<QualityControlPlanService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-33',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-33',
    planYear: 2026,
    discipline: 'Mechanical',
    materialProductGroup: 'Metals',
    labIncharge: 'Lab Manager',
    preparedBy: 'Quality Officer',
  };

  beforeEach(async () => {
    qualityControlPlanServiceSpy = jasmine.createSpyObj('QualityControlPlanService', [
      'create',
      'update',
      'getById',
      'save',
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    qualityControlPlanServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    qualityControlPlanServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    qualityControlPlanServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    qualityControlPlanServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [QualityControlPlanFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: QualityControlPlanService, useValue: qualityControlPlanServiceSpy },
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

    fixture = TestBed.createComponent(QualityControlPlanFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize qcpForm on creation', () => {
    expect(component.qcpForm).toBeDefined();
  });

  it('should have an activities FormArray', () => {
    const arr = component.qcpForm.get('activities');
    expect(arr).toBeTruthy();
    expect(arr instanceof FormArray).toBeTrue();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.qcpForm.reset();
    expect(component.qcpForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.qcpForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.qcpForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.qcpForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark date as required', () => {
    const ctrl = component.qcpForm.get('date');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentNo as required', () => {
    const ctrl = component.qcpForm.get('documentNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark planYear as required', () => {
    const ctrl = component.qcpForm.get('planYear');
    ctrl?.setValue(null);
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark discipline as required', () => {
    const ctrl = component.qcpForm.get('discipline');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark materialProductGroup as required', () => {
    const ctrl = component.qcpForm.get('materialProductGroup');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark labIncharge as required', () => {
    const ctrl = component.qcpForm.get('labIncharge');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark preparedBy as required', () => {
    const ctrl = component.qcpForm.get('preparedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.qcpForm.patchValue(validData);
    const arr = component.qcpForm.get('activities') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    expect(component.qcpForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.qcpForm.patchValue(validData);
    const arr = component.qcpForm.get('activities') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(qualityControlPlanServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/quality-control-plan']);
  });

  it('should show toast on successful save', () => {
    component.qcpForm.patchValue(validData);
    const arr = component.qcpForm.get('activities') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });

  it('should have activities as a FormArray instance', () => {
    const activitiesCtrl = component.qcpForm.get('activities');
    expect(activitiesCtrl instanceof FormArray).toBeTrue();
  });
});
