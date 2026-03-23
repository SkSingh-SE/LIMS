// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { PurchaseIndentFormComponent } from './purchase-indent-form.component';
import { PurchaseIndentService } from '../../../services/purchase-indent.service';

describe('PurchaseIndentFormComponent', () => {
  let component: PurchaseIndentFormComponent;
  let fixture: ComponentFixture<PurchaseIndentFormComponent>;
  let mockService: jasmine.SpyObj<PurchaseIndentService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const validData = {
    formatNo: 'F-25',
    issueNo: '01',
    revNo: '00',
    date: '2026-03-13',
    documentNo: 'DMSPL/F-25',
    departmentName: 'Testing Lab',
    indentorName: 'Lab Technician',
    priority: 'Normal',
    preparedBy: 'Lab Tech'
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('PurchaseIndentService', ['create', 'update', 'getById', 'save']);
    mockService.create.and.returnValue(of({ message: 'Saved' }));
    mockService.save.and.returnValue(of({ message: 'Saved' }));
    mockService.getById.and.returnValue(of(null));
    mockService.update.and.returnValue(of({ message: 'Saved' }));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        PurchaseIndentFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: PurchaseIndentService, useValue: mockService },
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

    fixture = TestBed.createComponent(PurchaseIndentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize indentForm on init', () => {
    expect(component.indentForm).toBeDefined();
  });

  it('should have an items FormArray', () => {
    const itemsArray = component.indentForm.get('items') as FormArray;
    expect(itemsArray).toBeTruthy();
    expect(itemsArray instanceof FormArray).toBeTrue();
  });

  it('should add a default item row on new record init', () => {
    expect(component.items.length).toBeGreaterThan(0);
  });

  it('should be invalid when required fields are empty', () => {
    component.indentForm.patchValue({
      formatNo: '',
      issueNo: '',
      revNo: '',
      date: '',
      documentNo: '',
      departmentName: '',
      indentorName: '',
      priority: '',
      preparedBy: ''
    });
    expect(component.indentForm.invalid).toBeTrue();
  });

  it('should be valid with all required fields filled', () => {
    component.indentForm.patchValue(validData);
    expect(component.indentForm.get('formatNo')?.valid).toBeTrue();
    expect(component.indentForm.get('departmentName')?.valid).toBeTrue();
    expect(component.indentForm.get('indentorName')?.valid).toBeTrue();
    expect(component.indentForm.get('priority')?.valid).toBeTrue();
    expect(component.indentForm.get('preparedBy')?.valid).toBeTrue();
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

  it('should call create on submit in add mode', () => {
    component.isEditMode = false;
    component.indentForm.patchValue(validData);
    const arr = component.indentForm.get('items') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(mockService.create).toHaveBeenCalled();
  });

  it('should call update on submit in edit mode', () => {
    component.isEditMode = true;
    component.recordId = 1;
    component.indentForm.patchValue(validData);
    const arr = component.indentForm.get('items') as FormArray;
    while (arr.length > 0) arr.removeAt(0);
    component.onSubmit();
    expect(mockService.update).toHaveBeenCalledWith(1, jasmine.any(Object));
  });

  it('should not submit when form is invalid', () => {
    component.indentForm.reset();
    component.onSubmit();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should navigate to /purchase-indent on cancel', () => {
    component.onCancel();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/purchase-indent']);
  });

  it('should mark all fields as touched on invalid submit', () => {
    component.indentForm.reset();
    component.onSubmit();
    expect(component.indentForm.touched).toBeTrue();
  });

  it('should default formatNo to F-21', () => {
    expect(component.indentForm.get('formatNo')?.value).toBe('F-21');
  });

  it('should default priority to Medium', () => {
    expect(component.indentForm.get('priority')?.value).toBe('Medium');
  });

  it('should load data when recordId is set', () => {
    const mockRecord = { ...validData, id: 4, items: [{ description: 'Item 1', quantity: 1, unitOfMeasure: 'Nos', purpose: '', estimatedCost: null }] };
    mockService.getById.and.returnValue(of(mockRecord));
    component.recordId = 4;
    component.loadData();
    expect(mockService.getById).toHaveBeenCalledWith(4);
  });

  it('should toggle section visibility', () => {
    const initial = component.openSections['header'];
    component.toggleSection('header');
    expect(component.openSections['header']).toBe(!initial);
  });
});
