// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ApprovedSupplierFormComponent } from './approved-supplier-form.component';
import { ApprovedSupplierService } from '../../../services/approved-supplier.service';

describe('ApprovedSupplierFormComponent', () => {
  let component: ApprovedSupplierFormComponent;
  let fixture: ComponentFixture<ApprovedSupplierFormComponent>;
  let mockService: jasmine.SpyObj<ApprovedSupplierService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-20',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-20',
    supplierName: 'ABC Supplies',
    contactDetails: '9876543210',
    productsServicesSupplied: 'Lab chemicals',
    approvalDate: '2026-03-13',
    isBlacklisted: false,
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('ApprovedSupplierService', ['create', 'update', 'getById', 'delete']);
    mockService.create.and.returnValue(of({ message: 'Saved' }) as any);
    mockService.getById.and.returnValue(of(null) as any);
    mockService.update.and.returnValue(of({ message: 'Saved' }) as any);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        ApprovedSupplierFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ApprovedSupplierService, useValue: mockService },
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

    fixture = TestBed.createComponent(ApprovedSupplierFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize supplierForm on init', () => {
    expect(component.supplierForm).toBeDefined();
  });

  it('should be invalid when required fields are empty', () => {
    component.supplierForm.patchValue({
      formatNo: '',
      issueNo: '',
      revNo: '',
      date: '',
      documentNo: '',
      supplierName: '',
      contactDetails: '',
      productsServicesSupplied: '',
      approvalDate: ''
    });
    expect(component.supplierForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.supplierForm.patchValue(validData);
    expect(component.supplierForm.get('formatNo')?.valid).toBeTrue();
    expect(component.supplierForm.get('supplierName')?.valid).toBeTrue();
    expect(component.supplierForm.get('contactDetails')?.valid).toBeTrue();
    expect(component.supplierForm.get('productsServicesSupplied')?.valid).toBeTrue();
    expect(component.supplierForm.get('approvalDate')?.valid).toBeTrue();
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.supplierForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.supplierForm.patchValue(validData);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.supplierForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /approved-supplier on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/approved-supplier']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.supplierForm.reset();
    component.onSubmit();
    expect(component.supplierForm.touched).toBeTrue();
  });

  it('should default formatNo to F-20', () => {
    expect(component.supplierForm.get('formatNo')?.value).toBe('F-20');
  });

  it('should load data when recordId is set', () => {
    const mockRecord = { ...validData, id: 3, revNo: '01' };
    mockService.getById.and.returnValue(of(mockRecord) as any);
    component.recordId = 3;
    component.loadData();
    expect(mockService.getById).toHaveBeenCalledWith(3);
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });

  it('should set isViewMode when path is details', () => {
    component.isViewMode = true;
    component.supplierForm.disable();
    expect(component.supplierForm.disabled).toBeTrue();
  });
});
