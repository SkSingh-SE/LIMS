import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';

export interface CustomSelectOption {
  raw: any;
  value: any;
  label: string;
  shortLabel?: string;
  icon?: string;
  badge?: string;
  badgeClass?: string;
  triggerClass?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-custom-select, app-custome-select',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true,
    },
  ],
})
export class CustomSelectComponent implements OnInit, OnChanges, ControlValueAccessor {
  /** Array of raw options (strings, numbers, or objects) */
  @Input() options: any[] = [];

  /** Selected value */
  @Input() value: any = null;

  /** Sizing scale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' */
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'sm';
  @Input() set sizeClass(val: 'xs' | 'sm' | 'md' | 'lg' | 'xl') {
    if (val) this.size = val;
  }

  /** Visual variant: 'standard' (form-control style) | 'pill' (rounded badge pill) | 'subtle' */
  @Input() variant: 'standard' | 'pill' | 'subtle' = 'standard';

  /** Placeholder when nothing is selected */
  @Input() placeholder: string = 'Select...';

  /** Whether search is enabled: true, false, or 'auto' (enabled when items >= 7) */
  @Input() searchable: boolean | 'auto' = 'auto';

  /** Search input placeholder */
  @Input() searchPlaceholder: string = 'Search...';

  /** Disabled state */
  @Input() disabled: boolean = false;

  /** Allows clearing selection to null */
  @Input() clearable: boolean = false;

  /** Whether to show the badge inside the trigger button (default false, badges always show in dropdown list) */
  @Input() showBadgeOnTrigger: boolean = false;

  /** Custom CSS class on the trigger button */
  @Input() triggerClass: string = '';

  /** Field name mapping */
  @Input() valueField: string = 'value';
  @Input() set bindValue(val: string) { if (val) this.valueField = val; }

  @Input() labelField: string = 'label';
  @Input() set bindLabel(val: string) { if (val) this.labelField = val; }

  @Input() shortLabelField: string = 'shortLabel';
  @Input() set bindShortLabel(val: string) { if (val) this.shortLabelField = val; }

  @Input() iconField: string = 'icon';
  @Input() set bindIcon(val: string) { if (val) this.iconField = val; }

  @Input() badgeField: string = 'badge';
  @Input() set bindBadge(val: string) { if (val) this.badgeField = val; }

  @Input() badgeClassField: string = 'badgeClass';
  @Input() set bindBadgeClass(val: string) { if (val) this.badgeClassField = val; }

  /** Custom panel width (e.g. '220px', '100%') or auto */
  @Input() panelWidth: string = '';

  /** Custom CSS class on the dropdown panel */
  @Input() panelClass: string = '';

  /** Events */
  @Output() valueChange = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any>();
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('triggerEl') triggerEl!: ElementRef<HTMLElement>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('listEl') listEl?: ElementRef<HTMLElement>;

  isOpen = false;
  searchQuery = '';
  highlightedIndex = -1;
  triggerWidth = 0;

  normalizedOptions: CustomSelectOption[] = [];
  filteredOptions: CustomSelectOption[] = [];
  selectedOption: CustomSelectOption | null = null;

