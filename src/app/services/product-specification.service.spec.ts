import { TestBed } from '@angular/core/testing';

import { ProductSpecificationService } from './product-specification.service';

describe('ProductSpecificationService', () => {
  let service: ProductSpecificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductSpecificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
