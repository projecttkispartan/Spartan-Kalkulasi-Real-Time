/**
 * Adapter master ERP — read-only. Fallback ke seed jika API gagal.
 */
import { getRuntimeConfig, isMasterApiMode } from '../config/runtime.js';

function authHeaders() {
  const { apiToken } = getRuntimeConfig();
  const h = { Accept: 'application/json' };
  if (apiToken) h.Authorization = `Bearer ${apiToken}`;
  return h;
}

/** Map baris ERP → shape DATA BASE app */
export function mapErpMaterial(row) {
  if (!row) return null;
  return {
    id: row.id || row.materialId || row.kode,
    kode: row.kode || row.code || '',
    specification: row.specification || row.nama || row.name || '',
    materialType: row.materialType || row.type || 'komponen',
    hargaMaterialSupplier: Number(row.unitPrice ?? row.harga ?? row.price) || 0,
    unit: row.unit || 'PCS',
    section: row.section || row.category || '',
    woodName: row.woodName || '',
    aktif: row.aktif !== false && row.active !== false,
  };
}

export function mapErpWorkCenter(row) {
  return {
    id: row.id || row.kode,
    kode: row.kode || row.code || '',
    nama: row.nama || row.name || '',
    ratePerMin: Number(row.ratePerMin ?? row.rate) || 500,
    aktif: row.aktif !== false,
  };
}

async function fetchJson(path) {
  const { apiBaseUrl } = getRuntimeConfig();
  const url = `${apiBaseUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export async function fetchMaterialsFromApi() {
  const data = await fetchJson('/v1/masters/materials?limit=5000');
  const items = data.items || data.data || data;
  if (!Array.isArray(items)) return [];
  return items.map(mapErpMaterial).filter((m) => m?.id);
}

export async function fetchWorkCentersFromApi() {
  const data = await fetchJson('/v1/masters/work-centers?limit=500');
  const items = data.items || data.data || data;
  if (!Array.isArray(items)) return [];
  return items.map(mapErpWorkCenter).filter((w) => w?.id);
}

/** Sync master dari API jika mode api — return null jika skip/gagal */
export async function trySyncMastersFromApi() {
  if (!isMasterApiMode()) return null;
  try {
    const [materials, workCenters] = await Promise.all([
      fetchMaterialsFromApi(),
      fetchWorkCentersFromApi(),
    ]);
    return { materials, workCenters, syncedAt: new Date().toISOString() };
  } catch (err) {
    console.warn('[masterApiAdapter] sync failed, using seed:', err?.message || err);
    return null;
  }
}
