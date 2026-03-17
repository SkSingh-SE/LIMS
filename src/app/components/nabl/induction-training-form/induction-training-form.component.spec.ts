// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { InductionTrainingFormComponent } from './induction-training-form.component';
import { InductionTrainingService } from '../../../services/induction-training.service';
import { ToastService } from '../../../services/toast.service';

describe('InductionTrainingFormComponent', () => {
  let component: InductionTrainingFormComponent;
  let fixture: ComponentFixture<InductionTrainingFormComponent>;
  let trainingServiceSpy: jasmine.SpyObj<InductionTrainingService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    trainingServiceSpy = jasmine.createSpyObj('InductionTrainingService', ['create', 'update', 'getById']);
    trainingServiceSpy.create.and.returnValue(of({ success: true, message: 'Created successfully' }));
    trainingServiceSpy.update.and.returnValue(of({ success: true, message: 'Updated successfully' }));
    trainingServiceSpy.getById.and.returnValue(of(null));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [InductionTrainingFormComponent, RouterTestingModule, HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: InductionTrainingService, useValue: trainingServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        DatePipe,
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: { paramMap: convertToParamMap({}) },
            params: of({}),
            url: of([]),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(InductionTrainingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.trainingForm).toBeDefined();
    expect(component.trainingForm.get('formatNo')?.value).toBe('F-6');
    expect(component.trainingForm.get('issueNo')?.value).toBe('01');
    expect(component.trainingForm.get('revNo')?.value).toBe('00');
    expect(component.trainingForm.get('evaluationMode')?.value).toBe('Retesting');
  });

  it('should be invalid when required fields are empty', () => {
    component.trainingForm.patchValue({
      formatNo: '',
      issueNo: '',
      revNo: '',
      date: '',
      employeeName: '',
      qualification: '',
      dateOfJoining: '',
      position: '',
      trainingDate: '',
      trainerName: '',
      trainerDesignation: '',
      sampleName: '',
      sampleRefNo: '',
      parameter: '',
      testMethodSop: '',
      evaluationDate: '',
      evaluationMode: '',
      evalParameter: '',
      evalTestMethodSop: '',
    });
    expect(component.trainingForm.valid).toBeFalse();
  });

  it('should be valid when all required fields are filled', () => {
    component.trainingForm.patchValue({
      formatNo: 'F-6',
      issueNo: '01',
      revNo: '00',
      date: '2026-03-13',
      employeeName: 'Jane Doe',
      qualification: 'B.Sc',
      dateOfJoining: '2026-01-01',
      position: 'Lab Technician',
      trainingDate: '2026-03-01',
      trainerName: 'Senior Tech',
      trainerDesignation: 'Sr. Technician',
      sampleName: 'Steel Sample',
      sampleRefNo: 'SS-001',
      parameter: 'Tensile Strength',
      testMethodSop: 'IS 1608',
      evaluationDate: '2026-03-10',
      evaluationMode: 'Retesting',
      evalParameter: 'Tensile Strength',
      evalTestMethodSop: 'IS 1608',
    });
    expect(component.trainingForm.valid).toBeTrue();
  });

  it('should call create on valid submit in create mode', () => {
    component.isEditMode = false;
    component.trainingForm.patchValue({
      formatNo: 'F-6',
      issueNo: '01',
      revNo: '00',
      date: '2026-03-13',
      employeeName: 'Jane Doe',
      qualification: 'B.Sc',
      dateOfJoining: '2026-01-01',
      position: 'Lab Technician',
      trainingDate: '2026-03-01',
      trainerName: 'Senior Tech',
      trainerDesignation: 'Sr. Technician',
      sampleName: 'Steel Sample',
      sampleRefNo: 'SS-001',
      parameter: 'Tensile Strength',
      testMethodSop: 'IS 1608',
      evaluationDate: '2026-03-10',
      evaluationMode: 'Retesting',
      evalParameter: 'Tensile Strength',
      evalTestMethodSop: 'IS 1608',
    });
    component.onSubmit();
    expect(trainingServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate back to induction-training list on goBack', () => {
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigate');
    router.navigate(['/induction-training']);
    expect(spy).toHaveBeenCalledWith(['/induction-training']);
  });

  it('should show warning toast when submitting invalid form', () => {
    component.trainingForm.patchValue({
      formatNo: '',
      issueNo: '',
      revNo: '',
      date: '',
      employeeName: '',
      qualification: '',
      dateOfJoining: '',
      position: '',
      trainingDate: '',
      trainerName: '',
      trainerDesignation: '',
      sampleName: '',
      sampleRefNo: '',
      parameter: '',
      testMethodSop: '',
      evaluationDate: '',
      evaluationMode: '',
      evalParameter: '',
      evalTestMethodSop: '',
    });
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Please fill all required fields.', 'warning');
  });

  it('should toggle accordion section visibility', () => {
    component.openSections['employee'] = true;
    component.toggleSection('employee');
    expect(component.openSections['employee']).toBeFalse();
    component.toggleSection('employee');
    expect(component.openSections['employee']).toBeTrue();
  });
});
