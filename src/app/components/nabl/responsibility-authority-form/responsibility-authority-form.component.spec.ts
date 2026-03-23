// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ResponsibilityAuthorityFormComponent } from './responsibility-authority-form.component';
import { ResponsibilityAuthorityService } from '../../../services/responsibility-authority.service';
import { DesignationService } from '../../../services/designation.service';
import { ToastService } from '../../../services/toast.service';

describe('ResponsibilityAuthorityFormComponent', () => {
  let component: ResponsibilityAuthorityFormComponent;
  let fixture: ComponentFixture<ResponsibilityAuthorityFormComponent>;
  let raServiceSpy: jasmine.SpyObj<ResponsibilityAuthorityService>;
  let designationServiceSpy: jasmine.SpyObj<DesignationService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    raServiceSpy = jasmine.createSpyObj('ResponsibilityAuthorityService', ['create', 'update', 'getById']);
    raServiceSpy.create.and.returnValue(of({ message: 'Created successfully' }));
    raServiceSpy.update.and.returnValue(of({ message: 'Updated successfully' }));
    raServiceSpy.getById.and.returnValue(of(null));

    designationServiceSpy = jasmine.createSpyObj('DesignationService', ['getDesignationDropdown']);
    designationServiceSpy.getDesignationDropdown.and.returnValue(of([]));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [ResponsibilityAuthorityFormComponent, RouterTestingModule, HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: ResponsibilityAuthorityService, useValue: raServiceSpy },
        { provide: DesignationService, useValue: designationServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: { paramMap: convertToParamMap({}), url: [], params: {} },
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ResponsibilityAuthorityFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.raForm).toBeDefined();
    expect(component.raForm.get('formatNo')?.value).toBe('F-4');
  });

  it('should be invalid when required fields are empty', () => {
    component.raForm.patchValue({
      formatNo: '',
      designationId: null,
      issueNo: '',
      date: '',
      revNo: '',
      responsibilities: '',
      authorities: '',
    });
    expect(component.raForm.valid).toBeFalse();
  });

  it('should be valid when all required fields are filled', () => {
    component.raForm.patchValue({
      formatNo: 'F-4',
      designationId: 1,
      issueNo: '01',
      date: '2026-03-13',
      revNo: '00',
      responsibilities: 'Sample responsibility',
      authorities: 'Sample authority',
    });
    expect(component.raForm.valid).toBeTrue();
  });

  it('should call create on valid submit in create mode', () => {
    component.isEditMode = false;
    component.raForm.patchValue({
      formatNo: 'F-4',
      designationId: 1,
      issueNo: '01',
      date: '2026-03-13',
      revNo: '00',
      responsibilities: 'Sample responsibility',
      authorities: 'Sample authority',
    });
    component.onSubmit();
    expect(raServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate back to responsibility-authority list on goBack', () => {
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigate');
    component.goBack();
    expect(spy).toHaveBeenCalledWith(['/responsibility-authority']);
  });

  it('should show warning toast when submitting invalid form', () => {
    component.raForm.patchValue({
      formatNo: '',
      designationId: null,
      issueNo: '',
      date: '',
      revNo: '',
      responsibilities: '',
      authorities: '',
    });
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Please fill all required fields', 'warning');
  });

  it('should toggle accordion section visibility', () => {
    component.openSections['header'] = true;
    component.toggleSection('header');
    expect(component.openSections['header']).toBeFalse();
    component.toggleSection('header');
    expect(component.openSections['header']).toBeTrue();
  });
});
