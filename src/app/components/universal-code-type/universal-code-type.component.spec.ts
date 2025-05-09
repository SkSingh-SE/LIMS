import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniversalCodeTypeComponent } from './universal-code-type.component';

describe('UniversalCodeTypeComponent', () => {
  let component: UniversalCodeTypeComponent;
  let fixture: ComponentFixture<UniversalCodeTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniversalCodeTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UniversalCodeTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
