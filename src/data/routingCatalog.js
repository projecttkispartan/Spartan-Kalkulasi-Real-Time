export const DEFAULT_LABOR_RATE_PER_MIN = 500;

/** Template gaji — referensi master HR */
export const SALARY_TEMPLATES = [
  { id: 'TPL-OP-PROD', nama: 'Template Operator Produksi' },
  { id: 'TPL-OP-CNC', nama: 'Template Operator CNC' },
  { id: 'TPL-OP-FIN', nama: 'Template Operator Finishing' },
  { id: 'TPL-OP-ASM', nama: 'Template Operator Perakitan' },
  { id: 'TPL-MANDOR', nama: 'Template Mandor Line' },
];

/** Daftar mesin produksi */
export const MACHINES = [
  'Chainsaw',
  'Panel Saw',
  'CNC Router 5-Axis',
  'Wood Lathe',
  'Belt Sander',
  'Spray Booth',
  'Edge Bander',
  'Drill Press',
  '—',
];

const wcBase = (overrides) => ({
  usesMachine: true,
  mesin: '—',
  tipeGaji: 'Harian',
  templateGaji: 'Template Operator Produksi',
  defaultTime: 0,
  actualTime: 0,
  oeeTarget: 90,
  capacityUnit: 'm³',
  setupTime: 10,
  timeEfficiency: 100,
  productionTime: 0,
  cleanUpTime: 5,
  defaultPerson: 2,
  actualPerson: 2,
  knife: '—',
  notes: '',
  ...overrides,
});

