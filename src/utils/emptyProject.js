import { manufactureGraph } from '../data/mockData.js';
import { zanStoolGraph } from '../data/zanStoolGraph.js';
import { ZAN_EXCEL_BOX_PACKING } from '../data/zanExcelSummary.js';
import {
  ELBA_CHAIR_REFERENCE,
  EXCEL_FACTORY_OH_PCT,
  ZAN_STOOL_REFERENCE,
} from '../data/excelReference.js';
import {
  buildDefaultContainerRows,
  calcContainerNetCapacity,
  calcPackingVolume,
  findPackingByType,
} from './packingVolume.js';
import { defaultImagesByTipe } from './images.js';

export function newProjectId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyBom() {
  return {
    id: 'root-new',
    no: 1,
    nama: '',
    kode: '',
    tipe: 'MODUL',
    qty: 1,
    unit: 'SET',
    p: 0,
    l: 0,
    t: 0,
    vol: 0,
    biaya: 0,
    catatan: '',
    proses_count: 0,
    foto: defaultImagesByTipe.produk,
    children: [],
  };
}

export function createEmptyProductInfo() {
  return {
    kode: '',
    nama: '',
    varian: '',
    customer: '',
    kodeBom: '',
    namaBom: '',
    versi: '',
  };
}

export function createEmptyProductMeta() {
  return { itemType: '', wood: '', woodGradeId: '', coating: '', coatingId: '' };
}

export function createDefaultPackingDimensions() {
  return [
    { id: 1, type: 'BOX KARTON', tolW: 40, tolD: 40, tolH: 50 },
    { id: 2, type: 'SINGLE FACE', tolW: 10, tolD: 10, tolH: 20, chairFactor: true },
  ];
}

export function createDefaultPackingSpec() {
  return {
    materialsBox: [],
    materialsSF: [],
    routingBox: [],
    routingSF: [],
  };
}

export function createDefaultCogsConfig() {
  return {
    packingJalur: 'BOX',
    factoryOhPct: EXCEL_FACTORY_OH_PCT,
    managementOhPct: 2.5,
    markupPct: 20,
  };
}

export function createDefaultCustomErp() {
  return { parts: [], machines: [], workers: [] };
}

/** Pastikan dokumen project punya field wajib — cegah crash saat dibuka di editor */
export function normalizeProject(doc) {
  if (!doc?.id) return null;

  const productInfo = { ...createEmptyProductInfo(), ...(doc.productInfo || {}) };
  let bomData = doc.bomData;
  if (!bomData || typeof bomData !== 'object') {
    bomData = createEmptyBom();
  } else if (!bomData.id) {
    bomData = { ...createEmptyBom(), ...bomData };
  }

  const kode = doc.kode || productInfo.kode || '';
  const nama =
    doc.nama || productInfo.namaBom || productInfo.nama || (kode || 'Proyek Baru');

  return {
    ...createEmptyProject(),
    ...doc,
    kode,
    nama,
    customer: doc.customer || productInfo.customer || '',
    versi: doc.versi || productInfo.versi || '1.0',
    productInfo: {
      ...productInfo,
      kode: productInfo.kode || kode,
      namaBom: productInfo.namaBom || productInfo.nama || nama,
    },
    productMeta: { ...createEmptyProductMeta(), ...(doc.productMeta || {}) },
    bomData,
    packingDimensions:
      Array.isArray(doc.packingDimensions) && doc.packingDimensions.length
        ? doc.packingDimensions
        : createDefaultPackingDimensions(),
    packingSpec: {
      ...createDefaultPackingSpec(),
      ...(doc.packingSpec || {}),
      materialsBox: doc.packingSpec?.materialsBox ?? [],
      materialsSF: doc.packingSpec?.materialsSF ?? [],
      routingBox: doc.packingSpec?.routingBox ?? [],
      routingSF: doc.packingSpec?.routingSF ?? [],
    },
    containerCapacity:
      Array.isArray(doc.containerCapacity) && doc.containerCapacity.length
        ? doc.containerCapacity
        : buildDefaultContainerRows(),
    cogsConfig: { ...createDefaultCogsConfig(), ...(doc.cogsConfig || {}) },
    customErp: {
      ...createDefaultCustomErp(),
      ...(doc.customErp || {}),
      parts: doc.customErp?.parts ?? [],
      machines: doc.customErp?.machines ?? [],
      workers: doc.customErp?.workers ?? [],
    },
    kursUsd: doc.kursUsd ?? 16004,
    kursEur: doc.kursEur ?? 17500,
    excelMirror: doc.excelMirror ?? null,
    importSheets: doc.importSheets ?? [],
    importedFromExcel: doc.importedFromExcel ?? false,
  };
}

