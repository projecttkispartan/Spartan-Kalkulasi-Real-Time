export const DEFAULT_LABOR_RATE_PER_MIN = 500;

/** Katalog Work Center (mesin / pusat kerja) */
export const WORK_CENTERS = [
  { id: 'WC-PREP-01', kode: 'WC-PREP-01', nama: 'Preparation — Potong Pola', mfgProcess: 'Preparation', ratePerMin: 1000, laborRatePerMin: 500, capacity: '12 m³', lokasi: 'Area A' },
  { id: 'WC-WOOD-01', kode: 'WC-WOOD-01', nama: 'Woodworking — Bubut & Shaping', mfgProcess: 'Woodworking', ratePerMin: 1200, laborRatePerMin: 500, capacity: '14 m³', lokasi: 'Area B' },
  { id: 'WC-WOOD-02', kode: 'WC-WOOD-02', nama: 'Woodworking — CNC Router', mfgProcess: 'Woodworking', ratePerMin: 1500, laborRatePerMin: 550, capacity: '10 m³', lokasi: 'Area B' },
  { id: 'WC-ASM-01', kode: 'WC-ASM-01', nama: 'Assembly — Perakitan Submodul', mfgProcess: 'Assembly', ratePerMin: 900, laborRatePerMin: 450, capacity: '16 m³', lokasi: 'Area C' },
  { id: 'WC-FIN-01', kode: 'WC-FIN-01', nama: 'Finishing — Amplas & Coating', mfgProcess: 'Finishing', ratePerMin: 1100, laborRatePerMin: 500, capacity: '12 m³', lokasi: 'Area D' },
  { id: 'WC-PACK-01', kode: 'WC-PACK-01', nama: 'Packing — Box & Seal', mfgProcess: 'Packing', ratePerMin: 800, laborRatePerMin: 400, capacity: '20 m³', lokasi: 'Area E' },
];

/** Template routing = rangkaian work center */
export const ROUTING_TEMPLATES = [
  {
    id: 'RT-KURSI-STD',
    kode: 'RT-KURSI-STD',
    nama: 'Routing Standar Kursi Jati',
    deskripsi: 'Alur produksi kursi: prep → woodworking → finishing',
    steps: [
      { urutan: 1, workCenterId: 'WC-PREP-01', namaProses: 'Potong Pola', waktuMenit: 15, totalPerson: 2 },
      { urutan: 2, workCenterId: 'WC-WOOD-01', namaProses: 'Bubut Kayu', waktuMenit: 30, totalPerson: 2 },
      { urutan: 3, workCenterId: 'WC-FIN-01', namaProses: 'Amplas Halus', waktuMenit: 20, totalPerson: 2 },
    ],
  },
  {
    id: 'RT-PANEL-CNC',
    kode: 'RT-PANEL-CNC',
    nama: 'Routing Panel CNC',
    deskripsi: 'Panel plywood via CNC + finishing',
    steps: [
      { urutan: 1, workCenterId: 'WC-WOOD-02', namaProses: 'Potong CNC', waktuMenit: 45, totalPerson: 1 },
      { urutan: 2, workCenterId: 'WC-FIN-01', namaProses: 'Amplas & Seal', waktuMenit: 25, totalPerson: 2 },
    ],
  },
  {
    id: 'RT-ASM-PACK',
    kode: 'RT-ASM-PACK',
    nama: 'Routing Assembly & Packing',
    deskripsi: 'Perakitan akhir dan packing ekspor',
    steps: [
      { urutan: 1, workCenterId: 'WC-ASM-01', namaProses: 'Perakitan', waktuMenit: 35, totalPerson: 3 },
      { urutan: 2, workCenterId: 'WC-PACK-01', namaProses: 'Packing Box', waktuMenit: 15, totalPerson: 2 },
    ],
  },
];

export function getWorkCenterById(id) {
  return WORK_CENTERS.find((wc) => wc.id === id) ?? null;
}

export function getRoutingById(id) {
  return ROUTING_TEMPLATES.find((rt) => rt.id === id) ?? null;
}

export function enrichRoutingSteps(steps) {
  return steps.map((step) => {
    const wc = getWorkCenterById(step.workCenterId);
    const waktu = Number(step.waktuMenit) || 0;
    const person = Number(step.totalPerson) || 2;
    const rateMesin = wc?.ratePerMin ?? 1000;
    const ratePekerja = wc?.laborRatePerMin ?? DEFAULT_LABOR_RATE_PER_MIN;
    return {
      ...step,
      workCenter: wc,
      wcNama: wc?.nama ?? '-',
      mfgProcess: wc?.mfgProcess ?? '-',
      ratePerMin: rateMesin,
      rateMesin,
      ratePekerja,
      capacity: wc?.capacity ?? '-',
      biayaMesin: waktu * rateMesin,
      biayaPekerja: waktu * person * ratePekerja,
      biayaTotal: waktu * rateMesin + waktu * person * ratePekerja,
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
    waktuOperasi: 0,
    totalPerson: 2,
    wcRate: wc.ratePerMin,
    rateMesin: wc.ratePerMin,
    ratePekerja: wc.laborRatePerMin ?? DEFAULT_LABOR_RATE_PER_MIN,
    wcCapacity: wc.capacity,
    routingSteps: [],
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
    wcCapacity: firstWc?.capacity ?? '14 m³',
    routingSteps: steps,
  };
}
