import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appNumberOnly]'
})
export class NumberOnlyDirective {

  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event']) onInput(event: any) {
    const inputValue = this.el.nativeElement.value;
    this.el.nativeElement.value = inputValue.replace(/[^0-9]/g, ''); // Removes non-numeric characters
  }

  @HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Control', 'v', 'c', 'x'];
    const ctrlCmd = event.ctrlKey || event.metaKey;

    // Allow Ctrl+C, Ctrl+V, Ctrl+X
    if (
      ctrlCmd &&
      ['c', 'v', 'x', 'a'].includes(event.key.toLowerCase())
    ) {
      return;
    }

    // Allow navigation and backspace
    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Block non-digit characters
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event']) onPaste(event: ClipboardEvent) {
    const pastedInput: string = (event.clipboardData?.getData('text/plain') ?? '').replace(/[^0-9]/g, '');
    event.preventDefault();
    document.execCommand('insertText', false, pastedInput);
  }

}
