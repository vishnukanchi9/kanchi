import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const labs = [
  { to: "/work/pulse", label: "Pulse" },
  { to: "/work/ledger", label: "Ledger" },
  { to: "/work/sentinel", label: "Sentinel" },
] as const;

export function LabFrame({
  index,
  name,
  stack,
  about,
  onReset,
  resetting,
  children,
  current,
}: {
  index: string;
  name: string;
  stack: readonly string[];
  about: string;
  onReset: () => void;
  resetting?: boolean;
  children: React.ReactNode;
  current: "pulse" | "ledger" | "sentinel";
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            Work
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
            Lab {index}
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-fg sm:text-5xl">{name}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{about}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {stack.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg p-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
            {labs.map((lab) => (
              <Link
                key={lab.to}
                to={lab.to}
                className={cn(
                  "inline-flex h-9 items-center rounded-md px-3 text-sm",
                  lab.to.endsWith(current) ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {lab.label}
              </Link>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={onReset} disabled={resetting}>
            Reset lab
          </Button>
        </div>
      </div>
      {children}
    </main>
  );
}
