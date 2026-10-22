import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParameterService } from '../../../services/parameter.service';
import { ToastService } from '../../../services/toast.service';
import { firstValueFrom } from 'rxjs';

export interface FormulaToken {
  type: 'param' | 'operator' | 'number' | 'paren' | 'function' | 'comma';
  value: string;      // {P12}, +, 6, (, ABS(, ,
  display: string;    // Carbon, +, 6, (, ABS, ,
  paramId?: number;
  paramName?: string;
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
    { display: '÷', value: '/' }
  ];

  parentheses = [
    { display: '(', value: '(' },
    { display: ')', value: ')' }
  ];

  functions = [
    { display: 'ABS', value: 'ABS(' },
    { display: 'ROUND', value: 'ROUND(' },
    { display: 'POW', value: 'POW(' },
    { display: 'MIN', value: 'MIN(' },
    { display: 'MAX', value: 'MAX(' },
    { display: 'MEAN', value: 'MEAN(' },
    { display: 'SUM', value: 'SUM(' },
    { display: 'IF', value: 'if(' }
  ];

  constructor(
    private parameterService: ParameterService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    if (this.visible) {
      this.loadParameters();
      this.parseInitialFormula();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.loadParameters();
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
      // Load all parameters for the given type to build the list
      const payload = {
        pageNumber: 1,
        pageSize: 1000,
        searchTerm: ''
      };

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
      p.name?.toLowerCase().includes(s) || p.displayText?.toLowerCase().includes(s)
    );
  }

  parseInitialFormula() {
    this.tokens = [];
    if (!this.currentFormula) return;
    
    // For now, if editing an existing formula, we'll just show it as a single generic block 
    // unless we write a full parser. A simple fallback is to add it as a single token.
    // In a full implementation, you would lex the string back into tokens.
    this.tokens.push({
      type: 'function',
      value: this.currentFormula,
      display: this.currentFormulaDisplay || this.currentFormula
    });
  }

  addParameterToken(param: any) {
    const id = param.id || param.value;
    const name = param.name || param.displayText;
    this.tokens.push({
      type: 'param',
      value: `{P${id}}`, 
      display: name,
      paramId: id,
      paramName: name
    });
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

    const rawTokens = input.match(/([a-zA-Z_][a-zA-Z0-9_ ]*[a-zA-Z0-9_]|[a-zA-Z_][a-zA-Z0-9_]*|[0-9]*\.?[0-9]+|[+\-*/(),])/g) || [];
    const operators = new Set(['+', '-', '*', '/', '(', ')', ',']);
    const constants: Record<string, string> = { 'pi': '3.14159265', 'PI': '3.14159265' };
    const functionNames = new Set(this.functions.map(f => f.display.toUpperCase()));

    for (const raw of rawTokens) {
      if (operators.has(raw)) { this.smartTokens.push({ token: raw, type: 'operator' }); continue; }
      if (/^[0-9]*\.?[0-9]+$/.test(raw)) { this.smartTokens.push({ token: raw, type: 'number' }); continue; }
      if (constants[raw]) { this.smartTokens.push({ token: raw, type: 'number', matched: `= ${constants[raw]}` }); continue; }
      if (functionNames.has(raw.toUpperCase())) { this.smartTokens.push({ token: raw.toUpperCase(), type: 'function' }); continue; }

      const exact = this.availableParameters.find((p: any) => (p.name || p.displayText).toLowerCase() === raw.toLowerCase());
      if (exact) { 
        this.smartTokens.push({ token: raw, type: 'param', matched: exact.name || exact.displayText, paramRef: `{P${exact.id || exact.value}}` }); 
        continue; 
      }

      const partial = this.availableParameters.find((p: any) => (p.name || p.displayText).toLowerCase().startsWith(raw.toLowerCase()));
      if (partial) {
        this.smartTokens.push({ token: raw, type: 'param', matched: `${partial.name || partial.displayText}?`, paramRef: `{P${partial.id || partial.value}}` });
        this.smartErrors.push(`"${raw}" → did you mean "${partial.name || partial.displayText}"?`);
        continue;
      }

      this.smartTokens.push({ token: raw, type: 'unknown' });
      this.smartErrors.push(`"${raw}" — no matching parameter or function`);
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

  async validate() {
    const expression = this.getFormulaString();
    if (!expression) {
      this.toastService.show('Formula is empty.', 'error');
      return;
    }

    this.isValidating = true;
    this.validationError = null;
    this.isValid = false;

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
