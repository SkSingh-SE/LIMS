// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { MasterDocumentFormComponent } from './master-document-form.component';
import { MasterDocumentService } from '../../../../services/master-document.service';

describe('MasterDocumentFormComponent', () => {
  let component: MasterDocumentFormComponent;
  let fixture: ComponentFixture<MasterDocumentFormComponent>;
  let masterDocumentServiceSpy: jasmine.SpyObj<MasterDocumentService>;
  let router: Router;

  const validData = {
    formatNo: 'F-45',
    docNo: 'DMSPL/F-45',
    documentName: 'QMS Manual',
    documentNo: 'QMS-001',
    issueNo: '02',
    issueDate: '2026-01-01',
    revNo: '01',
    revDate: '2026-03-01',
    copyHolder: 'Quality Manager',
  };

  beforeEach(async () => {
    masterDocumentServiceSpy = jasmine.createSpyObj('MasterDocumentService', [
      'create',
      'update',
      'getById',
      'save',
    ]);

    masterDocumentServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    masterDocumentServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    masterDocumentServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    masterDocumentServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [MasterDocumentFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: MasterDocumentService, useValue: masterDocumentServiceSpy },
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

    fixture = TestBed.createComponent(MasterDocumentFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize docForm on creation', () => {
    expect(component.docForm).toBeDefined();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.docForm.reset();
    expect(component.docForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.docForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark docNo as required', () => {
    const ctrl = component.docForm.get('docNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentName as required', () => {
    const ctrl = component.docForm.get('documentName');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentNo as required', () => {
    const ctrl = component.docForm.get('documentNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.docForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueDate as required', () => {
    const ctrl = component.docForm.get('issueDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.docForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revDate as required', () => {
    const ctrl = component.docForm.get('revDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark copyHolder as required', () => {
    const ctrl = component.docForm.get('copyHolder');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.docForm.patchValue(validData);
    expect(component.docForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.docForm.patchValue(validData);
    component.onSubmit();
    expect(masterDocumentServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/master-document']);
  });
});
