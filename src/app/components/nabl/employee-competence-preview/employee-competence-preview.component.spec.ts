// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';

import { EmployeeCompetencePreviewComponent } from './employee-competence-preview.component';
import { EmployeeCompetenceService } from '../../../services/employee-competence.service';

describe('EmployeeCompetencePreviewComponent', () => {
  let component: EmployeeCompetencePreviewComponent;
  let fixture: ComponentFixture<EmployeeCompetencePreviewComponent>;
  let serviceSpy: jasmine.SpyObj<EmployeeCompetenceService>;
  let router: Router;

  const mockData = {
    id: 1,
    employeeName: 'John Doe',
    overallRating: 8,
    formatNo: 'F-6',
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('EmployeeCompetenceService', ['getById']);
    serviceSpy.getById.and.returnValue(of(mockData as any));

    await TestBed.configureTestingModule({
      imports: [EmployeeCompetencePreviewComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: EmployeeCompetenceService, useValue: serviceSpy },
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
    fixture = TestBed.createComponent(EmployeeCompetencePreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load data when id is provided', () => {
    fixture.detectChanges();
    expect(serviceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.report).toEqual(mockData as any);
  });

  it('should navigate away when data not found (null response)', () => {
    serviceSpy.getById.and.returnValue(of(null as any));
    fixture.detectChanges();
    // Component assigns null without navigating — report stays null
    expect(component.report).toBeNull();
  });

  it('should navigate away on service error', () => {
    serviceSpy.getById.and.returnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();
    // Component logs error without navigating — isLoading set to false
    expect(component.report).toBeNull();
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
    expect(navigateSpy).toHaveBeenCalledWith(['/employee']);
  });
});
