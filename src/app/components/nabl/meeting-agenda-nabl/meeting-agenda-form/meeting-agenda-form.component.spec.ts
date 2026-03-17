// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormArray } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { MeetingAgendaFormComponent } from './meeting-agenda-form.component';
import { MeetingAgendaService } from '../../../../services/meeting-agenda.service';

describe('MeetingAgendaFormComponent', () => {
  let component: MeetingAgendaFormComponent;
  let fixture: ComponentFixture<MeetingAgendaFormComponent>;
  let serviceSpy: jasmine.SpyObj<MeetingAgendaService>;
  let router: Router;

  const activatedRouteMock = {
    paramMap: of(convertToParamMap({})),
    snapshot: {
      paramMap: convertToParamMap({}),
      url: [],
    },
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('MeetingAgendaService', ['create', 'update', 'getById', 'getAll', 'delete']);
    serviceSpy.create.and.returnValue(of({ message: 'Saved' } as any));
    serviceSpy.getById.and.returnValue(of(null as any));
    serviceSpy.getAll.and.returnValue(of([] as any));

    await TestBed.configureTestingModule({
      imports: [
        MeetingAgendaFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: MeetingAgendaService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(MeetingAgendaFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with default values', () => {
    expect(component.agendaForm).toBeDefined();
    expect(component.agendaForm.get('formatNo')?.value).toBe('F-53');
    expect(component.agendaForm.get('docNo')?.value).toBeTruthy();
    expect(component.agendaForm.get('issueNo')?.value).toBe('03');
    expect(component.agendaForm.get('issueDate')?.value).toBe('2021-10-01');
    expect(component.agendaForm.get('revNo')?.value).toBe('00');
    expect(component.agendaForm.get('revDate')?.value).toBe('--');
  });

  it('should have attendees FormArray initialized', () => {
    const attendeesArray = component.agendaForm.get('attendees');
    expect(attendeesArray instanceof FormArray).toBeTrue();
    // In create mode ngOnInit calls addAttendee(), so at least one row is expected
    expect((attendeesArray as FormArray).length).toBeGreaterThanOrEqual(1);
  });

  it('should have agendaItems FormArray initialized', () => {
    const agendaItemsArray = component.agendaForm.get('agendaItems');
    expect(agendaItemsArray instanceof FormArray).toBeTrue();
    // In create mode ngOnInit calls addAgendaItem(), so at least one row is expected
    expect((agendaItemsArray as FormArray).length).toBeGreaterThanOrEqual(1);
  });

  it('should be invalid when required fields are empty', () => {
    component.agendaForm.patchValue({
      meetingDate: '',
      meetingTime: '',
      venue: '',
      chairperson: '',
    });
    expect(component.agendaForm.valid).toBeFalse();
  });

  it('should mark required fields as invalid when cleared', () => {
    const requiredFields = [
      'formatNo', 'docNo', 'issueNo', 'issueDate', 'revNo', 'revDate',
      'meetingDate', 'meetingTime', 'venue', 'chairperson',
    ];
    requiredFields.forEach(field => {
      const control = component.agendaForm.get(field);
      control?.setValue('');
      expect(control?.valid).toBeFalse();
    });
  });

  it('should call service.create and navigate to /meeting-agenda on valid submit in create mode', () => {
    const navigateSpy = spyOn(router, 'navigate');

    component.isEditMode = false;

    // Ensure exactly one valid attendee and one valid agenda item
    while (component.attendees.length) {
      component.attendees.removeAt(0);
    }
    while (component.agendaItems.length) {
      component.agendaItems.removeAt(0);
    }
    component.addAttendee();
    component.attendees.at(0).setValue({ name: 'Alice', designation: 'Manager' });
    component.addAgendaItem();
    component.agendaItems.at(0).setValue({ item: 'Review Q1 results' });

    component.agendaForm.patchValue({
      formatNo: 'F-53',
      docNo: 'DMSPL/F-53',
      issueNo: '03',
      issueDate: '2021-10-01',
      revNo: '00',
      revDate: '--',
      meetingDate: '2026-03-20',
      meetingTime: '10:00',
      venue: 'Conference Room',
      chairperson: 'Lab Manager',
    });

    expect(component.agendaForm.valid).toBeTrue();
    component.onSubmit();

    expect(serviceSpy.create).toHaveBeenCalledWith(component.agendaForm.value);
    expect(navigateSpy).toHaveBeenCalledWith(['/meeting-agenda']);
  });

  it('should not call service.create when form is invalid', () => {
    component.isEditMode = false;
    component.agendaForm.patchValue({ meetingDate: '', chairperson: '' });

    component.onSubmit();

    expect(serviceSpy.create).not.toHaveBeenCalled();
  });

  it('should navigate to /meeting-agenda on goBack (onCancel)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/meeting-agenda']);
  });
});
