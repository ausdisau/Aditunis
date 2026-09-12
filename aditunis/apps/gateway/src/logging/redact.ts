const SENSITIVE_KEYS = new Set([
  'authtoken',
  'apisecret',
  'authorization',
  'x-twilio-signature',
  'audio',
  'mediapayload',
  'rawaudio',
]);

export function redactForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item));
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return '[BINARY]';
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redactForLog(item);
    }
  }
  return output;
}
