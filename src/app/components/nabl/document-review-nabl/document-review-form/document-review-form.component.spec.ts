// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { DocumentReviewFormComponent } from './document-review-form.component';
import { DocumentReviewService } from '../../../../services/document-review.service';

describe('DocumentReviewFormComponent', () => {
  let component: DocumentReviewFormComponent;
  let fixture: ComponentFixture<DocumentReviewFormComponent>;
  let documentReviewServiceSpy: jasmine.SpyObj<DocumentReviewService>;
  let router: Router;

  const validData = {
    formatNo: 'F-44',
    docNo: 'DMSPL/F-44',
    issueNo: '01',
    issueDate: '2021-10-01',
    revNo: '00',
    revDate: '--',
    documentName: 'QMS Manual',
    lastReviewDate: '2025-03-01',
    nextReviewDate: '2026-03-01',
    reviewDoneBy: 'Quality Manager',
  };

  beforeEach(async () => {
    documentReviewServiceSpy = jasmine.createSpyObj('DocumentReviewService', [
      'create',
      'update',
      'getById',
      'save',
    ]);

    documentReviewServiceSpy.create.and.returnValue(of({ message: 'Saved' }));
    documentReviewServiceSpy.update.and.returnValue(of({ message: 'Saved' }));
    documentReviewServiceSpy.save.and.returnValue(of({ message: 'Saved' }));
    documentReviewServiceSpy.getById.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [DocumentReviewFormComponent, ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: DocumentReviewService, useValue: documentReviewServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
            snapshot: { paramMap: convertToParamMap({}), url: [] },
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentReviewFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize reviewForm on creation', () => {
    expect(component.reviewForm).toBeDefined();
  });

  it('should mark form invalid when required fields are empty', () => {
    component.reviewForm.reset();
    expect(component.reviewForm.invalid).toBeTrue();
  });

  it('should mark formatNo as required', () => {
    const ctrl = component.reviewForm.get('formatNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark docNo as required', () => {
    const ctrl = component.reviewForm.get('docNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueNo as required', () => {
    const ctrl = component.reviewForm.get('issueNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark issueDate as required', () => {
    const ctrl = component.reviewForm.get('issueDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revNo as required', () => {
    const ctrl = component.reviewForm.get('revNo');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark revDate as required', () => {
    const ctrl = component.reviewForm.get('revDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark documentName as required', () => {
    const ctrl = component.reviewForm.get('documentName');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark lastReviewDate as required', () => {
    const ctrl = component.reviewForm.get('lastReviewDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark nextReviewDate as required', () => {
    const ctrl = component.reviewForm.get('nextReviewDate');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should mark reviewDoneBy as required', () => {
    const ctrl = component.reviewForm.get('reviewDoneBy');
    ctrl?.setValue('');
    expect(ctrl?.invalid).toBeTrue();
  });

  it('should be valid when all required fields are filled', () => {
    component.reviewForm.patchValue(validData);
    expect(component.reviewForm.valid).toBeTrue();
  });

  it('should call create when submitting a new form', () => {
    component.reviewForm.patchValue(validData);
    component.onSubmit();
    expect(documentReviewServiceSpy.create).toHaveBeenCalled();
  });

  it('should navigate to onCancel route on onCancel()', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/document-review']);
  });
});
