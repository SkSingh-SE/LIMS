import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// ─── Text validators ─────────────────────────────────────────────

export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || typeof control.value !== 'string') return null;
    return control.value.trim().length === 0 ? { whitespace: true } : null;
  };
}

// ─── Pattern validators ───────────────────────────────────────────

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return /^[+]?\d{10,13}$/.test(control.value.toString().trim()) ? null : { phone: true };
  };
}

export function emailPatternValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return re.test(control.value.trim()) ? null : { emailPattern: true };
  };
}

export function gstinValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const re = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return re.test(control.value.trim().toUpperCase()) ? null : { gstin: true };
  };
}

export function panValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(control.value.trim().toUpperCase()) ? null : { pan: true };
  };
}

export function ifscValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(control.value.trim().toUpperCase()) ? null : { ifsc: true };
  };
}

export function pinCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return /^\d{6}$/.test(control.value.toString().trim()) ? null : { pinCode: true };
  };
}

// ─── Numeric validators ───────────────────────────────────────────

export function minValueValidator(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '' || control.value === undefined) return null;
    return +control.value >= min ? null : { minValue: { min, actual: control.value } };
  };
}

export function maxValueValidator(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '' || control.value === undefined) return null;
    return +control.value <= max ? null : { maxValue: { max, actual: control.value } };
  };
}

// ─── Cross-field group-level validators ───────────────────────────

export function dateRangeValidator(startField: string, endField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startField)?.value;
    const end = group.get(endField)?.value;
    if (!start || !end) return null;
    return new Date(end) > new Date(start) ? null : { dateRange: true };
  };
}

export function financialYearRangeValidator(startField: string, endField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startField)?.value;
    const end = group.get(endField)?.value;
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    if (e <= s) return { dateRange: true };
    const months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (months < 11 || months > 13) return { fyDuration: true };
    return null;
  };
}

// ─── Conditional required ─────────────────────────────────────────

export function conditionalRequiredValidator(
  dependentField: string,
  dependentValue: unknown,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) return null;
    const dep = parent.get(dependentField);
    if (!dep) return null;
    if (dep.value === dependentValue) {
      const v = control.value;
      return !v || (typeof v === 'string' && !v.trim()) ? { conditionalRequired: true } : null;
    }
    return null;
  };
}

// ─── Quill rich-text validator ────────────────────────────────────

export function quillRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return { quillRequired: true };
    const stripped = control.value.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0 ? null : { quillRequired: true };
  };
}

// ─── Barrel export ────────────────────────────────────────────────

export const CustomValidators = {
  noWhitespace: noWhitespaceValidator,
  phone: phoneValidator,
  emailPattern: emailPatternValidator,
  gstin: gstinValidator,
  pan: panValidator,
  ifsc: ifscValidator,
  pinCode: pinCodeValidator,
  minValue: minValueValidator,
  maxValue: maxValueValidator,
  dateRange: dateRangeValidator,
  financialYearRange: financialYearRangeValidator,
  conditionalRequired: conditionalRequiredValidator,
  quillRequired: quillRequiredValidator,
};
