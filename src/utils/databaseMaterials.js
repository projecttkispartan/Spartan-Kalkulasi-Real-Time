/**
 * Gabungan master section DATA BASE (wood + plywood, mdf, …)
 */
import woodSeed from '../data/masters/database/wood.json' with { type: 'json' };
import plywoodSeed from '../data/masters/database/plywood.json' with { type: 'json' };
import mdfSeed from '../data/masters/database/mdf.json' with { type: 'json' };
import coreSeed from '../data/masters/database/core.json' with { type: 'json' };
import hplSeed from '../data/masters/database/hpl.json' with { type: 'json' };
import veneerSeed from '../data/masters/database/veneer.json' with { type: 'json' };
import edgingSeed from '../data/masters/database/edging.json' with { type: 'json' };

export const DATABASE_SECTION_SEEDS = {
  WOOD: woodSeed,
  PLYWOOD: plywoodSeed,
  MDF: mdfSeed,
  CORE: coreSeed,
  HPL: hplSeed,
  VENEER: veneerSeed,
  EDGING: edgingSeed,
};

/** materialType → section key */
export const MATERIAL_TYPE_TO_SECTION = {
  kayu: 'WOOD',
  plywood: 'PLYWOOD',
  mdf: 'MDF',
  core: 'CORE',
  hpl: 'HPL',
  veneer: 'VENEER',
  steel: 'BESI',
  komponen: null,
};

export function getSectionForMaterialType(materialType) {
  const mt = String(materialType || '').toLowerCase();
  return MATERIAL_TYPE_TO_SECTION[mt] || null;
}

export function mergeDatabaseSectionLists(overrides = {}) {
  const lists = { ...DATABASE_SECTION_SEEDS, ...overrides };
  const all = [];
  for (const [section, rows] of Object.entries(lists)) {
    for (const row of rows || []) {
      all.push({ ...row, section: row.section || section });
    }
  }
  return all;
}

export function listMaterialsBySection(section, allRows = null) {
  const rows = allRows || mergeDatabaseSectionLists();
  const s = String(section || '').toUpperCase();
  return rows.filter((r) => r.aktif !== false && String(r.section || '').toUpperCase() === s);
}

export function listMaterialsByMaterialType(materialType, allRows = null) {
  const rows = allRows || mergeDatabaseSectionLists();
  const mt = String(materialType || '').toLowerCase();
  const section = getSectionForMaterialType(mt);

  if (mt === 'kayu') {
    return rows.filter((r) => r.materialType === 'kayu');
  }

  if (section) {
    const bySection = listMaterialsBySection(section, rows);
    if (bySection.length) return bySection;
  }

  return rows.filter((r) => String(r.materialType || '').toLowerCase() === mt);
}
