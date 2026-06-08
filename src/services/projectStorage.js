import { createEmptyProject, newProjectId, normalizeProject, projectListMeta, bumpMinorVersion } from '../utils/emptyProject.js';
import { SAMPLE_PROJECTS, SAMPLE_MANIFEST_VERSION } from '../data/samples/loadSamples.js';
import { computeCogs, computePackingTotals } from './bomCalculations.js';
import { linkProjectToMasters } from '../utils/linkProjectToMasters.js';
import { resolveCogsMode, COGS_MODES } from '../utils/emptyProject.js';
import { scheduleProjectApiSync } from './projectApiAdapter.js';
import {
  addDismissedSampleKey,
  getDismissedSampleKeys,
  clearDismissedSampleKeys,
} from './sampleDismissStorage.js';

const DB_NAME = 'manufaktur-bom';
const DB_VERSION = 3;
const STORE = 'projects';
const LS_KEY = 'bom_projects_v1_fallback';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('master')) {
        db.createObjectStore('master');
      }
    };
  });
}

function lsReadAll() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsWriteAll(docs) {
  localStorage.setItem(LS_KEY, JSON.stringify(docs));
}

async function idbGetAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(doc) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(doc);
    req.onsuccess = () => resolve(doc);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

let useFallback = false;

async function readAllDocs() {
  if (useFallback) return lsReadAll();
  try {
    return await idbGetAll();
  } catch {
    useFallback = true;
    return lsReadAll();
  }
}

async function writeDoc(doc) {
  const normalized = normalizeProject(doc);
  if (!normalized) throw new Error('Invalid project document');
  const withHpp = enrichCachedHpp(normalized);
  if (useFallback) {
    const all = lsReadAll().filter((p) => p.id !== withHpp.id);
    all.push(withHpp);
    lsWriteAll(all);
    return withHpp;
  }
  try {
    return await idbPut(withHpp);
  } catch {
    useFallback = true;
    return writeDoc(withHpp);
  }
}

function enrichCachedHpp(doc) {
  try {
    const cogsMode = resolveCogsMode(doc);
    const linked = linkProjectToMasters(doc, {
      applyBiaya: cogsMode !== COGS_MODES.EXCEL_FIXED,
      skipBiayaIfExcel: true,
    });
    const packingTotals = computePackingTotals(doc.packingSpec);
    const cogs = computeCogs({
      bomData: linked.bomData,
      cogsConfig: doc.cogsConfig,
      packingTotals,
      productMeta: linked.productMeta,
    });
    return { ...doc, cachedHpp: cogs.totalCogs };
  } catch {
    return doc;
  }
}



function findBySampleKey(existing, sampleKey) {
  return existing.find((p) => p.sampleKey === sampleKey);
}

export async function ensureSeedProjects() {
  let existing = await readAllDocs();
  const out = [...existing];
  const dismissed = new Set(await getDismissedSampleKeys());

  for (const sample of SAMPLE_PROJECTS) {
    const norm = normalizeProject(sample);
    if (!norm) continue;
    if (norm.sampleKey && dismissed.has(norm.sampleKey)) continue;
    const prev = findBySampleKey(existing, norm.sampleKey) || existing.find((p) => p.id === norm.id);
    const stale = !prev || (prev.sampleSeedVersion ?? 0) < SAMPLE_MANIFEST_VERSION;

    if (!prev) {
      const saved = await writeDoc(norm);
      out.push(saved);
    } else if (stale) {
      const fresh = {
        ...norm,
        id: prev.id,
        createdAt: prev.createdAt,
        createdBy: prev.createdBy ?? 'Excel Import',
      };
      const saved = await writeDoc(fresh);
      const idx = out.findIndex((p) => p.id === prev.id);
      if (idx >= 0) out[idx] = saved;
      else out.push(saved);
    }
  }

  const repaired = [];
  for (const doc of out) {
    const norm = normalizeProject(doc);
    if (!norm) continue;
    const needsFix = !doc.bomData || !doc.packingSpec || !Array.isArray(doc.customErp?.parts);
    if (needsFix) {
      const saved = await writeDoc(norm);
      repaired.push(saved);
    } else {
      repaired.push(norm);
    }
  }

  return repaired;
}

export async function listProjects() {
  const docs = await ensureSeedProjects();
  return docs
    .map(projectListMeta)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getProject(id) {
  if (useFallback) {
    const doc = lsReadAll().find((p) => p.id === id) ?? null;
    return doc ? normalizeProject(doc) : null;
  }
  try {
    const doc = await idbGet(id);
    if (doc) return normalizeProject(doc);
    await ensureSeedProjects();
    const again = await idbGet(id);
    return again ? normalizeProject(again) : null;
  } catch {
    useFallback = true;
    return getProject(id);
  }
}

export async function saveProject(doc) {
  const normalized = normalizeProject(doc);
  if (!normalized) throw new Error('Invalid project document');
  const saved = await writeDoc({ ...normalized, updatedAt: new Date().toISOString() });
  scheduleProjectApiSync(saved);
  return saved;
}

export async function createProject() {
  const doc = createEmptyProject();
  return saveProject(doc);
}

export async function deleteProject(id) {
  const doc = await getProject(id);
  if (doc?.sampleKey) {
    await addDismissedSampleKey(doc.sampleKey);
  }
  if (useFallback) {
    lsWriteAll(lsReadAll().filter((p) => p.id !== id));
    return;
  }
  try {
    await idbDelete(id);
  } catch {
    useFallback = true;
    await deleteProject(id);
  }
}

/** Pulihkan semua project sample Excel yang pernah di-dismiss (QA/dev). */
export async function restoreDismissedSampleProjects() {
  await clearDismissedSampleKeys();
  return ensureSeedProjects();
}

export async function duplicateProject(id) {
  const src = await getProject(id);
  if (!src) throw new Error('Project not found');
  const nextVersi = bumpMinorVersion(src.versi || src.productInfo?.versi || '1.0');
  const copy = {
    ...structuredClone(src),
    id: newProjectId(),
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versi: nextVersi,
    productInfo: {
      ...src.productInfo,
      versi: nextVersi,
    },
    sampleKey: undefined,
    _erpId: undefined,
  };
  return saveProject(copy);
}