  /** CDK Overlay Positions */
  overlayPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
  ];

  // ControlValueAccessor callbacks
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};
  private searchFocusTimer: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.normalizeOptions();
    this.syncSelectedOption();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['valueField'] || changes['labelField'] || changes['iconField'] || changes['badgeField']) {
      this.normalizeOptions();
      this.syncSelectedOption();
    }
    if (changes['value']) {
      this.syncSelectedOption();
    }
  }

  get isSearchEnabled(): boolean {
    if (typeof this.searchable === 'boolean') {
      return this.searchable;
    }
    return this.normalizedOptions.length >= 7;
  }

  /**
   * Normalize input options into consistent CustomSelectOption objects
   */
  private normalizeOptions(): void {
    if (!this.options || !Array.isArray(this.options)) {
      this.normalizedOptions = [];
      this.filterOptions();
      return;
    }

    this.normalizedOptions = this.options.map(opt => {
      if (opt === null || opt === undefined) {
        return {
          raw: opt,
          value: opt,
          label: '',
        };
      }

      if (typeof opt !== 'object') {
        return {
          raw: opt,
          value: opt,
          label: String(opt),
        };
      }

      // Object option
      const value = opt[this.valueField] !== undefined
        ? opt[this.valueField]
        : (opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : (opt.key !== undefined ? opt.key : opt)));

      const label = opt[this.labelField] !== undefined
        ? opt[this.labelField]
        : (opt.label !== undefined ? opt.label : (opt.name !== undefined ? opt.name : (opt.text !== undefined ? opt.text : String(value ?? ''))));

      const shortLabel = opt[this.shortLabelField] || opt.shortLabel;
      const icon = opt[this.iconField] || opt.icon;
      const badge = opt[this.badgeField] || opt.badge;
      const badgeClass = opt[this.badgeClassField] || opt.badgeClass;
      const triggerClass = opt.triggerClass;
      const disabled = Boolean(opt.disabled);

      return {
        raw: opt,
        value,
        label: String(label ?? ''),
        shortLabel: shortLabel ? String(shortLabel) : undefined,
        icon,
        badge,
        badgeClass,
        triggerClass,
        disabled,
      };
    });

    this.filterOptions();
  }

  /**
   * Filter normalized options based on searchQuery
   */
  filterOptions(): void {
    if (!this.searchQuery.trim()) {
      this.filteredOptions = [...this.normalizedOptions];
    } else {
      const q = this.searchQuery.toLowerCase().trim();
      this.filteredOptions = this.normalizedOptions.filter(opt => {
        const matchLabel = opt.label.toLowerCase().includes(q);
        const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
        const matchValue = opt.value ? String(opt.value).toLowerCase().includes(q) : false;
        return matchLabel || matchBadge || matchValue;
      });
    }

    // Reset highlighted index to first matching option or current selection
    if (this.selectedOption) {
      const idx = this.filteredOptions.findIndex(o => this.isValueEqual(o.value, this.selectedOption?.value));
      this.highlightedIndex = idx >= 0 ? idx : (this.filteredOptions.length > 0 ? 0 : -1);
    } else {
      this.highlightedIndex = this.filteredOptions.length > 0 ? 0 : -1;
    }

    this.cdr.detectChanges();
  }

  /**
   * Sync internal selectedOption with external this.value
   */
  private syncSelectedOption(): void {
    if (this.value === null || this.value === undefined || this.value === '') {
      this.selectedOption = null;
    } else {
      const matched = this.normalizedOptions.find(o => this.isValueEqual(o.value, this.value));
      if (matched) {
        this.selectedOption = matched;
      } else {
        // Option might not be in options list yet, provide graceful fallback
        this.selectedOption = {
          raw: this.value,
          value: this.value,
          label: String(this.value),
        };
      }
    }
    this.cdr.markForCheck();
  }

  isValueEqual(v1: any, v2: any): boolean {
    if (v1 === v2) return true;
    if (v1 === null || v1 === undefined || v2 === null || v2 === undefined) return false;
    // Handle string/number equality
    return String(v1) === String(v2);
  }

  /** Toggle dropdown */
  toggleDropdown(event?: MouseEvent): void {
    if (this.disabled) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.disabled || this.isOpen) return;

    // Measure trigger width for overlay min-width
    if (this.triggerEl?.nativeElement) {
      this.triggerWidth = this.triggerEl.nativeElement.offsetWidth;
    }

    this.isOpen = true;
    this.searchQuery = '';
    this.filterOptions();
    this.opened.emit();
    this.cdr.detectChanges();
    this.scrollToHighlighted();

    // Focus search input if enabled
    if (this.isSearchEnabled) {
      this.searchFocusTimer = setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      }, 50);
    }
  }

  close(): void {
    if (this.searchFocusTimer) {
      clearTimeout(this.searchFocusTimer);
      this.searchFocusTimer = null;
    }
    if (!this.isOpen) return;
    this.isOpen = false;
    this.searchQuery = '';
    this.onTouched();
    this.closed.emit();
    this.cdr.detectChanges();
  }

  selectOption(opt: CustomSelectOption, event?: MouseEvent): void {
    if (opt.disabled) return;
    if (event) {
      event.stopPropagation();
    }

    this.selectedOption = opt;
    this.value = opt.value;
    this.onChange(opt.value);
    this.onTouched();
    this.valueChange.emit(opt.value);
    this.selectionChange.emit(opt.raw);
    this.close();

    // Preserve keyboard focus on trigger element after selection
    this.triggerEl?.nativeElement?.focus();
  }

  clearSelection(event?: MouseEvent): void {
    if (this.disabled) return;
    if (event) {
      event.stopPropagation();
    }

    this.selectedOption = null;
    this.value = null;
    this.onChange(null);
    this.onTouched();
    this.valueChange.emit(null);
    this.selectionChange.emit(null);
    this.cdr.detectChanges();
  }

  onSearchInput(query: string): void {
    this.searchQuery = query;
    this.filterOptions();
  }

  clearSearch(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.searchQuery = '';
    this.filterOptions();
    this.searchInput?.nativeElement?.focus();
  }

  /**
   * Move highlight up or down in filtered list, automatically skipping disabled items
   */
  private moveHighlight(step: number): void {
    if (this.filteredOptions.length === 0) return;
    let currentIdx = this.highlightedIndex;
    if (currentIdx < 0 || currentIdx >= this.filteredOptions.length) {
      currentIdx = step > 0 ? -1 : 0;
    }
    let nextIdx = currentIdx;
    for (let i = 0; i < this.filteredOptions.length; i++) {
      nextIdx = (nextIdx + step + this.filteredOptions.length) % this.filteredOptions.length;
      if (!this.filteredOptions[nextIdx].disabled) {
        this.highlightedIndex = nextIdx;
        this.scrollToHighlighted();
        this.cdr.detectChanges();
        break;
      }
    }
  }

  /**
   * Scroll highlighted option into view inside scrollable options list
   */
  private scrollToHighlighted(): void {
    setTimeout(() => {
      if (!this.listEl?.nativeElement) return;
      const items = this.listEl.nativeElement.querySelectorAll<HTMLElement>('.custom-select-option');
      const item = items[this.highlightedIndex];
      if (item) {
        const list = this.listEl.nativeElement;
        const itemTop = item.offsetTop;
        const itemBottom = itemTop + item.offsetHeight;
        const listTop = list.scrollTop;
        const listBottom = listTop + list.clientHeight;

        if (itemTop < listTop) {
          list.scrollTop = itemTop;
        } else if (itemBottom > listBottom) {
          list.scrollTop = itemBottom - list.clientHeight;
        }
      }
    }, 0);
  }

  /**
   * Move browser focus out of custom-select component to the next (or previous) focusable control
   */
  private focusNextElement(backward: boolean = false): void {
    if (typeof document === 'undefined') return;

    const selector = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(selector)
    ).filter(el => {
      if (el.closest('.cdk-overlay-container') || el.closest('[aria-hidden="true"]')) {
        return false;
      }
      return (el.offsetWidth > 0 || el.offsetHeight > 0);
    });

    const trigger = this.triggerEl?.nativeElement;
    if (!trigger) return;

    const currentIndex = focusable.indexOf(trigger);
    if (currentIndex >= 0) {
      const targetIndex = backward ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex >= 0 && targetIndex < focusable.length) {
        focusable[targetIndex].focus();
      } else if (targetIndex >= focusable.length && focusable.length > 0) {
        focusable[0]?.focus();
      } else if (targetIndex < 0 && focusable.length > 0) {
        focusable[focusable.length - 1]?.focus();
      }
    }
  }

  /** Keyboard Navigation */
  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    if (!this.isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        this.open();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        this.open();
        this.moveHighlight(1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        this.open();
        this.moveHighlight(-1);
        return;
      }
      // If closed, let Tab / Shift+Tab pass through natively to out of focus
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        this.moveHighlight(1);
        break;

      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        this.moveHighlight(-1);
        break;

      case 'Enter':
        event.preventDefault();
        event.stopPropagation();
        if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredOptions.length) {
          this.selectOption(this.filteredOptions[this.highlightedIndex]);
        }
        break;

      case 'Tab':
        // Tab key: close dropdown and move focus out of the custom-select component
        event.preventDefault();
        event.stopPropagation();
        this.close();
        setTimeout(() => {
          this.focusNextElement(event.shiftKey);
        }, 10);
        break;

      case ' ':
        // Space key: select highlighted option if search box is not active
        if (!this.isSearchEnabled) {
          event.preventDefault();
          event.stopPropagation();
          if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredOptions.length) {
            this.selectOption(this.filteredOptions[this.highlightedIndex]);
          }
        }
        break;

      case 'Home':
        if (!this.isSearchEnabled && this.filteredOptions.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          this.highlightedIndex = 0;
          this.scrollToHighlighted();
          this.cdr.detectChanges();
        }
        break;

      case 'End':
        if (!this.isSearchEnabled && this.filteredOptions.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          this.highlightedIndex = this.filteredOptions.length - 1;
          this.scrollToHighlighted();
          this.cdr.detectChanges();
        }
        break;

      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close();
        this.triggerEl?.nativeElement?.focus();
        break;
    }
  }

  // --- ControlValueAccessor Implementation ---
  writeValue(obj: any): void {
    this.value = obj;
    this.syncSelectedOption();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }
}
