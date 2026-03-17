// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ProductInspectionFormComponent } from './product-inspection-form.component';
import { ProductInspectionService } from '../../../services/product-inspection.service';

describe('ProductInspectionFormComponent', () => {
  let component: ProductInspectionFormComponent;
  let fixture: ComponentFixture<ProductInspectionFormComponent>;
  let mockService: jasmine.SpyObj<ProductInspectionService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-24',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-24',
    productName: 'Steel Rod',
    productCode: 'PROD-001',
    category: 'Metal',
    inspectionStage: 'Incoming',
    preparedBy: 'Lab Tech',
    reviewedBy: 'Senior Tech',
    approvedBy: 'Lab Manager'
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('ProductInspectionService', ['create', 'update', 'getById', 'save']);
    mockService.create.and.returnValue(of({ message: 'Saved' }));
    mockService.save.and.returnValue(of({ message: 'Saved' }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved' }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        ProductInspectionFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ProductInspectionService, useValue: mockService },
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

    fixture = TestBed.createComponent(ProductInspectionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize inspectionForm on init', () => {
    expect(component.inspectionForm).toBeDefined();
  });

  it('should have a parameters FormArray', () => {
    const parametersArray = component.inspectionForm.get('parameters') as FormArray;
    expect(parametersArray).toBeTruthy();
    expect(parametersArray instanceof FormArray).toBeTrue();
  });

  it('should add a default parameter row on new record init', () => {
    expect(component.parameters.length).toBeGreaterThan(0);
  });

  it('should be invalid when required fields are empty', () => {
    component.inspectionForm.patchValue({
      formatNo: '',
      documentNo: '',
      productName: '',
      productCode: '',
      category: '',
      inspectionStage: '',
      preparedBy: '',
      reviewedBy: '',
      approvedBy: ''
    });
    expect(component.inspectionForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.inspectionForm.patchValue(validData);
    expect(component.inspectionForm.get('productName')?.valid).toBeTrue();
    expect(component.inspectionForm.get('productCode')?.valid).toBeTrue();
    expect(component.inspectionForm.get('category')?.valid).toBeTrue();
    expect(component.inspectionForm.get('inspectionStage')?.valid).toBeTrue();
    expect(component.inspectionForm.get('preparedBy')?.valid).toBeTrue();
    expect(component.inspectionForm.get('reviewedBy')?.valid).toBeTrue();
    expect(component.inspectionForm.get('approvedBy')?.valid).toBeTrue();
  });

  it('should add a parameter row', () => {
    const initialLength = component.parameters.length;
    component.addParameter();
    expect(component.parameters.length).toBe(initialLength + 1);
  });

  it('should remove a parameter row when more than one exists', () => {
    component.addParameter();
    const lengthBefore = component.parameters.length;
    component.removeParameter(0);
    expect(component.parameters.length).toBe(lengthBefore - 1);
  });

  it('should not remove the last parameter row', () => {
    while (component.parameters.length > 1) {
      component.parameters.removeAt(0);
    }
    component.removeParameter(0);
    expect(component.parameters.length).toBe(1);
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.inspectionForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.inspectionForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.inspectionForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /product-inspection on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/product-inspection']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.inspectionForm.reset();
    component.onSubmit();
    expect(component.inspectionForm.touched).toBeTrue();
  });

  it('should default formatNo to F-23', () => {
    expect(component.inspectionForm.get('formatNo')?.value).toBe('F-23');
  });

  it('should default category to Product', () => {
    expect(component.inspectionForm.get('category')?.value).toBe('Product');
  });

  it('should default inspectionStage to Incoming', () => {
    expect(component.inspectionForm.get('inspectionStage')?.value).toBe('Incoming');
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });
});