/** Katalog Work Center — referensi ERP (WCT / WC-xxx) */
export const WORK_CENTERS = [
  wcBase({
    id: 'WC-001',
    kode: 'WC-001',
    nama: 'Cutting Section',
    mfgProcess: 'Preparation',
    ratePerMin: 2104,
    wcCostPerMin: 14,
    laborRatePerMin: 7525,
    capacity: '80',
    capacityUnit: 'Meter (M)',
    lokasi: 'Line A',
    mesin: 'Chainsaw',
    tipeGaji: 'Borongan',
    templateGaji: 'Template Operator Produksi',
    defaultTime: 150,
    actualTime: 120,
    oeeTarget: 90,
    setupTime: 10,
    productionTime: 140,
    cleanUpTime: 10,
    timeEfficiency: 125,
    defaultPerson: 2,
    actualPerson: 2,
    knife: 'Ripping Blade',
    notes: 'Potong bahan baku kayu solid & plywood',
  }),
  wcBase({
    id: 'WCT-PEMOTONGAN',
    kode: 'WCT-PEMOTONGAN',
    nama: 'WCT Pemotongan',
    mfgProcess: 'Preparation',
    ratePerMin: 2104,
    wcCostPerMin: 2104,
    laborRatePerMin: 6294,
    capacity: '12',
    lokasi: 'Area A',
    mesin: 'Panel Saw',
    defaultTime: 15,
    actualTime: 15,
    defaultPerson: 2,
    knife: 'Rip Blade',
    notes: 'Potong pola komponen furniture',
  }),
  wcBase({
    id: 'WCT-CNC',
    kode: 'WCT-CNC',
    nama: 'WCT CNC Router',
    mfgProcess: 'Woodworking',
    ratePerMin: 2500,
    wcCostPerMin: 2500,
    laborRatePerMin: 550,
    capacity: '10',
    lokasi: 'Area B',
    mesin: 'CNC Router 5-Axis',
    tipeGaji: 'Harian',
    templateGaji: 'Template Operator CNC',
    defaultTime: 45,
    defaultPerson: 1,
    oeeTarget: 85,
    notes: 'Routing & profiling presisi',
  }),
  wcBase({
    id: 'WCT-AMPLAS',
    kode: 'WCT-AMPLAS',
    nama: 'WCT Amplas & Prep Finishing',
    mfgProcess: 'Finishing',
    ratePerMin: 1800,
    wcCostPerMin: 1800,
    laborRatePerMin: 500,
    capacity: '14',
    lokasi: 'Area D',
    mesin: 'Belt Sander',
    defaultTime: 20,
    defaultPerson: 2,
    knife: '—',
    notes: 'Amplas halus sebelum coating',
  }),
  wcBase({
    id: 'WCT-PERAKITAN',
    kode: 'WCT-PERAKITAN',
    nama: 'WCT Perakitan',
    mfgProcess: 'Assembly',
    ratePerMin: 1650,
    wcCostPerMin: 1650,
    laborRatePerMin: 450,
    capacity: '16',
    lokasi: 'Area C',
    usesMachine: false,
    mesin: '—',
    tipeGaji: 'Harian',
    templateGaji: 'Template Operator Perakitan',
    defaultTime: 35,
    defaultPerson: 3,
    setupTime: 15,
    notes: 'Perakitan submodul & hardware',
  }),
  wcBase({
    id: 'WCT-COATING',
    kode: 'WCT-COATING',
    nama: 'WCT Coating & Finishing',
    mfgProcess: 'Finishing',
    ratePerMin: 2200,
    wcCostPerMin: 2200,
    laborRatePerMin: 520,
    capacity: '12',
    lokasi: 'Area D',
    mesin: 'Spray Booth',
    defaultTime: 25,
    defaultPerson: 2,
    oeeTarget: 88,
    notes: 'NC coating / stain / sealant',
  }),
  wcBase({
    id: 'WCT-QC',
    kode: 'WCT-QC',
    nama: 'WCT Quality Control',
    mfgProcess: 'QC',
    ratePerMin: 800,
    wcCostPerMin: 800,
    laborRatePerMin: 400,
    capacity: '20',
    lokasi: 'Area QC',
    usesMachine: false,
    defaultTime: 10,
    defaultPerson: 1,
    notes: 'Inspeksi dimensi & finishing',
  }),
  wcBase({
    id: 'WCT-PACKING',
    kode: 'WCT-PACKING',
    nama: 'WCT Packing Ekspor',
    mfgProcess: 'Packing',
    ratePerMin: 1200,
    wcCostPerMin: 1200,
    laborRatePerMin: 400,
    capacity: '25',
    lokasi: 'Area E',
    usesMachine: false,
    defaultTime: 15,
    defaultPerson: 2,
    notes: 'Box, bubble wrap, palletizing',
  }),
  // Alias legacy — backward compat mock BOM
  wcBase({
    id: 'WC-PREP-01',
    kode: 'WC-PREP-01',
    nama: 'Preparation — Potong Pola',
    mfgProcess: 'Preparation',
    ratePerMin: 1000,
    wcCostPerMin: 1000,
    laborRatePerMin: 500,
    capacity: '12',
    lokasi: 'Area A',
    mesin: 'Panel Saw',
    defaultTime: 15,
    knife: 'Rip Blade',
  }),
  wcBase({
    id: 'WC-WOOD-01',
    kode: 'WC-WOOD-01',
    nama: 'Woodworking — Bubut & Shaping',
    mfgProcess: 'Woodworking',
    ratePerMin: 1200,
    wcCostPerMin: 1200,
    laborRatePerMin: 500,
    capacity: '14',
    lokasi: 'Area B',
    mesin: 'Wood Lathe',
    defaultTime: 30,
  }),
  wcBase({
    id: 'WC-WOOD-02',
    kode: 'WC-WOOD-02',
    nama: 'Woodworking — CNC Router',
    mfgProcess: 'Woodworking',
    ratePerMin: 1500,
    wcCostPerMin: 1500,
    laborRatePerMin: 550,
    capacity: '10',
    lokasi: 'Area B',
    mesin: 'CNC Router 5-Axis',
    defaultTime: 45,
    defaultPerson: 1,
  }),
  wcBase({
    id: 'WC-ASM-01',
    kode: 'WC-ASM-01',
    nama: 'Assembly — Perakitan Submodul',
    mfgProcess: 'Assembly',
    ratePerMin: 900,
    wcCostPerMin: 900,
    laborRatePerMin: 450,
    capacity: '16',
    lokasi: 'Area C',
    usesMachine: false,
    defaultTime: 35,
    defaultPerson: 3,
  }),
  wcBase({
    id: 'WC-FIN-01',
    kode: 'WC-FIN-01',
    nama: 'Finishing — Amplas & Coating',
    mfgProcess: 'Finishing',
    ratePerMin: 1100,
    wcCostPerMin: 1100,
    laborRatePerMin: 500,
    capacity: '12',
    lokasi: 'Area D',
    mesin: 'Spray Booth',
    defaultTime: 20,
  }),
  wcBase({
    id: 'WC-PACK-01',
    kode: 'WC-PACK-01',
    nama: 'Packing — Box & Seal',
    mfgProcess: 'Packing',
    ratePerMin: 800,
    wcCostPerMin: 800,
    laborRatePerMin: 400,
    capacity: '20',
    lokasi: 'Area E',
    usesMachine: false,
    defaultTime: 15,
  }),
];

