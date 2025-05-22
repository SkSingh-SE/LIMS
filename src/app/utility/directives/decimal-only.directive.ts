import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appDecimalOnly]'
})
export class DecimalOnlyDirective {

  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event']) onInput(event: any) {
    let inputValue = this.el.nativeElement.value;

    // Remove all characters except digits and dot
    inputValue = inputValue.replace(/[^0-9.]/g, '');

    // Ensure only one dot exists
    const parts = inputValue.split('.');
    if (parts.length > 2) {
      inputValue = parts[0] + '.' + parts.slice(1).join('');
    }

    this.el.nativeElement.value = inputValue;
  }

  @HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', '.', 'Home', 'End'];
    const ctrlCmd = event.ctrlKey || event.metaKey;

    // Allow Ctrl/Command combos (copy, paste, etc.)
    if (ctrlCmd && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
      return;
    }

    // Allow navigation and control keys
    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Allow only digits
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }

    // Prevent entering second dot
    if (event.key === '.' && this.el.nativeElement.value.includes('.')) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event']) onPaste(event: ClipboardEvent) {
    const pastedInput: string = (event.clipboardData?.getData('text/plain') ?? '').replace(/[^0-9.]/g, '');

    // Only one decimal point allowed
    const parts = pastedInput.split('.');
    let sanitized = pastedInput;
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }

    event.preventDefault();
    document.execCommand('insertText', false, sanitized);
  }

}