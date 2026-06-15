-- ============================================================================
-- YourSpotRented Reporting Tool — PostgreSQL schema (FUTURE / OPTIONAL)
--
-- v1 runs STATELESS: CSVs are processed in memory and reports are returned
-- directly, so this schema is NOT required to run the app. It is provided so
-- persistence can be enabled later (set PERSIST=true and wire a pg client) with
-- a config change rather than a rewrite.
--
-- Apply with:  psql "$DATABASE_URL" -f server/db/schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- Raw upload metadata (the file itself is not stored in v1 design).
CREATE TABLE IF NOT EXISTS uploads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    TEXT NOT NULL,
  uploaded_by TEXT,
  row_count   INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved column-mapping / rules presets (a serialized ReportConfig).
CREATE TABLE IF NOT EXISTS report_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  config_json JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated reports (full engine output + the narrative summary).
CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id    UUID REFERENCES uploads(id) ON DELETE SET NULL,
  config_id    UUID REFERENCES report_configs(id) ON DELETE SET NULL,
  report_json  JSONB NOT NULL,
  summary_text TEXT,
  period_start DATE,
  period_end   DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_period ON reports (period_start, period_end);
