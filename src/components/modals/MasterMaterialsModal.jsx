import { useEffect, useState, useCallback } from 'react';
import { X, Database, RefreshCw, Save } from 'lucide-react';
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
  reimportMastersFromSeedFiles,
} from '../../services/masterStorage';

const TABS = [
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

function CellInput({ value, onChange, type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      className={`w-full border border-slate-200 rounded px-1.5 py-1 text-xs focus:border-emerald-400 outline-none ${className}`}
    />
  );
}

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
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [m, nw, r, c, f, rd, metaDoc, wc, wl, fr, rp] = await Promise.all([
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
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

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
      if (tab === 'materials') await saveMaterials(materials);
      else if (tab === 'nonWood') await saveNonWoodMaterials(nonWood);
      else if (tab === 'ratios') await saveWasteRatios(ratios);
      else if (tab === 'coatings') await saveCoatings(coatings);
      else if (tab === 'formulas') await saveFormulas(formulas);
      else if (tab === 'rounding') await saveRoundingRules(rounding);
      else if (tab === 'workCenters') await saveWorkCenters(workCenters);
      else if (tab === 'woodLabor') await saveWoodLaborRows(woodLabor);
      else if (tab === 'formulaRows') await saveFormulaDataRows(formulaRows);
      else if (tab === 'rounding') {
        await saveRoundingRules(rounding);
        await saveRoundComponentPresets(roundPresets);
      }
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

  return (
    <div className="fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" /> Master Data Excel
            </h2>
            {meta && (
              <p className="text-[10px] text-slate-500 mt-1">
                {meta.sourceFile} · v{meta.importScriptVersion || '1'} · checksum {meta.checksum} ·{' '}
                {materials.length} kayu · {ratios.length} ratio · {coatings.length} coating · {workCenters.length} WC
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReimport}
              className="text-xs font-bold text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset import
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 px-4 pt-3 border-b border-slate-100 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-[10px] font-bold rounded-t-lg transition-colors ${
                tab === t.id ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <p className="text-center text-slate-400 py-12">Memuat master…</p>
          ) : tab === 'materials' ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-bold border-b sticky top-0 bg-white">
                <tr>
                  <th className="py-2 pr-2">No</th>
                  <th className="py-2 pr-2">Specification</th>
                  <th className="py-2 pr-2">Nama</th>
                  <th className="py-2 pr-2 text-right">Rp/m³ supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td className="py-1 pr-2 font-mono">{m.no}</td>
                    <td className="py-1 pr-2">
                      <CellInput value={m.specification} onChange={(v) => patchList(setMaterials, m.id, 'specification', v)} />
                    </td>
                    <td className="py-1 pr-2">
                      <CellInput value={m.woodName} onChange={(v) => patchList(setMaterials, m.id, 'woodName', v)} />
                    </td>
                    <td className="py-1 pr-2">
                      <CellInput type="number" value={m.pricePerM3Supplier} onChange={(v) => patchList(setMaterials, m.id, 'pricePerM3Supplier', v)} className="text-right" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'nonWood' ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-bold border-b sticky top-0 bg-white">
                <tr>
                  <th className="py-2">Jenis</th>
                  <th className="py-2">Material type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nonWood.map((m) => (
                  <tr key={m.id}>
                    <td className="py-1">
                      <CellInput value={m.specification} onChange={(v) => patchList(setNonWood, m.id, 'specification', v)} />
                    </td>
                    <td className="py-1">
                      <CellInput value={m.materialType} onChange={(v) => patchList(setNonWood, m.id, 'materialType', v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'ratios' ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-bold border-b sticky top-0 bg-white">
                <tr>
                  <th className="py-2">Label</th>
                  <th className="py-2">Tipe</th>
                  <th className="py-2 text-center">SF %</th>
                  <th className="py-2 text-center">WF %</th>
                  <th className="py-2">Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ratios.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1 font-bold">{r.label}</td>
                    <td className="py-1">{r.materialType}</td>
                    <td className="py-1">
                      <CellInput type="number" value={r.sf} onChange={(v) => patchList(setRatios, r.id, 'sf', v)} className="text-center" />
                    </td>
                    <td className="py-1">
                      <CellInput type="number" value={r.wf} onChange={(v) => patchList(setRatios, r.id, 'wf', v)} className="text-center" />
                    </td>
                    <td className="py-1 text-[10px] text-slate-500">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'woodLabor' ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-bold border-b sticky top-0 bg-white">
                <tr>
                  <th className="py-2">No</th>
                  <th className="py-2">Job</th>
                  <th className="py-2 text-right">Min/m³</th>
                  <th className="py-2 text-right">Hour/m³</th>
                  <th className="py-2 text-right">Cost/m³ (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {woodLabor.map((w) => (
                  <tr key={w.id}>
                    <td className="py-1">{w.no}</td>
                    <td className="py-1">
                      <CellInput value={w.jobDescription} onChange={(v) => patchList(setWoodLabor, w.id, 'jobDescription', v)} />
                    </td>
                    <td className="py-1">
                      <CellInput type="number" value={w.laborMinPerM3} onChange={(v) => patchList(setWoodLabor, w.id, 'laborMinPerM3', v)} className="text-right" />
                    </td>
                    <td className="py-1">
                      <CellInput type="number" value={w.laborHourPerM3} onChange={(v) => patchList(setWoodLabor, w.id, 'laborHourPerM3', v)} className="text-right" />
                    </td>
                    <td className="py-1">
                      <CellInput type="number" value={w.laborCostPerM3} onChange={(v) => patchList(setWoodLabor, w.id, 'laborCostPerM3', v)} className="text-right" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'coatings' ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-bold border-b sticky top-0 bg-white">
                <tr>
                  <th className="py-2 pr-2">No</th>
                  <th className="py-2 pr-2">Finishing</th>
                  <th className="py-2 pr-2 text-right">Rounded / m²</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coatings.map((c) => (
                  <tr key={c.id}>
                    <td className="py-1 pr-2">{c.no}</td>
                    <td className="py-1 pr-2">
                      <CellInput value={c.name} onChange={(v) => patchList(setCoatings, c.id, 'name', v)} />
                    </td>
                    <td className="py-1 pr-2">
                      <CellInput type="number" value={c.roundedCostM2} onChange={(v) => patchList(setCoatings, c.id, 'roundedCostM2', v)} className="text-right" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'formulaRows' ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-bold border-b sticky top-0 bg-white">
                <tr>
                  <th className="py-2">Material</th>
                  <th className="py-2">Proses</th>
                  <th className="py-2 text-center">WF%</th>
                  <th className="py-2 text-center">SF%</th>
                  <th className="py-2 text-center">T (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formulaRows.map((f) => (
                  <tr key={f.id}>
                    <td className="py-1 font-bold">{f.materialType}</td>
                    <td className="py-1">{f.proses}</td>
                    <td className="py-1">
                      <CellInput type="number" value={f.wfPct} onChange={(v) => patchList(setFormulaRows, f.id, 'wfPct', v)} className="text-center" />
                    </td>
                    <td className="py-1">
                      <CellInput type="number" value={f.sfPct} onChange={(v) => patchList(setFormulaRows, f.id, 'sfPct', v)} className="text-center" />
                    </td>
                    <td className="py-1">
                      <CellInput type="number" value={f.thicknessMm} onChange={(v) => patchList(setFormulaRows, f.id, 'thicknessMm', v)} className="text-center" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'formulas' ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-bold border-b sticky top-0 bg-white">
                <tr>
                  <th className="py-2">ID</th>
                  <th className="py-2">Label</th>
                  <th className="py-2">Deskripsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formulas.map((f) => (
                  <tr key={f.id}>
                    <td className="py-1 font-mono text-[10px]">{f.id}</td>
                    <td className="py-1">
                      <CellInput value={f.label} onChange={(v) => patchList(setFormulas, f.id, 'label', v)} />
                    </td>
                    <td className="py-1">
                      <CellInput value={f.description} onChange={(v) => patchList(setFormulas, f.id, 'description', v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'rounding' ? (
            <div className="space-y-6">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-slate-500 font-bold border-b">
                  <tr>
                    <th className="py-2">Target</th>
                    <th className="py-2">Method</th>
                    <th className="py-2">Step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rounding.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1 font-bold">{r.target}</td>
                      <td className="py-1">
                        <CellInput value={r.method} onChange={(v) => patchList(setRounding, r.id, 'method', v)} />
                      </td>
                      <td className="py-1">
                        <CellInput type="number" value={r.step} onChange={(v) => patchList(setRounding, r.id, 'step', v)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div>
                <h3 className="text-xs font-black text-slate-700 mb-2">Round Table Presets (Excel)</h3>
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-slate-500 font-bold border-b">
                    <tr>
                      <th className="py-2">Label</th>
                      <th className="py-2 text-center">Sections</th>
                      <th className="py-2 text-center">Ø luar (mm)</th>
                      <th className="py-2 text-center">Lebar radial</th>
                      <th className="py-2 text-center">T (mm)</th>
                      <th className="py-2 text-right">m³</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roundPresets.map((p) => (
                      <tr key={p.id}>
                        <td className="py-1">{p.label}</td>
                        <td className="py-1">
                          <CellInput type="number" value={p.sections} onChange={(v) => patchList(setRoundPresets, p.id, 'sections', v)} className="text-center" />
                        </td>
                        <td className="py-1">
                          <CellInput type="number" value={p.outerDiameterMm} onChange={(v) => patchList(setRoundPresets, p.id, 'outerDiameterMm', v)} className="text-center" />
                        </td>
                        <td className="py-1">
                          <CellInput type="number" value={p.radialWidthMm} onChange={(v) => patchList(setRoundPresets, p.id, 'radialWidthMm', v)} className="text-center" />
                        </td>
                        <td className="py-1">
                          <CellInput type="number" value={p.thicknessMm} onChange={(v) => patchList(setRoundPresets, p.id, 'thicknessMm', v)} className="text-center" />
                        </td>
                        <td className="py-1 text-right tabular-nums">{Number(p.cubicMeter || 0).toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : tab === 'workCenters' ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-bold border-b sticky top-0 bg-white">
                <tr>
                  <th className="py-2">Kode</th>
                  <th className="py-2">Nama</th>
                  <th className="py-2 text-right">Rate/mnt</th>
                  <th className="py-2">Mesin</th>
                  <th className="py-2">Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workCenters.map((wc) => (
                  <tr key={wc.id}>
                    <td className="py-1 font-mono">{wc.kode}</td>
                    <td className="py-1">
                      <CellInput value={wc.nama} onChange={(v) => patchList(setWorkCenters, wc.id, 'nama', v)} />
                    </td>
                    <td className="py-1">
                      <CellInput type="number" value={Math.round(wc.ratePerMin || 0)} onChange={(v) => patchList(setWorkCenters, wc.id, 'ratePerMin', v)} className="text-right" />
                    </td>
                    <td className="py-1">
                      <CellInput value={wc.mesin} onChange={(v) => patchList(setWorkCenters, wc.id, 'mesin', v)} />
                    </td>
                    <td className="py-1 text-[10px] text-slate-500">{wc.source || wc.category || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <span className="text-[10px] text-slate-500">{msg || 'Edit sel lalu klik Simpan — disimpan di browser (IndexedDB).'}</span>
          <button
            type="button"
            onClick={handleSaveTab}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan…' : 'Simpan tab ini'}
          </button>
        </div>
      </div>
    </div>
  );
}
