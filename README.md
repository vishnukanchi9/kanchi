# KANCHI

[![CI](https://github.com/vishnukanchi9/kanchi/actions/workflows/ci.yml/badge.svg)](https://github.com/vishnukanchi9/kanchi/actions/workflows/ci.yml)

Engineering portfolio for [Vishnu Kanchi](https://github.com/vishnukanchi9) — backend and distributed systems.

A print-ready resume plus three live labs that implement the same contracts as the standalone services:

| Lab | Standalone repo | What it proves |
| --- | --- | --- |
| [Pulse Queue](https://github.com/vishnukanchi9/pulse-queue) | Java, Spring Boot, PostgreSQL, Redis | Ready / retry / dead-letter lanes, capped exponential backoff |
| [Ledger](https://github.com/vishnukanchi9/ledger-service) | Python, FastAPI, PostgreSQL | Double-entry posts, idempotency, ordered row locks, no overdraft |
| [Sentinel](https://github.com/vishnukanchi9/sentinel) | Python, FastAPI, WebSockets, PostgreSQL | Incident command: SEV, ack / assign / resolve, append-only timeline |

Also on GitHub: [TeamBoard](https://github.com/vishnukanchi9/teamboard), [k8s-slo-platform](https://github.com/vishnukanchi9/k8s-slo-platform), [gcp-landing-zone](https://github.com/vishnukanchi9/gcp-landing-zone), [weather-etl-pipeline](https://github.com/vishnukanchi9/weather-etl-pipeline).

## Stack

React 19, TypeScript, TanStack Start, Tailwind v4, Postgres (Neon or embedded PGLite).

## Run

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
```

No configuration is needed: the labs run against embedded PGLite as a shared
public workspace. Optional sign-in through any OpenID Connect provider, and the
optional Postgres connection, are documented in `.env.example`.

## Contact

- [vishnukanchi9@gmail.com](mailto:vishnukanchi9@gmail.com)
- [github.com/vishnukanchi9](https://github.com/vishnukanchi9)
- Newark, New Jersey
