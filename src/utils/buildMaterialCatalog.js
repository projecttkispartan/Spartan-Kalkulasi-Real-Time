/**
 * Katalog material terpadu — mirror kolom Excel (DATA BASE, COATING, FORMULA DATA)
 */

function dimensiLabel(d) {
  if (!d) return '—';
  if (d.label) return d.label;
  const { p, l, t } = d;
  if (p && l && t) return `${p} × ${l} × ${t} mm`;
  return '—';
}

/** Normalisasi baris kayu DATA BASE → entri katalog */
export function woodRowToCatalogEntry(row) {
  const kode = row.kode || `WOOD-${String(row.no).padStart(3, '0')}`;
  return {
    id: row.id || kode,
    kode,
    no: row.no,
    nama: row.nama || row.specification || row.woodName,
    specification: row.specification || '',
    woodName: row.woodName || '',
    materialType: row.materialType || 'kayu',
    unit: row.unit || 'm³',
    dimensi: row.dimensi || { p: 0, l: 0, t: 0, label: row.diameterGrade || '' },
    diameterGrade: row.diameterGrade || '',
    finishingCode: row.finishingCode || '',
    hargaLog: row.hargaLogBuyer ?? row.pricePerM3Buyer ?? 0,
    safetyFactor: row.safetyFactorBuyer ?? row.priceSafetyFactorBuyer ?? 0,
    safetyFactorPct: row.buyerSafetyPct ?? 0.1,
    hargaMaterial: row.hargaMaterialBuyer ?? row.buyerTotalPerM3 ?? row.pricePerM3Supplier ?? 0,
    hargaLogSupplier: row.hargaLogSupplier ?? row.pricePerM3Supplier ?? 0,
    safetyFactorSupplier: row.safetyFactorSupplier ?? 0,
    hargaMaterialSupplier: row.hargaMaterialSupplier ?? row.pricePerM3Supplier ?? 0,
    invoiceCostPerM3: row.invoiceCostPerM3 ?? 0,
    vendorSupplier: row.vendorSupplier || row.supplierName || '',
    vendorBuyer: row.vendorBuyer || 'BUYER',
    supplierChannel: row.supplierChannel || '',
    source: row.source || 'DATA BASE',
    excelRef: row.excelRef || `DATA BASE row ${row.no}`,
    aktif: row.aktif !== false,
    // alias backward compat
    pricePerM3Buyer: row.pricePerM3Buyer,
    pricePerM3Supplier: row.pricePerM3Supplier,
    buyerTotalPerM3: row.buyerTotalPerM3,
  };
}

export function coatingToCatalogEntry(c) {
  const kode = c.kodeFinishing != null ? String(c.kodeFinishing) : `COAT-${c.no}`;
  return {
    id: c.id || `coat-${c.no}`,
    kode,
    no: c.no,
    nama: c.name || c.nama,
    materialType: 'coating',
    unit: 'm²',
    dimensi: { p: 0, l: 0, t: 0, label: 'per m²' },
    hargaLog: c.materialCostM2 ?? 0,
    safetyFactor: c.materialWaste ?? 0,
    safetyFactorPct: c.materialWaste || 0,
    hargaMaterial: c.totalMaterialM2 ?? c.materialCostM2 ?? 0,
    hargaSatuan: c.roundedCostM2 ?? c.totalProductionM2 ?? 0,
    laborPerM2: c.laborM2 ?? 0,
    vendorSupplier: c.vendorSupplier || '',
    vendorBuyer: '',
    source: 'COATING RATIO',
    excelRef: `COATING RATIO #${c.no}`,
    aktif: c.aktif !== false,
  };
}

export function formulaRowToCatalogEntry(fd) {
  const label = String(fd.materialType || fd.componentName || '').trim();
  if (!label) return null;
  const t = Number(fd.thicknessMm) || 0;
  return {
    id: fd.id || `fd-${fd.row}`,
    kode: `FD-${fd.no || fd.row}`,
    no: fd.no || fd.row,
    nama: fd.componentName || label,
    materialType: String(label).toLowerCase(),
    unit: t ? 'mm' : '—',
    dimensi: { p: 0, l: 0, t, label: t ? `T=${t}mm` : label },
    hargaLog: 0,
    safetyFactor: 0,
    safetyFactorPct: (Number(fd.wfPct) || 0) / 100 || (Number(fd.sfPct) || 0) / 100,
    hargaMaterial: 0,
    vendorSupplier: '',
    vendorBuyer: '',
    buyerRatio: fd.buyerRatio,
    supplierRatio: fd.supplierRatio,
    source: 'FORMULA DATA',
    excelRef: `FORMULA DATA row ${fd.row}`,
    aktif: true,
  };
}

