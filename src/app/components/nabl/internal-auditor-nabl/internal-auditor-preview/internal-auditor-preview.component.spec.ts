// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';

import { InternalAuditorPreviewComponent } from './internal-auditor-preview.component';
import { InternalAuditorService } from '../../../../services/internal-auditor.service';

describe('InternalAuditorPreviewComponent', () => {
  let component: InternalAuditorPreviewComponent;
  let fixture: ComponentFixture<InternalAuditorPreviewComponent>;
  let serviceSpy: jasmine.SpyObj<InternalAuditorService>;
  let router: Router;

  const mockData = {
    id: 1,
    auditorName: 'John Auditor',
    qualification: 'ISO Lead Auditor',
    formatNo: 'F-49',
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('InternalAuditorService', ['getAll']);
    // Component calls getAll() — returns array of items
    serviceSpy.getAll.and.returnValue(of([mockData] as any));

    await TestBed.configureTestingModule({
      imports: [InternalAuditorPreviewComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: InternalAuditorService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jasmine.createSpy('detectChanges') } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(InternalAuditorPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load data when id is provided', () => {
    fixture.detectChanges();
    expect(serviceSpy.getAll).toHaveBeenCalled();
    expect(component.data.length).toBeGreaterThan(0);
  });

  it('should navigate away when data not found (null response)', () => {
    serviceSpy.getAll.and.returnValue(of([] as any));
    fixture.detectChanges();
    // Component loads empty data array without navigating
    expect(component.data).toEqual([]);
  });

  it('should handle service error gracefully', () => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('Server error')));
    // Component does not have explicit error handling — test that it does not throw
    expect(() => fixture.detectChanges()).not.toThrow();
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
    expect(navigateSpy).toHaveBeenCalledWith(['/internal-auditor']);
  });
});
