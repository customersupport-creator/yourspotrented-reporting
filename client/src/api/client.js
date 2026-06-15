/**
 * Thin fetch wrappers around the backend API. All endpoints are same-origin
 * (Vite proxies /api -> :4000 in dev; Express serves both in prod).
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

export function getDefaultConfig() {
  return fetch('/api/config/default').then(handle);
}

function appendFiles(form, files) {
  (Array.isArray(files) ? files : [files]).filter(Boolean).forEach((f) => form.append('files', f));
}

export function previewCsv(files) {
  const form = new FormData();
  appendFiles(form, files);
  return fetch('/api/csv/preview', { method: 'POST', body: form }).then(handle);
}

export function generateReport(files, config) {
  const form = new FormData();
  appendFiles(form, files);
  if (config) form.append('config', JSON.stringify(config));
  return fetch('/api/reports/generate', { method: 'POST', body: form }).then(handle);
}

/** Publish the current report and get a share id. */
export function publishReport(report, remit) {
  return fetch('/api/reports/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report, remit }),
  }).then(handle);
}

/** Fetch a previously published (shared) report by id. */
export function getSharedReport(id) {
  return fetch(`/api/reports/shared/${encodeURIComponent(id)}`).then(handle);
}
