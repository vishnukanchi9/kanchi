import { Link } from "@tanstack/react-router";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-8 shrink-0 animate-pulse rounded-full bg-elevated" />;
  }
  if (user) {
    const label = user.displayName ?? user.primaryEmail ?? "Account";
    return (
      <div className="flex items-center gap-2">
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="size-7 rounded-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
          />
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-elevated font-mono text-[11px] text-fg">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-28 truncate text-sm text-muted sm:inline">{label}</span>
        {authEnabled ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="h-9 px-1 text-sm text-muted hover:text-fg"
          >
            Sign out
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <Link
      to="/login"
      className="inline-flex h-9 items-center rounded-md px-2.5 text-sm text-muted transition-colors duration-150 hover:text-fg sm:px-3"
    >
      Sign in
    </Link>
  );
}
