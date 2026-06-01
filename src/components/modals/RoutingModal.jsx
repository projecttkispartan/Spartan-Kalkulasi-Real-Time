import { useState, useEffect, useMemo, useCallback } from 'react';
import { posisiGambarMap } from '../../data/mockData';
import { DEFAULT_POSISI_COMBO, getPosisiComboItem, resolveComboGambar } from '../../data/posisiComboCatalog';
import {
  WORK_CENTERS,
  ROUTING_TEMPLATES,
  getWorkCenterById,
  getProsesById,
  enrichRoutingSteps,
  calcOperationFromWorkCenter,
  calcOperationFromRouting,
  applyVolumeToOperation,
} from '../../data/routingCatalog';
import { calcProsesCosts, LABOR_RATE_PER_MIN } from '../../utils/operationCosts';
import { tipeStyles } from '../../design/tipeStyles';
import RoutingExcelView from './RoutingExcelView';

const defaultOperation = (id = 1, materialVol = 0) => {
  const proses = 'veneer';
  const meta = getProsesById(proses);
  const base = {
    id,
    proses,
    inputMode: 'work_center',
    workCenterId: WORK_CENTERS[0]?.id ?? '',
    routingId: '',
    routingSteps: [],
    mfgProcess: meta.mfgProcess,
    nama: meta.label,
    position: id,
    posisiOperasi: DEFAULT_POSISI_COMBO,
    gambar: resolveComboGambar(DEFAULT_POSISI_COMBO) || posisiGambarMap.Depan,
    waktuOperasi: 0,
    waktuManual: false,
    totalPerson: 2,
    wcRate: WORK_CENTERS[0]?.ratePerMin ?? 1000,
    rateMesin: WORK_CENTERS[0]?.ratePerMin ?? 1000,
    ratePekerja: WORK_CENTERS[0]?.laborRatePerMin ?? LABOR_RATE_PER_MIN,
    wcCapacity: WORK_CENTERS[0]?.capacity ?? '14 m³',
    note: '',
  };
  return applyVolumeToOperation(base, materialVol);
};

function inferProsesId(p) {
  if (p.proses) return p.proses;
  const label = (p.nama || '').toLowerCase();
  const found = [
    { k: 'veneer', m: 'veneer' },
    { k: 'edging', m: 'edging' },
    { k: 'finishing', m: 'finishing' },
    { k: 'amplas', m: 'sanding' },
    { k: 'cnc', m: 'cnc' },
    { k: 'potong', m: 'preparation' },
    { k: 'rakit', m: 'assembly' },
    { k: 'coating', m: 'coating' },
    { k: 'pack', m: 'packing' },
  ].find(({ m }) => label.includes(m));
  return found?.k ?? 'veneer';
}

