import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SymbolGroup {
  label: string;
  symbols: { char: string; name: string }[];
}

const DEFAULT_SYMBOL_GROUPS: SymbolGroup[] = [
  {
    label: 'Superscripts',
    symbols: [
      { char: '\u2070', name: 'Superscript 0' },
      { char: '\u00B9', name: 'Superscript 1' },
      { char: '\u00B2', name: 'Superscript 2' },
      { char: '\u00B3', name: 'Superscript 3' },
      { char: '\u2074', name: 'Superscript 4' },
      { char: '\u2075', name: 'Superscript 5' },
      { char: '\u2076', name: 'Superscript 6' },
      { char: '\u2077', name: 'Superscript 7' },
      { char: '\u2078', name: 'Superscript 8' },
      { char: '\u2079', name: 'Superscript 9' },
      { char: '\u207A', name: 'Superscript +' },
      { char: '\u207B', name: 'Superscript -' },
      { char: '\u207C', name: 'Superscript =' },
      { char: '\u207D', name: 'Superscript (' },
      { char: '\u207E', name: 'Superscript )' },
      { char: '\u207F', name: 'Superscript n' },
    ],
  },
  {
    label: 'Subscripts',
    symbols: [
      { char: '\u2080', name: 'Subscript 0' },
      { char: '\u2081', name: 'Subscript 1' },
      { char: '\u2082', name: 'Subscript 2' },
      { char: '\u2083', name: 'Subscript 3' },
      { char: '\u2084', name: 'Subscript 4' },
      { char: '\u2085', name: 'Subscript 5' },
      { char: '\u2086', name: 'Subscript 6' },
      { char: '\u2087', name: 'Subscript 7' },
      { char: '\u2088', name: 'Subscript 8' },
      { char: '\u2089', name: 'Subscript 9' },
      { char: '\u208A', name: 'Subscript +' },
      { char: '\u208B', name: 'Subscript -' },
      { char: '\u208C', name: 'Subscript =' },
      { char: '\u208D', name: 'Subscript (' },
      { char: '\u208E', name: 'Subscript )' },
    ],
  },
  {
    label: 'Greek Letters',
    symbols: [
      { char: '\u0391', name: 'Alpha (Α)' },
      { char: '\u03B1', name: 'alpha (α)' },
      { char: '\u0392', name: 'Beta (Β)' },
      { char: '\u03B2', name: 'beta (β)' },
      { char: '\u0393', name: 'Gamma (Γ)' },
      { char: '\u03B3', name: 'gamma (γ)' },
      { char: '\u0394', name: 'Delta (Δ)' },
      { char: '\u03B4', name: 'delta (δ)' },
      { char: '\u0395', name: 'Epsilon (Ε)' },
      { char: '\u03B5', name: 'epsilon (ε)' },
      { char: '\u0396', name: 'Zeta (Ζ)' },
      { char: '\u03B6', name: 'zeta (ζ)' },
      { char: '\u0397', name: 'Eta (Η)' },
      { char: '\u03B7', name: 'eta (η)' },
      { char: '\u0398', name: 'Theta (Θ)' },
      { char: '\u03B8', name: 'theta (θ)' },
      { char: '\u039B', name: 'Lambda (Λ)' },
      { char: '\u03BB', name: 'lambda (λ)' },
      { char: '\u039C', name: 'Mu (Μ)' },
      { char: '\u03BC', name: 'mu / micro (μ)' },
      { char: '\u03C0', name: 'pi (π)' },
      { char: '\u03C1', name: 'rho (ρ)' },
      { char: '\u03A3', name: 'Sigma (Σ)' },
      { char: '\u03C3', name: 'sigma (σ)' },
      { char: '\u03C4', name: 'tau (τ)' },
      { char: '\u03A6', name: 'Phi (Φ)' },
      { char: '\u03C6', name: 'phi (φ)' },
      { char: '\u03A8', name: 'Psi (Ψ)' },
      { char: '\u03C8', name: 'psi (ψ)' },
      { char: '\u03A9', name: 'Omega (Ω)' },
      { char: '\u03C9', name: 'omega (ω)' },
    ],
  },
  {
    label: 'Units & Measurement',
    symbols: [
      { char: '\u00B0', name: 'Degree °' },
      { char: '\u2103', name: 'Degree Celsius ℃' },
      { char: '\u2109', name: 'Degree Fahrenheit ℉' },
      { char: '\u00B5', name: 'Micro sign µ' },
      { char: '\u212B', name: 'Angstrom Å' },
      { char: '\u2126', name: 'Ohm Ω' },
      { char: '\u0025', name: 'Percent %' },
      { char: '\u2030', name: 'Per mille ‰' },
      { char: '\u2031', name: 'Per ten thousand ‱' },
    ],
  },
  {
    label: 'Math Operators',
    symbols: [
      { char: '\u00B1', name: 'Plus-minus ±' },
      { char: '\u2213', name: 'Minus-plus ∓' },
      { char: '\u00D7', name: 'Multiplication ×' },
      { char: '\u00F7', name: 'Division ÷' },
      { char: '\u2264', name: 'Less than or equal ≤' },
      { char: '\u2265', name: 'Greater than or equal ≥' },
      { char: '\u2260', name: 'Not equal ≠' },
      { char: '\u2248', name: 'Approximately ≈' },
      { char: '\u221D', name: 'Proportional ∝' },
      { char: '\u221E', name: 'Infinity ∞' },
      { char: '\u221A', name: 'Square root √' },
      { char: '\u221B', name: 'Cube root ∛' },
      { char: '\u2211', name: 'Summation Σ' },
      { char: '\u220F', name: 'Product Π' },
      { char: '\u222B', name: 'Integral ∫' },
      { char: '\u2202', name: 'Partial differential ∂' },
      { char: '\u2206', name: 'Increment Δ' },
      { char: '\u2207', name: 'Nabla ∇' },
      { char: '\u2229', name: 'Intersection ∩' },
      { char: '\u222A', name: 'Union ∪' },
      { char: '\u2208', name: 'Element of ∈' },
      { char: '\u2209', name: 'Not element of ∉' },
    ],
  },
  {
    label: 'Fractions',
    symbols: [
      { char: '\u00BC', name: 'One-quarter ¼' },
      { char: '\u00BD', name: 'One-half ½' },
      { char: '\u00BE', name: 'Three-quarters ¾' },
      { char: '\u2153', name: 'One-third ⅓' },
      { char: '\u2154', name: 'Two-thirds ⅔' },
      { char: '\u2155', name: 'One-fifth ⅕' },
      { char: '\u2156', name: 'Two-fifths ⅖' },
      { char: '\u2157', name: 'Three-fifths ⅗' },
      { char: '\u2158', name: 'Four-fifths ⅘' },
      { char: '\u2159', name: 'One-sixth ⅙' },
      { char: '\u215B', name: 'One-eighth ⅛' },
      { char: '\u215C', name: 'Three-eighths ⅜' },
      { char: '\u215D', name: 'Five-eighths ⅝' },
      { char: '\u215E', name: 'Seven-eighths ⅞' },
    ],
  },
  {
    label: 'Arrows',
    symbols: [
      { char: '\u2190', name: 'Left arrow ←' },
      { char: '\u2191', name: 'Up arrow ↑' },
      { char: '\u2192', name: 'Right arrow →' },
      { char: '\u2193', name: 'Down arrow ↓' },
      { char: '\u2194', name: 'Left-right arrow ↔' },
      { char: '\u2195', name: 'Up-down arrow ↕' },
      { char: '\u21D0', name: 'Double left arrow ⇐' },
      { char: '\u21D2', name: 'Double right arrow ⇒' },
      { char: '\u21D4', name: 'Double left-right arrow ⇔' },
    ],
  },
  {
    label: 'Chemical & Scientific',
    symbols: [
      { char: '\u2022', name: 'Bullet •' },
      { char: '\u00B7', name: 'Middle dot ·' },
      { char: '\u2219', name: 'Bullet operator ∙' },
      { char: '\u22C5', name: 'Dot operator ⋅' },
      { char: '\u2261', name: 'Identical / Triple bond ≡' },
      { char: '\u2013', name: 'En dash –' },
      { char: '\u2014', name: 'Em dash —' },
      { char: '\u00AC', name: 'Not sign ¬' },
      { char: '\u2234', name: 'Therefore ∴' },
      { char: '\u2235', name: 'Because ∵' },
    ],
  },
  {
    label: 'Special & Miscellaneous',
    symbols: [
      { char: '*', name: 'Asterisk *' },
      { char: '\u00AE', name: 'Registered ®' },
      { char: '\u2122', name: 'Trademark ™' },
      { char: '\u00A9', name: 'Copyright ©' },
      { char: '\u00A7', name: 'Section §' },
      { char: '\u00B6', name: 'Pilcrow ¶' },
      { char: '\u2020', name: 'Dagger †' },
      { char: '\u2021', name: 'Double dagger ‡' },
      { char: '\u2023', name: 'Triangular bullet ‣' },
      { char: '\u25CB', name: 'White circle ○' },
      { char: '\u25CF', name: 'Black circle ●' },
      { char: '\u25A0', name: 'Black square ■' },
      { char: '\u25A1', name: 'White square □' },
      { char: '\u25B2', name: 'Black triangle ▲' },
      { char: '\u25BC', name: 'Black down triangle ▼' },
      { char: '\u2605', name: 'Black star ★' },
      { char: '\u2713', name: 'Check mark ✓' },
      { char: '\u2717', name: 'Ballot X ✗' },
    ],
  },
];

