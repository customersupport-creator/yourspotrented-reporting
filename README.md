# YourSpotRented — Weekly Reporting Tool

A web tool that turns weekly parking-enforcement CSV exports into a structured
report, a management-style AI summary, a KPI + charts dashboard, and one-click
**PDF / Excel** exports.

Built with **React + Vite + Tailwind** (frontend) and **Node + Express +
PapaParse** (backend). Column mapping and all calculation rules are
**configurable**, and the reporting engine is **modular** so new report sections
drop in without touching existing ones.

---

## Table of contents
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running](#running)
- [Sample CSV format](#sample-csv-format)
- [Configurable mapping & rules](#configurable-mapping--rules)
- [Backend API](#backend-api)
- [Adding a new report section](#adding-a-new-report-section)
- [Tests](#tests)
- [Deployment](#deployment)
- [Database (optional / future)](#database-optional--future)

---

## Features
- Drag-and-drop CSV upload with type/size validation and loading states
- Configurable column mapping + value-classification rules (admin panel)
- Modular reporting engine: Highlights, Customer Service, Net Remit, Refunds, Expenses
- Template-based **AI summary engine** (deterministic, offline; pluggable for an LLM later)
- Dashboard: 7 KPI cards + 4 charts (Violations Trend, Payments Trend, Refund Breakdown, Expense Breakdown)
- Export to **PDF** (jsPDF) and **Excel** (SheetJS), client-side
- Consistent error handling across the API

## Architecture

```
Upload → CSV Parse → Data Mapping → Reporting Engine (section registry)
                                        → AI Summary Engine
                                        → Charts
                              → Dashboard render / PDF & Excel export
```

| Module | Where |
|---|---|
| Upload | `server/src/middleware/upload.js`, `client/.../UploadDropzone.jsx` |
| CSV Parsing | `server/src/services/csvParser.js` (PapaParse) |
| Data Mapping | `server/src/services/mapper.js` |
| Reporting Engine | `server/src/engine/` (`registry.js` + `sections/*`) |
| AI Summary | `server/src/engine/summary/` (`SummaryProvider` + `TemplateSummaryProvider`) |
| Charts | `server/src/engine/charts.js` |
| Export | `client/src/services/export/` (`toPdf.js`, `toExcel.js`) |
| Dashboard | `client/src/components/dashboard/` |
| Config | `server/src/config/defaultMapping.js` + `ColumnMappingPanel.jsx` |

```
WEEK2/
├── package.json            # workspaces + run scripts
├── Dockerfile, docker-compose.yml
├── sample-data/sample-weekly.csv
├── server/                 # Express API + reporting engine + tests
└── client/                 # React + Vite + Tailwind UI
```

## Prerequisites
- **Node.js 20+** and npm. (This repo was created on a machine without Node — install it first, e.g. `brew install node` on macOS, or from https://nodejs.org.)
- PostgreSQL is **not** required for v1 (stateless).

## Setup
From the repository root:

```bash
npm install         # installs root + server + client workspaces
cp server/.env.example server/.env   # optional; defaults are fine
```

## Running

**Development** (two processes, Vite proxies `/api` → Express):
```bash
npm run dev
# client → http://localhost:5173
# server → http://localhost:4000
```

Open http://localhost:5173, drag in `sample-data/sample-weekly.csv`, click
**Generate Report**.

**Production** (single process; Express serves the built client):
```bash
npm run build       # builds client → client/dist
npm start           # serves API + client on http://localhost:4000
```

## Sample CSV format
See [`sample-data/sample-weekly.csv`](sample-data/sample-weekly.csv). Columns
match the default mapping:

| Column | Meaning |
|---|---|
| `Date` | Activity date (YYYY-MM-DD) — **required** |
| `Violation Status` | e.g. `Encoded` — **required** |
| `Payment Status` | e.g. `Paid`, `Settled`, `Unpaid` |
| `Towing Status` | e.g. `Towed` |
| `Refund Status` | e.g. `Approved-Processed`, `Approved-Pending` |
| `Customer Service` | e.g. `Inquiry`, `Complaint`, `Request` |
| `Expense Category` | e.g. `Fuel`, `Supplies` (presence marks an expense row) |
| `Amount` | Generic amount (fallback for expenses) |
| `Net Remit` | Net remittance amount |
| `Refund Amount` | Refund/reimbursement amount |
| `Expense Amount` | Expense amount |
| `Notes` | Free-text notes |

The CSV layout can vary — remap any column in the **Column mapping (admin)**
panel before generating, or change the defaults in
`server/src/config/defaultMapping.js`.

## Configurable mapping & rules
One `ReportConfig` object (`server/src/config/defaultMapping.js`) drives the
whole pipeline:
- `columnMap` — logical field → CSV header name
- `rules` — keyword lists (case-insensitive) that classify status values
  (`towed`, `paid`, `encoded`, `refundProcessed`, `refundPending`, `csIndicators`)
- `formulas` — how a metric aggregates, e.g.
  `netRemit: { field: 'netRemitAmount', agg: 'sum', filter: { paymentStatus: 'paid' } }`
- `requiredFields`, `currency`, `dateGrouping`

The client fetches it from `GET /api/config/default`, lets an admin edit it, and
sends the edited copy with the generate request.

## Backend API

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/health` | — | `{ status: "ok" }` |
| GET | `/api/config/default` | — | `{ config, sections }` |
| POST | `/api/csv/preview` | multipart `file` | `{ headers, rows, rowCount }` |
| POST | `/api/reports/generate` | multipart `file` + `config` (JSON string, optional) | `{ meta, sections, charts, summary }` |

Errors are uniform: `{ "error": { "code", "message", "details?" } }`
(`400` bad/empty/missing file, `422` missing mapped columns, `500` unexpected).

Example:
```bash
curl -F "file=@sample-data/sample-weekly.csv" http://localhost:4000/api/reports/generate
```

## Adding a new report section
1. Create `server/src/engine/sections/mySection.js` exporting
   `{ key, title, compute(rows, config) }`.
2. Register it in `server/src/engine/index.js`:
   `createRegistry([... , mySection])`.
3. (Optional) surface it in `ReportView.jsx`.

Sections only read normalized `rows` + `config`, so they never affect each other.

## Tests
```bash
npm test            # runs the server Jest + supertest suite
```
Covers: column mapping & classification, each section's math, the summary
narrative (incl. zero-value omission & pluralization), and the
`/api/reports/generate` endpoint (200 / 400 / 422 / custom config).

## Deployment
- **Single service (Render / Railway / Fly):** build the client and run the
  server (it serves `client/dist`). Set `NODE_ENV=production`, `PORT`. Start
  command: `npm run build && npm start`.
- **Docker:** `docker compose up --build` → app on `:4000`.

## Database (optional / future)
v1 is stateless. To enable persistence later: provision PostgreSQL, apply
`server/db/schema.sql`, set `PERSIST=true` and `DATABASE_URL`, and wire a `pg`
client into the report route. The `db` service in `docker-compose.yml` is
pre-written (commented out) for this.
```
psql "$DATABASE_URL" -f server/db/schema.sql
```