function mapSavedOp(p, i, materialVol) {
  const prosesId = inferProsesId(p);
  const meta = getProsesById(prosesId);
  const base = {
    id: i + 1,
    proses: prosesId,
    inputMode: p.inputMode || 'work_center',
    workCenterId: p.workCenterId || '',
    routingId: p.routingId || '',
    routingSteps: p.routingSteps?.length ? enrichRoutingSteps(p.routingSteps) : [],
    mfgProcess: p.mfgProcess || meta.mfgProcess,
    nama: p.nama || meta.label,
    position: p.position ?? i + 1,
    posisiOperasi: p.posisiOperasi || DEFAULT_POSISI_COMBO,
    gambar:
      p.gambar ||
      resolveComboGambar(p.posisiOperasi) ||
      posisiGambarMap[p.posisiOperasi] ||
      resolveComboGambar(DEFAULT_POSISI_COMBO),
    waktuOperasi: Number(p.waktuOperasi) || 0,
    waktuManual: Boolean(p.waktuManual),
    totalPerson: p.totalPerson ?? 2,
    wcRate: p.wcRate ?? p.rateMesin ?? 1000,
    rateMesin: p.rateMesin ?? p.wcRate ?? 1000,
    ratePekerja: p.ratePekerja ?? LABOR_RATE_PER_MIN,
    wcCapacity: p.wcCapacity ?? '14 m³',
    biayaMesin: p.biayaMesin,
    biayaPekerja: p.biayaPekerja,
    note: p.note ?? '',
  };
  if (base.inputMode === 'routing' && base.routingId && !base.routingSteps.length) {
    const fromRt = calcOperationFromRouting(base.routingId);
    if (fromRt) {
      return applyVolumeToOperation(
        { ...base, ...fromRt, id: base.id, position: base.position, posisiOperasi: base.posisiOperasi, gambar: base.gambar, note: base.note, proses: base.proses, waktuManual: base.waktuManual },
        materialVol
      );
    }
  }
  if (base.inputMode === 'work_center' && base.workCenterId) {
    const wc = getWorkCenterById(base.workCenterId);
    if (wc) {
      base.wcRate = wc.ratePerMin;
      base.rateMesin = p.rateMesin ?? wc.ratePerMin;
      base.ratePekerja = p.ratePekerja ?? wc.laborRatePerMin ?? LABOR_RATE_PER_MIN;
      base.wcCapacity = `${wc.capacity} ${wc.capacityUnit || ''}`.trim();
    }
  }
  if (!base.waktuManual && materialVol > 0) {
    return applyVolumeToOperation(base, materialVol);
  }
  return base;
}

function buildOperationsFromNode(node) {
  const d = node?.data ?? node;
  const vol = Number(d?.vol) || 0;
  if (!d) return [defaultOperation(1, vol)];
  if (d.proses?.length) return d.proses.map((p, i) => mapSavedOp(p, i, vol));
  const count = Number(d.proses_count) || 0;
  if (count > 0) return Array.from({ length: count }, (_, i) => defaultOperation(i + 1, vol));
  return [defaultOperation(1, vol)];
}

function reindexSteps(steps) {
  return enrichRoutingSteps(
    steps.map((s, i) => ({
      urutan: i + 1,
      workCenterId: s.workCenterId,
      namaProses: s.namaProses,
      waktuMenit: s.waktuMenit,
      totalPerson: s.totalPerson,
      note: s.note ?? '',
    }))
  );
}

function withVolumeTime(op, materialVol, resetManual = false) {
  const next = resetManual ? { ...op, waktuManual: false } : op;
  return applyVolumeToOperation(next, materialVol);
}

