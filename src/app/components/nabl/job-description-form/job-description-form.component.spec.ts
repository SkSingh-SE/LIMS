// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { JobDescriptionFormComponent } from './job-description-form.component';
import { JobDescriptionService } from '../../../services/job-description.service';
import { DesignationService } from '../../../services/designation.service';
import { DepartmentService } from '../../../services/department.service';
import { ToastService } from '../../../services/toast.service';

describe('JobDescriptionFormComponent', () => {
  let component: JobDescriptionFormComponent;
  let fixture: ComponentFixture<JobDescriptionFormComponent>;
  let jobDescriptionServiceSpy: jasmine.SpyObj<JobDescriptionService>;
  let designationServiceSpy: jasmine.SpyObj<DesignationService>;
  let departmentServiceSpy: jasmine.SpyObj<DepartmentService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    jobDescriptionServiceSpy = jasmine.createSpyObj('JobDescriptionService', [
      'create',
      'update',
      'getById',
      'getDefaultConfidentialityClause',
    ]);
    jobDescriptionServiceSpy.create.and.returnValue(of({ message: 'Created successfully' }));
    jobDescriptionServiceSpy.update.and.returnValue(of({ message: 'Updated successfully' }));
    jobDescriptionServiceSpy.getById.and.returnValue(of(null));
    jobDescriptionServiceSpy.getDefaultConfidentialityClause.and.returnValue('Sample confidentiality clause');

    designationServiceSpy = jasmine.createSpyObj('DesignationService', ['getDesignationDropdown']);
    designationServiceSpy.getDesignationDropdown.and.returnValue(of([]));

    departmentServiceSpy = jasmine.createSpyObj('DepartmentService', ['getDepartmentDropdown']);
    departmentServiceSpy.getDepartmentDropdown.and.returnValue(of([]));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [JobDescriptionFormComponent, RouterTestingModule, HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: JobDescriptionService, useValue: jobDescriptionServiceSpy },
        { provide: DesignationService, useValue: designationServiceSpy },
        { provide: DepartmentService, useValue: departmentServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: { paramMap: convertToParamMap({}) },
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(JobDescriptionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.jobDescForm).toBeDefined();
    expect(component.jobDescForm.get('formatNo')?.value).toBe('F-3');
    expect(component.jobDescForm.get('issueNo')?.value).toBe('01');
    expect(component.jobDescForm.get('revNo')?.value).toBe('00');
    expect(component.jobDescForm.get('documentNo')?.value).toBe('F-3');
  });

  it('should be invalid when required fields are empty', () => {
    component.jobDescForm.patchValue({
      formatNo: '',
      issueNo: '',
      revNo: '',
      date: '',
      documentNo: '',
      designationId: null,
      departmentId: null,
      reportingTo: '',
      minimumQualification: '',
      principalAccountabilities: '',
    });
    expect(component.jobDescForm.valid).toBeFalse();
  });

  it('should be valid when all required fields are filled', () => {
    component.jobDescForm.patchValue({
      formatNo: 'F-3',
      issueNo: '01',
      revNo: '00',
      date: '2026-03-13',
      documentNo: 'F-3',
      designationId: 1,
      departmentId: 1,
      reportingTo: 'Manager',
      minimumQualification: 'B.Sc',
      principalAccountabilities: 'Testing duties',
    });
    expect(component.jobDescForm.valid).toBeTrue();
  });

  it('should call create on valid submit in create mode', () => {
    component.isEditMode = false;
    component.jobDescForm.patchValue({
      formatNo: 'F-3',
      issueNo: '01',
      revNo: '00',
      date: '2026-03-13',
      documentNo: 'F-3',
      designationId: 1,
      departmentId: 1,
      reportingTo: 'Manager',
      minimumQualification: 'B.Sc',
      principalAccountabilities: 'Testing duties',
    });
    component.onSubmit();
    expect(jobDescriptionServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate back to job-description list on goBack', () => {
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigate');
    component.goBack();
    expect(spy).toHaveBeenCalledWith(['/job-description']);
  });

  it('should show warning toast when submitting invalid form', () => {
    component.jobDescForm.patchValue({
      formatNo: '',
      designationId: null,
      departmentId: null,
      reportingTo: '',
      minimumQualification: '',
      principalAccountabilities: '',
    });
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Please fill all required fields', 'warning');
  });

  it('should toggle accordion section visibility', () => {
    component.openSections['header'] = true;
    component.toggleSection('header');
    expect(component.openSections['header']).toBeFalse();
    component.toggleSection('header');
    expect(component.openSections['header']).toBeTrue();
  });
});
