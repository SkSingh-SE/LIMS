import { Directive, ElementRef, HostListener } from '@angular/core';
import { ActiveInputService } from '../components/symbol-picker/active-input.service';

/**
 * Auto-tracks the last focused input/textarea globally.
 * Apply to a container (e.g. layout) to track all child inputs.
 */
@Directive({
  selector: '[appTrackInput]',
  standalone: true,
})
export class TrackInputDirective {
  constructor(
    private el: ElementRef,
    private activeInputService: ActiveInputService,
  ) {}

  @HostListener('focusin', ['$event'])
  onFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      if (target.type !== 'checkbox' && target.type !== 'radio' && target.type !== 'file' && target.type !== 'button') {
        this.activeInputService.register(target);
      }
    }
  }
}
