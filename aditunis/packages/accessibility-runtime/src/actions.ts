import type { SemanticAction } from '@aditunis/contracts';

export interface AccessibilityActivation {
  action: SemanticAction;
}

export function mapActivationToAction(
  activation: AccessibilityActivation,
): SemanticAction {
  return activation.action;
}
