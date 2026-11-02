import { createRemoteJWKSet, jwtVerify } from "jose";

export async function requireIdentity(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) throw new Error("unauthorized");
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;
  if (!domain || !audience) throw new Error("auth_not_configured");

  const issuer = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
  const { payload } = await jwtVerify(authorization.slice(7), jwks, { issuer, audience });
  if (!payload.sub) throw new Error("unauthorized");
  return { sub: payload.sub };
}
