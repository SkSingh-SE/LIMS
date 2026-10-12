import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a formula expression for human-friendly UI display.
 * Replaces tokenized parameter references like {P123} or P123 with parameter names.
 * Never shows {P...} or P... in the UI screen.
 *
 * @param formula Raw formula string (e.g. "({P240} * 1000) / {P237}")
 * @param paramLookup Optional lookup map (ID -> Name, P{ID} -> Name) or array of parameters
 */
export function formatFormulaDisplay(
  formula: string | null | undefined,
  paramLookup?: any[] | Record<string | number, string> | null,
  fallbackMap?: Record<string | number, string> | null
): string {
  if (!formula || typeof formula !== 'string') return '';
  let str = formula.trim();
  if (!str) return '';

  // Check if formula contains {P...} or P... tokens
  const hasPTokens = /\{?P\d+\}?/i.test(str);

  // Strip redundant outer UI wrapper braces e.g. "{ ({P240} * 1000) / {P237} }"
  if (str.startsWith('{') && str.endsWith('}')) {
    const inner = str.slice(1, -1).trim();
    if (inner.startsWith('(') || inner.startsWith('{P') || hasPTokens) {
      str = inner;
    }
  }

  if (!hasPTokens) {
    return str;
  }

  // Build lookup dictionary from paramLookup and fallbackMap
  const dict: Record<string, string> = {};

  const registerEntry = (id: any, name: any) => {
    if (id != null && name != null) {
      const cleanName = String(name).trim();
      const idStr = String(id).trim();
      dict[idStr] = cleanName;
      dict[`P${idStr}`.toUpperCase()] = cleanName;
      const numOnly = idStr.replace(/^P/i, '');
      if (numOnly) {
        dict[numOnly] = cleanName;
        dict[`P${numOnly}`.toUpperCase()] = cleanName;
      }
    }
  };

  const processSource = (src: any) => {
    if (!src) return;
    if (Array.isArray(src)) {
      src.forEach(item => {
        if (!item) return;
        if (typeof item === 'object') {
          const id = item.parameterID ?? item.id ?? item.value;
          const name = item.parameterName ?? item.name ?? item.displayText;
          if (id != null && name != null) {
            registerEntry(id, name);
          } else {
            // It could be a map object inside array (e.g. globalParamMap)
            Object.keys(item).forEach(k => {
              registerEntry(k, item[k]);
            });
          }
        }
      });
    } else if (typeof src === 'object') {
      Object.keys(src).forEach(k => {
        registerEntry(k, src[k]);
      });
    }
  };

  processSource(fallbackMap);
  processSource(paramLookup);

  // Replace {P123} tokens with readable parameter name
  str = str.replace(/\{P(\d+)\}/gi, (match, id) => {
    const key = `P${id}`.toUpperCase();
    if (dict[key]) return dict[key];
    if (dict[id]) return dict[id];
    return `Parameter ${id}`;
  });

  // Replace standalone P123 tokens (with word boundaries)
  str = str.replace(/\bP(\d+)\b/gi, (match, id) => {
    const key = `P${id}`.toUpperCase();
    if (dict[key]) return dict[key];
    if (dict[id]) return dict[id];
    return `Parameter ${id}`;
  });

  // Also clean any double spacing
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Converts a human-readable formula using parameter names (e.g. "(Yield Load * 1000) / Cross Section Area")
 * into internal token format (e.g. "({P240} * 1000) / {P237}") for calculation & database storage.
 */
export function convertNamesToFormulaTokens(
  displayFormula: string | null | undefined,
  availableParams: Array<{ parameterID?: number; id?: number; value?: number; parameterName?: string; name?: string; displayText?: string }>
): string {
  if (!displayFormula || !displayFormula.trim()) return '';
  let str = displayFormula.trim();

  // Collect parameter entries including stripped variations (e.g. without "- (Reported)")
  const entries: Array<{ id: number; name: string }> = [];
  (availableParams || []).forEach(p => {
    const id = p.parameterID ?? p.id ?? p.value;
    const name = (p.parameterName ?? p.name ?? p.displayText ?? '').trim();
    if (id != null && name.length > 0) {
      entries.push({ id: Number(id), name });
      const stripped = name.replace(/\s*-\s*\((Reported|Chemical|Observed)\)/gi, '').trim();
      if (stripped && stripped !== name) {
        entries.push({ id: Number(id), name: stripped });
      }
    }
  });

  // Sort by name length descending so longest matches take precedence
  entries.sort((a, b) => b.name.length - a.name.length);

  for (const entry of entries) {
    const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startsWithWord = /^\w/.test(entry.name);
    const prefix = startsWithWord ? '(?<=^|[^a-zA-Z0-9_])' : '';
    const suffix = '(?=[^a-zA-Z0-9_]|$)';
    const regex = new RegExp(`\\{${escaped}\\}|\\[${escaped}\\]|${prefix}${escaped}${suffix}`, 'gi');
    str = str.replace(regex, `{P${entry.id}}`);
  }

  return str;
}

@Pipe({
  name: 'formulaDisplay',
  standalone: true
})
export class FormulaDisplayPipe implements PipeTransform {
  transform(formula: string | null | undefined, paramLookup?: any): string {
    return formatFormulaDisplay(formula, paramLookup);
  }
}
