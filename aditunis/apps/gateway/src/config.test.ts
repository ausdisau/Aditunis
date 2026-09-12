import { describe, expect, it } from 'vitest';
import { loadGatewayConfig } from './config.js';

describe('gateway configuration', () => {
  it('defaults to the safe sandbox provider', () => {
    const config = loadGatewayConfig({});
    expect(config).toEqual({
      provider: 'fake',
      nodeEnv: 'development',
      port: 3001,
    });
  });

  it('requires the complete server-side Twilio configuration', () => {
    expect(() => loadGatewayConfig({ ADITUNIS_PROVIDER: 'twilio' })).toThrow(/TWILIO_ACCOUNT_SID/);
  });

  it('parses a complete Twilio configuration and destination allowlist', () => {
    const config = loadGatewayConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      ADITUNIS_PROVIDER: 'twilio',
      ADITUNIS_PUBLIC_BASE_URL: 'https://gateway.aditunis.example',
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_API_KEY: 'SK123',
      TWILIO_API_SECRET: 'secret',
      TWILIO_AUTH_TOKEN: 'auth-token',
      TWILIO_FROM_NUMBER: '+61255500000',
      TWILIO_MEDIA_WSS_URL: 'wss://media.aditunis.example/providers/twilio/media',
      ADITUNIS_TWILIO_ALLOWED_DESTINATIONS: '+61255501234, +61400000000,',
    });

    expect(config.provider).toBe('twilio');
    if (config.provider !== 'twilio') throw new Error('Expected Twilio config');
    expect(config.nodeEnv).toBe('production');
    expect(config.port).toBe(8080);
    expect(config.twilio.allowedDestinations).toEqual([
      '+61255501234',
      '+61400000000',
    ]);
  });

  it('rejects insecure public and media transport URLs', () => {
    const base = {
      ADITUNIS_PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_API_KEY: 'SK123',
      TWILIO_API_SECRET: 'secret',
      TWILIO_AUTH_TOKEN: 'auth-token',
      TWILIO_FROM_NUMBER: '+61255500000',
      ADITUNIS_TWILIO_ALLOWED_DESTINATIONS: '+61255501234',
    };

    expect(() => loadGatewayConfig({
      ...base,
      ADITUNIS_PUBLIC_BASE_URL: 'http://gateway.aditunis.example',
      TWILIO_MEDIA_WSS_URL: 'wss://media.aditunis.example/providers/twilio/media',
    })).toThrow(/https/i);

    expect(() => loadGatewayConfig({
      ...base,
      ADITUNIS_PUBLIC_BASE_URL: 'https://gateway.aditunis.example',
      TWILIO_MEDIA_WSS_URL: 'ws://media.aditunis.example/providers/twilio/media',
    })).toThrow(/wss/i);
  });
});
