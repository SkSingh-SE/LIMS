// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ReferenceMaterialFormComponent } from './reference-material-form.component';
import { ReferenceMaterialService } from '../../../services/reference-material.service';

describe('ReferenceMaterialFormComponent', () => {
  let component: ReferenceMaterialFormComponent;
  let fixture: ComponentFixture<ReferenceMaterialFormComponent>;
  let mockService: jasmine.SpyObj<ReferenceMaterialService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-17',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-17',
    issueDate: '2026-01-01',
    materialName: 'CRM Standard A',
    materialCode: 'CRM-001',
    category: 'Primary',
    type: 'Certified',
    grade: 'Primary',
    manufacturer: 'NIST',
    batchNo: 'BATCH-001',
    specifications: 'Certified Reference Material',
    physicalState: 'Solid',
    storageConditions: 'Room temperature',
    shelfLife: 24,
    expiryDate: '2028-03-13',
    storageLocation: 'Storage Room A',
    currentStock: 500,
    unitOfMeasure: 'g'
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('ReferenceMaterialService', ['create', 'update', 'getById', 'save', 'getAll']);
    mockService.create.and.returnValue(of({ message: 'Saved' }));
    mockService.save.and.returnValue(of({ message: 'Saved' }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved' }));
    mockService.getAll.and.returnValue(of({ items: [], totalCount: 0 }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        ReferenceMaterialFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ReferenceMaterialService, useValue: mockService },
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

    fixture = TestBed.createComponent(ReferenceMaterialFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize materialForm on init', () => {
    expect(component.materialForm).toBeDefined();
  });

  it('should be invalid when required fields are empty', () => {
    component.materialForm.patchValue({
      formatNo: '',
      issueNo: '',
      revNo: '',
      date: '',
      documentNo: '',
      issueDate: '',
      materialName: '',
      materialCode: '',
      category: '',
      type: '',
      grade: '',
      manufacturer: '',
      batchNo: '',
      specifications: '',
      physicalState: '',
      storageConditions: '',
      shelfLife: null,
      expiryDate: '',
      storageLocation: '',
      currentStock: null,
      unitOfMeasure: ''
    });
    expect(component.materialForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.materialForm.patchValue(validData);
    expect(component.materialForm.get('materialName')?.valid).toBeTrue();
    expect(component.materialForm.get('materialCode')?.valid).toBeTrue();
    expect(component.materialForm.get('category')?.valid).toBeTrue();
    expect(component.materialForm.get('type')?.valid).toBeTrue();
    expect(component.materialForm.get('grade')?.valid).toBeTrue();
    expect(component.materialForm.get('manufacturer')?.valid).toBeTrue();
    expect(component.materialForm.get('batchNo')?.valid).toBeTrue();
    expect(component.materialForm.get('specifications')?.valid).toBeTrue();
    expect(component.materialForm.get('physicalState')?.valid).toBeTrue();
    expect(component.materialForm.get('storageConditions')?.valid).toBeTrue();
    expect(component.materialForm.get('expiryDate')?.valid).toBeTrue();
    expect(component.materialForm.get('storageLocation')?.valid).toBeTrue();
    expect(component.materialForm.get('unitOfMeasure')?.valid).toBeTrue();
  });

  it('should validate shelfLife with minimum value of 1', () => {
    component.materialForm.patchValue({ shelfLife: 0 });
    expect(component.materialForm.get('shelfLife')?.valid).toBeFalse();
    component.materialForm.patchValue({ shelfLife: 12 });
    expect(component.materialForm.get('shelfLife')?.valid).toBeTrue();
  });

  it('should validate currentStock with minimum value of 0', () => {
    component.materialForm.patchValue({ currentStock: -1 });
    expect(component.materialForm.get('currentStock')?.valid).toBeFalse();
    component.materialForm.patchValue({ currentStock: 0 });
    expect(component.materialForm.get('currentStock')?.valid).toBeTrue();
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.materialForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.materialForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.materialForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /reference-material on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/reference-material']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.materialForm.reset();
    component.onSubmit();
    expect(component.materialForm.touched).toBeTrue();
  });

  it('should default formatNo to F-17', () => {
    expect(component.materialForm.get('formatNo')?.value).toBe('F-17');
  });

  it('should default type to physical', () => {
    expect(component.materialForm.get('type')?.value).toBe('physical');
  });

  it('should default physicalState to solid', () => {
    expect(component.materialForm.get('physicalState')?.value).toBe('solid');
  });

  it('should default certificateOfAnalysis to true', () => {
    expect(component.materialForm.get('certificateOfAnalysis')?.value).toBeTrue();
  });

  it('should load data when recordId is set', () => {
    const mockRecord = { ...validData, id: 7, revNo: '01' };
    mockService.getById.and.returnValue(of(mockRecord));
    component.recordId = 7;
    component.loadData();
    expect(mockService.getById).toHaveBeenCalledWith(7);
  });

  it('should set isViewMode and disable form when path is details', () => {
    component.isViewMode = true;
    component.materialForm.disable();
    expect(component.materialForm.disabled).toBeTrue();
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });
});
