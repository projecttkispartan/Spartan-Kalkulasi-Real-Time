import { calcProsesCosts } from './operationCosts.js';

/** Estimasi operasi jika hanya proses_count (non-live / legacy) */
export function expandProsesList(nodeData, options = {}) {
  const { allowEstimateFallback = false } = options;
  if (nodeData.proses?.length) return nodeData.proses;
  if (!allowEstimateFallback || !(nodeData.proses_count > 0)) return [];
  const est = Math.round(110000 / nodeData.proses_count);
  return Array.from({ length: nodeData.proses_count }, (_, i) => ({
    nama: `Operasi ${i + 1}`,
    mfgProcess: 'Woodworking',
    posisiOperasi: '-',
    waktuOperasi: 0,
    biaya: est,
  }));
}

/** Biaya per PART: material + SF/WF + proses */
export function computePartCostRow(d) {
  const sf = Number(d.sf) || Number(d.masterWasteSfPct) || Number(d.woodWasteSfPct) || 0;
  const wf = Number(d.wf) || Number(d.masterWasteWfPct) || Number(d.woodWasteWfPct) || 0;
  const qty = Number(d.qty) || 1;
  const unitMat = Number(d.biaya) || 0;
  const matBase = unitMat * qty;
  let sfAmt = 0;
  let wfAmt = 0;
  let matAdjusted = matBase;
  if (d.wasteIncludedInBiaya) {
    const ratio = 1 + sf / 100 + wf / 100;
    if (ratio > 0) {
      const baseUnit = unitMat / ratio;
      const baseTotal = baseUnit * qty;
      sfAmt = baseTotal * (sf / 100);
      wfAmt = baseTotal * (wf / 100);
      matAdjusted = matBase;
    }
  } else {
    sfAmt = matBase * (sf / 100);
    wfAmt = matBase * (wf / 100);
    matAdjusted = matBase + sfAmt + wfAmt;
  }

  let mesin = 0;
  let wc = 0;
  let pekerja = 0;
  let waktu = 0;
  expandProsesList(d).forEach((p) => {
    const c = calcProsesCosts(p);
    mesin += c.mesin;
    wc += c.wc || 0;
    pekerja += c.pekerja;
    waktu += c.waktu;
  });
  const prosesTotal = mesin + wc + pekerja;

  return {
    sf,
    wf,
    qty,
    matBase,
    sfAmt,
    wfAmt,
    matAdjusted,
    mesin,
    wc,
    pekerja,
    prosesTotal,
    waktu,
    biayaProduksi: matAdjusted + prosesTotal,
  };
}

const EMPTY_ROLLUP = {
  matBase: 0,
  sfAmt: 0,
  wfAmt: 0,
  matAdjusted: 0,
  mesin: 0,
  wc: 0,
  pekerja: 0,
  prosesTotal: 0,
  waktu: 0,
  biayaProduksi: 0,
};

/** Tambah biaya operasi manufaktur yang melekat pada node (modul/submodul). */
function addOwnProsesToRollup(node, rolled) {
  let mesin = 0;
  let wc = 0;
  let pekerja = 0;
  let waktu = 0;
  expandProsesList(node).forEach((p) => {
    const c = calcProsesCosts(p);
    mesin += c.mesin;
    wc += c.wc || 0;
    pekerja += c.pekerja;
    waktu += c.waktu;
  });
  rolled.mesin += mesin;
  rolled.wc += wc;
  rolled.pekerja += pekerja;
  rolled.waktu += waktu;
  rolled.prosesTotal = rolled.mesin + rolled.wc + rolled.pekerja;
  rolled.biayaProduksi = rolled.matAdjusted + rolled.prosesTotal;
}

/** Rollup biaya pohon BOM (modul mengagregasi anak + proses pada node) */
export function rollupTreeCosts(node) {
  if (node.children?.length) {
    const rolled = { ...EMPTY_ROLLUP };
    node.children.forEach((ch) => {
      const c = rollupTreeCosts(ch);
      Object.keys(rolled).forEach((k) => {
        rolled[k] += c[k] || 0;
      });
    });
    if (node.tipe !== 'PART') {
      addOwnProsesToRollup(node, rolled);
    } else {
      rolled.biayaProduksi = rolled.matAdjusted + rolled.prosesTotal;
    }
    node._rollup = rolled;
    return rolled;
  }
  if (node.tipe === 'PART') {
    const row = computePartCostRow(node);
    node._rollup = row;
    return row;
  }
  node._rollup = { ...EMPTY_ROLLUP };
  return node._rollup;
}

/** Total dari semua PART di pohon */
export function computePartsTotals(bomData) {
  if (!bomData) return { ...EMPTY_ROLLUP };
  const walk = (node, acc) => {
    if (node.tipe === 'PART') {
      const r = computePartCostRow(node);
      Object.keys(acc).forEach((k) => {
        acc[k] += r[k] || 0;
      });
      return;
    }
    (node.children || []).forEach((ch) => walk(ch, acc));
  };
  const acc = { ...EMPTY_ROLLUP };
  walk(bomData, acc);
  return acc;
}

/** Peta rollup per id node (untuk tampilan modul/submodul di tabel struktur). */
export function buildNodeRollupMap(bomData) {
  const map = new Map();
  if (!bomData) return map;
  const clone = structuredClone(bomData);
  const walk = (n) => {
    rollupTreeCosts(n);
    if (n.id != null && n._rollup) {
      map.set(n.id, { ...n._rollup });
    }
    (n.children || []).forEach(walk);
  };
  walk(clone);
  return map;
}
