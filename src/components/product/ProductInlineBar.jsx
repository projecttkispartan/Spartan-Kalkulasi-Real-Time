import { ChevronDown, ChevronUp, Layout, Maximize2, Package } from 'lucide-react';
import { calcPackingVolume, findPackingByType } from '../../utils/packingVolume';
import { formatIDR } from '../../utils/formatters';
import { WoodGradeField, CoatingField } from '../fields/MasterCombos';

const labelCls = 'text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1';
const inputCls =
  'w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 bg-white min-w-0';

function SectionTitle({ children }) {
  return (
    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400 mb-1.5 col-span-full">
      {children}
    </p>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

/** Baris ringkas identitas produk — dipakai saat panel produk disembunyikan (fokus kalkulasi). */
export default function ProductInlineBar({
  productInfo,
  onProductInfoChange,
  productMeta,
  onProductMetaChange,
  dimensi,
  onDimensiChange,
  volProduk,
  packingDimensions = [],
  onPackingTolChange,
  packingVolOpts,
  mastersTick = 0,
  onWoodGradeChange,
  onCoatingChange,
  coatingPreview,
  productImage,
  expanded = false,
  onToggleExpand,
  onShowFullPanel,
}) {
  const boxItem = findPackingByType(packingDimensions, 'box');
  const sfItem = findPackingByType(packingDimensions, 'single');
  const volBox = boxItem ? calcPackingVolume(dimensi, boxItem, packingVolOpts).toFixed(4) : '—';
  const volSf = sfItem ? calcPackingVolume(dimensi, sfItem, packingVolOpts).toFixed(4) : '—';

  const dimLabel = [dimensi.w, dimensi.d, dimensi.h].filter(Boolean).length
    ? `${dimensi.w || 0} × ${dimensi.d || 0} × ${dimensi.h || 0} mm`
    : '—';

  if (!expanded) {
    return (
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 px-4 md:px-6 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">
            Produk
          </span>
          <span className="text-xs font-bold text-slate-800 truncate max-w-[min(100%,280px)]">
            {productInfo.nama || productInfo.namaBom || '—'}
          </span>
          {productInfo.kode ? (
            <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-md shrink-0">
              {productInfo.kode}
            </span>
          ) : null}
          <span className="text-[10px] text-slate-500 tabular-nums shrink-0 hidden sm:inline">{dimLabel}</span>
          <span className="text-[10px] font-bold text-blue-700 tabular-nums shrink-0 hidden md:inline">
            {volProduk ?? '0'} m³
          </span>
          {productInfo.collection ? (
            <span className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md shrink-0 hidden sm:inline truncate max-w-[140px]" title={productInfo.collection}>
              {productInfo.collection}
            </span>
          ) : null}
          {productMeta.itemType ? (
            <span className="text-[9px] font-bold uppercase text-slate-500 hidden lg:inline shrink-0">
              {productMeta.itemType}
            </span>
          ) : null}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Edit ringkas
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {onShowFullPanel ? (
              <button
                type="button"
                onClick={onShowFullPanel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-[10px] font-bold text-brand-800 hover:bg-brand-100 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Panel penuh
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-4 md:px-6 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Data produk
        </span>
        <span className="text-[9px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-md">
          mode ringkas
        </span>
        <div className="ml-auto flex items-center gap-2">
          {onShowFullPanel ? (
            <button
              type="button"
              onClick={onShowFullPanel}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-brand-700 hover:bg-brand-50"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Panel penuh
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-slate-600 hover:bg-slate-100"
          >
            Tutup
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-w-0">
        {productImage ? (
          <div className="shrink-0 flex lg:flex-col items-center gap-2">
            <img
              src={productImage}
              alt=""
              className="w-14 h-14 rounded-xl border border-slate-200 object-cover bg-slate-50"
            />
          </div>
        ) : null}

        <div className="flex-1 min-w-0 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-x-3 gap-y-2">
            <SectionTitle>Identitas</SectionTitle>
            <Field label="Nama produk" className="col-span-2 md:col-span-2 xl:col-span-2">
              <input
                type="text"
                value={productInfo.nama || ''}
                onChange={(e) => onProductInfoChange('nama', e.target.value)}
                className={inputCls}
                placeholder="Nama produk"
              />
            </Field>
            <Field label="Kode produk">
              <input
                type="text"
                value={productInfo.kode || ''}
                onChange={(e) => onProductInfoChange('kode', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Varian">
              <input
                type="text"
                value={productInfo.varian || ''}
                onChange={(e) => onProductInfoChange('varian', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Collection">
              <input
                type="text"
                value={productInfo.collection || ''}
                onChange={(e) => onProductInfoChange('collection', e.target.value)}
                className={inputCls}
                placeholder="Nama koleksi"
              />
            </Field>
            <Field label="Customer">
              <input
                type="text"
                value={productInfo.customer || ''}
                onChange={(e) => onProductInfoChange('customer', e.target.value)}
                className={inputCls}
              />
            </Field>

            <SectionTitle>BOM</SectionTitle>
            <Field label="Nama BOM" className="col-span-2 md:col-span-2 xl:col-span-2">
              <input
                type="text"
                value={productInfo.namaBom || ''}
                onChange={(e) => onProductInfoChange('namaBom', e.target.value)}
                className={`${inputCls} text-brand-700`}
              />
            </Field>
            <Field label="Kode BOM">
              <input
                type="text"
                value={productInfo.kodeBom || productInfo.kode || ''}
                onChange={(e) => onProductInfoChange('kodeBom', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Versi">
              <input
                type="text"
                value={productInfo.versi || ''}
                onChange={(e) => onProductInfoChange('versi', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Item type">
              <input
                type="text"
                value={productMeta.itemType || ''}
                onChange={(e) => onProductMetaChange('itemType', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div>
            <SectionTitle>Dimensi produk</SectionTitle>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-w-xl">
              <Field label="W (mm)">
                <input
                  type="number"
                  value={dimensi.w || ''}
                  onChange={(e) => onDimensiChange('w', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="D (mm)">
                <input
                  type="number"
                  value={dimensi.d || ''}
                  onChange={(e) => onDimensiChange('d', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="H (mm)">
                <input
                  type="number"
                  value={dimensi.h || ''}
                  onChange={(e) => onDimensiChange('h', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Volume" className="sm:col-span-2">
                <div className="h-[34px] flex items-center px-2.5 rounded-lg bg-blue-50 border border-blue-100 text-xs font-black text-blue-700 tabular-nums">
                  {volProduk ?? '0'} m³
                </div>
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle>Material produk</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Grade kayu">
                <WoodGradeField
                  value={productMeta.woodGradeId || ''}
                  manualSpec={productMeta.woodGradeId ? '' : productMeta.wood || ''}
                  onChange={onWoodGradeChange}
                  mastersTick={mastersTick}
                  compact
                  className="min-w-0 w-full"
                />
              </Field>
              <Field label="Coating">
                <CoatingField
                  value={productMeta.coating || ''}
                  coatingId={productMeta.coatingId || ''}
                  onChange={onCoatingChange}
                  mastersTick={mastersTick}
                  className="min-w-0 w-full"
                />
                {coatingPreview && productMeta.coatingId ? (
                  <p className="text-[9px] text-indigo-600 font-bold mt-1">
                    Σ {coatingPreview.surfaceM2?.toFixed(4) ?? 0} m² · Rp{' '}
                    {formatIDR(coatingPreview.coatingCost || 0)}
                  </p>
                ) : null}
              </Field>
            </div>
          </div>

          {(boxItem || sfItem) && onPackingTolChange ? (
            <div className="pt-2 border-t border-slate-100">
              <SectionTitle>
                <span className="inline-flex items-center gap-1">
                  <Layout className="w-3 h-3" /> Packing toleransi (+mm)
                </span>
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {boxItem ? (
                  <div className="rounded-lg border border-amber-200/80 bg-amber-50/30 p-2.5">
                    <p className="text-[9px] font-black text-amber-800 uppercase mb-2 flex items-center gap-1">
                      <Package className="w-3 h-3" /> Box · {volBox} m³
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {['tolW', 'tolD', 'tolH'].map((k, i) => (
                        <label key={k} className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-400">{['+W', '+D', '+H'][i]}</span>
                          <input
                            type="number"
                            value={boxItem[k] ?? 0}
                            onChange={(e) => onPackingTolChange(boxItem.id, k, e.target.value)}
                            className={`${inputCls} mt-0.5`}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                {sfItem ? (
                  <div className="rounded-lg border border-teal-200/80 bg-teal-50/30 p-2.5">
                    <p className="text-[9px] font-black text-teal-800 uppercase mb-2 flex items-center gap-1">
                      <Package className="w-3 h-3" /> Single Face · {volSf} m³
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {['tolW', 'tolD', 'tolH'].map((k, i) => (
                        <label key={k} className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-400">{['+W', '+D', '+H'][i]}</span>
                          <input
                            type="number"
                            value={sfItem[k] ?? 0}
                            onChange={(e) => onPackingTolChange(sfItem.id, k, e.target.value)}
                            className={`${inputCls} mt-0.5`}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
