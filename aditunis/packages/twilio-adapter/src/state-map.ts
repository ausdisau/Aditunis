import type { CallFailureReason, CallState } from '@aditunis/contracts';

export type TwilioStatusMapping =
  | { state: CallState; failureReason?: CallFailureReason }
  | { providerDegraded: true };

export function mapTwilioStatus(status: string): TwilioStatusMapping {
  switch (status) {
    case 'queued':
    case 'initiated':
      return { state: 'DIALING' };
    case 'ringing':
      return { state: 'RINGING' };
    case 'in-progress':
    case 'answered':
      return { state: 'CONNECTED' };
    case 'completed':
      return { state: 'ENDED' };
    case 'busy':
      return { state: 'ENDED', failureReason: 'BUSY' };
    case 'no-answer':
      return { state: 'ENDED', failureReason: 'NO_ANSWER' };
    case 'failed':
    case 'canceled':
      return { state: 'ENDED', failureReason: 'PROVIDER_FAILED' };
    default:
      return { providerDegraded: true };
  }
}
