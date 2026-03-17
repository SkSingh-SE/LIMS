// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { CrmConsumptionFormComponent } from './crm-consumption-form.component';
import { CrmConsumptionService } from '../../../services/crm-consumption.service';
import { ReferenceMaterialService } from '../../../services/reference-material.service';

describe('CrmConsumptionFormComponent', () => {
  let component: CrmConsumptionFormComponent;
  let fixture: ComponentFixture<CrmConsumptionFormComponent>;
  let mockService: jasmine.SpyObj<CrmConsumptionService>;
  let mockMaterialService: jasmine.SpyObj<ReferenceMaterialService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-18',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-18',
    issueDate: '2026-01-01',
    consumptionMonth: 'March',
    consumptionYear: 2026,
    referenceMaterialId: 1,
    materialName: 'CRM Standard A',
    materialCode: 'CRM-001',
    batchNo: 'BATCH-001',
    unitOfMeasure: 'g',
    openingStock: 100,
    purposeOfUse: 'Calibration',
    recordedBy: 'Lab Tech'
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('CrmConsumptionService', ['create', 'update', 'getById', 'save']);
    mockService.create.and.returnValue(of({ message: 'Saved' }));
    mockService.save.and.returnValue(of({ message: 'Saved' }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved' }));

    mockMaterialService = jasmine.createSpyObj('ReferenceMaterialService', ['getAll', 'getById', 'create', 'update', 'save']);
    mockMaterialService.getAll.and.returnValue(of({ items: [], totalCount: 0 }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        CrmConsumptionFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: CrmConsumptionService, useValue: mockService },
        { provide: ReferenceMaterialService, useValue: mockMaterialService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: {
              paramMap: convertToParamMap({}),
              url: [],
              params: {}
            }
          }
        }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CrmConsumptionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize consumptionForm on init', () => {
    expect(component.consumptionForm).toBeDefined();
  });

  it('should have a dailyConsumption FormArray', () => {
    const dailyArray = component.consumptionForm.get('dailyConsumption') as FormArray;
    expect(dailyArray).toBeTruthy();
    expect(dailyArray instanceof FormArray).toBeTrue();
  });

  it('should generate daily rows on new record init', () => {
    expect(component.dailyConsumption.length).toBeGreaterThan(0);
  });

  it('should call getAll on ReferenceMaterialService to load materials', () => {
    expect(mockMaterialService.getAll).toHaveBeenCalled();
  });

  it('should be invalid when required fields are empty', () => {
    component.consumptionForm.patchValue({
      formatNo: '',
      documentNo: '',
      issueDate: '',
      consumptionMonth: '',
      consumptionYear: null,
      referenceMaterialId: null,
      materialName: '',
      materialCode: '',
      batchNo: '',
      unitOfMeasure: '',
      openingStock: null,
      purposeOfUse: '',
      recordedBy: ''
    });
    expect(component.consumptionForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.consumptionForm.patchValue(validData);
    expect(component.consumptionForm.get('formatNo')?.valid).toBeTrue();
    expect(component.consumptionForm.get('documentNo')?.valid).toBeTrue();
    expect(component.consumptionForm.get('referenceMaterialId')?.valid).toBeTrue();
    expect(component.consumptionForm.get('materialName')?.valid).toBeTrue();
    expect(component.consumptionForm.get('materialCode')?.valid).toBeTrue();
    expect(component.consumptionForm.get('batchNo')?.valid).toBeTrue();
    expect(component.consumptionForm.get('purposeOfUse')?.valid).toBeTrue();
    expect(component.consumptionForm.get('recordedBy')?.valid).toBeTrue();
  });

  it('should calculate summary totals correctly', () => {
    component.consumptionForm.patchValue({ openingStock: 100, received: 50 }, { emitEvent: false });
    component.dailyConsumption.clear();
    const today = new Date().toISOString().split('T')[0];
    component.dailyConsumption.push(
      (component as any).fb.group({
        date: [today], day: [1], openingBalance: [0],
        quantityConsumed: [10], quantityWasted: [5],
        closingBalance: [0], purpose: [''], performedBy: ['']
      })
    );
    component.calculateSummary();
    expect(component.consumptionForm.get('consumed')?.value).toBe(10);
    expect(component.consumptionForm.get('wastage')?.value).toBe(5);
    expect(component.consumptionForm.get('closingStock')?.value).toBe(135);
  });

  it('should patch material details on material change', () => {
    component.materials = [{
      id: 1, materialName: 'CRM Standard A', materialCode: 'CRM-001',
      batchNo: 'BATCH-001', unitOfMeasure: 'g', currentStock: 500
    }];
    const event = { target: { value: '1' } };
    component.onMaterialChange(event);
    expect(component.consumptionForm.get('materialName')?.value).toBe('CRM Standard A');
    expect(component.consumptionForm.get('materialCode')?.value).toBe('CRM-001');
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.consumptionForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.consumptionForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.consumptionForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /reference-material-consumption on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/reference-material-consumption']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.consumptionForm.reset();
    component.onSubmit();
    expect(component.consumptionForm.touched).toBeTrue();
  });

  it('should default formatNo to F-18', () => {
    expect(component.consumptionForm.get('formatNo')?.value).toBe('F-18');
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });
});
