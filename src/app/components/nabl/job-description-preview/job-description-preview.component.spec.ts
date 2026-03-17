// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';

import { JobDescriptionPreviewComponent } from './job-description-preview.component';
import { JobDescriptionService } from '../../../services/job-description.service';
import { ToastService } from '../../../services/toast.service';

describe('JobDescriptionPreviewComponent', () => {
  let component: JobDescriptionPreviewComponent;
  let fixture: ComponentFixture<JobDescriptionPreviewComponent>;
  let serviceSpy: jasmine.SpyObj<JobDescriptionService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const mockData = {
    id: 1,
    designationName: 'Lab Technician',
    departmentName: 'Testing',
    reportingTo: 'Manager',
    formatNo: 'F-3',
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('JobDescriptionService', ['getById']);
    toastSpy = jasmine.createSpyObj('ToastService', ['show']);
    serviceSpy.getById.and.returnValue(of(mockData as any));

    await TestBed.configureTestingModule({
      imports: [JobDescriptionPreviewComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: JobDescriptionService, useValue: serviceSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jasmine.createSpy('detectChanges') } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(JobDescriptionPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load data when id is provided', () => {
    fixture.detectChanges();
    expect(serviceSpy.getById).toHaveBeenCalledWith(1);
    expect(component.jobDesc).toEqual(mockData as any);
  });

  it('should navigate away when data not found (null response)', () => {
    serviceSpy.getById.and.returnValue(of(null as any));
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    expect(navigateSpy).toHaveBeenCalledWith(['/job-description']);
  });

  it('should navigate away on service error', () => {
    serviceSpy.getById.and.returnValue(throwError(() => new Error('Server error')));
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    expect(navigateSpy).toHaveBeenCalledWith(['/job-description']);
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
    expect(navigateSpy).toHaveBeenCalledWith(['/job-description']);
  });
});
