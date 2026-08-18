import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LabFrame } from "@/components/lab-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSentinelSnapshot,
  openIncident,
  resetSentinelLab,
  simulatePage,
  updateIncident,
  type IncidentStatus,
  type Severity,
} from "@/lib/sentinel/fns";
import { projects } from "@/lib/profile";
import { cn, formatClock, formatRelative } from "@/lib/utils";

export const Route = createFileRoute("/work/sentinel")({ component: SentinelLab });

function SentinelLab() {
  const project = projects[2];
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [severity, setSeverity] = useState<Severity>("SEV2");
  const [assignee, setAssignee] = useState("oncall");

  const snap = useQuery({
    queryKey: ["sentinel"],
    queryFn: () => getSentinelSnapshot(),
    refetchInterval: 2000,
  });

  const open = useMutation({
    mutationFn: () => openIncident({ data: { serviceId, title, severity } }),
    onSuccess: (res) => {
      setTitle("");
      setSelected(res.id);
      void qc.invalidateQueries({ queryKey: ["sentinel"] });
    },
  });

  const act = useMutation({
    mutationFn: (input: { id: string; action: "ack" | "assign" | "resolve"; assignee?: string }) =>
      updateIncident({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sentinel"] }),
  });

  const page = useMutation({
    mutationFn: () => simulatePage(),
    onSuccess: (res) => {
      setSelected(res.id);
      void qc.invalidateQueries({ queryKey: ["sentinel"] });
    },
  });

  const reset = useMutation({
    mutationFn: () => resetSentinelLab(),
    onSuccess: () => {
      setSelected(null);
      void qc.invalidateQueries({ queryKey: ["sentinel"] });
    },
  });

  const services = snap.data?.services ?? [];
  const incidents = snap.data?.incidents ?? [];
  const events = snap.data?.events ?? [];
  const selectedInc = incidents.find((i) => i.id === selected) ?? incidents[0] ?? null;
  const selectedEvents = useMemo(
    () => (selectedInc ? events.filter((e) => e.incident_id === selectedInc.id) : []),
    [events, selectedInc],
  );
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "service";

  return (
    <LabFrame
      index={project.index}
      name={project.name}
      stack={project.stack}
      about={project.lab}
      current="sentinel"
      onReset={() => reset.mutate()}
      resetting={reset.isPending}
    >
      {snap.isError ? (
        <p className="mb-4 text-sm text-bad">Could not load Sentinel. {snap.error.message}</p>
      ) : null}
      {snap.isPending ? (
        <p className="mb-4 text-sm text-subtle">Loading board…</p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="rounded-xl bg-surface px-3 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-mono text-[11px] text-fg">{svc.name}</p>
              <HealthDot status={svc.status} />
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
              {svc.status}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:flex-row sm:items-end sm:p-5">
        <label className="block sm:w-40">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
            Service
          </span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="h-11 w-full rounded-lg bg-elevated px-3 text-sm text-fg outline-none"
          >
            <option value="">Select</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:w-28">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
            Severity
          </span>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            className="h-11 w-full rounded-lg bg-elevated px-3 text-sm text-fg outline-none"
          >
            {(["SEV1", "SEV2", "SEV3", "SEV4"] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block flex-1">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What broke?"
            className="h-11 w-full rounded-lg bg-elevated px-3 text-sm text-fg outline-none placeholder:text-subtle"
          />
        </label>
        <div className="flex gap-2">
          <Button
            disabled={open.isPending || !serviceId || !title.trim()}
            onClick={() => open.mutate()}
          >
            Declare
          </Button>
          <Button variant="outline" disabled={page.isPending} onClick={() => page.mutate()}>
            Simulate page
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <section className="rounded-xl bg-surface p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:p-4">
          <header className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-serif text-2xl tracking-tight">Incidents</h2>
            <span className="font-mono text-[11px] text-subtle">
              {incidents.filter((i) => i.status !== "resolved").length} open
            </span>
          </header>
          <ul className="divide-y divide-line">
            {incidents.length === 0 ? (
              <li className="px-1 py-8 text-center text-sm text-subtle">Quiet. For now.</li>
            ) : (
              incidents.map((inc) => (
                <li key={inc.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(inc.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-2 py-3 text-left sm:flex-row sm:items-center sm:gap-4",
                      selectedInc?.id === inc.id ? "bg-elevated" : "hover:bg-elevated/50",
                    )}
                  >
                    <SevBadge severity={inc.severity} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{inc.title}</span>
                      <span className="font-mono text-[11px] text-subtle">
                        {serviceName(inc.service_id)} · {formatRelative(inc.opened_at)}
                      </span>
                    </span>
                    <StatusBadge status={inc.status} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <aside className="rounded-xl bg-surface p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:p-5">
          {selectedInc ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                    {serviceName(selectedInc.service_id)}
                  </p>
                  <h3 className="mt-1 font-serif text-2xl leading-tight tracking-tight">
                    {selectedInc.title}
                  </h3>
                </div>
                <SevBadge severity={selectedInc.severity} />
              </div>
              <p className="mt-2 text-sm text-muted">
                {selectedInc.assignee ? `Assigned to ${selectedInc.assignee}` : "Unassigned"} ·{" "}
                opened {formatClock(selectedInc.opened_at)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={act.isPending || selectedInc.status !== "open"}
                  onClick={() => act.mutate({ id: selectedInc.id, action: "ack" })}
                >
                  Acknowledge
                </Button>
                <div className="flex gap-1">
                  <input
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="h-9 w-28 rounded-md bg-elevated px-2 text-sm outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={act.isPending}
                    onClick={() =>
                      act.mutate({ id: selectedInc.id, action: "assign", assignee })
                    }
                  >
                    Assign
                  </Button>
                </div>
                <Button
                  size="sm"
                  disabled={act.isPending || selectedInc.status === "resolved"}
                  onClick={() => act.mutate({ id: selectedInc.id, action: "resolve" })}
                >
                  Resolve
                </Button>
              </div>
              <ol className="mt-5 space-y-3 border-t border-line pt-4">
                {selectedEvents.map((ev) => (
                  <li key={ev.id}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
                      {ev.kind} · {ev.actor} · {formatRelative(ev.created_at)}
                    </p>
                    <p className="mt-0.5 text-sm text-fg">{ev.message}</p>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-subtle">Select an incident</p>
          )}
        </aside>
      </div>
    </LabFrame>
  );
}

function HealthDot({ status }: { status: string }) {
  const tone = status === "healthy" ? "bg-ok" : status === "degraded" ? "bg-warn" : "bg-bad";
  return <span className={cn("size-2 shrink-0 rounded-full", tone)} />;
}

function SevBadge({ severity }: { severity: Severity }) {
  const tone = severity === "SEV1" ? "bad" : severity === "SEV2" ? "warn" : "neutral";
  return <Badge tone={tone}>{severity}</Badge>;
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const tone = status === "resolved" ? "ok" : status === "acked" ? "warn" : "bad";
  return <Badge tone={tone}>{status}</Badge>;
}
