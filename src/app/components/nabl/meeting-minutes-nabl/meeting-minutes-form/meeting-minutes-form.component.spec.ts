// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { MeetingMinutesFormComponent } from './meeting-minutes-form.component';
import { MeetingMinutesService } from '../../../../services/meeting-minutes.service';

describe('MeetingMinutesFormComponent', () => {
  let component: MeetingMinutesFormComponent;
  let fixture: ComponentFixture<MeetingMinutesFormComponent>;
  let serviceSpy: jasmine.SpyObj<MeetingMinutesService>;
  let router: Router;

  const activatedRouteMock = {
    paramMap: of(convertToParamMap({})),
    snapshot: {
      paramMap: convertToParamMap({}),
      url: [],
    },
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('MeetingMinutesService', ['create', 'update', 'getById', 'getAll', 'delete']);
    serviceSpy.create.and.returnValue(of({ message: 'Saved' } as any));
    serviceSpy.getById.and.returnValue(of(null as any));
    serviceSpy.getAll.and.returnValue(of([] as any));

    await TestBed.configureTestingModule({
      imports: [
        MeetingMinutesFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: MeetingMinutesService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(MeetingMinutesFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with default values', () => {
    expect(component.minutesForm).toBeDefined();
    expect(component.minutesForm.get('formatNo')?.value).toBe('F-54');
    expect(component.minutesForm.get('docNo')?.value).toBeTruthy();
    expect(component.minutesForm.get('issueNo')?.value).toBe('03');
    expect(component.minutesForm.get('issueDate')?.value).toBe('2021-10-01');
    expect(component.minutesForm.get('revNo')?.value).toBe('00');
    expect(component.minutesForm.get('revDate')?.value).toBe('--');
  });

  it('should have discussions FormArray initialized', () => {
    const discussionsArray = component.minutesForm.get('discussions');
    expect(discussionsArray instanceof FormArray).toBeTrue();
    // In create mode ngOnInit calls addDiscussion(), so at least one row is expected
    expect((discussionsArray as FormArray).length).toBeGreaterThanOrEqual(1);
  });

  it('should have actionItems FormArray initialized', () => {
    const actionItemsArray = component.minutesForm.get('actionItems');
    expect(actionItemsArray instanceof FormArray).toBeTrue();
    // In create mode ngOnInit calls addActionItem(), so at least one row is expected
    expect((actionItemsArray as FormArray).length).toBeGreaterThanOrEqual(1);
  });

  it('should be invalid when required fields are empty', () => {
    component.minutesForm.patchValue({
      meetingDate: '',
      chairperson: '',
      reviewPeriod: '',
    });
    expect(component.minutesForm.valid).toBeFalse();
  });

  it('should mark required fields as invalid when cleared', () => {
    const requiredFields = [
      'formatNo', 'docNo', 'issueNo', 'issueDate', 'revNo', 'revDate',
      'meetingDate', 'chairperson', 'reviewPeriod',
    ];
    requiredFields.forEach(field => {
      const control = component.minutesForm.get(field);
      control?.setValue('');
      expect(control?.valid).toBeFalse();
    });
  });

  it('should call service.create and navigate to /meeting-minutes on valid submit in create mode', () => {
    const navigateSpy = spyOn(router, 'navigate');

    component.isEditMode = false;

    // Ensure exactly one valid discussion and one valid action item
    while (component.discussions.length) {
      component.discussions.removeAt(0);
    }
    while (component.actionItems.length) {
      component.actionItems.removeAt(0);
    }
    component.addDiscussion();
    component.discussions.at(0).setValue({
      agendaItem: 'Q1 Review',
      discussion: 'Discussed results',
      decision: 'Approved',
    });
    component.addActionItem();
    component.actionItems.at(0).setValue({
      action: 'Follow up on NCs',
      responsibility: 'Lab Manager',
      targetDate: '2026-04-01',
    });

    component.minutesForm.patchValue({
      formatNo: 'F-54',
      docNo: 'DMSPL/F-54',
      issueNo: '03',
      issueDate: '2021-10-01',
      revNo: '00',
      revDate: '--',
      meetingDate: '2026-03-20',
      chairperson: 'Lab Manager',
      reviewPeriod: 'Q1 2026',
    });

    expect(component.minutesForm.valid).toBeTrue();
    component.onSubmit();

    expect(serviceSpy.create).toHaveBeenCalledWith(component.minutesForm.value);
    expect(navigateSpy).toHaveBeenCalledWith(['/meeting-minutes']);
  });

  it('should not call service.create when form is invalid', () => {
    component.isEditMode = false;
    component.minutesForm.patchValue({ meetingDate: '', chairperson: '' });

    component.onSubmit();

    expect(serviceSpy.create).not.toHaveBeenCalled();
  });

  it('should navigate to /meeting-minutes on goBack (onCancel)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/meeting-minutes']);
  });
});
