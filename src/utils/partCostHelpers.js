import { expandProsesList } from './bomCostRollup';
import { calcProsesCosts } from './operationCosts';

/** Biaya produksi struktur BOM (tanpa SF/WF — sama dengan tabel Struktur Perakitan) */
export function calcStrukturProdFinancials(d, kursUsd, kursEur) {
  let totalProcess = 0;
  expandProsesList(d).forEach((p) => {
    totalProcess += calcProsesCosts(p).total;
  });
  if (!d.proses?.length && d.proses_count > 0) {
    totalProcess += d.proses_count * 110000;
  }
  const qty = Number(d.qty) || 1;
  const unitMat = Number(d.biaya) || 0;
  const prodTotal = unitMat * qty + totalProcess;
  const prodUnit = qty ? prodTotal / qty : prodTotal;
  const usd = (v) => (Number(kursUsd) ? (v / kursUsd).toFixed(2) : '0.00');
  const eur = (v) => (Number(kursEur) ? (v / kursEur).toFixed(2) : '0.00');
  return {
    qty,
    unitMat,
    usdMat: usd(unitMat),
    eurMat: eur(unitMat),
    prodTotal,
    prodUnit,
    usdProd: usd(prodTotal),
    eurProd: eur(prodTotal),
    usdProdUnit: usd(prodUnit),
    eurProdUnit: eur(prodUnit),
  };
}

/** Hitung harga material & produksi (satuan + total) untuk satu PART — dengan SF/WF */
export function calcPartRowFinancials(d, kursUsd, kursEur) {
  const sf = Number(d.sf) || 0;
  const wf = Number(d.wf) || 0;
  const qty = Number(d.qty) || 1;
  const unitMat = Number(d.biaya) || 0;
  let totalProcess = 0;
  expandProsesList(d).forEach((p) => {
    totalProcess += calcProsesCosts(p).total;
  });
  const matTotal = unitMat * qty * (1 + sf / 100 + wf / 100);
  const prodTotal = matTotal + totalProcess;
  const prodUnit = qty ? prodTotal / qty : prodTotal;
  const usd = (v) => (Number(kursUsd) ? (v / kursUsd).toFixed(2) : '0.00');
  const eur = (v) => (Number(kursEur) ? (v / kursEur).toFixed(2) : '0.00');
  return {
    qty,
    unitMat,
    usdMat: usd(unitMat),
    eurMat: eur(unitMat),
    matTotal,
    prodTotal,
    prodUnit,
    usdProd: usd(prodTotal),
    eurProd: eur(prodTotal),
    usdProdUnit: usd(prodUnit),
    eurProdUnit: eur(prodUnit),
  };
}
