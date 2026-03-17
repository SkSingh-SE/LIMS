// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { InternalAuditorFormComponent } from './internal-auditor-form.component';
import { InternalAuditorService } from '../../../../services/internal-auditor.service';

describe('InternalAuditorFormComponent', () => {
  let component: InternalAuditorFormComponent;
  let fixture: ComponentFixture<InternalAuditorFormComponent>;
  let serviceSpy: jasmine.SpyObj<InternalAuditorService>;
  let router: Router;

  const activatedRouteMock = {
    paramMap: of(convertToParamMap({})),
    snapshot: {
      paramMap: convertToParamMap({}),
      url: [],
    },
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('InternalAuditorService', ['create', 'update', 'getById', 'getAll', 'delete']);
    serviceSpy.create.and.returnValue(of({ message: 'Saved' } as any));
    serviceSpy.getById.and.returnValue(of(null as any));
    serviceSpy.getAll.and.returnValue(of([] as any));

    await TestBed.configureTestingModule({
      imports: [
        InternalAuditorFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: InternalAuditorService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(InternalAuditorFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with default values', () => {
    expect(component.auditorForm).toBeDefined();
    expect(component.auditorForm.get('formatNo')?.value).toBe('F-49');
    expect(component.auditorForm.get('docNo')?.value).toBeTruthy();
    expect(component.auditorForm.get('issueNo')?.value).toBe('03');
    expect(component.auditorForm.get('issueDate')?.value).toBe('2021-10-01');
    expect(component.auditorForm.get('revNo')?.value).toBe('00');
    expect(component.auditorForm.get('revDate')?.value).toBe('--');
  });

  it('should be invalid when required fields are empty', () => {
    component.auditorForm.patchValue({
      auditorName: '',
      qualification: '',
      trainingDate: '',
      examScore: '',
    });
    expect(component.auditorForm.valid).toBeFalse();
  });

  it('should mark required fields as invalid when cleared', () => {
    const requiredFields = [
      'formatNo', 'docNo', 'issueNo', 'issueDate', 'revNo', 'revDate',
      'auditorName', 'qualification', 'trainingDate', 'examScore',
    ];
    requiredFields.forEach(field => {
      const control = component.auditorForm.get(field);
      control?.setValue('');
      expect(control?.valid).toBeFalse();
    });
  });

  it('should call service.create and navigate to /internal-auditor on valid submit in create mode', () => {
    const navigateSpy = spyOn(router, 'navigate');

    component.isEditMode = false;
    component.auditorForm.setValue({
      formatNo: 'F-49',
      docNo: 'DMSPL/F-49',
      issueNo: '01',
      issueDate: '2021-10-01',
      revNo: '00',
      revDate: '--',
      auditorName: 'John Auditor',
      qualification: 'ISO 9001 Lead Auditor',
      trainingDate: '2025-01-01',
      examScore: 85,
      remarks: '',
    });

    expect(component.auditorForm.valid).toBeTrue();
    component.onSubmit();

    expect(serviceSpy.create).toHaveBeenCalledWith(component.auditorForm.value);
    expect(navigateSpy).toHaveBeenCalledWith(['/internal-auditor']);
  });

  it('should not call service.create when form is invalid', () => {
    component.isEditMode = false;
    component.auditorForm.patchValue({ auditorName: '', qualification: '' });

    component.onSubmit();

    expect(serviceSpy.create).not.toHaveBeenCalled();
  });

  it('should navigate to /internal-auditor on goBack (onCancel)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/internal-auditor']);
  });
});
