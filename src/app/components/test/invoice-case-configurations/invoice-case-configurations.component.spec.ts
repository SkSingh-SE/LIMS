import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceCaseConfigurationsComponent } from './invoice-case-configurations.component';

describe('InvoiceCaseConfigurationsComponent', () => {
  let component: InvoiceCaseConfigurationsComponent;
  let fixture: ComponentFixture<InvoiceCaseConfigurationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceCaseConfigurationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceCaseConfigurationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
