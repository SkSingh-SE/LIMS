import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, OnDestroy, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SymbolGroup } from '../symbol-picker/symbol-picker.component';
import { ActiveInputService } from '../symbol-picker/active-input.service';

const SYMBOL_GROUPS: SymbolGroup[] = [
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
      { char: '\u2126', name: 'Ohm Ω' },
      { char: '\u212B', name: 'Angstrom Å' },
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

  // NABL Domain Categories (no duplicate symbols)

  {
    label: 'Hardness Testing (NABL)',
    symbols: [
      { char: 'HV', name: 'Vickers Hardness' },
      { char: 'HB', name: 'Brinell Hardness' },
      { char: 'HRC', name: 'Rockwell Hardness C' },
      { char: 'HRA', name: 'Rockwell Hardness A' },
      { char: 'HRB', name: 'Rockwell Hardness B' },
      { char: 'HRD', name: 'Rockwell Hardness D' },
      { char: 'HRE', name: 'Rockwell Hardness E' },
      { char: 'HRF', name: 'Rockwell Hardness F' },
      { char: 'HRG', name: 'Rockwell Hardness G' },
      { char: 'HRH', name: 'Rockwell Hardness H' },
      { char: 'HRK', name: 'Rockwell Hardness K' },
      { char: 'HS', name: 'Shore Hardness' },
      { char: 'HM', name: 'Micro Vickers Hardness' },
      { char: 'KHN', name: 'Knoop Hardness Number' },
    ],
  },

  {
    label: 'Tensile Testing (NABL)',
    symbols: [
      { char: 'MPa', name: 'Megapascal' },
      { char: 'UTS', name: 'Ultimate Tensile Strength' },
      { char: 'YS', name: 'Yield Strength' },
      { char: '%El', name: 'Percentage Elongation' },
      { char: '%RA', name: 'Percentage Reduction of Area' },
      { char: 'E', name: 'Youngs Modulus' },
      { char: 'N/mm²', name: 'Newton per square millimeter' },
      { char: 'kN', name: 'Kilonewton' },
      { char: 'mm²', name: 'Square millimeter' },
      { char: 'Rp', name: 'Proof Strength' },
      { char: 'Rm', name: 'Tensile Strength' },
    ],
  },

  {
    label: 'Impact Testing (NABL)',
    symbols: [
      { char: 'J/cm²', name: 'Joules per square centimeter' },
      { char: 'ft-lbf', name: 'Foot-pounds force' },
      { char: 'CVN', name: 'Charpy V-Notch' },
      { char: 'IZOD', name: 'Izod Impact Test' },
      { char: 'KV', name: 'Charpy V Energy' },
      { char: 'KU', name: 'Charpy U Energy' },
      { char: 'Fbr', name: 'Fibrous Fracture' },
      { char: 'J', name: 'Joules' },
    ],
  },

  {
    label: 'Microstructure & Grain (NABL)',
    symbols: [
      { char: 'ASTM', name: 'ASTM Grain Size Number' },
      { char: 'μm', name: 'Micrometer' },
      { char: 'nm', name: 'Nanometer' },
      { char: 'G.S.', name: 'Grain Size' },
      { char: 'F', name: 'Ferrite' },
      { char: 'A', name: 'Austenite' },
      { char: 'C', name: 'Cementite' },
      { char: 'P', name: 'Pearlite' },
      { char: 'M', name: 'Martensite' },
      { char: 'B', name: 'Bainite' },
      { char: 'δ', name: 'Delta Ferrite' },
      { char: 'vol%', name: 'Volume %' },
      { char: 'wt%', name: 'Weight %' },
    ],
  },

  {
    label: 'Chemical Composition (NABL)',
    symbols: [
      { char: 'C', name: 'Carbon' },
      { char: 'Si', name: 'Silicon' },
      { char: 'Mn', name: 'Manganese' },
      { char: 'P', name: 'Phosphorus' },
      { char: 'S', name: 'Sulfur' },
      { char: 'Cr', name: 'Chromium' },
      { char: 'Mo', name: 'Molybdenum' },
      { char: 'Ni', name: 'Nickel' },
      { char: 'V', name: 'Vanadium' },
      { char: 'W', name: 'Tungsten' },
      { char: 'Co', name: 'Cobalt' },
      { char: 'Al', name: 'Aluminum' },
      { char: 'Ti', name: 'Titanium' },
      { char: 'Cu', name: 'Copper' },
      { char: 'Fe', name: 'Iron' },
      { char: 'ppm', name: 'Parts per million' },
    ],
  },

  {
    label: 'Heat Treatment (NABL)',
    symbols: [
      { char: 'A', name: 'Annealing' },
      { char: 'Q', name: 'Quenching' },
      { char: 'T', name: 'Tempering' },
      { char: 'N', name: 'Normalizing' },
      { char: 'AC', name: 'Air Cooling' },
      { char: 'WC', name: 'Water Cooling' },
      { char: 'OC', name: 'Oil Cooling' },
      { char: 'FC', name: 'Furnace Cooling' },
      { char: 'ST', name: 'Solution Treatment' },
      { char: 'Pa', name: 'Precipitation Aging' },
    ],
  },

  {
    label: 'Corrosion & Oxidation',
    symbols: [
      { char: 'mm/year', name: 'Millimeter per year' },
      { char: 'mg/cm²/day', name: 'Milligram per area per day' },
      { char: 'mdd', name: 'Milligrams per square decimeter per day' },
      { char: 'IACS', name: 'International Annealed Copper Standard' },
      { char: '%IACS', name: 'Percentage IACS' },
      { char: 'mV', name: 'Millivolt' },
      { char: 'μA', name: 'Microampere' },
      { char: 'OCP', name: 'Open Circuit Potential' },
      { char: 'pH', name: 'pH Value' },
    ],
  },

  {
    label: 'Fatigue & Stress (NABL)',
    symbols: [
      { char: 'N', name: 'Number of Cycles' },
      { char: 'S-N', name: 'Stress-Number Curve' },
      { char: 'Δσ', name: 'Stress Range' },
      { char: 'S', name: 'Stress Amplitude' },
      { char: 'Sf', name: 'Fatigue Strength' },
      { char: 'Nc', name: 'Cycles to Failure' },
      { char: 'R', name: 'Stress Ratio' },
      { char: 'Kt', name: 'Stress Concentration Factor' },
      { char: 'Kf', name: 'Fatigue Notch Factor' },
      { char: 'FOS', name: 'Factor of Safety' },
    ],
  },

  {
    label: 'Dimensional & Tolerance (NABL)',
    symbols: [
      { char: 'mm', name: 'Millimeter' },
      { char: 'cm', name: 'Centimeter' },
      { char: 'm', name: 'Meter' },
      { char: 'μm', name: 'Micrometer' },
      { char: '∅', name: 'Diameter' },
      { char: 'R', name: 'Radius' },
      { char: 'Ra', name: 'Roughness Average' },
      { char: 'Rz', name: 'Roughness Max Height' },
      { char: 'ISO', name: 'ISO Tolerance' },
    ],
  },

  {
    label: 'Statistical & Quality (NABL)',
    symbols: [
      { char: 'x̄', name: 'Mean' },
      { char: 's', name: 'Standard Deviation' },
      { char: 'n', name: 'Sample Size' },
      { char: 'N', name: 'Population Size' },
      { char: 'CV', name: 'Coefficient of Variation' },
      { char: 'p', name: 'Probability' },
      { char: 'PPM', name: 'Parts Per Million' },
      { char: 'Cpk', name: 'Process Capability' },
      { char: 'RSD', name: 'Relative Std Dev' },
    ],
  },
];


