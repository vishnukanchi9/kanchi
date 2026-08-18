import { createMiddleware } from "@tanstack/react-start";

/**
 * Optional session — guests share the public demo sandbox; signed-in users
 * get an isolated one. Forwards the live-preview bearer the same way
 * `authMiddleware` does, but never throws on signed-out.
 */
export const optionalAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("./client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getSessionUser } = await import("./verify.server");
    const user = await getSessionUser(context.bearerToken);
    return next({ context: { userId: user?.id ?? "public" } });
  });
