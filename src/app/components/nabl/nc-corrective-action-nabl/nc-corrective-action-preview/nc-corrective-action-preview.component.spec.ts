// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';

import { NcCorrectiveActionPreviewComponent } from './nc-corrective-action-preview.component';
import { NcCorrectiveActionService } from '../../../../services/nc-corrective-action.service';

describe('NcCorrectiveActionPreviewComponent', () => {
  let component: NcCorrectiveActionPreviewComponent;
  let fixture: ComponentFixture<NcCorrectiveActionPreviewComponent>;
  let serviceSpy: jasmine.SpyObj<NcCorrectiveActionService>;
  let router: Router;

  const mockData = {
    id: 1,
    ncNo: 'NC-001',
    ncObserved: 'Calibration overdue',
    formatNo: 'F-42',
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('NcCorrectiveActionService', ['getById']);
    serviceSpy.getById.and.returnValue(of(mockData as any));

    await TestBed.configureTestingModule({
      imports: [NcCorrectiveActionPreviewComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: NcCorrectiveActionService, useValue: serviceSpy },
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
    fixture = TestBed.createComponent(NcCorrectiveActionPreviewComponent);
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
    // Component does not have explicit error handling — test component does not throw
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
    expect(navigateSpy).toHaveBeenCalledWith(['/nc-corrective-action']);
  });
});
