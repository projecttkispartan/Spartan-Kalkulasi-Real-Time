import { useEffect, useState, useCallback, useMemo } from 'react';
import { Database, RefreshCw, Save } from 'lucide-react';
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
import { dimensiLabel } from '../../utils/buildMaterialCatalog.js';
import FullPageShell from '../ui/FullPageShell.jsx';
import {
  CellInput,
  RpInput,
  PctInput,
  TypeChip,
  MasterTabBar,
  MasterPanel,
  MasterTableWrap,
  MasterThead,
  MasterTh,
  MasterTr,
  MasterTd,
  MasterLoading,
  MasterSearch,
  MasterSectionTitle,
  filterMasterRows,
} from '../master/MasterTable.jsx';

const TABS = [
  { id: 'catalog', label: 'Katalog Material' },
  { id: 'materials', label: 'DATA BASE' },
  { id: 'nonWood', label: 'Non-Kayu' },
  { id: 'ratios', label: 'MASTER RATIO' },
  { id: 'woodLabor', label: 'WOOD LABOR' },
  { id: 'coatings', label: 'COATING RATIO' },
  { id: 'formulaRows', label: 'FORMULA DATA' },
  { id: 'formulas', label: 'Formula Registry' },
  { id: 'rounding', label: 'ROUND COMPONENT' },
  { id: 'workCenters', label: 'WORK CENTER' },
];

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

