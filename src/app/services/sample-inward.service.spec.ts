import { TestBed } from '@angular/core/testing';

import { SampleInwardService } from './sample-inward.service';

describe('SampleInwardService', () => {
  let service: SampleInwardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SampleInwardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
