import { Layout, Package, Network } from 'lucide-react';
import { calcPackingVolume, findPackingByType } from '../../utils/packingVolume';
import ClickZoomImage from '../ui/ClickZoomImage';
import { resolveNodeFoto } from '../../utils/images';
import { formatIDR } from '../../utils/formatters';
import { WoodGradeField, CoatingField } from '../fields/MasterCombos';

const fieldLabel = 'label-field mb-1 block';
const fieldInput =
  'w-full border-b-2 border-slate-200 px-0 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-brand-500 bg-transparent transition-colors hover:border-slate-300';

/** Satu baris rumus packing — tinggi & kotak sama dengan input Produk (nett + tol = gross). */
function PackingAxisFormula({ base, tolVal, gross, theme, onTol }) {
  const field = `product-dim-produk-in shrink-0 ${theme.field}`;
  return (
    <div className="product-dim-formula" role="group" aria-label="Nett plus toleransi sama dengan gross">
      <span className={`${field} product-dim-field--readonly`} title="Nett (mm)">
        {base}
      </span>
      <span className={`product-dim-formula__sep ${theme.plus}`} aria-hidden>
        +
      </span>
      <input
        type="number"
        inputMode="numeric"
        step="1"
        value={tolVal}
        onChange={(e) => onTol(e.target.value)}
        className={field}
        title="Toleransi (mm)"
        aria-label="Toleransi mm"
      />
      <span className={`product-dim-formula__sep ${theme.plus}`} aria-hidden>
        =
      </span>
      <span className={`${field} product-dim-field--readonly`} title="Gross (mm)">
        {gross}
      </span>
    </div>
  );
}

function DimColumn({ icon: Icon, title, vol, accent, variant = 'produk', children }) {
  const volLabel = `${Number(vol).toFixed(4)} m³`;
  return (
    <div className={`product-dim-col product-dim-col--${variant} ${accent.border}`}>
      <div className={`product-dim-col__head ${accent.head}`}>
        <span className={`product-dim-col__title ${accent.title}`}>
          <Icon className={`w-3.5 h-3.5 shrink-0 ${accent.icon}`} />
          <span className="truncate">{title}</span>
        </span>
        <span className={`product-dim-col__vol normal-case ${accent.vol}`} title={volLabel}>
          {volLabel}
        </span>
      </div>
      <div className={`product-dim-col__body ${accent.body}`}>{children}</div>
    </div>
  );
}

function AxisSlot({ label, children }) {
  return (
    <div className="product-dim-axis">
      <span className="product-dim-axis__label">{label}</span>
      {children}
    </div>
  );
}

const PACK_THEME = {
  box: {
    border: 'border-material-200',
    head: 'bg-material-50/90 border-material-100',
    body: 'bg-white',
    title: 'text-material-700',
    icon: 'text-material-500',
    vol: 'bg-material-100 text-material-800 border-material-200',
    plus: 'text-material-500',
    field: 'border-material-200 text-material-800 focus:border-material-400 focus:ring-material-200',
  },
  sf: {
    border: 'border-teal-200',
    head: 'bg-teal-50/90 border-teal-100',
    body: 'bg-white',
    title: 'text-teal-700',
    icon: 'text-teal-500',
    vol: 'bg-teal-100 text-teal-800 border-teal-200',
    plus: 'text-teal-500',
    field: 'border-teal-200 text-teal-800 focus:border-teal-400 focus:ring-teal-200',
  },
};

const PRODUK_ACCENT = {
  border: 'border-brand-200',
  head: 'bg-brand-50/90 border-brand-100',
  body: 'bg-white',
  title: 'text-brand-700',
  icon: 'text-brand-500',
  vol: 'bg-brand-100 text-brand-800 border-brand-200',
  input: 'border-brand-200 focus:border-brand-400 focus:ring-brand-100',
};

