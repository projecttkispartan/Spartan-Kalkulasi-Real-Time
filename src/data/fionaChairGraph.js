import {
  FIONA_EXCEL_KAYU_MATERIAL,
  FIONA_EXCEL_KAYU_PROCESS,
  FIONA_EXCEL_SUMMARY_LINES,
} from './fionaExcelSummary.js';

const HPP_TOTAL = 316676;
const MAT_SCALE = FIONA_EXCEL_KAYU_MATERIAL / HPP_TOTAL;

/** Part kayu — biaya unit dari CALCULATION; proses dialokasi ke baris KAYU SUMMARY */
export const FIONA_HPP_PARTS = [
  { kode: '1200310-1.3.0.2.1', nama: 'KAKI', qty: 4, p: 450, l: 65, t: 35, vol: 0.00102375, hppLineTotal: 69992 },
  { kode: '1200310-1.3.0.2.2', nama: 'SUNDUK SAMPING', qty: 2, p: 350, l: 55, t: 35, vol: 0.00067375, hppLineTotal: 23032 },
  { kode: '1200310-1.3.0.2.3', nama: 'SUNDUK DEPAN BELAKANG', qty: 2, p: 480, l: 55, t: 35, vol: 0.000924, hppLineTotal: 31586 },
  { kode: '1200310-1.3.0.2.4', nama: 'TIANG SANDARAN', qty: 2, p: 550, l: 100, t: 30, vol: 0.00165, hppLineTotal: 56402 },
  { kode: '1200310-1.0.0.2.5', nama: 'TEMPEL TIANG SANDARAN', qty: 2, p: 450, l: 75, t: 30, vol: 0.0010125, hppLineTotal: 34610 },
  { kode: '1200310-1.3.0.2.6', nama: 'JARI JARI SANDARAN', qty: 5, p: 550, l: 20, t: 20, vol: 0.00022, hppLineTotal: 18800 },
  { kode: '1200310-1.3.0.2.7', nama: 'SUNDUK SANDARAN ATAS', qty: 1, p: 450, l: 65, t: 50, vol: 0.0014625, hppLineTotal: 24997 },
  { kode: '1200310-1.3.0.2.8', nama: 'SIKON', qty: 1, p: 500, l: 60, t: 25, vol: 0.00075, hppLineTotal: 12819 },
  { kode: '1200310-1.3.0.18.9', nama: 'RAM DUDUKAN PANJANG', qty: 2, p: 420, l: 65, t: 25, vol: 0.0006825, hppLineTotal: 23330 },
  { kode: '1200310-1.3.0.18.10', nama: 'RAM DUDUKAN PENDEK', qty: 2, p: 380, l: 65, t: 25, vol: 0.0006175, hppLineTotal: 21108 },
];

function allocateProcessByHpp() {
  return FIONA_HPP_PARTS.map((p) => ({
    ...p,
    processShare: FIONA_EXCEL_KAYU_PROCESS * (p.hppLineTotal / HPP_TOTAL),
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
    note: 'Total referensi SUMMARY COST Excel FNA-550',
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
    woodGradeId: 'wood-11',
    woodSpecification: 'MINDI - 30 UP 200',
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
    kode: `FNA-${line.key.toUpperCase().replace(/_/g, '-')}`,
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
  if (key === 'amplas' || key === 'finishing' || key === 'gerinda') return 'Finishing';
  if (key === 'assembling_hardware' || key === 'fitting_hardware') return 'Assembly';
  if (key === 'upholstery') return 'Upholstery';
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

/** BOM paritas SUMMARY COST FNA-550 — tanpa submodul EXCEL-SUMMARY duplikat */
export const fionaChairGraph = {
  id: 'fna-root',
  no: 1,
  nama: 'BODI',
  kode: 'FNA-550',
  tipe: 'MODUL',
  qty: 1,
  unit: 'SET',
  p: 530,
  l: 575,
  t: 935,
  vol: 0,
  biaya: 0,
  catatan: 'FIONA CHAIR BLACK LIMED',
  proses_count: 0,
  foto: FOTO.MODUL,
  children: [
    submodulNode('fna-sm-kayu', 2, {
      nama: 'KAYU',
      kode: 'FNA-KAYU',
      children: WOOD_PARTS.map((spec, i) =>
        woodPartNode(`fna-p-${i}`, 3 + i, spec),
      ),
    }),
    submodulNode('fna-sm-proses', 20, {
      nama: 'KOMPONEN & PROSES',
      kode: 'FNA-KOMPONEN',
      children: FIONA_EXCEL_SUMMARY_LINES.map((line, i) =>
        summaryLinePart(`fna-xl-${line.key}`, 21 + i, line),
      ),
    }),
  ],
};
