import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

export class FormValidationHelper {
  static isFieldInvalid(form: FormGroup, path: string, submitted = false): boolean {
    const control = form.get(path);
    if (!control || control.disabled) return false;
    return control.invalid && (control.touched || control.dirty || submitted);
  }

  static getFieldError(control: AbstractControl | null, label = 'This field'): string | null {
    if (!control?.errors) return null;
    const e = control.errors;
    if (e['required'])            return `${label} is required`;
    if (e['whitespace'])          return `${label} cannot be whitespace only`;
    if (e['quillRequired'])       return `${label} is required`;
    if (e['conditionalRequired']) return `${label} is required`;
    if (e['email'])               return `Enter a valid email address`;
    if (e['emailPattern'])        return `Enter a valid email address`;
    if (e['phone'])               return `Enter a valid phone number (10–13 digits)`;
    if (e['gstin'])               return `Invalid GSTIN — expected format: 22AAAAA0000A1Z5`;
    if (e['pan'])                 return `Invalid PAN — expected format: ABCDE1234F`;
    if (e['ifsc'])                return `Invalid IFSC code — expected format: SBIN0001234`;
    if (e['pinCode'])             return `PIN code must be exactly 6 digits`;
    if (e['maxlength'])           return `Maximum ${e['maxlength'].requiredLength} characters allowed`;
    if (e['minlength'])           return `Minimum ${e['minlength'].requiredLength} characters required`;
    if (e['min'])                 return `Minimum value is ${e['min'].min}`;
    if (e['max'])                 return `Maximum value is ${e['max'].max}`;
    if (e['minValue'])            return `Minimum value is ${e['minValue'].min}`;
    if (e['maxValue'])            return `Maximum value is ${e['maxValue'].max}`;
    if (e['pattern'])             return `Invalid format`;
    return 'Invalid value';
  }

  static getGroupError(group: AbstractControl | null): string | null {
    if (!group?.errors) return null;
    const e = group.errors;
    if (e['dateRange'])  return 'End date must be after start date';
    if (e['fyDuration']) return 'Financial year must be between 11 and 13 months';
    return null;
  }

  static markAllTouched(control: AbstractControl): void {
    control.markAsTouched({ onlySelf: true });
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach(c => FormValidationHelper.markAllTouched(c));
    } else if (control instanceof FormArray) {
      control.controls.forEach(c => FormValidationHelper.markAllTouched(c));
    }
  }

  static trimFormValues(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control instanceof FormGroup) {
        FormValidationHelper.trimFormValues(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(c => {
          if (c instanceof FormGroup) FormValidationHelper.trimFormValues(c);
        });
      } else if (control && typeof control.value === 'string') {
        control.setValue(control.value.trim(), { emitEvent: false });
      }
    });
  }
}
