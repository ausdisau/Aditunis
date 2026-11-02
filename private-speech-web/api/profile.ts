import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { requireIdentity } from "./_auth.js";

const defaults = {
  personalAdaptation: true,
  cameraProcessing: false,
  cloudProcessing: false,
  federatedLearning: false,
  researchUse: false,
  persistentVoiceEmbedding: false
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const identity = await requireIdentity(req.headers.authorization);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "database_not_configured" });
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === "GET") {
      const rows = await sql`SELECT display_name, locale, consent FROM app_user_profiles WHERE auth0_sub = ${identity.sub} LIMIT 1`;
      const row = rows[0];
      return res.status(200).json(row ? {
        displayName: row.display_name ?? "",
        locale: row.locale ?? "en-AU",
        consent: { ...defaults, ...(row.consent ?? {}) }
      } : { displayName: "", locale: "en-AU", consent: defaults });
    }

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      const displayName = String(body.displayName ?? "").slice(0, 200);
      const locale = String(body.locale ?? "en-AU").slice(0, 20);
      const consent = { ...defaults, ...(body.consent ?? {}) };
      await sql`
        INSERT INTO app_user_profiles (auth0_sub, display_name, locale, consent, updated_at)
        VALUES (${identity.sub}, ${displayName}, ${locale}, ${JSON.stringify(consent)}::jsonb, now())
        ON CONFLICT (auth0_sub) DO UPDATE SET display_name=excluded.display_name, locale=excluded.locale, consent=excluded.consent, updated_at=now()
      `;
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message.includes("app_user_profiles") || message.includes("relation")) return res.status(503).json({ error: "schema_not_ready" });
    if (message === "auth_not_configured") return res.status(503).json({ error: message });
    if (message === "unauthorized") return res.status(401).json({ error: message });
    console.error("profile_request_failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return res.status(500).json({ error: "internal_error" });
  }
}
