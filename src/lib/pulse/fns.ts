import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { optionalAuthMiddleware } from "@/lib/auth/optional";
import { newId } from "@/lib/ids";

export type JobKind = "echo" | "fail" | "slow" | "poison";
export type JobStatus = "ready" | "running" | "retry" | "succeeded" | "dead";

export type PulseJob = {
  id: string;
  owner_id: string;
  kind: JobKind;
  payload: string;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  run_at: string;
  started_at: string | null;
  finished_at: string | null;
  last_error: string | null;
  created_at: string;
};

export type PulseEvent = {
  id: string;
  job_id: string;
  kind: string;
  detail: string;
  created_at: string;
};

const KINDS: JobKind[] = ["echo", "fail", "slow", "poison"];

function backoffSeconds(attempts: number) {
  return Math.min(30, 2 ** Math.max(1, attempts));
}

async function recordEvent(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  jobId: string,
  kind: string,
  detail: string,
) {
  await sql`
    insert into pulse_events (id, owner_id, job_id, kind, detail)
    values (${newId()}, ${ownerId}, ${jobId}, ${kind}, ${detail})
  `;
}

async function ensureSeed(sql: Awaited<ReturnType<typeof getSql>>, ownerId: string) {
  const existing = await sql<{ n: number }>`
    select count(*)::int as n from pulse_jobs where owner_id = ${ownerId}
  `;
  if ((existing[0]?.n ?? 0) > 0) return;

  const samples: Array<{ kind: JobKind; payload: string; status: JobStatus; attempts: number }> = [
    { kind: "echo", payload: "health-check", status: "succeeded", attempts: 1 },
    { kind: "echo", payload: "nightly-report", status: "ready", attempts: 0 },
    { kind: "fail", payload: "flaky-webhook", status: "retry", attempts: 1 },
    { kind: "slow", payload: "reindex-search", status: "ready", attempts: 0 },
  ];

  for (const sample of samples) {
    const id = newId();
    const finished = sample.status === "succeeded" ? new Date().toISOString() : null;
    await sql`
      insert into pulse_jobs
        (id, owner_id, kind, payload, status, attempts, max_attempts, finished_at)
      values
        (${id}, ${ownerId}, ${sample.kind}, ${sample.payload}, ${sample.status},
         ${sample.attempts}, 3, ${finished})
    `;
    await recordEvent(sql, ownerId, id, "enqueued", `kind=${sample.kind}`);
    if (sample.status === "succeeded") {
      await recordEvent(sql, ownerId, id, "succeeded", "seeded success");
    } else if (sample.status === "retry") {
      await recordEvent(sql, ownerId, id, "failed", "upstream 503 — will retry");
    }
  }
}

export const getPulseSnapshot = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureSeed(sql, context.userId);
    const jobs = await sql<PulseJob>`
      select id, owner_id, kind, payload, status, attempts, max_attempts,
             run_at::text, started_at::text, finished_at::text, last_error,
             created_at::text
      from pulse_jobs
      where owner_id = ${context.userId}
      order by created_at desc
      limit 80
    `;
    const countsRows = await sql<{ status: string; n: number }>`
      select status, count(*)::int as n
      from pulse_jobs
      where owner_id = ${context.userId}
      group by status
    `;
    const counts: Record<string, number> = {};
    for (const row of countsRows) counts[row.status] = row.n;
    return { jobs, counts, owner: context.userId };
  });

export const enqueuePulseJob = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { kind: string; payload?: string }) => {
    if (!KINDS.includes(input.kind as JobKind)) throw new Error("Unknown job kind");
    return {
      kind: input.kind as JobKind,
      payload: (input.payload ?? "").trim().slice(0, 200),
    };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureSeed(sql, context.userId);
    const id = newId();
    const payload = data.payload || defaultPayload(data.kind);
    await sql`
      insert into pulse_jobs (id, owner_id, kind, payload, status, max_attempts)
      values (${id}, ${context.userId}, ${data.kind}, ${payload}, 'ready', 3)
    `;
    await recordEvent(sql, context.userId, id, "enqueued", `kind=${data.kind}`);
    return { id };
  });

