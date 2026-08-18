import { Link, useRouterState } from "@tanstack/react-router";
import { AuthSlot } from "@/components/auth-slot";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Work", hash: "work" },
  { to: "/work/pulse", label: "Labs" },
  { to: "/resume", label: "Resume" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link to="/" className="group flex items-baseline gap-2.5">
          <span className="font-serif text-xl tracking-tight text-fg">KANCHI</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-subtle sm:inline">
            Eng
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const active =
              link.to === "/"
                ? pathname === "/"
                : pathname === link.to || (link.to === "/work/pulse" && pathname.startsWith("/work"));
            return (
              <Link
                key={link.label}
                to={link.to}
                className={cn(
                  "inline-flex h-9 items-center rounded-md px-2.5 text-sm transition-colors duration-150 sm:px-3",
                  active ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="ml-1 hidden h-4 w-px bg-line sm:block" />
          <AuthSlot />
        </nav>
      </div>
    </header>
  );
}
