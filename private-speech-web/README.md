# Adtunis Private Speech Web

Accessibility-first React + TypeScript interface for the Adtunis personalised speech model.

## Deployment architecture

- React/Vite on Vercel.
- Auth0 SPA authentication.
- Vercel Functions verify Auth0 access tokens against the tenant JWKS.
- Neon Postgres stores account/profile and consent preferences only in the initial deployment.
- Raw speech, video, personal adapters and persistent voice embeddings are not stored by this web scaffold.

## Environment

Configure the values shown in `.env.example` in Vercel. Browser-visible Auth0 identifiers use `VITE_*`; `DATABASE_URL` remains server-only.

Auth0 must allow the Vercel production origin in Allowed Callback URLs, Allowed Logout URLs and Allowed Web Origins.

## Compliance boundary

This privacy-minimised scaffold is not, by itself, a claim of HIPAA, Australian Privacy Act, state health-records, or TGA compliance. Do not store PHI/health information until contractual, security, retention and incident-response controls for the deployment are verified.
