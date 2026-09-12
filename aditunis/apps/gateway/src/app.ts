import express, { type Express } from 'express';
import { z } from 'zod';
import type { ProviderAdapter } from '@aditunis/contracts';
import type { CallService, InMemoryEventStore } from '@aditunis/call-core';
import { createCallsRouter } from './routes/calls.js';
import { createHealthRouter } from './routes/health.js';
import { createProvidersRouter } from './routes/providers.js';

const incomingSchema = z.object({
  from: z.string().min(1),
  communicationMode: z.enum(['voice', 'text', 'voice_text', 'tts_voice']),
});

export interface CreateAppOptions {
  callService: CallService;
  provider: ProviderAdapter;
  eventStore: InMemoryEventStore;
  nodeEnv?: string;
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? 'development';

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use('/v1/calls', createCallsRouter({ callService: options.callService, nodeEnv }));
  app.use('/v1/providers', createProvidersRouter(options.provider));
  app.use('/v1/health', createHealthRouter());

  if (nodeEnv !== 'production') {
    app.post('/v1/dev/incoming-call', (req, res) => {
      const parsed = incomingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ code: 'INVALID_REQUEST', message: 'Invalid sandbox incoming call.' });
        return;
      }
      const call = options.callService.createIncomingSandboxCall(parsed.data);
      res.status(201).json(call);
    });
  }

  return app;
}
