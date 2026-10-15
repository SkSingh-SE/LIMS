import {
  Component,
  ElementRef,
  forwardRef,
  Input,
  OnInit,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormsModule,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { Country } from '../../models/country.model';
import { ALL_COUNTRIES } from '../../data/country-codes.data';
import { NumberOnlyDirective } from '../../directives/number-only.directive';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule, NumberOnlyDirective],
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent implements OnInit, ControlValueAccessor, Validator {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() defaultCountry = 'in';
  @Input() placeholder?: string;
  @Input() label?: string;
  @Input() hideLabel = false;
  @Input() required = false;
  @Input() disabled = false;
  @Input() submitted = false;
  @Input() isInvalid = false;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('phoneInput') phoneInput?: ElementRef<HTMLInputElement>;

  countries: Country[] = ALL_COUNTRIES;
  filteredCountries: Country[] = ALL_COUNTRIES;
  selectedCountry: Country = ALL_COUNTRIES[0];
  phoneNumber = '';
  searchQuery = '';
  isOpen = false;
  flagErrorMap: Record<string, boolean> = {};

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private isTouched = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private hostEl: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    if (this.hostEl?.nativeElement?.classList) {
      if (
        this.hostEl.nativeElement.classList.contains('form-control-sm') ||
        this.hostEl.nativeElement.classList.contains('input-sm')
      ) {
        this.size = 'sm';
      } else if (
        this.hostEl.nativeElement.classList.contains('form-control-lg') ||
        this.hostEl.nativeElement.classList.contains('input-lg')
      ) {
        this.size = 'lg';
      }
    }

    const found = this.countries.find(
      c => c.iso2.toLowerCase() === this.defaultCountry.toLowerCase()
    );
    if (found) {
      this.selectedCountry = found;
    }
  }

  // ─── ControlValueAccessor ─────────────────────────────────────────

  writeValue(value: any): void {
    if (!value || typeof value !== 'string' || !value.trim()) {
      this.phoneNumber = '';
      this.cdr.markForCheck();
      return;
    }

    const trimmed = value.trim();
    // Parse country dial code (sorted by dial code length descending e.g. +1684 before +1)
    const sorted = [...this.countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
    let matched: Country | undefined;

    for (const c of sorted) {
      if (trimmed.startsWith(c.dialCode)) {
        matched = c;
        break;
      }
    }

    if (matched) {
      this.selectedCountry = matched;
      this.phoneNumber = trimmed.substring(matched.dialCode.length).replace(/^[ -]+/, '');
    } else {
      // Check 12-digit Indian number e.g. 919876543210
      if (/^91\d{10}$/.test(trimmed)) {
        this.selectedCountry = this.countries.find(c => c.iso2 === 'in') || this.countries[0];
        this.phoneNumber = trimmed.substring(2);
      } else {
        // Fallback to default country with raw number
        this.phoneNumber = trimmed.replace(/^[+]/, '');
      }
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  // ─── Validator ────────────────────────────────────────────────────

  validate(control: AbstractControl): ValidationErrors | null {
    const val = (this.phoneNumber || '').trim();
    if (!val) {
      if (this.required) {
        return { required: true };
      }
      return null;
    }

    if (this.selectedCountry.dialCode === '+91') {
      if (!/^[0-9]{10}$/.test(val)) {
        return { customMessage: 'Mobile number must be exactly 10 digits for India (+91)' };
      }
    } else {
      if (!/^[0-9]{7,15}$/.test(val)) {
        return { customMessage: 'Contact number must be 7 to 15 digits' };
      }
    }

    return null;
  }

  // ─── User Actions ─────────────────────────────────────────────────

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.phoneNumber = input.value.replace(/[^0-9]/g, '');
    this.notifyChange();
  }

  onBlur(): void {
    this.isTouched = true;
    this.onTouched();
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.filteredCountries = this.countries;
      setTimeout(() => {
        this.searchInput?.nativeElement.focus();
      }, 50);
    }
  }

  closeDropdown(): void {
    this.isOpen = false;
    this.searchQuery = '';
    this.filteredCountries = this.countries;
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.closeDropdown();
    this.notifyChange();
    setTimeout(() => {
      this.phoneInput?.nativeElement.focus();
    }, 50);
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    const q = query.trim().toLowerCase();
    if (!q) {
      this.filteredCountries = this.countries;
      return;
    }
    this.filteredCountries = this.countries.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q) ||
        c.iso2.toLowerCase().includes(q)
    );
  }

  get dynamicPlaceholder(): string {
    if (this.placeholder) return this.placeholder;
    if (this.selectedCountry.iso2 === 'in') return '10-digit mobile number';
    return this.selectedCountry.placeholder || 'Enter phone number';
  }

  get dynamicMaxLength(): number {
    if (this.selectedCountry.iso2 === 'in') return 10;
    return this.selectedCountry.digitLength || 15;
  }

  get showError(): boolean {
    if (this.isInvalid) return true;
    const isFieldInvalid = !this.isValidNumber();
    return isFieldInvalid && (this.isTouched || this.submitted);
  }

  get errorMessage(): string {
    const val = (this.phoneNumber || '').trim();
    if (!val && this.required) {
      return (this.label || 'Contact number') + ' is required';
    }
    if (this.selectedCountry.dialCode === '+91') {
      return 'Mobile number must be exactly 10 digits for India (+91)';
    }
    return 'Contact number must be 7 to 15 digits';
  }

  private isValidNumber(): boolean {
    const val = (this.phoneNumber || '').trim();
    if (!val) return !this.required;
    if (this.selectedCountry.dialCode === '+91') {
      return /^[0-9]{10}$/.test(val);
    }
    return /^[0-9]{7,15}$/.test(val);
  }

  private notifyChange(): void {
    const cleanNum = (this.phoneNumber || '').trim();
    const formatted = cleanNum ? `${this.selectedCountry.dialCode} ${cleanNum}` : '';
    this.onChange(formatted);
  }
}
