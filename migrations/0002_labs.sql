-- Pulse Queue, Ledger, and Sentinel lab tables.
-- Per-owner isolation: guests share owner_id = 'public'.

create table if not exists pulse_jobs (
  id            text primary key,
  owner_id      text not null,
  kind          text not null,
  payload       text not null default '',
  status        text not null,
  attempts      integer not null default 0,
  max_attempts  integer not null default 3,
  run_at        timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  last_error    text,
  created_at    timestamptz not null default now()
);
create index if not exists pulse_jobs_owner_status_idx
  on pulse_jobs (owner_id, status, run_at);
create index if not exists pulse_jobs_owner_created_idx
  on pulse_jobs (owner_id, created_at desc);

create table if not exists pulse_events (
  id         text primary key,
  owner_id   text not null,
  job_id     text not null references pulse_jobs(id) on delete cascade,
  kind       text not null,
  detail     text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists pulse_events_job_idx
  on pulse_events (job_id, created_at);

create table if not exists ledger_accounts (
  id         text primary key,
  owner_id   text not null,
  name       text not null,
  kind       text not null default 'asset',
  currency   text not null default 'USD',
  created_at timestamptz not null default now()
);
create index if not exists ledger_accounts_owner_idx
  on ledger_accounts (owner_id);

create table if not exists ledger_transfers (
  id              text primary key,
  owner_id        text not null,
  idempotency_key text not null,
  from_account    text not null,
  to_account      text not null,
  amount_cents    integer not null,
  status          text not null,
  note            text not null default '',
  created_at      timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);
create index if not exists ledger_transfers_owner_idx
  on ledger_transfers (owner_id, created_at desc);

create table if not exists ledger_entries (
  id            text primary key,
  owner_id      text not null,
  transfer_id   text not null references ledger_transfers(id) on delete cascade,
  account_id    text not null references ledger_accounts(id),
  amount_cents  integer not null,
  created_at    timestamptz not null default now()
);
create index if not exists ledger_entries_account_idx
  on ledger_entries (account_id);
create index if not exists ledger_entries_owner_idx
  on ledger_entries (owner_id, created_at desc);

create table if not exists sentinel_services (
  id         text primary key,
  owner_id   text not null,
  name       text not null,
  slug       text not null,
  status     text not null default 'healthy',
  created_at timestamptz not null default now()
);
create index if not exists sentinel_services_owner_idx
  on sentinel_services (owner_id);

create table if not exists sentinel_incidents (
  id          text primary key,
  owner_id    text not null,
  service_id  text not null references sentinel_services(id),
  title       text not null,
  severity    text not null,
  status      text not null,
  assignee    text,
  opened_at   timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists sentinel_incidents_owner_idx
  on sentinel_incidents (owner_id, opened_at desc);

create table if not exists sentinel_events (
  id           text primary key,
  owner_id     text not null,
  incident_id  text not null references sentinel_incidents(id) on delete cascade,
  kind         text not null,
  message      text not null,
  actor        text not null default 'system',
  created_at   timestamptz not null default now()
);
create index if not exists sentinel_events_incident_idx
  on sentinel_events (incident_id, created_at);