export function supplierPartToCatalogEntry(row, supplierIndex = 1) {
  if (!row.description) return null;
  const p = row.prodP || row.invoiceP || 0;
  const l = row.prodL || row.invoiceL || 0;
  const t = row.prodT || row.invoiceT || 0;
  return {
    id: `sup${supplierIndex}-${row.no}-${slug(row.description)}`,
    kode: row.partCode || `SUP-${supplierIndex}-${row.no}`,
    no: row.no,
    nama: row.description.trim(),
    module: row.module || '',
    material: row.material || '',
    materialType: mapMaterialLabel(row.material),
    unit: 'm³',
    dimensi: {
      p,
      l,
      t,
      label: p && l && t ? `${p}×${l}×${t} mm` : '',
      invoice: { p: row.invoiceP, l: row.invoiceL, t: row.invoiceT },
    },
    vol: row.vol || 0,
    qty: row.qty || 1,
    hargaLog: row.priceMaterial || 0,
    safetyFactor: row.priceSafety || 0,
    safetyFactorPct: row.wasteFactor || 0,
    hargaMaterial: row.totalPrice || 0,
    vendorSupplier: `SUPPLIER ${supplierIndex}`,
    vendorBuyer: '',
    source: row.source || `KALKULASI SUPPLIER ${supplierIndex}`,
    excelRef: `row ${row.excelRow || row.no}`,
    aktif: true,
  };
}

function slug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);
}

function mapMaterialLabel(mat) {
  const u = String(mat || '').toUpperCase();
  if (u.includes('KAYU') || u.includes('MINDI') || u.includes('MAHOGANY')) return 'kayu';
  if (u.includes('PLY')) return 'plywood';
  if (u.includes('HARDWARE')) return 'hardware';
  return 'komponen';
}

/** Baris CALCULATION (hardware, lem, plywood, dll.) → entri katalog */
export function calculationComponentToCatalogEntry(row) {
  if (!row?.kode && !row?.nama) return null;
  const p = Number(row.p) || 0;
  const l = Number(row.l) || 0;
  const t = Number(row.t) || 0;
  const unit = row.unit || (row.materialType === 'hardware' ? 'EA' : row.materialType === 'kayu' ? 'm³' : '—');
  return {
    id: row.id || `calc-${slug(row.kode || row.nama)}`,
    kode: row.kode,
    nama: row.nama || row.kode,
    module: row.module || '',
    materialType: row.materialType || 'komponen',
    calcType: row.calcType || '',
    calcSubType: row.calcSubType || '',
    unit,
    dimensi: {
      p,
      l,
      t,
      label: p && l && t ? `${p}×${l}×${t} mm` : row.calcType || '',
    },
    vol: row.vol || 0,
    qty: row.qty || 1,
    surfaceM2: row.surfaceM2 || 0,
    hargaLog: row.biayaUnit || 0,
    hargaMaterial: row.biayaLine || row.biayaUnit || 0,
    hargaSatuan: row.biayaUnit || 0,
    safetyFactor: 0,
    safetyFactorPct: 0,
    vendorSupplier: '',
    vendorBuyer: '',
    source: row.source || 'CALCULATION',
    sourceFile: row.sourceFile || '',
    excelRef: row.excelRow ? `CALCULATION row ${row.excelRow}` : 'CALCULATION',
    aktif: true,
  };
}

/** Baris KALKULASI HPP MENTAH → entri katalog */
export function hppMentahToCatalogEntry(row) {
  if (!row?.description) return null;
  const p = row.prodP || row.invoiceP || 0;
  const l = row.prodL || row.invoiceL || 0;
  const t = row.prodT || row.invoiceT || 0;
  return {
    id: `hpp-${row.no}-${slug(row.description)}`,
    kode: row.partCode || `HPP-${row.no}`,
    no: row.no,
    nama: row.description.trim(),
    module: row.module || '',
    material: row.material || '',
    materialType: mapMaterialLabel(row.material),
    unit: 'm³',
    dimensi: { p, l, t, label: p && l && t ? `${p}×${l}×${t} mm` : '' },
    vol: row.vol || 0,
    qty: row.qty || 1,
    hargaLog: row.priceMaterial || 0,
    safetyFactor: row.priceSafety || 0,
    hargaMaterial: row.totalPrice || 0,
    vendorSupplier: 'HPP MENTAH',
    source: row.source || 'KALKULASI HPP MENTAH',
    sourceFile: row.sourceFile || '',
    excelRef: `row ${row.excelRow || row.no}`,
    aktif: true,
  };
}

