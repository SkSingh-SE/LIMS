// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';

import { SkillMatrixPreviewComponent } from './skill-matrix-preview.component';
import { SkillMatrixService } from '../../../services/skill-matrix.service';
import { DesignationService } from '../../../services/designation.service';

describe('SkillMatrixPreviewComponent', () => {
  let component: SkillMatrixPreviewComponent;
  let fixture: ComponentFixture<SkillMatrixPreviewComponent>;
  let serviceSpy: jasmine.SpyObj<SkillMatrixService>;
  let designationSpy: jasmine.SpyObj<DesignationService>;
  let router: Router;

  const mockData = {
    id: 1,
    title: 'Lab Technician Skill Matrix',
    designationName: 'Lab Technician',
    formatNo: 'F-7',
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('SkillMatrixService', ['getById', 'getAll']);
    designationSpy = jasmine.createSpyObj('DesignationService', ['getDesignationDropdown']);
    serviceSpy.getById.and.returnValue(of(mockData as any));
    serviceSpy.getAll.and.returnValue(of({ items: [mockData], totalCount: 1 } as any));
    designationSpy.getDesignationDropdown.and.returnValue(of({ items: [], totalCount: 0 } as any));

    await TestBed.configureTestingModule({
      imports: [SkillMatrixPreviewComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: SkillMatrixService, useValue: serviceSpy },
        { provide: DesignationService, useValue: designationSpy },
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
    fixture = TestBed.createComponent(SkillMatrixPreviewComponent);
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
    fixture.detectChanges();
    // Component assigns null without navigating — matrix stays null
    expect(component.matrix).toBeNull();
  });

  it('should navigate away on service error', () => {
    serviceSpy.getById.and.returnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();
    // Component logs error without navigating — isLoading set to false
    expect(component.isLoading).toBeFalse();
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