export default function MasterMaterialsModal({ isOpen, onClose, onReimported }) {
  const [tab, setTab] = useState('materials');
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

  const catalogFiltered = useMemo(
    () => filterMasterRows(catalog, search, ['kode', 'nama', 'vendorSupplier', 'materialType']),
    [catalog, search],
  );

  const materialsFiltered = useMemo(
    () => filterMasterRows(materials, search, ['kode', 'woodName', 'specification', 'vendorSupplier']),
    [materials, search],
  );

  const stateSnap = useMemo(
    () => ({ catalog, materials, nonWood, ratios, woodLabor, coatings, formulaRows, formulas, rounding, roundPresets, workCenters }),
    [catalog, materials, nonWood, ratios, woodLabor, coatings, formulaRows, formulas, rounding, roundPresets, workCenters],
  );

  const tabsWithCount = useMemo(
    () =>
      TABS.map((t) => ({
        ...t,
        count: TAB_COUNTS[t.id]?.(stateSnap) ?? null,
      })),
    [stateSnap],
  );

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

  const patchList = (setter, id, field, value) => {
    setter((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const subtitle = meta
    ? `${meta.sourceFile} · v${meta.importScriptVersion || '1'} · checksum ${meta.checksum} · ${catalog.length} katalog · ${materials.length} kayu · ${coatings.length} coating · ${workCenters.length} WC`
    : 'DATA BASE, ratio, coating, formula — edit lalu simpan ke browser';

  return (
    <FullPageShell
      isOpen={isOpen}
      onClose={onClose}
      title="Master Data Excel"
      icon={Database}
      subtitle={subtitle}
      accent="emerald"
      headerActions={
        <button
          type="button"
          onClick={handleReimport}
          className="text-xs font-bold text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-50 flex items-center gap-1.5 bg-white shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset import
        </button>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`text-xs ${msg ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
            {msg || 'Edit sel lalu klik Simpan — disimpan di browser (IndexedDB).'}
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
      <MasterPanel>
        <div className="shrink-0 p-4 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 space-y-3">
          <MasterTabBar tabs={tabsWithCount} active={tab} onChange={(id) => { setTab(id); setSearch(''); }} />
          {(tab === 'catalog' || tab === 'materials') && !loading && (
            <MasterSearch
              value={search}
              onChange={setSearch}
              placeholder={tab === 'catalog' ? 'Cari katalog: kode, nama, vendor…' : 'Cari kayu: kode, nama, grade…'}
            />
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-5 min-h-0">
          {loading ? (
            <MasterLoading />
          ) : tab === 'catalog' ? (
            <MasterTableWrap minWidth="960px">
              <MasterThead>
                <tr>
                  <MasterTh>Kode</MasterTh>
                  <MasterTh>Nama</MasterTh>
                  <MasterTh>Jenis</MasterTh>
                  <MasterTh>Dimensi</MasterTh>
                  <MasterTh align="right" money>Harga log</MasterTh>
                  <MasterTh align="right" money>Safety factor</MasterTh>
                  <MasterTh align="right" money>Harga material</MasterTh>
                  <MasterTh>Vendor / supplier</MasterTh>
                  <MasterTh>Satuan</MasterTh>
                  <MasterTh>Sumber</MasterTh>
                </tr>
              </MasterThead>
              <tbody>
                {catalogFiltered.map((row, i) => (
                  <MasterTr key={row.id} index={i}>
                    <MasterTd mono>
                      <CellInput value={row.kode} onChange={(v) => patchList(setCatalog, row.id, 'kode', v)} mono />
                    </MasterTd>
                    <MasterTd>
                      <CellInput value={row.nama} onChange={(v) => patchList(setCatalog, row.id, 'nama', v)} />
                    </MasterTd>
                    <MasterTd>
                      <TypeChip type={row.materialType} />
                    </MasterTd>
                    <MasterTd className="text-slate-600 whitespace-nowrap text-xs">
                      {dimensiLabel(row.dimensi)}
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        value={row.hargaLog ?? row.hargaLogBuyer ?? 0}
                        onChange={(v) => patchList(setCatalog, row.id, 'hargaLog', v)}
                        suffix="log"
                      />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        value={row.safetyFactor ?? 0}
                        onChange={(v) => patchList(setCatalog, row.id, 'safetyFactor', v)}
                      />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        emphasize
                        value={row.hargaMaterial ?? row.hargaMaterialSupplier ?? 0}
                        onChange={(v) => patchList(setCatalog, row.id, 'hargaMaterial', v)}
                      />
                    </MasterTd>
                    <MasterTd>
                      <CellInput
                        value={row.vendorSupplier ?? ''}
                        onChange={(v) => patchList(setCatalog, row.id, 'vendorSupplier', v)}
                      />
                    </MasterTd>
                    <MasterTd className="text-xs text-slate-500">{row.unit || '—'}</MasterTd>
                    <MasterTd className="text-[10px] text-slate-400 max-w-[90px] truncate" title={row.source}>
                      {row.source}
                    </MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          ) : tab === 'materials' ? (
            <MasterTableWrap minWidth="900px">
              <MasterThead>
                <tr>
                  <MasterTh>No</MasterTh>
                  <MasterTh>Kode</MasterTh>
                  <MasterTh>Specification</MasterTh>
                  <MasterTh>Nama kayu</MasterTh>
                  <MasterTh>Grade / vendor</MasterTh>
                  <MasterTh align="right" money>Harga log buyer</MasterTh>
                  <MasterTh align="right" money>Safety factor</MasterTh>
                  <MasterTh align="right" money>Harga material buyer</MasterTh>
                  <MasterTh align="right" money>Harga supplier / m³</MasterTh>
                </tr>
              </MasterThead>
              <tbody>
                {materialsFiltered.map((m, i) => (
                  <MasterTr key={m.id} index={i}>
                    <MasterTd mono>{m.no}</MasterTd>
                    <MasterTd mono>
                      <CellInput value={m.kode} onChange={(v) => patchList(setMaterials, m.id, 'kode', v)} mono />
                    </MasterTd>
                    <MasterTd>
                      <CellInput value={m.specification} onChange={(v) => patchList(setMaterials, m.id, 'specification', v)} />
                    </MasterTd>
                    <MasterTd>
                      <CellInput value={m.woodName} onChange={(v) => patchList(setMaterials, m.id, 'woodName', v)} />
                    </MasterTd>
                    <MasterTd>
                      <CellInput
                        value={m.vendorSupplier || m.diameterGrade}
                        onChange={(v) => patchList(setMaterials, m.id, 'vendorSupplier', v)}
                      />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        value={m.hargaLogBuyer ?? m.pricePerM3Buyer}
                        onChange={(v) => patchList(setMaterials, m.id, 'hargaLogBuyer', v)}
                      />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        value={m.safetyFactorBuyer ?? m.priceSafetyFactorBuyer ?? 0}
                        onChange={(v) => patchList(setMaterials, m.id, 'safetyFactorBuyer', v)}
                      />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        emphasize
                        value={m.hargaMaterialBuyer ?? m.buyerTotalPerM3}
                        onChange={(v) => patchList(setMaterials, m.id, 'hargaMaterialBuyer', v)}
                        suffix="m³"
                      />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        value={m.hargaMaterialSupplier ?? m.pricePerM3Supplier}
                        onChange={(v) => patchList(setMaterials, m.id, 'hargaMaterialSupplier', v)}
                        suffix="m³"
                      />
                    </MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          ) : tab === 'nonWood' ? (
            <MasterTableWrap minWidth="480px">
              <MasterThead>
                <tr>
                  <MasterTh>Jenis</MasterTh>
                  <MasterTh>Material type</MasterTh>
                </tr>
              </MasterThead>
              <tbody>
                {nonWood.map((m) => (
                  <MasterTr key={m.id}>
                    <MasterTd>
                      <CellInput value={m.specification} onChange={(v) => patchList(setNonWood, m.id, 'specification', v)} />
                    </MasterTd>
                    <MasterTd>
                      <CellInput value={m.materialType} onChange={(v) => patchList(setNonWood, m.id, 'materialType', v)} />
                    </MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          ) : tab === 'ratios' ? (
            <MasterTableWrap minWidth="640px">
              <MasterThead>
                <tr>
                  <MasterTh>Label</MasterTh>
                  <MasterTh>Tipe</MasterTh>
                  <MasterTh align="center">SF %</MasterTh>
                  <MasterTh align="center">WF %</MasterTh>
                  <MasterTh>Sumber</MasterTh>
                </tr>
              </MasterThead>
              <tbody>
                {ratios.map((r, i) => (
                  <MasterTr key={r.id} index={i}>
                    <MasterTd className="font-semibold text-slate-800">{r.label}</MasterTd>
                    <MasterTd>
                      <TypeChip type={r.materialType} />
                    </MasterTd>
                    <MasterTd align="center">
                      <PctInput value={r.sf} onChange={(v) => patchList(setRatios, r.id, 'sf', v)} />
                    </MasterTd>
                    <MasterTd align="center">
                      <PctInput value={r.wf} onChange={(v) => patchList(setRatios, r.id, 'wf', v)} />
                    </MasterTd>
                    <MasterTd className="text-xs text-slate-500">{r.source}</MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          ) : tab === 'woodLabor' ? (
            <MasterTableWrap minWidth="720px">
              <MasterThead>
                <tr>
                  <MasterTh>No</MasterTh>
                  <MasterTh>Job</MasterTh>
                  <MasterTh align="right">Min/m³</MasterTh>
                  <MasterTh align="right">Hour/m³</MasterTh>
                  <MasterTh align="right" money>Biaya/m³</MasterTh>
                </tr>
              </MasterThead>
              <tbody>
                {woodLabor.map((w) => (
                  <MasterTr key={w.id}>
                    <MasterTd>{w.no}</MasterTd>
                    <MasterTd>
                      <CellInput value={w.jobDescription} onChange={(v) => patchList(setWoodLabor, w.id, 'jobDescription', v)} />
                    </MasterTd>
                    <MasterTd align="right">
                      <CellInput type="number" value={w.laborMinPerM3} onChange={(v) => patchList(setWoodLabor, w.id, 'laborMinPerM3', v)} className="text-right tabular-nums" />
                    </MasterTd>
                    <MasterTd align="right">
                      <CellInput type="number" value={w.laborHourPerM3} onChange={(v) => patchList(setWoodLabor, w.id, 'laborHourPerM3', v)} className="text-right tabular-nums" />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput value={w.laborCostPerM3} onChange={(v) => patchList(setWoodLabor, w.id, 'laborCostPerM3', v)} emphasize />
                    </MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          ) : tab === 'coatings' ? (
            <MasterTableWrap minWidth="520px">
              <MasterThead>
                <tr>
                  <MasterTh>No</MasterTh>
                  <MasterTh>Finishing</MasterTh>
                  <MasterTh align="right" money>Biaya / m²</MasterTh>
                </tr>
              </MasterThead>
              <tbody>
                {coatings.map((c) => (
                  <MasterTr key={c.id}>
                    <MasterTd>{c.no}</MasterTd>
                    <MasterTd>
                      <CellInput value={c.name} onChange={(v) => patchList(setCoatings, c.id, 'name', v)} />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput value={c.roundedCostM2} onChange={(v) => patchList(setCoatings, c.id, 'roundedCostM2', v)} emphasize />
                    </MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          ) : tab === 'formulaRows' ? (
            <MasterTableWrap minWidth="640px">
              <MasterThead>
                <tr>
                  <MasterTh>Material</MasterTh>
                  <MasterTh>Proses</MasterTh>
                  <MasterTh align="center">WF%</MasterTh>
                  <MasterTh align="center">SF%</MasterTh>
                  <MasterTh align="center">T (mm)</MasterTh>
                </tr>
              </MasterThead>
              <tbody>
                {formulaRows.map((f) => (
                  <MasterTr key={f.id}>
                    <MasterTd className="font-semibold">{f.materialType}</MasterTd>
                    <MasterTd>{f.proses}</MasterTd>
                    <MasterTd align="center">
                      <CellInput type="number" value={f.wfPct} onChange={(v) => patchList(setFormulaRows, f.id, 'wfPct', v)} className="text-center" />
                    </MasterTd>
                    <MasterTd align="center">
                      <CellInput type="number" value={f.sfPct} onChange={(v) => patchList(setFormulaRows, f.id, 'sfPct', v)} className="text-center" />
                    </MasterTd>
                    <MasterTd align="center">
                      <CellInput type="number" value={f.thicknessMm} onChange={(v) => patchList(setFormulaRows, f.id, 'thicknessMm', v)} className="text-center" />
                    </MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          ) : tab === 'formulas' ? (
            <MasterTableWrap minWidth="560px">
              <MasterThead>
                <tr>
                  <MasterTh>ID</MasterTh>
                  <MasterTh>Label</MasterTh>
                  <MasterTh>Deskripsi</MasterTh>
                </tr>
              </MasterThead>
              <tbody>
                {formulas.map((f) => (
                  <MasterTr key={f.id}>
                    <MasterTd mono>{f.id}</MasterTd>
                    <MasterTd>
                      <CellInput value={f.label} onChange={(v) => patchList(setFormulas, f.id, 'label', v)} />
                    </MasterTd>
                    <MasterTd>
                      <CellInput value={f.description} onChange={(v) => patchList(setFormulas, f.id, 'description', v)} />
                    </MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          ) : tab === 'rounding' ? (
            <div className="space-y-8">
              <section>
                <MasterSectionTitle>Aturan pembulatan</MasterSectionTitle>
                <MasterTableWrap minWidth="480px">
                  <MasterThead>
                    <tr>
                      <MasterTh>Target</MasterTh>
                      <MasterTh>Method</MasterTh>
                      <MasterTh>Step</MasterTh>
                    </tr>
                  </MasterThead>
                  <tbody>
                    {rounding.map((r) => (
                      <MasterTr key={r.id}>
                        <MasterTd className="font-semibold">{r.target}</MasterTd>
                        <MasterTd>
                          <CellInput value={r.method} onChange={(v) => patchList(setRounding, r.id, 'method', v)} />
                        </MasterTd>
                        <MasterTd>
                          <CellInput type="number" value={r.step} onChange={(v) => patchList(setRounding, r.id, 'step', v)} />
                        </MasterTd>
                      </MasterTr>
                    ))}
                  </tbody>
                </MasterTableWrap>
              </section>
              <section>
                <MasterSectionTitle>Round table presets (Excel)</MasterSectionTitle>
                <MasterTableWrap minWidth="720px">
                  <MasterThead>
                    <tr>
                      <MasterTh>Label</MasterTh>
                      <MasterTh align="center">Sections</MasterTh>
                      <MasterTh align="center">Ø luar (mm)</MasterTh>
                      <MasterTh align="center">Lebar radial</MasterTh>
                      <MasterTh align="center">T (mm)</MasterTh>
                      <MasterTh align="right">m³</MasterTh>
                    </tr>
                  </MasterThead>
                  <tbody>
                    {roundPresets.map((p) => (
                      <MasterTr key={p.id}>
                        <MasterTd>{p.label}</MasterTd>
                        <MasterTd align="center">
                          <CellInput type="number" value={p.sections} onChange={(v) => patchList(setRoundPresets, p.id, 'sections', v)} className="text-center" />
                        </MasterTd>
                        <MasterTd align="center">
                          <CellInput type="number" value={p.outerDiameterMm} onChange={(v) => patchList(setRoundPresets, p.id, 'outerDiameterMm', v)} className="text-center" />
                        </MasterTd>
                        <MasterTd align="center">
                          <CellInput type="number" value={p.radialWidthMm} onChange={(v) => patchList(setRoundPresets, p.id, 'radialWidthMm', v)} className="text-center" />
                        </MasterTd>
                        <MasterTd align="center">
                          <CellInput type="number" value={p.thicknessMm} onChange={(v) => patchList(setRoundPresets, p.id, 'thicknessMm', v)} className="text-center" />
                        </MasterTd>
                        <MasterTd align="right" className="tabular-nums text-slate-600">
                          {Number(p.cubicMeter || 0).toFixed(6)}
                        </MasterTd>
                      </MasterTr>
                    ))}
                  </tbody>
                </MasterTableWrap>
              </section>
            </div>
          ) : tab === 'workCenters' ? (
            <MasterTableWrap minWidth="640px">
              <MasterThead>
                <tr>
                  <MasterTh>Kode</MasterTh>
                  <MasterTh>Nama</MasterTh>
                  <MasterTh align="right" money>Rate / menit</MasterTh>
                  <MasterTh>Mesin</MasterTh>
                  <MasterTh>Sumber</MasterTh>
                </tr>
              </MasterThead>
              <tbody>
                {workCenters.map((wc) => (
                  <MasterTr key={wc.id}>
                    <MasterTd mono>{wc.kode}</MasterTd>
                    <MasterTd>
                      <CellInput value={wc.nama} onChange={(v) => patchList(setWorkCenters, wc.id, 'nama', v)} />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        value={Math.round(wc.ratePerMin || 0)}
                        onChange={(v) => patchList(setWorkCenters, wc.id, 'ratePerMin', v)}
                      />
                    </MasterTd>
                    <MasterTd>
                      <CellInput value={wc.mesin} onChange={(v) => patchList(setWorkCenters, wc.id, 'mesin', v)} />
                    </MasterTd>
                    <MasterTd className="text-xs text-slate-500">{wc.source || wc.category || '—'}</MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          ) : null}
        </div>
      </MasterPanel>
    </FullPageShell>
  );
}
