/**
 * Thin fetch wrappers for the live Airtable-backed reporting endpoints.
 * Mirrors the conventions in ./client.js.
 */

async function handle(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.code = data?.error?.code;
    err.details = data?.error?.details;
    throw err;
  }
  return data;
}

/** Most recently completed Monday–Sunday week, for pre-filling the picker. */
export function getDefaultWeek() {
  return fetch('/api/airtable/default-week').then(handle);
}

/** Current + previous week data pulled live from Airtable. */
export function fetchAirtableWeek(start, end) {
  const params = new URLSearchParams({ start, end });
  return fetch(`/api/airtable/week?${params.toString()}`).then(handle);
}

/** Trigger an on-demand send of the weekly report email for the given week. */
export function sendWeeklyReportEmail(start, end) {
  return fetch('/api/airtable/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end }),
  }).then(handle);
}
