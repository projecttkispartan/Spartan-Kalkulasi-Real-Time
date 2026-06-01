import { WORK_CENTERS } from '../data/routingCatalog.js';
import woodSeed from '../data/masters/database/wood.json' with { type: 'json' };
import nonWoodSeed from '../data/masters/database/nonWood.json' with { type: 'json' };
import ratiosSeed from '../data/masters/ratios/byCategory.json' with { type: 'json' };
import coatingsSeed from '../data/masters/coatings/systems.json' with { type: 'json' };
import formulasSeed from '../data/masters/formulas/registry.json' with { type: 'json' };
import roundingSeed from '../data/masters/rounding/rules.json' with { type: 'json' };
import metaSeed from '../data/masters/meta.json' with { type: 'json' };
import workCentersSeed from '../data/masters/workCenters/systems.json' with { type: 'json' };
import woodLaborSeed from '../data/masters/tables/woodLabor.json' with { type: 'json' };
import masterRatioBlocksSeed from '../data/masters/tables/masterRatioBlocks.json' with { type: 'json' };
import formulaDataRowsSeed from '../data/masters/tables/formulaDataRows.json' with { type: 'json' };
import roundPresetsSeed from '../data/masters/tables/roundComponentPresets.json' with { type: 'json' };
// Legacy fallbacks
import legacyMaterials from '../data/masters/materials.json' with { type: 'json' };
import legacyRatios from '../data/masters/wasteRatios.json' with { type: 'json' };
import legacyCoatings from '../data/masters/coatings.json' with { type: 'json' };

const DB_NAME = 'manufaktur-bom';
const DB_VERSION = 3;
const STORE = 'master';

const KEYS = {
  workCenters: 'workCenters_v1',
  materials: 'materials_v1',
  nonWood: 'nonWood_v1',
  wasteRatios: 'wasteRatios_v1',
  coatings: 'coatings_v1',
  formulas: 'formulas_v1',
  rounding: 'rounding_v1',
  meta: 'masterMeta_v1',
  woodLabor: 'woodLabor_v1',
  masterRatioBlocks: 'masterRatioBlocks_v1',
  formulaDataRows: 'formulaDataRows_v1',
  roundPresets: 'roundPresets_v1',
};

const LS_KEYS = {
  workCenters: 'bom_master_wc_v1',
  materials: 'bom_master_materials_v1',
  nonWood: 'bom_master_nonwood_v1',
  wasteRatios: 'bom_master_ratios_v1',
  coatings: 'bom_master_coatings_v1',
  formulas: 'bom_master_formulas_v1',
  rounding: 'bom_master_rounding_v1',
  meta: 'bom_master_meta_v1',
  woodLabor: 'bom_master_wood_labor_v1',
  masterRatioBlocks: 'bom_master_ratio_blocks_v1',
  formulaDataRows: 'bom_master_formula_rows_v1',
  roundPresets: 'bom_master_round_presets_v1',
};

const materialsDefault = woodSeed?.length ? woodSeed : legacyMaterials;
const ratiosDefault = ratiosSeed?.length ? ratiosSeed : legacyRatios;
const coatingsDefault = coatingsSeed?.length ? coatingsSeed : legacyCoatings;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedWorkCenters() {
  if (workCentersSeed?.length) return workCentersSeed;
  return WORK_CENTERS.map((wc) => ({
    id: wc.id,
    kode: wc.kode,
    nama: wc.nama,
    ratePerMin: wc.ratePerMin ?? wc.biayaPerMenit ?? 500,
    mesin: wc.mesin,
    aktif: true,
  }));
}

function filterCoatings(list) {
  return list.filter((c) => c.aktif !== false && c.name && (c.roundedCostM2 > 0 || c.totalProductionM2 > 0));
}

async function getStoreItem(key, lsKey, seed) {
  try {
    const stored = await idbGet(key);
    if (stored) return stored;
    await idbPut(key, seed);
    return seed;
  } catch {
    const ls = lsGet(lsKey, null);
    if (ls) return ls;
    lsSet(lsKey, seed);
    return seed;
  }
}

export async function getWorkCenters() {
  return getStoreItem(KEYS.workCenters, LS_KEYS.workCenters, seedWorkCenters());
}

export async function saveWorkCenters(list) {
  try {
    await idbPut(KEYS.workCenters, list);
  } catch {
    lsSet(LS_KEYS.workCenters, list);
  }
  return list;
}

export function getWorkCenterRate(wcList, wcId) {
  const found = wcList.find((w) => w.id === wcId || w.kode === wcId);
  return found?.ratePerMin ?? 500;
}

export async function getMaterials() {
  return getStoreItem(KEYS.materials, LS_KEYS.materials, materialsDefault);
}

export async function getNonWoodMaterials() {
  return getStoreItem(KEYS.nonWood, LS_KEYS.nonWood, nonWoodSeed);
}

export async function saveMaterials(list) {
  try {
    await idbPut(KEYS.materials, list);
  } catch {
    lsSet(LS_KEYS.materials, list);
  }
  cache.materials = list;
  return list;
}

export async function getWasteRatios() {
  return getStoreItem(KEYS.wasteRatios, LS_KEYS.wasteRatios, ratiosDefault);
}

export async function saveWasteRatios(list) {
  try {
    await idbPut(KEYS.wasteRatios, list);
  } catch {
    lsSet(LS_KEYS.wasteRatios, list);
  }
  cache.wasteRatios = list;
  return list;
}

export async function getCoatings() {
  const raw = await getStoreItem(KEYS.coatings, LS_KEYS.coatings, coatingsDefault);
  return filterCoatings(raw);
}

