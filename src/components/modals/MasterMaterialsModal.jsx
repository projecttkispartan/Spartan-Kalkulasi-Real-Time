import { useEffect, useState, useCallback, useMemo } from 'react';
import { Database, RefreshCw, Save, HelpCircle, Plus } from 'lucide-react';
import {
  getMaterials,
  getNonWoodMaterials,
  getWasteRatios,
  getCoatings,
  getFormulas,
  getRoundingRules,
  getMasterMeta,
  getWorkCenters,
  getWoodLaborRows,
  getFormulaDataRows,
  getRoundComponentPresets,
  saveMaterials,
  saveNonWoodMaterials,
  saveWasteRatios,
  saveCoatings,
  saveFormulas,
  saveRoundingRules,
  saveWorkCenters,
  saveWoodLaborRows,
  saveFormulaDataRows,
  saveRoundComponentPresets,
  getMaterialCatalog,
  saveMaterialCatalog,
  reimportMastersFromSeedFiles,
} from '../../services/masterStorage';
import { restoreDismissedSampleProjects } from '../../services/projectStorage';
import FullPageShell from '../ui/FullPageShell.jsx';
import MasterUsageGuideModal from './MasterUsageGuideModal.jsx';
import { MASTER_TAB_META, MASTER_TABS_ORDER } from '../master/masterTabMeta.js';
import MasterAddProcessPanel from '../master/MasterAddProcessPanel.jsx';
import { createMasterRow, tabAllowsAdd } from '../master/masterAddProcess.js';
import {
  MasterTabBar,
  MasterPanel,
  MasterLoading,
  MasterTabHint,
  MasterDataBody,
} from '../master/MasterTable.jsx';
import {
  MasterDataLoadError,
  MasterDataEmptyBanner,
  MasterDataRowCount,
} from '../master/MasterDataStatus.jsx';
import {
  CatalogTable,
  MaterialsTable,
  NonWoodTable,
  RatiosTable,
  WoodLaborTable,
  CoatingsTable,
  FormulaDataTable,
  WorkCenterTable,
  FormulasRegistryTable,
  RoundingTables,
} from '../master/MasterDataTables.jsx';

const TAB_COUNTS = {
  catalog: (s) => s.catalog.length,
  materials: (s) => s.materials.length,
  nonWood: (s) => s.nonWood.length,
  ratios: (s) => s.ratios.length,
  woodLabor: (s) => s.woodLabor.length,
  coatings: (s) => s.coatings.length,
  formulaRows: (s) => s.formulaRows.length,
  formulas: (s) => s.formulas.length,
  rounding: (s) => s.rounding.length + s.roundPresets.length,
  workCenters: (s) => s.workCenters.length,
};

const SEARCH_TABS = new Set([
  'catalog',
  'materials',
  'nonWood',
  'ratios',
  'woodLabor',
  'coatings',
  'formulaRows',
  'workCenters',
]);

