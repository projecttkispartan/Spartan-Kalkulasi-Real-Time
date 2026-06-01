import {
  ZAN_EXCEL_KAYU_MATERIAL,
  ZAN_EXCEL_KAYU_PROCESS,
  ZAN_EXCEL_SUMMARY_LINES,
} from './zanExcelSummary.js';

const HPP_TOTAL = 421660.79999999993;
const MAT_SCALE = ZAN_EXCEL_KAYU_MATERIAL / HPP_TOTAL;

/**
 * Part kayu — biaya diskalakan ke MATERIAL COST baris KAYU di SUMMARY COST
 * (bukan hanya HPP mentah).
 */
export const ZAN_HPP_PARTS = [
  {
    kode: '1200230-1.3.0.2.1',
    nama: 'DUDUKAN LAMINASI SAMPING',
    qty: 2,
    p: 346,
    l: 135,
    t: 55,
    vol: 0.00256905,
    hppLineTotal: 49736.808,
    woodGradeId: 'wood-11',
    woodSpecification: 'MINDI - 30 UP 200',
  },
  {
    kode: '1200230-1.3.0.2.2',
    nama: 'DUDUKAN LAMINASI TENGAH',
    qty: 1,
    p: 350,
    l: 150,
    t: 55,
    vol: 0.0028875,
    hppLineTotal: 27951,
  },
  {
    kode: '1200230-1.3.0.2.3',
    nama: 'BAWAH LAMINASI SAMPING',
    qty: 2,
    p: 336,
    l: 145,
    t: 55,
    vol: 0.0026796,
    hppLineTotal: 51877.056,
  },
  {
    kode: '1200230-1.3.0.2.4',
    nama: 'BAWAH LAMINASI TENGAH',
    qty: 1,
    p: 360,
    l: 124,
    t: 55,
    vol: 0.0024552,
    hppLineTotal: 23766.336,
  },
  {
    kode: '1200230-1.3.0.2.5',
    nama: 'PANEL SAMPING',
    qty: 8,
    p: 420,
    l: 165,
    t: 50,
    vol: 0.003465,
    hppLineTotal: 268329.6,
  },
];

function allocateProcessByHpp() {
  return ZAN_HPP_PARTS.map((p) => ({
    ...p,
    processShare: ZAN_EXCEL_KAYU_PROCESS * (p.hppLineTotal / HPP_TOTAL),
    biaya: Math.round((p.hppLineTotal / p.qty) * MAT_SCALE),
  }));
}

const WOOD_PARTS = allocateProcessByHpp();

const FOTO = {
  MODUL: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=200&h=200&fit=crop&q=80',
  SUBMODUL: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=200&h=200&fit=crop&q=80',
  PART: 'https://images.unsplash.com/photo-1611078813350-0a149c40fd3b?w=200&h=200&fit=crop&q=80',
};

function excelFixedProses(nama, mfgProcess, biayaMesin, biayaPekerja, biayaWc = 0) {
  return {
    inputMode: 'work_center',
    nama,
    mfgProcess,
    waktuOperasi: 0,
    totalPerson: 1,
    biayaMesin: Number(biayaMesin) || 0,
    biayaPekerja: Number(biayaPekerja) || 0,
    biayaWc: Number(biayaWc) || 0,
    note: 'Total referensi SUMMARY COST Excel ZAN-100',
    proses: [],
  };
}

function woodPartNode(id, no, spec) {
  const proc = spec.processShare;
  const mesin = proc * 0.05;
  const wc = proc * 0.05;
  const pekerja = proc - mesin - wc;
  return {
    id,
    no,
    nama: spec.nama,
    kode: spec.kode,
    tipe: 'PART',
    qty: spec.qty,
    unit: 'EA',
    p: spec.p,
    l: spec.l,
    t: spec.t,
    vol: spec.vol,
    biaya: spec.biaya,
    woodGradeId: spec.woodGradeId || 'wood-11',
    woodSpecification: spec.woodSpecification || 'MINDI - 30 UP 200',
    materialType: 'kayu',
    sf: 0,
    wf: 0,
    catatan: 'Material SUMMARY KAYU + proses woodworking',
    proses_count: 1,
    foto: FOTO.PART,
    proses: [
      excelFixedProses(`Proses ${spec.nama}`, 'Woodworking', mesin, pekerja, wc),
    ],
  };
}

function summaryLinePart(id, no, line) {
  const proc = line.process;
  const mesin = proc * 0.02;
  const pekerja = proc - mesin;
  return {
    id,
    no,
    nama: line.label,
    kode: `ZAN-${line.key.toUpperCase()}`,
    tipe: 'PART',
    qty: 1,
    unit: 'SET',
    p: 0,
    l: 0,
    t: 0,
    vol: 0,
    biaya: Math.round(line.material),
    materialType: line.materialType,
    sf: 0,
    wf: 0,
    catatan: `SUMMARY COST Excel — total Rp ${Math.round(line.total)}`,
    proses_count: proc > 0 ? 1 : 0,
    foto: FOTO.PART,
    proses:
      proc > 0
        ? [excelFixedProses(line.label, mapMfgProcess(line.key), mesin, pekerja)]
        : [],
  };
}

function mapMfgProcess(key) {
  if (key === 'amplas' || key === 'finishing') return 'Finishing';
  if (key === 'assemblingHw' || key === 'fittingHw') return 'Assembly';
  if (key === 'laminating') return 'Coating';
  return 'Lainnya';
}

function submodulNode(id, no, { nama, kode, children }) {
  return {
    id,
    no,
    nama,
    kode,
    tipe: 'SUBMODUL',
    qty: 1,
    unit: 'SET',
    p: null,
    l: null,
    t: null,
    vol: 0,
    biaya: 0,
    catatan: '',
    proses_count: 0,
    foto: FOTO.SUBMODUL,
    children,
  };
}

/** BOM + biaya paritas SUMMARY COST ZAN-100 */
export const zanStoolGraph = {
  id: 'zan-root',
  no: 1,
  nama: 'BODI',
  kode: '1200230-0.0.0.2.0',
  tipe: 'MODUL',
  qty: 1,
  unit: 'SET',
  p: 340,
  l: 340,
  t: 505,
  vol: 0.05837,
  biaya: 0,
  catatan: 'Modul utama — ZANZIBAR STOOL',
  proses_count: 0,
  foto: FOTO.MODUL,
  children: [
    submodulNode('zan-sm-atas', 2, {
      nama: 'ATAS',
      kode: '1200230-1.1',
      children: [
        woodPartNode('zan-p-1', 3, WOOD_PARTS[0]),
        woodPartNode('zan-p-2', 4, WOOD_PARTS[1]),
      ],
    }),
    submodulNode('zan-sm-bawah', 5, {
      nama: 'BAWAH',
      kode: '1200230-1.2',
      children: [
        woodPartNode('zan-p-3', 6, WOOD_PARTS[2]),
        woodPartNode('zan-p-4', 7, WOOD_PARTS[3]),
      ],
    }),
    submodulNode('zan-sm-samping', 8, {
      nama: 'SAMPING',
      kode: '1200230-1.3',
      children: [woodPartNode('zan-p-5', 9, WOOD_PARTS[4])],
    }),
    submodulNode('zan-sm-komponen', 10, {
      nama: 'KOMPONEN & PROSES',
      kode: 'ZAN-KOMPONEN',
      children: ZAN_EXCEL_SUMMARY_LINES.map((line, i) =>
        summaryLinePart(`zan-xl-${line.key}`, 11 + i, line),
      ),
    }),
  ],
};
