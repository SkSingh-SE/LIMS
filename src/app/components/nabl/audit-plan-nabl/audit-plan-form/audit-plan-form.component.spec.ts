// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { AuditPlanFormComponent } from './audit-plan-form.component';
import { AuditPlanService } from '../../../../services/audit-plan.service';

describe('AuditPlanFormComponent', () => {
  let component: AuditPlanFormComponent;
  let fixture: ComponentFixture<AuditPlanFormComponent>;
  let serviceSpy: jasmine.SpyObj<AuditPlanService>;
  let router: Router;

  const activatedRouteMock = {
    paramMap: of(convertToParamMap({})),
    snapshot: {
      paramMap: convertToParamMap({}),
      url: [],
    },
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AuditPlanService', ['create', 'update', 'getById', 'getAll', 'delete']);
    serviceSpy.create.and.returnValue(of({ message: 'Saved' } as any));
    serviceSpy.getById.and.returnValue(of(null as any));
    serviceSpy.getAll.and.returnValue(of([] as any));

    await TestBed.configureTestingModule({
      imports: [
        AuditPlanFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: AuditPlanService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditPlanFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with default values', () => {
    expect(component.auditForm).toBeDefined();
    expect(component.auditForm.get('formatNo')?.value).toBe('F-50');
    expect(component.auditForm.get('docNo')?.value).toBeTruthy();
    expect(component.auditForm.get('issueNo')?.value).toBe('03');
    expect(component.auditForm.get('issueDate')?.value).toBe('2021-10-01');
    expect(component.auditForm.get('revNo')?.value).toBe('00');
    expect(component.auditForm.get('revDate')?.value).toBe('--');
    expect(component.auditForm.get('auditType')?.value).toBe('Internal Audit');
  });

  it('should be invalid when required fields are empty', () => {
    component.auditForm.patchValue({
      period: '',
      areaDepartment: '',
      auditorName: '',
      scheduleDate: '',
      scope: '',
    });
    expect(component.auditForm.valid).toBeFalse();
  });

  it('should mark required fields as invalid when cleared', () => {
    const requiredFields = [
      'formatNo', 'docNo', 'issueNo', 'issueDate', 'revNo', 'revDate',
      'auditType', 'period', 'areaDepartment', 'auditorName', 'scheduleDate', 'scope',
    ];
    requiredFields.forEach(field => {
      const control = component.auditForm.get(field);
      control?.setValue('');
      expect(control?.valid).toBeFalse();
    });
  });

  it('should call service.create and navigate to /audit-plan on valid submit in create mode', () => {
    const navigateSpy = spyOn(router, 'navigate');

    component.isEditMode = false;
    component.auditForm.setValue({
      formatNo: 'F-50',
      docNo: 'DMSPL/F-50',
      issueNo: '03',
      issueDate: '2021-10-01',
      revNo: '00',
      revDate: '--',
      auditType: 'Internal Audit',
      period: 'Q1 2026',
      areaDepartment: 'Testing Lab',
      auditorName: 'John Auditor',
      scheduleDate: '2026-03-15',
      scope: 'Full audit',
    });

    expect(component.auditForm.valid).toBeTrue();
    component.onSubmit();

    expect(serviceSpy.create).toHaveBeenCalledWith(component.auditForm.value);
    expect(navigateSpy).toHaveBeenCalledWith(['/audit-plan']);
  });

  it('should not call service.create when form is invalid', () => {
    component.isEditMode = false;
    component.auditForm.patchValue({ period: '', areaDepartment: '' });

    component.onSubmit();

    expect(serviceSpy.create).not.toHaveBeenCalled();
  });

  it('should navigate to /audit-plan on goBack (onCancel)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/audit-plan']);
  });
});