/** Dokumen project BOM lengkap — versi LIVE */
export function createEmptyProject(overrides = {}) {
  const now = new Date().toISOString();
  const id = overrides.id || newProjectId();
  const productInfo = { ...createEmptyProductInfo(), ...overrides.productInfo };

  return {
    schemaVersion: 1,
    id,
    kode: overrides.kode ?? productInfo.kode ?? '',
    nama: overrides.nama ?? productInfo.nama ?? 'Proyek Baru',
    customer: overrides.customer ?? productInfo.customer ?? '',
    versi: overrides.versi ?? productInfo.versi ?? '1.0',
    status: overrides.status ?? 'draft',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    createdBy: overrides.createdBy ?? 'Admin',
    productInfo,
    productMeta: { ...createEmptyProductMeta(), ...overrides.productMeta },
    dimensi: overrides.dimensi ?? { w: 0, d: 0, h: 0 },
    bomData: overrides.bomData ?? createEmptyBom(),
    packingDimensions: overrides.packingDimensions ?? createDefaultPackingDimensions(),
    packingSpec: overrides.packingSpec ?? createDefaultPackingSpec(),
    containerCapacity: overrides.containerCapacity ?? buildDefaultContainerRows(),
    cogsConfig: { ...createDefaultCogsConfig(), ...overrides.cogsConfig },
    kursUsd: overrides.kursUsd ?? 16004,
    kursEur: overrides.kursEur ?? 17500,
    customErp: overrides.customErp ?? createDefaultCustomErp(),
    excelMirror: overrides.excelMirror ?? null,
    importSheets: overrides.importSheets ?? [],
    importedFromExcel: overrides.importedFromExcel ?? false,
  };
}

/** Seed ELBA CHAIR — dari demo manufactureGraph + default editor */
export function createProjectFromElbaSeed() {
  const now = new Date().toISOString();
  return createEmptyProject({
    id: newProjectId(),
    kode: ELBA_CHAIR_REFERENCE.kode,
    nama: ELBA_CHAIR_REFERENCE.namaBom,
    customer: ELBA_CHAIR_REFERENCE.customer,
    versi: ELBA_CHAIR_REFERENCE.versi,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    productInfo: {
      kode: ELBA_CHAIR_REFERENCE.kode,
      nama: ELBA_CHAIR_REFERENCE.nama,
      varian: 'NLH',
      customer: ELBA_CHAIR_REFERENCE.customer,
      kodeBom: ELBA_CHAIR_REFERENCE.kodeBom,
      namaBom: ELBA_CHAIR_REFERENCE.namaBom,
      versi: ELBA_CHAIR_REFERENCE.versi,
    },
    productMeta: {
      itemType: ELBA_CHAIR_REFERENCE.itemType,
      wood: ELBA_CHAIR_REFERENCE.wood,
      coating: ELBA_CHAIR_REFERENCE.coating,
    },
    dimensi: { ...ELBA_CHAIR_REFERENCE.dimensi },
    bomData: structuredClone(manufactureGraph),
    packingDimensions: createDefaultPackingDimensions(),
    packingSpec: {
      materialsBox: [
        { id: 1, nama: 'Karton Luar (Double Wall)', qty: 1, unit: 'Pcs', harga: 114000 },
        { id: 2, nama: 'Lakban Bening 2"', qty: 0.5, unit: 'Roll', harga: 12000 },
      ],
      materialsSF: [
        { id: 1, nama: 'Single Face Paper', qty: 3, unit: 'Meter', harga: 15000 },
        { id: 2, nama: 'Tali Strapping', qty: 10, unit: 'Meter', harga: 500 },
      ],
      routingBox: [
        { id: 1, nama: 'Melipat & Lakban Bawah', waktu: 5, pekerja: 1, rate: 500 },
        { id: 2, nama: 'Memasukkan Produk & Segel', waktu: 10, pekerja: 2, rate: 500 },
      ],
      routingSF: [
        { id: 1, nama: 'Bungkus Full Body SF', waktu: 15, pekerja: 2, rate: 500 },
        { id: 2, nama: 'Ikat Strapping Tape', waktu: 10, pekerja: 2, rate: 500 },
      ],
    },
    containerCapacity: buildDefaultContainerRows(),
    cogsConfig: createDefaultCogsConfig(),
    kursUsd: 16004,
    kursEur: 17500,
    customErp: createDefaultCustomErp(),
  });
}

