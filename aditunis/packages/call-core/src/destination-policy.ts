const EMERGENCY_DESTINATIONS = new Set(['000', '106', '112']);

function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export class DestinationPolicyError extends Error {
  readonly code = 'POLICY_BLOCKED';

  constructor(message: string) {
    super(message);
    this.name = 'DestinationPolicyError';
  }
}

export function assertDestinationAllowed(destination: string): void {
  const trimmed = destination.trim();
  const normalisedDigits = digitsOnly(trimmed);

  if (EMERGENCY_DESTINATIONS.has(normalisedDigits)) {
    throw new DestinationPolicyError(
      'Emergency calling is not available in this prototype.',
    );
  }

  if (!/^\+61\d{9}$/.test(trimmed)) {
    throw new DestinationPolicyError(
      'Only Australian E.164 destinations are available in this prototype.',
    );
  }
}
