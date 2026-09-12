export interface FakeGatewayConfig {
  provider: 'fake';
  nodeEnv: string;
  port: number;
}

export interface TwilioGatewayConfig {
  provider: 'twilio';
  nodeEnv: string;
  port: number;
  publicBaseUrl: string;
  twilio: {
    accountSid: string;
    apiKey: string;
    apiSecret: string;
    authToken: string;
    fromNumber: string;
    mediaWssUrl: string;
    allowedDestinations: string[];
  };
}

export type GatewayConfig = FakeGatewayConfig | TwilioGatewayConfig;

export type GatewayEnvironment = Record<string, string | undefined>;

function parsePort(value: string | undefined): number {
  if (!value) return 3001;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

function requireValue(env: GatewayEnvironment, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required when ADITUNIS_PROVIDER=twilio.`);
  }
  return value;
}

function requireProtocol(value: string, protocol: 'https:' | 'wss:', label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid ${protocol.slice(0, -1)} URL.`);
  }

  if (parsed.protocol !== protocol) {
    throw new Error(`${label} must use ${protocol.slice(0, -1)}.`);
  }
  return value;
}

function parseDestinationAllowlist(value: string): string[] {
  const destinations = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (destinations.length === 0) {
    throw new Error('ADITUNIS_TWILIO_ALLOWED_DESTINATIONS must contain at least one destination.');
  }
  return destinations;
}

export function loadGatewayConfig(env: GatewayEnvironment): GatewayConfig {
  const provider = env.ADITUNIS_PROVIDER?.trim() || 'fake';
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const port = parsePort(env.PORT);

  if (provider === 'fake') {
    return { provider, nodeEnv, port };
  }

  if (provider !== 'twilio') {
    throw new Error(`Unsupported ADITUNIS_PROVIDER: ${provider}`);
  }

  const publicBaseUrl = requireProtocol(
    requireValue(env, 'ADITUNIS_PUBLIC_BASE_URL'),
    'https:',
    'ADITUNIS_PUBLIC_BASE_URL',
  );
  const mediaWssUrl = requireProtocol(
    requireValue(env, 'TWILIO_MEDIA_WSS_URL'),
    'wss:',
    'TWILIO_MEDIA_WSS_URL',
  );

  return {
    provider,
    nodeEnv,
    port,
    publicBaseUrl,
    twilio: {
      accountSid: requireValue(env, 'TWILIO_ACCOUNT_SID'),
      apiKey: requireValue(env, 'TWILIO_API_KEY'),
      apiSecret: requireValue(env, 'TWILIO_API_SECRET'),
      authToken: requireValue(env, 'TWILIO_AUTH_TOKEN'),
      fromNumber: requireValue(env, 'TWILIO_FROM_NUMBER'),
      mediaWssUrl,
      allowedDestinations: parseDestinationAllowlist(
        requireValue(env, 'ADITUNIS_TWILIO_ALLOWED_DESTINATIONS'),
      ),
    },
  };
}