export default function RoutingModal({ node, onClose, kursUsd, kursEur, onSave }) {
  const nodeData = useMemo(() => node?.data ?? node, [node]);
  const materialVol = useMemo(() => Number(nodeData?.vol) || 0, [nodeData]);
  const [operations, setOperations] = useState(() => buildOperationsFromNode(node));

  useEffect(() => {
    if (!node) return;
    setOperations(buildOperationsFromNode(node));
  }, [node?.id, node]);

  const costsById = useMemo(() => {
    const map = {};
    operations.forEach((op) => {
      map[op.id] = calcProsesCosts(op);
    });
    return map;
  }, [operations]);

  const totals = useMemo(() => {
    const vals = Object.values(costsById);
    return {
      waktu: vals.reduce((s, c) => s + c.waktu, 0),
      mesin: vals.reduce((s, c) => s + c.mesin, 0),
      wc: vals.reduce((s, c) => s + (c.wc || 0), 0),
      pekerja: vals.reduce((s, c) => s + c.pekerja, 0),
      total: vals.reduce((s, c) => s + c.total, 0),
    };
  }, [costsById]);

  const handleAddRow = useCallback(
    (mode) => {
      setOperations((prev) => {
        const newId = prev.length > 0 ? Math.max(...prev.map((o) => o.id)) + 1 : 1;
        let row = { ...defaultOperation(newId, materialVol), position: newId };
        if (mode === 'routing') {
          const rt = calcOperationFromRouting(ROUTING_TEMPLATES[0]?.id);
          if (rt) row = { ...row, ...rt, id: newId, position: newId, proses: row.proses };
          else row.inputMode = 'routing';
        }
        return [...prev, withVolumeTime(row, materialVol)];
      });
    },
    [materialVol]
  );

  const handleRemove = useCallback((id) => {
    setOperations((prev) => {
      const next = prev.filter((op) => op.id !== id);
      return next.length ? next : [defaultOperation(1, materialVol)];
    });
  }, [materialVol]);

  const updateOperation = useCallback(
    (id, field, value) => {
      setOperations((prev) =>
        prev.map((op) => {
          if (op.id !== id) return op;

          let updated = { ...op };

          if (field === 'inputMode') {
            if (value === 'routing') {
              const rt = calcOperationFromRouting(ROUTING_TEMPLATES[0]?.id);
              updated = rt
                ? { ...op, ...rt, id: op.id, position: op.position, posisiOperasi: op.posisiOperasi, gambar: op.gambar, note: op.note, proses: op.proses, waktuManual: false }
                : { ...op, inputMode: 'routing', waktuManual: false };
            } else {
              const wc = calcOperationFromWorkCenter(op.workCenterId || WORK_CENTERS[0]?.id);
              updated = wc
                ? { ...op, ...wc, id: op.id, position: op.position, posisiOperasi: op.posisiOperasi, gambar: op.gambar, note: op.note, proses: op.proses, nama: getProsesById(op.proses).label, waktuManual: false }
                : { ...op, inputMode: 'work_center', routingSteps: [], waktuManual: false };
            }
          } else if (field === 'proses') {
            const meta = getProsesById(value);
            updated = { ...op, proses: value, nama: meta.label, mfgProcess: meta.mfgProcess, waktuManual: false };
          } else if (field === 'workCenterId') {
            const wc = calcOperationFromWorkCenter(value);
            updated = wc
              ? { ...op, ...wc, id: op.id, position: op.position, posisiOperasi: op.posisiOperasi, gambar: op.gambar, note: op.note, proses: op.proses, nama: getProsesById(op.proses).label, waktuManual: false }
              : op;
          } else if (field === 'routingId') {
            const rt = calcOperationFromRouting(value);
            updated = rt
              ? { ...op, ...rt, id: op.id, position: op.position, posisiOperasi: op.posisiOperasi, gambar: op.gambar, note: op.note, proses: op.proses, waktuManual: false }
              : op;
          } else {
            updated = { ...op, [field]: value };
            if (field === 'posisiOperasi') {
              updated.gambar =
                resolveComboGambar(value) ||
                getPosisiComboItem(value)?.src ||
                posisiGambarMap[value] ||
                resolveComboGambar(DEFAULT_POSISI_COMBO);
            }
            if (field === 'waktuOperasi') {
              updated.waktuManual = true;
            }
            if (field === 'totalPerson') {
              updated.waktuManual = false;
            }
            if (field === 'waktuOperasi' || field === 'totalPerson' || field === 'rateMesin' || field === 'ratePekerja') {
              delete updated.biayaMesin;
              delete updated.biayaPekerja;
              if (field === 'rateMesin') updated.wcRate = Number(value) || 0;
            }
          }

          const recalcFields = ['proses', 'workCenterId', 'routingId', 'inputMode', 'totalPerson'];
          if (recalcFields.includes(field) || (field === 'inputMode' && !updated.waktuManual)) {
            updated = withVolumeTime(updated, materialVol);
          }

          return updated;
        })
      );
    },
    [materialVol]
  );

  const updateRoutingStep = useCallback(
    (opId, stepIndex, field, value) => {
      setOperations((prev) =>
        prev.map((op) => {
          if (op.id !== opId || op.inputMode !== 'routing') return op;
          const steps = [...(op.routingSteps || [])];
          const patch =
            field === 'note' || field === 'workCenterId' || field === 'namaProses'
              ? { [field]: value }
              : { [field]: Number(value) || 0 };
          steps[stepIndex] = { ...steps[stepIndex], ...patch };
          if (field === 'waktuMenit') {
            const enriched = reindexSteps(steps);
            const waktuOperasi = enriched.reduce((s, st) => s + (Number(st.waktuMenit) || 0), 0);
            return { ...op, routingSteps: enriched, waktuOperasi, waktuManual: true, biayaMesin: undefined, biayaPekerja: undefined };
          }
          let next = { ...op, routingSteps: reindexSteps(steps), waktuManual: false, biayaMesin: undefined, biayaPekerja: undefined };
          next = withVolumeTime(next, materialVol);
          return next;
        })
      );
    },
    [materialVol]
  );

  const handleAddStep = useCallback((opId) => {
    setOperations((prev) =>
      prev.map((op) => {
        if (op.id !== opId || op.inputMode !== 'routing') return op;
        const wc = WORK_CENTERS[0];
        const steps = [
          ...(op.routingSteps || []),
          {
            urutan: (op.routingSteps?.length || 0) + 1,
            workCenterId: wc?.id ?? '',
            namaProses: wc?.nama ?? 'Langkah baru',
            waktuMenit: wc?.defaultTime || 0,
            totalPerson: wc?.defaultPerson ?? 2,
            note: '',
          },
        ];
        return withVolumeTime({ ...op, routingSteps: reindexSteps(steps), waktuManual: false }, materialVol);
      })
    );
  }, [materialVol]);

  const handleRemoveStep = useCallback((opId, stepIndex) => {
    setOperations((prev) =>
      prev.map((op) => {
        if (op.id !== opId || op.inputMode !== 'routing') return op;
        const steps = (op.routingSteps || []).filter((_, i) => i !== stepIndex);
        if (!steps.length) return { ...op, routingSteps: [], waktuOperasi: 0 };
        return withVolumeTime({ ...op, routingSteps: reindexSteps(steps), waktuManual: false }, materialVol);
      })
    );
  }, [materialVol]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(
        node.id,
        operations.map((op) => {
          const costs = calcProsesCosts(op);
          return {
            proses: op.proses,
            inputMode: op.inputMode,
            workCenterId: op.workCenterId,
            routingId: op.routingId,
            routingSteps: (op.routingSteps || []).map((st) => ({
              urutan: st.urutan,
              workCenterId: st.workCenterId,
              namaProses: st.namaProses,
              waktuMenit: st.waktuMenit,
              totalPerson: st.totalPerson,
              note: st.note ?? '',
            })),
            nama: op.nama,
            mfgProcess: op.mfgProcess,
            posisiOperasi: op.posisiOperasi,
            gambar: op.gambar,
            waktuOperasi: costs.waktu,
            waktuManual: op.waktuManual,
            totalPerson: Number(op.totalPerson) || 2,
            wcRate: costs.rateMesin,
            rateMesin: costs.rateMesin,
            ratePekerja: costs.ratePekerja,
            wcCapacity: costs.capacity,
            biayaMesin: costs.mesin,
            biayaWc: costs.wc,
            biayaPekerja: costs.pekerja,
            biaya: costs.total,
            note: op.note ?? '',
          };
        })
      );
    }
    onClose();
  }, [node, onSave, onClose, operations]);

  if (!node || !nodeData) return null;
  const style = tipeStyles[nodeData.tipe] || tipeStyles.PART;

  return (
    <RoutingExcelView
      materialData={nodeData}
      materialStyle={style}
      materialVol={materialVol}
      operations={operations}
      costsById={costsById}
      totals={totals}
      onUpdate={updateOperation}
      onUpdateStep={updateRoutingStep}
      onRemove={handleRemove}
      onAddRow={handleAddRow}
      onAddStep={handleAddStep}
      onRemoveStep={handleRemoveStep}
      onClose={onClose}
      onSave={handleSave}
      kursUsd={kursUsd}
      kursEur={kursEur}
    />
  );
}
