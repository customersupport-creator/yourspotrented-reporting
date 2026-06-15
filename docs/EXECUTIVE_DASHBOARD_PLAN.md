# Weekly Operations Executive Dashboard — Implementation Plan

Goal: recreate the uploaded executive dashboard design as accurately as possible,
on top of the existing app (same upload → combine → report → WYSIWYG-PDF flow).

## Scope & exclusions

**EXCLUDED entirely** (per request — do not build, no data models, no UI, no PDF):
- Agent Performance table, Agent Scorecards, Individual Agent Metrics
- Employee Monitoring, Productivity Tracking, Workforce Analytics
- Any agent-level KPI/chart/table (e.g. "cases by agent", "share of total", the
  `ASSISTED BY` breakdown). `ASSISTED BY` is used ONLY as a sheet marker, never
  surfaced as a metric.

**IN scope:** Executive Overview, Financial Performance, Customer Service
Performance (minus agents), Operations & Enforcement, Key Performance Indicators,
Anomalies/Risks/Opportunities, header/footer, WYSIWYG PDF.

---

## 1. Data flows (source sheet → metric)

All metrics derive from the already-supported multi-file upload. Each section is
routed to its authoritative sheet (the routing pattern already used for
Parkpliant / tow log / expenses / CS).

| Section / metric | Source sheet (marker column) | Derivation |
|---|---|---|
| **Revenue** (Total/Transient/Monthly, counts, avg/res) | Reservation exports — SpotHero `…Reservations….csv` (`Remit Amount`,`Reservation Type`), `bookings.csv` (`Net Price`), `account-reserved.csv` (`amount charged`) | Sum remit/net by `Reservation Type` → Transient vs Monthly; counts = rows; avg = total ÷ count |
| **Enforcement Revenue / Parkpliant Collections** | `PARKPLIANTVIOLATIONS` (`Violation Notice number`) | Encoded = Σ `Violation Amount`; Collections = Σ amount where Status=Paid/Settlement date |
| **Refund Impact** (issued, rate) | `Refunds&Reimbursement` (`Reason Category`/`Endorsed by`) | Issued = row count; rate = issued ÷ total reservations |
| **Expenses** | `Management expenses` (`PURPOSE`) | already implemented (Management-only) |
| **CS: total/resolved/FRT/instant/peak/daily** | `CustomerTrackingSheet2026` (`REASON FOR CONTACT CATEGORY`) | total=rows(583); resolved=`STATUS`~Resolved(581→99.7%); FRT avg/max/≤5/=0 from `FRT`; daily=total÷days |
| **CS: Daily Case Volume** | same | group rows by `DATE` weekday |
| **CS: Contact Channel** | same (`SOURCE`) | Ring Central / CSR Gvoice / Main Gvoice counts |
| **CS: Top Contact Reasons** | same (`REASON FOR CONTACT CATEGORY`) | top-N counts |
| **CS: Resolution Outcomes** | same (`ACTION TAKEN CATEGORY`) | No Response/Confirmed/Relocated/Parked/Cancelled/Refunded/Other |
| **Lot-Full** (incidents, relocations, success rate) | same | incidents = rows where reason ~ "lot full"; relocations = those with `ACTION TAKEN`~Relocated; rate = relocations ÷ incidents |
| **Enforcement: encoded/towed/conversion** | Parkpliant + tow log | encoded(11), towed(4 by license plate), conversion = towed÷encoded |
| **Tow Activity Log table** | `TOWED ILLEGAL PARKER` / `SUCCESSFULTOWLOG` | rows: Date, License Plate, Facility, Towing Company |
| **KPIs** (rev/day, res/day, resolution, instant, retention, refund rate) | derived from the above | simple ratios |

**Verified against real data** (CustomerTrackingSheet2026.csv → matches design
exactly): SOURCE 479/78/26, resolved 581 (99.7%), FRT avg 1.33 / peak 105 /
instant 439 (75.3%) / ≤5min 563 (96.6%), outcomes 291/145/37/34/12/9.

**Data caveat — Revenue:** the design's $194,804 / 7,308 reservations come from a
FULL reservation export. The reservation CSVs currently in hand are weekly slices
(6 + 263 + 170 rows). Revenue cards will compute correctly from whatever
reservation file(s) are uploaded, but to reproduce the exact $194,804 the
complete reservations export for the period must be uploaded. Everything else
(CS, enforcement, expenses, refunds, Parkpliant) reproduces exactly from the
sheets already used.

---

## 2. Backend changes (engine — additive, behind the existing routing)

New config marker fields + autoMap synonyms (same EXACT_ONLY pattern):
- `reservationType` ← "Reservation Type"; `remitAmount`(exists)/`salesPrice` ← "Remit Amount"/"Sales Price"/"Net Price"/"amount charged"  → marks a **reservation source**.
- CS detail fields: `csChannel` ← "SOURCE", `csFrt` ← "FRT", `csStatus` ← "STATUS", `csAction` ← "ACTION TAKEN CATEGORY", `csReservationType` ← "RESERVATION TYPE" (CS sheet already marked via `csReasonCategory`).

New engine section modules (registered in `engine/index.js`, each pure
`(rows,cfg)→result`, sheet-scoped via `_reservationSource` / `_csSource`):
- `engine/sections/revenue.js` → `{ totalNet, transient:{revenue,count}, monthly:{revenue,count}, avgPerReservation, enforcementRevenue, parkpliantCollections, refundsIssued, refundRate }`
- `engine/sections/serviceAnalytics.js` → `{ total, resolved, resolutionRate, frt:{avg,instantPct,under5Pct,peak}, daily:{avg, byDay:[{day,count}]}, channels:[{source,count}], topReasons:[…], outcomes:[…] }`
- `engine/sections/lotFull.js` → `{ incidents, relocations, successRate, breakdown:[{outcome,count}] }`
- extend `engine/sections/enforcement` (new) or `highlights` → `{ encoded, paid, towed, towConversion, towLog:[{date,plate,facility,company}] }`
- `engine/kpis.js` → derived ratios for section 5.

