import { TestBed } from '@angular/core/testing';
import { LoaderService } from './loader.service';

describe('LoaderService', () => {
  let service: LoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with loading$ as false', (done) => {
    service.loading$.subscribe((loading) => {
      expect(loading).toBeFalse();
      done();
    });
  });

  describe('show', () => {
    it('should set loading$ to true', (done) => {
      service.show();
      service.loading$.subscribe((loading) => {
        expect(loading).toBeTrue();
        done();
      });
    });
  });

  describe('hide', () => {
    it('should set loading$ to false when request count reaches 0', (done) => {
      service.show();
      service.hide();
      service.loading$.subscribe((loading) => {
        expect(loading).toBeFalse();
        done();
      });
    });

    it('should keep loading$ true when multiple requests are active', (done) => {
      service.show();
      service.show();
      service.hide(); // count goes from 2 to 1
      service.loading$.subscribe((loading) => {
        expect(loading).toBeTrue();
        done();
      });
    });

    it('should not go below 0', (done) => {
      service.hide(); // called without show
      service.hide(); // called again
      service.loading$.subscribe((loading) => {
        expect(loading).toBeFalse();
        done();
      });
    });
  });

  describe('forceHide', () => {
    it('should reset count and set loading$ to false', (done) => {
      service.show();
      service.show();
      service.show();
      service.forceHide();
      service.loading$.subscribe((loading) => {
        expect(loading).toBeFalse();
        done();
      });
    });
  });

  describe('concurrent request tracking', () => {
    it('should handle show/hide lifecycle correctly', (done) => {
      // Simulate 3 concurrent requests
      service.show(); // count = 1
      service.show(); // count = 2
      service.show(); // count = 3

      service.hide(); // count = 2 (still loading)
      service.hide(); // count = 1 (still loading)
      service.hide(); // count = 0 (done)

      service.loading$.subscribe((loading) => {
        expect(loading).toBeFalse();
        done();
      });
    });
  });
});
