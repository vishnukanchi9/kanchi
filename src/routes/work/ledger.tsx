import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LabFrame } from "@/components/lab-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getLedgerSnapshot,
  postTransfer,
  resetLedgerLab,
  runWithdrawalStorm,
  type TransferResult,
} from "@/lib/ledger/fns";
import { projects } from "@/lib/profile";
import { formatCents, formatClock, shortId } from "@/lib/utils";

export const Route = createFileRoute("/work/ledger")({ component: LedgerLab });

function LedgerLab() {
  const project = projects[1];
  const qc = useQueryClient();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("25.00");
  const [key, setKey] = useState(() => `xfer-${crypto.randomUUID().slice(0, 8)}`);
  const [note, setNote] = useState("");
  const [last, setLast] = useState<TransferResult | null>(null);

  const snap = useQuery({
    queryKey: ["ledger"],
    queryFn: () => getLedgerSnapshot(),
  });

  const visibleAccounts = useMemo(
    () => (snap.data?.accounts ?? []).filter((a) => a.kind !== "equity"),
    [snap.data],
  );

  const transfer = useMutation({
    mutationFn: () => {
      const cents = Math.round(Number.parseFloat(amount) * 100);
      if (!Number.isFinite(cents) || cents <= 0) throw new Error("Enter a valid amount");
      return postTransfer({
        data: {
          fromAccountId: fromId,
          toAccountId: toId,
          amountCents: cents,
          idempotencyKey: key,
          note,
        },
      });
    },
    onSuccess: (res) => {
      setLast(res);
      void qc.invalidateQueries({ queryKey: ["ledger"] });
    },
  });

  const storm = useMutation({
    mutationFn: () => runWithdrawalStorm({ data: { count: 30, amountCents: 10_00 } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ledger"] }),
  });

  const reset = useMutation({
    mutationFn: () => resetLedgerLab(),
    onSuccess: () => {
      setLast(null);
      setFromId("");
      setToId("");
      void qc.invalidateQueries({ queryKey: ["ledger"] });
    },
  });

  const accounts = snap.data?.accounts ?? [];
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? shortId(id);

  return (
    <LabFrame
      index={project.index}
      name={project.name}
      stack={project.stack}
      about={project.lab}
      current="ledger"
      onReset={() => reset.mutate()}
      resetting={reset.isPending}
    >
      {snap.isError ? (
        <p className="mb-4 text-sm text-bad">Could not load the ledger. {snap.error.message}</p>
      ) : null}
      {snap.isPending ? (
        <p className="mb-4 text-sm text-subtle">Loading books…</p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visibleAccounts.map((a) => (
          <div
            key={a.id}
            className="rounded-xl bg-surface px-3 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{a.name}</p>
            <p className="mt-1 font-serif text-2xl tabular-nums leading-none sm:text-3xl">
              {formatCents(a.balance_cents)}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
          Invariant
        </span>
        <Badge tone={snap.data?.conserved === 0 ? "ok" : "bad"}>
          {snap.data?.conserved === 0 ? "conserved" : "broken"}
        </Badge>
        <span className="text-muted">
          Sum of all accounts, including opening equity, is{" "}
          <span className="font-mono tabular-nums text-fg">
            {formatCents(snap.data?.conserved ?? 0)}
          </span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <form
          className="rounded-xl bg-surface p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            transfer.mutate();
          }}
        >
          <h2 className="font-serif text-2xl tracking-tight">Transfer</h2>
          <p className="mt-1 text-sm text-muted">
            Two immutable entries, accounts locked in id order, overdraft refused.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SelectField
              label="From"
              value={fromId}
              onChange={setFromId}
              options={visibleAccounts.map((a) => ({
                value: a.id,
                label: `${a.name} · ${formatCents(a.balance_cents)}`,
              }))}
            />
            <SelectField
              label="To"
              value={toId}
              onChange={setToId}
              options={visibleAccounts.map((a) => ({
                value: a.id,
                label: `${a.name} · ${formatCents(a.balance_cents)}`,
              }))}
            />
            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Amount
              </span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="h-11 w-full rounded-lg bg-elevated px-3 font-mono text-sm text-fg outline-none focus:shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Idempotency key
              </span>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="h-11 w-full rounded-lg bg-elevated px-3 font-mono text-sm text-fg outline-none focus:shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                Note
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="payroll run, vendor payout…"
                className="h-11 w-full rounded-lg bg-elevated px-3 text-sm text-fg outline-none placeholder:text-subtle focus:shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={transfer.isPending || !fromId || !toId}>
              Post transfer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setKey(`xfer-${crypto.randomUUID().slice(0, 8)}`)}
            >
              New key
            </Button>
            {last ? <ResultChip result={last} /> : null}
          </div>
        </form>

        <aside className="rounded-xl bg-surface p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:p-5">
          <h2 className="font-serif text-2xl tracking-tight">Storm</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Thirty withdrawals of $10 from Vault ($200). Twenty should post. Ten should refuse.
            Vault never goes negative.
          </p>
          <Button
            className="mt-4 w-full"
            variant="outline"
            disabled={storm.isPending}
            onClick={() => storm.mutate()}
          >
            {storm.isPending ? "Running…" : "Fire 30 withdrawals"}
          </Button>
          {storm.data ? (
            <dl className="mt-4 space-y-1.5 text-sm">
              <Row k="Posted" v={String(storm.data.posted)} />
              <Row k="Rejected" v={String(storm.data.rejected)} />
              <Row k="Vault before" v={formatCents(storm.data.vaultBefore)} />
              <Row k="Vault after" v={formatCents(storm.data.vaultAfter)} />
              <Row k="Never negative" v={storm.data.neverNegative ? "yes" : "no"} />
              <Row k="Books balance" v={storm.data.conserved === 0 ? "yes" : "no"} />
            </dl>
          ) : null}
        </aside>
      </div>

      <section className="mt-6 rounded-xl bg-surface p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:p-5">
        <h2 className="font-serif text-2xl tracking-tight">Journal</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">From</th>
                <th className="pb-2 font-medium">To</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Key</th>
                <th className="pb-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {(snap.data?.transfers ?? [])
                .filter((t) => t.amount_cents > 0)
                .map((t) => (
                  <tr key={t.id} className="border-b border-line/70">
                    <td className="py-2.5 font-mono text-xs text-muted">{formatClock(t.created_at)}</td>
                    <td className="py-2.5">{nameOf(t.from_account)}</td>
                    <td className="py-2.5">{nameOf(t.to_account)}</td>
                    <td className="py-2.5 font-mono tabular-nums">{formatCents(t.amount_cents)}</td>
                    <td className="py-2.5 font-mono text-xs text-subtle">{t.idempotency_key}</td>
                    <td className="py-2.5 text-muted">{t.note || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </LabFrame>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg bg-elevated px-3 text-sm text-fg outline-none focus:shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
      >
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultChip({ result }: { result: TransferResult }) {
  if (result.ok) {
    return <Badge tone="ok">{result.replayed ? "replayed · no double post" : "posted"}</Badge>;
  }
  const label =
    result.reason === "overdraft"
      ? "overdraft refused"
      : result.reason === "same-account"
        ? "same account"
        : result.reason;
  return <Badge tone="bad">{label}</Badge>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="font-mono tabular-nums text-fg">{v}</dd>
    </div>
  );
}
