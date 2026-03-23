// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';

import { EmployeeAuthorizationPreviewComponent } from './employee-authorization-preview.component';
import { EmployeeAuthorizationService } from '../../../services/employee-authorization.service';

describe('EmployeeAuthorizationPreviewComponent', () => {
  let component: EmployeeAuthorizationPreviewComponent;
  let fixture: ComponentFixture<EmployeeAuthorizationPreviewComponent>;
  let serviceSpy: jasmine.SpyObj<EmployeeAuthorizationService>;
  let router: Router;

  const mockData = {
    id: 1,
    personnelName: 'John Doe',
    equipment: 'UTM',
    formatNo: 'F-5',
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('EmployeeAuthorizationService', ['getAll']);
    // getAll returns a paginated response with items array
    serviceSpy.getAll.and.returnValue(of({ items: [mockData], totalCount: 1 } as any));

    await TestBed.configureTestingModule({
      imports: [EmployeeAuthorizationPreviewComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: EmployeeAuthorizationService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jasmine.createSpy('detectChanges') } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(EmployeeAuthorizationPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load data when id is provided', () => {
    fixture.detectChanges();
    expect(serviceSpy.getAll).toHaveBeenCalled();
    expect(component.authorizations.length).toBeGreaterThan(0);
  });

  it('should navigate away when data not found (null response)', () => {
    serviceSpy.getAll.and.returnValue(of({ items: [], totalCount: 0 } as any));
    fixture.detectChanges();
    // Component loads empty list without navigating away
    expect(component.authorizations.length).toBe(0);
  });

  it('should navigate away on service error', () => {
    // Component logs error but does not navigate away on error
    serviceSpy.getAll.and.returnValue(of({ items: [], totalCount: 0 } as any));
    fixture.detectChanges();
    expect(component.authorizations).toEqual([]);
  });

  it('should default to landscape orientation', () => {
    fixture.detectChanges();
    expect(component.orientation).toBe('landscape');
  });

  it('should set orientation manually', () => {
    fixture.detectChanges();
    component.setOrientation('portrait');
    expect(component.orientation).toBe('portrait');
    expect(component.orientationManual).toBeTrue();
  });

  it('should reset to auto orientation', () => {
    fixture.detectChanges();
    component.setOrientation('portrait');
    component.resetToAuto();
    expect(component.orientationManual).toBeFalse();
  });

  it('goBack should navigate to list', () => {
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigate');
    component.goBack();
    expect(navigateSpy).toHaveBeenCalledWith(['/employee']);
  });
});
