import {
  Component,
  ElementRef,
  forwardRef,
  Input,
  OnInit,
  AfterViewInit,
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
export class PhoneInputComponent implements OnInit, AfterViewInit, ControlValueAccessor, Validator {
  @Input()
  set size(value: 'xs' | 'sm' | 'md' | 'lg' | string) {
    if (value === 'xs' || value === 'sm' || value === 'md' || value === 'lg') {
      this._size = value;
      this._isSizeExplicit = true;
    }
  }
  get size(): 'xs' | 'sm' | 'md' | 'lg' {
    return this._size;
  }
  private _size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  private _isSizeExplicit = false;

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
    this.autoDetectSize();

    const found = this.countries.find(
      c => c.iso2.toLowerCase() === this.defaultCountry.toLowerCase()
    );
    if (found) {
      this.selectedCountry = found;
    }
  }

  ngAfterViewInit(): void {
    this.autoDetectSize();
  }

  /**
   * Automatically analyzes surrounding form elements and classes
   * (e.g. sm, md, lg, xs, form-control-sm, form-label-sm, computed height)
   * and adjusts the phone-input size to match consecutive inputs.
   */
  autoDetectSize(): void {
    if (this._isSizeExplicit) {
      return;
    }

    const host = this.hostEl?.nativeElement;
    if (!host) return;

    let detected: 'xs' | 'sm' | 'md' | 'lg' | null = null;

    // 1. Direct host element classes (e.g. <app-phone-input class="form-control-sm"> or class="sm")
    detected = this.detectSizeFromElement(host);
    if (detected) {
      this.applyDetectedSize(detected);
      return;
    }

    // 2. Check enclosing row / form-row / form-group / container (skip isolated .col-* wrappers)
    const container =
      host.closest(
        '.row, .form-row, .form-group, fieldset, .modal-body, .card-body, table, tr, td, form'
      ) || host.parentElement;

    if (container) {
      // 2a. Check if the container itself has sizing classes (e.g. form-sm, compact-form, table-sm)
      detected = this.detectSizeFromElement(container as HTMLElement);
      if (detected) {
        this.applyDetectedSize(detected);
        return;
      }

      // 2b. Check consecutive / sibling inputs in the same row / container
      // Filter out elements inside host and any other phone-input component
      const siblingControls = Array.from(
        container.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]), select, textarea, .form-control, .form-select'
        )
      ).filter(el => !host.contains(el) && !el.closest('app-phone-input'));

      // Check classes on consecutive controls
      for (const ctrl of siblingControls) {
        detected = this.detectSizeFromElement(ctrl);
        if (detected) {
          this.applyDetectedSize(detected);
          return;
        }
      }

      // 2c. Check labels in container (e.g. form-label-sm)
      const siblingLabels = Array.from(
        container.querySelectorAll<HTMLElement>('label, .form-label, .form-label-sm, .form-label-lg, .form-label-xs')
      ).filter(el => !host.contains(el) && !el.closest('app-phone-input'));

      for (const lbl of siblingLabels) {
        detected = this.detectSizeFromElement(lbl);
        if (detected) {
          this.applyDetectedSize(detected);
          return;
        }
      }

      // 2d. Check computed height of consecutive inputs (e.g. 28px-30px -> 'sm')
      if (typeof window !== 'undefined') {
        for (const ctrl of siblingControls) {
          if (ctrl.tagName === 'INPUT' || ctrl.tagName === 'SELECT') {
            const h = parseFloat(window.getComputedStyle(ctrl).height);
            if (h > 0) {
              if (h <= 26) {
                detected = 'xs';
                break;
              } else if (h <= 32) {
                detected = 'sm';
                break;
              } else if (h >= 42) {
                detected = 'lg';
                break;
              } else if (h >= 33 && h < 42) {
                detected = 'md';
                break;
              }
            }
          }
        }
        if (detected) {
          this.applyDetectedSize(detected);
          return;
        }
      }

      // 2e. If sibling inputs exist with standard .form-control without specific heights, default to 'md'
      const hasStandard = siblingControls.some(
        ctrl => ctrl.classList.contains('form-control') || ctrl.classList.contains('form-select')
      );
      if (hasStandard) {
        this.applyDetectedSize('md');
        return;
      }
    }

    // 3. Check wider enclosing form / fieldset if container didn't have controls
    const formEl = host.closest('form, fieldset');
    if (formEl) {
      const formControls = Array.from(
        formEl.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]), select, textarea, .form-control, .form-select, label'
        )
      ).filter(el => !host.contains(el) && !el.closest('app-phone-input'));

      for (const ctrl of formControls) {
        detected = this.detectSizeFromElement(ctrl);
        if (detected) {
          this.applyDetectedSize(detected);
          return;
        }
      }

      if (typeof window !== 'undefined') {
        for (const ctrl of formControls) {
          if (ctrl.tagName === 'INPUT' || ctrl.tagName === 'SELECT') {
            const h = parseFloat(window.getComputedStyle(ctrl).height);
            if (h > 0) {
              if (h <= 26) {
                detected = 'xs';
                break;
              } else if (h <= 32) {
                detected = 'sm';
                break;
              } else if (h >= 42) {
                detected = 'lg';
                break;
              }
            }
          }
        }
        if (detected) {
          this.applyDetectedSize(detected);
          return;
        }
      }
    }
  }

  private detectSizeFromElement(el: HTMLElement): 'xs' | 'sm' | 'md' | 'lg' | null {
    if (!el || !el.classList) return null;
    const classes = Array.from(el.classList);

    // xs checks
    if (
      classes.some(
        c =>
          c === 'xs' ||
          c === 'form-control-xs' ||
          c === 'form-select-xs' ||
          c === 'input-xs' ||
          c === 'btn-xs' ||
          c === 'form-label-xs' ||
          c.endsWith('-xs')
      )
    ) {
      return 'xs';
    }

    // sm checks
    if (
      classes.some(
        c =>
          c === 'sm' ||
          c === 'form-control-sm' ||
          c === 'form-select-sm' ||
          c === 'input-sm' ||
          c === 'btn-sm' ||
          c === 'form-label-sm' ||
          c.endsWith('-sm')
      )
    ) {
      return 'sm';
    }

    // lg checks
    if (
      classes.some(
        c =>
          c === 'lg' ||
          c === 'form-control-lg' ||
          c === 'form-select-lg' ||
          c === 'input-lg' ||
          c === 'btn-lg' ||
          c === 'form-label-lg' ||
          c.endsWith('-lg')
      )
    ) {
      return 'lg';
    }

    // md checks
    if (
      classes.some(
        c =>
          c === 'md' ||
          c === 'form-control-md' ||
          c === 'form-select-md' ||
          c === 'input-md' ||
          c === 'btn-md' ||
          c === 'form-label-md' ||
          c.endsWith('-md')
      )
    ) {
      return 'md';
    }

    return null;
  }

  private applyDetectedSize(size: 'xs' | 'sm' | 'md' | 'lg'): void {
    if (this._size !== size) {
      this._size = size;
      this.cdr.markForCheck();
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
