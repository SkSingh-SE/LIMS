import { Component, EventEmitter, Input, OnInit, Output, OnChanges, Optional, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParameterService } from '../../../services/parameter.service';
import { DimensionalFactorService } from '../../../services/dimensional-factor.service';
import { ToastService } from '../../../services/toast.service';
import { firstValueFrom } from 'rxjs';

export interface FormulaToken {
  type: 'param' | 'operator' | 'number' | 'paren' | 'function' | 'comma';
  value: string;      // {P12}, W0, +, 6, (, ABS(, ,
  display: string;    // Carbon, W0, +, 6, (, ABS, ,
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
export class FormulaBuilderComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() parameterType: string = 'Chemical';
  @Input() currentFormula = '';
  @Input() currentFormulaDisplay = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() formulaSaved = new EventEmitter<{ formula: string; formulaDisplay: string }>();
  @Output() formulaCleared = new EventEmitter<void>();

  availableParameters: any[] = [];
  filteredParameters: any[] = [];
  searchTerm = '';
  
  tokens: FormulaToken[] = [];
  isValidating = false;
  validationError: string | null = null;
  isValid = false;
  customNumberInput: string = '';

  // Mode: 'click' or 'smart'
  currentMode: 'click' | 'smart' = 'click';
  smartFormulaInput: string = '';
  smartTokens: any[] = [];
  smartErrors: string[] = [];
  smartValid = false;

