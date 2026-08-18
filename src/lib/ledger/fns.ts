import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { optionalAuthMiddleware } from "@/lib/auth/optional";
import { withTx } from "@/lib/tx";
import { newId } from "@/lib/ids";

export type LedgerAccount = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  balance_cents: number;
};

export type LedgerTransfer = {
  id: string;
  idempotency_key: string;
  from_account: string;
  to_account: string;
  amount_cents: number;
  status: string;
  note: string;
  created_at: string;
};

export type LedgerEntry = {
  id: string;
  transfer_id: string;
  account_id: string;
  amount_cents: number;
  created_at: string;
};

type SeedAccount = { key: string; name: string; kind: string; opening: number };

const SEED: SeedAccount[] = [
  { key: "operating", name: "Operating", kind: "asset", opening: 10_000_00 },
  { key: "reserve", name: "Reserve", kind: "asset", opening: 4_000_00 },
  { key: "payroll", name: "Payroll", kind: "asset", opening: 2_000_00 },
  { key: "vault", name: "Vault", kind: "asset", opening: 200_00 },
  { key: "equity", name: "Opening equity", kind: "equity", opening: -16_200_00 },
];

async function ensureSeed(sql: Awaited<ReturnType<typeof getSql>>, ownerId: string) {
  const existing = await sql<{ n: number }>`
    select count(*)::int as n from ledger_accounts where owner_id = ${ownerId}
  `;
  if ((existing[0]?.n ?? 0) > 0) return;

  const ids: Record<string, string> = {};
  for (const acct of SEED) {
    const id = newId();
    ids[acct.key] = id;
    await sql`
      insert into ledger_accounts (id, owner_id, name, kind)
      values (${id}, ${ownerId}, ${acct.name}, ${acct.kind})
    `;
  }

  const transferId = newId();
  await sql`
    insert into ledger_transfers
      (id, owner_id, idempotency_key, from_account, to_account, amount_cents, status, note)
    values
      (${transferId}, ${ownerId}, ${`open-${ownerId}`}, ${ids.equity}, ${ids.operating},
       0, 'posted', 'Opening balances')
  `;
  for (const acct of SEED) {
    await sql`
      insert into ledger_entries (id, owner_id, transfer_id, account_id, amount_cents)
      values (${newId()}, ${ownerId}, ${transferId}, ${ids[acct.key]}, ${acct.opening})
    `;
  }
}

export const getLedgerSnapshot = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureSeed(sql, context.userId);

    const accounts = await sql<LedgerAccount>`
      select a.id, a.name, a.kind, a.currency,
             coalesce(sum(e.amount_cents), 0)::int as balance_cents
      from ledger_accounts a
      left join ledger_entries e on e.account_id = a.id
      where a.owner_id = ${context.userId}
      group by a.id, a.name, a.kind, a.currency
      order by a.kind, a.name
    `;

    const transfers = await sql<LedgerTransfer>`
      select id, idempotency_key, from_account, to_account, amount_cents,
             status, note, created_at::text
      from ledger_transfers
      where owner_id = ${context.userId}
      order by created_at desc
      limit 40
    `;

    const entries = await sql<LedgerEntry>`
      select id, transfer_id, account_id, amount_cents, created_at::text
      from ledger_entries
      where owner_id = ${context.userId}
      order by created_at desc
      limit 80
    `;

    const conserved = accounts.reduce((sum, a) => sum + a.balance_cents, 0);
    return { accounts, transfers, entries, conserved, owner: context.userId };
  });

type TransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  idempotencyKey: string;
  note?: string;
};

export type TransferResult =
  | { ok: true; transferId: string; replayed: boolean }
  | { ok: false; reason: "overdraft" | "same-account" | "not-found" | "invalid-amount" | "unknown" };

export const postTransfer = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: TransferInput) => {
    if (!input.fromAccountId || !input.toAccountId) throw new Error("Accounts required");
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error("Amount must be a positive integer (cents)");
    }
    const key = (input.idempotencyKey || "").trim() || newId();
    return {
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amountCents: input.amountCents,
      idempotencyKey: key.slice(0, 80),
      note: (input.note ?? "").trim().slice(0, 160),
    };
  })
  .handler(async ({ context, data }): Promise<TransferResult> => {
    const sqlReady = await getSql();
    await ensureSeed(sqlReady, context.userId);
    return executeTransfer(context.userId, data);
  });

