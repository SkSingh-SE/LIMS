import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardOrgnizationComponent } from './standard-orgnization.component';

describe('StandardOrgnizationComponent', () => {
  let component: StandardOrgnizationComponent;
  let fixture: ComponentFixture<StandardOrgnizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandardOrgnizationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardOrgnizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
