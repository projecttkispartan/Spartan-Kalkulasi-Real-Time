/**
 * Aksi kontekstual untuk mengurangi deviasi COGS vs Excel SUMMARY COST.
 * Dipakai modal View Deviasi — setiap aksi punya preview Δ sebelum apply.
 */
import { computeCogs, computePackingTotals } from '../services/bomCalculations.js';
import { COGS_IMPORT_ROLLUP, stripExcelSummaryParts } from './cogsImportStrategy.js';
import { buildCogsInsight } from './cogsBreakdown.js';
import { EXCEL_FACTORY_OH_PCT } from '../data/excelReference.js';

export const DEVIATION_ACTION_IDS = {
  SYNC_COGS_CONFIG: 'sync-cogs-config',
  STRIP_EXCEL_SUMMARY: 'strip-excel-summary',
  DISABLE_COATING_IN_COGS: 'disable-coating-in-cogs',
  ENABLE_COATING_IN_COGS: 'enable-coating-in-cogs',
  SWITCH_LIVE_MASTER: 'switch-live-master',
  OPEN_PARITY_CHECKLIST: 'open-parity-checklist',
  GO_CONTAINER_TAB: 'go-container-tab',
};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function coatingIncluded(config) {
  return config?.includeCoatingInCogs !== false && config?.includeCoatingInCogs !== 'false';
}

function inferPackingJalur(excelMirror, cogsConfig) {
  const sc = excelMirror?.summaryCost;
  if (!sc) return cogsConfig?.packingJalur === 'SF' ? 'SF' : 'BOX';
  const box = Number(sc.packingBox?.total) || 0;
  const sf = Number(sc.packingSf?.total) || 0;
  if (box > 0 || sf > 0) return box >= sf ? 'BOX' : 'SF';
  return cogsConfig?.packingJalur === 'SF' ? 'SF' : 'BOX';
}

/** Target config COGS dari excelMirror.summaryCost */
export function deriveCogsConfigFromMirror(excelMirror, cogsConfig = {}) {
  const sc = excelMirror?.summaryCost || {};
  return {
    factoryOhPct: sc.factoryOhPct ?? cogsConfig.factoryOhPct ?? EXCEL_FACTORY_OH_PCT,
    managementOhPct: sc.managementOhPct ?? cogsConfig.managementOhPct ?? 2.5,
    packingJalur: inferPackingJalur(excelMirror, cogsConfig),
    markupPct: cogsConfig.markupPct ?? 20,
    includeCoatingInCogs: cogsConfig.includeCoatingInCogs,
  };
}

function configPatchDiff(current, patch) {
  const changes = [];
  for (const [key, nextVal] of Object.entries(patch)) {
    const cur = current?.[key];
    if (String(cur ?? '') === String(nextVal ?? '')) continue;
    changes.push({ key, from: cur, to: nextVal });
  }
  return changes;
}

function isHybridInsight(insight) {
  const { excelSummaryParts = 0, templateExcelParts = 0 } = insight?.counts || {};
  return excelSummaryParts > 0 && templateExcelParts > 0;
}

function needsConfigSync(cogsConfig, excelMirror) {
  if (!excelMirror?.summaryCost) return false;
  const target = deriveCogsConfigFromMirror(excelMirror, cogsConfig);
  return configPatchDiff(cogsConfig, target).length > 0;
}

function deviationNeedsWork(insight) {
  const prod = insight?.excelCompare?.production;
  const cogs = insight?.excelCompare?.totalCogs;
  if (!insight?.excelCompare?.comparable) return false;
  return prod?.status !== 'pass' || cogs?.status !== 'pass';
}

/**
 * @returns {Array<{ id: string, kind: 'apply'|'navigate', label: string, detail: string, priority: number }>}
 */