export default function ProductPanel({
  productInfo,
  onProductInfoChange,
  productMeta,
  onProductMetaChange,
  productImage,
  dimensi,
  onDimensiChange,
  volProduk,
  packingDimensions,
  onPackingTolChange,
  packingVolOpts,
  mastersTick = 0,
  onWoodGradeChange,
  onCoatingChange,
  coatingPreview,
}) {
  const axes = [
    { label: 'W', dimKey: 'w', tolKey: 'tolW', base: dimensi.w },
    { label: 'D', dimKey: 'd', tolKey: 'tolD', base: dimensi.d },
    { label: 'H', dimKey: 'h', tolKey: 'tolH', base: dimensi.h },
  ];

  const boxItem = findPackingByType(packingDimensions, 'box');
  const sfItem = findPackingByType(packingDimensions, 'single');

  const renderPackingCol = (item, themeKey, title) => {
    if (!item) return null;
    const theme = PACK_THEME[themeKey];
    const vol = calcPackingVolume(dimensi, item, packingVolOpts).toFixed(4);

    return (
      <DimColumn key={themeKey} icon={Package} title={title} vol={vol} accent={theme} variant="pack">
        {axes.map(({ label, tolKey, base }) => {
          const gross = base + (Number(item[tolKey]) || 0);
          return (
            <AxisSlot key={tolKey} label={label}>
              <PackingAxisFormula
                base={base}
                tolVal={item[tolKey]}
                gross={gross}
                theme={theme}
                onTol={(val) => onPackingTolChange(item.id, tolKey, val)}
              />
            </AxisSlot>
          );
        })}
      </DimColumn>
    );
  };

  const fotoSrc = productImage || resolveNodeFoto({ foto: productImage, tipe: 'MODUL' });

  return (
    <div className="editor-product-panel">
      <div className="surface-card-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(10.5rem,12.5rem)_1fr] gap-0 lg:gap-0">
          <div className="flex flex-row lg:flex-col gap-4 p-4 lg:p-5 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/40">
            <ClickZoomImage
              fill
              src={fotoSrc}
              alt={productInfo.nama}
              className="h-24 w-24 sm:h-28 sm:w-28 lg:h-auto lg:w-full lg:aspect-square rounded-xl border-slate-200"
            />
            <div className="flex flex-wrap lg:flex-col gap-1.5 flex-1 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-brand-100 text-brand-800 text-[10px] font-black uppercase">
                {productMeta.itemType || '—'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                v{productInfo.versi}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4 md:p-5 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3">
              <div className="sm:col-span-2">
                <label className={fieldLabel}>Nama Produk</label>
                <input
                  type="text"
                  value={productInfo.nama}
                  onChange={(e) => onProductInfoChange('nama', e.target.value)}
                  className={`${fieldInput} text-lg font-black text-slate-800 py-1`}
                />
              </div>
              <div>
                <label className={fieldLabel}>Kode Produk</label>
                <input type="text" value={productInfo.kode} onChange={(e) => onProductInfoChange('kode', e.target.value)} className={fieldInput} />
              </div>
              <div>
                <label className={fieldLabel}>Varian</label>
                <input type="text" value={productInfo.varian} onChange={(e) => onProductInfoChange('varian', e.target.value)} className={fieldInput} />
              </div>
              <div className="sm:col-span-2">
                <label className={fieldLabel}>Nama BOM</label>
                <div className="flex items-center gap-2 border-b-2 border-slate-200 focus-within:border-brand-500">
                  <Network className="w-4 h-4 text-brand-500 shrink-0" />
                  <input
                    type="text"
                    value={productInfo.namaBom}
                    onChange={(e) => onProductInfoChange('namaBom', e.target.value)}
                    className="w-full py-2 text-sm font-bold text-brand-700 focus:outline-none bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className={fieldLabel}>Kode BOM</label>
                <input type="text" value={productInfo.kodeBom} onChange={(e) => onProductInfoChange('kodeBom', e.target.value)} className={`${fieldInput} text-brand-700`} />
              </div>
              <div>
                <label className={fieldLabel}>Versi</label>
                <input type="text" value={productInfo.versi} onChange={(e) => onProductInfoChange('versi', e.target.value)} className={fieldInput} />
              </div>
              <div className="sm:col-span-2">
                <label className={fieldLabel}>Customer</label>
                <input type="text" value={productInfo.customer} onChange={(e) => onProductInfoChange('customer', e.target.value)} className={fieldInput} />
              </div>
              <div>
                <label className={fieldLabel}>Item Type</label>
                <input
                  type="text"
                  value={productMeta.itemType}
                  onChange={(e) => onProductMetaChange('itemType', e.target.value)}
                  className={fieldInput}
                  placeholder="CHAIR"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={fieldLabel}>
                  Kayu (DATA BASE)
                  {productMeta.woodGradeId ? (
                    <span className="ml-2 text-[9px] font-mono text-emerald-600 normal-case">
                      terhubung
                    </span>
                  ) : null}
                </label>
                <WoodGradeField
                  mastersTick={mastersTick}
                  value={productMeta.woodGradeId || ''}
                  manualSpec={productMeta.woodGradeId ? '' : productMeta.wood || ''}
                  onChange={(id, mat, manualSpec) => {
                    if (onWoodGradeChange) {
                      if (id && mat) onWoodGradeChange(id, mat);
                      else if (manualSpec != null && !id) {
                        onProductMetaChange('woodGradeId', '');
                        onProductMetaChange('wood', manualSpec);
                      } else if (!id && !mat) {
                        onProductMetaChange('woodGradeId', '');
                        onProductMetaChange('wood', '');
                      }
                    } else {
                      onProductMetaChange('woodGradeId', id || '');
                      onProductMetaChange('wood', mat?.specification || manualSpec || '');
                    }
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={fieldLabel}>Coating (COATING RATIO)</label>
                <CoatingField
                  mastersTick={mastersTick}
                  value={productMeta.coating || ''}
                  coatingId={productMeta.coatingId || ''}
                  onChange={(payload) => {
                    if (onCoatingChange) onCoatingChange(payload);
                    else {
                      onProductMetaChange('coatingId', payload.coatingId || '');
                      onProductMetaChange('coating', payload.coating || '');
                    }
                  }}
                />
                {coatingPreview && productMeta.coatingId ? (
                  <p className="text-[10px] text-indigo-600 font-bold mt-1">
                    Σ luas part: {coatingPreview.surfaceM2?.toFixed(4) ?? 0} m² · estimasi coating Rp{' '}
                    {formatIDR(coatingPreview.coatingCost || 0)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="product-dim-cols-wrap mt-0.5">
              <p className="product-dim-cols__legend">Dimensi (mm) · W × D × H</p>
              <div className="product-dim-cols">
                <DimColumn icon={Layout} title="Produk" vol={volProduk} accent={PRODUK_ACCENT} variant="produk">
                  {axes.map(({ label, dimKey }) => (
                    <AxisSlot key={dimKey} label={label}>
                      <input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        value={dimensi[dimKey]}
                        onChange={(e) => onDimensiChange(dimKey, e.target.value)}
                        className={`product-dim-produk-in ${PRODUK_ACCENT.input}`}
                        title={`Dimensi ${label} (mm)`}
                        aria-label={`Produk ${label} mm`}
                      />
                    </AxisSlot>
                  ))}
                </DimColumn>
                {renderPackingCol(boxItem, 'box', 'Box Packing')}
                {renderPackingCol(sfItem, 'sf', 'Single Face')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
