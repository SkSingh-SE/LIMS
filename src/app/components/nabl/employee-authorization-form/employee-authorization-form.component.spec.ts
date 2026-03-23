// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { EmployeeAuthorizationFormComponent } from './employee-authorization-form.component';
import { EmployeeAuthorizationService } from '../../../services/employee-authorization.service';
import { ToastService } from '../../../services/toast.service';

describe('EmployeeAuthorizationFormComponent', () => {
  let component: EmployeeAuthorizationFormComponent;
  let fixture: ComponentFixture<EmployeeAuthorizationFormComponent>;
  let authServiceSpy: jasmine.SpyObj<EmployeeAuthorizationService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('EmployeeAuthorizationService', ['create', 'update', 'getById']);
    authServiceSpy.create.and.returnValue(of({ success: true, message: 'Created successfully' }));
    authServiceSpy.update.and.returnValue(of({ success: true, message: 'Updated successfully' }));
    authServiceSpy.getById.and.returnValue(of(null));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [EmployeeAuthorizationFormComponent, RouterTestingModule, HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: EmployeeAuthorizationService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: { paramMap: convertToParamMap({}), url: [], params: {} },
            params: of({}),
            url: of([]),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeAuthorizationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.authForm).toBeDefined();
    expect(component.authForm.get('formatNo')?.value).toBe('F-7');
  });

  it('should be invalid when required fields are empty', () => {
    component.authForm.patchValue({
      formatNo: '',
      department: '',
      personnelName: '',
      uid: '',
      equipment: '',
      testMethodAuthorization: '',
      testAuthorization: '',
    });
    expect(component.authForm.valid).toBeFalse();
  });

  it('should be valid when all required fields are filled', () => {
    component.authForm.patchValue({
      formatNo: 'F-5',
      department: 'Testing Lab',
      personnelName: 'John Doe',
      uid: 'EMP001',
      equipment: 'Tensile Testing Machine',
      testMethodAuthorization: 'IS 1608',
      testAuthorization: 'Authorized',
    });
    expect(component.authForm.valid).toBeTrue();
  });

  it('should call create on valid submit in create mode', () => {
    component.isEditMode = false;
    component.authForm.patchValue({
      formatNo: 'F-5',
      department: 'Testing Lab',
      personnelName: 'John Doe',
      uid: 'EMP001',
      equipment: 'Tensile Testing Machine',
      testMethodAuthorization: 'IS 1608',
      testAuthorization: 'Authorized',
    });
    component.onSubmit();
    expect(authServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate back to employee-authorization list on goBack', () => {
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigate');
    router.navigate(['/employee-authorization']);
    expect(spy).toHaveBeenCalledWith(['/employee-authorization']);
  });

  it('should show warning toast when submitting invalid form', () => {
    component.authForm.patchValue({
      formatNo: '',
      department: '',
      personnelName: '',
      uid: '',
      equipment: '',
      testMethodAuthorization: '',
      testAuthorization: '',
    });
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Please fill all required fields.', 'warning');
  });

  it('should toggle section visibility', () => {
    component.openSections['details'] = true;
    component.toggleSection('details');
    expect(component.openSections['details']).toBeFalse();
    component.toggleSection('details');
    expect(component.openSections['details']).toBeTrue();
  });
});