/** Entri katalog dari baris section DATA BASE (plywood, mdf, …) */
export function sectionMaterialToCatalogEntry(row) {
  if (!row?.specification && !row?.nama) return null;
  const unit = row.unit || 'm3';
  const price =
    Number(row.hargaMaterialSupplier) ||
    Number(row.pricePerUnitSupplier) ||
    Number(row.pricePerM3Supplier) ||
    Number(row.pricePerM2Supplier) ||
    0;
  return {
    id: row.id,
    kode: row.kode || row.id,
    no: row.no,
    nama: row.nama || row.specification,
    specification: row.specification || row.nama,
    section: row.section,
    materialType: row.materialType || 'komponen',
    unit,
    dimensi: row.dimensi || { p: 0, l: 0, t: 0, label: row.specification },
    hargaLog: row.hargaLogBuyer ?? 0,
    safetyFactor: row.safetyFactorBuyer ?? 0,
    safetyFactorPct: row.buyerSafetyPct ?? 0,
    hargaMaterial: price,
    hargaSatuan: price,
    vendorSupplier: row.vendorSupplier || '',
    vendorBuyer: '',
    source: row.source || 'DATA BASE',
    excelRef: row.excelRef,
    aktif: row.aktif !== false,
  };
}

/** Gabungkan semua sumber master → satu tabel katalog */
export function buildMaterialCatalog({
  wood = [],
  coatings = [],
  formulaDataRows = [],
  nonWood = [],
  supplierParts = [],
  calculationComponents = [],
  hppMentahParts = [],
  sectionMaterials = [],
} = {}) {
  const catalog = [];
  const seen = new Set();

  for (const w of wood) {
    const entry = woodRowToCatalogEntry(w);
    if (!seen.has(entry.kode)) {
      seen.add(entry.kode);
      catalog.push(entry);
    }
  }

  for (const c of coatings) {
    const entry = coatingToCatalogEntry(c);
    const key = `coat-${entry.no}`;
    if (!seen.has(key)) {
      seen.add(key);
      catalog.push(entry);
    }
  }

  for (const fd of formulaDataRows) {
    const entry = formulaRowToCatalogEntry(fd);
    if (entry && !seen.has(entry.kode)) {
      seen.add(entry.kode);
      catalog.push(entry);
    }
  }

  for (const nw of nonWood) {
    const entry = {
      id: nw.id,
      kode: nw.kode || `NW-${nw.no}`,
      no: nw.no,
      nama: nw.specification || nw.woodName,
      materialType: nw.materialType || 'komponen',
      unit: '—',
      dimensi: { p: 0, l: 0, t: 0, label: nw.specification },
      hargaMaterial: nw.pricePerM3Supplier || 0,
      hargaLog: 0,
      safetyFactor: 0,
      safetyFactorPct: 0,
      vendorSupplier: nw.vendorSupplier || '',
      source: nw.source || 'FORMULA DATA',
      aktif: nw.aktif !== false,
    };
    if (!seen.has(entry.kode)) {
      seen.add(entry.kode);
      catalog.push(entry);
    }
  }

  for (const sp of supplierParts) {
    const entry = typeof sp === 'object' && sp.kode ? sp : supplierPartToCatalogEntry(sp);
    if (entry && !seen.has(entry.kode)) {
      seen.add(entry.kode);
      catalog.push(entry);
    }
  }

  for (const cc of calculationComponents) {
    const entry = calculationComponentToCatalogEntry(cc);
    if (entry && !seen.has(entry.kode)) {
      seen.add(entry.kode);
      catalog.push(entry);
    }
  }

  for (const hp of hppMentahParts) {
    const entry = hppMentahToCatalogEntry(hp);
    if (entry && entry.kode && !seen.has(entry.kode)) {
      seen.add(entry.kode);
      catalog.push(entry);
    }
  }

  for (const sm of sectionMaterials) {
    const entry = sectionMaterialToCatalogEntry(sm);
    if (entry && !seen.has(entry.kode)) {
      seen.add(entry.kode);
      catalog.push(entry);
    }
  }

  return catalog.sort((a, b) => {
    const ta = a.materialType || '';
    const tb = b.materialType || '';
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.no || 0) - (b.no || 0);
  });
}

export { dimensiLabel };