function buildZanContainerRows() {
  const packingDimensions = createDefaultPackingDimensions();
  const box = findPackingByType(packingDimensions, 'box');
  const volBox = calcPackingVolume(ZAN_STOOL_REFERENCE.dimensi, box, {
    itemType: ZAN_STOOL_REFERENCE.itemType,
  });
  const rows = buildDefaultContainerRows(volBox, 0);
  const ref = ZAN_STOOL_REFERENCE.containerPcsBox;
  return rows.map((row) => {
    if (row.presetId === '20foot') {
      return { ...row, netCapBox: ref['20foot'] };
    }
    if (row.presetId === '40foot') {
      return { ...row, netCapBox: ref['40foot'] };
    }
    if (row.presetId === '40hc') {
      return { ...row, netCapBox: ref['40hc'] };
    }
    if (row.presetId === '1piece') {
      const caps = calcContainerNetCapacity(
        { boxFromVolume: true },
        volBox,
        0,
      );
      return { ...row, netCapBox: caps.netCapBox };
    }
    return row;
  });
}

/** Versi data sample — naikkan jika seed BOM/HPP diperbarui */
export const ZAN_SAMPLE_SEED_VERSION = 4;

/** Seed ZANZIBAR STOOL — dari 1 - ZAN-100 - 2-12-25.xlsx */
export function createProjectFromZanSeed() {
  const now = new Date().toISOString();
  const packingDimensions = createDefaultPackingDimensions();

  return createEmptyProject({
    id: newProjectId(),
    sampleSeedVersion: ZAN_SAMPLE_SEED_VERSION,
    sampleKey: 'ZAN-10',
    kode: ZAN_STOOL_REFERENCE.kode,
    nama: ZAN_STOOL_REFERENCE.namaBom,
    customer: ZAN_STOOL_REFERENCE.customer,
    versi: ZAN_STOOL_REFERENCE.versi,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    productInfo: {
      kode: ZAN_STOOL_REFERENCE.kode,
      nama: ZAN_STOOL_REFERENCE.nama,
      varian: '',
      customer: ZAN_STOOL_REFERENCE.customer,
      kodeBom: ZAN_STOOL_REFERENCE.kodeBom,
      namaBom: ZAN_STOOL_REFERENCE.namaBom,
      versi: ZAN_STOOL_REFERENCE.versi,
    },
    productMeta: {
      itemType: ZAN_STOOL_REFERENCE.itemType,
      wood: 'MINDI - 30 UP 200',
      woodGradeId: 'wood-11',
      coating: ZAN_STOOL_REFERENCE.coating,
      coatingId: 'coat-33',
    },
    dimensi: { ...ZAN_STOOL_REFERENCE.dimensi },
    bomData: structuredClone(zanStoolGraph),
    packingDimensions,
    packingSpec: {
      materialsBox: [
        {
          id: 1,
          nama: 'BOX PACKING (Karton)',
          qty: 1,
          unit: 'Pcs',
          harga: Math.round(ZAN_EXCEL_BOX_PACKING.material),
        },
      ],
      materialsSF: [],
      routingBox: [
        {
          id: 1,
          nama: 'Tenaga BOX PACKING',
          waktu: Math.round(ZAN_EXCEL_BOX_PACKING.labor / 500),
          pekerja: 1,
          rate: 500,
        },
      ],
      routingSF: [],
    },
    containerCapacity: buildZanContainerRows(),
    cogsConfig: createDefaultCogsConfig(),
    kursUsd: 16000,
    kursEur: 17800,
    customErp: createDefaultCustomErp(),
  });
}

/** Ringkasan untuk baris dashboard */
export function projectListMeta(doc) {
  return {
    id: doc.id,
    kode: doc.kode || doc.productInfo?.kode || '—',
    nama: doc.nama || doc.productInfo?.namaBom || doc.productInfo?.nama || '—',
    customer: doc.customer || doc.productInfo?.customer || '—',
    versi: doc.versi || doc.productInfo?.versi || '—',
    status: doc.status || 'draft',
    updatedAt: doc.updatedAt,
    hpp: doc.cachedHpp ?? 0,
    pembuat: doc.createdBy || 'Admin',
    tanggalDibuat: doc.createdAt,
    tanggalUpdate: doc.updatedAt,
    jumlahBom: 1,
    jumlahProduk: 1,
  };
}
