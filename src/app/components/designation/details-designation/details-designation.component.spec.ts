import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsDesignationComponent } from './details-designation.component';

describe('DetailsDesignationComponent', () => {
  let component: DetailsDesignationComponent;
  let fixture: ComponentFixture<DetailsDesignationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsDesignationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailsDesignationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
