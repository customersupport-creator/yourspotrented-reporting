import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * Minimal file-based store for PUBLISHED (shared) reports.
 *
 * Saving a generated report returns a short id; the public link /r/<id> renders
 * it read-only for anyone. Storage lives under DATA_DIR (default server/.data).
 *
 * NOTE on durability: a host with an ephemeral filesystem (e.g. Render's free
 * tier) resets this on redeploy/restart, so links there are not permanent. Point
 * DATA_DIR at a persistent disk, or swap this module for a DB-backed store, for
 * permanent links. The interface (save/get) stays the same.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../.data/reports');

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function newId() {
  // 9 url-safe chars, collision-resistant enough for share links.
  return crypto.randomBytes(7).toString('base64url').slice(0, 9);
}

/**
 * Persist a published report payload. Returns the share id.
 * @param {Object} payload e.g. { report, remit, publishedAt }
 */
export function saveReport(payload) {
  ensureDir();
  let id = newId();
  // avoid the (very unlikely) collision
  for (let i = 0; i < 5 && fs.existsSync(path.join(DATA_DIR, `${id}.json`)); i++) id = newId();
  fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(payload), 'utf8');
  return id;
}

/** Load a published report by id, or null if missing. */
export function getReport(id) {
  if (!/^[\w-]{1,40}$/.test(String(id || ''))) return null; // guard path traversal
  const file = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}