export function buildDeviationActions({
  insight,
  cogsConfig = {},
  excelMirror = null,
  cogsMode = 'live-master',
  importedFromExcel = false,
}) {
  const actions = [];
  const comparable = insight?.excelCompare?.comparable;
  const needsFix = deviationNeedsWork(insight);

  if (
    comparable &&
    cogsMode === 'excel-fixed' &&
    (insight.groups?.['template-master']?.partCount || 0) > 0 &&
    (insight.counts?.excelSummaryParts || 0) === 0
  ) {
    const hybridFail =
      insight.excelCompare?.production?.hybridBlocked ||
      insight.excelCompare?.totalCogs?.hybridBlocked;
    if (hybridFail || needsFix) {
      actions.push({
        id: DEVIATION_ACTION_IDS.SWITCH_LIVE_MASTER,
        kind: 'apply',
        label: 'Beralih ke Live Master (rollup terkurati)',
        detail: `${insight.groups['template-master'].partCount} part dihitung dari master — mode Excel Fixed menandai FAIL meski Δ kecil. Gunakan Live Master untuk BOM seed/rollup.`,
        priority: 8,
      });
    }
  }

  if (comparable && needsConfigSync(cogsConfig, excelMirror)) {
    const target = deriveCogsConfigFromMirror(excelMirror, cogsConfig);
    const changes = configPatchDiff(cogsConfig, target);
    const detail = changes
      .map((c) => `${c.key}: ${c.from ?? '—'} → ${c.to}`)
      .join(' · ');
    actions.push({
      id: DEVIATION_ACTION_IDS.SYNC_COGS_CONFIG,
      kind: 'apply',
      label: 'Selaraskan config COGS dari Excel',
      detail: detail || 'OH, jalur packing, dan parameter mirror SUMMARY COST.',
      priority: 10,
    });
  }

  if (comparable && (insight.counts?.excelSummaryParts || 0) > 0) {
    const hybrid = isHybridInsight(insight);
    actions.push({
      id: DEVIATION_ACTION_IDS.STRIP_EXCEL_SUMMARY,
      kind: 'apply',
      label: 'Hapus part EXCEL-SUMMARY (mode rollup)',
      detail: hybrid
        ? `${insight.counts.excelSummaryParts} part SUMMARY + ${insight.counts.templateExcelParts} part CALCULATION — hindari double-count.`
        : `${insight.counts.excelSummaryParts} part proses mirror SUMMARY akan dihapus dari pohon BOM.`,
      priority: hybrid ? 5 : 20,
    });
  }

  if (comparable && coatingIncluded(cogsConfig) && (insight.production?.coatingInCogs || 0) > 0) {
    actions.push({
      id: DEVIATION_ACTION_IDS.DISABLE_COATING_IN_COGS,
      kind: 'apply',
      label: 'Matikan coating di production COGS',
      detail: `Coating Rp ${Math.round(insight.production.coatingInCogs).toLocaleString('id-ID')} masuk production — Excel SUMMARY sering pisahkan finishing.`,
      priority: 15,
    });
  }

  if (
    comparable &&
    !coatingIncluded(cogsConfig) &&
    (insight.production?.coatingDetail || 0) > 10_000 &&
    insight.excelCompare?.production?.diffIdr < 0
  ) {
    actions.push({
      id: DEVIATION_ACTION_IDS.ENABLE_COATING_IN_COGS,
      kind: 'apply',
      label: 'Masukkan coating ke production COGS',
      detail: `App di bawah Excel — coating detail Rp ${Math.round(insight.production.coatingDetail).toLocaleString('id-ID')} belum masuk production.`,
      priority: 18,
    });
  }

  if (comparable && needsFix) {
    actions.push({
      id: DEVIATION_ACTION_IDS.OPEN_PARITY_CHECKLIST,
      kind: 'navigate',
      label: 'Buka checklist parity Excel',
      detail: 'Verifikasi field wajib (master, dimensi, packing, SF/WF) yang mempengaruhi COGS.',
      priority: 30,
    });
    actions.push({
      id: DEVIATION_ACTION_IDS.GO_CONTAINER_TAB,
      kind: 'navigate',
      label: 'Buka tab Container (packing)',
      detail: 'Sesuaikan material/routing packing BOX atau SF — jalur aktif mempengaruhi production cost.',
      priority: 35,
    });
  }

  if (importedFromExcel && !comparable) {
    actions.push({
      id: DEVIATION_ACTION_IDS.OPEN_PARITY_CHECKLIST,
      kind: 'navigate',
      label: 'Buka checklist parity Excel',
      detail: 'Mirror SUMMARY COST belum lengkap — verifikasi item impor.',
      priority: 40,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

/**
 * @param {object} ctx
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {{ kind: 'apply'|'navigate', bomData?: object, cogsConfig?: object, navigateTo?: string, openModal?: string }|null}
 */
export function applyDeviationAction(actionId, ctx, opts = {}) {
  const { bomData, cogsConfig, excelMirror } = ctx;

  switch (actionId) {
    case DEVIATION_ACTION_IDS.SYNC_COGS_CONFIG: {
      const patch = deriveCogsConfigFromMirror(excelMirror, cogsConfig);
      return {
        kind: 'apply',
        cogsConfig: { ...cogsConfig, ...patch },
      };
    }
    case DEVIATION_ACTION_IDS.STRIP_EXCEL_SUMMARY: {
      const nextBom = cloneJson(bomData);
      stripExcelSummaryParts(nextBom);
      return {
        kind: 'apply',
        bomData: nextBom,
        cogsConfig: {
          ...cogsConfig,
          cogsImportMode: COGS_IMPORT_ROLLUP,
        },
      };
    }
    case DEVIATION_ACTION_IDS.DISABLE_COATING_IN_COGS:
      return {
        kind: 'apply',
        cogsConfig: { ...cogsConfig, includeCoatingInCogs: false },
      };
    case DEVIATION_ACTION_IDS.ENABLE_COATING_IN_COGS:
      return {
        kind: 'apply',
        cogsConfig: { ...cogsConfig, includeCoatingInCogs: true },
      };
    case DEVIATION_ACTION_IDS.SWITCH_LIVE_MASTER:
      return {
        kind: 'apply',
        cogsMode: 'live-master',
      };
    case DEVIATION_ACTION_IDS.OPEN_PARITY_CHECKLIST:
      return { kind: 'navigate', openModal: 'parity-checklist' };
    case DEVIATION_ACTION_IDS.GO_CONTAINER_TAB:
      return { kind: 'navigate', navigateTo: 'container' };
    default:
      return null;
  }
}

function formatDeltaRow(label, before, after) {
  if (!before || !after || before.status === 'skip') return null;
  const bPct = (Math.abs(before.diffPct || 0) * 100).toFixed(2);
  const aPct = (Math.abs(after.diffPct || 0) * 100).toFixed(2);
  return `${label}: ${before.status.toUpperCase()} (${bPct}%) → ${after.status.toUpperCase()} (${aPct}%)`;
}

/**
 * Preview dampak aksi apply terhadap deviasi.
 * @returns {{ lines: string[], improved: boolean }|null}
 */
export function previewDeviationAction(actionId, ctx) {
  const result = applyDeviationAction(actionId, ctx);
  if (!result || result.kind !== 'apply') return null;

  const packingTotals =
    ctx.packingTotals ||
    computePackingTotals(ctx.packingSpec || {});

  const beforeCogs = computeCogs({
    bomData: ctx.bomData,
    cogsConfig: ctx.cogsConfig,
    packingTotals,
    productMeta: ctx.productMeta,
  });

  const afterCogs = computeCogs({
    bomData: result.bomData ?? ctx.bomData,
    cogsConfig: result.cogsConfig ?? ctx.cogsConfig,
    packingTotals,
    productMeta: ctx.productMeta,
  });

  const afterCogsMode = result.cogsMode ?? ctx.cogsMode ?? 'live-master';
  const beforeCogsMode = ctx.cogsMode ?? 'live-master';

  const sampleKey = ctx.sampleKey ?? null;
  const baseParams = {
    packingTotals,
    productMeta: ctx.productMeta,
    excelMirror: ctx.excelMirror,
    importedFromExcel: ctx.importedFromExcel,
    cogsMode: ctx.cogsMode,
    sampleKey,
  };

  const beforeInsight = buildCogsInsight({
    ...baseParams,
    bomData: ctx.bomData,
    cogsConfig: ctx.cogsConfig,
    cogsMode: beforeCogsMode,
    cogsData: beforeCogs,
  });

  const afterInsight = buildCogsInsight({
    ...baseParams,
    bomData: result.bomData ?? ctx.bomData,
    cogsConfig: result.cogsConfig ?? ctx.cogsConfig,
    cogsMode: afterCogsMode,
    cogsData: afterCogs,
  });

  const lines = [
    formatDeltaRow('Production', beforeInsight.excelCompare.production, afterInsight.excelCompare.production),
    formatDeltaRow('Total COGS', beforeInsight.excelCompare.totalCogs, afterInsight.excelCompare.totalCogs),
  ].filter(Boolean);

  const improved =
    (afterInsight.excelCompare.production?.status === 'pass' &&
      beforeInsight.excelCompare.production?.status !== 'pass') ||
    (afterInsight.excelCompare.totalCogs?.status === 'pass' &&
      beforeInsight.excelCompare.totalCogs?.status !== 'pass') ||
    Math.abs(afterInsight.excelCompare.totalCogs?.diffPct || 1) <
      Math.abs(beforeInsight.excelCompare.totalCogs?.diffPct || 0);

  return { lines, improved, afterInsight };
}
