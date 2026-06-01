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
