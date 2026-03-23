// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { SkillMatrixFormComponent } from './skill-matrix-form.component';
import { SkillMatrixService } from '../../../services/skill-matrix.service';
import { DesignationService } from '../../../services/designation.service';
import { EmployeeService } from '../../../services/employee.service';
import { ToastService } from '../../../services/toast.service';

describe('SkillMatrixFormComponent', () => {
  let component: SkillMatrixFormComponent;
  let fixture: ComponentFixture<SkillMatrixFormComponent>;
  let skillMatrixServiceSpy: jasmine.SpyObj<SkillMatrixService>;
  let designationServiceSpy: jasmine.SpyObj<DesignationService>;
  let employeeServiceSpy: jasmine.SpyObj<EmployeeService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    skillMatrixServiceSpy = jasmine.createSpyObj('SkillMatrixService', ['create', 'update', 'getById']);
    skillMatrixServiceSpy.create.and.returnValue(of({ id: 1, message: 'Created successfully' }));
    skillMatrixServiceSpy.update.and.returnValue(of({ message: 'Updated successfully' }));
    skillMatrixServiceSpy.getById.and.returnValue(of(null));

    designationServiceSpy = jasmine.createSpyObj('DesignationService', ['getDesignationDropdown']);
    designationServiceSpy.getDesignationDropdown.and.returnValue(of({ items: [] }));

    employeeServiceSpy = jasmine.createSpyObj('EmployeeService', ['getAllEmployees', 'getEmployeeDropdown']);
    employeeServiceSpy.getAllEmployees.and.returnValue(of({ items: [] }));
    employeeServiceSpy.getEmployeeDropdown.and.returnValue(of([]));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [SkillMatrixFormComponent, RouterTestingModule, HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: SkillMatrixService, useValue: skillMatrixServiceSpy },
        { provide: DesignationService, useValue: designationServiceSpy },
        { provide: EmployeeService, useValue: employeeServiceSpy },
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

    fixture = TestBed.createComponent(SkillMatrixFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.matrixForm).toBeDefined();
    expect(component.matrixForm.get('formatNo')?.value).toBe('F-6');
    expect(component.matrixForm.get('designationId')?.value).toBeNull();
  });

  it('should be invalid when required fields are empty', () => {
    component.matrixForm.patchValue({
      formatNo: '',
      designationId: null,
      issueNo: '',
      date: '',
      revNo: '',
      title: '',
    });
    expect(component.matrixForm.valid).toBeFalse();
  });

  it('should be valid when required fields are filled and skills array has at least one entry', () => {
    component.matrixForm.patchValue({
      formatNo: 'F-7',
      designationId: 1,
      issueNo: '01',
      date: '2026-03-13',
      revNo: '00',
      title: 'Lab Technician Skill Matrix',
    });
    // Add a skill to satisfy the FormArray Validators.required
    component.addSkill('Tensile Testing');
    expect(component.matrixForm.get('formatNo')?.valid).toBeTrue();
    expect(component.matrixForm.get('designationId')?.valid).toBeTrue();
    expect(component.matrixForm.get('issueNo')?.valid).toBeTrue();
    expect(component.matrixForm.get('date')?.valid).toBeTrue();
    expect(component.matrixForm.get('revNo')?.valid).toBeTrue();
    expect(component.matrixForm.get('title')?.valid).toBeTrue();
  });

  it('should call create on valid submit in create mode', () => {
    component.isEditMode = false;
    component.matrixForm.patchValue({
      formatNo: 'F-7',
      designationId: 1,
      issueNo: '01',
      date: '2026-03-13',
      revNo: '00',
      title: 'Lab Technician Skill Matrix',
    });
    component.addSkill('Tensile Testing');
    component.onSubmit();
    expect(skillMatrixServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate back to skill-matrix list on goBack', () => {
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigate');
    component.goBack();
    expect(spy).toHaveBeenCalledWith(['/skill-matrix']);
  });

  it('should have skills FormArray initialized', () => {
    const skillsArray = component.skills;
    expect(skillsArray).toBeTruthy();
  });

  it('should have employeeSkills FormArray initialized', () => {
    const employeeSkillsArray = component.employeeSkills;
    expect(employeeSkillsArray).toBeTruthy();
  });

  it('should add a skill to the skills FormArray', () => {
    const initialLength = component.skills.length;
    component.addSkill('Visual Inspection');
    expect(component.skills.length).toBe(initialLength + 1);
    expect(component.skills.at(initialLength).value).toBe('Visual Inspection');
  });

  it('should toggle accordion section visibility', () => {
    component.openSections['header'] = true;
    component.toggleSection('header');
    expect(component.openSections['header']).toBeFalse();
    component.toggleSection('header');
    expect(component.openSections['header']).toBeTrue();
  });
});
