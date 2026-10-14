import { Injectable, OnDestroy } from '@angular/core';

/**
 * Marker for inputs that belong to the symbol picker UI itself (its own search box).
 * These must NEVER become the "active" target field, otherwise the selected symbol
 * is typed into the picker search box instead of the form field (and the symbol
 * list collapses because the search term keeps changing).
 */
const PICKER_OWN_INPUT = '[data-symbol-picker-input]';

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
          // Keep the previously targeted form field while the picker's search box is focused.
          if (target.closest(PICKER_OWN_INPUT)) {
            return;
          }
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

  register(target: HTMLInputElement | HTMLTextAreaElement): void {
    this.lastInput = target;
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
      const active = document.activeElement;
      const inPickerSearch = active instanceof HTMLElement && !!active.closest(PICKER_OWN_INPUT);

      // If the user is typing in the picker's own search box, do NOT steal focus
      // back to the form field — let them keep searching and inserting symbols.
      if (!inPickerSearch) {
        el.focus();
      }

      // Keep the caret on the target field so consecutive inserts chain correctly.
      try {
        el.setSelectionRange(start + char.length, start + char.length);
      } catch {
        // Some input types do not support selection ranges.
      }
    });

    return true;
  }
}
