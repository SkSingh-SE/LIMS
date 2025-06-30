import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceCaseListComponent } from './invoice-case-list.component';

describe('InvoiceCaseListComponent', () => {
  let component: InvoiceCaseListComponent;
  let fixture: ComponentFixture<InvoiceCaseListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceCaseListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceCaseListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