async function executeTransfer(
  ownerId: string,
  data: TransferInput,
): Promise<TransferResult> {
  if (data.fromAccountId === data.toAccountId) {
    return { ok: false, reason: "same-account" };
  }
  if (!Number.isInteger(data.amountCents) || data.amountCents <= 0) {
    return { ok: false, reason: "invalid-amount" };
  }

  try {
    return await withTx(async (sql) => {
      const existing = await sql<{ id: string }>`
        select id from ledger_transfers
        where owner_id = ${ownerId} and idempotency_key = ${data.idempotencyKey}
        limit 1
      `;
      if (existing[0]) {
        return { ok: true, transferId: existing[0].id, replayed: true };
      }

      // Deadlock-free: lock both rows in id order.
      const ids = [data.fromAccountId, data.toAccountId].sort();
      const locked = await sql<{ id: string }>`
        select id from ledger_accounts
        where owner_id = ${ownerId} and id in (${ids[0]}, ${ids[1]})
        order by id
        for update
      `;
      if (locked.length !== 2) return { ok: false, reason: "not-found" };

      const balRows = await sql<{ balance: number }>`
        select coalesce(sum(amount_cents), 0)::int as balance
        from ledger_entries
        where account_id = ${data.fromAccountId}
      `;
      const balance = balRows[0]?.balance ?? 0;
      if (balance < data.amountCents) return { ok: false, reason: "overdraft" };

      const transferId = newId();
      await sql`
        insert into ledger_transfers
          (id, owner_id, idempotency_key, from_account, to_account, amount_cents, status, note)
        values
          (${transferId}, ${ownerId}, ${data.idempotencyKey},
           ${data.fromAccountId}, ${data.toAccountId}, ${data.amountCents},
           'posted', ${data.note ?? ""})
      `;
      await sql`
        insert into ledger_entries (id, owner_id, transfer_id, account_id, amount_cents)
        values (${newId()}, ${ownerId}, ${transferId}, ${data.fromAccountId}, ${-data.amountCents})
      `;
      await sql`
        insert into ledger_entries (id, owner_id, transfer_id, account_id, amount_cents)
        values (${newId()}, ${ownerId}, ${transferId}, ${data.toAccountId}, ${data.amountCents})
      `;
      return { ok: true, transferId, replayed: false };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      const sql = await getSql();
      const existing = await sql<{ id: string }>`
        select id from ledger_transfers
        where owner_id = ${ownerId} and idempotency_key = ${data.idempotencyKey}
        limit 1
      `;
      if (existing[0]) return { ok: true, transferId: existing[0].id, replayed: true };
    }
    return { ok: false, reason: "unknown" };
  }
}

export const runWithdrawalStorm = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { count?: number; amountCents?: number }) => ({
    count: Math.min(40, Math.max(1, input.count ?? 30)),
    amountCents: Math.min(10_000, Math.max(1, input.amountCents ?? 10_00)),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureSeed(sql, context.userId);

    const vault = await sql<{ id: string }>`
      select id from ledger_accounts
      where owner_id = ${context.userId} and name = 'Vault' limit 1
    `;
    const payroll = await sql<{ id: string }>`
      select id from ledger_accounts
      where owner_id = ${context.userId} and name = 'Payroll' limit 1
    `;
    if (!vault[0] || !payroll[0]) throw new Error("Seed accounts missing");

    const before = await sql<{ balance: number }>`
      select coalesce(sum(amount_cents), 0)::int as balance
      from ledger_entries where account_id = ${vault[0].id}
    `;

    let posted = 0;
    let rejected = 0;
    let replayed = 0;
    const stormKey = newId().slice(0, 8);

    for (let i = 0; i < data.count; i += 1) {
      const r = await executeTransfer(context.userId, {
        fromAccountId: vault[0].id,
        toAccountId: payroll[0].id,
        amountCents: data.amountCents,
        idempotencyKey: `storm-${stormKey}-${i}`,
        note: `storm #${i + 1}`,
      });
      if (r.ok && r.replayed) replayed += 1;
      else if (r.ok) posted += 1;
      else rejected += 1;
    }

    const after = await sql<{ balance: number }>`
      select coalesce(sum(amount_cents), 0)::int as balance
      from ledger_entries where account_id = ${vault[0].id}
    `;
    const total = await sql<{ s: number }>`
      select coalesce(sum(amount_cents), 0)::int as s
      from ledger_entries where owner_id = ${context.userId}
    `;

    return {
      attempted: data.count,
      amountCents: data.amountCents,
      posted,
      rejected,
      replayed,
      vaultBefore: before[0]?.balance ?? 0,
      vaultAfter: after[0]?.balance ?? 0,
      conserved: total[0]?.s ?? 0,
      neverNegative: (after[0]?.balance ?? 0) >= 0,
    };
  });

export const resetLedgerLab = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`delete from ledger_entries where owner_id = ${context.userId}`;
    await sql`delete from ledger_transfers where owner_id = ${context.userId}`;
    await sql`delete from ledger_accounts where owner_id = ${context.userId}`;
    await ensureSeed(sql, context.userId);
    return { ok: true };
  });
