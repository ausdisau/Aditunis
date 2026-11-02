import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    status: "ok",
    auth0Configured: Boolean(process.env.AUTH0_DOMAIN && process.env.AUTH0_AUDIENCE),
    neonConfigured: Boolean(process.env.DATABASE_URL)
  });
}
