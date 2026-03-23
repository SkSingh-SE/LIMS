// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SampleLabelNablFormComponent } from './sample-label-form.component';
import { SampleLabelNablService } from '../../../../services/sample-label-nabl.service';
import { ToastService } from '../../../../services/toast.service';

describe('SampleLabelNablFormComponent', () => {
  let component: SampleLabelNablFormComponent;
  let fixture: ComponentFixture<SampleLabelNablFormComponent>;
  let sampleLabelServiceSpy: jasmine.SpyObj<SampleLabelNablService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const validData = {
    formatNo: 'F-29',
    issueNo: '01',
    revNo: '00',
    sampleId: 'SMP-2026-001',
    receiptDate: '2026-03-13',
    description: 'Steel Rod',
    quantity: '3 pieces',
    testParameters: 'Tensile, Hardness',
    preparedBy: 'Lab Tech',
  };

  beforeEach(async () => {
    sampleLabelServiceSpy = jasmine.createSpyObj('SampleLabelNablService', ['create', 'update', 'getById', 'save']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    sampleLabelServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    sampleLabelServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    sampleLabelServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    sampleLabelServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [SampleLabelNablFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: SampleLabelNablService, useValue: sampleLabelServiceSpy },
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

    fixture = TestBed.createComponent(SampleLabelNablFormComponent);
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

  it('should mark sampleId as required', () => {
    const ctrl = component.requestForm.get('sampleId');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark receiptDate as required', () => {
    const ctrl = component.requestForm.get('receiptDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark description as required', () => {
    const ctrl = component.requestForm.get('description');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark quantity as required', () => {
    const ctrl = component.requestForm.get('quantity');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark testParameters as required', () => {
    const ctrl = component.requestForm.get('testParameters');
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
    expect(component.requestForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.requestForm.patchValue(validData);
    component.onSubmit();
    expect(sampleLabelServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/nabl/sample-label']);
  });

  it('should show toast on successful save', () => {
    component.requestForm.patchValue(validData);
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalled();
  });
});
