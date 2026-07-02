import { Injectable, signal } from '@angular/core';

export type ThemeType = 'red' | 'blue' | 'green' | 'slate' | 'teal' | 'purple' | 'amber' | 'rose' | 'sky' | 'emerald' | 'custom' | 'tptl' | 'coral' | 'midnight' | 'olive' | 'magenta';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'lims_theme';
  private readonly CUSTOM_COLOR_KEY = 'lims_custom_color';
  
  // Expose current theme and custom color as Angular Signals
  currentTheme = signal<ThemeType>('red');
  customColor = signal<string>('#da261c');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeType;
    const savedCustomColor = localStorage.getItem(this.CUSTOM_COLOR_KEY);
    
    if (savedCustomColor) {
      this.customColor.set(savedCustomColor);
    }

    const validThemes: ThemeType[] = ['red', 'blue', 'green', 'slate', 'teal', 'purple', 'amber', 'rose', 'sky', 'emerald', 'custom', 'tptl', 'coral', 'midnight', 'olive', 'magenta'];
    if (savedTheme && validThemes.includes(savedTheme)) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme('red');
    }
  }

  setTheme(theme: ThemeType): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    
    if (theme === 'custom') {
      this.applyCustomTheme(this.customColor());
    } else {
      // Predefined theme: set data-theme attribute and clear inline dynamic styles
      document.documentElement.setAttribute('data-theme', theme);
      this.clearCustomStyles();
    }
  }

  setCustomColor(hex: string): void {
    this.customColor.set(hex);
    localStorage.setItem(this.CUSTOM_COLOR_KEY, hex);
    if (this.currentTheme() === 'custom') {
      this.applyCustomTheme(hex);
    }
  }

  private applyCustomTheme(hex: string): void {
    document.documentElement.setAttribute('data-theme', 'custom');
    
    const hoverColor = this.darkenColor(hex, 0.15);
    const rgb = this.hexToRgb(hex);
    const rgbStr = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '218, 38, 28';
    const encodedHex = hex.replace('#', '%23');
    
    // Set custom CSS variables directly on HTML element
    const style = document.documentElement.style;
    style.setProperty('--primary-color', hex);
    style.setProperty('--primary-hover', hoverColor);
    style.setProperty('--bs-primary-rgb', rgbStr);
    style.setProperty('--primary-gradient-start', hex);
    style.setProperty('--primary-gradient-end', hoverColor);
    
    // Tints
    style.setProperty('--primary-50', `rgba(${rgbStr}, 0.05)`);
    style.setProperty('--primary-100', `rgba(${rgbStr}, 0.1)`);
    style.setProperty('--primary-200', `rgba(${rgbStr}, 0.2)`);
    style.setProperty('--primary-300', `rgba(${rgbStr}, 0.45)`);
    
    // SVGs
    style.setProperty('--form-select-arrow', `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='${encodedHex}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`);
    style.setProperty('--accordion-button-arrow', `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='${encodedHex}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`);
  }

  private clearCustomStyles(): void {
    const style = document.documentElement.style;
    style.removeProperty('--primary-color');
    style.removeProperty('--primary-hover');
    style.removeProperty('--bs-primary-rgb');
    style.removeProperty('--primary-gradient-start');
    style.removeProperty('--primary-gradient-end');
    style.removeProperty('--primary-50');
    style.removeProperty('--primary-100');
    style.removeProperty('--primary-200');
    style.removeProperty('--primary-300');
    style.removeProperty('--form-select-arrow');
    style.removeProperty('--accordion-button-arrow');
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  private darkenColor(hex: string, percent: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    const r = Math.max(0, Math.floor(rgb.r * (1 - percent)));
    const g = Math.max(0, Math.floor(rgb.g * (1 - percent)));
    const b = Math.max(0, Math.floor(rgb.b * (1 - percent)));
    return this.rgbToHex(r, g, b);
  }

  getTheme(): ThemeType {
    return this.currentTheme();
  }
}
