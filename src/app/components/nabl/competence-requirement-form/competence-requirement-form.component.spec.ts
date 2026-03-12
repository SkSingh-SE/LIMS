import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompetenceRequirementFormComponent } from './competence-requirement-form.component';

describe('CompetenceRequirementFormComponent', () => {
  let component: CompetenceRequirementFormComponent;
  let fixture: ComponentFixture<CompetenceRequirementFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompetenceRequirementFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompetenceRequirementFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
