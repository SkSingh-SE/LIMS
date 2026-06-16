import { Injectable, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ActiveInputService implements OnDestroy {
  private lastInput: HTMLInputElement | HTMLTextAreaElement | null = null;
  private listener: ((e: FocusEvent) => void) | null = null;

  constructor() {
    // Listen globally on document so we capture focus inside modals, overlays, etc.
    this.listener = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (target.type !== 'checkbox' && target.type !== 'radio' && target.type !== 'file' && target.type !== 'button') {
          this.lastInput = target;
        }
      }
    };
    document.addEventListener('focusin', this.listener, true);
  }

  ngOnDestroy(): void {
    if (this.listener) {
      document.removeEventListener('focusin', this.listener, true);
    }
  }

  getLastInput(): HTMLInputElement | HTMLTextAreaElement | null {
    return this.lastInput;
  }

  insertAtCursor(char: string): boolean {
    const el = this.lastInput;
    if (!el || el.disabled || el.readOnly) {
      return false;
    }

    // Check if the element is still in the DOM (modal may have closed)
    if (!document.body.contains(el)) {
      this.lastInput = null;
      return false;
    }

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    el.value = el.value.substring(0, start) + char + el.value.substring(end);
    el.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + char.length, start + char.length);
    });

    return true;
  }
}