/** Template routing produk — referensi RTMKJ6 */
export const ROUTING_TEMPLATES = [
  {
    id: 'RTMKJ6',
    kode: 'RTMKJ6',
    nama: 'Routing Produk',
    deskripsi: 'Alur standar produk furniture: potong → CNC → amplas → rakit → finishing',
    steps: [
      { urutan: 1, workCenterId: 'WCT-PEMOTONGAN', namaProses: 'Potong Pola', waktuMenit: 15, totalPerson: 2, note: 'Rough cut material' },
      { urutan: 2, workCenterId: 'WCT-CNC', namaProses: 'Profiling CNC', waktuMenit: 30, totalPerson: 1, note: 'Profil & pocket' },
      { urutan: 3, workCenterId: 'WCT-AMPLAS', namaProses: 'Amplas Halus', waktuMenit: 20, totalPerson: 2, note: 'Grit 180–220' },
      { urutan: 4, workCenterId: 'WCT-PERAKITAN', namaProses: 'Perakitan Submodul', waktuMenit: 35, totalPerson: 3, note: 'Drill & confirmat' },
      { urutan: 5, workCenterId: 'WCT-COATING', namaProses: 'NC Coating', waktuMenit: 25, totalPerson: 2, note: '2 coat NC matt' },
    ],
  },
  {
    id: 'RT-ELBA-CHAIR',
    kode: 'RT-ELBA-01',
    nama: 'Routing ELBA Chair',
    deskripsi: 'Routing khusus kursi ELBA — sandaran & dudukan',
    steps: [
      { urutan: 1, workCenterId: 'WCT-PEMOTONGAN', namaProses: 'Potong Sunduk', waktuMenit: 15, totalPerson: 2, note: '' },
      { urutan: 2, workCenterId: 'WC-WOOD-01', namaProses: 'Bubut Kayu', waktuMenit: 30, totalPerson: 2, note: '' },
      { urutan: 3, workCenterId: 'WCT-AMPLAS', namaProses: 'Amplas Halus', waktuMenit: 20, totalPerson: 2, note: '' },
      { urutan: 4, workCenterId: 'WCT-QC', namaProses: 'QC Dimensi', waktuMenit: 8, totalPerson: 1, note: 'Cek toleransi ±1mm' },
    ],
  },
  {
    id: 'RT-KURSI-STD',
    kode: 'RT-KURSI-STD',
    nama: 'Routing Standar Kursi Jati',
    deskripsi: 'Alur produksi kursi: prep → woodworking → finishing',
    steps: [
      { urutan: 1, workCenterId: 'WC-PREP-01', namaProses: 'Potong Pola', waktuMenit: 15, totalPerson: 2, note: '' },
      { urutan: 2, workCenterId: 'WC-WOOD-01', namaProses: 'Bubut Kayu', waktuMenit: 30, totalPerson: 2, note: '' },
      { urutan: 3, workCenterId: 'WC-FIN-01', namaProses: 'Amplas Halus', waktuMenit: 20, totalPerson: 2, note: '' },
    ],
  },
  {
    id: 'RT-PANEL-CNC',
    kode: 'RT-PANEL-CNC',
    nama: 'Routing Panel CNC',
    deskripsi: 'Panel plywood via CNC + finishing',
    steps: [
      { urutan: 1, workCenterId: 'WC-WOOD-02', namaProses: 'Potong CNC', waktuMenit: 45, totalPerson: 1, note: 'Nested sheet cutting' },
      { urutan: 2, workCenterId: 'WC-FIN-01', namaProses: 'Amplas & Seal', waktuMenit: 25, totalPerson: 2, note: '' },
    ],
  },
  {
    id: 'RT-ASM-PACK',
    kode: 'RT-ASM-PACK',
    nama: 'Routing Assembly & Packing',
    deskripsi: 'Perakitan akhir dan packing ekspor',
    steps: [
      { urutan: 1, workCenterId: 'WCT-PERAKITAN', namaProses: 'Perakitan Final', waktuMenit: 40, totalPerson: 3, note: 'Hardware & label' },
      { urutan: 2, workCenterId: 'WCT-QC', namaProses: 'Final QC', waktuMenit: 12, totalPerson: 1, note: '' },
      { urutan: 3, workCenterId: 'WCT-PACKING', namaProses: 'Packing Ekspor', waktuMenit: 18, totalPerson: 2, note: 'Carton + pallet' },
    ],
  },
  {
    id: 'RT-DUDUKAN-FULL',
    kode: 'RT-DUDUKAN',
    nama: 'Routing Dudukan Lengkap',
    deskripsi: 'Rangka dudukan kursi — multi WC',
    steps: [
      { urutan: 1, workCenterId: 'WCT-CNC', namaProses: 'Potong CNC', waktuMenit: 45, totalPerson: 1, note: '' },
      { urutan: 2, workCenterId: 'WC-001', namaProses: 'Cutting Section', waktuMenit: 25, totalPerson: 2, note: 'Trim & sizing' },
      { urutan: 3, workCenterId: 'WCT-PERAKITAN', namaProses: 'Rakit Rangka', waktuMenit: 30, totalPerson: 3, note: '' },
    ],
  },
];

