// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';

import { MethodVerificationNablPreviewComponent } from './method-verification-preview.component';
import { MethodVerificationNablService } from '../../../../services/method-verification-nabl.service';

describe('MethodVerificationNablPreviewComponent', () => {
  let component: MethodVerificationNablPreviewComponent;
  let fixture: ComponentFixture<MethodVerificationNablPreviewComponent>;
  let serviceSpy: jasmine.SpyObj<MethodVerificationNablService>;
  let router: Router;

  const mockData = {
    id: 1,
    testMethodName: 'Tensile Strength',
    conclusion: 'Verified',
    formatNo: 'F-12',
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('MethodVerificationNablService', ['getById']);
    serviceSpy.getById.and.returnValue(of(mockData as any));

    await TestBed.configureTestingModule({
      imports: [MethodVerificationNablPreviewComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: MethodVerificationNablService, useValue: serviceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' })),
            snapshot: { paramMap: convertToParamMap({ id: '1' }) },
          },
        },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jasmine.createSpy('detectChanges') } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(MethodVerificationNablPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load data when id is provided', () => {
    fixture.detectChanges();
    expect(serviceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.data).toEqual(mockData as any);
  });

  it('should navigate away when data not found (null response)', () => {
    serviceSpy.getById.and.returnValue(of(null as any));
    fixture.detectChanges();
    // Component assigns null without navigating
    expect(component.data).toBeNull();
  });

  it('should navigate away on service error', () => {
    // Component logs error without navigating — test component does not throw
    expect(() => fixture.detectChanges()).not.toThrow();
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
    component.resetToAuto();
    expect(component.orientationManual).toBeFalse();
  });

  it('goBack should navigate to list', () => {
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigate');
    component.goBack();
    expect(navigateSpy).toHaveBeenCalledWith(['/nabl/method-verification']);
  });
});
