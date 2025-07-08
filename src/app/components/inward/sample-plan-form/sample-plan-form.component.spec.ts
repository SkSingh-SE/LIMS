import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamplePlanFormComponent } from './sample-plan-form.component';

describe('SamplePlanFormComponent', () => {
  let component: SamplePlanFormComponent;
  let fixture: ComponentFixture<SamplePlanFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamplePlanFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamplePlanFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
