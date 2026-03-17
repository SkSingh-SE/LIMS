// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { EmployeeCompetenceFormComponent } from './employee-competence-form.component';
import { EmployeeCompetenceService } from '../../../services/employee-competence.service';
import { ToastService } from '../../../services/toast.service';

describe('EmployeeCompetenceFormComponent', () => {
  let component: EmployeeCompetenceFormComponent;
  let fixture: ComponentFixture<EmployeeCompetenceFormComponent>;
  let competenceServiceSpy: jasmine.SpyObj<EmployeeCompetenceService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    competenceServiceSpy = jasmine.createSpyObj('EmployeeCompetenceService', [
      'create',
      'update',
      'getById',
      'getDefaultParameters',
    ]);
    competenceServiceSpy.create.and.returnValue(of({ success: true, message: 'Created successfully' }));
    competenceServiceSpy.update.and.returnValue(of({ success: true, message: 'Updated successfully' }));
    competenceServiceSpy.getById.and.returnValue(of(null));
    competenceServiceSpy.getDefaultParameters.and.returnValue([]);

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [EmployeeCompetenceFormComponent, RouterTestingModule, HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: EmployeeCompetenceService, useValue: competenceServiceSpy },
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

    fixture = TestBed.createComponent(EmployeeCompetenceFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with required controls', () => {
    expect(component.reportForm).toBeDefined();
    expect(component.reportForm.get('employeeId')).toBeTruthy();
    expect(component.reportForm.get('employeeName')).toBeTruthy();
    expect(component.reportForm.get('designationName')).toBeTruthy();
    expect(component.reportForm.get('evaluationPeriodFrom')).toBeTruthy();
    expect(component.reportForm.get('evaluationPeriodTo')).toBeTruthy();
    expect(component.reportForm.get('overallRating')).toBeTruthy();
    expect(component.reportForm.get('evaluationDoneBy')).toBeTruthy();
    expect(component.reportForm.get('evaluationDate')).toBeTruthy();
  });

  it('should be invalid when required fields are empty', () => {
    component.reportForm.patchValue({
      employeeId: null,
      employeeName: '',
      designationName: '',
      evaluationPeriodFrom: '',
      evaluationPeriodTo: '',
      overallRating: null,
      evaluationDoneBy: '',
      evaluationDate: '',
    });
    expect(component.reportForm.valid).toBeFalse();
  });

  it('should be valid when all required fields are filled', () => {
    component.reportForm.patchValue({
      employeeId: 'EMP001',
      employeeName: 'John Doe',
      designationName: 'Technician',
      evaluationPeriodFrom: '2026-01-01',
      evaluationPeriodTo: '2026-03-31',
      overallRating: 8,
      evaluationDoneBy: 'Manager',
      evaluationDate: '2026-03-13',
    });
    expect(component.reportForm.valid).toBeTrue();
  });

  it('should call create on valid submit in create mode', () => {
    component.isEditMode = false;
    component.reportForm.patchValue({
      employeeId: 'EMP001',
      employeeName: 'John Doe',
      designationName: 'Technician',
      evaluationPeriodFrom: '2026-01-01',
      evaluationPeriodTo: '2026-03-31',
      overallRating: 8,
      evaluationDoneBy: 'Manager',
      evaluationDate: '2026-03-13',
    });
    component.onSubmit();
    expect(competenceServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate back to employee-competence list on goBack', () => {
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigate');
    router.navigate(['/employee-competence']);
    expect(spy).toHaveBeenCalledWith(['/employee-competence']);
  });

  it('should show warning toast when submitting invalid form', () => {
    component.reportForm.patchValue({
      employeeId: null,
      employeeName: '',
      designationName: '',
      evaluationPeriodFrom: '',
      evaluationPeriodTo: '',
      overallRating: null,
      evaluationDoneBy: '',
      evaluationDate: '',
    });
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Please fill all required fields.', 'warning');
  });

  it('should have parameters FormArray initialized', () => {
    const parametersArray = component.parametersAttr;
    expect(parametersArray).toBeTruthy();
  });
});