export async function saveCoatings(list) {
  const filtered = filterCoatings(list);
  try {
    await idbPut(KEYS.coatings, filtered);
  } catch {
    lsSet(LS_KEYS.coatings, filtered);
  }
  cache.coatings = filtered;
  return filtered;
}

export async function saveNonWoodMaterials(list) {
  try {
    await idbPut(KEYS.nonWood, list);
  } catch {
    lsSet(LS_KEYS.nonWood, list);
  }
  cache.nonWood = list;
  return list;
}

export async function saveFormulas(list) {
  try {
    await idbPut(KEYS.formulas, list);
  } catch {
    lsSet(LS_KEYS.formulas, list);
  }
  cache.formulas = list;
  return list;
}

export async function saveRoundingRules(list) {
  try {
    await idbPut(KEYS.rounding, list);
  } catch {
    lsSet(LS_KEYS.rounding, list);
  }
  cache.rounding = list;
  return list;
}

export async function getWoodLaborRows() {
  return getStoreItem(KEYS.woodLabor, LS_KEYS.woodLabor, woodLaborSeed);
}

export async function saveWoodLaborRows(list) {
  try {
    await idbPut(KEYS.woodLabor, list);
  } catch {
    lsSet(LS_KEYS.woodLabor, list);
  }
  return list;
}

export async function getMasterRatioBlocks() {
  return getStoreItem(KEYS.masterRatioBlocks, LS_KEYS.masterRatioBlocks, masterRatioBlocksSeed);
}

export async function saveMasterRatioBlocks(data) {
  try {
    await idbPut(KEYS.masterRatioBlocks, data);
  } catch {
    lsSet(LS_KEYS.masterRatioBlocks, data);
  }
  return data;
}

export async function getFormulaDataRows() {
  return getStoreItem(KEYS.formulaDataRows, LS_KEYS.formulaDataRows, formulaDataRowsSeed);
}

export async function saveFormulaDataRows(list) {
  try {
    await idbPut(KEYS.formulaDataRows, list);
  } catch {
    lsSet(LS_KEYS.formulaDataRows, list);
  }
  return list;
}

export async function getRoundComponentPresets() {
  return getStoreItem(KEYS.roundPresets, LS_KEYS.roundPresets, roundPresetsSeed);
}

export async function saveRoundComponentPresets(list) {
  try {
    await idbPut(KEYS.roundPresets, list);
  } catch {
    lsSet(LS_KEYS.roundPresets, list);
  }
  return list;
}

export async function getFormulas() {
  return getStoreItem(KEYS.formulas, LS_KEYS.formulas, formulasSeed);
}

export async function getRoundingRules() {
  return getStoreItem(KEYS.rounding, LS_KEYS.rounding, roundingSeed);
}

export async function getMasterMeta() {
  return getStoreItem(KEYS.meta, LS_KEYS.meta, metaSeed);
}

let cache = {
  materials: null,
  nonWood: null,
  wasteRatios: null,
  coatings: null,
  formulas: null,
  rounding: null,
  loadedAt: 0,
};

export async function hydrateAllMasters() {
  const [materials, nonWood, wasteRatios, coatings, formulas, rounding] = await Promise.all([
    getMaterials(),
    getNonWoodMaterials(),
    getWasteRatios(),
    getCoatings(),
    getFormulas(),
    getRoundingRules(),
  ]);
  cache = { materials, nonWood, wasteRatios, coatings, formulas, rounding, loadedAt: Date.now() };
  return cache;
}

export function getCachedMaterials() {
  return cache.materials ?? materialsDefault;
}

export function getCachedNonWoodMaterials() {
  return cache.nonWood ?? nonWoodSeed;
}

export function getCachedWasteRatios() {
  return cache.wasteRatios ?? ratiosDefault;
}

export function getCachedCoatings() {
  return filterCoatings(cache.coatings ?? coatingsDefault);
}

export function getCachedFormulas() {
  return cache.formulas ?? formulasSeed;
}

export function getCachedRoundingRules() {
  return cache.rounding ?? roundingSeed;
}

export async function reimportMastersFromSeedFiles() {
  const puts = [
    idbPut(KEYS.materials, materialsDefault),
    idbPut(KEYS.nonWood, nonWoodSeed),
    idbPut(KEYS.wasteRatios, ratiosDefault),
    idbPut(KEYS.coatings, coatingsDefault),
    idbPut(KEYS.formulas, formulasSeed),
    idbPut(KEYS.rounding, roundingSeed),
    idbPut(KEYS.meta, metaSeed),
    idbPut(KEYS.workCenters, seedWorkCenters()),
    idbPut(KEYS.woodLabor, woodLaborSeed),
    idbPut(KEYS.masterRatioBlocks, masterRatioBlocksSeed),
    idbPut(KEYS.formulaDataRows, formulaDataRowsSeed),
    idbPut(KEYS.roundPresets, roundPresetsSeed),
  ];
  await Promise.all(puts).catch(() => {
    lsSet(LS_KEYS.materials, materialsDefault);
    lsSet(LS_KEYS.nonWood, nonWoodSeed);
    lsSet(LS_KEYS.wasteRatios, ratiosDefault);
    lsSet(LS_KEYS.coatings, coatingsDefault);
    lsSet(LS_KEYS.formulas, formulasSeed);
    lsSet(LS_KEYS.rounding, roundingSeed);
    lsSet(LS_KEYS.meta, metaSeed);
    lsSet(LS_KEYS.workCenters, seedWorkCenters());
    lsSet(LS_KEYS.woodLabor, woodLaborSeed);
    lsSet(LS_KEYS.masterRatioBlocks, masterRatioBlocksSeed);
    lsSet(LS_KEYS.formulaDataRows, formulaDataRowsSeed);
    lsSet(LS_KEYS.roundPresets, roundPresetsSeed);
  });
  return hydrateAllMasters();
}
