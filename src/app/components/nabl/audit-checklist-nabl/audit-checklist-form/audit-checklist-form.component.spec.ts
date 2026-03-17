// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { AuditChecklistFormComponent } from './audit-checklist-form.component';
import { AuditChecklistService } from '../../../../services/audit-checklist.service';

describe('AuditChecklistFormComponent', () => {
  let component: AuditChecklistFormComponent;
  let fixture: ComponentFixture<AuditChecklistFormComponent>;
  let serviceSpy: jasmine.SpyObj<AuditChecklistService>;
  let router: Router;

  const activatedRouteMock = {
    paramMap: of(convertToParamMap({})),
    snapshot: {
      paramMap: convertToParamMap({}),
      url: [],
    },
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AuditChecklistService', ['create', 'update', 'getById', 'getAll', 'delete']);
    serviceSpy.create.and.returnValue(of({ message: 'Saved' } as any));
    serviceSpy.getById.and.returnValue(of(null as any));
    serviceSpy.getAll.and.returnValue(of([] as any));

    await TestBed.configureTestingModule({
      imports: [
        AuditChecklistFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: AuditChecklistService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditChecklistFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with default values', () => {
    expect(component.checklistForm).toBeDefined();
    expect(component.checklistForm.get('formatNo')?.value).toBe('F-51');
    expect(component.checklistForm.get('docNo')?.value).toBeTruthy();
    expect(component.checklistForm.get('issueNo')?.value).toBe('03');
    expect(component.checklistForm.get('issueDate')?.value).toBe('2021-10-01');
    expect(component.checklistForm.get('revNo')?.value).toBe('00');
    expect(component.checklistForm.get('revDate')?.value).toBe('--');
  });

  it('should have items FormArray initialized', () => {
    const itemsArray = component.checklistForm.get('items');
    expect(itemsArray instanceof FormArray).toBeTrue();
    // In create mode ngOnInit calls addItem(), so there should be at least one row
    expect((itemsArray as FormArray).length).toBeGreaterThanOrEqual(1);
  });

  it('should be invalid when required fields are empty', () => {
    component.checklistForm.patchValue({
      areaDepartment: '',
      auditDate: '',
      auditorName: '',
      auditeeName: '',
    });
    expect(component.checklistForm.valid).toBeFalse();
  });

  it('should mark required fields as invalid when cleared', () => {
    const requiredFields = [
      'formatNo', 'docNo', 'issueNo', 'issueDate', 'revNo', 'revDate',
      'areaDepartment', 'auditDate', 'auditorName', 'auditeeName',
    ];
    requiredFields.forEach(field => {
      const control = component.checklistForm.get(field);
      control?.setValue('');
      expect(control?.valid).toBeFalse();
    });
  });

  it('should mark items FormArray group fields as required', () => {
    const itemsArray = component.checklistForm.get('items') as FormArray;
    // Ensure at least one item group exists (added by ngOnInit in create mode)
    if (itemsArray.length === 0) {
      component.addItem();
    }
    const firstItem = itemsArray.at(0);
    const requiredItemFields = ['clauseNo', 'requirement', 'observation'];
    requiredItemFields.forEach(field => {
      firstItem.get(field)?.setValue('');
      expect(firstItem.get(field)?.valid).toBeFalse();
    });
  });

  it('should call service.create and navigate to /audit-checklist on valid submit in create mode', () => {
    const navigateSpy = spyOn(router, 'navigate');

    component.isEditMode = false;

    // Clear existing items and add one valid item
    while (component.items.length) {
      component.items.removeAt(0);
    }
    component.addItem();
    component.items.at(0).setValue({
      clauseNo: '4.1',
      requirement: 'Sample requirement',
      observation: 'Sample observation',
      compliance: 'Yes',
    });

    component.checklistForm.patchValue({
      formatNo: 'F-51',
      docNo: 'DMSPL/F-51',
      issueNo: '03',
      issueDate: '2021-10-01',
      revNo: '00',
      revDate: '--',
      areaDepartment: 'Testing Lab',
      auditDate: '2026-03-15',
      auditorName: 'John Auditor',
      auditeeName: 'Jane Lab',
    });

    expect(component.checklistForm.valid).toBeTrue();
    component.onSubmit();

    expect(serviceSpy.create).toHaveBeenCalledWith(component.checklistForm.value);
    expect(navigateSpy).toHaveBeenCalledWith(['/audit-checklist']);
  });

  it('should not call service.create when form is invalid', () => {
    component.isEditMode = false;
    component.checklistForm.patchValue({ areaDepartment: '', auditorName: '' });

    component.onSubmit();

    expect(serviceSpy.create).not.toHaveBeenCalled();
  });

  it('should navigate to /audit-checklist on goBack (onCancel)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/audit-checklist']);
  });
});
