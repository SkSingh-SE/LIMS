import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';
import { FormValidationHelper } from '../../helper/form-validation.helper';

@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showError) {
      <div class="text-danger" style="font-size: 0.75rem; margin-top: 2px;">
        {{ message }}
      </div>
    }
  `,
})
export class FormFieldErrorComponent {
  @Input() control: AbstractControl | null = null;
  @Input() label = 'This field';
  @Input() submitted = false;
  @Input() groupError: string | null = null;

  get showError(): boolean {
    if (this.groupError) return true;
    if (!this.control) return false;
    return this.control.invalid && (this.control.touched || this.submitted);
  }

  get message(): string | null {
    if (this.groupError) return this.groupError;
    return FormValidationHelper.getFieldError(this.control, this.label);
  }
}
