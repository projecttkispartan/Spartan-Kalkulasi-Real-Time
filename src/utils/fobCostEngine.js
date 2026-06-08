/**
 * FOB export cost — mirror rumus Excel DATA BASE (line SF 5% + total SF 5% + rounded / m³).
 */
import fobCostSeed from '../data/masters/database/fobCost.json' with { type: 'json' };

let cachedMaster = fobCostSeed;

export function setFobCostMaster(master) {
  cachedMaster = master || fobCostSeed;
}

export function getFobCostMaster() {
  return cachedMaster || fobCostSeed;
}

export function lineTotal(qty, unitCost, safetyPct) {
  const q = Number(qty) || 0;
  const c = Number(unitCost) || 0;
  const sf = Number(safetyPct) || 0;
  if (!q || !c) return 0;
  return Math.round(q * c * (1 + sf));
}

/** Hitung ulang total kontainer dari line items (editable master) */
export function recomputeContainerTotals(container) {
  const sfLine = Number(container?.lineSafetyPct) ?? 0.05;
  const sfTotal = Number(container?.totalSafetyPct) ?? 0.05;
  const items = (container?.lineItems || []).map((it) => {
    const totalCost = lineTotal(it.qty, it.costPerUnit, it.safetyFactor ?? sfLine);
    return { ...it, totalCost };
  });
  const subtotal = items.reduce((s, it) => s + (Number(it.totalCost) || 0), 0);
  const totalSafety = Math.round(subtotal * sfTotal);
  const totalIncludingSafety = subtotal + totalSafety;
  const vol = Number(container.defaultVolumeM3) || Number(container.volumesM3?.[0]) || 28;
  const computedPerM3 = vol ? Math.round(totalIncludingSafety / vol) : 0;
  const roundedPerM3 = Number(container.roundedFobPerM3) || computedPerM3;
  return {
    ...container,
    lineItems: items,
    subtotalLineItems: subtotal,
    totalSafetyFactor: totalSafety,
    totalFobCost: subtotal,
    totalIncludingSafety,
    computedFobPerM3: computedPerM3,
    roundedFobPerM3: roundedPerM3,
    roundedTotalFob: Number(container.roundedTotalFob) || Math.round(roundedPerM3 * vol),
  };
}

export function getContainerFobConfig(master, containerKey) {
  const m = master || getFobCostMaster();
  const key = containerKey || m.defaultContainerKey || '20foot';
  const raw = m.containers?.[key];
  if (!raw) return null;
  return recomputeContainerTotals({
    ...raw,
    lineSafetyPct: m.lineSafetyPct,
    totalSafetyPct: m.totalSafetyPct,
  });
}

/**
 * Biaya FOB export per unit produk = rounded FOB Rp/m³ × volume packing (m³).
 */
export function computeFobExportCost({
  packingVolumeM3,
  containerKey = '20foot',
  volumeM3Variant,
  master,
} = {}) {
  const vol = Number(packingVolumeM3) || 0;
  if (!vol) return { fobExportCost: 0, fobPerM3: 0, containerKey, packingVolumeM3: 0 };

  const m = master || getFobCostMaster();
  const cfg = getContainerFobConfig(m, containerKey);
  if (!cfg) return { fobExportCost: 0, fobPerM3: 0, containerKey, packingVolumeM3: vol };

  const variant = Number(volumeM3Variant) || cfg.defaultVolumeM3;
  let rate = Number(cfg.roundedFobPerM3) || 0;
  if (!rate && cfg.totalIncludingSafety && variant) {
    rate = Math.round(cfg.totalIncludingSafety / variant);
  }

  const fobExportCost = Math.round(rate * vol);
  return {
    fobExportCost,
    fobPerM3: rate,
    containerKey: cfg.key,
    containerLabel: cfg.label,
    packingVolumeM3: vol,
    volumeM3Variant: variant,
    containerTotalIncludingSafety: cfg.totalIncludingSafety,
    containerRoundedTotal: cfg.roundedTotalFob,
    exchangeRateUsd: m.exchangeRateUsd,
  };
}

export const FOB_CONTAINER_OPTIONS = [
  { key: '20foot', label: '20 FT', defaultRate: 500000 },
  { key: '40foot', label: '40 FT', defaultRate: 300000 },
  { key: '40hc', label: '40 HC', defaultRate: 300000 },
];
