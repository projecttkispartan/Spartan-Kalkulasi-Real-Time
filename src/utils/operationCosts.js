import { getWorkCenterById, enrichRoutingSteps, DEFAULT_LABOR_RATE_PER_MIN } from '../data/routingCatalog';

export const LABOR_RATE_PER_MIN = DEFAULT_LABOR_RATE_PER_MIN;

/** Kalkulasi biaya operasi — dipakai modal routing, tab proses, summary, COGS */
export function calcProsesCosts(p) {
  if (!p) {
    return { waktu: 0, mesin: 0, pekerja: 0, total: 0, rateMesin: 1000, ratePekerja: LABOR_RATE_PER_MIN, rate: 1000, person: 2, capacity: '-' };
  }

  const wc = p.workCenterId ? getWorkCenterById(p.workCenterId) : null;
  const rateMesin = Number(p.rateMesin ?? p.wcRate) || wc?.ratePerMin || 1000;
  const ratePekerja =
    Number(p.ratePekerja) || Number(wc?.laborRatePerMin) || LABOR_RATE_PER_MIN;
  const capacity = p.wcCapacity || wc?.capacity || '-';
  const person = Number(p.totalPerson) || 2;

  if (typeof p.biayaMesin === 'number' && typeof p.biayaPekerja === 'number') {
    const waktu = Number(p.waktuOperasi) || 0;
    return {
      waktu,
      mesin: p.biayaMesin,
      pekerja: p.biayaPekerja,
      total: p.biayaMesin + p.biayaPekerja,
      rateMesin,
      ratePekerja,
      rate: rateMesin,
      person,
      capacity,
    };
  }

  if (p.inputMode === 'routing' && p.routingSteps?.length) {
    const steps = enrichRoutingSteps(p.routingSteps);
    const mesin = steps.reduce((s, st) => s + (st.biayaMesin || 0), 0);
    const pekerja = steps.reduce((s, st) => s + (st.biayaPekerja || 0), 0);
    const waktu = steps.reduce((s, st) => s + (Number(st.waktuMenit) || 0), 0);
    return {
      waktu,
      mesin,
      pekerja,
      total: mesin + pekerja,
      rateMesin: steps[0]?.rateMesin || 1000,
      ratePekerja: steps[0]?.ratePekerja || LABOR_RATE_PER_MIN,
      rate: steps[0]?.rateMesin || 1000,
      person,
      capacity: steps.map((st) => st.capacity).filter(Boolean).join(' · ') || '-',
    };
  }

  const waktu = Number(p.waktuOperasi) || 0;
  const mesin = waktu * rateMesin;
  const pekerja = waktu * person * ratePekerja;

  return { waktu, mesin, pekerja, total: mesin + pekerja, rateMesin, ratePekerja, rate: rateMesin, person, capacity };
}
