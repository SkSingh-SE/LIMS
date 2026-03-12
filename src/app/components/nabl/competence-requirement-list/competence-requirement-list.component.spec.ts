import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompetenceRequirementListComponent } from './competence-requirement-list.component';

describe('CompetenceRequirementListComponent', () => {
  let component: CompetenceRequirementListComponent;
  let fixture: ComponentFixture<CompetenceRequirementListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompetenceRequirementListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompetenceRequirementListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
