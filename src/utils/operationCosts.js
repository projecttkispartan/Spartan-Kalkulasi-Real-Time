import { getWorkCenterById, enrichRoutingSteps, calcStepCosts, DEFAULT_LABOR_RATE_PER_MIN } from '../data/routingCatalog';

export const LABOR_RATE_PER_MIN = DEFAULT_LABOR_RATE_PER_MIN;

/** Kalkulasi biaya operasi — Machine + Work Center + Labor */
export function calcProsesCosts(p) {
  if (!p) {
    return { waktu: 0, mesin: 0, wc: 0, pekerja: 0, total: 0, rateMesin: 1000, ratePekerja: LABOR_RATE_PER_MIN, rate: 1000, person: 2, capacity: '-' };
  }

  const wc = p.workCenterId ? getWorkCenterById(p.workCenterId) : null;
  const rateMesin = Number(p.rateMesin ?? p.wcRate) || wc?.ratePerMin || 1000;
  const ratePekerja = Number(p.ratePekerja) || Number(wc?.laborRatePerMin) || LABOR_RATE_PER_MIN;
  const wcCostRate = Number(p.wcCostPerMin) || wc?.wcCostPerMin || rateMesin;
  const capacity = p.wcCapacity || (wc ? `${wc.capacity} ${wc.capacityUnit || ''}`.trim() : '-');
  const person = Number(p.totalPerson) || 2;

  if (typeof p.biayaMesin === 'number' && typeof p.biayaPekerja === 'number') {
    const waktu = Number(p.waktuOperasi) || 0;
    const wcCost = typeof p.biayaWc === 'number' ? p.biayaWc : waktu * wcCostRate;
    return {
      waktu,
      mesin: p.biayaMesin,
      wc: wcCost,
      pekerja: p.biayaPekerja,
      total: p.biayaMesin + wcCost + p.biayaPekerja,
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
    const wcCost = steps.reduce((s, st) => s + (st.biayaWc || 0), 0);
    const pekerja = steps.reduce((s, st) => s + (st.biayaPekerja || 0), 0);
    const waktu = steps.reduce((s, st) => s + (Number(st.waktuMenit) || 0), 0);
    return {
      waktu,
      mesin,
      wc: wcCost,
      pekerja,
      total: mesin + wcCost + pekerja,
      rateMesin: steps[0]?.rateMesin || 1000,
      ratePekerja: steps[0]?.ratePekerja || LABOR_RATE_PER_MIN,
      rate: steps[0]?.rateMesin || 1000,
      person,
      capacity: steps.map((st) => st.capacity).filter(Boolean).join(' · ') || '-',
    };
  }

  const costs = calcStepCosts(
    { waktuOperasi: p.waktuOperasi, totalPerson: p.totalPerson },
    wc,
    { rateMesin, ratePekerja, wcCostPerMin: wcCostRate }
  );

  return {
    waktu: costs.waktu,
    mesin: costs.mesin,
    wc: costs.wc,
    pekerja: costs.pekerja,
    total: costs.total,
    rateMesin: costs.rateMesin,
    ratePekerja: costs.ratePekerja,
    rate: costs.rateMesin,
    person: costs.person,
    capacity,
  };
}
