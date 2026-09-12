import twilio from 'twilio';

export interface TwilioWebhookValidationInput {
  authToken: string;
  signature: string;
  url: string;
  params: Record<string, string>;
}

export function validateTwilioWebhook(input: TwilioWebhookValidationInput): boolean {
  if (!input.signature) {
    return false;
  }
  return twilio.validateRequest(
    input.authToken,
    input.signature,
    input.url,
    input.params,
  );
}