function defaultPayload(kind: JobKind) {
  switch (kind) {
    case "echo":
      return "ping";
    case "fail":
      return "flaky-partner";
    case "slow":
      return "rebuild-index";
    case "poison":
      return "bad-payload";
  }
}

export const tickPulseWorker = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureSeed(sql, context.userId);

    await sql`
      update pulse_jobs
      set status = 'ready'
      where owner_id = ${context.userId}
        and status = 'retry'
        and run_at <= now()
    `;

    const claimed = await sql<PulseJob>`
      select id, owner_id, kind, payload, status, attempts, max_attempts,
             run_at::text, started_at::text, finished_at::text, last_error,
             created_at::text
      from pulse_jobs
      where owner_id = ${context.userId}
        and status = 'ready'
        and run_at <= now()
      order by created_at asc
      limit 3
    `;

    const processed: Array<{ id: string; result: string }> = [];

    for (const job of claimed) {
      await sql`
        update pulse_jobs
        set status = 'running', started_at = now(), attempts = attempts + 1
        where id = ${job.id} and owner_id = ${context.userId}
      `;
      await recordEvent(sql, context.userId, job.id, "claimed", `attempt ${job.attempts + 1}`);

      const outcome = evaluateJob(job.kind, job.attempts + 1);

      if (outcome === "ok") {
        await sql`
          update pulse_jobs
          set status = 'succeeded', finished_at = now(), last_error = null
          where id = ${job.id}
        `;
        await recordEvent(sql, context.userId, job.id, "succeeded", "worker completed");
        processed.push({ id: job.id, result: "succeeded" });
        continue;
      }

      const attempts = job.attempts + 1;
      if (attempts >= job.max_attempts) {
        await sql`
          update pulse_jobs
          set status = 'dead', finished_at = now(), last_error = ${outcome}
          where id = ${job.id}
        `;
        await recordEvent(sql, context.userId, job.id, "dead", outcome);
        processed.push({ id: job.id, result: "dead" });
      } else {
        const wait = backoffSeconds(attempts);
        await sql`
          update pulse_jobs
          set status = 'retry',
              last_error = ${outcome},
              run_at = now() + (${wait} || ' seconds')::interval
          where id = ${job.id}
        `;
        await recordEvent(
          sql,
          context.userId,
          job.id,
          "retry",
          `${outcome} — backoff ${wait}s`,
        );
        processed.push({ id: job.id, result: `retry ${wait}s` });
      }
    }

    return { processed, claimed: claimed.length };
  });

function evaluateJob(kind: JobKind, attempt: number): "ok" | string {
  if (kind === "echo") return "ok";
  if (kind === "slow") return attempt >= 2 ? "ok" : "still working";
  if (kind === "fail") return attempt >= 3 ? "ok" : "upstream 503";
  return "unrecoverable: malformed payload";
}

export const getPulseJob = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const jobs = await sql<PulseJob>`
      select id, owner_id, kind, payload, status, attempts, max_attempts,
             run_at::text, started_at::text, finished_at::text, last_error,
             created_at::text
      from pulse_jobs
      where id = ${id} and owner_id = ${context.userId}
      limit 1
    `;
    const job = jobs[0];
    if (!job) return null;
    const events = await sql<PulseEvent>`
      select id, job_id, kind, detail, created_at::text
      from pulse_events
      where job_id = ${id} and owner_id = ${context.userId}
      order by created_at asc
    `;
    return { job, events };
  });

export const resetPulseLab = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`delete from pulse_events where owner_id = ${context.userId}`;
    await sql`delete from pulse_jobs where owner_id = ${context.userId}`;
    await ensureSeed(sql, context.userId);
    return { ok: true };
  });
