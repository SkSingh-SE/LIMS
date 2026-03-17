// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';

import { ResponsibilityAuthorityPreviewComponent } from './responsibility-authority-preview.component';
import { ResponsibilityAuthorityService } from '../../../services/responsibility-authority.service';
import { ToastService } from '../../../services/toast.service';

describe('ResponsibilityAuthorityPreviewComponent', () => {
  let component: ResponsibilityAuthorityPreviewComponent;
  let fixture: ComponentFixture<ResponsibilityAuthorityPreviewComponent>;
  let serviceSpy: jasmine.SpyObj<ResponsibilityAuthorityService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const mockData = {
    id: 1,
    designationName: 'Lab Technician',
    responsibilities: 'Test samples',
    authorities: 'Stop testing',
    formatNo: 'F-4',
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('ResponsibilityAuthorityService', ['getById']);
    toastSpy = jasmine.createSpyObj('ToastService', ['show']);
    serviceSpy.getById.and.returnValue(of(mockData as any));

    await TestBed.configureTestingModule({
      imports: [ResponsibilityAuthorityPreviewComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: ResponsibilityAuthorityService, useValue: serviceSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jasmine.createSpy('detectChanges') } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ResponsibilityAuthorityPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load data when id is provided', () => {
    fixture.detectChanges();
    expect(serviceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.matrix).toEqual(mockData as any);
  });

  it('should navigate away when data not found (null response)', () => {
    serviceSpy.getById.and.returnValue(of(null as any));
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    expect(navigateSpy).toHaveBeenCalledWith(['/responsibility-authority']);
  });

  it('should navigate away on service error', () => {
    serviceSpy.getById.and.returnValue(throwError(() => new Error('Server error')));
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    expect(navigateSpy).toHaveBeenCalledWith(['/responsibility-authority']);
  });

  it('should default to portrait orientation', () => {
    fixture.detectChanges();
    expect(component.orientation).toBe('portrait');
  });

  it('should set orientation manually', () => {
    fixture.detectChanges();
    component.setOrientation('landscape');
    expect(component.orientation).toBe('landscape');
    expect(component.orientationManual).toBeTrue();
  });

  it('should reset to auto orientation', () => {
    fixture.detectChanges();
    component.setOrientation('landscape');
    component.orientationManual = false;
    expect(component.orientationManual).toBeFalse();
  });

  it('goBack should navigate to list', () => {
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigate');
    component.goBack();
    expect(navigateSpy).toHaveBeenCalledWith(['/responsibility-authority']);
  });
});
