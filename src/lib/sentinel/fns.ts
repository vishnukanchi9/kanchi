import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { optionalAuthMiddleware } from "@/lib/auth/optional";
import { newId } from "@/lib/ids";

export type ServiceStatus = "healthy" | "degraded" | "down";
export type Severity = "SEV1" | "SEV2" | "SEV3" | "SEV4";
export type IncidentStatus = "open" | "acked" | "resolved";

export type SentinelService = {
  id: string;
  name: string;
  slug: string;
  status: ServiceStatus;
};

export type SentinelIncident = {
  id: string;
  service_id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  assignee: string | null;
  opened_at: string;
  resolved_at: string | null;
};

export type SentinelEvent = {
  id: string;
  incident_id: string;
  kind: string;
  message: string;
  actor: string;
  created_at: string;
};

const SERVICE_SEED = [
  { name: "billing-api", slug: "billing-api", status: "healthy" as const },
  { name: "checkout", slug: "checkout", status: "degraded" as const },
  { name: "identity", slug: "identity", status: "healthy" as const },
  { name: "workers", slug: "workers", status: "healthy" as const },
  { name: "edge", slug: "edge", status: "healthy" as const },
];

async function recordEvent(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  incidentId: string,
  kind: string,
  message: string,
  actor = "system",
) {
  await sql`
    insert into sentinel_events (id, owner_id, incident_id, kind, message, actor)
    values (${newId()}, ${ownerId}, ${incidentId}, ${kind}, ${message}, ${actor})
  `;
}

async function refreshServiceStatus(
  sql: Awaited<ReturnType<typeof getSql>>,
  ownerId: string,
  serviceId: string,
) {
  const open = await sql<{ severity: Severity }>`
    select severity from sentinel_incidents
    where owner_id = ${ownerId}
      and service_id = ${serviceId}
      and status <> 'resolved'
    order by case severity
      when 'SEV1' then 1 when 'SEV2' then 2 when 'SEV3' then 3 else 4 end
    limit 1
  `;
  let status: ServiceStatus = "healthy";
  if (open[0]?.severity === "SEV1") status = "down";
  else if (open[0]) status = "degraded";
  await sql`
    update sentinel_services set status = ${status}
    where id = ${serviceId} and owner_id = ${ownerId}
  `;
}

async function ensureSeed(sql: Awaited<ReturnType<typeof getSql>>, ownerId: string) {
  const existing = await sql<{ n: number }>`
    select count(*)::int as n from sentinel_services where owner_id = ${ownerId}
  `;
  if ((existing[0]?.n ?? 0) > 0) return;

  const ids: Record<string, string> = {};
  for (const svc of SERVICE_SEED) {
    const id = newId();
    ids[svc.slug] = id;
    await sql`
      insert into sentinel_services (id, owner_id, name, slug, status)
      values (${id}, ${ownerId}, ${svc.name}, ${svc.slug}, ${svc.status})
    `;
  }

  const incidentId = newId();
  await sql`
    insert into sentinel_incidents
      (id, owner_id, service_id, title, severity, status, assignee)
    values
      (${incidentId}, ${ownerId}, ${ids.checkout},
       'Checkout p95 above 800ms', 'SEV2', 'acked', 'oncall')
  `;
  await recordEvent(sql, ownerId, incidentId, "opened", "Error budget burn on checkout latency", "pager");
  await recordEvent(sql, ownerId, incidentId, "acked", "Acknowledged — investigating upstream cache", "oncall");
  await refreshServiceStatus(sql, ownerId, ids.checkout);
}

export const getSentinelSnapshot = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureSeed(sql, context.userId);

    const services = await sql<SentinelService>`
      select id, name, slug, status
      from sentinel_services
      where owner_id = ${context.userId}
      order by name
    `;
    const incidents = await sql<SentinelIncident>`
      select id, service_id, title, severity, status, assignee,
             opened_at::text, resolved_at::text
      from sentinel_incidents
      where owner_id = ${context.userId}
      order by
        case status when 'open' then 0 when 'acked' then 1 else 2 end,
        case severity when 'SEV1' then 1 when 'SEV2' then 2 when 'SEV3' then 3 else 4 end,
        opened_at desc
      limit 40
    `;
    const events = await sql<SentinelEvent>`
      select id, incident_id, kind, message, actor, created_at::text
      from sentinel_events
      where owner_id = ${context.userId}
      order by created_at desc
      limit 80
    `;
    return { services, incidents, events, owner: context.userId };
  });

