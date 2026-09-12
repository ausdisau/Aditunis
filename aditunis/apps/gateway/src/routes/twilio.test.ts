import express from 'express';
import request from 'supertest';
import twilio from 'twilio';
import { describe, expect, it, vi } from 'vitest';
import { createTwilioRouter } from './twilio.js';

function createHarness() {
  const authToken = 'test_auth_token';
  const publicBaseUrl = 'https://gateway.aditunis.example';
  const mediaWssUrl = 'wss://media.aditunis.example/providers/twilio/media';
  const onIncoming = vi.fn();
  const onStatus = vi.fn();
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use('/providers/twilio', createTwilioRouter({
    authToken,
    publicBaseUrl,
    mediaWssUrl,
    onIncoming,
    onStatus,
  }));
  return { app, authToken, publicBaseUrl, onIncoming, onStatus };
}

function signature(authToken: string, url: string, params: Record<string, string>) {
  return twilio.getExpectedTwilioSignature(authToken, url, params);
}

describe('Twilio provider webhooks', () => {
  it('accepts a signed inbound voice webhook and returns Media Streams TwiML', async () => {
    const { app, authToken, publicBaseUrl, onIncoming } = createHarness();
    const params = {
      CallSid: 'CA123',
      From: '+61255509999',
      To: '+61255500000',
    };
    const url = `${publicBaseUrl}/providers/twilio/voice`;
    const response = await request(app)
      .post('/providers/twilio/voice')
      .set('X-Twilio-Signature', signature(authToken, url, params))
      .type('form')
      .send(params);

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/xml/);
    expect(response.text).toContain('<Connect>');
    expect(response.text).toContain('wss://media.aditunis.example/providers/twilio/media');
    expect(onIncoming).toHaveBeenCalledWith({
      providerCallId: 'CA123',
      from: '+61255509999',
      to: '+61255500000',
    });
  });

  it('rejects an unsigned inbound webhook before invoking application callbacks', async () => {
    const { app, onIncoming } = createHarness();
    const response = await request(app)
      .post('/providers/twilio/voice')
      .type('form')
      .send({ CallSid: 'CA123', From: '+61255509999', To: '+61255500000' });

    expect(response.status).toBe(403);
    expect(onIncoming).not.toHaveBeenCalled();
  });

  it('translates a signed status webhook into an application callback', async () => {
    const { app, authToken, publicBaseUrl, onStatus } = createHarness();
    const params = { CallSid: 'CA123', CallStatus: 'ringing' };
    const url = `${publicBaseUrl}/providers/twilio/status`;
    const response = await request(app)
      .post('/providers/twilio/status')
      .set('X-Twilio-Signature', signature(authToken, url, params))
      .type('form')
      .send(params);

    expect(response.status).toBe(204);
    expect(onStatus).toHaveBeenCalledWith({
      providerCallId: 'CA123',
      status: 'ringing',
    });
  });

  it('rejects a body mutated after signing', async () => {
    const { app, authToken, publicBaseUrl, onStatus } = createHarness();
    const signedParams = { CallSid: 'CA123', CallStatus: 'ringing' };
    const url = `${publicBaseUrl}/providers/twilio/status`;
    const response = await request(app)
      .post('/providers/twilio/status')
      .set('X-Twilio-Signature', signature(authToken, url, signedParams))
      .type('form')
      .send({ CallSid: 'CA123', CallStatus: 'completed' });

    expect(response.status).toBe(403);
    expect(onStatus).not.toHaveBeenCalled();
  });
});
