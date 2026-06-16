import { AbstractControl, ValidationErrors } from '@angular/forms';

const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

const CIDR_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}\/([0-9]|[1-2]\d|3[0-2])$/;

export function ipRestrictionValidator(
  control: AbstractControl
): ValidationErrors | null {
  if (!control.value) return null; // optional field

  const values = control.value
    .split(',')
    .map((v: string) => v.trim())
    .filter(Boolean);

  for (const ip of values) {
    if (!IPV4_REGEX.test(ip) && !CIDR_REGEX.test(ip)) {
      return { invalidIpRestriction: true };
    }
  }

  return null;
}
