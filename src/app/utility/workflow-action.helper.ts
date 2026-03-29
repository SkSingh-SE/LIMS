/**
 * Global workflow action button config.
 * Maps action.action (Next/Cancel/Back) → icon + color + style.
 * Usage: import { getActionConfig } from '../../utility/workflow-action.helper';
 */

export interface ActionButtonConfig {
  icon: string;       // Bootstrap icon class (bi-*)
  btnClass: string;   // Bootstrap btn class
  textClass: string;  // Text color class for icon-only mode
}

const ACTION_CONFIG: Record<string, ActionButtonConfig> = {
  Next:   { icon: 'bi-check-circle-fill', btnClass: 'btn-success',   textClass: 'text-success' },
  Cancel: { icon: 'bi-x-circle-fill',     btnClass: 'btn-danger',    textClass: 'text-danger' },
  Back:   { icon: 'bi-arrow-left-circle',  btnClass: 'btn-secondary', textClass: 'text-secondary' },
};

const DEFAULT_CONFIG: ActionButtonConfig = {
  icon: 'bi-gear', btnClass: 'btn-outline-secondary', textClass: 'text-muted'
};

export function getActionConfig(action: string): ActionButtonConfig {
  return ACTION_CONFIG[action] ?? DEFAULT_CONFIG;
}
