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
  const sf = Number(d.sf) || 0;
  const wf = Number(d.wf) || 0;
  const qty = Number(d.qty) || 1;
  const unitMat = Number(d.biaya) || 0;
  const matBase = unitMat * qty;
  const sfAmt = matBase * (sf / 100);
  const wfAmt = matBase * (wf / 100);
  const matAdjusted = matBase + sfAmt + wfAmt;

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

/** Rollup biaya pohon BOM (modul mengagregasi anak) */
export function rollupTreeCosts(node) {
  if (node.children?.length) {
    const rolled = { ...EMPTY_ROLLUP };
    node.children.forEach((ch) => {
      const c = rollupTreeCosts(ch);
      Object.keys(rolled).forEach((k) => {
        rolled[k] += c[k] || 0;
      });
    });
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
