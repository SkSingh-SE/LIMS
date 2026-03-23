// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { CompetenceRequirementListComponent } from './competence-requirement-list.component';
import { CompetenceRequirementService } from '../../../services/competence-requirement.service';
import { ToastService } from '../../../services/toast.service';

describe('CompetenceRequirementListComponent', () => {
  let component: CompetenceRequirementListComponent;
  let fixture: ComponentFixture<CompetenceRequirementListComponent>;

  beforeEach(async () => {
    const serviceSpy = jasmine.createSpyObj('CompetenceRequirementService', ['getAll', 'getList', 'delete']);
    serviceSpy.getAll.and.returnValue(of([]));
    serviceSpy.getList.and.returnValue(of({ items: [], totalCount: 0 }));
    const toastSpy = jasmine.createSpyObj('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [CompetenceRequirementListComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: CompetenceRequirementService, useValue: serviceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CompetenceRequirementListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
