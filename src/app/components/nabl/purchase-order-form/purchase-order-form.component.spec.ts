// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { PurchaseOrderFormComponent } from './purchase-order-form.component';
import { PurchaseOrderService } from '../../../services/purchase-order.service';

describe('PurchaseOrderFormComponent', () => {
  let component: PurchaseOrderFormComponent;
  let fixture: ComponentFixture<PurchaseOrderFormComponent>;
  let mockService: jasmine.SpyObj<PurchaseOrderService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-26',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-26',
    supplierName: 'ABC Supplies',
    supplierAddress: '123 Main St',
    poType: 'Standard',
    currency: 'INR',
    termsAndConditions: 'As per standard terms',
    deliveryDate: '2026-04-01',
    paymentTerms: '30 days',
    preparedBy: 'Purchase Manager',
    authorizedBy: 'Director'
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('PurchaseOrderService', ['create', 'update', 'getById', 'save']);
    mockService.create.and.returnValue(of({ message: 'Saved' }));
    mockService.save.and.returnValue(of({ message: 'Saved' }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved' }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        PurchaseOrderFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: PurchaseOrderService, useValue: mockService },
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

    fixture = TestBed.createComponent(PurchaseOrderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize poForm on init', () => {
    expect(component.poForm).toBeDefined();
  });

  it('should have an items FormArray', () => {
    const itemsArray = component.poForm.get('items') as FormArray;
    expect(itemsArray).toBeTruthy();
    expect(itemsArray instanceof FormArray).toBeTrue();
  });

  it('should add a default item row on new record init', () => {
    expect(component.items.length).toBeGreaterThan(0);
  });

  it('should be invalid when required fields are empty', () => {
    component.poForm.patchValue({
      formatNo: '',
      documentNo: '',
      supplierName: '',
      supplierAddress: '',
      poType: '',
      currency: '',
      termsAndConditions: '',
      deliveryDate: '',
      paymentTerms: '',
      preparedBy: '',
      authorizedBy: ''
    });
    expect(component.poForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.poForm.patchValue(validData);
    expect(component.poForm.get('supplierName')?.valid).toBeTrue();
    expect(component.poForm.get('supplierAddress')?.valid).toBeTrue();
    expect(component.poForm.get('poType')?.valid).toBeTrue();
    expect(component.poForm.get('currency')?.valid).toBeTrue();
    expect(component.poForm.get('termsAndConditions')?.valid).toBeTrue();
    expect(component.poForm.get('deliveryDate')?.valid).toBeTrue();
    expect(component.poForm.get('paymentTerms')?.valid).toBeTrue();
    expect(component.poForm.get('preparedBy')?.valid).toBeTrue();
    expect(component.poForm.get('authorizedBy')?.valid).toBeTrue();
  });

  it('should add an item row', () => {
    const initialLength = component.items.length;
    component.addItem();
    expect(component.items.length).toBe(initialLength + 1);
  });

  it('should remove an item row when more than one exists', () => {
    component.addItem();
    const lengthBefore = component.items.length;
    component.removeItem(0);
    expect(component.items.length).toBe(lengthBefore - 1);
  });

  it('should not remove the last item row', () => {
    while (component.items.length > 1) {
      component.items.removeAt(0);
    }
    component.removeItem(0);
    expect(component.items.length).toBe(1);
  });

  it('should calculate totals when items change', () => {
    component.items.clear();
    component.addItem();
    const item = component.items.at(0);
    item.patchValue({ quantity: 2, unitPrice: 500 });
    component.calculateTotals();
    expect(component.poForm.get('totalAmount')?.value).toBe(1000);
  });

  it('should calculate GST and grand total correctly', () => {
    component.items.clear();
    component.addItem();
    const item = component.items.at(0);
    item.patchValue({ quantity: 1, unitPrice: 1000, totalAmount: 1000 });
    component.poForm.patchValue({ gstPercentage: 18 }, { emitEvent: false });
    component.calculateTotals();
    expect(component.poForm.get('gstAmount')?.value).toBe(180);
    expect(component.poForm.get('grandTotal')?.value).toBe(1180);
  });

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.poForm.patchValue(validData);
    const arr = component.poForm.get('items') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.poForm.patchValue(validData);
    const arr = component.poForm.get('items') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.poForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /purchase-order on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/purchase-order']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.poForm.reset();
    component.onSubmit();
    expect(component.poForm.touched).toBeTrue();
  });

  it('should default currency to INR', () => {
    expect(component.poForm.get('currency')?.value).toBe('INR');
  });

  it('should default poType to Regular', () => {
    expect(component.poForm.get('poType')?.value).toBe('Regular');
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });
});
