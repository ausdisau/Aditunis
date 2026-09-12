import { Router, type Request, type Response } from 'express';
import {
  createMediaStreamTwiml,
  validateTwilioWebhook,
} from '@aditunis/twilio-adapter';

export interface TwilioIncomingEvent {
  providerCallId: string;
  from: string;
  to: string;
}

export interface TwilioStatusEvent {
  providerCallId: string;
  status: string;
}

export interface TwilioRouterOptions {
  authToken: string;
  publicBaseUrl: string;
  mediaWssUrl: string;
  onIncoming(event: TwilioIncomingEvent): void | Promise<void>;
  onStatus(event: TwilioStatusEvent): void | Promise<void>;
}

function formParams(req: Request): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.body ?? {})) {
    if (typeof value === 'string') {
      params[key] = value;
    }
  }
  return params;
}

function publicWebhookUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}${path}`;
}

function validateRequest(
  req: Request,
  res: Response,
  options: TwilioRouterOptions,
  path: string,
): Record<string, string> | undefined {
  const params = formParams(req);
  const valid = validateTwilioWebhook({
    authToken: options.authToken,
    signature: req.header('X-Twilio-Signature') ?? '',
    url: publicWebhookUrl(options.publicBaseUrl, path),
    params,
  });

  if (!valid) {
    res.status(403).json({
      code: 'INVALID_TWILIO_SIGNATURE',
      message: 'Twilio webhook signature validation failed.',
    });
    return undefined;
  }

  return params;
}

export function createTwilioRouter(options: TwilioRouterOptions): Router {
  const router = Router();

  router.post('/voice', async (req, res) => {
    const params = validateRequest(
      req,
      res,
      options,
      '/providers/twilio/voice',
    );
    if (!params) return;

    const providerCallId = params.CallSid;
    const from = params.From;
    const to = params.To;
    if (!providerCallId || !from || !to) {
      res.status(400).json({ code: 'INVALID_TWILIO_WEBHOOK', message: 'Required call fields are missing.' });
      return;
    }

    await options.onIncoming({ providerCallId, from, to });
    res.type('text/xml').send(createMediaStreamTwiml(options.mediaWssUrl));
  });

  router.post('/status', async (req, res) => {
    const params = validateRequest(
      req,
      res,
      options,
      '/providers/twilio/status',
    );
    if (!params) return;

    const providerCallId = params.CallSid;
    const status = params.CallStatus;
    if (!providerCallId || !status) {
      res.status(400).json({ code: 'INVALID_TWILIO_WEBHOOK', message: 'Required status fields are missing.' });
      return;
    }

    await options.onStatus({ providerCallId, status });
    res.status(204).send();
  });

  return router;
}