export default function MasterMaterialsModal({ isOpen, onClose, onReimported }) {
  const [tab, setTab] = useState('materials');
  const [showGuide, setShowGuide] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [nonWood, setNonWood] = useState([]);
  const [ratios, setRatios] = useState([]);
  const [coatings, setCoatings] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [rounding, setRounding] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [woodLabor, setWoodLabor] = useState([]);
  const [formulaRows, setFormulaRows] = useState([]);
  const [roundPresets, setRoundPresets] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(null);

  const applyFetched = useCallback((payload) => {
    setMaterials(payload.materials);
    setNonWood(payload.nonWood);
    setRatios(payload.ratios);
    setCoatings(payload.coatings);
    setFormulas(payload.formulas);
    setRounding(payload.rounding);
    setMeta(payload.meta);
    setWorkCenters(payload.workCenters);
    setWoodLabor(payload.woodLabor);
    setFormulaRows(payload.formulaRows);
    setRoundPresets(payload.roundPresets);
    setCatalog(payload.catalog);
  }, []);

  const fetchAllMasters = useCallback(async () => {
    const [m, nw, r, c, f, rd, metaDoc, wc, wl, fr, rp, cat] = await Promise.all([
      getMaterials(),
      getNonWoodMaterials(),
      getWasteRatios(),
      getCoatings(),
      getFormulas(),
      getRoundingRules(),
      getMasterMeta(),
      getWorkCenters(),
      getWoodLaborRows(),
      getFormulaDataRows(),
      getRoundComponentPresets(),
      getMaterialCatalog(),
    ]);
    return {
      materials: m,
      nonWood: nw,
      ratios: r,
      coatings: c,
      formulas: f,
      rounding: rd,
      meta: metaDoc,
      workCenters: wc,
      woodLabor: wl,
      formulaRows: fr,
      roundPresets: rp,
      catalog: cat,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAllMasters();
      applyFetched(data);
    } catch (e) {
      console.error('Master load failed:', e);
      setLoadError(e?.message || 'Gagal memuat master data dari browser');
    } finally {
      setLoading(false);
    }
  }, [fetchAllMasters, applyFetched]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      load();
    }
  }, [isOpen, load]);

  const stateSnap = useMemo(
    () => ({ catalog, materials, nonWood, ratios, woodLabor, coatings, formulaRows, formulas, rounding, roundPresets, workCenters }),
    [catalog, materials, nonWood, ratios, woodLabor, coatings, formulaRows, formulas, rounding, roundPresets, workCenters],
  );

  const tabsWithCount = useMemo(
    () =>
      MASTER_TABS_ORDER.map((id) => ({
        id,
        label: MASTER_TAB_META[id]?.label || id,
        count: TAB_COUNTS[id]?.(stateSnap) ?? null,
      })),
    [stateSnap],
  );

  const tabMeta = MASTER_TAB_META[tab];
  const tabRowCount = TAB_COUNTS[tab]?.(stateSnap) ?? 0;
  const masterLooksEmpty = !loading && materials.length === 0 && catalog.length === 0;
  const tabLooksEmpty = !loading && !loadError && tabRowCount === 0;

  const handleRestoreSamples = async () => {
    if (
      !window.confirm(
        'Pulihkan semua project sample Excel (11 referensi) yang pernah dihapus?\n\nMaster Data tidak berubah.'
      )
    ) {
      return;
    }
    try {
      const restored = await restoreDismissedSampleProjects();
      const count = restored.filter((d) => d.sampleKey).length;
      setMsg(`Sample referensi dipulihkan (${count} project). Tutup Master lalu refresh dashboard.`);
    } catch (e) {
      setMsg(e?.message || 'Gagal memulihkan sample.');
    }
  };

  const handleReimport = async () => {
    setLoading(true);
    setLoadError(null);
    setMsg('');
    try {
      await reimportMastersFromSeedFiles();
      const data = await fetchAllMasters();
      applyFetched(data);
      onReimported?.();
      setMsg('Master di-reset dari file seed (src/data/masters).');
    } catch (e) {
      console.error('Master reimport failed:', e);
      setLoadError(e?.message || 'Gagal reset import master');
      setMsg('');
    } finally {
      setLoading(false);
    }
  };

  const getRowsForTab = useCallback(() => {
    switch (tab) {
      case 'catalog':
        return catalog;
      case 'materials':
        return materials;
      case 'nonWood':
        return nonWood;
      case 'ratios':
        return ratios;
      case 'woodLabor':
        return woodLabor;
      case 'coatings':
        return coatings;
      case 'formulaRows':
        return formulaRows;
      case 'workCenters':
        return workCenters;
      default:
        return [];
    }
  }, [tab, catalog, materials, nonWood, ratios, woodLabor, coatings, formulaRows, workCenters]);

  const handleAddRow = () => {
    const row = createMasterRow(tab, getRowsForTab());
    if (!row) return;
    const append = (setter) => setter((prev) => [...prev, row]);
    switch (tab) {
      case 'catalog':
        append(setCatalog);
        break;
      case 'materials':
        append(setMaterials);
        break;
      case 'nonWood':
        append(setNonWood);
        break;
      case 'ratios':
        append(setRatios);
        break;
      case 'woodLabor':
        append(setWoodLabor);
        break;
      case 'coatings':
        append(setCoatings);
        break;
      case 'formulaRows':
        append(setFormulaRows);
        break;
      case 'workCenters':
        append(setWorkCenters);
        break;
      default:
        break;
    }
    setMsg(`Baris baru ditambahkan — klik «Simpan tab ini».`);
  };

  const handleRemoveWorkCenter = (id) => {
    setWorkCenters((prev) => prev.filter((w) => w.id !== id));
    setMsg('Work center dihapus dari daftar (simpan untuk permanen).');
  };

  const handleSaveTab = async () => {
    setSaving(true);
    setMsg('');
    try {
      if (tab === 'catalog') await saveMaterialCatalog(catalog);
      else if (tab === 'materials') await saveMaterials(materials);
      else if (tab === 'nonWood') await saveNonWoodMaterials(nonWood);
      else if (tab === 'ratios') await saveWasteRatios(ratios);
      else if (tab === 'coatings') await saveCoatings(coatings);
      else if (tab === 'formulas') await saveFormulas(formulas);
      else if (tab === 'rounding') {
        await saveRoundingRules(rounding);
        await saveRoundComponentPresets(roundPresets);
      } else if (tab === 'workCenters') await saveWorkCenters(workCenters);
      else if (tab === 'woodLabor') await saveWoodLaborRows(woodLabor);
      else if (tab === 'formulaRows') await saveFormulaDataRows(formulaRows);
      setMsg('Tersimpan.');
      onReimported?.();
    } catch (e) {
      setMsg(`Gagal: ${e.message}`);
    }
    setSaving(false);
  };

  const renderTable = () => {
    if (loading) return <MasterLoading />;
    switch (tab) {
      case 'catalog':
        return <CatalogTable rows={catalog} setCatalog={setCatalog} search={search} />;
      case 'materials':
        return <MaterialsTable rows={materials} setMaterials={setMaterials} search={search} />;
      case 'nonWood':
        return <NonWoodTable rows={nonWood} setNonWood={setNonWood} search={search} />;
      case 'ratios':
        return <RatiosTable rows={ratios} setRatios={setRatios} search={search} />;
      case 'woodLabor':
        return <WoodLaborTable rows={woodLabor} setWoodLabor={setWoodLabor} search={search} />;
      case 'coatings':
        return <CoatingsTable rows={coatings} setCoatings={setCoatings} search={search} />;
      case 'formulaRows':
        return <FormulaDataTable rows={formulaRows} setFormulaRows={setFormulaRows} search={search} />;
      case 'workCenters':
        return (
          <WorkCenterTable
            rows={workCenters}
            setWorkCenters={setWorkCenters}
            search={search}
            onRemove={handleRemoveWorkCenter}
          />
        );
      case 'formulas':
        return <FormulasRegistryTable rows={formulas} setFormulas={setFormulas} />;
      case 'rounding':
        return (
          <RoundingTables
            rounding={rounding}
            setRounding={setRounding}
            roundPresets={roundPresets}
            setRoundPresets={setRoundPresets}
          />
        );
      default:
        return null;
    }
  };

  const subtitle = meta
    ? `${meta.sourceFile} · v${meta.importScriptVersion || '1'} · ${catalog.length} katalog · ${materials.length} kayu · ${coatings.length} coating · ${workCenters.length} WC`
    : 'Mirror Excel — edit lalu simpan ke browser (IndexedDB)';

  if (!isOpen) return null;

  return (
    <>
      <FullPageShell
        isOpen={isOpen}
        onClose={onClose}
        title="Master Data Excel"
        icon={Database}
        subtitle={subtitle}
        accent="emerald"
        headerActions={
          <>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="text-xs font-bold text-white border border-white/30 px-3 py-2 rounded-lg hover:bg-white/15 flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Panduan
            </button>
            {tabAllowsAdd(tab) && (
              <button
                type="button"
                onClick={handleAddRow}
                disabled={loading}
                className="text-xs font-bold text-emerald-900 border border-white/40 bg-white/90 px-3 py-2 rounded-lg hover:bg-white flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah baris
              </button>
            )}
            <button
              type="button"
              onClick={handleRestoreSamples}
              className="text-xs font-bold text-white border border-white/30 px-3 py-2 rounded-lg hover:bg-white/15"
              title="QA: kembalikan BOM sample Excel yang dihapus dari dashboard"
            >
              Pulihkan sample BOM
            </button>
            <button
              type="button"
              onClick={handleReimport}
              className="text-xs font-bold text-emerald-900 border border-white/40 bg-white/90 px-3 py-2 rounded-lg hover:bg-white flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset import
            </button>
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={`text-xs ${msg ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
              {msg || `Tab aktif: ${tabMeta?.label || tab} — edit sel lalu Simpan tab ini.`}
            </span>
            <button
              type="button"
              onClick={handleSaveTab}
              disabled={saving || loading}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" /> {saving ? 'Menyimpan…' : 'Simpan tab ini'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col flex-1 min-h-0 w-full h-full">
          <MasterPanel className="flex-1 min-h-0 h-full">
            <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-slate-100 bg-white z-10">
              <MasterTabBar tabs={tabsWithCount} active={tab} onChange={(id) => { setTab(id); setSearch(''); }} />
            </div>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 sm:p-5 gap-3">
              <MasterAddProcessPanel
                tabId={tab}
                tabLabel={tabMeta?.label}
                canAdd={tabAllowsAdd(tab)}
                onAddRow={handleAddRow}
              />
              <MasterDataBody
                banners={
                  <>
                    {loadError && <MasterDataLoadError message={loadError} onRetry={load} />}
                    {!loadError && (masterLooksEmpty || tabLooksEmpty) && (
                      <MasterDataEmptyBanner
                        tabLabel={tabMeta?.label || tab}
                        rowCount={tabRowCount}
                        totalKayu={materials.length}
                        totalKatalog={catalog.length}
                        onReload={load}
                        onResetImport={handleReimport}
                      />
                    )}
                  </>
                }
                statusBar={
                  <MasterDataRowCount
                    tabLabel={tabMeta?.label || tab}
                    count={tabRowCount}
                    loading={loading}
                  />
                }
                hint={tabMeta ? <MasterTabHint sheet={tabMeta.sheet}>{tabMeta.hint}</MasterTabHint> : null}
                search={SEARCH_TABS.has(tab) ? search : undefined}
                onSearchChange={SEARCH_TABS.has(tab) ? setSearch : undefined}
                searchPlaceholder={tabMeta?.searchPlaceholder}
              >
                {renderTable()}
              </MasterDataBody>
            </div>
          </MasterPanel>
        </div>
      </FullPageShell>

      <MasterUsageGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}
