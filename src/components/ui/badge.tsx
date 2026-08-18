import { cn } from "@/lib/utils";

const tones = {
  neutral: "text-muted shadow-[0_0_0_1px_rgba(255,255,255,0.10)]",
  ok: "text-ok shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ok)_35%,transparent)]",
  warn: "text-warn shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-warn)_35%,transparent)]",
  bad: "text-bad shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-bad)_35%,transparent)]",
  invert: "bg-accent text-accent-fg",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
