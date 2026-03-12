import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompetenceRequirementPreviewComponent } from './competence-requirement-preview.component';

describe('CompetenceRequirementPreviewComponent', () => {
  let component: CompetenceRequirementPreviewComponent;
  let fixture: ComponentFixture<CompetenceRequirementPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompetenceRequirementPreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompetenceRequirementPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
