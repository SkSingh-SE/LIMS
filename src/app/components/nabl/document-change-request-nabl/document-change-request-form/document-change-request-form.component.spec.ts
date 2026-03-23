// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { DocumentChangeRequestFormComponent } from './document-change-request-form.component';
import { DocumentChangeRequestService } from '../../../../services/document-change-request.service';

describe('DocumentChangeRequestFormComponent', () => {
  let component: DocumentChangeRequestFormComponent;
  let fixture: ComponentFixture<DocumentChangeRequestFormComponent>;
  let documentChangeRequestServiceSpy: jasmine.SpyObj<DocumentChangeRequestService>;
  let router: Router;

  const validData = {
    formatNo: 'F-43',
    docNo: 'DMSPL/F-43',
    headerIssueNo: '01',
    headerIssueDate: '2021-10-01',
    headerRevNo: '00',
    headerRevDate: '--',
    date: '2026-03-13',
    documentTitle: 'QMS Manual',
    documentNo: 'QMS-001',
    issueNo: '02',
    revNo: '01',
    changesRequired: 'Update clause 4.3',
    justification: 'New regulatory requirement',
    initiatedBy: 'Quality Manager',
    approvedBy: 'Director',
  };

  beforeEach(async () => {
    documentChangeRequestServiceSpy = jasmine.createSpyObj('DocumentChangeRequestService', [
      'create',
      'update',
      'getById',
      'save',
    ]);

    documentChangeRequestServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    documentChangeRequestServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    documentChangeRequestServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    documentChangeRequestServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [
        DocumentChangeRequestFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: DocumentChangeRequestService, useValue: documentChangeRequestServiceSpy },
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

    fixture = TestBed.createComponent(DocumentChangeRequestFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize changeForm on creation', () => {
    expect(component.changeForm).toBeDefined();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.changeForm.reset();
    expect(component.changeForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.changeForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark docNo as required', () => {
    const ctrl = component.changeForm.get('docNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark headerIssueNo as required', () => {
    const ctrl = component.changeForm.get('headerIssueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark headerIssueDate as required', () => {
    const ctrl = component.changeForm.get('headerIssueDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark headerRevNo as required', () => {
    const ctrl = component.changeForm.get('headerRevNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark headerRevDate as required', () => {
    const ctrl = component.changeForm.get('headerRevDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark date as required', () => {
    const ctrl = component.changeForm.get('date');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentTitle as required', () => {
    const ctrl = component.changeForm.get('documentTitle');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentNo as required', () => {
    const ctrl = component.changeForm.get('documentNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.changeForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.changeForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark changesRequired as required', () => {
    const ctrl = component.changeForm.get('changesRequired');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark justification as required', () => {
    const ctrl = component.changeForm.get('justification');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark initiatedBy as required', () => {
    const ctrl = component.changeForm.get('initiatedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark approvedBy as required', () => {
    const ctrl = component.changeForm.get('approvedBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.changeForm.patchValue(validData);
    expect(component.changeForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.changeForm.patchValue(validData);
    component.onSubmit();
    expect(documentChangeRequestServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/document-change-request']);
  });
});
