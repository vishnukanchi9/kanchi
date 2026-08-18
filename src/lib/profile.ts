export const profile = {
  name: "Vishnu Kanchi",
  first: "Vishnu",
  last: "Kanchi",
  mark: "VK",
  title: "Software Engineer",
  focus: "Backend & Distributed Systems",
  location: "Newark, New Jersey",
  phone: "+1 551 392 4069",
  phoneHref: "tel:+15513924069",
  email: "vishnukanchi9@gmail.com",
  emailHref: "mailto:vishnukanchi9@gmail.com",
  x: "vishnu77_7",
  xHref: "https://x.com/vishnu77_7",
  github: "vishnukanchi9",
  githubHref: "https://github.com/vishnukanchi9",
  summary:
    "Software engineer with 2+ years supporting production systems and building backend applications in Java and Python. Experienced with REST APIs, transactional data models, distributed job processing, and live service consoles. Brings incident-response discipline — structured diagnosis, postmortems, runbooks — to designing software that stays correct under load.",
  heroLead: "I build backend systems that stay correct under load.",
  heroBody:
    "Queues, ledgers, and incident consoles — designed the way production actually fails. Try the labs, or read the resume.",
} as const;

export const skills = [
  {
    label: "Languages",
    items: ["Java", "Python", "TypeScript", "SQL", "Bash"],
  },
  {
    label: "Backend",
    items: ["Spring Boot", "FastAPI", "REST APIs", "WebSockets", "SQLAlchemy", "Pydantic"],
  },
  {
    label: "Data & messaging",
    items: ["PostgreSQL", "Redis", "SQLite", "BigQuery", "transactions", "Flyway", "Alembic"],
  },
  {
    label: "Cloud & delivery",
    items: ["Docker", "Kubernetes", "GCP", "AWS", "Terraform", "GitHub Actions", "Prometheus", "Grafana"],
  },
] as const;

export const experience = [
  {
    role: "Senior Analyst",
    company: "VisionSoft Inc.",
    place: "New Jersey",
    start: "Jun 2026",
    end: "Present",
    bullets: [
      "Configure Salesforce AI agents on the Hermis platform to automate incident triage and resolution workflows.",
      "Automate Salesforce CRM configuration so environments deploy consistently, without hand-tuned setup.",
      "Build and support SAP-to-Salesforce integrations that keep enterprise data flowing between systems.",
    ],
  },
  {
    role: "Senior Systems Engineer",
    company: "Infosys",
    place: "Hyderabad, India",
    start: "Sep 2021",
    end: "Feb 2024",
    bullets: [
      "Resolved production incidents across Compute Engine, GKE, Cloud Storage, and IAM — structured diagnosis and RCA that shortened recovery.",
      "Led multi-service outage investigations with customers and engineering teams, then shipped permanent fixes instead of one-off restarts.",
      "Authored postmortems and runbooks that made on-call troubleshooting consistent and reduced repeat escalations.",
    ],
  },
] as const;

export const projects = [
  {
    slug: "pulse",
    href: "/work/pulse",
    index: "01",
    name: "Pulse Queue",
    stack: ["Java", "Spring Boot", "PostgreSQL", "Redis", "Docker"],
    blurb:
      "Distributed task queue with a split API and worker, Postgres-backed job state, and Redis ready / retry / dead-letter lanes.",
    bullets: [
      "Separate API and worker processes; PostgreSQL holds job state; Redis backs ready, retry, and dead-letter queues; Flyway migrations.",
      "Capped exponential backoff, full job lifecycle, a live operations dashboard, and CI that tests and builds the production image on every push.",
    ],
    lab:
      "Enqueue work, watch the worker claim it, fail a job on purpose, and see it land in retry — then dead-letter — with the backoff schedule visible.",
    github: "https://github.com/vishnukanchi9/pulse-queue",
  },
  {
    slug: "ledger",
    href: "/work/ledger",
    index: "02",
    name: "Ledger",
    stack: ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "Alembic"],
    blurb:
      "Double-entry transfer API with idempotent requests, ordered row locks, an immutable journal, and no-overdraft protection.",
    bullets: [
      "Idempotent transfer requests, deadlock-free ordered row locking, immutable journal entries, and a balance check that refuses an overdraft.",
      "Correctness suite: 120 transfers conserve money, 30 simultaneous withdrawals never overdraw, and 8 parallel retries post exactly once.",
    ],
    lab:
      "Move money between accounts, replay the same idempotency key, then fire the withdrawal storm and watch the vault refuse to go negative.",
    github: "https://github.com/vishnukanchi9/ledger-service",
  },
  {
    slug: "sentinel",
    href: "/work/sentinel",
    index: "03",
    name: "Sentinel",
    stack: ["Python", "FastAPI", "WebSockets", "PostgreSQL", "Docker"],
    blurb:
      "Live incident command console — service health, SEV-ranked incidents, and an immutable event timeline.",
    bullets: [
      "Service health grid with live status, SEV1–SEV4 incidents, and acknowledge / assign / resolve actions that write an append-only timeline.",
      "Built from on-call habits: declare fast, keep a single source of truth, and leave a record you can postmortem from.",
    ],
    lab:
      "Page a service, acknowledge the incident, walk the timeline, and close it. The event log does not rewrite history.",
    github: "https://github.com/vishnukanchi9/kanchi",
  },
] as const;

export const education = [
  {
    school: "Stevens Institute of Technology",
    place: "Hoboken, NJ",
    credential: "M.S. Computer Science",
    detail: "GPA 3.83 / 4.0",
    end: "May 2026",
  },
  {
    school: "GITAM University",
    place: "Hyderabad, India",
    credential: "B.Tech Computer Science",
    detail: "GPA 7.28 / 10",
    end: "Jun 2021",
  },
] as const;

export const certifications = [
  {
    name: "Google Associate Cloud Engineer",
    issuer: "Google Cloud Certified",
  },
] as const;
