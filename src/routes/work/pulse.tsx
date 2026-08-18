import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LabFrame } from "@/components/lab-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  enqueuePulseJob,
  getPulseJob,
  getPulseSnapshot,
  resetPulseLab,
  tickPulseWorker,
  type JobKind,
  type JobStatus,
  type PulseJob,
} from "@/lib/pulse/fns";
import { cn, formatClock, formatRelative, shortId } from "@/lib/utils";
import { projects } from "@/lib/profile";

export const Route = createFileRoute("/work/pulse")({ component: PulseLab });

const KINDS: Array<{ kind: JobKind; label: string; hint: string }> = [
  { kind: "echo", label: "Echo", hint: "Succeeds on first claim" },
  { kind: "slow", label: "Slow", hint: "Needs a second tick" },
  { kind: "fail", label: "Fail", hint: "Retries, then succeeds" },
  { kind: "poison", label: "Poison", hint: "Dies after 3 attempts" },
];

const LANES: JobStatus[] = ["ready", "running", "retry", "dead"];

function PulseLab() {
  const project = projects[0];
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [payload, setPayload] = useState("");

  const snap = useQuery({
    queryKey: ["pulse"],
    queryFn: () => getPulseSnapshot(),
    refetchInterval: 1500,
  });

  const detail = useQuery({
    queryKey: ["pulse-job", selected],
    queryFn: () => (selected ? getPulseJob({ data: selected }) : null),
    enabled: Boolean(selected),
    refetchInterval: 1500,
  });

  const tick = useMutation({
    mutationFn: () => tickPulseWorker(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pulse"] }),
  });

  const enqueue = useMutation({
    mutationFn: (kind: JobKind) => enqueuePulseJob({ data: { kind, payload } }),
    onSuccess: () => {
      setPayload("");
      void qc.invalidateQueries({ queryKey: ["pulse"] });
    },
  });

  const reset = useMutation({
    mutationFn: () => resetPulseLab(),
    onSuccess: () => {
      setSelected(null);
      void qc.invalidateQueries({ queryKey: ["pulse"] });
    },
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      void tickPulseWorker().then(() => qc.invalidateQueries({ queryKey: ["pulse"] }));
    }, 2200);
    return () => window.clearInterval(id);
  }, [qc]);

  const jobs = snap.data?.jobs ?? [];
  const counts = snap.data?.counts ?? {};
  const loading = snap.isPending;
  const byLane = useMemo(() => {
    const map: Record<string, PulseJob[]> = { ready: [], running: [], retry: [], dead: [] };
    for (const job of jobs) {
      if (job.status === "succeeded") continue;
      (map[job.status] ??= []).push(job);
    }
    return map;
  }, [jobs]);

  const succeeded = jobs.filter((j) => j.status === "succeeded").length;

  return (
    <LabFrame
      index={project.index}
      name={project.name}
      stack={project.stack}
      about={project.lab}
      current="pulse"
      onReset={() => reset.mutate()}
      resetting={reset.isPending}
    >
      {snap.isError ? (
        <p className="mb-4 text-sm text-bad">Could not load the queue. {snap.error.message}</p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Ready" value={counts.ready ?? 0} />
        <Stat label="Running" value={counts.running ?? 0} />
        <Stat label="Retry" value={counts.retry ?? 0} />
        <Stat label="Dead" value={counts.dead ?? 0} />
        <Stat label="Succeeded" value={succeeded} />
      </div>

      <div className="mb-6 rounded-xl bg-surface p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block flex-1">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              Payload
            </span>
            <input
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="optional note for the worker"
              className="h-11 w-full rounded-lg bg-elevated px-3 text-sm text-fg outline-none ring-0 placeholder:text-subtle focus:shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <Button
                key={k.kind}
                variant="outline"
                size="sm"
                disabled={enqueue.isPending}
                onClick={() => enqueue.mutate(k.kind)}
                title={k.hint}
              >
                {k.label}
              </Button>
            ))}
            <Button size="sm" onClick={() => tick.mutate()} disabled={tick.isPending}>
              Tick worker
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-subtle">
          Worker claims ready jobs every couple of seconds. Fail retries with capped exponential
          backoff (2s, 4s, 8s… max 30s). Poison jobs exhaust attempts and go to dead-letter.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {LANES.map((lane) => (
          <section
            key={lane}
            className="rounded-xl bg-surface p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          >
            <header className="mb-2 flex items-center justify-between px-1">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{lane}</h2>
              <span className="font-mono text-[11px] tabular-nums text-muted">
                {(byLane[lane] ?? []).length}
              </span>
            </header>
            <div className="flex min-h-40 flex-col gap-2">
              {loading ? (
                <p className="px-1 py-6 text-center text-xs text-subtle">Loading…</p>
              ) : (byLane[lane] ?? []).length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-subtle">Empty</p>
              ) : (
                (byLane[lane] ?? []).map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelected(job.id)}
                    className={cn(
                      "rounded-lg bg-elevated p-3 text-left transition-shadow",
                      selected === job.id
                        ? "shadow-[0_0_0_1px_rgba(255,255,255,0.22)]"
                        : "shadow-[0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-fg">{job.kind}</span>
                      <span className="font-mono text-[10px] text-subtle">{shortId(job.id)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">{job.payload}</p>
                    <p className="mt-2 font-mono text-[10px] text-subtle">
                      {job.attempts}/{job.max_attempts} · {formatRelative(job.created_at)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-xl bg-surface p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:p-5">
        <h2 className="font-serif text-2xl tracking-tight">Completed</h2>
        <ul className="mt-3 divide-y divide-line">
          {jobs.filter((j) => j.status === "succeeded").length === 0 ? (
            <li className="py-4 text-sm text-subtle">No completed jobs yet.</li>
          ) : (
            jobs
              .filter((j) => j.status === "succeeded")
              .slice(0, 8)
              .map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(job.id)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:text-fg"
                  >
                    <span className="min-w-0 truncate text-sm text-muted">
                      <span className="font-mono text-fg">{job.kind}</span>
                      {" · "}
                      {job.payload}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-subtle">
                      {formatRelative(job.finished_at ?? job.created_at)}
                    </span>
                  </button>
                </li>
              ))
          )}
        </ul>
      </section>

      {detail.data?.job ? (
        <aside className="mt-6 rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Job {shortId(detail.data.job.id)}
              </p>
              <h3 className="mt-1 font-serif text-2xl tracking-tight">{detail.data.job.kind}</h3>
            </div>
            <StatusBadge status={detail.data.job.status} />
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <Field label="Payload" value={detail.data.job.payload} />
            <Field
              label="Attempts"
              value={`${detail.data.job.attempts} / ${detail.data.job.max_attempts}`}
            />
            <Field label="Next run" value={formatClock(detail.data.job.run_at)} />
            <Field label="Error" value={detail.data.job.last_error ?? "—"} />
            <Field label="Started" value={formatClock(detail.data.job.started_at)} />
            <Field label="Finished" value={formatClock(detail.data.job.finished_at)} />
          </dl>
          <ol className="mt-5 space-y-2 border-t border-line pt-4">
            {detail.data.events.map((ev) => (
              <li key={ev.id} className="grid grid-cols-[88px_1fr] gap-3 text-xs sm:grid-cols-[120px_88px_1fr]">
                <span className="font-mono text-subtle">{formatClock(ev.created_at)}</span>
                <span className="font-mono text-fg">{ev.kind}</span>
                <span className="text-muted">{ev.detail}</span>
              </li>
            ))}
          </ol>
        </aside>
      ) : null}
    </LabFrame>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{label}</p>
      <p className="mt-1 font-serif text-3xl tabular-nums leading-none">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const tone =
    status === "succeeded" ? "ok" : status === "dead" ? "bad" : status === "retry" ? "warn" : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}