  // Operator sets
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
    { display: 'ABS', value: 'ABS(' },
    { display: 'ROUND', value: 'ROUND(' },
    { display: 'POW', value: 'POW(' },
    { display: 'SQRT', value: 'SQRT(' },
    { display: 'MIN', value: 'MIN(' },
    { display: 'MAX', value: 'MAX(' },
    { display: 'MEAN', value: 'MEAN(' },
    { display: 'SUM', value: 'SUM(' },
    { display: 'IF', value: 'if(' }
  ];

  constructor(
    private parameterService: ParameterService,
    private toastService: ToastService,
    @Optional() private dimensionalFactorService?: DimensionalFactorService
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.visible) {
      await this.loadParameters();
      this.parseInitialFormula();
    }
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['visible'] && this.visible) {
      await this.loadParameters();
      this.parseInitialFormula();
      this.validationError = null;
      this.isValid = false;
      this.currentMode = 'click';
      this.smartFormulaInput = this.getDisplayString();
      this.parseSmartInput();
    }
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(this.visible);
  }

  async loadParameters() {
    try {
      if (this.parameterType === 'Dimensional') {
        const standardTokens = [
          { id: 1, name: 'Original Width', code: 'W0', displayText: 'W0 (Width)' },
          { id: 2, name: 'Original Thickness', code: 'T0', displayText: 'T0 (Thickness)' },
          { id: 3, name: 'Original Diameter', code: 'D0', displayText: 'D0 (Diameter)' },
          { id: 4, name: 'Original Gauge Length', code: 'L0', displayText: 'L0 (Gauge Length)' },
          { id: 5, name: 'Outer Diameter', code: 'Do', displayText: 'Do (Outer Diameter)' },
          { id: 6, name: 'Inner Diameter', code: 'Di', displayText: 'Di (Inner Diameter)' },
          { id: 7, name: 'Constant PI (π)', code: 'PI', displayText: 'PI (π = 3.14159)' }
        ];

        let dbFactors: any[] = [];
        if (this.dimensionalFactorService) {
          try {
            const listRes = await firstValueFrom(this.dimensionalFactorService.getAllDimensionalFactors({
              PageNumber: 1,
              PageSize: 100
            }));
            dbFactors = (listRes?.items || []).filter((f: any) => f.factorType !== 'Calculated');
          } catch {
            dbFactors = [];
          }
        }

        const combined = [...standardTokens];
        dbFactors.forEach((db: any) => {
          const code = db.code || db.name;
          if (!combined.some(c => c.code.toLowerCase() === code.toLowerCase())) {
            combined.push({
              id: db.id,
              name: db.name,
              code: db.code || db.name,
              displayText: `${db.code ? db.code + ' - ' : ''}${db.name}`
            });
          }
        });

        this.availableParameters = combined;
        this.filteredParameters = [...this.availableParameters];
        return;
      }

      // Load all parameters for the given type to build the list
      let res;
      if (this.parameterType === 'Chemical') {
        res = await firstValueFrom(this.parameterService.getChemicalParameterDropdown('', 0, 1000));
      } else {
        res = await firstValueFrom(this.parameterService.getMechanicalParameterDropdown('', 0, 1000));
      }
      
      this.availableParameters = res || [];
      this.filteredParameters = [...this.availableParameters];
    } catch (error) {
      console.error(error);
      this.toastService.show('Failed to load parameters', 'error');
    }
  }

  filterParams() {
    const s = this.searchTerm.toLowerCase();
    this.filteredParameters = this.availableParameters.filter(p => 
      p.name?.toLowerCase().includes(s) || p.displayText?.toLowerCase().includes(s) || (p.code && p.code.toLowerCase().includes(s))
    );
  }

  parseInitialFormula() {
    this.tokens = [];
    if (!this.currentFormula || !this.currentFormula.trim()) return;

    if (this.parameterType === 'Dimensional') {
      const regex = /([0-9]*\.?[0-9]+|[a-zA-Z_][a-zA-Z0-9_]*\(|[a-zA-Z_][a-zA-Z0-9_]*|[+\-*/^(),])/g;
      const matches = this.currentFormula.match(regex);
      if (!matches || matches.length === 0) {
        this.tokens.push({
          type: 'param',
          value: this.currentFormula,
          display: this.currentFormula
        });
        return;
      }

      const operators = new Set(['+', '-', '*', '/', '^']);
      const parens = new Set(['(', ')']);

      for (const m of matches) {
        if (/^[0-9]*\.?[0-9]+$/.test(m)) {
          this.tokens.push({ type: 'number', value: m, display: m });
        } else if (operators.has(m)) {
          this.tokens.push({ type: 'operator', value: m, display: m });
        } else if (parens.has(m)) {
          this.tokens.push({ type: 'paren', value: m, display: m });
        } else if (m === ',') {
          this.tokens.push({ type: 'comma', value: ',', display: ',' });
        } else if (m.endsWith('(')) {
          this.tokens.push({ type: 'function', value: m, display: m.slice(0, -1).toUpperCase() });
        } else {
          const param = this.availableParameters.find(p => (p.code || p.name || '').toLowerCase() === m.toLowerCase());
          const displayLabel = param?.code || m;
          this.tokens.push({
            type: 'param',
            value: m,
            display: displayLabel,
            paramName: param?.name || m,
            paramCode: m
          });
        }
      }
      return;
    }

    // Tokenize currentFormula into tokens: {P123}, numbers, operators, parens, functions
    const regex = /(\{P\d+\}|P\d+|[0-9]*\.?[0-9]+|[a-zA-Z_][a-zA-Z0-9_]*\(|[+\-*/(),])/g;
    const matches = this.currentFormula.match(regex);
    if (!matches || matches.length === 0) {
      this.tokens.push({
        type: 'function',
        value: this.currentFormula,
        display: this.currentFormulaDisplay || this.currentFormula
      });
      return;
    }

    const operators = new Set(['+', '-', '*', '/']);
    const parens = new Set(['(', ')']);

    for (const m of matches) {
      const pMatch = m.match(/^\{?P(\d+)\}?$/i);
      if (pMatch) {
        const id = Number(pMatch[1]);
        const param = this.availableParameters.find(p => (p.id === id || p.value === id));
        const name = param ? (param.name || param.displayText) : `Param #${id}`;
        this.tokens.push({
          type: 'param',
          value: `{P${id}}`,
          display: name,
          paramId: id,
          paramName: name
        });
        continue;
      }

      if (/^[0-9]*\.?[0-9]+$/.test(m)) {
        this.tokens.push({ type: 'number', value: m, display: m });
        continue;
      }

      if (operators.has(m)) {
        this.tokens.push({ type: 'operator', value: m, display: m });
        continue;
      }

      if (parens.has(m)) {
        this.tokens.push({ type: 'paren', value: m, display: m });
        continue;
      }

      if (m === ',') {
        this.tokens.push({ type: 'comma', value: ',', display: ',' });
        continue;
      }

      if (m.endsWith('(')) {
        const fnName = m.slice(0, -1).toUpperCase();
        this.tokens.push({ type: 'function', value: m, display: fnName });
        continue;
      }

      this.tokens.push({ type: 'function', value: m, display: m });
    }
  }

  addParameterToken(param: any) {
    if (this.parameterType === 'Dimensional') {
      const code = param.code || param.name;
      this.tokens.push({
        type: 'param',
        value: code,
        display: code,
        paramName: param.name,
        paramCode: code
      });
    } else {
      const id = param.id || param.value;
      const name = param.name || param.displayText;
      this.tokens.push({
        type: 'param',
        value: `{P${id}}`, 
        display: name,
        paramId: id,
        paramName: name
      });
    }
    this.isValid = false;
    this.syncSmartInput();
  }

  addOperatorToken(op: any, type: 'operator' | 'paren' | 'function') {
    this.tokens.push({
      type: type,
      value: op.value,
      display: op.display
    });
    this.isValid = false;
    this.syncSmartInput();
  }

  addCommaToken() {
    this.tokens.push({
      type: 'comma',
      value: ',',
      display: ','
    });
    this.isValid = false;
    this.syncSmartInput();
  }

  addCustomNumber() {
    if (!this.customNumberInput) return;
    
    this.tokens.push({
      type: 'number',
      value: this.customNumberInput,
      display: this.customNumberInput
    });
    this.customNumberInput = '';
    this.isValid = false;
    this.syncSmartInput();
  }

  removeToken(index: number) {
    this.tokens.splice(index, 1);
    this.isValid = false;
    this.syncSmartInput();
  }

  clearTokens() {
    this.tokens = [];
    this.isValid = false;
    this.validationError = null;
    this.syncSmartInput();
  }

  getFormulaString(): string {
    return this.tokens.map(t => t.value).join('');
  }

  getDisplayString(): string {
    return this.tokens.map(t => t.display).join(' ');
  }

  syncSmartInput() {
    this.smartFormulaInput = this.getDisplayString();
    this.parseSmartInput();
  }

  // ── Smart Formula Mode ──
  setMode(mode: 'click' | 'smart') {
    this.currentMode = mode;
    if (mode === 'smart') {
      this.smartFormulaInput = this.getDisplayString();
      this.parseSmartInput();
    }
  }

  parseSmartInput(): void {
    const input = this.smartFormulaInput.trim();
    this.smartTokens = [];
    this.smartErrors = [];
    this.smartValid = false;
    if (!input) return;

    const rawTokens = input.match(/([a-zA-Z_][a-zA-Z0-9_ ]*[a-zA-Z0-9_]|[a-zA-Z_][a-zA-Z0-9_]*|[0-9]*\.?[0-9]+|[+\-*/^(),])/g) || [];
    const operators = new Set(['+', '-', '*', '/', '^', '(', ')', ',']);
    const constants: Record<string, string> = { 'pi': '3.14159265', 'PI': '3.14159265' };
    const functionNames = new Set(this.functions.map(f => f.display.toUpperCase()));

    for (const raw of rawTokens) {
      if (operators.has(raw)) { this.smartTokens.push({ token: raw, type: 'operator' }); continue; }
      if (/^[0-9]*\.?[0-9]+$/.test(raw)) { this.smartTokens.push({ token: raw, type: 'number' }); continue; }
      if (constants[raw]) { this.smartTokens.push({ token: raw, type: 'number', matched: `= ${constants[raw]}` }); continue; }
      if (functionNames.has(raw.toUpperCase())) { this.smartTokens.push({ token: raw.toUpperCase(), type: 'function' }); continue; }

      const exact = this.availableParameters.find((p: any) => (p.code || p.name || p.displayText || '').toLowerCase() === raw.toLowerCase());
      if (exact) { 
        const ref = this.parameterType === 'Dimensional' ? (exact.code || exact.name) : `{P${exact.id || exact.value}}`;
        this.smartTokens.push({ token: raw, type: 'param', matched: exact.code || exact.name || exact.displayText, paramRef: ref }); 
        continue; 
      }

      if (this.parameterType === 'Dimensional' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw)) {
        this.smartTokens.push({ token: raw, type: 'param', matched: raw, paramRef: raw });
        continue;
      }

      const partial = this.availableParameters.find((p: any) => (p.name || p.displayText || '').toLowerCase().startsWith(raw.toLowerCase()));
      if (partial) {
        const ref = this.parameterType === 'Dimensional' ? (partial.code || partial.name) : `{P${partial.id || partial.value}}`;
        this.smartTokens.push({ token: raw, type: 'param', matched: `${partial.code || partial.name || partial.displayText}?`, paramRef: ref });
        this.smartErrors.push(`"${raw}" → did you mean "${partial.code || partial.name || partial.displayText}"?`);
        continue;
      }

      this.smartTokens.push({ token: raw, type: 'unknown' });
      this.smartErrors.push(`"${raw}" — no matching factor, parameter, or function`);
    }

    let depth = 0;
    for (const t of this.smartTokens) {
      if (t.token === '(') depth++;
      if (t.token === ')') depth--;
      if (depth < 0) { this.smartErrors.push('Unmatched ")"'); break; }
    }
    if (depth > 0) this.smartErrors.push(`${depth} unclosed bracket(s)`);

    this.smartValid = this.smartErrors.length === 0 && this.smartTokens.length > 0;
  }

  applySmartFormula(): void {
    if (!this.smartValid) return;
    const constants: Record<string, string> = { 'pi': '3.14159265', 'PI': '3.14159265' };
    this.tokens = [];
    for (const t of this.smartTokens) {
      if (t.type === 'param' && t.paramRef) {
        this.tokens.push({ type: 'param', value: t.paramRef, display: t.matched || t.token });
      } else if (t.type === 'number') {
        const val = constants[t.token] || t.token;
        this.tokens.push({ type: 'number', value: val, display: val });
      } else if (t.type === 'operator') {
        this.tokens.push({ type: t.token === '(' || t.token === ')' ? 'paren' : (t.token === ',' ? 'comma' : 'operator'), value: t.token, display: t.token });
      } else if (t.type === 'function') {
        this.tokens.push({ type: 'function', value: t.token + '(', display: t.token });
      }
    }
    this.isValid = false;
    this.currentMode = 'click';
    this.validate();
  }

  insertSmartParam(name: string): void {
    this.smartFormulaInput = (this.smartFormulaInput + ' ' + name).trim();
    this.parseSmartInput();
  }

  validateMathematicalExpression(cleanExpr: string): { isValid: boolean; error?: string; simulatedResult?: number } {
    if (!cleanExpr || !cleanExpr.trim()) {
      return { isValid: false, error: 'Formula expression is empty' };
    }
    const expr = cleanExpr.trim();

    let depth = 0;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') {
        depth--;
        if (depth < 0) return { isValid: false, error: 'Unmatched closing parenthesis ")"' };
      }
    }
    if (depth > 0) return { isValid: false, error: `${depth} unclosed opening parenthesis "("\'` };

    if (/[+\-*/]{2,}/.test(expr)) {
      return { isValid: false, error: 'Invalid operator sequence' };
    }

    if (/[+\-*/^]\s*$/.test(expr)) {
      return { isValid: false, error: 'Formula cannot end with an operator' };
    }

    const mathKeywords = new Set([
      'PI', 'pi', 'Pi', 'E', 'e', 'SQRT', 'sqrt', 'POW', 'pow', 'ABS', 'abs',
      'ROUND', 'round', 'SIN', 'sin', 'COS', 'cos', 'TAN', 'tan', 'LOG', 'log',
      'MIN', 'min', 'MAX', 'max', 'MEAN', 'mean', 'SUM', 'sum', 'IF', 'if'
    ]);
    const words = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const vars = Array.from(new Set(words.filter(w => !mathKeywords.has(w))));

    try {
      let evalStr = expr
        .replace(/\bPI\b/gi, 'Math.PI')
        .replace(/\bSQRT\b/gi, 'Math.sqrt')
        .replace(/\bPOW\b/gi, 'Math.pow')
        .replace(/\bABS\b/gi, 'Math.abs')
        .replace(/\bROUND\b/gi, 'Math.round')
        .replace(/\bMIN\b/gi, 'Math.min')
        .replace(/\bMAX\b/gi, 'Math.max');

      evalStr = evalStr.replace(/([a-zA-Z0-9_.]+)\s*\^\s*([0-9.]+)/g, 'Math.pow($1, $2)');

      vars.forEach((v, idx) => {
        const val = idx === 0 ? 10 : idx === 1 ? 5 : 2;
        const reg = new RegExp(`\\b${v}\\b`, 'g');
        evalStr = evalStr.replace(reg, String(val));
      });

      if (!/^[0-9\s+\-*/().,MathPIsqrtpowabsroundminmax]+$/.test(evalStr)) {
        return { isValid: false, error: 'Formula contains unsupported tokens or invalid characters' };
      }

      const res = new Function(`return (${evalStr});`)();
      if (typeof res !== 'number' || isNaN(res) || !isFinite(res)) {
        return { isValid: false, error: 'Formula does not resolve to a valid finite number' };
      }

      return {
        isValid: true,
        simulatedResult: Math.round(res * 100) / 100
      };
    } catch (err: any) {
      return { isValid: false, error: `Syntax error: ${err.message || 'Invalid formula'}` };
    }
  }

  async validate() {
    const expression = this.getFormulaString();
    if (!expression) {
      this.toastService.show('Formula is empty.', 'error');
      return;
    }

    this.isValidating = true;
    this.validationError = null;
    this.isValid = false;

    if (this.parameterType === 'Dimensional') {
      const status = this.validateMathematicalExpression(expression);
      this.isValidating = false;
      if (status.isValid) {
        this.isValid = true;
        this.toastService.show(`Formula is valid! (Dry-run: ${status.simulatedResult})`, 'success');
      } else {
        this.validationError = status.error || 'Validation failed';
      }
      return;
    }

    try {
      const res = await firstValueFrom(this.parameterService.validateFormula(expression));
      if (res && res.isValid) {
        this.isValid = true;
        this.toastService.show('Formula is valid!', 'success');
      } else {
        this.validationError = res?.error || 'Validation failed';
      }
    } catch (error: any) {
      this.validationError = error.error?.error || 'Error connecting to server for validation';
    } finally {
      this.isValidating = false;
    }
  }

  save() {
    if (this.tokens.length === 0) {
      this.formulaCleared.emit();
      this.close();
      return;
    }

    if (!this.isValid) {
      this.toastService.show('Please validate the formula first before saving.', 'error');
      return;
    }

    const formula = this.getFormulaString();
    const formulaDisplay = this.getDisplayString();

    this.formulaSaved.emit({ formula, formulaDisplay });
    this.close();
  }
}