`combine.js`: add `_reservationSource` flag (has `reservationType`/remit columns).
`charts.js`: add datasets for revenue composition, reservation volume, revenue by
segment, refund impact, daily case volume, contact channel, top reasons,
resolution outcomes, enforcement funnel, lot-full breakdown.

No agent aggregation is computed anywhere.

`generateReport` response gains: `sections.revenue`, `sections.serviceAnalytics`,
`sections.lotFull`, `sections.enforcement`, `sections.kpis`, plus the new chart
datasets. Existing sections unchanged → no regression.

---

## 3. Page structure (top → bottom, matches the design)

1. **Header band** (dark navy gradient, white text): "YOURSPOT RENTED" · "Weekly
   Operations Executive Dashboard" · "Reporting Period …" · "Prepared …" pill.
2. **Executive Summary** card (blue left-accent) — narrative summary.
3. **① Executive Overview** — 6 KPI cards: Total Net Revenue (blue), Transient
   Revenue (blue), Monthly Revenue (blue), Avg Revenue/Reservation (green),
   Enforcement Revenue (green), Parkpliant Collections (orange). + 2 stat cards
   (violations encoded; “1 of 11 paid • 9.1%”).
4. **② Financial Performance** — KPI row (Gross Revenue, Refunds Issued, Refund
   Rate, Monthly Rev Share); charts: Revenue Composition (donut), Reservation
   Volume by Type (donut), Revenue by Segment (horizontal bar), Refund Impact
   (donut); Management Commentary callout.
5. **③ Customer Service Performance** — KPI row (Total Cases, Resolved, Avg First
   Response, Under-5-min FRT, Daily Average, Peak FRT); charts: Daily Case Volume
   (bar, midweek highlighted), Contact Channel Distribution (donut), Top 10
   Contact Reasons (horizontal bar), Resolution Outcomes (donut); **NO agent
   table**; Service Performance Commentary.
6. **④ Operations & Enforcement** — KPI row (Encoded, Towed, Tow Conversion,
   Lot-Full Relocations, Lot-Full Incidents, Relocation Success Rate); charts:
   Enforcement Funnel (bar), Lot-Full Resolution Breakdown (donut), Tow Activity
   Log (table); Operations Commentary.
7. **⑤ Key Performance Indicators** — 6 KPI cards (Revenue/Day, Reservations/Day,
   Service Resolution Rate, Instant Response Rate, Customer Retention (Lot-Full),
   Refund Rate); **Anomalies, Risks & Opportunities** insight cards.
8. **Footer** — confidential line + generated/period dates.

---

## 4. UI components

Reuse existing executive primitives (`ExecPrimitives.jsx`): `KpiCard`, `KpiGrid`,
`Section`, `Panel`, `SummaryCard`, `Commentary`, `InsightCard` — all already
carry `data-pdf-block` for the WYSIWYG export.

Additions:
- `KpiCard`: add optional `accent` prop → colored **top border** strip
  (`border-t-4 border-t-{tone}`) to match the design’s card tops.
- New header component `ExecHeader` with the **navy gradient**
  (`bg-gradient-to-r from-slate-900 to-slate-800`, white text, “Prepared” pill).
- `DataTable` (Tow Activity Log) — simple styled table (no agent variant).
- `Donut`, horizontal/vertical `BarChart`, `LineChart` via Recharts (existing).

All new sections render inside the existing `#report-capture` container, so the
PDF export already covers them with smart page breaks — no export changes needed.

---

## 5. Styling

- **Header:** dark navy gradient, white headings, uppercase tracked “YOURSPOT
  RENTED”, light-gray subtitle, bordered “Prepared” pill.
- **Cards:** white, `rounded-xl`, subtle border + shadow, **colored top-border
  accent** per tone, uppercase gray label, large `font-extrabold` colored value,
  small gray sub-text.
- **Tones:** blue `#2563eb` (revenue), emerald `#16a34a` (rates/positive), amber
  `#f59e0b` (Parkpliant/warnings), violet `#7c3aed` (CS volume), slate `#1e293b`,
  red `#ef4444` (risk).
- **Donut palette:** blue / light-blue / green / violet / amber / red / teal /
  slate. Daily Case Volume: midweek bars darker blue, weekend bars slate.
- **Section headers:** dark navy index chip + bold title.
- **Commentary / Insight:** left-accent callouts (slate / amber / red / green).
- Body background slate-50; max width container; generous spacing.

---

## 6. Implementation phases (suggested order)

1. **CS Performance section** (highest value, fully verified from one sheet) —
   backend `serviceAnalytics.js` + charts + UI section. Reproduces exactly.
2. **Operations & Enforcement** — enforcement funnel, tow log table, lot-full.
3. **Financial Performance + Executive Overview revenue** — reservation section
   (needs reservation export); refund impact; composition charts.
4. **KPIs + Anomalies/Risks/Opportunities** — derived ratios + insight cards.
5. **Header gradient + card top-accents** styling polish.
6. Verify WYSIWYG PDF across the longer multi-page report.

Each phase: add engine module + tests, extend charts, add UI section, rebuild,
verify against the real sheets.

---

## 7. Notes

- Backup of pre-redesign UI already exists under `backups/…-pre-executive-dashboard/`.
- No agent data is ingested, stored, computed, charted, or exported anywhere.
- Reservation/revenue accuracy depends on uploading the full reservations export;
  all other sections reproduce exactly from sheets already in use.
