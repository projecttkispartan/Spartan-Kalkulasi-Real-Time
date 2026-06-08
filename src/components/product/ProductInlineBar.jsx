import { WoodGradeField, CoatingField } from '../fields/MasterCombos';

const labelCls = 'text-[9px] font-bold text-slate-500 uppercase tracking-wide';
const inputCls =
  'w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 bg-white';

/** Baris ringkas identitas produk — dipakai saat panel produk disembunyikan (fokus kalkulasi). */
export default function ProductInlineBar({
  productInfo,
  onProductInfoChange,
  productMeta,
  onProductMetaChange,
  dimensi,
  onDimensiChange,
  mastersTick = 0,
  onWoodGradeChange,
  onCoatingChange,
}) {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-4 md:px-6 py-3">
      <p className={`${labelCls} mb-2 text-slate-400`}>
        Data produk — isi di sini sambil menginput struktur &amp; kalkulasi
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-2 items-end">
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <label className={labelCls}>Kode BOM</label>
          <input
            type="text"
            value={productInfo.kode || ''}
            onChange={(e) => onProductInfoChange('kode', e.target.value)}
            className={inputCls}
            placeholder="G632L-RO"
          />
        </div>
        <div className="col-span-2 sm:col-span-2 lg:col-span-3">
          <label className={labelCls}>Nama produk</label>
          <input
            type="text"
            value={productInfo.nama || ''}
            onChange={(e) => onProductInfoChange('nama', e.target.value)}
            className={inputCls}
            placeholder="Nama BOM / produk"
          />
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <label className={labelCls}>Customer</label>
          <input
            type="text"
            value={productInfo.customer || ''}
            onChange={(e) => onProductInfoChange('customer', e.target.value)}
            className={inputCls}
            placeholder="Customer"
          />
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <label className={labelCls}>Item type</label>
          <input
            type="text"
            value={productMeta.itemType || ''}
            onChange={(e) => onProductMetaChange('itemType', e.target.value)}
            className={inputCls}
            placeholder="SOFA 3 SEATERS"
          />
        </div>
        <div className="col-span-1">
          <label className={labelCls}>W (mm)</label>
          <input
            type="number"
            value={dimensi.w || ''}
            onChange={(e) => onDimensiChange('w', e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
        <div className="col-span-1">
          <label className={labelCls}>D (mm)</label>
          <input
            type="number"
            value={dimensi.d || ''}
            onChange={(e) => onDimensiChange('d', e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
        <div className="col-span-1">
          <label className={labelCls}>H (mm)</label>
          <input
            type="number"
            value={dimensi.h || ''}
            onChange={(e) => onDimensiChange('h', e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
        <div className="col-span-2 sm:col-span-2 lg:col-span-3">
          <label className={labelCls}>Grade kayu produk</label>
          <WoodGradeField
            value={productMeta.woodGradeId || ''}
            onChange={onWoodGradeChange}
            mastersTick={mastersTick}
            compact
          />
        </div>
        <div className="col-span-2 sm:col-span-2 lg:col-span-3">
          <label className={labelCls}>Coating</label>
          <CoatingField
            value={productMeta.coating || ''}
            coatingId={productMeta.coatingId || ''}
            onChange={onCoatingChange}
            mastersTick={mastersTick}
            className="min-w-0"
          />
        </div>
      </div>
    </div>
  );
}
