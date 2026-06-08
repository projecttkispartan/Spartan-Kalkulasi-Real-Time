import { dimensiLabel } from '../../utils/buildMaterialCatalog.js';
import {
  CellInput,
  RpInput,
  PctInput,
  NumInput,
  TypeChip,
  MasterTableWrap,
  MasterThead,
  MasterTh,
  MasterTr,
  MasterTd,
  MasterEmpty,
  MasterSectionTitle,
  filterMasterRows,
} from './MasterTable.jsx';

function patchRow(setter, id, field, value) {
  setter((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
}

/** Kolom standar: No | Kode | Nama/Label | …data | Sumber */
export function MaterialsTable({ rows, setMaterials, search = '' }) {
  const list = filterMasterRows(rows, search, ['kode', 'woodName', 'specification', 'vendorSupplier', 'diameterGrade']);
  if (!list.length) return <MasterEmpty message="Tidak ada baris DATA BASE" />;

  return (
    <MasterTableWrap minWidth="1100px">
      <MasterThead>
        <tr>
          <MasterTh narrow align="center">No</MasterTh>
          <MasterTh>Kode</MasterTh>
          <MasterTh>Specification</MasterTh>
          <MasterTh>Nama kayu</MasterTh>
          <MasterTh>Grade / vendor</MasterTh>
          <MasterTh align="right" money>Harga log buyer</MasterTh>
          <MasterTh align="center">SF buyer</MasterTh>
          <MasterTh align="right" money>Harga material buyer</MasterTh>
          <MasterTh align="right" money>Harga supplier / m³</MasterTh>
          <MasterTh>Sumber</MasterTh>
        </tr>
      </MasterThead>
      <tbody>
        {list.map((m, i) => (
          <MasterTr key={m.id} index={i}>
            <MasterTd narrow align="center" mono>{m.no}</MasterTd>
            <MasterTd mono>
              <CellInput value={m.kode} onChange={(v) => patchRow(setMaterials, m.id, 'kode', v)} mono />
            </MasterTd>
            <MasterTd>
              <CellInput value={m.specification} onChange={(v) => patchRow(setMaterials, m.id, 'specification', v)} />
            </MasterTd>
            <MasterTd>
              <CellInput value={m.woodName} onChange={(v) => patchRow(setMaterials, m.id, 'woodName', v)} />
            </MasterTd>
            <MasterTd>
              <CellInput
                value={m.vendorSupplier || m.diameterGrade || ''}
                onChange={(v) => patchRow(setMaterials, m.id, 'vendorSupplier', v)}
              />
            </MasterTd>
            <MasterTd align="right">
              <RpInput
                className="ml-auto"
                value={m.hargaLogBuyer ?? m.pricePerM3Buyer}
                onChange={(v) => patchRow(setMaterials, m.id, 'hargaLogBuyer', v)}
                suffix="m³"
              />
            </MasterTd>
            <MasterTd align="center">
              <PctInput value={m.safetyFactorBuyer ?? m.priceSafetyFactorBuyer ?? 0} onChange={(v) => patchRow(setMaterials, m.id, 'safetyFactorBuyer', v)} />
            </MasterTd>
            <MasterTd align="right">
              <RpInput
                className="ml-auto"
                emphasize
                value={m.hargaMaterialBuyer ?? m.buyerTotalPerM3}
                onChange={(v) => patchRow(setMaterials, m.id, 'hargaMaterialBuyer', v)}
                suffix="m³"
              />
            </MasterTd>
            <MasterTd align="right">
              <RpInput
                className="ml-auto"
                value={m.hargaMaterialSupplier ?? m.pricePerM3Supplier}
                onChange={(v) => patchRow(setMaterials, m.id, 'hargaMaterialSupplier', v)}
                suffix="m³"
              />
            </MasterTd>
            <MasterTd className="text-[10px] text-slate-500 max-w-[100px] truncate" title={m.source}>
              {m.source || 'DATA BASE'}
            </MasterTd>
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function DatabaseSectionTable({ rows, setRows, search = '' }) {
  const list = filterMasterRows(rows, search, ['kode', 'specification', 'nama', 'section', 'materialType']);
  if (!list.length) return <MasterEmpty message="Tidak ada baris DATABASE P0 — jalankan npm run import:masters" />;

  return (
    <MasterTableWrap minWidth="1100px">
      <MasterThead>
        <tr>
          <MasterTh narrow align="center">No</MasterTh>
          <MasterTh>Section</MasterTh>
          <MasterTh>Kode</MasterTh>
          <MasterTh>Specification</MasterTh>
          <MasterTh>Item code</MasterTh>
          <MasterTh>Tipe</MasterTh>
          <MasterTh align="center">Unit</MasterTh>
          <MasterTh align="right" money>Harga supplier</MasterTh>
          <MasterTh align="right" money>Harga buyer</MasterTh>
          <MasterTh>Sumber</MasterTh>
        </tr>
      </MasterThead>
      <tbody>
        {list.map((m, i) => (
          <MasterTr key={m.id} index={i}>
            <MasterTd narrow align="center" mono>{m.no}</MasterTd>
            <MasterTd>
              <TypeChip type={m.section || m.materialType} />
            </MasterTd>
            <MasterTd mono>
              <CellInput value={m.kode} onChange={(v) => patchRow(setRows, m.id, 'kode', v)} mono />
            </MasterTd>
            <MasterTd>
              <CellInput value={m.specification} onChange={(v) => patchRow(setRows, m.id, 'specification', v)} />
            </MasterTd>
            <MasterTd mono>
              <CellInput value={m.itemCode || ''} onChange={(v) => patchRow(setRows, m.id, 'itemCode', v)} mono />
            </MasterTd>
            <MasterTd>
              <TypeChip type={m.materialType} />
            </MasterTd>
            <MasterTd align="center" mono>{m.units || m.unit || 'm3'}</MasterTd>
            <MasterTd align="right">
              <RpInput
                className="ml-auto"
                emphasize
                value={m.hargaMaterialSupplier ?? m.pricePerUnitSupplier ?? m.pricePerM3Supplier ?? 0}
                onChange={(v) => patchRow(setRows, m.id, 'hargaMaterialSupplier', v)}
                suffix={
                  m.unit === 'm2' ? 'm²' : ['pcs', 'lbr', 'kg', 'm', 'ltr', 'roll'].includes(m.unit) ? '/unit' : 'm³'
                }
              />
            </MasterTd>
            <MasterTd align="right">
              <RpInput
                className="ml-auto"
                value={m.hargaMaterialBuyer ?? m.buyerTotalPerM3 ?? 0}
                onChange={(v) => patchRow(setRows, m.id, 'hargaMaterialBuyer', v)}
              />
            </MasterTd>
            <MasterTd className="text-[10px] text-slate-500 max-w-[100px] truncate" title={m.excelRef}>
              {m.excelRef || 'DATA BASE'}
            </MasterTd>
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function FobCostTable({ master, setMaster, search = '' }) {
  const m = master || {};
  const containerKey = m.selectedContainer || '20foot';
  const container = m.containers?.[containerKey];
  const items = (container?.lineItems || []).filter((it) => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return true;
    return String(it.description || '').toLowerCase().includes(q);
  });

  if (!container?.lineItems?.length) {
    return <MasterEmpty message="FOB COST kosong — jalankan npm run import:masters:zan" />;
  }

  const patchLine = (no, field, value) => {
    setMaster((prev) => {
      const key = prev.selectedContainer || '20foot';
      const c = { ...prev.containers[key] };
      c.lineItems = c.lineItems.map((it) =>
        it.no === no ? { ...it, [field]: value } : it,
      );
      return {
        ...prev,
        containers: { ...prev.containers, [key]: c },
      };
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {['20foot', '40foot', '40hc'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setMaster((p) => ({ ...p, selectedContainer: k }))}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${
              containerKey === k
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {m.containers?.[k]?.label || k}
          </button>
        ))}
        <span className="text-[10px] text-slate-500 ml-2">
          Kurs: US$ 1 = Rp {Number(m.exchangeRateUsd || 0).toLocaleString('id-ID')} · SF baris/total:{' '}
          {(Number(m.lineSafetyPct || 0.05) * 100).toFixed(0)}%
        </span>
        <span className="text-[10px] font-bold text-violet-700">
          Rounded: Rp {Number(container.roundedFobPerM3 || 0).toLocaleString('id-ID')}/m³
        </span>
      </div>
      <MasterTableWrap minWidth="1000px">
        <MasterThead>
          <tr>
            <MasterTh narrow align="center">No</MasterTh>
            <MasterTh>Layanan</MasterTh>
            <MasterTh align="center">Qty</MasterTh>
            <MasterTh align="right" money>Biaya/unit</MasterTh>
            <MasterTh align="center">SF</MasterTh>
            <MasterTh align="right" money>Total (+SF)</MasterTh>
          </tr>
        </MasterThead>
        <tbody>
          {items.map((it, i) => (
            <MasterTr key={it.no} index={i}>
              <MasterTd narrow align="center" mono>{it.no}</MasterTd>
              <MasterTd>{it.description}</MasterTd>
              <MasterTd align="center">
                <NumInput value={it.qty} onChange={(v) => patchLine(it.no, 'qty', v)} />
              </MasterTd>
              <MasterTd align="right">
                <RpInput
                  className="ml-auto"
                  value={it.costPerUnit}
                  onChange={(v) => patchLine(it.no, 'costPerUnit', v)}
                />
              </MasterTd>
              <MasterTd align="center">
                <PctInput
                  value={(Number(it.safetyFactor) || 0) * 100}
                  onChange={(v) => patchLine(it.no, 'safetyFactor', v / 100)}
                />
              </MasterTd>
              <MasterTd align="right" mono>
                Rp {Number(it.totalCost || 0).toLocaleString('id-ID')}
              </MasterTd>
            </MasterTr>
          ))}
        </tbody>
      </MasterTableWrap>
    </div>
  );
}

export function NonWoodTable({ rows, setNonWood, search = '' }) {
  const list = filterMasterRows(rows, search, ['specification', 'woodName', 'materialType']);
  if (!list.length) return <MasterEmpty />;

  return (
    <MasterTableWrap minWidth="900px">
      <MasterThead>
        <tr>
          <MasterTh narrow align="center">No</MasterTh>
          <MasterTh>Specification</MasterTh>
          <MasterTh>Nama</MasterTh>
          <MasterTh>Tipe material</MasterTh>
          <MasterTh align="right" money>Harga buyer / m³</MasterTh>
          <MasterTh align="right" money>Harga supplier / m³</MasterTh>
          <MasterTh>Sumber</MasterTh>
        </tr>
      </MasterThead>
      <tbody>
        {list.map((m, i) => (
          <MasterTr key={m.id} index={i}>
            <MasterTd narrow align="center" mono>{m.no}</MasterTd>
            <MasterTd>
              <CellInput value={m.specification} onChange={(v) => patchRow(setNonWood, m.id, 'specification', v)} />
            </MasterTd>
            <MasterTd>
              <CellInput value={m.woodName || m.specification} onChange={(v) => patchRow(setNonWood, m.id, 'woodName', v)} />
            </MasterTd>
            <MasterTd>
              <div className="flex items-center gap-2 flex-wrap">
                <TypeChip type={m.materialType} />
                <CellInput value={m.materialType} onChange={(v) => patchRow(setNonWood, m.id, 'materialType', v)} className="max-w-[8rem]" />
              </div>
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" value={m.pricePerM3Buyer ?? 0} onChange={(v) => patchRow(setNonWood, m.id, 'pricePerM3Buyer', v)} suffix="m³" />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" value={m.pricePerM3Supplier ?? 0} onChange={(v) => patchRow(setNonWood, m.id, 'pricePerM3Supplier', v)} suffix="m³" />
            </MasterTd>
            <MasterTd className="text-[10px] text-slate-500">{m.source || '—'}</MasterTd>
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function RatiosTable({ rows, setRatios, search = '' }) {
  const list = filterMasterRows(rows, search, ['label', 'materialType', 'category']);
  if (!list.length) return <MasterEmpty />;

  return (
    <MasterTableWrap minWidth="820px">
      <MasterThead>
        <tr>
          <MasterTh>Label / kategori</MasterTh>
          <MasterTh>Tipe material</MasterTh>
          <MasterTh align="center">SF %</MasterTh>
          <MasterTh align="center">WF %</MasterTh>
          <MasterTh align="center">Waste factor</MasterTh>
          <MasterTh>Sumber</MasterTh>
        </tr>
      </MasterThead>
      <tbody>
        {list.map((r, i) => (
          <MasterTr key={r.id} index={i}>
            <MasterTd className="font-semibold text-slate-800">{r.label}</MasterTd>
            <MasterTd>
              <TypeChip type={r.materialType || r.category} />
            </MasterTd>
            <MasterTd align="center">
              <PctInput value={r.sf} onChange={(v) => patchRow(setRatios, r.id, 'sf', v)} />
            </MasterTd>
            <MasterTd align="center">
              <PctInput value={r.wf} onChange={(v) => patchRow(setRatios, r.id, 'wf', v)} />
            </MasterTd>
            <MasterTd align="center">
              <NumInput value={r.wasteFactor ?? 0} onChange={(v) => patchRow(setRatios, r.id, 'wasteFactor', v)} step={0.01} />
            </MasterTd>
            <MasterTd className="text-[10px] text-slate-500 max-w-[120px] truncate" title={r.excelRef}>
              {r.source || '—'}
            </MasterTd>
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function WoodLaborTable({ rows, setWoodLabor, search = '' }) {
  const list = filterMasterRows(rows, search, ['jobDescription', 'id']);
  if (!list.length) return <MasterEmpty />;

  return (
    <MasterTableWrap minWidth="880px">
      <MasterThead>
        <tr>
          <MasterTh narrow align="center">No</MasterTh>
          <MasterTh>Job description</MasterTh>
          <MasterTh align="right">Min / m³</MasterTh>
          <MasterTh align="right">Jam / m³</MasterTh>
          <MasterTh align="right" money>Biaya / m³</MasterTh>
          <MasterTh>Sumber</MasterTh>
        </tr>
      </MasterThead>
      <tbody>
        {list.map((w, i) => (
          <MasterTr key={w.id} index={i}>
            <MasterTd narrow align="center" mono>{w.no}</MasterTd>
            <MasterTd>
              <CellInput value={w.jobDescription} onChange={(v) => patchRow(setWoodLabor, w.id, 'jobDescription', v)} />
            </MasterTd>
            <MasterTd align="right">
              <NumInput value={w.laborMinPerM3} onChange={(v) => patchRow(setWoodLabor, w.id, 'laborMinPerM3', v)} />
            </MasterTd>
            <MasterTd align="right">
              <NumInput value={w.laborHourPerM3} onChange={(v) => patchRow(setWoodLabor, w.id, 'laborHourPerM3', v)} step={0.01} />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" emphasize value={w.laborCostPerM3} onChange={(v) => patchRow(setWoodLabor, w.id, 'laborCostPerM3', v)} suffix="m³" />
            </MasterTd>
            <MasterTd className="text-[10px] text-slate-500">{w.source || 'MASTER RATIO'}</MasterTd>
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function CoatingsTable({ rows, setCoatings, search = '' }) {
  const list = filterMasterRows(rows, search, ['name', 'nama', 'kode', 'no']);
  if (!list.length) return <MasterEmpty />;

  return (
    <MasterTableWrap minWidth="1000px">
      <MasterThead>
        <tr>
          <MasterTh narrow align="center">No</MasterTh>
          <MasterTh>Kode</MasterTh>
          <MasterTh>Nama finishing</MasterTh>
          <MasterTh align="right" money>Material / m²</MasterTh>
          <MasterTh align="center">Waste %</MasterTh>
          <MasterTh align="right" money>Labor / m²</MasterTh>
          <MasterTh align="right" money>Total prod / m²</MasterTh>
          <MasterTh align="right" money>Rounded / m²</MasterTh>
        </tr>
      </MasterThead>
      <tbody>
        {list.map((c, i) => (
          <MasterTr key={c.id} index={i}>
            <MasterTd narrow align="center" mono>{c.no}</MasterTd>
            <MasterTd mono className="text-xs">{c.kode || `COAT-${c.no}`}</MasterTd>
            <MasterTd>
              <CellInput value={c.name || c.nama} onChange={(v) => patchRow(setCoatings, c.id, 'name', v)} />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" value={c.materialCostM2 ?? 0} onChange={(v) => patchRow(setCoatings, c.id, 'materialCostM2', v)} suffix="m²" />
            </MasterTd>
            <MasterTd align="center">
              <NumInput value={Number(c.materialWaste) || 0} onChange={(v) => patchRow(setCoatings, c.id, 'materialWaste', v)} step={0.01} />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" value={c.laborM2 ?? 0} onChange={(v) => patchRow(setCoatings, c.id, 'laborM2', v)} suffix="m²" />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" value={c.totalProductionM2 ?? 0} onChange={(v) => patchRow(setCoatings, c.id, 'totalProductionM2', v)} suffix="m²" />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" emphasize value={c.roundedCostM2 ?? 0} onChange={(v) => patchRow(setCoatings, c.id, 'roundedCostM2', v)} suffix="m²" />
            </MasterTd>
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function FormulaDataTable({ rows, setFormulaRows, search = '' }) {
  const list = filterMasterRows(rows, search, ['materialType', 'proses', 'componentName']);
  if (!list.length) return <MasterEmpty />;

  return (
    <MasterTableWrap minWidth="960px">
      <MasterThead>
        <tr>
          <MasterTh narrow align="center">No</MasterTh>
          <MasterTh>Material type</MasterTh>
          <MasterTh>Proses</MasterTh>
          <MasterTh>Komponen</MasterTh>
          <MasterTh align="center">WF %</MasterTh>
          <MasterTh align="center">SF %</MasterTh>
          <MasterTh align="center">T (mm)</MasterTh>
          <MasterTh align="center">Buyer ratio</MasterTh>
          <MasterTh align="center">Supplier ratio</MasterTh>
        </tr>
      </MasterThead>
      <tbody>
        {list.map((f, i) => (
          <MasterTr key={f.id} index={i}>
            <MasterTd narrow align="center" mono>{f.no ?? f.row}</MasterTd>
            <MasterTd className="font-semibold text-slate-800">{f.materialType}</MasterTd>
            <MasterTd>{f.proses || '—'}</MasterTd>
            <MasterTd>
              <CellInput value={f.componentName || ''} onChange={(v) => patchRow(setFormulaRows, f.id, 'componentName', v)} />
            </MasterTd>
            <MasterTd align="center">
              <NumInput value={f.wfPct} onChange={(v) => patchRow(setFormulaRows, f.id, 'wfPct', v)} />
            </MasterTd>
            <MasterTd align="center">
              <NumInput value={f.sfPct} onChange={(v) => patchRow(setFormulaRows, f.id, 'sfPct', v)} />
            </MasterTd>
            <MasterTd align="center">
              <NumInput value={f.thicknessMm} onChange={(v) => patchRow(setFormulaRows, f.id, 'thicknessMm', v)} />
            </MasterTd>
            <MasterTd align="center">
              <NumInput value={f.buyerRatio ?? 0} onChange={(v) => patchRow(setFormulaRows, f.id, 'buyerRatio', v)} step={0.01} />
            </MasterTd>
            <MasterTd align="center">
              <NumInput value={f.supplierRatio ?? 0} onChange={(v) => patchRow(setFormulaRows, f.id, 'supplierRatio', v)} step={0.01} />
            </MasterTd>
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function WorkCenterTable({ rows, setWorkCenters, search = '', onRemove }) {
  const list = filterMasterRows(rows, search, ['kode', 'nama', 'mesin', 'category']);
  if (!list.length) return <MasterEmpty message="Belum ada work center" />;

  return (
    <MasterTableWrap minWidth="960px">
      <MasterThead>
        <tr>
          <MasterTh>Kode</MasterTh>
          <MasterTh>Nama work center</MasterTh>
          <MasterTh>Kategori</MasterTh>
          <MasterTh>Mesin / section</MasterTh>
          <MasterTh align="right" money>Rate / menit</MasterTh>
          <MasterTh align="right" money>Labor / m³</MasterTh>
          <MasterTh>Sumber</MasterTh>
          {onRemove && <MasterTh narrow align="center">Aksi</MasterTh>}
        </tr>
      </MasterThead>
      <tbody>
        {list.map((wc, i) => (
          <MasterTr key={wc.id} index={i}>
            <MasterTd mono className="text-slate-600">{wc.kode}</MasterTd>
            <MasterTd>
              <CellInput value={wc.nama} onChange={(v) => patchRow(setWorkCenters, wc.id, 'nama', v)} />
            </MasterTd>
            <MasterTd>
              <CellInput value={wc.category || ''} onChange={(v) => patchRow(setWorkCenters, wc.id, 'category', v)} />
            </MasterTd>
            <MasterTd>
              <CellInput value={wc.mesin || ''} onChange={(v) => patchRow(setWorkCenters, wc.id, 'mesin', v)} />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" emphasize value={Math.round(wc.ratePerMin || 0)} onChange={(v) => patchRow(setWorkCenters, wc.id, 'ratePerMin', v)} suffix="mnt" />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" value={wc.laborCostPerM3 ?? 0} onChange={(v) => patchRow(setWorkCenters, wc.id, 'laborCostPerM3', v)} suffix="m³" />
            </MasterTd>
            <MasterTd className="text-[10px] text-slate-500">{wc.source || wc.category || '—'}</MasterTd>
            {onRemove && (
              <MasterTd narrow align="center">
                <button
                  type="button"
                  onClick={() => onRemove(wc.id)}
                  className="text-[10px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg border border-red-100"
                >
                  Hapus
                </button>
              </MasterTd>
            )}
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function CatalogTable({ rows, setCatalog, search = '' }) {
  const list = filterMasterRows(rows, search, ['kode', 'nama', 'vendorSupplier', 'materialType']);
  if (!list.length) return <MasterEmpty />;

  return (
    <MasterTableWrap minWidth="1100px">
      <MasterThead>
        <tr>
          <MasterTh>Kode</MasterTh>
          <MasterTh>Nama</MasterTh>
          <MasterTh>Jenis</MasterTh>
          <MasterTh>Dimensi</MasterTh>
          <MasterTh align="right" money>Harga log</MasterTh>
          <MasterTh align="right" money>Safety factor</MasterTh>
          <MasterTh align="right" money>Harga material</MasterTh>
          <MasterTh>Vendor</MasterTh>
          <MasterTh narrow>Satuan</MasterTh>
          <MasterTh>Sumber</MasterTh>
        </tr>
      </MasterThead>
      <tbody>
        {list.map((row, i) => (
          <MasterTr key={row.id} index={i}>
            <MasterTd mono>
              <CellInput value={row.kode} onChange={(v) => patchRow(setCatalog, row.id, 'kode', v)} mono />
            </MasterTd>
            <MasterTd>
              <CellInput value={row.nama} onChange={(v) => patchRow(setCatalog, row.id, 'nama', v)} />
            </MasterTd>
            <MasterTd>
              <TypeChip type={row.materialType} />
            </MasterTd>
            <MasterTd className="text-slate-600 whitespace-nowrap text-xs">{dimensiLabel(row.dimensi)}</MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" value={row.hargaLog ?? row.hargaLogBuyer ?? 0} onChange={(v) => patchRow(setCatalog, row.id, 'hargaLog', v)} />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" value={row.safetyFactor ?? 0} onChange={(v) => patchRow(setCatalog, row.id, 'safetyFactor', v)} />
            </MasterTd>
            <MasterTd align="right">
              <RpInput className="ml-auto" emphasize value={row.hargaMaterial ?? row.hargaMaterialSupplier ?? 0} onChange={(v) => patchRow(setCatalog, row.id, 'hargaMaterial', v)} />
            </MasterTd>
            <MasterTd>
              <CellInput value={row.vendorSupplier ?? ''} onChange={(v) => patchRow(setCatalog, row.id, 'vendorSupplier', v)} />
            </MasterTd>
            <MasterTd narrow className="text-xs text-slate-500">{row.unit || '—'}</MasterTd>
            <MasterTd className="text-[10px] text-slate-400 max-w-[90px] truncate" title={row.source}>{row.source}</MasterTd>
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function FormulasRegistryTable({ rows, setFormulas }) {
  if (!rows.length) return <MasterEmpty />;
  return (
    <MasterTableWrap minWidth="720px">
      <MasterThead>
        <tr>
          <MasterTh>ID</MasterTh>
          <MasterTh>Label</MasterTh>
          <MasterTh>Deskripsi</MasterTh>
        </tr>
      </MasterThead>
      <tbody>
        {rows.map((f, i) => (
          <MasterTr key={f.id} index={i}>
            <MasterTd mono>{f.id}</MasterTd>
            <MasterTd>
              <CellInput value={f.label} onChange={(v) => patchRow(setFormulas, f.id, 'label', v)} />
            </MasterTd>
            <MasterTd>
              <CellInput value={f.description} onChange={(v) => patchRow(setFormulas, f.id, 'description', v)} />
            </MasterTd>
          </MasterTr>
        ))}
      </tbody>
    </MasterTableWrap>
  );
}

export function RoundingTables({ rounding, setRounding, roundPresets, setRoundPresets }) {
  return (
    <div className="space-y-6">
      <section>
        <MasterSectionTitle>Aturan pembulatan</MasterSectionTitle>
        <MasterTableWrap minWidth="640px">
          <MasterThead>
            <tr>
              <MasterTh>Target</MasterTh>
              <MasterTh>Method</MasterTh>
              <MasterTh align="center">Step</MasterTh>
            </tr>
          </MasterThead>
          <tbody>
            {rounding.map((r, i) => (
              <MasterTr key={r.id} index={i}>
                <MasterTd className="font-semibold">{r.target}</MasterTd>
                <MasterTd>
                  <CellInput value={r.method} onChange={(v) => patchRow(setRounding, r.id, 'method', v)} />
                </MasterTd>
                <MasterTd align="center">
                  <NumInput value={r.step} onChange={(v) => patchRow(setRounding, r.id, 'step', v)} />
                </MasterTd>
              </MasterTr>
            ))}
          </tbody>
        </MasterTableWrap>
      </section>
      <section>
        <MasterSectionTitle>Round table presets</MasterSectionTitle>
        <MasterTableWrap minWidth="880px">
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
            {roundPresets.map((p, i) => (
              <MasterTr key={p.id} index={i}>
                <MasterTd>{p.label}</MasterTd>
                <MasterTd align="center">
                  <NumInput value={p.sections} onChange={(v) => patchRow(setRoundPresets, p.id, 'sections', v)} />
                </MasterTd>
                <MasterTd align="center">
                  <NumInput value={p.outerDiameterMm} onChange={(v) => patchRow(setRoundPresets, p.id, 'outerDiameterMm', v)} />
                </MasterTd>
                <MasterTd align="center">
                  <NumInput value={p.radialWidthMm} onChange={(v) => patchRow(setRoundPresets, p.id, 'radialWidthMm', v)} />
                </MasterTd>
                <MasterTd align="center">
                  <NumInput value={p.thicknessMm} onChange={(v) => patchRow(setRoundPresets, p.id, 'thicknessMm', v)} />
                </MasterTd>
                <MasterTd align="right" className="tabular-nums text-slate-600 font-mono text-xs">
                  {Number(p.cubicMeter || 0).toFixed(6)}
                </MasterTd>
              </MasterTr>
            ))}
          </tbody>
        </MasterTableWrap>
      </section>
    </div>
  );
}
