/**
 * PART dengan materialSourceMode manual tidak boleh di-auto-link oleh enrichNodeFromMaster.
 * Toggle manual → DATA BASE harus menghasilkan materialSourceMode database (bukan tetap manual).
 */
import { seedMasterCacheForTests } from '../src/services/masterStorage.js';
import { enrichNodeFromMaster, partNameFromMaterialFields } from '../src/utils/masterLookup.js';

seedMasterCacheForTests();

const manualPart = {
  id: 'p1',
  tipe: 'PART',
  nama: 'Custom spec only',
  kode: 'X-001',
  materialType: 'kayu',
  materialSourceMode: 'manual',
  woodGradeId: '',
  woodSpecification: 'TEAK KAMPUNG CUSTOM',
  materialMasterId: '',
  materialSpecification: '',
};

const enriched = enrichNodeFromMaster(structuredClone(manualPart));
if (enriched.woodGradeId) {
  console.error('FAIL: manual part got woodGradeId after enrich:', enriched.woodGradeId);
  process.exit(1);
}
if (enriched.materialMasterId) {
  console.error('FAIL: manual part got materialMasterId after enrich');
  process.exit(1);
}
if (enriched.woodSpecification !== 'TEAK KAMPUNG CUSTOM') {
  console.error('FAIL: woodSpecification changed');
  process.exit(1);
}

const heuristicPart = {
  id: 'p2',
  tipe: 'PART',
  nama: 'Heuristic manual',
  materialType: 'plywood',
  woodGradeId: '',
  materialMasterId: '',
  materialSpecification: 'PLY 18mm manual entry',
};

const enriched2 = enrichNodeFromMaster(structuredClone(heuristicPart));
if (enriched2.materialMasterId) {
  console.error('FAIL: heuristic manual-only part got materialMasterId');
  process.exit(1);
}

/** Simulasi guard handler setelah perbaikan toggle */
function simulateWoodFieldPatch(node, gradeId, mat, manualSpec, modeHint) {
  const manualText = String(manualSpec ?? '').trim();
  const forceManual = modeHint?.sourceMode === 'manual';
  if ((forceManual || manualText) && !gradeId && !mat) {
    return {
      ...node,
      woodGradeId: '',
      woodSpecification: String(manualSpec ?? ''),
      materialSourceMode: 'manual',
      ...(node.tipe === 'PART' && manualText ? { nama: manualText } : {}),
    };
  }
  if (!gradeId && !mat) {
    return {
      ...node,
      woodGradeId: '',
      woodSpecification: '',
      materialSourceMode: 'database',
    };
  }
  return node;
}

function simulateMaterialFieldPatch(node, masterId, mat, manualSpec, modeHint) {
  const manualText = String(manualSpec ?? '').trim();
  const forceManual = modeHint?.sourceMode === 'manual';
  if ((forceManual || manualText) && !masterId) {
    return {
      ...node,
      materialMasterId: '',
      materialSpecification: String(manualSpec ?? ''),
      materialSourceMode: 'manual',
      ...(manualText ? { nama: manualText } : {}),
    };
  }
  if (!masterId && !mat) {
    return {
      ...node,
      materialMasterId: '',
      materialSpecification: '',
      materialSourceMode: 'database',
    };
  }
  return node;
}

const manualNode = {
  id: 'p3',
  tipe: 'PART',
  materialType: 'kayu',
  materialSourceMode: 'manual',
  woodSpecification: 'TEAK CUSTOM',
  woodGradeId: '',
};

const clearedWood = simulateWoodFieldPatch(manualNode, '', null, '', { sourceMode: 'database' });
if (clearedWood.materialSourceMode !== 'database') {
  console.error('FAIL: empty manualSpec should switch to database, got:', clearedWood.materialSourceMode);
  process.exit(1);
}
if (clearedWood.woodSpecification !== '') {
  console.error('FAIL: woodSpecification should be cleared on database switch');
  process.exit(1);
}

const manualPlywood = {
  id: 'p4',
  tipe: 'PART',
  materialType: 'plywood',
  materialSourceMode: 'manual',
  materialSpecification: 'PLY 18 MANUAL',
  materialMasterId: '',
};

const clearedMat = simulateMaterialFieldPatch(manualPlywood, '', null, '', { sourceMode: 'database' });
if (clearedMat.materialSourceMode !== 'database') {
  console.error('FAIL: material clear should switch to database');
  process.exit(1);
}

const switchedManual = simulateWoodFieldPatch(
  { id: 'p6', tipe: 'PART', materialType: 'kayu', materialSourceMode: 'database' },
  '',
  null,
  '',
  { sourceMode: 'manual' },
);
if (switchedManual.materialSourceMode !== 'manual') {
  console.error('FAIL: mode hint manual should set manual mode');
  process.exit(1);
}

const manualNamed = simulateWoodFieldPatch(
  { id: 'p5', tipe: 'PART', materialType: 'kayu' },
  '',
  null,
  '  GRADE MANUAL  ',
  { sourceMode: 'manual' },
);
if (manualNamed.nama !== 'GRADE MANUAL') {
  console.error('FAIL: manual wood should sync nama');
  process.exit(1);
}
if (partNameFromMaterialFields(manualNamed) !== 'GRADE MANUAL') {
  console.error('FAIL: partNameFromMaterialFields manual');
  process.exit(1);
}

console.log('OK testMaterialManualMode');
