import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { firstValueFrom } from 'rxjs';

export interface FormulaToken {
  type: 'param' | 'operator' | 'number' | 'paren' | 'function' | 'comma';
  value: string;      // {MOULD_VOLUME}, +, 6, (, ABS(, ,
  display: string;    // Mould Volume, +, 6, (, ABS, ,
  paramId?: number;
  paramName?: string;
  paramCode?: string;
}

@Component({
  selector: 'app-formula-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formula-builder.component.html',
  styleUrls: ['./formula-builder.component.css']
})
export class FormulaBuilderComponent implements OnInit, OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() parameterType: string = 'Universal';
  @Input() currentFormula = '';
  @Input() currentFormulaDisplay = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() formulaSaved = new EventEmitter<{ formula: string; formulaDisplay: string }>();
  @Output() formulaCleared = new EventEmitter<void>();

  @ViewChild('smartTextarea') smartTextarea?: ElementRef<HTMLTextAreaElement>;

  availableParameters: any[] = [];
  filteredParameters: any[] = [];
  filteredSmartParameters: any[] = [];
  
  searchTerm = '';
  smartSearchTerm = '';
  
  // Interactive Builder Tokens
  tokens: FormulaToken[] = [];
  isValidating = false;
  validationError: string | null = null;
  validationSuccess: string | null = null;
  isValid = false;
  customNumberInput: string = '';

  // Mode: 'smart' (default modern) or 'click' (interactive chips)
  currentMode: 'smart' | 'click' = 'smart';
  smartFormulaInput: string = '';
  resolvedFormulaPreview: string = '';
  smartTokens: any[] = [];
  smartValidationError: string | null = null;
  smartValidationSuccess: string | null = null;
  isSmartValid = false;

  // Basic Operators & Parentheses
  basicOperators = [
    { display: '+', value: '+' },
    { display: '-', value: '-' },
    { display: '×', value: '*' },
    { display: '÷', value: '/' },
    { display: '^', value: '^' }
  ];

  parentheses = [
    { display: '(', value: '(' },
    { display: ')', value: ')' }
  ];

  functions = [
    { display: 'ROUND', value: 'ROUND(' },
    { display: 'ABS', value: 'ABS(' },
    { display: 'POW', value: 'POW(' },
    { display: 'SQRT', value: 'SQRT(' },
    { display: 'MIN', value: 'MIN(' },
    { display: 'MAX', value: 'MAX(' },
    { display: 'MEAN', value: 'MEAN(' },
    { display: 'SUM', value: 'SUM(' },
    { display: 'IF', value: 'if(' }
  ];

  quickSmartOperators = ['+', '-', '*', '/', '^', '(', ')', ','];
  quickSmartFunctions = ['ROUND', 'ABS', 'POW', 'SQRT', 'MIN', 'MAX', 'MEAN', 'SUM', 'IF'];

  /**
   * Capture-phase focus trap disabler to prevent parent Bootstrap modal focusin
   * handler from stealing focus away from child inputs/textareas.
   */
  private focusTrapDisabler = (event: FocusEvent) => {
    if (this.visible && this.elementRef.nativeElement.contains(event.target as Node)) {
      event.stopImmediatePropagation();
    }
  };

  constructor(
    private parameterService: ParameterService,
    private toastService: ToastService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    window.addEventListener('focusin', this.focusTrapDisabler, true);
    window.addEventListener('focus', this.focusTrapDisabler, true);
    if (this.visible) {
      this.initModalData();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('focusin', this.focusTrapDisabler, true);
    window.removeEventListener('focus', this.focusTrapDisabler, true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initModalData();
    }
  }

  private async initModalData() {
    this.validationError = null;
    this.validationSuccess = null;
    this.isValid = false;
    this.smartValidationError = null;
    this.smartValidationSuccess = null;
    this.isSmartValid = false;
    this.searchTerm = '';
    this.smartSearchTerm = '';
    
    await this.loadParameters();
    this.setupInitialFormula();

    // Auto-focus textarea in next tick
    setTimeout(() => {
      this.smartTextarea?.nativeElement?.focus();
    }, 100);
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }

  async loadParameters() {
    try {
      let res: any[];
      if (this.parameterType === 'Chemical') {
        res = await firstValueFrom(this.parameterService.getChemicalParameterDropdown('', 0, 1500));
      } else if (this.parameterType === 'Mechanical') {
        res = await firstValueFrom(this.parameterService.getMechanicalParameterDropdown('', 0, 1500));
      } else {
        res = await firstValueFrom(this.parameterService.getParameterDropdown('', 0, 2500));
      }
      
      this.availableParameters = res || [];
      this.filterParams();
      this.filterSmartParams();
    } catch (error) {
      console.error('Failed to load parameters for formula builder', error);
      this.toastService.show('Failed to load parameters list', 'error');
    }
  }

  getParamName(param: any): string {
    if (!param) return '';
    return (param.additionalValues?.PureName || param.name || param.displayText || `Param ${param.id || param.value || ''}`).trim();
  }

  getParamCode(param: any): string {
    if (!param) return '';
    return (param.additionalValues?.Code || param.code || '').trim();
  }

  getParameterToken(param: any): string {
    if (!param) return '';
    const code = this.getParamCode(param);
    if (code) return `{${code}}`;
    const id = param.id || param.value;
    if (id) return `{P${id}}`;
    const name = this.getParamName(param);
    return `{${name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()}}`;
  }

  filterParams() {
    const s = (this.searchTerm || '').trim().toLowerCase();
    if (!s) {
      this.filteredParameters = [...this.availableParameters];
      return;
    }
    this.filteredParameters = this.availableParameters.filter(p => {
      const name = this.getParamName(p).toLowerCase();
      const code = this.getParamCode(p).toLowerCase();
      const symbol = (p.additionalValues?.Symbol || p.symbol || '').toLowerCase();
      return name.includes(s) || code.includes(s) || symbol.includes(s);
    });
  }

  filterSmartParams() {
    const s = (this.smartSearchTerm || '').trim().toLowerCase();
    if (!s) {
      this.filteredSmartParameters = [...this.availableParameters];
      return;
    }
    this.filteredSmartParameters = this.availableParameters.filter(p => {
      const name = this.getParamName(p).toLowerCase();
      const code = this.getParamCode(p).toLowerCase();
      const symbol = (p.additionalValues?.Symbol || p.symbol || '').toLowerCase();
      return name.includes(s) || code.includes(s) || symbol.includes(s);
    });
  }

  setupInitialFormula() {
    const formula = this.currentFormula?.trim() || '';
    this.smartFormulaInput = formula;
    this.parseSmartInput();

    // Setup interactive tokens
    this.tokens = [];
    if (formula) {
      this.tokens.push({
        type: 'function',
        value: formula,
        display: this.currentFormulaDisplay || formula
      });
    }
  }

  setMode(mode: 'smart' | 'click') {
    this.currentMode = mode;
    if (mode === 'smart') {
      if (this.tokens.length > 0) {
        const formulaStr = this.getFormulaString();
        if (formulaStr) {
          this.smartFormulaInput = formulaStr;
        }
      }
      this.parseSmartInput();
      setTimeout(() => {
        this.smartTextarea?.nativeElement?.focus();
      }, 50);
    } else {
      if (this.smartFormulaInput) {
        this.tokens = [{
          type: 'function',
          value: this.resolveFormulaExpression(this.smartFormulaInput),
          display: this.smartFormulaInput
        }];
      }
    }
  }

  // ══════════════════════════════════════════════════════
  // Interactive Mode Methods
  // ══════════════════════════════════════════════════════

  addParameterToken(param: any) {
    const tokenVal = this.getParameterToken(param);
    const name = this.getParamName(param);
    const id = param.id || param.value;
    const code = this.getParamCode(param);

    this.tokens.push({
      type: 'param',
      value: tokenVal,
      display: name,
      paramId: id,
      paramName: name,
      paramCode: code
    });

    this.isValid = false;
    this.validationError = null;
    this.validationSuccess = null;
  }

  addOperatorToken(op: any, type: 'operator' | 'paren' | 'function') {
    this.tokens.push({
      type: type,
      value: op.value,
      display: op.display
    });
    this.isValid = false;
    this.validationError = null;
    this.validationSuccess = null;
  }

  addCommaToken() {
    this.tokens.push({
      type: 'comma',
      value: ',',
      display: ','
    });
    this.isValid = false;
    this.validationError = null;
    this.validationSuccess = null;
  }

  addCustomNumber() {
    const val = (this.customNumberInput || '').toString().trim();
    if (!val) return;
    
    this.tokens.push({
      type: 'number',
      value: val,
      display: val
    });
    this.customNumberInput = '';
    this.isValid = false;
    this.validationError = null;
    this.validationSuccess = null;
  }

  removeToken(index: number) {
    this.tokens.splice(index, 1);
    this.isValid = false;
    this.validationError = null;
    this.validationSuccess = null;
  }

  clearTokens() {
    this.tokens = [];
    this.isValid = false;
    this.validationError = null;
    this.validationSuccess = null;
  }

  getFormulaString(): string {
    return this.tokens.map(t => t.value).join('');
  }

  getDisplayString(): string {
    return this.tokens.map(t => t.display).join(' ');
  }

  async validateInteractiveFormula(): Promise<boolean> {
    const expression = this.getFormulaString();
    if (!expression) {
      this.validationError = 'Formula is empty.';
      this.isValid = false;
      return false;
    }

    this.isValidating = true;
    this.validationError = null;
    this.validationSuccess = null;
    this.isValid = false;

    try {
      const res = await firstValueFrom(this.parameterService.validateFormula(expression));
      if (res && res.isValid) {
        this.isValid = true;
        this.validationSuccess = 'Formula syntax is valid and all parameter tokens are resolved!';
        this.toastService.show('Formula is valid!', 'success');
        return true;
      } else {
        this.isValid = false;
        this.validationError = res?.error || 'Validation failed.';
        return false;
      }
    } catch (error: any) {
      this.isValid = false;
      this.validationError = error.error?.message || error.error?.error || 'Validation request error.';
      return false;
    } finally {
      this.isValidating = false;
    }
  }

  async saveInteractiveFormula() {
    if (this.tokens.length === 0) {
      this.formulaCleared.emit();
      this.close();
      return;
    }

    if (!this.isValid) {
      const ok = await this.validateInteractiveFormula();
      if (!ok) return;
    }

    const formula = this.getFormulaString();
    const formulaDisplay = this.getDisplayString();

    this.formulaSaved.emit({ formula, formulaDisplay });
    this.close();
  }

  // ══════════════════════════════════════════════════════
  // Smart Mode Methods
  // ══════════════════════════════════════════════════════

  onSmartInput(): void {
    this.parseSmartInput();
  }

  parseSmartInput(): void {
    const input = (this.smartFormulaInput || '').trim();
    this.smartTokens = [];
    this.smartValidationError = null;
    this.smartValidationSuccess = null;
    this.isSmartValid = false;

    if (!input) {
      this.resolvedFormulaPreview = '';
      return;
    }

    this.resolvedFormulaPreview = this.resolveFormulaExpression(input);

    // Parse tokens for visual feedback
    const tokenRegex = /\{[^{}]+\}|[0-9]*\.?[0-9]+|[+\-*/^(),]|ROUND|ABS|POW|SQRT|MIN|MAX|MEAN|SUM|IF|[a-zA-Z_][a-zA-Z0-9_]*/gi;
    const matches = this.resolvedFormulaPreview.match(tokenRegex) || [];
    
    const opSet = new Set(['+', '-', '*', '/', '^', '(', ')', ',']);
    const fnSet = new Set(['ROUND', 'ABS', 'POW', 'SQRT', 'MIN', 'MAX', 'MEAN', 'SUM', 'IF']);

    for (const m of matches) {
      if (m.startsWith('{') && m.endsWith('}')) {
        const code = m.slice(1, -1);
        const matchedParam = this.availableParameters.find(p => 
          this.getParamCode(p).toUpperCase() === code.toUpperCase() ||
          this.getParameterToken(p).toUpperCase() === m.toUpperCase() ||
          this.getParamName(p).toUpperCase() === code.toUpperCase()
        );
        this.smartTokens.push({
          token: m,
          type: 'param',
          name: matchedParam ? this.getParamName(matchedParam) : code
        });
      } else if (opSet.has(m)) {
        this.smartTokens.push({ token: m, type: 'operator' });
      } else if (/^[0-9]*\.?[0-9]+$/.test(m)) {
        this.smartTokens.push({ token: m, type: 'number' });
      } else if (fnSet.has(m.toUpperCase())) {
        this.smartTokens.push({ token: m.toUpperCase(), type: 'function' });
      } else {
        this.smartTokens.push({ token: m, type: 'text' });
      }
    }

    // Check parenthesis balance
    let depth = 0;
    for (const ch of input) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (depth < 0) {
        this.smartValidationError = 'Unmatched closing parenthesis ")" in formula.';
        return;
      }
    }
    if (depth > 0) {
      this.smartValidationError = `${depth} unclosed parenthesis "(" in formula.`;
      return;
    }
  }

  insertTextAtCursor(text: string): void {
    const textarea = this.smartTextarea?.nativeElement;
    const current = this.smartFormulaInput || '';

    if (!textarea) {
      this.smartFormulaInput = (current + ' ' + text).trim();
      this.parseSmartInput();
      return;
    }

    const start = textarea.selectionStart ?? current.length;
    const end = textarea.selectionEnd ?? current.length;

    const before = current.substring(0, start);
    const after = current.substring(end);

    const needsSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('(') && !text.startsWith(')') && !text.startsWith(',');
    const needsSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith(')') && !after.startsWith(',') && !text.endsWith('(');

    const insertion = (needsSpaceBefore ? ' ' : '') + text + (needsSpaceAfter ? ' ' : '');
    this.smartFormulaInput = before + insertion + after;

    this.parseSmartInput();

    setTimeout(() => {
      textarea.focus();
      const newPos = start + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }

  insertSmartParam(param: any): void {
    const token = this.getParameterToken(param);
    this.insertTextAtCursor(token);
  }

  insertSmartFunction(fnName: string): void {
    this.insertTextAtCursor(`${fnName}(`);
  }

  resolveFormulaExpression(input: string): string {
    if (!input) return '';
    let resolved = input.trim();

    // 1. Temporarily protect already enclosed tokens: {TOKEN}
    const protectedTokens: string[] = [];
    resolved = resolved.replace(/\{[^{}]+\}/g, (match) => {
      protectedTokens.push(match);
      return `__PROT_TOKEN_${protectedTokens.length - 1}__`;
    });

    // 2. Convert legacy P12 references: e.g. \bP\d+\b
    resolved = resolved.replace(/\bP(\d+)\b/gi, '{P$1}');

    // 3. Sort available parameters by name length descending so multi-word names match first
    const sortedParams = [...this.availableParameters].sort((a, b) => {
      const nameA = this.getParamName(a).length;
      const nameB = this.getParamName(b).length;
      return nameB - nameA;
    });

    // 4. Replace parameter names and codes if not already enclosed
    for (const param of sortedParams) {
      const code = this.getParamCode(param);
      const name = this.getParamName(param);
      const token = this.getParameterToken(param);

      if (code) {
        const codeRegex = new RegExp(`\\b${this.escapeRegex(code)}\\b`, 'gi');
        resolved = resolved.replace(codeRegex, token);
      }
      if (name && name.length > 2) {
        const nameRegex = new RegExp(`\\b${this.escapeRegex(name)}\\b`, 'gi');
        resolved = resolved.replace(nameRegex, token);
      }
    }

    // 5. Restore protected tokens
    resolved = resolved.replace(/__PROT_TOKEN_(\d+)__/g, (_, idx) => {
      return protectedTokens[parseInt(idx, 10)] || '';
    });

    return resolved;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async validateSmartFormula(): Promise<boolean> {
    const input = (this.smartFormulaInput || '').trim();
    if (!input) {
      this.smartValidationError = 'Formula cannot be empty.';
      this.isSmartValid = false;
      return false;
    }

    const resolved = this.resolveFormulaExpression(input);
    this.isValidating = true;
    this.smartValidationError = null;
    this.smartValidationSuccess = null;
    this.isSmartValid = false;

    try {
      const res = await firstValueFrom(this.parameterService.validateFormula(resolved));
      if (res && res.isValid) {
        this.isSmartValid = true;
        this.smartValidationSuccess = 'Formula syntax is valid and all parameters are verified!';
        this.toastService.show('Formula is valid!', 'success');
        return true;
      } else {
        this.isSmartValid = false;
        this.smartValidationError = res?.error || 'Formula validation failed.';
        return false;
      }
    } catch (error: any) {
      this.isSmartValid = false;
      this.smartValidationError = error?.error?.message || error?.error?.error || 'Error validating formula with server.';
      return false;
    } finally {
      this.isValidating = false;
    }
  }

  async applySmartFormula(): Promise<void> {
    const input = (this.smartFormulaInput || '').trim();
    if (!input) {
      this.formulaCleared.emit();
      this.close();
      return;
    }

    if (!this.isSmartValid) {
      const isValid = await this.validateSmartFormula();
      if (!isValid) return;
    }

    const formula = this.resolveFormulaExpression(input);
    const formulaDisplay = input;

    this.formulaSaved.emit({ formula, formulaDisplay });
    this.close();
  }

  clearSmartFormula(): void {
    this.smartFormulaInput = '';
    this.parseSmartInput();
  }
}
