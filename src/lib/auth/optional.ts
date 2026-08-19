import { createMiddleware } from "@tanstack/react-start";

/**
 * Optional session. Guests share the public demo workspace; signed-in users
 * get an isolated one. Never throws when signed out — the labs are meant to
 * work without an account.
 */
export const optionalAuthMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { getSessionUser } = await import("./verify.server");
    const user = await getSessionUser();
    return next({ context: { userId: user?.id ?? "public" } });
  },
);
