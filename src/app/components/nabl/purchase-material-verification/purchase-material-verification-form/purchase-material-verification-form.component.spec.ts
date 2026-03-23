// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { PurchaseMaterialVerificationFormComponent } from './purchase-material-verification-form.component';
import { PurchaseMaterialVerificationService } from '../../../../services/purchase-material-verification.service';

describe('PurchaseMaterialVerificationFormComponent', () => {
  let component: PurchaseMaterialVerificationFormComponent;
  let fixture: ComponentFixture<PurchaseMaterialVerificationFormComponent>;
  let mockService: jasmine.SpyObj<PurchaseMaterialVerificationService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-27',
    documentNo: 'DMSPL/F-27',
    supplierName: 'ABC Supplies',
    invoiceNo: 'INV-001',
    invoiceDate: '2026-03-10',
    overallStatus: 'Accepted',
    verifiedBy: 'Lab Tech',
    approvedBy: 'Lab Manager'
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('PurchaseMaterialVerificationService', ['create', 'update', 'getById', 'save']);
    mockService.create.and.returnValue(of({ message: 'Saved', success: true }));
    mockService.save.and.returnValue(of({ message: 'Saved', success: true }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved', success: true }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    Object.defineProperty(mockRouter, 'url', { get: () => '/purchase-material-verification/new', configurable: true });

    await TestBed.configureTestingModule({
      imports: [
        PurchaseMaterialVerificationFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: PurchaseMaterialVerificationService, useValue: mockService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            params: of({}),
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

    fixture = TestBed.createComponent(PurchaseMaterialVerificationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize verificationForm on init', () => {
    expect(component.verificationForm).toBeDefined();
  });

  it('should have an items FormArray', () => {
    const itemsArray = component.verificationForm.get('items') as FormArray;
    expect(itemsArray).toBeTruthy();
    expect(itemsArray instanceof FormArray).toBeTrue();
  });

  it('should have issueNo disabled by default', () => {
    const issueNoControl = component.verificationForm.get('issueNo');
    expect(issueNoControl?.disabled).toBeTrue();
  });

  it('should have revNo disabled by default', () => {
    const revNoControl = component.verificationForm.get('revNo');
    expect(revNoControl?.disabled).toBeTrue();
  });

  it('should have date disabled by default', () => {
    const dateControl = component.verificationForm.get('date');
    expect(dateControl?.disabled).toBeTrue();
  });

  it('should be invalid when required fields are empty', () => {
    component.verificationForm.patchValue({
      formatNo: '',
      documentNo: '',
      supplierName: '',
      invoiceNo: '',
      invoiceDate: '',
      overallStatus: '',
      verifiedBy: '',
      approvedBy: ''
    });
    expect(component.verificationForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.verificationForm.patchValue(validData);
    expect(component.verificationForm.get('formatNo')?.valid).toBeTrue();
    expect(component.verificationForm.get('documentNo')?.valid).toBeTrue();
    expect(component.verificationForm.get('supplierName')?.valid).toBeTrue();
    expect(component.verificationForm.get('invoiceNo')?.valid).toBeTrue();
    expect(component.verificationForm.get('invoiceDate')?.valid).toBeTrue();
    expect(component.verificationForm.get('overallStatus')?.valid).toBeTrue();
    expect(component.verificationForm.get('verifiedBy')?.valid).toBeTrue();
    expect(component.verificationForm.get('approvedBy')?.valid).toBeTrue();
  });

  it('should add an item row', () => {
    const initialLength = component.items.length;
    component.addItem();
    expect(component.items.length).toBe(initialLength + 1);
  });

  it('should remove an item row', () => {
    component.addItem();
    const lengthBefore = component.items.length;
    component.removeItem(0);
    expect(component.items.length).toBe(lengthBefore - 1);
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.verificationForm.patchValue(validData);
    // Fill in the required item fields so the form becomes valid
    const arr = component.verificationForm.get('items') as FormArray;
    if (arr.length > 0) {
      arr.at(0).patchValue({ materialName: 'Test Mat', poNumber: 'PO-1', verifiedQuantity: 5, observation: 'OK', verificationStatus: 'Pass' });
    }
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.verificationForm.patchValue(validData);
    const arr = component.verificationForm.get('items') as FormArray;
    if (arr.length > 0) {
      arr.at(0).patchValue({ materialName: 'Test Mat', poNumber: 'PO-1', verifiedQuantity: 5, observation: 'OK', verificationStatus: 'Pass' });
    }
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.verificationForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /purchase-material-verification on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/purchase-material-verification']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.verificationForm.reset();
    component.onSubmit();
    expect(component.verificationForm.touched).toBeTrue();
  });

  it('should default overallStatus to Accepted', () => {
    expect(component.verificationForm.get('overallStatus')?.value).toBe('Accepted');
  });

  it('should display correct formTitle for new record', () => {
    component.isEditMode = false;
    component.isViewMode = false;
    expect(component.formTitle).toBe('New Purchase Material Verification Record');
  });

  it('should display correct formTitle for edit mode', () => {
    component.isEditMode = true;
    component.isViewMode = false;
    expect(component.formTitle).toBe('Edit Purchase Material Verification Record');
  });

  it('should display correct formTitle for view mode', () => {
    component.isViewMode = true;
    expect(component.formTitle).toBe('View Purchase Material Verification Record');
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });
});
