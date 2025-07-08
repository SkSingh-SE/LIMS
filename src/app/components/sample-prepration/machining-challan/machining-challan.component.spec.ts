import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachiningChallanComponent } from './machining-challan.component';

describe('MachiningChallanComponent', () => {
  let component: MachiningChallanComponent;
  let fixture: ComponentFixture<MachiningChallanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MachiningChallanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MachiningChallanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
