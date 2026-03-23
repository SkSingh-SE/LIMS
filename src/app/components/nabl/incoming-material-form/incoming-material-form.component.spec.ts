// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { IncomingMaterialFormComponent } from './incoming-material-form.component';
import { IncomingMaterialService } from '../../../services/incoming-material.service';

describe('IncomingMaterialFormComponent', () => {
  let component: IncomingMaterialFormComponent;
  let fixture: ComponentFixture<IncomingMaterialFormComponent>;
  let mockService: jasmine.SpyObj<IncomingMaterialService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-23',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-23',
    materialName: 'Reagent A',
    materialCode: 'MAT-001',
    supplierName: 'Chem Corp',
    batchNo: 'BATCH-001',
    quantityReceived: 10,
    unitOfMeasure: 'kg',
    invoiceNo: 'INV-001',
    inspectionStatus: 'Accepted',
    inspectedBy: 'Lab Tech',
    verifiedBy: 'Lab Manager'
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('IncomingMaterialService', ['create', 'update', 'getById', 'save']);
    mockService.create.and.returnValue(of({ message: 'Saved' }));
    mockService.save.and.returnValue(of({ message: 'Saved' }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved' }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        IncomingMaterialFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: IncomingMaterialService, useValue: mockService },
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

    fixture = TestBed.createComponent(IncomingMaterialFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize materialForm on init', () => {
    expect(component.materialForm).toBeDefined();
  });

  it('should have a results FormArray', () => {
    const resultsArray = component.materialForm.get('results') as FormArray;
    expect(resultsArray).toBeTruthy();
    expect(resultsArray instanceof FormArray).toBeTrue();
  });

  it('should add a default result row on new record init', () => {
    expect(component.resultsArray.length).toBeGreaterThan(0);
  });

  it('should be invalid when required fields are empty', () => {
    component.materialForm.patchValue({
      formatNo: '',
      documentNo: '',
      materialName: '',
      materialCode: '',
      supplierName: '',
      batchNo: '',
      quantityReceived: null,
      unitOfMeasure: '',
      invoiceNo: '',
      inspectionStatus: '',
      inspectedBy: '',
      verifiedBy: ''
    });
    expect(component.materialForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.materialForm.patchValue(validData);
    expect(component.materialForm.get('materialName')?.valid).toBeTrue();
    expect(component.materialForm.get('materialCode')?.valid).toBeTrue();
    expect(component.materialForm.get('supplierName')?.valid).toBeTrue();
    expect(component.materialForm.get('batchNo')?.valid).toBeTrue();
    expect(component.materialForm.get('inspectedBy')?.valid).toBeTrue();
    expect(component.materialForm.get('verifiedBy')?.valid).toBeTrue();
  });

  it('should add a result row', () => {
    const initialLength = component.resultsArray.length;
    component.addResult();
    expect(component.resultsArray.length).toBe(initialLength + 1);
  });

  it('should remove a result row when more than one exists', () => {
    component.addResult();
    const lengthBefore = component.resultsArray.length;
    component.removeResult(0);
    expect(component.resultsArray.length).toBe(lengthBefore - 1);
  });

  it('should not remove the last result row', () => {
    while (component.resultsArray.length > 1) {
      component.resultsArray.removeAt(0);
    }
    component.removeResult(0);
    expect(component.resultsArray.length).toBe(1);
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.materialForm.patchValue(validData);
    // Clear results array to avoid invalid required fields in array items
    const arr = component.materialForm.get('results') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.materialForm.patchValue(validData);
    const arr = component.materialForm.get('results') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.materialForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /incoming-material on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/incoming-material']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.materialForm.reset();
    component.onSubmit();
    expect(component.materialForm.touched).toBeTrue();
  });

  it('should default inspectionStatus to Accepted', () => {
    expect(component.materialForm.get('inspectionStatus')?.value).toBe('Accepted');
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });
});