const RECENT_STORAGE_KEY = 'lims_recent_symbols';
const FAVORITES_STORAGE_KEY = 'lims_favorite_symbols';
const POSITION_STORAGE_KEY = 'lims_symbol_picker_position';
const MAX_RECENT = 12;

@Component({
  selector: 'app-floating-symbol-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './floating-symbol-picker.component.html',
  styleUrl: './floating-symbol-picker.component.css',
})
export class FloatingSymbolPickerComponent implements OnInit, OnDestroy {
  isOpen = false;
  searchText = '';
  activeTab = 'all';
  copiedChar = '';
  toastMessage = '';
  symbolGroups = SYMBOL_GROUPS;
  recentSymbols: { char: string; name: string }[] = [];
  favoriteSymbols: { char: string; name: string }[] = [];

  // Drag state
  isDragging = false;
  btnPosition = { bottom: 110, right: 40 };
  private dragOffset = { x: 0, y: 0 };
  private dragStartPos = { x: 0, y: 0 };
  private hasMoved = false;

  // Bound handlers for drag (need references for removeEventListener)
  private boundOnMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundOnMouseUp: ((e: MouseEvent) => void) | null = null;
  private boundOnTouchMove: ((e: TouchEvent) => void) | null = null;
  private boundOnTouchEnd: ((e: TouchEvent) => void) | null = null;

