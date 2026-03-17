// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { AuditSummaryFormComponent } from './audit-summary-form.component';
import { AuditSummaryService } from '../../../../services/audit-summary.service';

describe('AuditSummaryFormComponent', () => {
  let component: AuditSummaryFormComponent;
  let fixture: ComponentFixture<AuditSummaryFormComponent>;
  let serviceSpy: jasmine.SpyObj<AuditSummaryService>;
  let router: Router;

  const activatedRouteMock = {
    paramMap: of(convertToParamMap({})),
    snapshot: {
      paramMap: convertToParamMap({}),
      url: [],
    },
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AuditSummaryService', ['create', 'update', 'getById', 'getAll', 'delete']);
    serviceSpy.create.and.returnValue(of({ message: 'Saved' } as any));
    serviceSpy.getById.and.returnValue(of(null as any));
    serviceSpy.getAll.and.returnValue(of([] as any));

    await TestBed.configureTestingModule({
      imports: [
        AuditSummaryFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: AuditSummaryService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditSummaryFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with default values', () => {
    expect(component.summaryForm).toBeDefined();
    expect(component.summaryForm.get('formatNo')?.value).toBe('F-52');
    expect(component.summaryForm.get('docNo')?.value).toBeTruthy();
    expect(component.summaryForm.get('issueNo')?.value).toBe('03');
    expect(component.summaryForm.get('issueDate')?.value).toBe('2021-10-01');
    expect(component.summaryForm.get('revNo')?.value).toBe('00');
    expect(component.summaryForm.get('revDate')?.value).toBe('--');
    expect(component.summaryForm.get('majorNCs')?.value).toBe(0);
    expect(component.summaryForm.get('minorNCs')?.value).toBe(0);
  });

  it('should be invalid when required fields are empty', () => {
    component.summaryForm.patchValue({
      auditDate: '',
      areasCovered: '',
      observationSummary: '',
      conclusion: '',
    });
    expect(component.summaryForm.valid).toBeFalse();
  });

  it('should mark required fields as invalid when cleared', () => {
    const requiredFields = [
      'formatNo', 'docNo', 'issueNo', 'issueDate', 'revNo', 'revDate',
      'auditDate', 'areasCovered', 'observationSummary', 'conclusion',
    ];
    requiredFields.forEach(field => {
      const control = component.summaryForm.get(field);
      control?.setValue('');
      expect(control?.valid).toBeFalse();
    });
  });

  it('should mark majorNCs invalid when set to null', () => {
    component.summaryForm.get('majorNCs')?.setValue(null);
    expect(component.summaryForm.get('majorNCs')?.valid).toBeFalse();
  });

  it('should call service.create and navigate to /audit-summary on valid submit in create mode', () => {
    const navigateSpy = spyOn(router, 'navigate');

    component.isEditMode = false;
    component.summaryForm.setValue({
      formatNo: 'F-52',
      docNo: 'DMSPL/F-52',
      issueNo: '03',
      issueDate: '2021-10-01',
      revNo: '00',
      revDate: '--',
      auditDate: '2026-03-15',
      areasCovered: 'Full lab',
      majorNCs: 0,
      minorNCs: 2,
      observationSummary: 'Minor issues found',
      conclusion: 'Satisfactory',
    });

    expect(component.summaryForm.valid).toBeTrue();
    component.onSubmit();

    expect(serviceSpy.create).toHaveBeenCalledWith(component.summaryForm.value);
    expect(navigateSpy).toHaveBeenCalledWith(['/audit-summary']);
  });

  it('should not call service.create when form is invalid', () => {
    component.isEditMode = false;
    component.summaryForm.patchValue({ auditDate: '', areasCovered: '' });

    component.onSubmit();

    expect(serviceSpy.create).not.toHaveBeenCalled();
  });

  it('should navigate to /audit-summary on goBack (onCancel)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/audit-summary']);
  });
});
