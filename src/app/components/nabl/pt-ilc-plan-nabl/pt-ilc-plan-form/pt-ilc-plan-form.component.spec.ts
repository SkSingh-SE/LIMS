// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { PtIlcPlanFormComponent } from './pt-ilc-plan-form.component';
import { PtIlcPlanService } from '../../../../services/pt-ilc-plan.service';
import { ToastService } from '../../../../services/toast.service';

describe('PtIlcPlanFormComponent', () => {
  let component: PtIlcPlanFormComponent;
  let fixture: ComponentFixture<PtIlcPlanFormComponent>;
  let ptIlcPlanServiceSpy: jasmine.SpyObj<PtIlcPlanService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-55',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-55',
    laboratoryId: 'LAB-001',
    laboratoryName: 'Testing Lab',
    fieldOfAccreditation: 'Mechanical Testing',
    periodOfParticipation: '2026',
    preparedBy: 'Lab Manager',
  };

  beforeEach(async () => {
    ptIlcPlanServiceSpy = jasmine.createSpyObj('PtIlcPlanService', ['create', 'update', 'getById', 'save']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    ptIlcPlanServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    ptIlcPlanServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    ptIlcPlanServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    ptIlcPlanServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [PtIlcPlanFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: PtIlcPlanService, useValue: ptIlcPlanServiceSpy },
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

    fixture = TestBed.createComponent(PtIlcPlanFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize planForm on creation', () => {
    expect(component.planForm).toBeDefined();
  });

  it('should have an entries FormArray', () => {
    const arr = component.planForm.get('entries');
    expect(arr).toBeTruthy();
    expect(arr instanceof FormArray).toBeTrue();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.planForm.reset();
    expect(component.planForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.planForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.planForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.planForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark date as required', () => {
    const ctrl = component.planForm.get('date');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentNo as required', () => {
    const ctrl = component.planForm.get('documentNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark laboratoryId as required', () => {
    const ctrl = component.planForm.get('laboratoryId');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark laboratoryName as required', () => {
    const ctrl = component.planForm.get('laboratoryName');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark fieldOfAccreditation as required', () => {
    const ctrl = component.planForm.get('fieldOfAccreditation');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark periodOfParticipation as required', () => {
    const ctrl = component.planForm.get('periodOfParticipation');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark preparedBy as required', () => {
    const ctrl = component.planForm.get('preparedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.planForm.patchValue(validData);
    const arr = component.planForm.get('entries') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    expect(component.planForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.planForm.patchValue(validData);
    const arr = component.planForm.get('entries') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(ptIlcPlanServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/pt-ilc-plan']);
  });

  it('should show toast on successful save', () => {
    component.planForm.patchValue(validData);
    const arr = component.planForm.get('entries') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });

  it('should have entries as a FormArray instance', () => {
    const entriesCtrl = component.planForm.get('entries');
    expect(entriesCtrl instanceof FormArray).toBeTrue();
  });
});
