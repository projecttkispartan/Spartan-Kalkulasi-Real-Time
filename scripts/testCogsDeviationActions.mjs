/**
 * Regresi buildDeviationActions + preview/apply — ZAN sample PASS tetap PASS.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';
import { linkProjectToMasters } from '../src/utils/linkProjectToMasters.js';
import { buildCogsInsight } from '../src/utils/cogsBreakdown.js';
import {
  applyDeviationAction,
  buildDeviationActions,
  deriveCogsConfigFromMirror,
  DEVIATION_ACTION_IDS,
  previewDeviationAction,
} from '../src/utils/cogsDeviationActions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function insightForDoc(doc) {
  const packingTotals = computePackingTotals(doc.packingSpec);
  const cogsData = computeCogs({
    bomData: doc.bomData,
    cogsConfig: doc.cogsConfig,
    packingTotals,
    productMeta: doc.productMeta,
  });
  return {
    doc,
    packingTotals,
    cogsData,
    insight: buildCogsInsight({
      bomData: doc.bomData,
      cogsConfig: doc.cogsConfig,
      packingTotals,
      productMeta: doc.productMeta,
      excelMirror: doc.excelMirror,
      importedFromExcel: doc.importedFromExcel,
      cogsMode: doc.cogsMode,
      cogsData,
      sampleKey: doc.sampleKey,
    }),
  };
}

console.log('--- testCogsDeviationActions ---\n');

// ZAN curated — no destructive actions needed; sync may be empty
const zanRaw = loadJson('src/data/samples/projects/zan-100.json');
const zan = linkProjectToMasters(zanRaw, { applyBiaya: false, skipBiayaIfExcel: true });
const zanSampleKey = zanRaw.sampleKey || 'ZAN-100';
const zanCtx = insightForDoc({ ...zan, sampleKey: zanSampleKey });
const zanInsight = buildCogsInsight({
  bomData: zan.bomData,
  cogsConfig: zan.cogsConfig,
  packingTotals: zanCtx.packingTotals,
  productMeta: zan.productMeta,
  excelMirror: zan.excelMirror,
  importedFromExcel: zan.importedFromExcel,
  cogsData: zanCtx.cogsData,
  sampleKey: zanSampleKey,
});
const zanActions = buildDeviationActions({
  insight: zanInsight,
  cogsConfig: zan.cogsConfig,
  excelMirror: zan.excelMirror,
  cogsMode: 'live-master',
  importedFromExcel: zan.importedFromExcel,
});
assert.equal(zanInsight.excelCompare.totalCogs.status, 'pass', 'ZAN baseline PASS (live-master insight)');
// excel-fixed + master rollup → suggest switch
const zanActionsExcelFixed = buildDeviationActions({
  insight: buildCogsInsight({
    bomData: zan.bomData,
    cogsConfig: zan.cogsConfig,
    packingTotals: zanCtx.packingTotals,
    productMeta: zan.productMeta,
    excelMirror: zan.excelMirror,
    importedFromExcel: zan.importedFromExcel,
    cogsMode: 'excel-fixed',
    cogsData: zanCtx.cogsData,
    sampleKey: zanSampleKey,
  }),
  cogsConfig: zan.cogsConfig,
  excelMirror: zan.excelMirror,
  cogsMode: 'excel-fixed',
  importedFromExcel: zan.importedFromExcel,
});
assert.ok(
  zanActionsExcelFixed.some((a) => a.id === DEVIATION_ACTION_IDS.SWITCH_LIVE_MASTER),
  'ZAN excel-fixed suggests live master',
);
console.log(`OK ZAN-100 actions=${zanActions.length} switchLive=${zanActionsExcelFixed.some((a) => a.id === DEVIATION_ACTION_IDS.SWITCH_LIVE_MASTER)}`);

// G632L hybrid import — should offer strip EXCEL-SUMMARY
const g632Raw = loadJson('src/data/samples/projects/g632l-ro.json');
const g632 = linkProjectToMasters(g632Raw, { applyBiaya: false, skipBiayaIfExcel: true });
const g632Ctx = insightForDoc(g632);
const g632Actions = buildDeviationActions({
  insight: g632Ctx.insight,
  cogsConfig: g632.cogsConfig,
  excelMirror: g632.excelMirror,
  cogsMode: g632.cogsMode,
  importedFromExcel: g632.importedFromExcel,
});
const stripAction = g632Actions.find((a) => a.id === DEVIATION_ACTION_IDS.STRIP_EXCEL_SUMMARY);
assert.ok(stripAction, 'G632L should suggest strip EXCEL-SUMMARY');
console.log(`OK G632L strip action: ${stripAction.label}`);

const previewCtx = {
  bomData: g632.bomData,
  cogsConfig: g632.cogsConfig,
  excelMirror: g632.excelMirror,
  packingSpec: g632.packingSpec,
  packingTotals: g632Ctx.packingTotals,
  productMeta: g632.productMeta,
  insight: g632Ctx.insight,
  importedFromExcel: g632.importedFromExcel,
  cogsMode: g632.cogsMode,
  sampleKey: g632.sampleKey,
};
const preview = previewDeviationAction(DEVIATION_ACTION_IDS.STRIP_EXCEL_SUMMARY, previewCtx);
assert.ok(preview?.lines?.length >= 1, 'strip preview lines');
const applied = applyDeviationAction(DEVIATION_ACTION_IDS.STRIP_EXCEL_SUMMARY, previewCtx);
assert.ok(applied.bomData, 'strip returns bomData');
assert.equal(applied.cogsConfig.cogsImportMode, 'rollup');

// derive config from mirror
const derived = deriveCogsConfigFromMirror(g632.excelMirror, {});
assert.ok(Number(derived.factoryOhPct) > 0, 'factory OH from mirror');
console.log(`OK deriveCogsConfig factoryOh=${derived.factoryOhPct}% packing=${derived.packingJalur}`);

console.log('\ntestCogsDeviationActions: done');
