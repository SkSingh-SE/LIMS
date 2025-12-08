/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TestResultService } from './test-result.service';

describe('Service: TestResult', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TestResultService]
    });
  });

  it('should ...', inject([TestResultService], (service: TestResultService) => {
    expect(service).toBeTruthy();
  }));
});
