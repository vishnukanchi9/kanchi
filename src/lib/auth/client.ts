import type { genericOAuth } from "better-auth/plugins/generic-oauth";
import { createAuthClient } from "better-auth/react";

// Better Auth exposes the generic OAuth server plugin publicly, but not its
// client-side inference helper. The helper only supplies type metadata, so we
// keep the tiny equivalent here without relying on a private package path.
const genericOAuthClient = () => ({
  id: "generic-oauth-client",
  $InferServerPlugin: {} as ReturnType<typeof genericOAuth>,
});

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

export async function signIn(
  providerId: string,
  opts: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  const { data, error } = await authClient.signIn.oauth2({
    providerId,
    callbackURL: opts.callbackURL ?? "/",
    errorCallbackURL: opts.errorCallbackURL ?? "/",
  });
  if (error) throw new Error(error.message ?? "Sign-in failed");
  if (data?.url) window.location.href = data.url;
}

export async function signOut(redirectTo = "/"): Promise<void> {
  await authClient.signOut();
  window.location.href = redirectTo;
}
