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
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'];
    if (allowedKeys.includes(event.key)) return;

    if (!/^\d$/.test(event.key)) {
      event.preventDefault(); // Blocks non-numeric keys
    }
  }

}