  constructor(
    private elRef: ElementRef,
    private activeInputService: ActiveInputService,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadRecent();
    this.loadFavorites();
    this.loadPosition();
  }

  ngOnDestroy(): void {
    this.removeDragListeners();
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
    // If we were dragging, don't toggle
    if (this.hasMoved) {
      return;
    }
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchText = '';
      this.activeTab = 'all';
      this.copiedChar = '';
      this.toastMessage = '';
    }
  }

  selectSymbol(char: string, name: string): void {
    this.addToRecent(char, name);

    // Try inserting into last focused input
    const inserted = this.activeInputService.insertAtCursor(char);

    if (!inserted) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(char).then(() => {
        this.showToast(`"${char}" copied! Paste with Ctrl+V`);
      });
    }
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.searchText = '';
  }

  // ── Favorites ──
  isFavorite(char: string): boolean {
    return this.favoriteSymbols.some((s) => s.char === char);
  }

  toggleFavorite(event: MouseEvent, char: string, name: string): void {
    event.stopPropagation();
    if (this.isFavorite(char)) {
      this.favoriteSymbols = this.favoriteSymbols.filter((s) => s.char !== char);
    } else {
      this.favoriteSymbols = [...this.favoriteSymbols, { char, name }];
    }
    this.saveFavorites();
  }

  // ── Drag ──
  onDragStart(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.hasMoved = false;

    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    const btnEl = (event.target as HTMLElement).closest('.floating-symbol-btn') as HTMLElement;
    if (!btnEl) return;

    const rect = btnEl.getBoundingClientRect();
    this.dragOffset = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    this.dragStartPos = { x: clientX, y: clientY };

    this.ngZone.runOutsideAngular(() => {
      if (event instanceof MouseEvent) {
        this.boundOnMouseMove = this.onDragMove.bind(this);
        this.boundOnMouseUp = this.onDragEnd.bind(this);
        document.addEventListener('mousemove', this.boundOnMouseMove);
        document.addEventListener('mouseup', this.boundOnMouseUp);
      } else {
        this.boundOnTouchMove = this.onTouchDragMove.bind(this);
        this.boundOnTouchEnd = this.onTouchDragEnd.bind(this);
        document.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
        document.addEventListener('touchend', this.boundOnTouchEnd);
      }
    });
  }

  private onDragMove(event: MouseEvent): void {
    const dx = Math.abs(event.clientX - this.dragStartPos.x);
    const dy = Math.abs(event.clientY - this.dragStartPos.y);
    if (dx > 5 || dy > 5) {
      this.hasMoved = true;
      this.isDragging = true;
    }
    if (!this.isDragging) return;
    this.updatePosition(event.clientX, event.clientY);
  }

  private onDragEnd(event: MouseEvent): void {
    this.finishDrag();
    if (this.boundOnMouseMove) document.removeEventListener('mousemove', this.boundOnMouseMove);
    if (this.boundOnMouseUp) document.removeEventListener('mouseup', this.boundOnMouseUp);
  }

  private onTouchDragMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - this.dragStartPos.x);
    const dy = Math.abs(touch.clientY - this.dragStartPos.y);
    if (dx > 5 || dy > 5) {
      this.hasMoved = true;
      this.isDragging = true;
    }
    if (!this.isDragging) return;
    this.updatePosition(touch.clientX, touch.clientY);
  }

  private onTouchDragEnd(event: TouchEvent): void {
    this.finishDrag();
    if (this.boundOnTouchMove) document.removeEventListener('touchmove', this.boundOnTouchMove);
    if (this.boundOnTouchEnd) document.removeEventListener('touchend', this.boundOnTouchEnd);
  }

  private updatePosition(clientX: number, clientY: number): void {
    const btnSize = 48;
    const newRight = window.innerWidth - clientX - btnSize + this.dragOffset.x;
    const newBottom = window.innerHeight - clientY - btnSize + this.dragOffset.y;

    this.ngZone.run(() => {
      this.btnPosition = {
        right: Math.max(8, Math.min(newRight, window.innerWidth - btnSize - 8)),
        bottom: Math.max(8, Math.min(newBottom, window.innerHeight - btnSize - 8)),
      };
    });
  }

  private finishDrag(): void {
    if (this.isDragging) {
      this.savePosition();
    }
    // Delay resetting so click handler can check hasMoved
    setTimeout(() => {
      this.isDragging = false;
    }, 50);
  }

  private removeDragListeners(): void {
    if (this.boundOnMouseMove) document.removeEventListener('mousemove', this.boundOnMouseMove);
    if (this.boundOnMouseUp) document.removeEventListener('mouseup', this.boundOnMouseUp);
    if (this.boundOnTouchMove) document.removeEventListener('touchmove', this.boundOnTouchMove);
    if (this.boundOnTouchEnd) document.removeEventListener('touchend', this.boundOnTouchEnd);
  }

  // ── Keyboard shortcut ──
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+Shift+S to toggle
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
      event.preventDefault();
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.searchText = '';
        this.activeTab = 'all';
        this.copiedChar = '';
        this.toastMessage = '';
      }
    }
    // Escape to close
    if (event.key === 'Escape' && this.isOpen) {
      this.isOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  // ── Persistence ──
  private showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => (this.toastMessage = ''), 2000);
  }

  private loadRecent(): void {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) this.recentSymbols = JSON.parse(stored);
    } catch {
      this.recentSymbols = [];
    }
  }

  private addToRecent(char: string, name: string): void {
    this.recentSymbols = [{ char, name }, ...this.recentSymbols.filter((s) => s.char !== char)].slice(0, MAX_RECENT);
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(this.recentSymbols));
    } catch {}
  }

  private loadFavorites(): void {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) this.favoriteSymbols = JSON.parse(stored);
    } catch {
      this.favoriteSymbols = [];
    }
  }

  private saveFavorites(): void {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(this.favoriteSymbols));
    } catch {}
  }

  private loadPosition(): void {
    try {
      const stored = localStorage.getItem(POSITION_STORAGE_KEY);
      if (stored) {
        const pos = JSON.parse(stored);
        // Validate position is within viewport
        if (pos.right >= 0 && pos.bottom >= 0 && pos.right < window.innerWidth && pos.bottom < window.innerHeight) {
          this.btnPosition = pos;
        }
      }
    } catch {}
  }

  private savePosition(): void {
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(this.btnPosition));
    } catch {}
  }
}
