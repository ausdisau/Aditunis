import type {
  CommunicationProfile,
  CommunicationSource,
  SemanticAction,
} from '@aditunis/contracts';

export interface ConfirmationInput {
  action: SemanticAction;
  confidence: number | null;
  source: CommunicationSource;
}

const CONSEQUENTIAL_ACTIONS = new Set<SemanticAction>([
  'END_CALL',
  'SEND_DTMF_SENSITIVE',
  'ENABLE_RECORDING',
  'BRIDGE_THIRD_PARTY',
]);

export function requiresConfirmation(
  input: ConfirmationInput,
  profile: CommunicationProfile,
): boolean {
  if (CONSEQUENTIAL_ACTIONS.has(input.action)) {
    return true;
  }

  if (input.action !== 'SEND_MESSAGE') {
    return false;
  }

  if (
    input.source === 'direct_user_input' ||
    input.source === 'aac_selection' ||
    input.source === 'user_confirmed'
  ) {
    return false;
  }

  if (input.source === 'model_inferred' || input.source === 'model_generated') {
    return input.confidence === null || input.confidence < profile.confirmationThreshold;
  }

  return false;
}
