/**
 * Optional OAuth preview client (server-only — never import from the client).
 *
 * Local clones: leave these unset unless you configure your own OIDC broker.
 * Labs work without sign-in (guests share the public sandbox).
 */
export const PREVIEW_CLIENT_ID = process.env.GROK_AUTH_CLIENT_ID ?? "";
export const PREVIEW_CLIENT_SECRET = process.env.GROK_AUTH_CLIENT_SECRET ?? "";
export const GROK_ISSUER_DEFAULT = process.env.GROK_AUTH_ISSUER ?? "";
export const PREVIEW_ALLOWED_HOSTS = ["*.grok-sandbox.com"] as const;
