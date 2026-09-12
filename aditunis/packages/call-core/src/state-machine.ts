import type { CallState } from '@aditunis/contracts';

const TRANSITIONS: Readonly<Record<CallState, readonly CallState[]>> = {
  NEW: ['AUTHORISING', 'RINGING', 'ENDED'],
  AUTHORISING: ['DIALING', 'RINGING', 'ENDED'],
  DIALING: ['RINGING', 'CONNECTED', 'TERMINATING', 'ENDED'],
  RINGING: ['CONNECTED', 'TERMINATING', 'ENDED'],
  CONNECTED: ['ACTIVE', 'HELD', 'DEGRADED', 'TERMINATING', 'ENDED'],
  ACTIVE: ['HELD', 'DEGRADED', 'TERMINATING', 'ENDED'],
  HELD: ['ACTIVE', 'DEGRADED', 'TERMINATING', 'ENDED'],
  DEGRADED: ['ACTIVE', 'RECONNECTING', 'TERMINATING', 'ENDED'],
  RECONNECTING: ['ACTIVE', 'DEGRADED', 'TERMINATING', 'ENDED'],
  TERMINATING: ['ENDED'],
  ENDED: [],
};

export function transitionCallState(from: CallState, to: CallState): CallState {
  if (!TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
  return to;
}
