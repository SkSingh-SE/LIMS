// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SupplierRegistrationFormComponent } from './supplier-registration-form.component';
import { SupplierRegistrationService } from '../../../services/supplier-registration.service';

describe('SupplierRegistrationFormComponent', () => {
  let component: SupplierRegistrationFormComponent;
  let fixture: ComponentFixture<SupplierRegistrationFormComponent>;
  let mockService: jasmine.SpyObj<SupplierRegistrationService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-19',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-19',
    supplierName: 'ABC Supplies',
    address: '123 Main St',
    contactPerson: 'John Supplier',
    designation: 'Manager',
    mobileNo: '9876543210',
    email: 'abc@supplier.com',
    natureOfBusiness: 'Manufacturer',
    productsServicesOffered: 'Lab chemicals',
    gstNo: '29AAACU2190M1Z5',
    panNo: 'AAACU2190M',
    registrationStatus: 'Pending',
    recordedBy: 'Lab Admin',
    bankDetails: {
      bankName: 'SBI',
      accountNo: '1234567890',
      ifscCode: 'SBIN0001234',
      branch: 'Main Branch'
    }
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('SupplierRegistrationService', ['create', 'update', 'getById', 'save']);
    mockService.create.and.returnValue(of({ message: 'Saved' }));
    mockService.save.and.returnValue(of({ message: 'Saved' }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved' }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        SupplierRegistrationFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: SupplierRegistrationService, useValue: mockService },
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

    fixture = TestBed.createComponent(SupplierRegistrationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize registrationForm on init', () => {
    expect(component.registrationForm).toBeDefined();
  });

  it('should have nested bankDetails form group', () => {
    const bankDetails = component.registrationForm.get('bankDetails');
    expect(bankDetails).toBeTruthy();
    expect(bankDetails?.get('bankName')).toBeTruthy();
    expect(bankDetails?.get('accountNo')).toBeTruthy();
    expect(bankDetails?.get('ifscCode')).toBeTruthy();
    expect(bankDetails?.get('branch')).toBeTruthy();
  });

  it('should have nested documentsSubmitted form group', () => {
    const documentsSubmitted = component.registrationForm.get('documentsSubmitted');
    expect(documentsSubmitted).toBeTruthy();
  });

  it('should be invalid when required fields are empty', () => {
    component.registrationForm.patchValue({
      formatNo: '',
      supplierName: '',
      address: '',
      contactPerson: '',
      designation: '',
      mobileNo: '',
      email: '',
      natureOfBusiness: '',
      productsServicesOffered: '',
      gstNo: '',
      panNo: '',
      registrationStatus: '',
      recordedBy: ''
    });
    expect(component.registrationForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.registrationForm.patchValue(validData);
    const form = component.registrationForm;
    expect(form.get('formatNo')?.valid).toBeTrue();
    expect(form.get('supplierName')?.valid).toBeTrue();
    expect(form.get('address')?.valid).toBeTrue();
    expect(form.get('contactPerson')?.valid).toBeTrue();
    expect(form.get('registrationStatus')?.valid).toBeTrue();
    expect(form.get('recordedBy')?.valid).toBeTrue();
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.registrationForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.registrationForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalled();
  });

  it('should not submit when form is invalid', () => {
    component.registrationForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /supplier-registration on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/supplier-registration']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.registrationForm.reset();
    component.onSubmit();
    expect(component.registrationForm.touched).toBeTrue();
  });

  it('should default formatNo to F-19', () => {
    expect(component.registrationForm.get('formatNo')?.value).toBe('F-19');
  });

  it('should default registrationStatus to Pending', () => {
    expect(component.registrationForm.get('registrationStatus')?.value).toBe('Pending');
  });

  it('should load data when recordId is set', () => {
    const mockRecord = { ...validData, id: 5, revNo: '01', verifiedBy: '' };
    mockService.getById.and.returnValue(of(mockRecord));
    component.recordId = 5;
    component.loadData();
    expect(mockService.getById).toHaveBeenCalledWith(5);
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });
});