/** Nama proses manufaktur — Veneer, Edging, Finishing, dll. */
export const PROSES_OPTIONS = [
  { id: 'veneer', label: 'Veneer', mfgProcess: 'Woodworking', timeFactor: 1.0 },
  { id: 'edging', label: 'Edging', mfgProcess: 'Woodworking', timeFactor: 0.9 },
  { id: 'finishing', label: 'Finishing', mfgProcess: 'Finishing', timeFactor: 1.15 },
  { id: 'preparation', label: 'Preparation', mfgProcess: 'Preparation', timeFactor: 0.85 },
  { id: 'assembly', label: 'Assembly', mfgProcess: 'Assembly', timeFactor: 1.0 },
  { id: 'coating', label: 'Coating', mfgProcess: 'Finishing', timeFactor: 1.2 },
  { id: 'cnc', label: 'CNC Profiling', mfgProcess: 'Woodworking', timeFactor: 1.1 },
  { id: 'sanding', label: 'Sanding', mfgProcess: 'Finishing', timeFactor: 0.95 },
  { id: 'packing', label: 'Packing', mfgProcess: 'Packing', timeFactor: 0.75 },
];

/** Volume referensi part kecil (m³) untuk kalkulasi waktu */
export const REF_PART_VOL_M3 = 0.001;

export function getProsesById(id) {
  return PROSES_OPTIONS.find((p) => p.id === id) ?? PROSES_OPTIONS[0];
}

export function parseCapacityAsM3(wc) {
  if (!wc) return 14;
  const num = Number(String(wc.capacity).replace(/[^\d.]/g, '')) || 14;
  const unit = (wc.capacityUnit || 'm³').toLowerCase();
  if (unit.includes('m³') || unit === 'm3') return Math.max(num, 0.001);
  if (unit.includes('meter') || unit === 'm') return Math.max(num * 0.01, 0.001);
  return Math.max(num * 0.001, 0.001);
}

/**
 * Waktu (menit) dari volume material, kapasitas WC, jumlah pekerja, dan jenis proses.
 * Lebih banyak pekerja → waktu lebih singkat (pekerjaan paralel).
 */
export function calcWaktuFromVolume(materialVolM3, wc, totalPerson, prosesId) {
  if (!wc) return 0;
  const vol = Number(materialVolM3) || 0;
  const proses = getProsesById(prosesId);
  const refPerson = Math.max(1, wc.defaultPerson ?? 2);
  const person = Math.max(1, Number(totalPerson) || refPerson);
  const defaultMin = Number(wc.defaultTime) || 15;
  const capM3 = parseCapacityAsM3(wc);

  const volRatio = vol > 0 ? vol / REF_PART_VOL_M3 : 1;
  const capFactor = REF_PART_VOL_M3 / capM3;
  const waktuBase = defaultMin * volRatio * capFactor * (proses.timeFactor || 1);
  const waktu = waktuBase * (refPerson / person);

  return Math.max(1, Math.round(waktu * 10) / 10);
}

/** Terapkan kalkulasi waktu dari volume ke operasi (WC atau routing) */
export function applyVolumeToOperation(op, materialVolM3) {
  if (op.waktuManual) return op;

  const vol = Number(materialVolM3) || 0;
  const prosesId = op.proses || 'veneer';
  const person = op.totalPerson ?? 2;

  if (op.inputMode === 'work_center') {
    const wc = getWorkCenterById(op.workCenterId);
    const waktuOperasi = calcWaktuFromVolume(vol, wc, person, prosesId);
    return { ...op, waktuOperasi, biayaMesin: undefined, biayaPekerja: undefined };
  }

  if (op.inputMode === 'routing' && op.routingSteps?.length) {
    const steps = op.routingSteps;
    const firstWc = getWorkCenterById(steps[0]?.workCenterId);
    const totalWaktu = calcWaktuFromVolume(vol, firstWc, person, prosesId);
    const weights = steps.map((s) => Number(s.waktuMenit) || getWorkCenterById(s.workCenterId)?.defaultTime || 1);
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

    const rawSteps = steps.map((s, i) => ({
      urutan: s.urutan ?? i + 1,
      workCenterId: s.workCenterId,
      namaProses: s.namaProses,
      waktuMenit: Math.max(1, Math.round(((totalWaktu * weights[i]) / weightSum) * 10) / 10),
      totalPerson: s.totalPerson ?? person,
      note: s.note ?? '',
    }));
    const enriched = enrichRoutingSteps(rawSteps);
    const waktuOperasi = enriched.reduce((s, st) => s + (Number(st.waktuMenit) || 0), 0);
    return { ...op, routingSteps: enriched, waktuOperasi, biayaMesin: undefined, biayaPekerja: undefined };
  }

  return op;
}

