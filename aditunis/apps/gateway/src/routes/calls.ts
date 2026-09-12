import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { CallService } from '@aditunis/call-core';

const createCallSchema = z.object({
  destination: z.string().min(1),
  communicationMode: z.enum(['voice', 'text', 'voice_text', 'tts_voice']),
});

const modeSchema = z.object({
  communicationMode: z.enum(['voice', 'text', 'voice_text', 'tts_voice']),
});

const dtmfSchema = z.object({
  digits: z.string().regex(/^[0-9*#A-D]+$/),
  sensitive: z.boolean().optional().default(false),
  confirmed: z.boolean().optional().default(false),
});

export interface CallsRouterOptions {
  callService: CallService;
  nodeEnv: string;
}

function principalFor(req: Request, res: Response, nodeEnv: string): string {
  const authenticated = res.locals.principal;
  if (typeof authenticated === 'string' && authenticated.length > 0) {
    return authenticated;
  }

  if (nodeEnv !== 'production') {
    const sandboxPrincipal = req.header('X-Aditunis-Principal');
    if (sandboxPrincipal) {
      return sandboxPrincipal;
    }
  }

  return req.ip || 'anonymous';
}

function hasErrorCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error &&
    'code' in error &&
    (error as Error & { code?: unknown }).code === code;
}

function sendError(res: Response, error: unknown): void {
  if (hasErrorCode(error, 'POLICY_BLOCKED')) {
    res.status(403).json({ code: 'POLICY_BLOCKED', message: error.message });
    return;
  }

  if (error instanceof Error && /rate limit/i.test(error.message)) {
    res.status(429).json({ code: 'RATE_LIMITED', message: error.message });
    return;
  }

  if (error instanceof Error && /Unknown call/i.test(error.message)) {
    res.status(404).json({ code: 'CALL_NOT_FOUND', message: 'Call not found.' });
    return;
  }

  res.status(400).json({
    code: 'INVALID_REQUEST',
    message: error instanceof Error ? error.message : 'Invalid request.',
  });
}

export function createCallsRouter(options: CallsRouterOptions): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const idempotencyKey = req.header('Idempotency-Key');
    if (!idempotencyKey) {
      res.status(400).json({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'An Idempotency-Key header is required.',
      });
      return;
    }

    const parsed = createCallSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: 'Invalid call request.' });
      return;
    }

    try {
      const call = await options.callService.createCall({
        principal: principalFor(req, res, options.nodeEnv),
        destination: parsed.data.destination,
        communicationMode: parsed.data.communicationMode,
        idempotencyKey,
      });
      res.status(201).json(call);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/:callId', (req, res) => {
    const call = options.callService.getCall(req.params.callId);
    if (!call) {
      res.status(404).json({ code: 'CALL_NOT_FOUND', message: 'Call not found.' });
      return;
    }
    res.json(call);
  });

  router.post('/:callId/answer', async (req, res) => {
    try {
      res.json(await options.callService.answerCall(req.params.callId));
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/:callId/end', async (req, res) => {
    if (req.body?.confirmed !== true) {
      res.status(409).json({
        status: 'confirmation_required',
        action: 'END_CALL',
      });
      return;
    }
    try {
      res.json(await options.callService.endCall(req.params.callId));
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/:callId/mode', async (req, res) => {
    const parsed = modeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: 'Invalid communication mode.' });
      return;
    }
    try {
      const result = await options.callService.changeMode(
        req.params.callId,
        parsed.data.communicationMode,
      );
      res.json({
        communicationMode: result.call.communicationMode,
        capabilities: result.capabilities,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/:callId/dtmf', async (req, res) => {
    const parsed = dtmfSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_DTMF', message: 'DTMF contains unsupported characters.' });
      return;
    }
    if (parsed.data.sensitive && !parsed.data.confirmed) {
      res.status(409).json({
        status: 'confirmation_required',
        action: 'SEND_DTMF_SENSITIVE',
      });
      return;
    }
    try {
      await options.callService.sendDtmf(req.params.callId, parsed.data.digits);
      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/:callId/capabilities', async (req, res) => {
    if (!options.callService.getCall(req.params.callId)) {
      res.status(404).json({ code: 'CALL_NOT_FOUND', message: 'Call not found.' });
      return;
    }
    res.json(await options.callService.capabilities());
  });

  return router;
}
