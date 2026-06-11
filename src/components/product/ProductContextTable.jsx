import { Package } from 'lucide-react';
import { calcPackingVolume, findPackingByType } from '../../utils/packingVolume';

function Cell({ label, children, className = '' }) {
  return (
    <td className={`product-context-table__cell ${className}`}>
      <span className="product-context-table__label">{label}</span>
      <span className="product-context-table__value">{children || '—'}</span>
    </td>
  );
}

/** Tabel ringkas data produk — tampil saat panel produk disembunyikan (semua tab). */
export default function ProductContextTable({
  productInfo = {},
  productMeta = {},
  dimensi = {},
  volProduk,
  packingDimensions = [],
  packingVolOpts,
  productImage,
}) {
  const boxItem = findPackingByType(packingDimensions, 'box');
  const sfItem = findPackingByType(packingDimensions, 'single');
  const volBox = boxItem
    ? calcPackingVolume(dimensi, boxItem, packingVolOpts).toFixed(4)
    : '—';
  const volSf = sfItem
    ? calcPackingVolume(dimensi, sfItem, packingVolOpts).toFixed(4)
    : '—';
  const dimLabel =
    [dimensi.w, dimensi.d, dimensi.h].filter(Boolean).length > 0
      ? `${dimensi.w || 0} × ${dimensi.d || 0} × ${dimensi.h || 0} mm`
      : '—';
  const woodLabel = productMeta.woodGradeId
    ? productMeta.wood || 'Terhubung DATA BASE'
    : productMeta.wood || '—';

  return (
    <div className="product-context-table shrink-0 border-b border-slate-200 bg-white">
      <div className="flex items-center h-8 gap-2 px-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
        <Package className="w-3.5 h-3.5 text-brand-500 shrink-0" aria-hidden />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
          Data produk
        </span>
        <span className="text-[9px] text-slate-400 truncate" title="Gunakan tombol Tampilkan Produk di atas untuk mengedit">
          (ringkas)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="product-context-table__grid w-full min-w-[720px] text-left">
          <tbody>
            <tr>
              {productImage ? (
                <td className="product-context-table__thumb" rowSpan={2}>
                  <img
                    src={productImage}
                    alt=""
                    className="w-10 h-10 rounded-lg border border-slate-200 object-cover bg-slate-50"
                  />
                </td>
              ) : null}
              <Cell label="Kode produk">{productInfo.kode}</Cell>
              <Cell label="Nama produk" className="min-w-[140px]">
                {productInfo.nama || productInfo.namaBom}
              </Cell>
              <Cell label="Item type">{productMeta.itemType}</Cell>
              <Cell label="Versi">v{productInfo.versi}</Cell>
              <Cell label="Customer">{productInfo.customer}</Cell>
              <Cell label="Collection">{productInfo.collection}</Cell>
            </tr>
            <tr>
              <Cell label="Dimensi">{dimLabel}</Cell>
              <Cell label="Volume produk">
                {volProduk != null ? `${volProduk} m³` : '—'}
              </Cell>
              <Cell label="Grade kayu">{woodLabel}</Cell>
              <Cell label="Coating">{productMeta.coating}</Cell>
              <Cell label="Vol. box packing">
                {volBox !== '—' ? `${volBox} m³` : '—'}
              </Cell>
              <Cell label="Vol. single face">
                {volSf !== '—' ? `${volSf} m³` : '—'}
              </Cell>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
