import formulasRegistry from '../data/masters/formulas/registry.json' with { type: 'json' };

const HANDLERS = {
  vol_part_mm(ctx) {
    const p = Number(ctx.p) || 0;
    const l = Number(ctx.l) || 0;
    const t = Number(ctx.t) || 0;
    return Number(((p * l * t) / 1_000_000_000).toFixed(6));
  },

  vol_packing_box(ctx) {
    const w = (Number(ctx.w) || 0) + (Number(ctx.tolW) || 0);
    const d = (Number(ctx.d) || 0) + (Number(ctx.tolD) || 0);
    const h = (Number(ctx.h) || 0) + (Number(ctx.tolH) || 0);
    return Number(((w * d * h) / 1_000_000_000).toFixed(6));
  },

  vol_packing_sf(ctx) {
    let vol = HANDLERS.vol_packing_box(ctx);
    if (ctx.chairFactor && String(ctx.itemType || '').toUpperCase() === 'CHAIR') {
      vol *= 0.6;
    }
    return Number(vol.toFixed(6));
  },

  container_pcs(ctx) {
    const net = Number(ctx.containerNetM3) || 0;
    const vol = Number(ctx.volPacking) || 0;
    if (!vol || !net) return 0;
    return Math.floor(net / vol);
  },

  wood_material_cost(ctx) {
    const price = Number(ctx.pricePerM3) || 0;
    const vol = Number(ctx.vol) || 0;
    const sf = Number(ctx.sf) || 0;
    const wf = Number(ctx.wf) || 0;
    const base = price * vol;
    return Math.round(base * (1 + sf / 100 + wf / 100));
  },

  coating_cost(ctx) {
    const m2 = Number(ctx.surfaceM2) || 0;
    const rate = Number(ctx.roundedCostM2) || 0;
    return Math.round(m2 * rate);
  },

  surface_m2_estimate(ctx) {
    const p = Number(ctx.p) || 0;
    const l = Number(ctx.l) || 0;
    const t = Number(ctx.t) || 0;
    if (!p || !l || !t) return 0;
    const mm2 = 2 * (p * l + p * t + l * t);
    return Number((mm2 / 1_000_000).toFixed(4));
  },

  cogs_production(ctx) {
    return (
      (Number(ctx.totalMaterial) || 0) +
      (Number(ctx.totalProcess) || 0) +
      (Number(ctx.packingCost) || 0)
    );
  },

  cogs_total(ctx) {
    const prod = Number(ctx.productionCost) || 0;
    const fOh = Number(ctx.factoryOhPct) || 0;
    const mOh = Number(ctx.managementOhPct) || 0;
    return prod + prod * (fOh / 100) + prod * (mOh / 100);
  },

  cogs_selling(ctx) {
    const cogs = Number(ctx.totalCogs) || 0;
    const markup = Number(ctx.markupPct) || 0;
    return cogs * (1 + markup / 100);
  },

  round_table_component(ctx) {
    const n = Number(ctx.sections) || 8;
    const d = Number(ctx.outerDiameterMm) || 1200;
    const rw = Number(ctx.radialWidthMm) || 25;
    const th = Number(ctx.thicknessMm) || 50;
    const r1 = d / 2 - rw;
    const r2 = d / 2;
    const alpha = Math.PI / n;
    const length = (r1 + r2) / 2 * alpha * 2;
    const width = rw * 2.5;
    const volMm3 = length * width * th;
    return Number((volMm3 / 1e9).toFixed(9));
  },
};

let registry = formulasRegistry;

export function setFormulaRegistry(list) {
  registry = list || formulasRegistry;
}

export function getFormulaRegistry() {
  return registry;
}

export function getFormulaMeta(id) {
  return registry.find((f) => f.id === id) || null;
}

export function evalFormula(id, context = {}) {
  const meta = getFormulaMeta(id);
  if (!meta) return null;
  const fn = HANDLERS[meta.handler || id];
  if (!fn) return null;
  return fn(context);
}

export function listFormulaIds() {
  return registry.map((f) => f.id);
}

/** Human-readable rumus untuk tab dokumentasi (bukan evaluasi). */
const FORMULA_EXPRESSIONS = {
  vol_part_mm: 'Volume (m³) = P × L × T (mm) ÷ 10⁹',
  vol_packing_box: 'Volume box (m³) = (W + tolW) × (D + tolD) × (H + tolH) ÷ 10⁹',
  vol_packing_sf: 'Volume SF (m³) = Volume box × 0,6 jika itemType = CHAIR, else = volume box',
  container_pcs: 'Kapasitas (pcs) = floor(Volume muatan kontainer ÷ volume packing aktif)',
  wood_material_cost: 'Biaya = harga/m³ × volume × (1 + SF% ÷ 100 + WF% ÷ 100)',
  coating_cost: 'Biaya = luas permukaan (m²) × tarif coating bulat (Rp/m²)',
  surface_m2_estimate: 'Luas (m²) = 2 × (P×L + P×T + L×T) mm² ÷ 10⁶',
  cogs_production: 'Production cost = Total material + Total proses + Biaya packing',
  cogs_total: 'Total COGS = Production × (1 + Factory OH% + Management OH%)',
  cogs_selling: 'Harga jual = Total COGS × (1 + Markup% ÷ 100), dibulatkan ribuan',
  round_table_component: 'Volume segmen = panjang × lebar × tebal (ROUND COMPONENT CALC)',
};

export const FORMULA_GROUPS = [
  {
    id: 'dimensi',
    label: 'Dimensi & Volume',
    ids: ['vol_part_mm', 'vol_packing_box', 'vol_packing_sf', 'surface_m2_estimate'],
  },
  {
    id: 'material',
    label: 'Material & Part',
    ids: ['wood_material_cost', 'coating_cost'],
  },
  {
    id: 'cogs',
    label: 'COGS',
    ids: ['cogs_production', 'cogs_total', 'cogs_selling'],
  },
  {
    id: 'container',
    label: 'Container',
    ids: ['container_pcs', 'round_table_component'],
  },
];

export const ROLLUP_FORMULA_NOTES = [
  {
    id: 'mat_sf_wf',
    label: 'Penyesuaian material SF / WF',
    expression: 'matAdjusted = matBase + (matBase × SF% ÷ 100) + (matBase × WF% ÷ 100)',
    description: 'Default rollup PART — kecuali wasteIncludedInBiaya: biaya unit sudah net, SF/WF hanya informatif.',
    inputs: 'matBase (biaya × qty), SF%, WF%, wasteIncludedInBiaya',
    excelRef: 'CALCULATION · MASTER RATIO',
  },
  {
    id: 'proses_cost',
    label: 'Biaya proses per PART',
    expression: 'prosesTotal = Σ (waktu × rate WC + pekerja × tarif TK)',
    description: 'Agregasi routing (multi-langkah) atau work center tunggal per operasi.',
    inputs: 'waktuOperasi, jumlah pekerja, rate work center',
    excelRef: 'CALCULATION · WORK CENTER',
  },
  {
    id: 'biaya_produksi',
    label: 'Biaya produksi PART',
    expression: 'biayaProduksi = matAdjusted + prosesTotal',
    description: 'Rollup hierarki MODUL/SUBMODUL = Σ biayaProduksi anak.',
    inputs: 'matAdjusted, prosesTotal',
    excelRef: 'SUMMARY COST · rollup BOM',
  },
];

export function describeFormula(id) {
  const meta = getFormulaMeta(id);
  if (!meta) return null;
  return {
    ...meta,
    expression: FORMULA_EXPRESSIONS[id] || meta.description,
    inputsLabel: (meta.inputs || []).join(', '),
  };
}
