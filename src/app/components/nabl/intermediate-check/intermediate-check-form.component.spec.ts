// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { IntermediateCheckFormComponent } from './intermediate-check-form.component';
import { IntermediateCheckService } from '../../../services/intermediate-check.service';
import { EquipmentService } from '../../../services/equipment.service';

describe('IntermediateCheckFormComponent', () => {
  let component: IntermediateCheckFormComponent;
  let fixture: ComponentFixture<IntermediateCheckFormComponent>;
  let intermediateCheckServiceSpy: jasmine.SpyObj<IntermediateCheckService>;
  let equipmentServiceSpy: jasmine.SpyObj<EquipmentService>;
  let router: Router;

  const validData = {
    formatNo: 'F-16',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-16',
    issueDate: '2026-01-01',
    checkMonth: 3,
    checkYear: 2026,
    location: 'Testing Lab',
    equipmentId: 1,
    equipmentName: 'Vernier Caliper',
    equipmentNo: 'EQ-001',
    nextCalibrationDue: '2026-06-01',
    checkedBy: 'Lab Tech',
  };

  beforeEach(async () => {
    intermediateCheckServiceSpy = jasmine.createSpyObj('IntermediateCheckService', [
      'create',
      'update',
      'getById',
      'getAll',
      'delete',
    ]);
    equipmentServiceSpy = jasmine.createSpyObj('EquipmentService', ['getAllEquipments']);

    intermediateCheckServiceSpy.create.and.returnValue(of({ message: 'Saved' } as any));
    intermediateCheckServiceSpy.update.and.returnValue(of({ message: 'Saved' } as any));
    intermediateCheckServiceSpy.getById.and.returnValue(of(null as any));
    equipmentServiceSpy.getAllEquipments.and.returnValue(of({ items: [] } as any));

    await TestBed.configureTestingModule({
      imports: [IntermediateCheckFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: IntermediateCheckService, useValue: intermediateCheckServiceSpy },
        { provide: EquipmentService, useValue: equipmentServiceSpy },
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

    fixture = TestBed.createComponent(IntermediateCheckFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize checkForm on creation', () => {
    expect(component.checkForm).toBeDefined();
  });

  it('should have a dailyRecords FormArray', () => {
    const arr = component.checkForm.get('dailyRecords');
    expect(arr).toBeTruthy();
    expect(arr instanceof FormArray).toBeTrue();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.checkForm.reset();
    expect(component.checkForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.checkForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.checkForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.checkForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark date as required', () => {
    const ctrl = component.checkForm.get('date');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentNo as required', () => {
    const ctrl = component.checkForm.get('documentNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueDate as required', () => {
    const ctrl = component.checkForm.get('issueDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark checkMonth as required', () => {
    const ctrl = component.checkForm.get('checkMonth');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark checkYear as required', () => {
    const ctrl = component.checkForm.get('checkYear');
    ctrl?.setValue(null);
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark location as required', () => {
    const ctrl = component.checkForm.get('location');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark equipmentId as required', () => {
    const ctrl = component.checkForm.get('equipmentId');
    ctrl?.setValue(null);
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark equipmentName as required', () => {
    const ctrl = component.checkForm.get('equipmentName');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark equipmentNo as required', () => {
    const ctrl = component.checkForm.get('equipmentNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark nextCalibrationDue as required', () => {
    const ctrl = component.checkForm.get('nextCalibrationDue');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark checkedBy as required', () => {
    const ctrl = component.checkForm.get('checkedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.checkForm.patchValue(validData);
    const arr = component.checkForm.get('dailyRecords') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    expect(component.checkForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.checkForm.patchValue(validData);
    const arr = component.checkForm.get('dailyRecords') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(intermediateCheckServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to /intermediate-check-records on cancel', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/intermediate-check-records']);
  });

  it('should have dailyRecords as a FormArray instance', () => {
    const dailyRecordsCtrl = component.checkForm.get('dailyRecords');
    expect(dailyRecordsCtrl instanceof FormArray).toBeTrue();
  });

  it('should load equipment list on init', () => {
    expect(equipmentServiceSpy.getAllEquipments).toHaveBeenCalled();
  });
});
