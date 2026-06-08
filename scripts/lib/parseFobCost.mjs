/**
 * Parse blok FOB COST — sheet DATA BASE (kolom 144+, mirror ZAN-100).
 */

const START_COL = 143;

export const FOB_CONTAINER_LAYOUTS = [
  {
    key: '20foot',
    label: '20 FT',
    qtyCol: 2,
    costCol: 3,
    safetyCol: 5,
    totalCol: 6,
    volumeCols: [8, 9],
    volumesM3: [28, 32],
    totalRowCol: 6,
    totalInclRowCol: 6,
    roundedTotalCol: 6,
    roundedPerM3Col: 8,
  },
  {
    key: '40foot',
    label: '40 FT',
    qtyCol: 12,
    costCol: 13,
    safetyCol: 15,
    totalCol: 16,
    volumeCols: [17, 18],
    volumesM3: [55, 64],
    totalRowCol: 16,
    totalInclRowCol: 16,
    roundedTotalCol: 15,
    roundedPerM3Col: 17,
  },
  {
    key: '40hc',
    label: '40 HC',
    qtyCol: 22,
    costCol: 23,
    safetyCol: 25,
    totalCol: 26,
    volumeCols: [26, 27],
    volumesM3: [62, 70],
    totalRowCol: 26,
    totalInclRowCol: 26,
    roundedTotalCol: 24,
    roundedPerM3Col: 26,
  },
];

function parseSafety(val) {
  const n = Number(val);
  if (!n) return 0.05;
  return n > 1 ? n / 100 : n;
}

function lineTotal(qty, unitCost, safetyPct) {
  const q = Number(qty) || 0;
  const c = Number(unitCost) || 0;
  if (!q || !c) return 0;
  return Math.round(q * c * (1 + safetyPct));
}

export function computeContainerFobFromLines(lineItems, totalSafetyPct = 0.05) {
  const subtotal = lineItems.reduce((s, it) => s + (Number(it.totalCost) || 0), 0);
  const totalSafety = Math.round(subtotal * totalSafetyPct);
  const totalIncludingSafety = subtotal + totalSafety;
  return { subtotal, totalSafety, totalIncludingSafety };
}

export function parseFobCostSheet(rows) {
  const exchangeRateUsd = Number(rows[1]?.[START_COL + 3]) || 16000;
  const lineSafetyPct = parseSafety(rows[6]?.[START_COL + 5]);
  const totalSafetyPct = parseSafety(rows[6]?.[START_COL + 5]);

  const lineItems = [];
  for (let i = 7; i <= 21; i++) {
    const r = rows[i] || [];
    const no = Number(r[START_COL]);
    const description = String(r[START_COL + 1] ?? '').trim();
    if (!no || !description) continue;
    const byContainer = {};
    for (const layout of FOB_CONTAINER_LAYOUTS) {
      const qty = Number(r[START_COL + layout.qtyCol]) || 0;
      const costPerUnit = Number(r[START_COL + layout.costCol]) || 0;
      const sf = parseSafety(r[START_COL + layout.safetyCol]);
      const totalFromSheet = Number(r[START_COL + layout.totalCol]) || 0;
      const totalCost = totalFromSheet || lineTotal(qty, costPerUnit, sf);
      byContainer[layout.key] = {
        qty,
        costPerUnit,
        safetyFactor: sf,
        safetyFactorPct: Math.round(sf * 1000) / 10,
        totalCost,
        costPerUnitUsd: exchangeRateUsd ? costPerUnit / exchangeRateUsd : 0,
        totalCostUsd: exchangeRateUsd ? totalCost / exchangeRateUsd : 0,
      };
    }
    lineItems.push({ no, description, byContainer });
  }

  const containers = {};
  for (const layout of FOB_CONTAINER_LAYOUTS) {
    const items = lineItems.map((li) => ({
      no: li.no,
      description: li.description,
      ...li.byContainer[layout.key],
    }));
    const computed = computeContainerFobFromLines(items, totalSafetyPct);
    const r23 = rows[22] || [];
    const r25 = rows[24] || [];
    const r26 = rows[25] || [];
    const totalFromSheet = Number(r23[START_COL + layout.totalRowCol]) || 0;
    const totalInclFromSheet = Number(r25[START_COL + layout.totalInclRowCol]) || 0;
    const roundedTotal = Number(r26[START_COL + layout.roundedTotalCol]) || 0;
    const roundedPerM3 = Number(r26[START_COL + layout.roundedPerM3Col]) || 0;

    containers[layout.key] = {
      key: layout.key,
      label: layout.label,
      volumesM3: layout.volumesM3,
      defaultVolumeM3: layout.volumesM3[0],
      lineItems: items,
      subtotalLineItems: computed.subtotal,
      totalSafetyFactor: computed.totalSafety,
      totalFobCost: totalFromSheet || computed.subtotal,
      totalIncludingSafety: totalInclFromSheet || computed.totalIncludingSafety,
      roundedTotalFob: roundedTotal,
      roundedFobPerM3: roundedPerM3,
    };
  }

  return {
    source: 'DATA BASE',
    excelRef: 'DATA BASE FOB COST col 144+',
    exchangeRateUsd,
    lineSafetyPct,
    totalSafetyPct,
    lineItems,
    containers,
    aktif: true,
  };
}
