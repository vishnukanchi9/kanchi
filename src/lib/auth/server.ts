/**
 * Self-hosted Better Auth for this app (server-only).
 *
 * Sign-in is optional and off by default. Point OAUTH_ISSUER at any OpenID
 * Connect provider and set OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, and
 * BETTER_AUTH_SECRET to enable it. Without them the labs run as a shared
 * public workspace under owner_id `public`.
 */
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { OAUTH_PROVIDER_ID } from "./providers";
import { pgliteDialect } from "./pglite-dialect";

void ensureDbReady();

const globalAuthRef = globalThis as typeof globalThis & {
  __authDevSecret__?: string;
};

/** Ephemeral secret so local dev boots without configuration. Never used in production. */
function devAuthSecret(): string {
  globalAuthRef.__authDevSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__authDevSecret__;
}

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const authDisabled = env("VITE_AUTH_ENABLED") === "false";

const oauthIssuer = env("OAUTH_ISSUER");
const oauthClientId = env("OAUTH_CLIENT_ID");
const oauthClientSecret = env("OAUTH_CLIENT_SECRET");

export const authConfigured =
  !authDisabled && Boolean(oauthIssuer && oauthClientId && oauthClientSecret);

const explicitBaseURL = env("BETTER_AUTH_URL");
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

const baseURL = explicitBaseURL ?? {
  allowedHosts: ["localhost", "127.0.0.1", "[::1]"],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};

const trustedOrigins: string[] = explicitBaseURL
  ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS]
  : [...LOCAL_DEV_ORIGINS];

const databaseUrl = env("DATABASE_URL");

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const SESSION_TOKEN_COOKIE = "__Host-kanchi.session_token";

/**
 * Endpoints come from the provider's own discovery document rather than
 * hard-coded paths, so any conformant OIDC issuer works unchanged.
 */
const oauthPlugin = genericOAuth({
  config: authConfigured
    ? [
        {
          providerId: OAUTH_PROVIDER_ID,
          clientId: oauthClientId as string,
          clientSecret: oauthClientSecret as string,
          discoveryUrl: `${(oauthIssuer as string).replace(/\/+$/, "")}/.well-known/openid-configuration`,
          scopes: ["openid", "profile", "email"],
        },
      ]
    : [],
});

export const auth = betterAuth({
  baseURL,
  secret: env("BETTER_AUTH_SECRET") ?? devAuthSecret(),
  database,
  trustedOrigins,
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: [OAUTH_PROVIDER_ID],
      requireLocalEmailVerified: false,
    },
  },
  session: { cookieCache: { enabled: true, maxAge: 300 } },
  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-kanchi.session_data" },
      account_data: { name: "__Host-kanchi.account_data" },
      dont_remember: { name: "__Host-kanchi.dont_remember" },
    },
  },
  plugins: [oauthPlugin, tanstackStartCookies()],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

export { OAUTH_PROVIDER_ID } from "./providers";
