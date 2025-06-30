import { TestBed } from '@angular/core/testing';

import { InvoiceCaseService } from './invoice-case.service';

describe('InvoiceCaseService', () => {
  let service: InvoiceCaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InvoiceCaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
