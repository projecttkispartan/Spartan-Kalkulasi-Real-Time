import { useEffect, useState, useCallback, useMemo } from 'react';
import { Database, RefreshCw, Save, HelpCircle } from 'lucide-react';
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
import FullPageShell from '../ui/FullPageShell.jsx';
import MasterUsageGuideModal from './MasterUsageGuideModal.jsx';
import { MASTER_TAB_META, MASTER_TABS_ORDER } from '../master/masterTabMeta.js';
import {
  MasterTabBar,
  MasterPanel,
  MasterLoading,
  MasterTabHint,
  MasterDataBody,
} from '../master/MasterTable.jsx';
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

  const load = useCallback(async () => {
    setLoading(true);
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
    setMaterials(m);
    setNonWood(nw);
    setRatios(r);
    setCoatings(c);
    setFormulas(f);
    setRounding(rd);
    setMeta(metaDoc);
    setWorkCenters(wc);
    setWoodLabor(wl);
    setFormulaRows(fr);
    setRoundPresets(rp);
    setCatalog(cat);
    setLoading(false);
  }, []);

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

  if (!isOpen) return null;

  const handleReimport = async () => {
    await reimportMastersFromSeedFiles();
    await load();
    onReimported?.();
    setMsg('Master di-reset dari file import Excel.');
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
        return <WorkCenterTable rows={workCenters} setWorkCenters={setWorkCenters} search={search} />;
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
        <MasterPanel className="flex-1 min-h-0">
          <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-slate-100 bg-white z-10">
            <MasterTabBar tabs={tabsWithCount} active={tab} onChange={(id) => { setTab(id); setSearch(''); }} />
          </div>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 sm:p-5">
            <MasterDataBody
              hint={tabMeta ? <MasterTabHint sheet={tabMeta.sheet}>{tabMeta.hint}</MasterTabHint> : null}
              search={SEARCH_TABS.has(tab) ? search : undefined}
              onSearchChange={SEARCH_TABS.has(tab) ? setSearch : undefined}
              searchPlaceholder={tabMeta?.searchPlaceholder}
            >
              {renderTable()}
            </MasterDataBody>
          </div>
        </MasterPanel>
      </FullPageShell>

      <MasterUsageGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}