export const openIncident = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { serviceId: string; title: string; severity: string }) => {
    const sev = input.severity as Severity;
    if (!["SEV1", "SEV2", "SEV3", "SEV4"].includes(sev)) throw new Error("Invalid severity");
    const title = input.title.trim().slice(0, 140);
    if (!title) throw new Error("Title required");
    return { serviceId: input.serviceId, title, severity: sev };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureSeed(sql, context.userId);
    const svc = await sql<{ id: string; name: string }>`
      select id, name from sentinel_services
      where id = ${data.serviceId} and owner_id = ${context.userId}
      limit 1
    `;
    if (!svc[0]) throw new Error("Unknown service");
    const id = newId();
    await sql`
      insert into sentinel_incidents
        (id, owner_id, service_id, title, severity, status)
      values
        (${id}, ${context.userId}, ${data.serviceId}, ${data.title}, ${data.severity}, 'open')
    `;
    await recordEvent(
      sql,
      context.userId,
      id,
      "opened",
      `${data.severity} on ${svc[0].name}: ${data.title}`,
      "pager",
    );
    await refreshServiceStatus(sql, context.userId, data.serviceId);
    return { id };
  });

export const updateIncident = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { id: string; action: "ack" | "assign" | "resolve"; assignee?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<SentinelIncident>`
      select id, service_id, title, severity, status, assignee,
             opened_at::text, resolved_at::text
      from sentinel_incidents
      where id = ${data.id} and owner_id = ${context.userId}
      limit 1
    `;
    const inc = rows[0];
    if (!inc) throw new Error("Incident not found");

    if (data.action === "ack") {
      if (inc.status === "resolved") return { ok: true };
      await sql`
        update sentinel_incidents set status = 'acked'
        where id = ${inc.id} and owner_id = ${context.userId}
      `;
      await recordEvent(sql, context.userId, inc.id, "acked", "Acknowledged", "oncall");
    } else if (data.action === "assign") {
      const who = (data.assignee ?? "oncall").trim().slice(0, 40) || "oncall";
      await sql`
        update sentinel_incidents set assignee = ${who}
        where id = ${inc.id} and owner_id = ${context.userId}
      `;
      await recordEvent(sql, context.userId, inc.id, "assigned", `Assigned to ${who}`, "oncall");
    } else if (data.action === "resolve") {
      await sql`
        update sentinel_incidents
        set status = 'resolved', resolved_at = now()
        where id = ${inc.id} and owner_id = ${context.userId}
      `;
      await recordEvent(sql, context.userId, inc.id, "resolved", "Incident closed", "oncall");
    }

    await refreshServiceStatus(sql, context.userId, inc.service_id);
    return { ok: true };
  });

const PAGES = [
  { slug: "billing-api", severity: "SEV1" as const, title: "Billing 5xx spike — charge path failing" },
  { slug: "identity", severity: "SEV2" as const, title: "Login latency — token service timeouts" },
  { slug: "workers", severity: "SEV2" as const, title: "Job lag — retry queue depth climbing" },
  { slug: "edge", severity: "SEV3" as const, title: "TLS handshake errors on a single POP" },
];

export const simulatePage = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureSeed(sql, context.userId);
    const pick = PAGES[Math.floor(Math.random() * PAGES.length)];
    const svc = await sql<{ id: string }>`
      select id from sentinel_services
      where owner_id = ${context.userId} and slug = ${pick.slug}
      limit 1
    `;
    if (!svc[0]) throw new Error("Service missing");
    const id = newId();
    await sql`
      insert into sentinel_incidents
        (id, owner_id, service_id, title, severity, status)
      values
        (${id}, ${context.userId}, ${svc[0].id}, ${pick.title}, ${pick.severity}, 'open')
    `;
    await recordEvent(sql, context.userId, id, "opened", `PagerDuty: ${pick.title}`, "pager");
    await refreshServiceStatus(sql, context.userId, svc[0].id);
    return { id, title: pick.title, severity: pick.severity };
  });

export const resetSentinelLab = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`delete from sentinel_events where owner_id = ${context.userId}`;
    await sql`delete from sentinel_incidents where owner_id = ${context.userId}`;
    await sql`delete from sentinel_services where owner_id = ${context.userId}`;
    await ensureSeed(sql, context.userId);
    return { ok: true };
  });
