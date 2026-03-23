import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DecimalOnlyDirective } from './decimal-only.directive';

@Component({
  template: `<input type="text" appDecimalOnly />`,
  imports: [DecimalOnlyDirective],
  standalone: true,
})
class TestHostComponent {}

describe('DecimalOnlyDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let inputEl: DebugElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    inputEl = fixture.debugElement.query(By.directive(DecimalOnlyDirective));
  });

  it('should create an instance', () => {
    expect(inputEl).toBeTruthy();
  });

  describe('input event', () => {
    it('should allow decimal numbers', () => {
      const input = inputEl.nativeElement as HTMLInputElement;
      input.value = '123.45';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('123.45');
    });

    it('should strip non-numeric non-dot characters', () => {
      const input = inputEl.nativeElement as HTMLInputElement;
      input.value = 'abc12.3d';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('12.3');
    });

    it('should keep only first dot when multiple dots present', () => {
      const input = inputEl.nativeElement as HTMLInputElement;
      input.value = '12.34.56';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('12.3456');
    });

    it('should allow integer values', () => {
      const input = inputEl.nativeElement as HTMLInputElement;
      input.value = '12345';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('12345');
    });

    it('should handle empty input', () => {
      const input = inputEl.nativeElement as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('');
    });
  });

  describe('keydown event', () => {
    it('should allow digit keys', () => {
      const event = new KeyboardEvent('keydown', { key: '7', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should allow dot key', () => {
      const event = new KeyboardEvent('keydown', { key: '.', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should allow Backspace', () => {
      const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should allow Tab', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should allow Home and End keys', () => {
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home', cancelable: true });
      inputEl.nativeElement.dispatchEvent(homeEvent);
      expect(homeEvent.defaultPrevented).toBeFalse();

      const endEvent = new KeyboardEvent('keydown', { key: 'End', cancelable: true });
      inputEl.nativeElement.dispatchEvent(endEvent);
      expect(endEvent.defaultPrevented).toBeFalse();
    });

    it('should block letter keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeTrue();
    });

    it('should allow Ctrl+C', () => {
      const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should allow Ctrl+V', () => {
      const event = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should allow Ctrl+A', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });
  });
});
