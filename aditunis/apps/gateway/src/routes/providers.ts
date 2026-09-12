import { Router } from 'express';
import type { ProviderAdapter } from '@aditunis/contracts';

export function createProvidersRouter(provider: ProviderAdapter): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.json([{
      id: provider.id,
      capabilities: await provider.capabilities(),
    }]);
  });
  return router;
}
