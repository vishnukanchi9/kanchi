import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <TriangleAlert className="size-8 text-bad" strokeWidth={1.5} />
      <h1 className="font-serif text-2xl tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {error.message || "An unexpected error occurred. Try reloading the page."}
      </p>
    </main>
  );
}
