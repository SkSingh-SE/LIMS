// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SupplierConfidentialityFormComponent } from './supplier-confidentiality-form.component';
import { SupplierConfidentialityService } from '../../../services/supplier-confidentiality.service';
import { SupplierService } from '../../../services/supplier.service';

describe('SupplierConfidentialityFormComponent', () => {
  let component: SupplierConfidentialityFormComponent;
  let fixture: ComponentFixture<SupplierConfidentialityFormComponent>;
  let mockService: jasmine.SpyObj<SupplierConfidentialityService>;
  let mockSupplierService: jasmine.SpyObj<SupplierService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-22',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    supplierId: 1,
    supplierName: 'ABC Supplies',
    agreementDate: '2026-03-13',
    validUntil: '2027-03-13',
    reviewedBy: 'Quality Manager',
    reviewedDate: '2026-03-13',
    approvedBy: 'Director',
    approvalDate: '2026-03-13',
    status: 'Active'
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('SupplierConfidentialityService', ['create', 'update', 'getById', 'save']);
    mockService.create.and.returnValue(of({ message: 'Saved' }));
    mockService.save.and.returnValue(of({ message: 'Saved' }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved' }));

    mockSupplierService = jasmine.createSpyObj('SupplierService', ['getAllSuppliers', 'getAll']);
    mockSupplierService.getAllSuppliers.and.returnValue(of({ items: [], totalCount: 0 }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        SupplierConfidentialityFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: SupplierConfidentialityService, useValue: mockService },
        { provide: SupplierService, useValue: mockSupplierService },
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

    fixture = TestBed.createComponent(SupplierConfidentialityFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize agreementForm on init', () => {
    expect(component.agreementForm).toBeDefined();
  });

  it('should call getAllSuppliers on init to load suppliers dropdown', () => {
    expect(mockSupplierService.getAllSuppliers).toHaveBeenCalled();
  });

  it('should be invalid when required fields are empty', () => {
    component.agreementForm.patchValue({
      formatNo: '',
      issueNo: '',
      revNo: '',
      date: '',
      supplierId: null,
      supplierName: '',
      agreementDate: '',
      validUntil: '',
      reviewedBy: '',
      reviewedDate: '',
      approvedBy: '',
      approvalDate: '',
      status: ''
    });
    expect(component.agreementForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.agreementForm.patchValue(validData);
    expect(component.agreementForm.get('supplierId')?.valid).toBeTrue();
    expect(component.agreementForm.get('supplierName')?.valid).toBeTrue();
    expect(component.agreementForm.get('agreementDate')?.valid).toBeTrue();
    expect(component.agreementForm.get('validUntil')?.valid).toBeTrue();
    expect(component.agreementForm.get('reviewedBy')?.valid).toBeTrue();
    expect(component.agreementForm.get('approvedBy')?.valid).toBeTrue();
    expect(component.agreementForm.get('status')?.valid).toBeTrue();
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.agreementForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.agreementForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.agreementForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /supplier-confidentiality-agreement on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/supplier-confidentiality-agreement']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.agreementForm.reset();
    component.onSubmit();
    expect(component.agreementForm.touched).toBeTrue();
  });

  it('should patch supplier details on supplier change', () => {
    component.suppliers = [{ id: 1, name: 'ABC Supplies', contactPerson1: 'John', address: '123 Main St' }];
    const event = { target: { value: '1' } };
    component.onSupplierChange(event);
    expect(component.agreementForm.get('supplierName')?.value).toBe('ABC Supplies');
  });

  it('should load data when recordId is set', () => {
    const mockRecord = { ...validData, id: 2 };
    mockService.getById.and.returnValue(of(mockRecord));
    component.recordId = 2;
    component.loadData();
    expect(mockService.getById).toHaveBeenCalledWith(2);
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });

  it('should default reviewedBy to Quality Manager', () => {
    expect(component.agreementForm.get('reviewedBy')?.value).toBe('Quality Manager');
  });

  it('should default approvedBy to Director', () => {
    expect(component.agreementForm.get('approvedBy')?.value).toBe('Director');
  });
});
