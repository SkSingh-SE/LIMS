import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NumberOnlyDirective } from './number-only.directive';

@Component({
  template: `<input type="text" appNumberOnly />`,
  imports: [NumberOnlyDirective],
  standalone: true,
})
class TestHostComponent {}

describe('NumberOnlyDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let inputEl: DebugElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    inputEl = fixture.debugElement.query(By.directive(NumberOnlyDirective));
  });

  it('should create an instance', () => {
    expect(inputEl).toBeTruthy();
  });

  describe('input event', () => {
    it('should strip non-numeric characters from input', () => {
      const input = inputEl.nativeElement as HTMLInputElement;
      input.value = 'abc123def';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('123');
    });

    it('should allow pure numeric input', () => {
      const input = inputEl.nativeElement as HTMLInputElement;
      input.value = '98765';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('98765');
    });

    it('should strip special characters', () => {
      const input = inputEl.nativeElement as HTMLInputElement;
      input.value = '12.34';
      input.dispatchEvent(new Event('input'));
      expect(input.value).toBe('1234');
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
      const event = new KeyboardEvent('keydown', { key: '5' });
      spyOn(event, 'preventDefault');
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should block letter keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeTrue();
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

    it('should allow ArrowLeft', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should allow ArrowRight', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
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

    it('should allow Ctrl+X', () => {
      const event = new KeyboardEvent('keydown', { key: 'x', ctrlKey: true, cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should allow Ctrl+A', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should block special characters like @', () => {
      const event = new KeyboardEvent('keydown', { key: '@', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeTrue();
    });

    it('should block dot key', () => {
      const event = new KeyboardEvent('keydown', { key: '.', cancelable: true });
      inputEl.nativeElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBeTrue();
    });
  });
});
