// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CompetenceRequirementFormComponent } from './competence-requirement-form.component';
import { CompetenceRequirementService } from '../../../services/competence-requirement.service';
import { DesignationService } from '../../../services/designation.service';
import { ToastService } from '../../../services/toast.service';

describe('CompetenceRequirementFormComponent', () => {
  let component: CompetenceRequirementFormComponent;
  let fixture: ComponentFixture<CompetenceRequirementFormComponent>;
  let competenceRequirementServiceSpy: jasmine.SpyObj<CompetenceRequirementService>;
  let designationServiceSpy: jasmine.SpyObj<DesignationService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    competenceRequirementServiceSpy = jasmine.createSpyObj('CompetenceRequirementService', [
      'create',
      'update',
      'getById',
    ]);
    competenceRequirementServiceSpy.create.and.returnValue(of({ message: 'Created successfully' }));
    competenceRequirementServiceSpy.update.and.returnValue(of({ message: 'Updated successfully' }));
    competenceRequirementServiceSpy.getById.and.returnValue(of(null));

    designationServiceSpy = jasmine.createSpyObj('DesignationService', ['getDesignationDropdown']);
    designationServiceSpy.getDesignationDropdown.and.returnValue(of([]));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [
        CompetenceRequirementFormComponent,
        RouterTestingModule,
        HttpClientTestingModule,
        ReactiveFormsModule,
      ],
      providers: [
        { provide: CompetenceRequirementService, useValue: competenceRequirementServiceSpy },
        { provide: DesignationService, useValue: designationServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: { paramMap: convertToParamMap({}) },
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CompetenceRequirementFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.requirementForm).toBeDefined();
    expect(component.requirementForm.get('formatNo')?.value).toBe('F-4');
    expect(component.requirementForm.get('issueNo')?.value).toBe('01');
    expect(component.requirementForm.get('revNo')?.value).toBe('00');
    expect(component.requirementForm.get('isExternal')?.value).toBeFalse();
  });

  it('should be invalid when required fields are empty', () => {
    component.requirementForm.patchValue({
      formatNo: '',
      issueNo: '',
      revNo: '',
      date: '',
      minimumEducation: '',
      minimumExperience: '',
      approvedBy: '',
    });
    expect(component.requirementForm.valid).toBeFalse();
  });

  it('should be valid when isExternal is true and required fields are filled', () => {
    component.requirementForm.patchValue({
      formatNo: 'F-4',
      issueNo: '01',
      revNo: '00',
      date: '2026-03-13',
      isExternal: true,
      relatedActivity: 'Sample testing',
      minimumEducation: 'B.Sc Chemistry',
      minimumExperience: '2 years',
      approvedBy: 'Lab Manager',
    });
    expect(component.requirementForm.valid).toBeTrue();
  });

  it('should call create on valid submit in create mode when isExternal is true', () => {
    component.isEditMode = false;
    component.requirementForm.patchValue({
      formatNo: 'F-4',
      issueNo: '01',
      revNo: '00',
      date: '2026-03-13',
      isExternal: true,
      relatedActivity: 'Sample testing',
      minimumEducation: 'B.Sc Chemistry',
      minimumExperience: '2 years',
      approvedBy: 'Lab Manager',
    });
    component.onSubmit();
    expect(competenceRequirementServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate back to competence-requirement list on goBack', () => {
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigate');
    component.goBack();
    expect(spy).toHaveBeenCalledWith(['/competence-requirement']);
  });

  it('should show warning toast when submitting invalid form', () => {
    component.requirementForm.patchValue({
      formatNo: '',
      issueNo: '',
      revNo: '',
      date: '',
      minimumEducation: '',
      minimumExperience: '',
      approvedBy: '',
    });
    component.onSubmit();
    expect(toastServiceSpy.show).toHaveBeenCalledWith('Please fill all required fields', 'warning');
  });

  it('should require positionId when isExternal is false', () => {
    component.requirementForm.patchValue({ isExternal: false });
    const positionControl = component.requirementForm.get('positionId');
    expect(positionControl?.errors).toBeTruthy();
  });

  it('should require relatedActivity when isExternal is true', () => {
    component.requirementForm.patchValue({ isExternal: true, relatedActivity: '' });
    const relatedActivityControl = component.requirementForm.get('relatedActivity');
    expect(relatedActivityControl?.errors).toBeTruthy();
  });

  it('should not require positionId when isExternal is true', () => {
    component.requirementForm.patchValue({ isExternal: true });
    const positionControl = component.requirementForm.get('positionId');
    expect(positionControl?.errors).toBeNull();
  });

  it('should toggle accordion section visibility', () => {
    component.openSections['header'] = true;
    component.toggleSection('header');
    expect(component.openSections['header']).toBeFalse();
    component.toggleSection('header');
    expect(component.openSections['header']).toBeTrue();
  });
});