const RECENT_STORAGE_KEY = 'lims_recent_symbols';
const MAX_RECENT = 12;

@Component({
  selector: 'app-symbol-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './symbol-picker.component.html',
  styleUrl: './symbol-picker.component.css',
})
export class SymbolPickerComponent implements OnInit {
  @Input() symbolGroups: SymbolGroup[] = DEFAULT_SYMBOL_GROUPS;
  @Input() disabled = false;

  /** Pass a target input/textarea element — the symbol will be inserted at cursor position automatically */
  @Input() targetInput: HTMLInputElement | HTMLTextAreaElement | null = null;

  /** If no targetInput, this event fires so the parent can handle insertion */
  @Output() symbolSelected = new EventEmitter<string>();

  isOpen = false;
  searchText = '';
  recentSymbols: { char: string; name: string }[] = [];
  activeTab = 'all';

  private allSymbols: { char: string; name: string; group: string }[] = [];

  constructor(private elRef: ElementRef) {}

  ngOnInit(): void {
    this.buildFlatList();
    this.loadRecent();
  }

  get filteredGroups(): SymbolGroup[] {
    if (!this.searchText.trim()) {
      return this.symbolGroups;
    }
    const term = this.searchText.toLowerCase();
    return this.symbolGroups
      .map((g) => ({
        label: g.label,
        symbols: g.symbols.filter((s) => s.name.toLowerCase().includes(term) || s.char === term),
      }))
      .filter((g) => g.symbols.length > 0);
  }

  toggle(): void {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.searchText = '';
        this.activeTab = 'all';
      }
    }
  }

  selectSymbol(char: string, name: string): void {
    this.addToRecent(char, name);

    if (this.targetInput) {
      this.insertAtCursor(this.targetInput, char);
    }

    this.symbolSelected.emit(char);
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.searchText = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  private insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, char: string): void {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const value = el.value;
    el.value = value.substring(0, start) + char + value.substring(end);

    // Trigger Angular change detection for reactive forms
    el.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + char.length, start + char.length);
    });
  }

  private buildFlatList(): void {
    this.allSymbols = [];
    for (const group of this.symbolGroups) {
      for (const sym of group.symbols) {
        this.allSymbols.push({ ...sym, group: group.label });
      }
    }
  }

  private loadRecent(): void {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        this.recentSymbols = JSON.parse(stored);
      }
    } catch {
      this.recentSymbols = [];
    }
  }

  private addToRecent(char: string, name: string): void {
    this.recentSymbols = [{ char, name }, ...this.recentSymbols.filter((s) => s.char !== char)].slice(0, MAX_RECENT);
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(this.recentSymbols));
    } catch {
      // localStorage full or unavailable
    }
  }
}
