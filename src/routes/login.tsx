import { createFileRoute, Link } from "@tanstack/react-router";
import { authEnabled, signIn } from "@/lib/auth/client";
import { OAUTH_PROVIDER_ID } from "@/lib/auth/providers";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

// `||`, not `??` — Vite inlines an unset VITE_* var as an empty string.
const PROVIDER_LABEL = import.meta.env.VITE_OAUTH_LABEL || "your identity provider";

function Login() {
  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center px-4 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">Account</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">Sign in</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Optional. The labs run as a shared public workspace until you sign in — then you get your
        own.
      </p>
      <div className="mt-8 flex flex-col gap-2">
        {authEnabled ? (
          <Button
            variant="outline"
            size="lg"
            onClick={() => signIn(OAUTH_PROVIDER_ID, { callbackURL: "/" })}
          >
            Continue with {PROVIDER_LABEL}
          </Button>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
      <Link to="/" className="mt-8 text-sm text-muted hover:text-fg">
        Back to work
      </Link>
    </main>
  );
}
