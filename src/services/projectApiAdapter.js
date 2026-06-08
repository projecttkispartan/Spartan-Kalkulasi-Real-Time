/**
 * Adapter persist project ke ERP API — optional layer di atas IndexedDB.
 */
import { getRuntimeConfig, isProjectApiMode } from '../config/runtime.js';

let syncTimer = null;
const pending = new Map();

function authHeaders(extra = {}) {
  const { apiToken } = getRuntimeConfig();
  const h = { Accept: 'application/json', 'Content-Type': 'application/json', ...extra };
  if (apiToken) h.Authorization = `Bearer ${apiToken}`;
  return h;
}

export async function pushProjectToApi(doc) {
  if (!isProjectApiMode()) return { skipped: true };

  const { apiBaseUrl } = getRuntimeConfig();
  const base = apiBaseUrl.replace(/\/$/, '');
  const isNew = !doc._erpId;
  const url = isNew ? `${base}/v1/projects` : `${base}/v1/projects/${doc._erpId}`;
  const method = isNew ? 'POST' : 'PATCH';

  const res = await fetch(url, {
    method,
    headers: authHeaders(doc.updatedAt ? { 'If-Unmodified-Since': doc.updatedAt } : {}),
    body: JSON.stringify({
      schemaVersion: doc.schemaVersion,
      kode: doc.kode,
      nama: doc.nama,
      customer: doc.customer,
      status: doc.status || 'draft',
      versi: doc.versi,
      productInfo: doc.productInfo,
      productMeta: doc.productMeta,
      bomData: doc.bomData,
      cogsConfig: doc.cogsConfig,
      cogsMode: doc.cogsMode,
    }),
  });

  if (res.status === 409) {
    throw new Error('BOM diubah user lain — refresh daftar project.');
  }
  if (!res.ok) throw new Error(`Project API ${res.status}`);

  const body = await res.json();
  return { erpId: body.id || doc._erpId, updatedAt: body.updatedAt || doc.updatedAt };
}

/** Debounced PATCH — IndexedDB tetap source of truth lokal */
export function scheduleProjectApiSync(doc, delayMs = 2000) {
  if (!isProjectApiMode()) return;
  pending.set(doc.id, doc);
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const queue = [...pending.values()];
    pending.clear();
    for (const d of queue) {
      try {
        await pushProjectToApi(d);
      } catch (err) {
        console.warn('[projectApiAdapter]', err?.message || err);
      }
    }
  }, delayMs);
}

export async function fetchProjectsFromApi() {
  if (!isProjectApiMode()) return [];
  const { apiBaseUrl } = getRuntimeConfig();
  const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/v1/projects?limit=100`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Projects list API ${res.status}`);
  const data = await res.json();
  return data.items || data.data || [];
}