export function getWorkCenterById(id) {
  return WORK_CENTERS.find((wc) => wc.id === id) ?? null;
}

export function getRoutingById(id) {
  return ROUTING_TEMPLATES.find((rt) => rt.id === id) ?? null;
}

/** Kalkulasi biaya per langkah — Machine + Work Center + Labor */
export function calcStepCosts(step, wc, overrides = {}) {
  const waktu = Number(step.waktuMenit ?? step.waktuOperasi) || 0;
  const person = Number(step.totalPerson ?? overrides.totalPerson) || 2;
  const rateMesin = Number(overrides.rateMesin) || wc?.ratePerMin || 1000;
  const ratePekerja = Number(overrides.ratePekerja) || wc?.laborRatePerMin || DEFAULT_LABOR_RATE_PER_MIN;
  const wcCostRate = Number(overrides.wcCostPerMin) || wc?.wcCostPerMin || rateMesin;
  const mesin = waktu * rateMesin;
  const wcCost = waktu * wcCostRate;
  const pekerja = waktu * person * ratePekerja;
  return {
    waktu,
    mesin,
    wc: wcCost,
    pekerja,
    total: mesin + wcCost + pekerja,
    rateMesin,
    ratePekerja,
    wcCostRate,
    person,
    capacity: wc?.capacity ? `${wc.capacity} ${wc.capacityUnit || ''}`.trim() : '-',
  };
}

export function enrichRoutingSteps(steps) {
  return steps.map((step) => {
    const wc = getWorkCenterById(step.workCenterId);
    const costs = calcStepCosts(step, wc);
    return {
      ...step,
      note: step.note ?? '',
      workCenter: wc,
      wcNama: wc?.nama ?? '-',
      mfgProcess: wc?.mfgProcess ?? '-',
      ratePerMin: costs.rateMesin,
      rateMesin: costs.rateMesin,
      ratePekerja: costs.ratePekerja,
      wcCostPerMin: costs.wcCostRate,
      capacity: costs.capacity,
      biayaMesin: costs.mesin,
      biayaWc: costs.wc,
      biayaPekerja: costs.pekerja,
      biayaTotal: costs.total,
    };
  });
}

export function calcOperationFromWorkCenter(wcId) {
  const wc = getWorkCenterById(wcId);
  if (!wc) return null;
  return {
    inputMode: 'work_center',
    workCenterId: wc.id,
    routingId: '',
    mfgProcess: wc.mfgProcess,
    nama: wc.nama.split('—')[1]?.trim() || wc.nama,
    waktuOperasi: wc.defaultTime || 0,
    totalPerson: wc.defaultPerson ?? 2,
    wcRate: wc.ratePerMin,
    rateMesin: wc.ratePerMin,
    ratePekerja: wc.laborRatePerMin ?? DEFAULT_LABOR_RATE_PER_MIN,
    wcCapacity: `${wc.capacity} ${wc.capacityUnit || ''}`.trim(),
    routingSteps: [],
    note: wc.notes || '',
  };
}

export function calcOperationFromRouting(routingId) {
  const rt = getRoutingById(routingId);
  if (!rt) return null;
  const steps = enrichRoutingSteps(rt.steps);
  const waktuOperasi = steps.reduce((s, st) => s + (Number(st.waktuMenit) || 0), 0);
  const firstWc = steps[0]?.workCenter;
  return {
    inputMode: 'routing',
    workCenterId: '',
    routingId: rt.id,
    mfgProcess: firstWc?.mfgProcess ?? 'Woodworking',
    nama: rt.nama,
    waktuOperasi,
    totalPerson: 2,
    wcRate: firstWc?.ratePerMin ?? 1000,
    wcCapacity: firstWc?.capacity ?? '14',
    routingSteps: steps,
    note: rt.deskripsi || '',
  };
}
