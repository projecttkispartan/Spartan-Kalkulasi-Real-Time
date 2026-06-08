import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft, DollarSign, Euro, FileText, CheckCircle2, ImagePlus, Network, Package, Grid,
  Wrench, Calculator, BookOpen, Plus, Search, Table as TableIcon, ZoomOut, ZoomIn, Maximize,
  Trash2, ChevronDown, Link as LinkIcon, Image as ImageIcon, ChevronRight, Layout, Activity,
  AlertTriangle, PieChart, Server, Users, QrCode, Briefcase, Edit, Eye, EyeOff, PanelTopClose, PanelTopOpen, TrendingUp, ClipboardList,
} from 'lucide-react';
import { flattenTree, getPartHierarchyLabels } from '../utils/treeHelpers';
import { formatIDR, formatPrice } from '../utils/formatters';
import { MoneyText } from '../components/ui/MoneyText.jsx';
import {
  CONTAINER_PRESETS,
  buildDefaultContainerRows,
  calcContainerNetCapacity,
  calcPackingVolume,
  findPackingByType,
} from '../utils/packingVolume';
import {
  ELBA_CHAIR_REFERENCE,
  EXCEL_FACTORY_OH_PCT,
  MATERIAL_TYPE_OPTIONS,
  getMaterialTypeLabel,
} from '../data/excelReference';
import { calcProsesCosts, LABOR_RATE_PER_MIN } from '../utils/operationCosts';
import { getProsesById } from '../data/routingCatalog';
import { tipeStyles } from '../design/tipeStyles';
import EditorTabBar from '../components/ui/EditorTabBar';
import { CurrencyGroup } from '../components/ui/CurrencyInput';
import TypeBadge from '../components/ui/TypeBadge';
import SectionCard from '../components/ui/SectionCard';
import RoutingModal from '../components/modals/RoutingModal';
import SummaryDetailModal from '../components/modals/SummaryDetailModal';
import KalkulasiModal from '../components/modals/KalkulasiModal';
import MarkupPreviewModal from '../components/modals/MarkupPreviewModal';
import ProductPanel from '../components/product/ProductPanel';
import ProductInlineBar from '../components/product/ProductInlineBar';
import ExcelParityChecklistModal from '../components/modals/ExcelParityChecklistModal';
import { auditExcelParity } from '../utils/excelParityAudit.js';
import CogsInsightModal from '../components/modals/CogsInsightModal.jsx';
import { buildCogsInsight } from '../utils/cogsBreakdown.js';
import { CURATED_SAMPLE_KEYS } from '../utils/emptyProject.js';
import OperasiDetailCell from '../components/ui/OperasiDetailCell';
import FontCaseToggle from '../components/ui/FontCaseToggle';
import ExportMenu from '../components/ui/ExportMenu';
import { buildBomExportPayload, exportBomToExcel, exportBomToPdf, exportBomToPdfFull } from '../utils/bomExport';
import MasterWorkCenterModal from '../components/modals/MasterWorkCenterModal';
import MasterMaterialsModal from '../components/modals/MasterMaterialsModal';
import ManualBookModal from '../components/modals/ManualBookModal';
import { resolveProductCoatingCost } from '../utils/masterLookup';
import {
  applyMasterToWoodPart,
  applyMasterToPart,
  enrichNodeFromMaster,
  getWasteRatioForMaterialType,
  partNameFromMaterialFields,
  recalcPartBiayaForSfWf,
} from '../utils/masterLookup';
import {
  linkProjectToMasters,
  syncProductWoodToParts,
  enrichBomFromMasters,
} from '../utils/linkProjectToMasters';
import { useMasters } from '../hooks/useMasters';
import { VENDOR_SAMPLES } from '../data/masterSamples';
import { resolveNodeFoto } from '../utils/images';
import {
  expandProsesList,
  computePartDisplayFinancials,
  computeNodeDisplayFinancials,
  computePackingTotals,
  computeCogs,
  computeSummaryFromBom,
  computeMaterialTabTotals,
  computePartCostRow,
  collectProsesEntries,
  computeProsesSummary,
  flattenProsesLineItems,
  sumProsesLineItems,
  validatePartsForExport,
  buildNodeRollupMap,
} from '../services/bomCalculations';
import { normalizeProject, COGS_MODES, resolveCogsMode } from '../utils/emptyProject.js';
import { WoodGradeField, DatabaseMaterialField } from '../components/fields/MasterCombos.jsx';

function MaterialTypeField({ value, onChange, disabled = false }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full min-w-[120px] border border-emerald-200 rounded-lg px-2 py-1.5 text-[10px] font-bold bg-emerald-50/50 text-emerald-800 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 outline-none uppercase tracking-wide disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
    >
      <option value="">— Pilih —</option>
      {MATERIAL_TYPE_OPTIONS.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function SummaryTotalCards({ fp, totals }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Total Material</span>
        <p className="text-lg font-black text-emerald-800 mt-1">{fp(totals.material)}</p>
      </div>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Total Proses</span>
        <p className="text-lg font-black text-indigo-800 mt-1">{fp(totals.process)}</p>
      </div>
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
        <span className="text-[9px] font-bold text-brand-600 uppercase tracking-widest">Total Biaya Produksi</span>
        <p className="text-xl font-black text-brand-800 mt-1">{fp(totals.production)}</p>
      </div>
    </div>
  );
}

const HIERARCHY_COL_DEFS = [
  { key: 'modul', label: 'Modul' },
  { key: 'submodul', label: 'Submodul' },
  { key: 'submodul2', label: 'Submodul 2' },
];

function countHierarchyCols(cols) {
  return HIERARCHY_COL_DEFS.reduce((n, { key }) => n + (cols[key] ? 1 : 0), 0);
}

function HierarchyColToggles({ cols, onToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Kolom hierarki:</span>
      {HIERARCHY_COL_DEFS.map(({ key, label }) => {
        const visible = cols[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
              visible
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function HierarchyHeaderCells({
  cols,
  cellClass = 'px-4 py-3 border-r border-slate-100 text-left border-b border-slate-200 align-middle',
  singleRow = false,
}) {
  const span = singleRow ? {} : { rowSpan: 2 };
  return (
    <>
      {cols.modul && (
        <th {...span} className={`${cellClass} min-w-[140px]`}>MODUL</th>
      )}
      {cols.submodul && (
        <th {...span} className={`${cellClass} min-w-[140px]`}>SUBMODUL</th>
      )}
      {cols.submodul2 && (
        <th {...span} className={`${cellClass} min-w-[120px]`}>SUBMODUL 2</th>
      )}
    </>
  );
}

function HierarchyBodyCells({ cols, hierarchy, compact = false }) {
  const cls = compact
    ? 'px-3 py-2.5 border-r border-slate-100 text-left'
    : 'px-4 py-3 border-r border-slate-100 text-left';

  const cell = (node) => {
    if (!node?.nama) {
      return <span className="text-slate-300">—</span>;
    }
    return (
      <div
        className="font-bold text-slate-700 text-[11px] max-w-[160px] truncate"
        title={node.nama}
      >
        {node.nama}
      </div>
    );
  };

  return (
    <>
      {cols.modul && <td className={cls}>{cell(hierarchy.modul)}</td>}
      {cols.submodul && <td className={cls}>{cell(hierarchy.submodul)}</td>}
      {cols.submodul2 && <td className={cls}>{cell(hierarchy.submodul2)}</td>}
    </>
  );
}

function MaterialTotalCards({ fp, totals }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Total Material</span>
        <p className="text-xl font-black text-emerald-800 mt-1">{fp(totals.material)}</p>
        <p className="text-[9px] text-emerald-600/70 mt-0.5 font-medium">Termasuk SF &amp; WF</p>
      </div>
      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Material Dasar</span>
        <p className="text-lg font-black text-amber-800 mt-1">{fp(totals.materialBase)}</p>
        <p className="text-[9px] text-amber-600/70 mt-0.5 font-medium">Sebelum SF &amp; WF</p>
      </div>
      <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
        <span className="text-[9px] font-bold text-teal-600 uppercase tracking-widest">Jumlah Part</span>
        <p className="text-xl font-black text-teal-800 mt-1">{totals.partCount} <span className="text-sm font-bold">item</span></p>
        <p className="text-[9px] text-teal-600/70 mt-0.5 font-medium">{totals.totalQty} unit total qty</p>
      </div>
    </div>
  );
}

function ProsesTotalCards({ fp, totals, compact = false }) {
  const pad = compact ? 'px-3 py-2.5' : 'p-4';
  const labelCls = compact ? 'text-[8px]' : 'text-[9px]';
  const valueCls = compact ? 'text-base' : 'text-xl';
  const subCls = compact ? 'text-[8px] mt-0' : 'text-[9px] mt-0.5';
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 ${compact ? 'gap-2' : 'gap-4 sm:grid-cols-2'}`}>
      <div className={`rounded-xl border border-blue-100 bg-blue-50/50 ${pad}`}>
        <span className={`${labelCls} font-bold text-blue-600 uppercase tracking-widest`}>Durasi (Menit)</span>
        <p className={`${valueCls} font-black text-blue-800 ${compact ? 'mt-0.5 leading-tight' : 'mt-1'}`}>
          {totals.waktu} <span className="text-xs font-bold">menit</span>
        </p>
        {!compact && <p className={`${subCls} text-blue-600/70 font-medium`}>{totals.lineCount} baris operasi</p>}
      </div>
      <div className={`rounded-xl border border-indigo-100 bg-indigo-50/50 ${pad}`}>
        <span className={`${labelCls} font-bold text-indigo-600 uppercase tracking-widest`}>Biaya Proses</span>
        <p className={`${compact ? 'text-sm' : 'text-lg'} font-black text-indigo-800 ${compact ? 'mt-0.5' : 'mt-1'}`}>{fp(totals.mesin)}</p>
        {!compact && <p className={`${subCls} text-indigo-600/70 font-medium`}>Work center &amp; mesin</p>}
      </div>
      <div className={`rounded-xl border border-emerald-100 bg-emerald-50/50 ${pad}`}>
        <span className={`${labelCls} font-bold text-emerald-600 uppercase tracking-widest`}>Biaya Tenaga Kerja</span>
        <p className={`${compact ? 'text-sm' : 'text-lg'} font-black text-emerald-800 ${compact ? 'mt-0.5' : 'mt-1'}`}>{fp(totals.pekerja)}</p>
        {!compact && <p className={`${subCls} text-emerald-600/70 font-medium`}>{totals.personMinutes} org·menit</p>}
      </div>
      <div className={`rounded-xl border border-brand-200 bg-brand-50/50 ${pad}`}>
        <span className={`${labelCls} font-bold text-brand-600 uppercase tracking-widest`}>Total Biaya Proses</span>
        <p className={`${valueCls} font-black text-brand-800 ${compact ? 'mt-0.5 leading-tight' : 'mt-1'}`}>{fp(totals.total)}</p>
        {!compact && <p className={`${subCls} text-brand-600/70 font-medium`}>Biaya proses + tenaga kerja</p>}
      </div>
    </div>
  );
}

function VendorField({ value, onChange }) {
  const known = VENDOR_SAMPLES.includes(value);
  const selectValue = known ? value : value ? '__custom__' : '';

  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') onChange(value && !known ? value : '');
          else onChange(v);
        }}
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-white focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
      >
        <option value="">— Pilih vendor —</option>
        {VENDOR_SAMPLES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
        <option value="__custom__">Lainnya (ketik manual)</option>
      </select>
      {selectValue === '__custom__' && (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nama vendor..."
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none"
        />
      )}
    </div>
  );
}

const NodeCard = ({ data }) => {
  const [showProses, setShowProses] = useState(true);
  const style = tipeStyles[data.tipe] || tipeStyles.PART;
  const prosesList = useMemo(() => expandProsesList(data), [data]);
  const hasProses = prosesList.length > 0;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 ${style.cardBorder} ${showProses && hasProses ? 'w-[540px]' : 'w-72'}`}>
      <div className={`p-4 flex items-start gap-4 ${style.bgHead}`}>
        <div className="w-14 h-14 rounded-xl border border-white/50 bg-white/50 flex items-center justify-center text-slate-300 shrink-0 overflow-hidden shadow-sm backdrop-blur-sm p-0.5">
          <div className="w-full h-full rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
            {data.foto ? <img src={data.foto} alt="pic" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wide border bg-white shadow-sm ${style.pill}`}>{data.tipe}</div>
            {data.biaya > 0 && <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 shadow-sm">Rp{formatIDR(data.biaya)}</span>}
          </div>
          <h3 className="font-black text-slate-800 text-sm leading-tight truncate tracking-tight uppercase" title={data.nama}>{data.nama}</h3>
          <p className="text-[11px] text-slate-500 font-mono mt-1 font-bold">{data.kode}</p>
        </div>
      </div>
      {(data.p || data.vol > 0) && (
        <div className="bg-slate-50/80 border-t border-slate-100 px-4 py-2.5 flex gap-4 text-[11px] text-slate-600 font-bold">
          {data.p && <span className="flex items-center gap-1.5"><Layout className="w-3.5 h-3.5 text-slate-400"/> {data.p} x {data.l} x {data.t} mm</span>}
          {data.vol > 0 && <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-slate-400"/> {data.vol} m³</span>}
          {data.qty > 0 && <span className="ml-auto font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded shadow-inner">{data.qty}</span>}
        </div>
      )}
      
      {hasProses && (
        <>
          <div className="bg-white border-t border-slate-100 px-4 py-3 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setShowProses(!showProses)}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Wrench className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-[11px] font-black text-slate-700 tracking-wide">OPERASI MANUFAKTUR ({prosesList.length})</span>
            </div>
            <button className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
              {showProses ? 'SEMBUNYIKAN' : 'LIHAT DETAIL'}
              {showProses ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
          {showProses && (
            <div className="bg-slate-50/50 border-t border-slate-100 p-4 pt-2">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-[10px] whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-500 uppercase tracking-widest font-black border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 border-r border-slate-200 text-center w-12">Posisi</th>
                      <th className="px-3 py-2.5 border-r border-slate-200">Proses Utama</th>
                      <th className="px-3 py-2.5 border-r border-slate-200">Tipe Manufaktur</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 text-center">Area</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 text-center text-indigo-600">Durasi</th>
                      <th className="px-3 py-2.5 text-right text-emerald-600">Biaya Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prosesList.map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors group/row">
                        <td className="px-3 py-2 border-r border-slate-100 text-center">
                          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 mx-auto overflow-hidden flex items-center justify-center shadow-sm group-hover/row:border-blue-300 transition-colors p-0.5">
                            <div className="w-full h-full rounded bg-slate-100 overflow-hidden">
                              {p.gambar ? <img src={p.gambar} alt="posisi" className="w-full h-full object-cover" /> : <ImageIcon className="w-3 h-3 text-slate-300" />}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-slate-100 font-bold text-slate-800">
                          {p.nama}
                          {p.inputMode === 'routing' && (
                            <span className="ml-1.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                              RT{p.routingSteps?.length ? ` · ${p.routingSteps.length} WC` : ''}
                            </span>
                          )}
                          {p.inputMode === 'work_center' && p.workCenterId && (
                            <span className="ml-1.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">WC</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-100 font-bold text-slate-500">{p.mfgProcess || '-'}</td>
                        <td className="px-3 py-2 border-r border-slate-100 text-center">
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded text-[9px] font-black uppercase">{p.posisiOperasi || '-'}</span>
                        </td>
                        <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-indigo-600">
                          <span className="bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{p.waktuOperasi ? `${p.waktuOperasi} Min` : '-'}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-black text-emerald-600">
                          Rp {formatIDR(p.biaya ?? calcProsesCosts(p).total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const TreeNode = ({ node, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="flex flex-row items-start">
      <div className="relative z-10 flex items-start">
        {/* Connection Node Point (Left) */}
        {!isRoot && <div className="absolute left-[-8px] top-[36px] w-4 h-4 bg-white border-[3px] border-slate-400 rounded-full z-20 shadow-sm"></div>}
        
        <div className="relative">
          <NodeCard data={node} />
          
          {hasChildren && (
            <>
              {/* Connection Node Point (Right) */}
              <div className="absolute right-[-8px] top-[36px] w-4 h-4 bg-white border-[3px] border-slate-400 rounded-full z-20 shadow-sm"></div>
              
              <button onClick={() => setIsExpanded(!isExpanded)} className="absolute right-[-16px] top-[64px] w-8 h-8 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center shadow-lg text-slate-500 hover:text-blue-600 hover:border-blue-400 z-30 transition-all hover:scale-110">
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="flex items-start" style={{ marginTop: '36px' }}>
          {/* Horizontal Line out of the Parent */}
          <svg width="32" height="10" className="overflow-visible -translate-y-1/2">
            <path d="M 0 5 L 32 5" stroke="#94a3b8" strokeWidth="3" fill="none" />
          </svg>
        </div>
      )}
      {hasChildren && isExpanded && (
        <div className="flex flex-col relative">
          {node.children.map((child, index) => {
            const isFirst = index === 0;
            const isLast = index === node.children.length - 1;
            const isOnly = node.children.length === 1;
            return (
              <div key={child.id} className="flex flex-row items-start relative pl-8 py-5">
                {/* Vertical Line for children */}
                {!isOnly && <div className="absolute left-0 w-[3px] bg-slate-400" style={{ top: isFirst ? '36px' : '0', bottom: isLast ? 'calc(100% - 36px)' : '0' }}></div>}
                
                {/* Horizontal Line entering the Child */}
                <div className="absolute left-0 top-[36px] -translate-y-1/2">
                  <svg width="32" height="10" className="overflow-visible">
                    <path d="M 0 5 L 32 5" stroke="#94a3b8" strokeWidth="3" fill="none" />
                  </svg>
                </div>
                <TreeNode node={child} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2.5. KOMPONEN MODAL KALKULASI LENGKAP
// ==========================================

function applyProjectToStates(project, setters) {
  const p = normalizeProject(project);
  if (!p) return;
  setters.setBomData(p.bomData);
  setters.setProductInfo(p.productInfo);
  setters.setProductMeta(p.productMeta);
  setters.setDimensi(p.dimensi);
  setters.setPackingDimensions(p.packingDimensions);
  setters.setPackingSpec(p.packingSpec);
  setters.setContainerCapacity(p.containerCapacity);
  setters.setCogsConfig(p.cogsConfig);
  setters.setCustomErp(p.customErp ?? { parts: [], machines: [], workers: [] });
  if (setters.setExcelMirror) setters.setExcelMirror(p.excelMirror ?? null);
  if (setters.setImportedFromExcel) setters.setImportedFromExcel(!!p.importedFromExcel);
  if (setters.setCogsMode) setters.setCogsMode(resolveCogsMode(p));
}

const PRODUCT_PANEL_STORAGE_KEY = 'bomEditor.showProductPanel';

function readProductPanelPref() {
  try {
    const stored = sessionStorage.getItem(PRODUCT_PANEL_STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    /* private mode / SSR */
  }
  return false;
}

function persistProductPanelPref(value) {
  try {
    sessionStorage.setItem(PRODUCT_PANEL_STORAGE_KEY, String(value));
  } catch {
    /* ignore */
  }
}

export default function BOMEditor({
  onBack,
  projectId,
  initialProject,
  onSaveProject,
  kursUsd,
  setKursUsd,
  kursEur,
  setKursEur,
  fontCase,
  setFontCase,
}) {
  const safeProject = normalizeProject(initialProject) || initialProject;
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimerRef = useRef(null);

  const [bomData, setBomData] = useState(() => safeProject?.bomData);
  const [viewMode, setViewMode] = useState('table'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [routingNode, setRoutingNode] = useState(null);
  const [showKalkulasi, setShowKalkulasi] = useState(false);
  const [showMarkupPreview, setShowMarkupPreview] = useState(false);
  const [detailSummaryNode, setDetailSummaryNode] = useState(null);
  const [showProductPanel, setShowProductPanel] = useState(readProductPanelPref);
  const [productInlineExpanded, setProductInlineExpanded] = useState(false);
  const toggleProductPanel = useCallback(() => {
    setShowProductPanel((prev) => {
      const next = !prev;
      persistProductPanelPref(next);
      if (!next) setProductInlineExpanded(false);
      return next;
    });
  }, []);
  const [priceDisplay] = useState('IDR');
  const [showHiddenContainers, setShowHiddenContainers] = useState(false);
  const [showMasterWc, setShowMasterWc] = useState(false);
  const [showMasterMaterials, setShowMasterMaterials] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const { mastersReady, mastersTick, reloadMasters } = useMasters();

  const [editorTab, setEditorTab] = useState('struktur');
  const [materialHierarchyCols, setMaterialHierarchyCols] = useState({
    modul: true,
    submodul: true,
    submodul2: true,
  });
  const hierarchyColCount = countHierarchyCols(materialHierarchyCols);
  const summaryPartsOnly = hierarchyColCount > 0;
  const toggleHierarchyCol = useCallback(
    (key) => setMaterialHierarchyCols((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  // STATE BARU UNTUK CUSTOM ERP ENTRIES
  const [customErp, setCustomErp] = useState(
    () => safeProject?.customErp ?? { parts: [], machines: [], workers: [] },
  );
  const [excelMirror, setExcelMirror] = useState(() => safeProject?.excelMirror ?? null);
  const [importedFromExcel, setImportedFromExcel] = useState(
    () => !!safeProject?.importedFromExcel,
  );
  const [cogsMode, setCogsMode] = useState(() => resolveCogsMode(safeProject));

  const [cogsConfig, setCogsConfig] = useState(
    () =>
      initialProject?.cogsConfig ?? {
        packingJalur: 'BOX',
        factoryOhPct: EXCEL_FACTORY_OH_PCT,
        managementOhPct: 2.5,
        markupPct: 20,
      },
  );
  const [cogsConfigOpen, setCogsConfigOpen] = useState(true);
  const [showCogsInsightModal, setShowCogsInsightModal] = useState(false);
  const [showExcelChecklistModal, setShowExcelChecklistModal] = useState(false);

  const [productMeta, setProductMeta] = useState(
    () =>
      initialProject?.productMeta ?? {
        itemType: ELBA_CHAIR_REFERENCE.itemType,
        wood: ELBA_CHAIR_REFERENCE.wood,
        coating: ELBA_CHAIR_REFERENCE.coating,
      },
  );

  const [packingSpec, setPackingSpec] = useState(() => safeProject?.packingSpec);

  const [productInfo, setProductInfo] = useState(
    () =>
      initialProject?.productInfo ?? {
        kode: ELBA_CHAIR_REFERENCE.kode,
        nama: ELBA_CHAIR_REFERENCE.nama,
        varian: 'NLH',
        customer: ELBA_CHAIR_REFERENCE.customer,
        kodeBom: ELBA_CHAIR_REFERENCE.kodeBom,
        namaBom: ELBA_CHAIR_REFERENCE.namaBom,
        versi: ELBA_CHAIR_REFERENCE.versi,
      },
  );
  
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const [dimensi, setDimensi] = useState(
    () => initialProject?.dimensi ?? { ...ELBA_CHAIR_REFERENCE.dimensi },
  );

  const [packingDimensions, setPackingDimensions] = useState(
    () =>
      initialProject?.packingDimensions ?? [
        { id: 1, type: 'BOX KARTON', tolW: 40, tolD: 40, tolH: 50 },
        { id: 2, type: 'SINGLE FACE', tolW: 10, tolD: 10, tolH: 20, chairFactor: true },
      ],
  );

  const [containerCapacity, setContainerCapacity] = useState(
    () => initialProject?.containerCapacity ?? buildDefaultContainerRows(),
  );

  const hydratedProjectIdRef = useRef(null);

  useEffect(() => {
    if (!initialProject || !mastersReady) return;

    if (hydratedProjectIdRef.current === projectId) {
      setBomData((prev) =>
        enrichBomFromMasters(prev, { productMeta, productInfo }, { applyBiaya: false }),
      );
      return;
    }

    const linked = linkProjectToMasters(initialProject, { applyBiaya: true });
    applyProjectToStates(linked, {
      setBomData,
      setProductInfo,
      setProductMeta,
      setDimensi,
      setPackingDimensions,
      setPackingSpec,
      setContainerCapacity,
      setCogsConfig,
      setCustomErp,
      setExcelMirror,
      setImportedFromExcel,
    });
    hydratedProjectIdRef.current = projectId;
    setSaveStatus('saved');
  }, [projectId, initialProject, mastersReady, mastersTick]);

  useEffect(() => {
    const nama = productInfo.namaBom || productInfo.nama;
    if (!productInfo.kode && !nama) return;
    setBomData((prev) => {
      if (!prev || prev.tipe !== 'MODUL') return prev;
      return {
        ...prev,
        kode: productInfo.kode || prev.kode,
        nama: nama || prev.nama,
      };
    });
  }, [productInfo.kode, productInfo.nama, productInfo.namaBom]);

  const packingBoxItem = useMemo(
    () => findPackingByType(packingDimensions, 'box') || packingDimensions[0],
    [packingDimensions]
  );
  const packingSFItem = useMemo(
    () => findPackingByType(packingDimensions, 'single') || packingDimensions[1],
    [packingDimensions]
  );
  const packingVolOpts = useMemo(
    () => ({ itemType: productMeta.itemType }),
    [productMeta.itemType]
  );
  const volBoxPacking = useMemo(
    () => calcPackingVolume(dimensi, packingBoxItem, packingVolOpts),
    [dimensi, packingBoxItem, packingVolOpts]
  );
  const volSFPacking = useMemo(
    () => calcPackingVolume(dimensi, packingSFItem, packingVolOpts),
    [dimensi, packingSFItem, packingVolOpts]
  );

  useEffect(() => {
    setContainerCapacity((prev) => {
      if (!prev.length) return prev;
      return prev.map((row, index) => {
        const preset = CONTAINER_PRESETS[index];
        if (!preset) return row;
        const caps = calcContainerNetCapacity(preset, volBoxPacking, volSFPacking);
        return { ...row, netCapBox: caps.netCapBox, netCapSF: caps.netCapSF };
      });
    });
  }, [volBoxPacking, volSFPacking]);

  const updateDimensi = (field, value) => {
    setDimensi(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  // HANDLER CUSTOM ERP
  const handleAddCustomErp = (type) => {
    setCustomErp(prev => {
      const newItem = { id: Date.now().toString(), nama: '', qty: 1, rate: 0 };
      if (type === 'machines') newItem.waktu = 0;
      if (type === 'workers') { newItem.waktu = 0; newItem.person = 1; }
      return { ...prev, [type]: [...prev[type], newItem] };
    });
  };

  const handleUpdateCustomErp = (type, id, field, value) => {
    setCustomErp(prev => ({
      ...prev,
      [type]: prev[type].map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleDeleteCustomErp = (type, id) => {
    setCustomErp(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  const handleProductInfoChange = (field, value) => {
    setProductInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleProductMetaChange = (field, value) => {
    setProductMeta((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductWoodGrade = (gradeId, mat) => {
    setProductMeta((prev) => ({
      ...prev,
      woodGradeId: gradeId || '',
      wood: mat?.specification || mat?.woodName || prev.wood,
    }));
    if (gradeId) {
      setBomData((prev) => syncProductWoodToParts(prev, gradeId, { applyBiaya: false }));
    }
  };

  const handleProductCoating = ({ coatingId, coating }) => {
    setProductMeta((prev) => ({
      ...prev,
      coatingId: coatingId || '',
      coating: coating || prev.coating,
    }));
  };

  const handleApplyWoodMasterToAllParts = () => {
    const gradeId = productMeta.woodGradeId || '';
    if (!gradeId) return;
    if (cogsMode === COGS_MODES.EXCEL_FIXED) {
      const ok = window.confirm(
        'Mode Excel Fixed: hitung ulang dari master akan mengubah biaya part kayu dan beralih ke Live Master. Lanjutkan?',
      );
      if (!ok) return;
      setCogsMode(COGS_MODES.LIVE_MASTER);
      const clearExcelFlags = (node) => {
        if (node.tipe === 'PART' && node.biayaFromExcel) {
          node.biayaFromExcel = false;
        }
        (node.children || []).forEach(clearExcelFlags);
      };
      setBomData((prev) => {
        const next = structuredClone(prev);
        clearExcelFlags(next);
        return syncProductWoodToParts(next, gradeId, { applyBiaya: true });
      });
      return;
    }
    setBomData((prev) => syncProductWoodToParts(prev, gradeId, { applyBiaya: true }));
  };

  const handleSyncBomFromMasters = () => {
    setBomData((prev) =>
      enrichBomFromMasters(prev, { productMeta, productInfo }, { applyBiaya: false }),
    );
  };

  const handleStructureWoodSelect = (nodeId, gradeId, mat, manualSpec, modeHint) => {
    const updateTree = (node) => {
      if (node.id === nodeId) {
        const manualText = String(manualSpec ?? '').trim();
        const forceManual = modeHint?.sourceMode === 'manual';
        if ((forceManual || manualText) && !gradeId && !mat) {
          return {
            ...node,
            woodGradeId: '',
            woodSpecification: String(manualSpec ?? ''),
            materialType: node.materialType || 'kayu',
            materialSourceMode: 'manual',
            ...(node.tipe === 'PART' && manualText ? { nama: manualText } : {}),
          };
        }
        if (!gradeId && !mat) {
          return {
            ...node,
            woodGradeId: '',
            woodSpecification: '',
            materialSourceMode: 'database',
          };
        }
        const ratio = getWasteRatioForMaterialType(mat?.materialType || 'kayu');
        let updated = {
          ...node,
          woodGradeId: gradeId || '',
          woodSpecification: mat?.specification || '',
          materialType: node.materialType || (gradeId ? (mat?.materialType || 'kayu') : node.materialType || ''),
          materialSourceMode: 'database',
        };
        if (gradeId) {
          updated.sf = updated.sf ?? ratio.sf;
          updated.wf = updated.wf ?? ratio.wf;
        }
        if (node.tipe === 'PART' && gradeId) {
          updated = applyMasterToWoodPart(updated, gradeId);
        }
        return updated;
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    setBomData((prev) => updateTree(prev));
    if (gradeId && mat?.specification && !productMeta.woodGradeId) {
      setProductMeta((prev) => ({
        ...prev,
        woodGradeId: gradeId,
        wood: mat.specification,
      }));
    }
  };

  const partMaterialSection = (d) => {
    const mt = String(d.materialType || '').toLowerCase();
    if (mt === 'plywood') return 'PLYWOOD';
    if (mt === 'veneer') return d.materialSection || 'VENEER';
    if (mt === 'komponen') return d.materialSection || 'MDF';
    return d.materialSection || '';
  };

  const handleStructureMaterialType = (nodeId, materialType) => {
    const updateTree = (node) => {
      if (node.id === nodeId) {
        const updated = { ...node, materialType };
        if (materialType !== 'kayu') {
          updated.woodGradeId = '';
          updated.woodSpecification = '';
        }
        if (materialType === 'kayu') {
          updated.materialMasterId = '';
          updated.materialSpecification = '';
        } else if (materialType === 'plywood') {
          updated.materialSection = 'PLYWOOD';
          updated.woodGradeId = '';
          updated.woodSpecification = '';
        } else if (materialType === 'veneer') {
          updated.materialSection = updated.materialSection || 'VENEER';
          updated.woodGradeId = '';
          updated.woodSpecification = '';
        } else if (materialType === 'komponen') {
          updated.materialSection = updated.materialSection || 'MDF';
        } else {
          updated.materialMasterId = '';
          updated.materialSpecification = '';
          updated.materialSection = '';
        }
        return updated;
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    setBomData((prev) => updateTree(prev));
  };

  const volProduk = ((dimensi.w * dimensi.d * dimensi.h) / 1000000000).toFixed(6);

  const packingTotals = useMemo(() => computePackingTotals(packingSpec), [packingSpec]);
  const { packBoxMat, packBoxLab, packSfMat, packSfLab } = packingTotals;

  // HANDLER DIMENSI PACKING DINAMIS
  const handleAddPackingDim = () => {
    setPackingDimensions([...packingDimensions, { id: Date.now(), type: 'CUSTOM PACKING', tolW: 0, tolD: 0, tolH: 0 }]);
  };
  const handleUpdatePackingDim = (id, field, value) => {
    setPackingDimensions(packingDimensions.map(p => p.id === id ? { ...p, [field]: field === 'type' ? value : (Number(value) || 0) } : p));
  };
  const handleDeletePackingDim = (id) => {
    setPackingDimensions(packingDimensions.filter(p => p.id !== id));
  };
  // Fungsi untuk mengupdate state kapasitas kontainer
  const toggleContainerHidden = (index) => {
    setContainerCapacity((prev) =>
      prev.map((row, i) => (i === index ? { ...row, hidden: !row.hidden } : row))
    );
  };

  const handleContainerCapacityChange = (index, field, value) => {
    const isPresetRow = index < CONTAINER_PRESETS.length;
    if (isPresetRow && (field === 'netCapBox' || field === 'netCapSF')) return;
    const updatedData = [...containerCapacity];
    updatedData[index][field] = field === 'type' ? value : (Number(value) || 0);
    
    if(field.includes('matCost') || field.includes('routCost') || field.includes('mgtOv')) {
       const boxType = field.includes('Box') ? 'Box' : 'SF';
       updatedData[index][`total${boxType}`] = 
         (updatedData[index][`matCost${boxType}`] || 0) + 
         (updatedData[index][`routCost${boxType}`] || 0) + 
         (updatedData[index][`mgtOv${boxType}`] || 0);
    }
    
    setContainerCapacity(updatedData);
  }

  const handleAddContainer = () => {
    setContainerCapacity([...containerCapacity, {
      type: 'NEW CONTAINER',
      netCapBox: 0,
      netCapSF: 0,
      matCostBox: 0,
      matCostSF: 0,
      routCostBox: 0,
      routCostSF: 0,
      mgtOvBox: 0,
      mgtOvSF: 0,
      totalBox: 0,
      totalSF: 0,
      hidden: false,
    }]);
  };

  const handleDeleteContainer = (indexToRemove) => {
    if (indexToRemove < CONTAINER_PRESETS.length) return;
    setContainerCapacity(containerCapacity.filter((_, index) => index !== indexToRemove));
  };

  // HANDLER UNTUK PACKING SPECIFICATION (TAMBAH, EDIT, HAPUS)
  const handleAddPackingSpec = (type) => {
    const isMaterial = type.includes('materials');
    const newItem = isMaterial 
      ? { id: Date.now(), nama: '', qty: 1, unit: 'Pcs', harga: 0 }
      : { id: Date.now(), nama: '', waktu: 1, pekerja: 1, rate: 500 };
    setPackingSpec(prev => ({ ...prev, [type]: [...prev[type], newItem] }));
  };

  const handleUpdatePackingSpec = (type, id, field, value) => {
    setPackingSpec(prev => ({
      ...prev,
      [type]: prev[type].map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleDeletePackingSpec = (type, id) => {
    setPackingSpec(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  const handleAddNode = (parentId, tipe) => {
    const newNode = {
      id: Date.now().toString(),
      no: Math.floor(Math.random() * 100) + 15,
      nama: `NEW ${tipe}`,
      kode: `ITEM-${Math.floor(Math.random() * 10000)}`,
      tipe: tipe,
      qty: 1,
      unit: 'EA',
      p: 0, l: 0, t: 0, vol: 0, biaya: 0, catatan: '', proses_count: 0, foto: '',
      vendor: '', sf: 0, wf: 0,
      ...(tipe === 'PART' ? { materialType: '' } : {}),
      children: []
    };

    const addNode = (tree) => {
      if (tree.id === parentId) {
        return { ...tree, children: [...(tree.children || []), newNode] };
      }
      if (tree.children) {
        return { ...tree, children: tree.children.map(addNode) };
      }
      return tree;
    };

    setBomData(prev => addNode(prev));
  };

  const handleDeleteNode = (idToDelete) => {
    if (bomData.id === idToDelete) return; 
    const deleteNode = (tree) => {
      if (tree.children) {
        return { ...tree, children: tree.children.filter(c => c.id !== idToDelete).map(deleteNode) };
      }
      return tree;
    };
    setBomData(prev => deleteNode(prev));
  };

  // HANDLER EDIT NODE SECARA INLINE
  const resolvePartSourceMode = (d) => {
    if (d.materialSourceMode === 'manual' || d.materialSourceMode === 'database') {
      return d.materialSourceMode;
    }
    if (d.woodGradeId || d.materialMasterId) return 'database';
    if (d.woodSpecification || d.materialSpecification) return 'manual';
    return 'database';
  };

  const handleWoodGradeSelect = (nodeId, gradeId) => {
    const updateTree = (node) => {
      if (node.id === nodeId) {
        return applyMasterToWoodPart(
          { ...node, woodGradeId: gradeId, materialSourceMode: 'database' },
          gradeId,
        );
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    setBomData((prev) => updateTree(prev));
  };

  const handlePartWoodField = (nodeId, gradeId, mat, manualSpec, modeHint) => {
    if (gradeId && mat) {
      handleWoodGradeSelect(nodeId, gradeId);
      return;
    }
    const updateTree = (node) => {
      if (node.id === nodeId) {
        const manualText = String(manualSpec ?? '').trim();
        const forceManual = modeHint?.sourceMode === 'manual';
        if ((forceManual || manualText) && !gradeId) {
          return {
            ...node,
            woodGradeId: '',
            woodSpecification: String(manualSpec ?? ''),
            materialSourceMode: 'manual',
            ...(manualText ? { nama: manualText } : {}),
          };
        }
        return { ...node, woodGradeId: '', woodSpecification: '', materialSourceMode: 'database' };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    setBomData((prev) => updateTree(prev));
  };

  const handlePartMaterialField = (nodeId, masterId, mat, manualSpec, modeHint) => {
    const updateTree = (node) => {
      if (node.id === nodeId) {
        const manualText = String(manualSpec ?? '').trim();
        const forceManual = modeHint?.sourceMode === 'manual';
        if ((forceManual || manualText) && !masterId) {
          return {
            ...node,
            materialMasterId: '',
            materialSpecification: String(manualSpec ?? ''),
            materialSourceMode: 'manual',
            ...(manualText ? { nama: manualText } : {}),
          };
        }
        if (!masterId && !mat) {
          return {
            ...node,
            materialMasterId: '',
            materialSpecification: '',
            materialSourceMode: 'database',
          };
        }
        if (masterId && mat) {
          let updated = {
            ...node,
            materialMasterId: masterId,
            materialSpecification: mat.specification || '',
            materialType: mat.materialType || node.materialType,
            materialSection: mat.section || node.materialSection,
            materialSourceMode: 'database',
          };
          if (node.tipe === 'PART') {
            updated = applyMasterToPart(updated, masterId);
          }
          return updated;
        }
        return node;
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    setBomData((prev) => updateTree(prev));
  };

  const handlePartMaterialSection = (nodeId, section) => {
    const updateTree = (node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          materialSection: section,
          materialMasterId: '',
          materialSpecification: '',
        };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    setBomData((prev) => updateTree(prev));
  };

  const handleUpdateNode = (id, field, value) => {
    const updateTree = (node) => {
      if (node.id === id) {
        let updatedNode = { ...node, [field]: value };
        if (field === 'sf' || field === 'wf') {
          const parsed = value === '' ? '' : Number(value);
          if (parsed !== '' && Number.isNaN(parsed)) return node;
          const sf = field === 'sf' ? parsed : updatedNode.sf;
          const wf = field === 'wf' ? parsed : updatedNode.wf;
          updatedNode = {
            ...updatedNode,
            [field]: parsed,
            sfWfManual: true,
          };
          if (updatedNode.tipe === 'PART') {
            const recalc = recalcPartBiayaForSfWf({
              ...updatedNode,
              sf: sf === '' ? 0 : Number(sf) || 0,
              wf: wf === '' ? 0 : Number(wf) || 0,
            });
            updatedNode = {
              ...updatedNode,
              sf: recalc.sf,
              wf: recalc.wf,
              biaya: recalc.biaya,
              wasteIncludedInBiaya: recalc.wasteIncludedInBiaya,
              masterWasteSfPct: recalc.sf,
              masterWasteWfPct: recalc.wf,
            };
          }
          return updatedNode;
        }
        if (field === 'p' || field === 'l' || field === 't') {
          const w = field === 'p' ? value : (updatedNode.p || 0);
          const d = field === 'l' ? value : (updatedNode.l || 0);
          const h = field === 't' ? value : (updatedNode.t || 0);
          updatedNode.vol = Number(((w * d * h) / 1000000000).toFixed(6));
          if (updatedNode.woodGradeId && updatedNode.tipe === 'PART') {
            updatedNode = applyMasterToWoodPart(updatedNode, updatedNode.woodGradeId);
          } else if (updatedNode.materialMasterId && updatedNode.tipe === 'PART') {
            updatedNode = applyMasterToPart(updatedNode, updatedNode.materialMasterId);
          }
        }
        if (field === 'qty' && updatedNode.materialMasterId && updatedNode.tipe === 'PART') {
          updatedNode = applyMasterToPart(updatedNode, updatedNode.materialMasterId);
        }
        if (field === 'nama' || field === 'kode') {
          updatedNode = enrichNodeFromMaster(updatedNode, { productInfo, productMeta });
          if (updatedNode.woodGradeId && updatedNode.tipe === 'PART' && updatedNode.vol) {
            updatedNode = applyMasterToWoodPart(updatedNode, updatedNode.woodGradeId);
          } else if (updatedNode.materialMasterId && updatedNode.tipe === 'PART') {
            updatedNode = applyMasterToPart(updatedNode, updatedNode.materialMasterId);
          }
        }
        return updatedNode;
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    setBomData((prev) => updateTree(prev));

    if (id === bomData.id && field === 'kode') {
      setProductInfo((pi) => ({ ...pi, kode: value }));
    }
    if (id === bomData.id && field === 'nama') {
      setProductInfo((pi) => ({ ...pi, namaBom: value, nama: value }));
    }
  };

  const handleSaveRouting = (nodeId, prosesList) => {
    const updateTree = (node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          proses: prosesList,
          proses_count: prosesList.length,
        };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateTree) };
      }
      return node;
    };
    setBomData((prev) => updateTree(prev));
  };

  const handleMouseDownCanvas = (e) => {
    if (viewMode === 'table') return;
    if (e.target === containerRef.current) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning && viewMode === 'graph') {
      setPan(prev => ({ x: prev.x + (e.clientX - lastMousePos.x), y: prev.y + (e.clientY - lastMousePos.y) }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const zoomIn = () => setScale(s => Math.min(s + 0.1, 2));
  const zoomOut = () => setScale(s => Math.max(s - 0.1, 0.3));
  const resetZoom = () => { setScale(1); setPan({ x: 50, y: 50 }); };

  // INLINE RENDER TABLE VIEW AGAR KURSOR TIDAK HILANG FOKUS
  const flatNodes = useMemo(() => flattenTree(bomData), [bomData]);
  const materialParts = useMemo(
    () => flatNodes.filter((n) => n.data.tipe === 'PART'),
    [flatNodes],
  );
  const materialTableColSpan = 22 + hierarchyColCount;

  const nodeRollupMap = useMemo(() => buildNodeRollupMap(bomData), [bomData]);

  const summaryTableNodes = useMemo(
    () =>
      summaryPartsOnly ? flatNodes.filter((n) => n.data.tipe === 'PART') : flatNodes,
    [flatNodes, summaryPartsOnly],
  );

  const summaryData = useMemo(
    () => computeSummaryFromBom(bomData, flatNodes),
    [bomData, flatNodes],
  );

  const prosesTypeLabel = (p) => {
    if (p.proses) return getProsesById(p.proses).label;
    return p.mfgProcess || '—';
  };

  const allProses = useMemo(() => collectProsesEntries(flatNodes), [flatNodes]);

  const prosesLineItems = useMemo(() => flattenProsesLineItems(allProses), [allProses]);
  const prosesLineTotals = useMemo(() => sumProsesLineItems(prosesLineItems), [prosesLineItems]);

  const partQtyByKode = useMemo(() => {
    const m = {};
    flatNodes
      .filter((n) => n.data.tipe === 'PART')
      .forEach((n) => {
        m[n.data.kode] = Number(n.data.qty) || 1;
      });
    return m;
  }, [flatNodes]);

  const prosesSummary = useMemo(() => computeProsesSummary(allProses), [allProses]);

  const coatingPreview = useMemo(
    () => resolveProductCoatingCost(bomData, productMeta),
    [bomData, productMeta],
  );

  const cogsData = useMemo(
    () =>
      computeCogs({
        bomData,
        cogsConfig,
        packingTotals,
        productMeta,
        packingVolumeM3: volBoxPacking,
      }),
    [bomData, cogsConfig, packingTotals, productMeta, volBoxPacking],
  );

  const cogsInsightSampleKey = CURATED_SAMPLE_KEYS.has(productInfo.kode)
    ? productInfo.kode
    : null;

  const cogsInsight = useMemo(
    () =>
      buildCogsInsight({
        bomData,
        cogsConfig,
        packingTotals,
        productMeta,
        excelMirror,
        importedFromExcel,
        cogsMode,
        cogsData,
        sampleKey: cogsInsightSampleKey,
      }),
    [
      bomData,
      cogsConfig,
      packingTotals,
      productMeta,
      excelMirror,
      importedFromExcel,
      cogsMode,
      cogsData,
      cogsInsightSampleKey,
    ],
  );

  const excelParityAudit = useMemo(
    () =>
      auditExcelParity({
        bomData,
        productMeta,
        productInfo,
        dimensi,
        packingSpec,
        packingDimensions,
        cogsConfig,
        cogsData,
        excelMirror,
        importedFromExcel,
        kursUsd,
        kursEur,
        mastersReady,
      }),
    [
      bomData,
      productMeta,
      productInfo,
      dimensi,
      packingSpec,
      packingDimensions,
      cogsConfig,
      cogsData,
      excelMirror,
      importedFromExcel,
      kursUsd,
      kursEur,
      mastersReady,
    ],
  );

  const summaryTotals = useMemo(() => {
    const s = computeSummaryFromBom(bomData, flatNodes);
    return { material: s.material, process: s.process, production: s.production };
  }, [bomData, flatNodes]);

  const materialTabTotals = useMemo(
    () => computeMaterialTabTotals(flatNodes),
    [flatNodes],
  );

  const prosesTabTotals = useMemo(
    () => ({
      ...prosesLineTotals,
      lineCount: prosesLineItems.length,
    }),
    [prosesLineTotals, prosesLineItems.length],
  );

  const buildProjectDocument = useCallback(
    () => ({
      schemaVersion: 1,
      id: projectId,
      kode: productInfo.kode,
      nama: productInfo.namaBom || productInfo.nama,
      customer: productInfo.customer,
      versi: productInfo.versi,
      status: initialProject?.status ?? 'draft',
      createdAt: initialProject?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: initialProject?.createdBy ?? 'Admin',
      productInfo,
      productMeta,
      dimensi,
      bomData,
      packingDimensions,
      packingSpec,
      containerCapacity,
      cogsConfig,
      kursUsd,
      kursEur,
      customErp,
      excelMirror,
      importSheets: initialProject?.importSheets ?? [],
      importedFromExcel,
      cogsMode,
      cachedHpp: cogsData.totalCogs,
    }),
    [
      projectId,
      productInfo,
      productMeta,
      dimensi,
      bomData,
      packingDimensions,
      packingSpec,
      containerCapacity,
      cogsConfig,
      kursUsd,
      kursEur,
      customErp,
      excelMirror,
      importedFromExcel,
      cogsMode,
      cogsData.totalCogs,
      initialProject,
    ],
  );

  const persistProject = useCallback(async () => {
    if (!onSaveProject) return;
    setSaveStatus('saving');
    try {
      await onSaveProject(buildProjectDocument());
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [onSaveProject, buildProjectDocument]);

  const handleSaveNow = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    persistProject();
  };

  useEffect(() => {
    if (!onSaveProject || !projectId) return undefined;
    setSaveStatus('dirty');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistProject();
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    bomData,
    productInfo,
    productMeta,
    dimensi,
    packingDimensions,
    packingSpec,
    containerCapacity,
    cogsConfig,
    customErp,
    kursUsd,
    kursEur,
    onSaveProject,
    projectId,
    persistProject,
  ]);

  const buildExportPayload = () =>
    buildBomExportPayload({
      productInfo,
      productMeta,
      productImage: resolveNodeFoto(bomData),
      dimensi,
      bomData,
      flatNodes,
      cogsData,
      cogsConfig,
      kursUsd,
      kursEur,
      volBoxPacking,
      volSFPacking,
      summaryTotals,
      materialTabTotals,
      prosesTabTotals,
      packingDimensions,
      packingSpec,
      containerCapacity,
      customErp,
    });

  const runExport = (fn) => {
    const errors = validatePartsForExport(flatNodes);
    if (errors.length) {
      window.alert(`Export dibatalkan:\n\n${errors.slice(0, 8).join('\n')}${errors.length > 8 ? `\n…+${errors.length - 8} lainnya` : ''}`);
      return;
    }
    fn(buildExportPayload());
  };

  const handleExportExcel = () => runExport(exportBomToExcel);
  const handleExportPdf = () => runExport(exportBomToPdf);
  const handleExportPdfFull = () => runExport(exportBomToPdfFull);

  const fp = (value) => formatPrice(value, priceDisplay, kursUsd, kursEur);

  const inputClasses = "w-full bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded px-2 py-1.5 outline-none transition-all [&::-webkit-inner-spin-button]:appearance-none";

  const renderTableView = () => {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 border-t border-slate-200 overflow-hidden relative">
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-white relative">
          <div className="min-w-max pb-10">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr>
                  <th colSpan={5} className="sticky left-0 z-20 bg-slate-50 border-b-[3px] border-b-slate-300 text-center py-3 px-2 text-[10px] text-slate-600 font-bold uppercase tracking-wider border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">KOMPONEN, IDENTITAS & AKSI</th>
                  <th colSpan={3} className="border-b-[3px] border-b-slate-200 text-center py-3 px-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-r border-slate-200 bg-slate-50/50">DETAIL LAINNYA</th>
                  <th colSpan={4} className="border-b-[3px] border-b-blue-500 text-center py-2 px-1 text-[10px] text-blue-700 font-bold uppercase tracking-wider border-r border-slate-200 bg-blue-50/30">SPESIFIKASI FISIK (DIMENSI & VOL)</th>
                  <th colSpan={3} className="border-b-[3px] border-b-amber-400 text-center py-2 px-1 text-[10px] text-amber-700 font-bold uppercase tracking-wider border-r border-slate-200 bg-amber-50/30">HARGA MATERIAL (SATUAN)</th>
                  <th colSpan={3} className="border-b-[3px] border-b-indigo-400 text-center py-2 px-1 text-[10px] text-indigo-700 font-bold uppercase tracking-wider border-r border-slate-200 bg-indigo-50/30">BIAYA PRODUKSI (TOTAL)</th>
                  <th colSpan={3} className="border-b-[3px] border-b-violet-400 text-center py-2 px-1 text-[10px] text-violet-700 font-bold uppercase tracking-wider border-r border-slate-200 bg-violet-50/30">HARGA PRODUKSI (SATUAN)</th>
                  <th colSpan={1} className="border-b-[3px] border-b-slate-200 text-center py-3 px-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-r border-slate-200 bg-slate-50/50">MANUFAKTUR</th>
                  <th colSpan={1} className="border-b-[3px] border-b-slate-200 text-center py-3 px-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">LAIN-LAIN</th>
                </tr>
                <tr className="bg-white text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="sticky left-0 z-20 bg-white py-3 px-4 border-r border-slate-200 text-center" style={{ minWidth: 50, width: 50 }}>NO</th>
                  <th className="sticky left-[50px] z-20 bg-white py-3 px-4 border-r border-slate-200 text-left" style={{ minWidth: 260, width: 260 }}>AKSI (TAMBAH / HAPUS)</th>
                  <th className="sticky left-[310px] z-20 bg-white py-3 px-4 border-r border-slate-200" style={{ minWidth: 150, width: 150 }}>HIERARKI (TIPE)</th>
                  <th className="sticky left-[460px] z-20 bg-white py-3 px-4 border-r border-slate-200" style={{ minWidth: 140, width: 140 }}>KODE MATERIAL</th>
                  <th className="sticky left-[600px] z-20 bg-white py-3 px-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200" style={{ minWidth: 280, width: 280 }}>NAMA KOMPONEN / GRADE</th>
                  
                  <th className="py-3 px-4 text-center w-20">GAMBAR</th>
                  <th className="py-3 px-4 text-center min-w-[130px] text-emerald-700">TIPE MATERIAL</th>
                  <th className="py-3 px-4 border-r border-slate-200 text-center">QTY</th>
                  <th className="py-2 px-1.5 text-center w-[4.25rem]">Width (MM)</th>
                  <th className="py-2 px-1.5 text-center w-[4.25rem]">Depth (MM)</th>
                  <th className="py-2 px-1.5 text-center w-[4.25rem]">Height (MM)</th>
                  <th className="py-2 px-1.5 border-r border-slate-200 text-center text-blue-600 w-[4.75rem]">VOLUME (M³)</th>
                  <th className="py-2 px-1.5 text-right text-amber-700 w-[5.5rem]">MAT (IDR)</th>
                  <th className="py-2 px-1.5 text-right text-amber-600 w-[4.5rem]">MAT (USD)</th>
                  <th className="py-2 px-1.5 border-r border-slate-200 text-right text-amber-600 w-[4.5rem]">MAT (EUR)</th>
                  <th className="py-2 px-1.5 text-right text-indigo-600 min-w-[6.5rem]">PROD (IDR)</th>
                  <th className="py-2 px-1.5 text-right text-indigo-600 w-[4.5rem]">PROD (USD)</th>
                  <th className="py-2 px-1.5 border-r border-slate-200 text-right text-indigo-600 w-[4.5rem]">PROD (EUR)</th>
                  <th className="py-2 px-1.5 text-right text-violet-700 min-w-[6.5rem]">PROD/U (IDR)</th>
                  <th className="py-2 px-1.5 text-right text-violet-600 w-[4.5rem]">PROD/U (USD)</th>
                  <th className="py-2 px-1.5 border-r border-slate-200 text-right text-violet-600 w-[4.5rem]">PROD/U (EUR)</th>
                  <th className="py-2 px-1.5 border-r border-slate-200">PENGATURAN PROSES LENGKAP</th>
                  <th className="py-2 px-1.5 min-w-[200px]">CATATAN</th>
                </tr>
              </thead>
              <tbody>
                {flatNodes.map((node) => {
                  const d = node.data;
                  const fin = computeNodeDisplayFinancials(
                    d,
                    nodeRollupMap.get(node.id),
                    kursUsd,
                    kursEur,
                  );
                  const hargaProduksiIDR = fin?.prodTotal ?? 0;
                  const { usdMat = '0.00', eurMat = '0.00', usdProd = '0.00', eurProd = '0.00', prodUnit = 0, usdProdUnit = '0.00', eurProdUnit = '0.00' } = fin || {};
                  const isRollupRow = fin?.isRollup;

                  const style = tipeStyles[d.tipe] || tipeStyles.PART;

                  return (
                    <tr key={node.id} className="border-b border-slate-100 bg-white hover:bg-slate-50/70 transition-colors text-xs text-slate-700 group">
                      <td className="sticky left-0 z-10 bg-inherit py-3 px-4 text-center font-bold text-slate-400 border-r border-slate-100">{d.no}</td>
                      
                      {/* KOLOM AKSI */}
                      <td className="sticky left-[50px] z-10 bg-inherit py-2 px-4 border-r border-slate-100">
                        <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {d.tipe === 'MODUL' && (
                              <>
                                <button onClick={() => handleAddNode(d.id, 'SUBMODUL')} className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors shadow-sm" title="Tambah Submodul di bawah item ini">
                                  <Plus className="w-3 h-3" /> SUBMODUL
                                </button>
                                <button onClick={() => handleAddNode(d.id, 'PART')} className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors shadow-sm" title="Tambah Part di bawah item ini">
                                  <Plus className="w-3 h-3" /> PART
                                </button>
                              </>
                            )}
                            {d.tipe === 'SUBMODUL' && (
                              <>
                                <button onClick={() => handleAddNode(d.id, 'SUBMODUL 2')} className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors shadow-sm" title="Tambah Submodul 2 di bawah item ini">
                                  <Plus className="w-3 h-3" /> SUBMODUL 2
                                </button>
                                <button onClick={() => handleAddNode(d.id, 'PART')} className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors shadow-sm" title="Tambah Part di bawah item ini">
                                  <Plus className="w-3 h-3" /> PART
                                </button>
                              </>
                            )}
                            {d.tipe === 'SUBMODUL 2' && (
                              <>
                                <button onClick={() => handleAddNode(d.id, 'PART')} className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors shadow-sm" title="Tambah Part di bawah item ini">
                                  <Plus className="w-3 h-3" /> PART
                                </button>
                              </>
                            )}
                            {d.tipe === 'PART' && (
                              <span className="text-[10px] text-slate-400 italic px-2">Batas Hierarki</span>
                            )}
                          </div>
                          
                          {node.level > 0 && (
                            <button onClick={() => handleDeleteNode(d.id)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded border border-red-200 transition-colors shadow-sm" title="Hapus Item">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* KOLOM HIERARKI */}
                      <td className="sticky left-[310px] z-10 bg-inherit py-2 px-4 border-r border-slate-100">
                        <div className="flex items-center">
                          {Array.from({ length: node.level }).map((_, i) => (
                            <div key={i} className="w-6 h-10 border-l border-slate-300 ml-4 relative">
                              {i === node.level - 1 && <div className="absolute top-1/2 left-0 w-3 border-t border-slate-300"></div>}
                            </div>
                          ))}
                          <div className={`flex items-center gap-2 border rounded-md px-2.5 py-1 cursor-default shadow-sm bg-white ${style.pill}`}>
                            <ChevronDown className={`w-3.5 h-3.5 ${style.iconColor}`} />
                            <span className="font-bold text-[10px] tracking-wide">{d.tipe}</span>
                          </div>
                        </div>
                      </td>

                      <td className="sticky left-[460px] z-10 bg-inherit py-2 px-2 border-r border-slate-100">
                        <input type="text" value={d.kode} onChange={(e) => handleUpdateNode(node.id, 'kode', e.target.value)} className={`${inputClasses} font-mono text-slate-600 min-w-[120px]`} />
                      </td>
                      <td className="sticky left-[600px] z-10 bg-inherit py-2 px-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100">
                        <div className="flex flex-col gap-2 min-w-[250px]">
                          {d.tipe === 'PART' ? (
                            resolvePartSourceMode(d) !== 'manual' ? (
                              <span
                                className={`block text-xs font-bold leading-tight px-1 py-0.5 ${
                                  partNameFromMaterialFields(d)
                                    ? 'text-slate-800'
                                    : 'text-slate-400 italic'
                                }`}
                                title={partNameFromMaterialFields(d) || 'Nama dari material'}
                              >
                                {partNameFromMaterialFields(d) || '— Pilih material —'}
                              </span>
                            ) : null
                          ) : (
                            <input
                              type="text"
                              value={d.nama}
                              onChange={(e) => handleUpdateNode(node.id, 'nama', e.target.value)}
                              className={`${inputClasses} font-bold text-slate-800 w-full`}
                              placeholder={
                                d.tipe === 'MODUL' ? 'Nama produk / BOM…' : 'Nama komponen…'
                              }
                            />
                          )}
                          {d.tipe === 'PART' && (
                            d.materialType === 'kayu' ? (
                              <WoodGradeField
                                mastersTick={mastersTick}
                                compact
                                value={d.woodGradeId || ''}
                                manualSpec={d.woodSpecification || ''}
                                sourceMode={resolvePartSourceMode(d)}
                                onChange={(gradeId, mat, manualSpec, modeHint) =>
                                  handleStructureWoodSelect(node.id, gradeId, mat, manualSpec, modeHint)
                                }
                                className="min-w-0 w-full"
                              />
                            ) : (
                              <DatabaseMaterialField
                                mastersTick={mastersTick}
                                compact
                                showAll
                                materialType={d.materialType || ''}
                                value={d.materialMasterId || ''}
                                manualSpec={d.materialSpecification || ''}
                                sourceMode={resolvePartSourceMode(d)}
                                onChange={(masterId, mat, manualSpec, modeHint) =>
                                  handlePartMaterialField(node.id, masterId, mat, manualSpec, modeHint)
                                }
                                className="min-w-0 w-full"
                              />
                            )
                          )}
                        </div>
                      </td>
                      
                      {/* KOLOM LAINNYA SCROLLABLE */}
                      <td className="py-2 px-4 border-r border-slate-100 text-center">
                        <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center mx-auto shadow-sm">
                          {d.foto ? <img src={d.foto} alt="pic" className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                        </div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-100 text-center">
                        {d.tipe === 'PART' ? (
                          <MaterialTypeField
                            value={d.materialType || ''}
                            onChange={(val) => handleStructureMaterialType(node.id, val)}
                          />
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2 border-r border-slate-100 text-center">
                        <input type="number" value={d.qty} onChange={(e) => handleUpdateNode(node.id, 'qty', Number(e.target.value))} className={`${inputClasses} font-bold text-center w-16 text-slate-700`} />
                      </td>
                      <td className="py-2 px-1.5 text-center">
                         <input type="number" value={d.p || ''} onChange={(e) => handleUpdateNode(node.id, 'p', Number(e.target.value))} placeholder="-" className={`${inputClasses} text-center w-14 text-slate-600`} />
                      </td>
                      <td className="py-2 px-1.5 text-center">
                        <input type="number" value={d.l || ''} onChange={(e) => handleUpdateNode(node.id, 'l', Number(e.target.value))} placeholder="-" className={`${inputClasses} text-center w-14 text-slate-600`} />
                      </td>
                      <td className="py-2 px-1.5 text-center">
                         <input type="number" value={d.t || ''} onChange={(e) => handleUpdateNode(node.id, 't', Number(e.target.value))} placeholder="-" className={`${inputClasses} text-center w-14 text-slate-600`} />
                      </td>
                      <td className="py-2 px-1.5 border-r border-slate-100 text-center font-bold text-blue-600 bg-blue-50/20 tabular-nums text-[11px]">{d.vol || '—'}</td>

                      <td className="py-2 px-1.5 text-right bg-amber-50/15">
                        {d.tipe === 'PART' ? (
                          <input
                            type="number"
                            value={d.biaya === 0 ? '' : d.biaya}
                            onChange={(e) => handleUpdateNode(node.id, 'biaya', Number(e.target.value))}
                            placeholder="0"
                            className={`${inputClasses} text-right w-[5.25rem] text-amber-800 font-bold tabular-nums bg-amber-50/40 border-amber-200/80 focus:border-amber-400 focus:ring-amber-100`}
                            title="Harga material satuan (aktif)"
                          />
                        ) : (
                          <span
                            className="inline-block text-right w-[5.25rem] text-[11px] font-bold text-amber-800 tabular-nums"
                            title="Total material dari part di bawahnya"
                          >
                            {fin?.matAdjusted ? `Rp ${formatIDR(fin.matAdjusted)}` : '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-1.5 text-right text-amber-700/90 bg-amber-50/15 tabular-nums text-[11px] font-semibold">
                        {isRollupRow ? (fin?.matAdjusted ? usdMat : '—') : usdMat}
                      </td>
                      <td className="py-2 px-1.5 border-r border-slate-100 text-right text-amber-700/90 bg-amber-50/15 tabular-nums text-[11px] font-semibold">
                        {isRollupRow ? (fin?.matAdjusted ? eurMat : '—') : eurMat}
                      </td>

                      <td className="py-2 px-1.5 text-right bg-indigo-50/10 text-[11px]">
                        {hargaProduksiIDR ? (
                          <MoneyText variant="prodIdr">Rp {formatIDR(hargaProduksiIDR)}</MoneyText>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-1.5 text-right font-bold text-indigo-600 bg-indigo-50/10 tabular-nums text-[11px]">{usdProd}</td>
                      <td className="py-2 px-1.5 border-r border-slate-100 text-right font-bold text-indigo-600 bg-indigo-50/10 tabular-nums text-[11px]">{eurProd}</td>
                      <td className="py-2 px-1.5 text-right bg-violet-50/10 text-[11px]">
                        {fin ? (
                          <MoneyText variant="unitIdr">
                            Rp {formatIDR(d.tipe === 'PART' ? prodUnit : hargaProduksiIDR)}
                          </MoneyText>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-1.5 text-right font-bold text-violet-600 bg-violet-50/10 tabular-nums text-[11px]">
                        {fin ? (d.tipe === 'PART' ? usdProdUnit : usdProd) : '—'}
                      </td>
                      <td className="py-2 px-1.5 border-r border-slate-100 text-right font-bold text-violet-600 bg-violet-50/10 tabular-nums text-[11px]">
                        {fin ? (d.tipe === 'PART' ? eurProdUnit : eurProd) : '—'}
                      </td>
                      
                      <td className="py-3 px-4 border-r border-slate-100">
                        {d.proses_count > 0 ? (
                          <div onClick={() => setRoutingNode(node)} className="flex items-center gap-1.5 text-blue-600 font-bold cursor-pointer hover:underline hover:text-blue-800 transition-colors">
                            <LinkIcon className="w-3.5 h-3.5" /><span>{d.proses_count} Operasi Terdaftar</span>
                          </div>
                        ) : (
                          <div onClick={() => setRoutingNode(node)} className="flex items-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors font-medium">
                            <LinkIcon className="w-3.5 h-3.5" /><span>Tambah Multi Routing...</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <input type="text" value={d.catatan} onChange={(e) => handleUpdateNode(node.id, 'catatan', e.target.value)} placeholder="Ketik catatan..." className={`${inputClasses} min-w-[180px] text-slate-500`} />
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (routingNode) {
    return (
      <RoutingModal
        node={routingNode}
        onClose={() => setRoutingNode(null)}
        onSave={handleSaveRouting}
        kursUsd={kursUsd}
        kursEur={kursEur}
      />
    );
  }

  // --- EDITOR RENDER ---
  return (
    <div className="editor-shell font-sans">

      {/* Include Detail Summary Modal */}
      <SummaryDetailModal node={detailSummaryNode} onClose={() => setDetailSummaryNode(null)} />
      <MasterWorkCenterModal isOpen={showMasterWc} onClose={() => setShowMasterWc(false)} />
      <ManualBookModal isOpen={showManual} onClose={() => setShowManual(false)} />
      <MasterMaterialsModal
        isOpen={showMasterMaterials}
        onClose={() => {
          setShowMasterMaterials(false);
          reloadMasters();
        }}
        onReimported={reloadMasters}
      />

      <svg width="0" height="0" className="absolute">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="4.5" refX="5" refY="2.25" orient="auto"><polygon points="0 0, 6 2.25, 0 4.5" fill="#818cf8" /></marker>
        </defs>
      </svg>
      <style>{`@keyframes dashMove { to { stroke-dashoffset: -16; } } .animated-dash { animation: dashMove 0.8s linear infinite; }`}</style>

      <div className="editor-topbar">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Ke Daftar BOM
          </button>
          <span className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
            Project: {productInfo.kode || '—'}
          </span>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
              cogsMode === COGS_MODES.EXCEL_FIXED
                ? 'bg-violet-50 text-violet-700 border-violet-200'
                : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}
            title="Mode sumber biaya COGS"
          >
            {cogsMode === COGS_MODES.EXCEL_FIXED ? 'Mode: Excel Fixed' : 'Mode: Live Master'}
          </span>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
              saveStatus === 'saved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : saveStatus === 'saving'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : saveStatus === 'error'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {saveStatus === 'saved' ? 'Tersimpan' : saveStatus === 'saving' ? 'Menyimpan…' : saveStatus === 'error' ? 'Gagal simpan' : 'Belum disimpan'}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            type="button"
            onClick={toggleProductPanel}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
            title={showProductPanel ? 'Sembunyikan data produk' : 'Tampilkan data produk'}
          >
            {showProductPanel ? <PanelTopClose className="w-4 h-4" /> : <PanelTopOpen className="w-4 h-4" />}
            {showProductPanel ? 'Sembunyikan Produk' : 'Tampilkan Produk'}
          </button>
          <FontCaseToggle value={fontCase} onChange={setFontCase} />
          <CurrencyGroup kursUsd={kursUsd} setKursUsd={setKursUsd} kursEur={kursEur} setKursEur={setKursEur} className="mr-1" />
          <button
            type="button"
            onClick={() => setShowMasterMaterials(true)}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
          >
            <Server className="w-4 h-4" /> Master Data
          </button>
          <button
            type="button"
            onClick={() => setShowMasterWc(true)}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
          >
            <Server className="w-4 h-4" /> Master WC
          </button>
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
            title="Manual Book — panduan sistem BOM & kalkulasi"
          >
            <BookOpen className="w-4 h-4" /> Manual Book
          </button>
          <ExportMenu
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            onExportPdfFull={handleExportPdfFull}
          />
          <button onClick={() => setShowKalkulasi(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
            <FileText className="w-4 h-4" /> View Kalkulasi Lengkap
          </button>
          <button
            type="button"
            onClick={handleSaveNow}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm shadow-blue-500/30"
          >
            <CheckCircle2 className="w-4 h-4" /> Simpan Project
          </button>
        </div>
      </div>

      <KalkulasiModal
        isOpen={showKalkulasi}
        onClose={() => setShowKalkulasi(false)}
        bomData={bomData}
        cogsData={cogsData}
        cogsConfig={cogsConfig}
        productInfo={productInfo}
        packingCosts={{ boxMat: packBoxMat, boxLab: packBoxLab, sfMat: packSfMat, sfLab: packSfLab }}
      />
      <MarkupPreviewModal
        isOpen={showMarkupPreview}
        onClose={() => setShowMarkupPreview(false)}
        totalCogs={cogsData.totalCogs}
        selectedPct={cogsConfig.markupPct}
        onSelect={(pct) => setCogsConfig((p) => ({ ...p, markupPct: pct }))}
      />
      <CogsInsightModal
        isOpen={showCogsInsightModal}
        onClose={() => setShowCogsInsightModal(false)}
        insight={cogsInsight}
        productInfo={productInfo}
      />
      <ExcelParityChecklistModal
        isOpen={showExcelChecklistModal}
        onClose={() => setShowExcelChecklistModal(false)}
        bomData={bomData}
        productMeta={productMeta}
        productInfo={productInfo}
        dimensi={dimensi}
        packingSpec={packingSpec}
        packingDimensions={packingDimensions}
        cogsConfig={cogsConfig}
        cogsData={cogsData}
        excelMirror={excelMirror}
        importedFromExcel={importedFromExcel}
        kursUsd={kursUsd}
        kursEur={kursEur}
        mastersReady={mastersReady}
      />

      <div className="editor-body">
        
        {/* PRODUCT INFORMATION — bisa disembunyikan untuk fokus kalkulasi */}
        {showProductPanel ? (
          <ProductPanel
            productInfo={productInfo}
            onProductInfoChange={handleProductInfoChange}
            productMeta={productMeta}
            onProductMetaChange={handleProductMetaChange}
            onWoodGradeChange={handleProductWoodGrade}
            onCoatingChange={handleProductCoating}
            mastersTick={mastersTick}
            productImage={resolveNodeFoto(bomData)}
            dimensi={dimensi}
            onDimensiChange={updateDimensi}
            volProduk={volProduk}
            packingDimensions={packingDimensions}
            onPackingTolChange={(id, tol, val) => handleUpdatePackingDim(id, tol, val)}
            packingVolOpts={packingVolOpts}
            coatingPreview={coatingPreview}
          />
        ) : (
          <ProductInlineBar
            expanded={productInlineExpanded}
            onToggleExpand={() => setProductInlineExpanded((v) => !v)}
            onShowFullPanel={() => {
              setShowProductPanel(true);
              persistProductPanelPref(true);
            }}
            productInfo={productInfo}
            onProductInfoChange={handleProductInfoChange}
            productMeta={productMeta}
            onProductMetaChange={handleProductMetaChange}
            dimensi={dimensi}
            onDimensiChange={updateDimensi}
            volProduk={volProduk}
            packingDimensions={packingDimensions}
            onPackingTolChange={(id, tol, val) => handleUpdatePackingDim(id, tol, val)}
            packingVolOpts={packingVolOpts}
            mastersTick={mastersTick}
            onWoodGradeChange={handleProductWoodGrade}
            onCoatingChange={handleProductCoating}
            coatingPreview={coatingPreview}
            productImage={resolveNodeFoto(bomData)}
          />
        )}

        {/* TABS NAVIGATION BAR */}
        <EditorTabBar activeTab={editorTab} onTabChange={setEditorTab} />

        {/* TAB CONTENT AREA — flex-1 1 0% agar selalu dapat sisa tinggi setelah panel produk */}
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden bg-white basis-0">
          
          {/* TAB 1: STRUKTUR PERAKITAN */}
          {editorTab === 'struktur' && (
            <div className="flex-1 flex flex-col h-full bg-white relative">
              <div className="px-6 py-4 border-b border-slate-200 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white z-10 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-800 mb-0.5 tracking-tight">Struktur Perakitan & Modul</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Pengaturan hierarki Modul, Submodul, Part, dan Routing Produksi.
                    Nama grade kayu (mis. MAHOGANY - 30 UP) otomatis diambil dari <strong>DATA BASE</strong>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSyncBomFromMasters}
                    disabled={!mastersReady}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 shadow-sm"
                    title="Cocokkan semua baris dengan master kayu & coating"
                  >
                    Sinkron DATA BASE
                  </button>
                  <button onClick={() => handleAddNode(bomData.id, 'MODUL')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm shadow-blue-500/30">
                    <Plus className="w-4 h-4" /> Tambah Modul Utama
                  </button>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Cari komponen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-48 md:w-64 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white transition-all font-medium" />
                  </div>
                  <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-inner">
                    <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}><TableIcon className="w-4 h-4" /> Tabel</button>
                    <button onClick={() => setViewMode('graph')} className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'graph' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}><Network className="w-4 h-4" /> Visual</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
                {viewMode === 'table' ? (
                  renderTableView()
                ) : (
                  <div className={`flex-1 relative overflow-hidden bg-[#f1f5f9] ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} ref={containerRef} onMouseDown={handleMouseDownCanvas} onMouseMove={handleMouseMove} style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: `${24 * scale}px ${24 * scale}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}>
                    <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-xl z-50">
                      <button onClick={zoomOut} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"><ZoomOut className="w-5 h-5" /></button>
                      <span className="text-sm font-black text-slate-700 w-14 text-center">{Math.round(scale * 100)}%</span>
                      <button onClick={zoomIn} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"><ZoomIn className="w-5 h-5" /></button>
                      <div className="w-px h-6 bg-slate-300 mx-1"></div>
                      <button onClick={resetZoom} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"><Maximize className="w-5 h-5" /></button>
                    </div>
                    <div className="absolute origin-top-left transition-transform duration-75" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
                      <div className="p-24 inline-block min-w-max pointer-events-none">
                        <div className="pointer-events-auto">
                          <TreeNode node={bomData} isRoot={true} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CONTAINER CAPACITY */}
          {editorTab === 'container' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-page flex flex-col gap-6 scrollbar-hide">
              
              {/* Header Tab */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 shrink-0 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Spesifikasi Packing & Container Capacity</h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Definisi dimensi produk, list material packing, routing tenaga kerja, dan kalkulasi total muatan kontainer.</p>
                </div>
              </div>

              {/* 1 & 2. TABEL DIMENSI */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 shrink-0">
                
                {/* Tabel 1: Dimensi Produk */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                    <h3 className="text-sm font-black text-slate-800">1. Informasi Dimensi Produk (Nett)</h3>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3 border-r border-slate-100">Parameter</th>
                        <th className="px-5 py-3 text-center border-r border-slate-100">W (mm)</th>
                        <th className="px-5 py-3 text-center border-r border-slate-100">D (mm)</th>
                        <th className="px-5 py-3 text-center border-r border-slate-100">H (mm)</th>
                        <th className="px-5 py-3 text-right text-blue-600 bg-blue-50/30">Volume (m³)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-5 py-4 font-bold text-slate-700 border-r border-slate-100">Produk Furniture</td>
                        <td className="px-5 py-4 text-center border-r border-slate-100 font-medium text-slate-600">{dimensi.w}</td>
                        <td className="px-5 py-4 text-center border-r border-slate-100 font-medium text-slate-600">{dimensi.d}</td>
                        <td className="px-5 py-4 text-center border-r border-slate-100 font-medium text-slate-600">{dimensi.h}</td>
                        <td className="px-5 py-4 text-right font-black text-blue-700 bg-blue-50/10">{volProduk}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tabel 2: Dimensi Packing */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-800">2. Informasi Dimensi Packing (Gross)</h3>
                    <button onClick={handleAddPackingDim} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                      <Plus className="w-3.5 h-3.5"/> Tambah Dimensi
                    </button>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3 border-r border-slate-100 w-1/4">Tipe Packing</th>
                        <th className="px-5 py-3 text-center border-r border-slate-100">W x D x H (mm)</th>
                        <th className="px-5 py-3 text-center border-r border-slate-100">Toleransi (+mm)</th>
                        <th className="px-5 py-3 text-right text-emerald-600 border-r border-slate-100 bg-emerald-50/30">Volume (m³)</th>
                        <th className="px-5 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packingDimensions.map(item => {
                        const grossW = dimensi.w + item.tolW;
                        const grossD = dimensi.d + item.tolD;
                        const grossH = dimensi.h + item.tolH;
                        const vol = ((grossW * grossD * grossH) / 1000000000).toFixed(6);
                        return (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 border-r border-slate-100">
                              <input type="text" value={item.type} onChange={e => handleUpdatePackingDim(item.id, 'type', e.target.value)} className="w-full bg-transparent font-black text-slate-700 outline-none border-b border-transparent focus:border-emerald-400" />
                            </td>
                            <td className="px-5 py-3 text-center border-r border-slate-100 font-bold text-slate-600">
                              {grossW} x {grossD} x {grossH}
                            </td>
                            <td className="px-5 py-3 text-center border-r border-slate-100">
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] text-amber-500 font-bold">+W</span>
                                  <input type="number" value={item.tolW} onChange={e => handleUpdatePackingDim(item.id, 'tolW', e.target.value)} className="w-12 text-center bg-slate-50 border border-slate-200 rounded py-1 outline-none focus:border-amber-400 font-bold text-slate-700" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] text-amber-500 font-bold">+D</span>
                                  <input type="number" value={item.tolD} onChange={e => handleUpdatePackingDim(item.id, 'tolD', e.target.value)} className="w-12 text-center bg-slate-50 border border-slate-200 rounded py-1 outline-none focus:border-amber-400 font-bold text-slate-700" />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] text-amber-500 font-bold">+H</span>
                                  <input type="number" value={item.tolH} onChange={e => handleUpdatePackingDim(item.id, 'tolH', e.target.value)} className="w-12 text-center bg-slate-50 border border-slate-200 rounded py-1 outline-none focus:border-amber-400 font-bold text-slate-700" />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right font-black text-emerald-700 bg-emerald-50/10 border-r border-slate-100">{vol}</td>
                            <td className="px-5 py-3 text-center">
                              <button onClick={() => handleDeletePackingDim(item.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* 3. TABEL MATERIAL PACKING */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Grid className="w-4 h-4 text-amber-500" /> 3. BOM Material Packing (Box & Single Face)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  
                  {/* Kolom BOX */}
                  <div className="p-0 flex flex-col">
                    <div className="bg-amber-50/60 px-5 py-3 border-b border-slate-200 font-black text-amber-800 text-[10px] uppercase tracking-widest flex justify-between items-center">
                      <span className="flex items-center gap-2">Material: Box Karton <button onClick={() => handleAddPackingSpec('materialsBox')} className="bg-amber-100 text-amber-600 hover:bg-amber-200 p-1 rounded transition-colors"><Plus className="w-3 h-3"/></button></span>
                      <span>Total: Rp {formatIDR(packBoxMat)}</span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white border-b border-slate-100 text-[9px] text-slate-500 uppercase font-bold">
                        <tr>
                          <th className="px-5 py-2.5">Item Material</th>
                          <th className="px-2 py-2.5 text-center w-16">Qty</th>
                          <th className="px-2 py-2.5 text-center w-20">Unit</th>
                          <th className="px-2 py-2.5 text-right w-24">Harga (IDR)</th>
                          <th className="px-5 py-2.5 text-right w-24">Total</th>
                          <th className="px-2 py-2.5 text-center w-10">Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packingSpec.materialsBox.map(m => (
                          <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-2"><input type="text" value={m.nama} onChange={e => handleUpdatePackingSpec('materialsBox', m.id, 'nama', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-400 focus:outline-none font-bold text-slate-700 py-1" placeholder="Nama Material"/></td>
                            <td className="px-2 py-2 text-center"><input type="number" value={m.qty} onChange={e => handleUpdatePackingSpec('materialsBox', m.id, 'qty', e.target.value)} className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-2 py-2 text-center"><input type="text" value={m.unit} onChange={e => handleUpdatePackingSpec('materialsBox', m.id, 'unit', e.target.value)} className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-400 focus:outline-none text-slate-600 py-1 uppercase text-[10px]" /></td>
                            <td className="px-2 py-2 text-right"><input type="number" value={m.harga} onChange={e => handleUpdatePackingSpec('materialsBox', m.id, 'harga', e.target.value)} className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-5 py-2 text-right font-black text-amber-600">Rp {formatIDR(m.qty * m.harga)}</td>
                            <td className="px-2 py-2 text-center"><button onClick={() => handleDeletePackingSpec('materialsBox', m.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"><Trash2 className="w-3.5 h-3.5"/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Kolom SF */}
                  <div className="p-0 flex flex-col">
                    <div className="bg-emerald-50/60 px-5 py-3 border-b border-slate-200 font-black text-emerald-800 text-[10px] uppercase tracking-widest flex justify-between items-center">
                      <span className="flex items-center gap-2">Material: Single Face <button onClick={() => handleAddPackingSpec('materialsSF')} className="bg-emerald-100 text-emerald-600 hover:bg-emerald-200 p-1 rounded transition-colors"><Plus className="w-3 h-3"/></button></span>
                      <span>Total: Rp {formatIDR(packSfMat)}</span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white border-b border-slate-100 text-[9px] text-slate-500 uppercase font-bold">
                        <tr>
                          <th className="px-5 py-2.5">Item Material</th>
                          <th className="px-2 py-2.5 text-center w-16">Qty</th>
                          <th className="px-2 py-2.5 text-center w-20">Unit</th>
                          <th className="px-2 py-2.5 text-right w-24">Harga (IDR)</th>
                          <th className="px-5 py-2.5 text-right w-24">Total</th>
                          <th className="px-2 py-2.5 text-center w-10">Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packingSpec.materialsSF.map(m => (
                          <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-2"><input type="text" value={m.nama} onChange={e => handleUpdatePackingSpec('materialsSF', m.id, 'nama', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-400 focus:outline-none font-bold text-slate-700 py-1" placeholder="Nama Material"/></td>
                            <td className="px-2 py-2 text-center"><input type="number" value={m.qty} onChange={e => handleUpdatePackingSpec('materialsSF', m.id, 'qty', e.target.value)} className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-2 py-2 text-center"><input type="text" value={m.unit} onChange={e => handleUpdatePackingSpec('materialsSF', m.id, 'unit', e.target.value)} className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-400 focus:outline-none text-slate-600 py-1 uppercase text-[10px]" /></td>
                            <td className="px-2 py-2 text-right"><input type="number" value={m.harga} onChange={e => handleUpdatePackingSpec('materialsSF', m.id, 'harga', e.target.value)} className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-5 py-2 text-right font-black text-emerald-600">Rp {formatIDR(m.qty * m.harga)}</td>
                            <td className="px-2 py-2 text-center"><button onClick={() => handleDeletePackingSpec('materialsSF', m.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"><Trash2 className="w-3.5 h-3.5"/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>

              {/* 4. TABEL ROUTING PACKING */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-indigo-500" /> 4. Routing / Pekerja Packing (Box & Single Face)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  
                  {/* Kolom BOX */}
                  <div className="p-0 flex flex-col">
                    <div className="bg-indigo-50/60 px-5 py-3 border-b border-slate-200 font-black text-indigo-800 text-[10px] uppercase tracking-widest flex justify-between items-center">
                      <span className="flex items-center gap-2">Routing Pekerja: Box Karton <button onClick={() => handleAddPackingSpec('routingBox')} className="bg-indigo-100 text-indigo-600 hover:bg-indigo-200 p-1 rounded transition-colors"><Plus className="w-3 h-3"/></button></span>
                      <span>Total: Rp {formatIDR(packBoxLab)}</span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white border-b border-slate-100 text-[9px] text-slate-500 uppercase font-bold">
                        <tr>
                          <th className="px-5 py-2.5">Proses Kerja</th>
                          <th className="px-2 py-2.5 text-center w-16">Waktu(m)</th>
                          <th className="px-2 py-2.5 text-center w-16">Pekerja</th>
                          <th className="px-2 py-2.5 text-right w-20">Rate(IDR)</th>
                          <th className="px-5 py-2.5 text-right w-24">Total</th>
                          <th className="px-2 py-2.5 text-center w-10">Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packingSpec.routingBox.map(r => (
                          <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-2"><input type="text" value={r.nama} onChange={e => handleUpdatePackingSpec('routingBox', r.id, 'nama', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none font-bold text-slate-700 py-1" placeholder="Nama Routing"/></td>
                            <td className="px-2 py-2 text-center"><input type="number" value={r.waktu} onChange={e => handleUpdatePackingSpec('routingBox', r.id, 'waktu', e.target.value)} className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-2 py-2 text-center"><input type="number" value={r.pekerja} onChange={e => handleUpdatePackingSpec('routingBox', r.id, 'pekerja', e.target.value)} className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-2 py-2 text-right"><input type="number" value={r.rate} onChange={e => handleUpdatePackingSpec('routingBox', r.id, 'rate', e.target.value)} className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-5 py-2 text-right font-black text-indigo-600">Rp {formatIDR(r.waktu * r.pekerja * r.rate)}</td>
                            <td className="px-2 py-2 text-center"><button onClick={() => handleDeletePackingSpec('routingBox', r.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"><Trash2 className="w-3.5 h-3.5"/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Kolom SF */}
                  <div className="p-0 flex flex-col">
                    <div className="bg-blue-50/60 px-5 py-3 border-b border-slate-200 font-black text-blue-800 text-[10px] uppercase tracking-widest flex justify-between items-center">
                      <span className="flex items-center gap-2">Routing Pekerja: Single Face <button onClick={() => handleAddPackingSpec('routingSF')} className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-1 rounded transition-colors"><Plus className="w-3 h-3"/></button></span>
                      <span>Total: Rp {formatIDR(packSfLab)}</span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white border-b border-slate-100 text-[9px] text-slate-500 uppercase font-bold">
                        <tr>
                          <th className="px-5 py-2.5">Proses Kerja</th>
                          <th className="px-2 py-2.5 text-center w-16">Waktu(m)</th>
                          <th className="px-2 py-2.5 text-center w-16">Pekerja</th>
                          <th className="px-2 py-2.5 text-right w-20">Rate(IDR)</th>
                          <th className="px-5 py-2.5 text-right w-24">Total</th>
                          <th className="px-2 py-2.5 text-center w-10">Act</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packingSpec.routingSF.map(r => (
                          <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-2"><input type="text" value={r.nama} onChange={e => handleUpdatePackingSpec('routingSF', r.id, 'nama', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none font-bold text-slate-700 py-1" placeholder="Nama Routing"/></td>
                            <td className="px-2 py-2 text-center"><input type="number" value={r.waktu} onChange={e => handleUpdatePackingSpec('routingSF', r.id, 'waktu', e.target.value)} className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-2 py-2 text-center"><input type="number" value={r.pekerja} onChange={e => handleUpdatePackingSpec('routingSF', r.id, 'pekerja', e.target.value)} className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-2 py-2 text-right"><input type="number" value={r.rate} onChange={e => handleUpdatePackingSpec('routingSF', r.id, 'rate', e.target.value)} className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-600 py-1" /></td>
                            <td className="px-5 py-2 text-right font-black text-blue-600">Rp {formatIDR(r.waktu * r.pekerja * r.rate)}</td>
                            <td className="px-2 py-2 text-center"><button onClick={() => handleDeletePackingSpec('routingSF', r.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"><Trash2 className="w-3.5 h-3.5"/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>

              {/* Referensi kapasitas preset */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                {CONTAINER_PRESETS.map((preset, idx) => {
                  const caps = calcContainerNetCapacity(preset, volBoxPacking, volSFPacking);
                  const boxVal = caps.netCapBox;
                  const sfVal = caps.netCapSF;
                  const row = containerCapacity[idx];
                  if (row?.hidden && !showHiddenContainers) return null;
                  return (
                    <div key={preset.id} className={`surface-card p-3 ${row?.hidden ? 'opacity-50' : ''}`}>
                      <span className="label-field">{preset.type}</span>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-center text-[10px]">
                        <div className="bg-material-50 rounded-lg py-2 border border-material-100">
                          <span className="text-material-600 font-bold block">Box</span>
                          <span className="font-black text-material-800">{boxVal}</span>
                          <span className="text-slate-400">{preset.unitBox || 'Pcs'}</span>
                        </div>
                        <div className="bg-teal-50 rounded-lg py-2 border border-teal-100">
                          <span className="text-teal-600 font-bold block">SF</span>
                          <span className="font-black text-teal-800">{sfVal}</span>
                          <span className="text-slate-400">{preset.unitSF || 'Pcs'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 5. TABEL CONTAINER CAPACITY */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col shrink-0 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">5. Tabel Container Capacity Terpadu</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Kapasitas: 1 piece = volume packing (m³) · kontainer = floor(muatan kontainer m³ ÷ volume packing) — ref. ELB-555-98 (26 / 55 / 65 Pcs)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowHiddenContainers((v) => !v)}
                      className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      {showHiddenContainers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {showHiddenContainers ? 'Sembunyikan baris hidden' : 'Tampilkan baris hidden'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddContainer}
                      className="hidden bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold items-center gap-1.5 transition-colors shadow-sm"
                      aria-hidden
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Kontainer
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-slate-200 scrollbar-hide shadow-sm bg-white">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase tracking-widest text-center">
                      <tr>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 align-middle sticky left-0 z-10 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">TYPE</th>
                        <th colSpan={2} className="px-4 py-2 border-r border-slate-200 border-b border-slate-200 text-center">NET CAPACITY CONTAINER</th>
                        <th colSpan={2} className="px-4 py-2 border-r border-slate-200 border-b border-slate-200 bg-amber-50/50 text-amber-700">MATERIAL COST</th>
                        <th colSpan={2} className="px-4 py-2 border-r border-slate-200 border-b border-slate-200 bg-indigo-50/50 text-indigo-700">ROUTING COST</th>
                        <th colSpan={2} className="px-4 py-2 border-r border-slate-200 border-b border-slate-200">MANAGEMENT OVERHEAD</th>
                        <th colSpan={2} className="px-4 py-2 border-b border-slate-200 bg-blue-50 text-blue-700">TOTAL COST</th>
                        <th rowSpan={2} className="px-4 py-3 border-l border-slate-200 align-middle bg-slate-100 text-slate-500">AKSI</th>
                      </tr>
                      <tr className="bg-slate-50 text-[9px]">
                        <th className="px-4 py-2 border-r border-slate-200 text-center">BOX</th>
                        <th className="px-4 py-2 border-r border-slate-200 text-center">SINGLE FACE</th>
                        <th className="px-4 py-2 border-r border-slate-200 bg-amber-50/30">BOX</th>
                        <th className="px-4 py-2 border-r border-slate-200 bg-amber-50/30">SINGLE FACE</th>
                        <th className="px-4 py-2 border-r border-slate-200 bg-indigo-50/30">BOX</th>
                        <th className="px-4 py-2 border-r border-slate-200 bg-indigo-50/30">SINGLE FACE</th>
                        <th className="px-4 py-2 border-r border-slate-200">BOX</th>
                        <th className="px-4 py-2 border-r border-slate-200">SINGLE FACE</th>
                        <th className="px-4 py-2 border-r border-slate-200 bg-blue-50/50 text-blue-600">BOX</th>
                        <th className="px-4 py-2 bg-blue-50/50 text-blue-600">SINGLE FACE</th>
                      </tr>
                    </thead>
                    <tbody className="font-medium text-slate-700">
                      {containerCapacity.map((item, index) => {
                        if (item.hidden && !showHiddenContainers) return null;
                        const isPreset = index < CONTAINER_PRESETS.length;
                        const preset = CONTAINER_PRESETS[index];
                        const isOnePiece = preset?.boxFromVolume;
                        const capsFromFormula = preset
                          ? calcContainerNetCapacity(preset, volBoxPacking, volSFPacking)
                          : null;
                        const unitBox = isOnePiece ? 'm³' : 'Pcs';
                        const unitSF = isOnePiece ? 'm³' : 'Pcs';
                        const inputStyles = "w-full min-w-[80px] bg-white border border-slate-200 hover:border-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-lg px-3 py-1.5 text-right font-bold text-slate-700 transition-all shadow-sm";
                        const readOnlyCap = "w-full min-w-[80px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right font-bold tabular-nums";
                        return (
                          <tr key={index} className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors ${item.hidden ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-3 border-r border-slate-100 font-black text-slate-600 bg-slate-50/50 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] uppercase text-[11px] tracking-wide whitespace-nowrap">
                              {isPreset ? (
                                <span className="px-2">{item.type}</span>
                              ) : (
                                <input type="text" value={item.type} onChange={(e) => handleContainerCapacityChange(index, 'type', e.target.value)} className="w-full bg-transparent focus:outline-none focus:border-blue-400 border-b border-transparent hover:border-slate-300 min-w-[100px] uppercase" placeholder="Tipe..." />
                              )}
                            </td>
                            
                            {/* Net Capacity Container */}
                            <td className="px-3 py-2 border-r border-slate-100">
                              <div className="flex items-center gap-2">
                                {isPreset ? (
                                  <span className={`${readOnlyCap} text-material-700`} title={preset?.containerNetM3 ? `floor(${preset.containerNetM3} m³ ÷ vol box)` : 'Volume box (m³)'}>
                                    {capsFromFormula?.netCapBox ?? item.netCapBox}
                                  </span>
                                ) : (
                                  <input type="number" value={item.netCapBox ?? 0} onChange={(e) => handleContainerCapacityChange(index, 'netCapBox', e.target.value)} className={inputStyles} placeholder="0" />
                                )}
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1.5 rounded">{unitBox}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r border-slate-100">
                              <div className="flex items-center gap-2">
                                {isPreset ? (
                                  <span className={`${readOnlyCap} text-teal-700`} title={preset?.containerNetM3 ? `floor(${preset.containerNetM3} m³ ÷ vol SF)` : 'Volume SF (m³)'}>
                                    {capsFromFormula?.netCapSF ?? item.netCapSF}
                                  </span>
                                ) : (
                                  <input type="number" value={item.netCapSF ?? 0} onChange={(e) => handleContainerCapacityChange(index, 'netCapSF', e.target.value)} className={inputStyles} placeholder="0" />
                                )}
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1.5 rounded">{unitSF}</span>
                              </div>
                            </td>

                            {/* Material BOM */}
                            <td className="px-3 py-2 border-r border-slate-100 bg-amber-50/10">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-1.5 rounded">Rp</span>
                                <input type="number" value={item.matCostBox ?? 0} onChange={(e) => handleContainerCapacityChange(index, 'matCostBox', e.target.value)} className={inputStyles} placeholder="0" />
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r border-slate-100 bg-amber-50/10">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-1.5 rounded">Rp</span>
                                <input type="number" value={item.matCostSF || ''} onChange={(e) => handleContainerCapacityChange(index, 'matCostSF', e.target.value)} className={inputStyles} placeholder="0" />
                              </div>
                            </td>

                            {/* Routing BOM */}
                            <td className="px-3 py-2 border-r border-slate-100 bg-indigo-50/10">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-100 px-2 py-1.5 rounded">Rp</span>
                                <input type="number" value={item.routCostBox || ''} onChange={(e) => handleContainerCapacityChange(index, 'routCostBox', e.target.value)} className={inputStyles} placeholder="0" />
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r border-slate-100 bg-indigo-50/10">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-100 px-2 py-1.5 rounded">Rp</span>
                                <input type="number" value={item.routCostSF || ''} onChange={(e) => handleContainerCapacityChange(index, 'routCostSF', e.target.value)} className={inputStyles} placeholder="0" />
                              </div>
                            </td>

                            {/* Management Overhead */}
                            <td className="px-3 py-2 border-r border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1.5 rounded">Rp</span>
                                <input type="number" value={item.mgtOvBox || ''} onChange={(e) => handleContainerCapacityChange(index, 'mgtOvBox', e.target.value)} className={inputStyles} placeholder="0" />
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1.5 rounded">Rp</span>
                                <input type="number" value={item.mgtOvSF || ''} onChange={(e) => handleContainerCapacityChange(index, 'mgtOvSF', e.target.value)} className={inputStyles} placeholder="0" />
                              </div>
                            </td>

                            {/* Total */}
                            <td className="px-4 py-3 border-r border-slate-100 bg-blue-50/40">
                              <div className="flex items-center justify-between gap-3 min-w-[95px]">
                                <span className="text-[9px] font-bold text-blue-400">Rp</span>
                                <span className="font-black text-blue-700">{formatIDR(item.totalBox)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 bg-blue-50/40">
                              <div className="flex items-center justify-between gap-3 min-w-[95px]">
                                <span className="text-[9px] font-bold text-blue-400">Rp</span>
                                <span className="font-black text-blue-700">{formatIDR(item.totalSF)}</span>
                              </div>
                            </td>

                            {/* Aksi */}
                            <td className="px-4 py-3 border-l border-slate-100 text-center bg-slate-50/30">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleContainerHidden(index)}
                                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200"
                                  title={item.hidden ? 'Tampilkan baris' : 'Sembunyikan baris'}
                                >
                                  {item.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                {!isPreset && (
                                  <button onClick={() => handleDeleteContainer(index)} className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded border border-transparent hover:border-red-100 transition-all shadow-sm" title="Hapus Kontainer">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KEBUTUHAN MATERIAL */}
          {editorTab === 'material' && (
            <div className="tab-page scrollbar-hide gap-6">
              <MaterialTotalCards fp={fp} totals={materialTabTotals} />
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Grid className="w-5 h-5 text-amber-500" /> Kebutuhan Material (Daftar Part)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Rekapitulasi otomatis dari seluruh komponen dalam struktur BOM yang diidentifikasi sebagai <strong>PART</strong>.</p>
                    {!mastersReady && (
                      <p className="text-[10px] text-amber-600 font-bold mt-1">Memuat master DATA BASE…</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!productMeta.woodGradeId}
                      onClick={handleApplyWoodMasterToAllParts}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 disabled:opacity-40"
                      title="Hitung ulang biaya semua part kayu dari grade produk + harga/m³ master"
                    >
                      Hitung harga kayu dari master
                    </button>
                    <HierarchyColToggles cols={materialHierarchyCols} onToggle={toggleHierarchyCol} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider text-center">
                      <tr>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 w-12 border-b border-slate-200 align-middle">NO</th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 w-16 border-b border-slate-200 align-middle">FOTO</th>
                        <HierarchyHeaderCells cols={materialHierarchyCols} />
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 text-left border-b border-slate-200 align-middle min-w-[120px] text-emerald-700">TIPE MATERIAL</th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 text-left border-b border-slate-200 align-middle">KODE MATERIAL</th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 text-left border-b border-slate-200 align-middle min-w-[280px] text-amber-700">NAMA MATERIAL / GRADE</th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 text-left border-b border-slate-200 align-middle">VENDOR</th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 text-center border-b border-slate-200 text-amber-600 align-middle">SF (%)</th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 text-center border-b border-slate-200 text-red-500 align-middle">WF (%)</th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 text-center border-b border-slate-200 text-blue-600 align-middle">DIMENSI & VOLUME</th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 text-amber-600 border-b border-slate-200 align-middle">QTY</th>
                        <th rowSpan={2} className="px-4 py-3 border-r border-slate-100 text-amber-600 border-b border-slate-200 align-middle">UNIT</th>
                        <th colSpan={3} className="px-2 py-2 border-r border-slate-200 border-b border-amber-200 text-amber-700 bg-amber-50/40">HARGA MATERIAL (SATUAN)</th>
                        <th colSpan={3} className="px-2 py-2 border-r border-slate-200 border-b border-indigo-200 text-indigo-700 bg-indigo-50/40">BIAYA PRODUKSI (TOTAL)</th>
                        <th colSpan={3} className="px-2 py-2 border-r border-slate-200 border-b border-violet-200 text-violet-700 bg-violet-50/40">HARGA PRODUKSI (SATUAN)</th>
                        <th rowSpan={2} className="px-4 py-3 w-16 border-b border-slate-200 align-middle">ACTION</th>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <th className="py-2 px-1.5 text-right text-amber-700 w-[5.5rem]">MAT (IDR)</th>
                        <th className="py-2 px-1.5 text-right text-amber-600 w-[4.5rem]">MAT (USD)</th>
                        <th className="py-2 px-1.5 border-r border-slate-200 text-right text-amber-600 w-[4.5rem]">MAT (EUR)</th>
                        <th className="py-2 px-1.5 text-right text-indigo-600 min-w-[6.5rem]">PROD (IDR)</th>
                        <th className="py-2 px-1.5 text-right text-indigo-600 w-[4.5rem]">PROD (USD)</th>
                        <th className="py-2 px-1.5 border-r border-slate-200 text-right text-indigo-600 w-[4.5rem]">PROD (EUR)</th>
                        <th className="py-2 px-1.5 text-right text-violet-700 min-w-[6.5rem]">PROD/U (IDR)</th>
                        <th className="py-2 px-1.5 text-right text-violet-600 w-[4.5rem]">PROD/U (USD)</th>
                        <th className="py-2 px-1.5 border-r border-slate-200 text-right text-violet-600 w-[4.5rem]">PROD/U (EUR)</th>
                      </tr>
                    </thead>
                    <tbody className="font-medium text-slate-700 divide-y divide-slate-100">
                      {materialParts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={materialTableColSpan}
                            className="px-6 py-16 text-center text-slate-400"
                          >
                            <Grid className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-500">Belum ada komponen PART</p>
                            <p className="text-xs mt-1 max-w-md mx-auto">
                              Tambahkan part di tab <strong>Struktur BOM</strong>, lalu isi tipe material, dimensi, dan grade untuk melihat kebutuhan material di sini.
                            </p>
                          </td>
                        </tr>
                      ) : materialParts.map((node, i) => {
                        const d = node.data;
                        const hierarchy = getPartHierarchyLabels(bomData, node.id);
                        const hargaBeliIDR = d.biaya || 0;
                        const sf = d.sf === '' || d.sf == null ? '' : Number(d.sf) || 0;
                        const wf = d.wf === '' || d.wf == null ? '' : Number(d.wf) || 0;
                        const fin = computePartDisplayFinancials(d, kursUsd, kursEur);
                        const { usdMat, eurMat, prodTotal: hargaProduksiIDR, usdProd, eurProd, prodUnit, usdProdUnit, eurProdUnit } = fin;

                        return (
                          <tr key={node.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-center border-r border-slate-100 text-slate-400 font-bold">{i + 1}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-center">
                               <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center mx-auto">
                                 {d.foto ? <img src={d.foto} alt="pic" className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                               </div>
                            </td>
                            <HierarchyBodyCells cols={materialHierarchyCols} hierarchy={hierarchy} />
                            <td className="px-4 py-3 border-r border-slate-100">
                              <MaterialTypeField
                                value={d.materialType || ''}
                                onChange={(val) => handleStructureMaterialType(node.id, val)}
                              />
                            </td>
                            <td className="px-4 py-3 border-r border-slate-100 font-mono text-slate-500">{d.kode}</td>
                            <td className="px-4 py-3 border-r border-slate-100 align-top">
                              <div className="flex flex-col gap-2 min-w-[260px]">
                                {resolvePartSourceMode(d) !== 'manual' ? (
                                  <span
                                    className={`block text-xs font-bold leading-tight px-1 py-0.5 ${
                                      partNameFromMaterialFields(d)
                                        ? 'text-slate-800'
                                        : 'text-slate-400 italic'
                                    }`}
                                    title={partNameFromMaterialFields(d) || 'Nama dari material'}
                                  >
                                    {partNameFromMaterialFields(d) || '— Pilih material —'}
                                  </span>
                                ) : null}
                                {d.materialType === 'kayu' ? (
                                  <WoodGradeField
                                    mastersTick={mastersTick}
                                    value={d.woodGradeId || ''}
                                    manualSpec={d.woodSpecification || ''}
                                    sourceMode={resolvePartSourceMode(d)}
                                    onChange={(gradeId, mat, manualSpec, modeHint) =>
                                      handlePartWoodField(node.id, gradeId, mat, manualSpec, modeHint)
                                    }
                                    className="min-w-0 w-full"
                                  />
                                ) : (
                                  <DatabaseMaterialField
                                    mastersTick={mastersTick}
                                    showAll
                                    materialType={d.materialType || ''}
                                    section={partMaterialSection(d)}
                                    value={d.materialMasterId || ''}
                                    manualSpec={d.materialSpecification || ''}
                                    sourceMode={resolvePartSourceMode(d)}
                                    onChange={(masterId, mat, manualSpec, modeHint) =>
                                      handlePartMaterialField(node.id, masterId, mat, manualSpec, modeHint)
                                    }
                                    className="min-w-0 w-full"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 border-r border-slate-100">
                              <VendorField
                                value={d.vendor || ''}
                                onChange={(val) => handleUpdateNode(node.id, 'vendor', val)}
                              />
                            </td>
                            <td className="px-4 py-3 border-r border-slate-100 text-center">
                              <input
                                type="number"
                                value={sf}
                                onChange={(e) => handleUpdateNode(node.id, 'sf', e.target.value)}
                                className="w-14 text-center border border-amber-200 text-amber-700 bg-amber-50 rounded px-1 py-1 text-xs font-bold outline-none focus:border-amber-400"
                              />
                            </td>
                            <td className="px-4 py-3 border-r border-slate-100 text-center">
                              <input
                                type="number"
                                value={wf}
                                onChange={(e) => handleUpdateNode(node.id, 'wf', e.target.value)}
                                className="w-14 text-center border border-red-200 text-red-600 bg-red-50 rounded px-1 py-1 text-xs font-bold outline-none focus:border-red-400"
                              />
                            </td>
                            <td className="px-4 py-3 border-r border-slate-100 text-center bg-blue-50/10">
                              <div className="font-bold text-slate-700 text-[10px]">{d.p || 0} x {d.l || 0} x {d.t || 0}</div>
                              <div className="text-[10px] font-black text-blue-600 mt-0.5">{d.vol} m³</div>
                            </td>
                            <td className="px-4 py-3 border-r border-slate-100 text-center font-black text-amber-600 bg-amber-50/20">{d.qty}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-600 uppercase text-[10px]">{d.unit || 'EA'}</td>
                            
                            <td className="py-2 px-1.5 border-r border-slate-100 text-right bg-amber-50/15">
                              <MoneyText variant="matIdr" className="text-[11px]">
                                Rp {formatIDR(hargaBeliIDR)}
                              </MoneyText>
                            </td>
                            <td className="py-2 px-1.5 text-right text-amber-700/90 bg-amber-50/15 tabular-nums text-[11px] font-semibold">{usdMat}</td>
                            <td className="py-2 px-1.5 border-r border-slate-100 text-right text-amber-700/90 bg-amber-50/15 tabular-nums text-[11px] font-semibold">{eurMat}</td>
                            <td className="py-2 px-1.5 text-right font-black text-indigo-700 bg-indigo-50/10 tabular-nums text-[11px]">Rp {formatIDR(hargaProduksiIDR)}</td>
                            <td className="py-2 px-1.5 text-right font-bold text-indigo-600 bg-indigo-50/10 tabular-nums text-[11px]">{usdProd}</td>
                            <td className="py-2 px-1.5 border-r border-slate-100 text-right font-bold text-indigo-600 bg-indigo-50/10 tabular-nums text-[11px]">{eurProd}</td>
                            <td className="py-2 px-1.5 text-right font-black text-violet-700 bg-violet-50/10 tabular-nums text-[11px]">Rp {formatIDR(prodUnit)}</td>
                            <td className="py-2 px-1.5 text-right font-bold text-violet-600 bg-violet-50/10 tabular-nums text-[11px]">{usdProdUnit}</td>
                            <td className="py-2 px-1.5 border-r border-slate-100 text-right font-bold text-violet-600 bg-violet-50/10 tabular-nums text-[11px]">{eurProdUnit}</td>

                            <td className="px-4 py-3 text-center">
                              <button className="p-1.5 text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 border border-red-100 rounded transition-colors mx-auto block">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEBUTUHAN PROSES — satu layar; scroll di panel tabel */}
          {editorTab === 'proses' && (
            <div className="tab-page-fit flex-1 min-h-0">
              <div className="shrink-0">
                <ProsesTotalCards fp={fp} totals={prosesTabTotals} compact />
              </div>

              <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
              {/* Tabel Rekapitulasi Manufaktur */}
              <div className="shrink-0 flex flex-col max-h-[min(10rem,22vh)] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-white shrink-0">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <PieChart className="w-3.5 h-3.5 text-indigo-500" /> Tabel Rekapitulasi Manufaktur
                  </h3>
                </div>
                <div className="min-h-0 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider text-center sticky top-0 z-[1]">
                      <tr>
                        <th className="px-3 py-2 border-r border-slate-100 w-10">NO</th>
                        <th className="px-3 py-2 border-r border-slate-100 text-left">KATEGORI MANUFAKTUR</th>
                        <th className="px-3 py-2 border-r border-slate-100">TOTAL OPERASI</th>
                        <th className="px-3 py-2 border-r border-slate-100 text-blue-600">TOTAL DURASI</th>
                        <th className="px-3 py-2 border-r border-slate-100 text-right">SUBTOTAL WORK CENTER</th>
                        <th className="px-3 py-2 border-r border-slate-100 text-right">SUBTOTAL MAN POWER</th>
                        <th className="px-3 py-2 text-right text-indigo-600">TOTAL BIAYA (IDR)</th>
                      </tr>
                    </thead>
                    <tbody className="font-medium text-slate-700 divide-y divide-slate-100">
                      {prosesSummary.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-xs italic">
                            Belum ada operasi manufaktur — tambahkan proses pada part di tab Struktur atau buka Routing.
                          </td>
                        </tr>
                      ) : prosesSummary.items.map((item, i) => (
                        <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-center border-r border-slate-100 text-slate-400 font-bold">{i + 1}</td>
                          <td className="px-3 py-2 border-r border-slate-100 font-black text-slate-800">{item.name}</td>
                          <td className="px-3 py-2 border-r border-slate-100 text-center">
                            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">{item.count} Proses</span>
                          </td>
                          <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-blue-600">{item.waktu} Min</td>
                          <td className="px-3 py-2 border-r border-slate-100 text-right">
                            <MoneyText variant="mesin">Rp {formatIDR(item.mesin)}</MoneyText>
                          </td>
                          <td className="px-3 py-2 border-r border-slate-100 text-right">
                            <MoneyText variant="pekerja">Rp {formatIDR(item.pekerja)}</MoneyText>
                          </td>
                          <td className="px-3 py-2 text-right font-black text-indigo-700 bg-indigo-50/20">Rp {formatIDR(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 sticky bottom-0">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right font-black text-slate-700 uppercase tracking-widest text-[9px]">AKUMULASI TOTAL:</td>
                        <td className="px-3 py-2 text-center font-black text-blue-600">{prosesSummary.totalWaktu} Min</td>
                        <td className="px-3 py-2 text-right">
                          <MoneyText variant="mesin" className="font-black">Rp {formatIDR(prosesSummary.totalMesin)}</MoneyText>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <MoneyText variant="pekerja" className="font-black">Rp {formatIDR(prosesSummary.totalPekerja)}</MoneyText>
                        </td>
                        <td className="px-3 py-2 text-right font-black text-indigo-700">Rp {formatIDR(prosesSummary.grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Tabel Detail Kebutuhan Proses — mengisi sisa tinggi + scroll */}
              <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-white shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-indigo-500" /> Detail Kebutuhan Proses
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-medium hidden sm:block">
                      Satu baris per operasi — kolom hierarki mengikuti part induk.
                    </p>
                  </div>
                  <HierarchyColToggles cols={materialHierarchyCols} onToggle={toggleHierarchyCol} />
                </div>
                <div className="proses-scroll-region">
                  <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider text-center sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 w-10 align-middle">NO</th>
                        <HierarchyHeaderCells
                          cols={materialHierarchyCols}
                          cellClass="px-3 py-3 border-r border-slate-100 text-left border-b border-slate-200 align-middle"
                        />
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 text-left min-w-[120px] align-middle">KODE PART</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 text-left min-w-[140px] align-middle">NAMA PART</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 text-left min-w-[120px] align-middle">OPERASI</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 w-24 align-middle">TIPE</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 text-left min-w-[100px] align-middle">TAHAP</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 text-left min-w-[140px] align-middle">WC / LANGKAH</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 text-blue-600 w-16 align-middle">DURASI</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 text-amber-600 w-14 align-middle">ORG</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 w-20 align-middle">ORG·MNT</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 text-right min-w-[100px] align-middle">BIAYA WC</th>
                        <th rowSpan={2} className="px-3 py-3 border-r border-slate-100 text-right min-w-[100px] align-middle">BIAYA TK</th>
                        <th colSpan={3} className="px-2 py-2 border-r border-slate-200 border-b border-indigo-200 text-indigo-700 bg-indigo-50/40">SUBTOTAL BIAYA</th>
                        <th colSpan={3} className="px-2 py-2 border-r border-slate-200 border-b border-violet-200 text-violet-700 bg-violet-50/40">HARGA PRODUKSI (SATUAN)</th>
                        <th rowSpan={2} className="px-3 py-3 text-left min-w-[140px] align-middle">DETAIL</th>
                      </tr>
                      <tr className="bg-white border-b border-slate-200 text-[9px] font-extrabold uppercase text-slate-500">
                        <th colSpan={12 + hierarchyColCount} className="border-r border-slate-100" />
                        <th className="py-2 px-1.5 text-right text-indigo-700">IDR</th>
                        <th className="py-2 px-1.5 text-right text-amber-600">USD</th>
                        <th className="py-2 px-1.5 border-r border-slate-200 text-right text-brand-600">EUR</th>
                        <th className="py-2 px-1.5 text-right text-violet-700">IDR</th>
                        <th className="py-2 px-1.5 text-right text-violet-600">USD</th>
                        <th className="py-2 px-1.5 border-r border-slate-200 text-right text-violet-600">EUR</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody className="font-medium text-slate-700 divide-y divide-slate-100">
                      {prosesLineItems.length === 0 ? (
                        <tr>
                          <td colSpan={19 + hierarchyColCount} className="px-6 py-10 text-center text-slate-400 text-xs italic">
                            Belum ada operasi manufaktur — tambahkan proses pada part di tab Struktur atau buka Routing.
                          </td>
                        </tr>
                      ) : prosesLineItems.map((ln, i) => {
                        const partQty = partQtyByKode[ln.nodeKode] || 1;
                        const prodUnit = ln.biayaTotal / partQty;
                        const hierarchy = ln.nodeId
                          ? getPartHierarchyLabels(bomData, ln.nodeId)
                          : { modul: null, submodul: null, submodul2: null };
                        return (
                        <tr key={ln.key} className="hover:bg-slate-50 transition-colors align-top">
                          <td className="px-3 py-2.5 text-center border-r border-slate-100 text-slate-400 font-bold">{i + 1}</td>
                          <HierarchyBodyCells cols={materialHierarchyCols} hierarchy={hierarchy} compact />
                          <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-[10px] text-slate-500">{ln.nodeKode || '—'}</td>
                          <td className="px-3 py-2.5 border-r border-slate-100 font-bold text-slate-800 text-[11px]">{ln.nodeNama || '—'}</td>
                          <td className="px-3 py-2.5 border-r border-slate-100 font-bold text-slate-700">{ln.opNama || '—'}</td>
                          <td className="px-3 py-2.5 border-r border-slate-100 text-center">
                            <span className={`inline-block text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                              ln.inputMode === 'routing'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {ln.inputMode === 'routing' ? 'Routing' : 'Work Center'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-100 text-[10px] text-slate-500">{ln.mfgProcess || '—'}</td>
                          <td className="px-3 py-2.5 border-r border-slate-100">
                            {ln.stepUrutan != null ? (
                              <span className="font-bold text-indigo-700 text-[10px]">#{ln.stepUrutan} {ln.wcNama}</span>
                            ) : (
                              <span className="font-bold text-blue-700 text-[10px]">{ln.wcNama}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-100 text-center font-black text-blue-600">{ln.waktu} mnt</td>
                          <td className="px-3 py-2.5 border-r border-slate-100 text-center font-black text-amber-700">{ln.person}</td>
                          <td className="px-3 py-2.5 border-r border-slate-100 text-center text-[10px] text-slate-500">{ln.waktu * ln.person}</td>
                          <td className="px-3 py-2.5 border-r border-slate-100 text-right">
                            <MoneyText variant="mesin">Rp {formatIDR(ln.biayaMesin)}</MoneyText>
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-100 text-right font-bold text-emerald-700 tabular-nums">Rp {formatIDR(ln.biayaPekerja)}</td>
                          <td className="px-3 py-2.5 text-right font-black text-indigo-700 bg-indigo-50/10 tabular-nums">Rp {formatIDR(ln.biayaTotal)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-amber-700 tabular-nums text-[11px]">
                            {(ln.biayaTotal / kursUsd).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-100 text-right font-bold text-brand-700 tabular-nums text-[11px]">
                            {(ln.biayaTotal / kursEur).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-violet-700 tabular-nums text-[11px]">Rp {formatIDR(prodUnit)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-violet-600 tabular-nums text-[11px]">{(prodUnit / kursUsd).toFixed(2)}</td>
                          <td className="px-3 py-2.5 border-r border-slate-100 text-right font-bold text-violet-600 tabular-nums text-[11px]">{(prodUnit / kursEur).toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-left align-top">
                            {ln.inputMode === 'routing' && ln.stepUrutan === 1 ? (
                              <OperasiDetailCell operasi={ln.parentOp} operasiIndex={ln.opIndex} />
                            ) : (
                              <span className="text-[10px] text-slate-500">{ln.note || '—'}</span>
                            )}
                          </td>
                        </tr>
                      );})}
                    </tbody>
                    {prosesLineItems.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-[10px] font-black">
                        <tr>
                          <td colSpan={7 + hierarchyColCount} className="px-3 py-3 text-right uppercase tracking-widest text-slate-500">Total ({prosesLineItems.length} baris):</td>
                          <td className="px-3 py-3 text-center text-blue-600">{prosesLineTotals.waktu} mnt</td>
                          <td className="px-3 py-3 text-center text-amber-700">—</td>
                          <td className="px-3 py-3 text-center text-slate-600">{prosesLineTotals.personMinutes}</td>
                          <td className="px-3 py-3 text-right">
                            <MoneyText variant="mesin" className="font-black">Rp {formatIDR(prosesLineTotals.mesin)}</MoneyText>
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-700 tabular-nums">Rp {formatIDR(prosesLineTotals.pekerja)}</td>
                          <td className="px-3 py-3 text-right text-indigo-700 tabular-nums">Rp {formatIDR(prosesLineTotals.total)}</td>
                          <td className="px-3 py-3 text-right text-amber-700 tabular-nums">{(prosesLineTotals.total / kursUsd).toFixed(2)}</td>
                          <td className="px-3 py-3 border-r border-slate-100 text-right text-brand-700 tabular-nums">{(prosesLineTotals.total / kursEur).toFixed(2)}</td>
                          <td colSpan={3} />
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUMMARY KALKULASI */}
          {editorTab === 'summary' && (
            <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col scrollbar-hide">
              <div className="px-8 py-5 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10 sticky top-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-blue-600" /> Summary Kalkulasi Terpadu
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Rangkuman dimensi, harga material, faktor SF/WF, dan biaya operasi per komponen.
                      {summaryPartsOnly ? (
                        <span className="block text-[10px] text-amber-700 font-bold mt-1">
                          Tampilan daftar part — nonaktifkan semua kolom Modul/Submodul untuk pohon lengkap (MODUL → PART).
                        </span>
                      ) : (
                        <span className="block text-[10px] text-slate-400 mt-1">
                          Aktifkan kolom Modul/Submodul untuk merapikan tabel (hanya baris PART).
                        </span>
                      )}
                    </p>
                  </div>
                  <HierarchyColToggles cols={materialHierarchyCols} onToggle={toggleHierarchyCol} />
                </div>
              </div>
              <div className="px-8 py-4 bg-white border-b border-slate-200 shrink-0">
                <SummaryTotalCards fp={fp} totals={summaryTotals} />
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                   <thead className="bg-slate-100 border-b-2 border-slate-200 text-slate-500 font-extrabold uppercase text-[9px] tracking-widest text-center sticky top-0 z-10 shadow-sm">
                     <tr>
                       <th className="px-4 py-4 border-r border-slate-200 w-12">
                         {summaryPartsOnly ? 'NO' : 'REF'}
                       </th>
                       {summaryPartsOnly && (
                         <HierarchyHeaderCells
                           cols={materialHierarchyCols}
                           singleRow
                           cellClass="px-4 py-4 border-r border-slate-200 text-left"
                         />
                       )}
                       <th className="px-4 py-4 border-r border-slate-200 text-left min-w-[200px]">
                         {summaryPartsOnly ? 'NAMA PART' : 'HIERARKI & NAMA KOMPONEN'}
                       </th>
                       <th className="px-4 py-4 border-r border-slate-200 text-left">KODE MATERIAL</th>
                       <th className="px-4 py-4 border-r border-slate-200 w-16">QTY</th>
                       <th className="px-4 py-4 border-r border-slate-200">DIMENSI (W X D X H)</th>
                       <th className="px-4 py-4 border-r border-slate-200">VOLUME</th>
                       <th className="px-4 py-4 border-r border-slate-200 text-amber-600">SAFETY FACTOR (%)</th>
                       <th className="px-4 py-4 border-r border-slate-200 text-red-500">WASTE FACTOR (%)</th>
                       <th className="px-4 py-4 border-r border-slate-200 text-right">HARGA PART (IDR)</th>
                       <th className={`px-4 py-4 border-r border-slate-200 text-left ${summaryPartsOnly ? 'min-w-[480px]' : 'min-w-[640px]'}`}>
                         RINCIAN OPERASI PRODUKSI
                       </th>
                       <th className="px-4 py-4 text-right text-indigo-700 bg-indigo-50/50 min-w-[120px]">TOTAL BIAYA (IDR)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-200 bg-white">
                     {summaryTableNodes.map((node, rowIndex) => {
                       const d = node.data;
                       const isPart = d.tipe === 'PART';
                       const style = tipeStyles[d.tipe] || tipeStyles.PART;
                       const hierarchy = isPart
                         ? getPartHierarchyLabels(bomData, node.id)
                         : { modul: null, submodul: null, submodul2: null };
                       
                       const costRow = isPart ? computePartCostRow(d) : null;
                       const sf = costRow ? costRow.sf : '';
                       const wf = costRow ? costRow.wf : '';
                       const adjustedMatCost = costRow?.matAdjusted ?? 0;

                       let totalOpWaktu = 0;
                       let totalOpMesin = 0;
                       let totalOpPekerja = 0;

                       if (isPart && costRow) {
                         totalOpWaktu = costRow.waktu;
                         totalOpMesin = costRow.mesin + costRow.wc;
                         totalOpPekerja = costRow.pekerja;
                       }
                       const totalOpCost = costRow?.prosesTotal ?? 0;
                       const grandTotalRow = costRow?.biayaProduksi ?? 0;
                       const prosesList = isPart ? expandProsesList(d) : [];

                       return (
                         <tr
                           key={node.id}
                           className={`hover:bg-slate-50/50 transition-colors align-top ${!isPart ? 'bg-slate-50/40' : ''}`}
                         >
                           <td className="px-4 py-3 border-r border-slate-100 text-center">
                             {summaryPartsOnly ? (
                               <div className="flex flex-col items-center gap-1">
                                 <span className="text-slate-400 font-bold text-[10px]">{rowIndex + 1}</span>
                                 <button
                                   type="button"
                                   onClick={() => setDetailSummaryNode(node)}
                                   className="p-1 bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                   title="Detail summary"
                                 >
                                   <QrCode className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             ) : (
                               <button
                                 type="button"
                                 onClick={() => setDetailSummaryNode(node)}
                                 className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                 title="Lihat Detail Summary"
                               >
                                 <QrCode className="w-4 h-4" />
                               </button>
                             )}
                           </td>
                           {summaryPartsOnly && (
                             <HierarchyBodyCells cols={materialHierarchyCols} hierarchy={hierarchy} />
                           )}
                           <td className="px-4 py-3 border-r border-slate-100">
                             {summaryPartsOnly ? (
                               <span className="font-black text-slate-800 text-sm whitespace-normal leading-tight">
                                 {d.nama}
                               </span>
                             ) : (
                               <div className="flex items-start" style={{ paddingLeft: `${node.level * 16}px` }}>
                                 <div className="flex flex-col gap-1">
                                   <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border w-max ${style.pill}`}>
                                     {d.tipe}
                                   </span>
                                   <span className="font-black text-slate-800 text-sm whitespace-normal leading-tight">{d.nama}</span>
                                 </div>
                               </div>
                             )}
                           </td>
                           <td className="px-4 py-3 border-r border-slate-100 font-mono text-slate-500">
                             {isPart ? d.kode : <span className="text-slate-300">—</span>}
                           </td>
                           <td className="px-4 py-3 border-r border-slate-100 text-center font-black text-slate-700">
                             {isPart ? d.qty : '—'}
                           </td>
                           <td className="px-4 py-3 border-r border-slate-100 text-center text-slate-600 font-bold">
                             {isPart && d.p && d.l && d.t ? `${d.p} x ${d.l} x ${d.t}` : isPart ? '—' : '—'}
                           </td>
                           <td className="px-4 py-3 border-r border-slate-100 text-center font-bold text-blue-600 bg-blue-50/10">
                             {isPart && d.vol ? `${d.vol} m³` : <span className="text-slate-300 font-normal">—</span>}
                           </td>
                           <td className="px-4 py-3 border-r border-slate-100 text-center">
                             {isPart ? (
                               <input
                                 type="number"
                                 value={sf}
                                 onChange={(e) => handleUpdateNode(node.id, 'sf', e.target.value)}
                                 className="w-14 text-center border border-amber-200 text-amber-700 bg-amber-50 rounded px-1 py-1 outline-none focus:border-amber-400 font-bold text-xs"
                               />
                             ) : (
                               <span className="text-slate-300">—</span>
                             )}
                           </td>
                           <td className="px-4 py-3 border-r border-slate-100 text-center">
                             {isPart ? (
                               <input
                                 type="number"
                                 value={wf}
                                 onChange={(e) => handleUpdateNode(node.id, 'wf', e.target.value)}
                                 className="w-14 text-center border border-red-200 text-red-600 bg-red-50 rounded px-1 py-1 outline-none focus:border-red-400 font-bold text-xs"
                               />
                             ) : (
                               <span className="text-slate-300">—</span>
                             )}
                           </td>
                           <td className="px-4 py-3 border-r border-slate-100 text-right font-bold text-slate-800">
                             {isPart ? (
                               <MoneyText variant="matIdr">Rp {formatIDR(d.biaya || 0)}</MoneyText>
                             ) : (
                               <span className="text-slate-300">—</span>
                             )}
                           </td>
                           
                           {/* Nested Table Rincian Operasi */}
                           <td className="p-0 border-r border-slate-100 align-top bg-slate-50/30">
                             {!isPart ? (
                               <div className="px-4 py-3 text-center text-[10px] text-slate-300">—</div>
                             ) : prosesList.length > 0 ? (
                               <div className="w-full">
                                 <table className="w-full text-left text-[9px]">
                                   <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold">
                                     <tr>
                                       <th className="px-3 py-2 text-center w-16 border-r border-slate-200">Visual Posisi</th>
                                       <th className="px-3 py-2 text-center border-r border-slate-200 w-20">Proses</th>
                                       <th className="px-3 py-2 border-r border-slate-200 min-w-[120px]">Tahap & Nama Operasi</th>
                                       <th className="px-3 py-2 text-center border-r border-slate-200 w-20">Durasi Waktu</th>
                                       <th className="px-3 py-2 text-right border-r border-slate-200 w-28">Work Center (Mesin)</th>
                                       <th className="px-3 py-2 text-right border-r border-slate-200 w-28">Jumlah Pekerja & Biaya</th>
                                       <th className="px-3 py-2 border-r border-slate-200 min-w-[11rem] text-left">Detail</th>
                                       <th className="px-3 py-2 text-right w-24">Subtotal</th>
                                     </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-100">
                                     {prosesList.map((p, idx) => {
                                        const { waktu: w, person, mesin: bMesin, pekerja: bPekerja, rate, ratePekerja } = calcProsesCosts(p);
                                        const rowSubtotal = bMesin + bPekerja;
                                        return (
                                          <tr key={idx} className="bg-white hover:bg-blue-50/30">
                                            <td className="px-3 py-2 border-r border-slate-100 text-center">
                                              <div className="w-8 h-8 rounded border border-slate-200 mx-auto overflow-hidden bg-slate-50 mb-1">
                                                {p.gambar ? <img src={p.gambar} alt="posisi" className="w-full h-full object-cover"/> : <ImageIcon className="w-3 h-3 text-slate-300 mx-auto mt-2.5"/>}
                                              </div>
                                              <span className="text-[7px] font-black uppercase text-indigo-600 tracking-widest">{p.posisiOperasi || '-'}</span>
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-100 text-center align-middle">
                                              <span className="inline-block text-[8px] font-black uppercase tracking-wide text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                {prosesTypeLabel(p)}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-100">
                                              <div className="font-bold text-slate-800 text-[10px] mb-0.5 flex flex-wrap items-center gap-1">
                                                {p.nama}
                                                {p.inputMode === 'routing' && (
                                                  <span className="text-[7px] font-black uppercase px-1 py-px rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                    RT{p.routingSteps?.length ? ` · ${p.routingSteps.length}` : ''}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[8px] font-bold text-slate-400 bg-slate-100 inline-block px-1.5 py-0.5 rounded">{p.mfgProcess || '-'}</div>
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-blue-600">{w} Min</td>
                                            <td className="px-3 py-2 border-r border-slate-100 text-right">
                                              <div className="text-[7px] text-slate-400 mb-0.5">Rate: Rp {formatIDR(rate)} / mnt</div>
                                              <MoneyText variant="mesin" className="text-[10px]">Rp {formatIDR(bMesin)}</MoneyText>
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-100 text-right">
                                              <div className="font-black text-amber-600 text-[10px]">{person} org</div>
                                              <div className="text-[7px] text-slate-400 mt-0.5">@ Rp {formatIDR(ratePekerja || LABOR_RATE_PER_MIN)} / mnt</div>
                                              <div className="font-bold text-emerald-700 text-[10px] mt-0.5">Rp {formatIDR(bPekerja)}</div>
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-100 text-left align-top">
                                              <OperasiDetailCell operasi={p} operasiIndex={idx} />
                                            </td>
                                            <td className="px-3 py-2 text-right font-black text-indigo-700 bg-indigo-50/10">Rp {formatIDR(rowSubtotal)}</td>
                                          </tr>
                                        )
                                     })}
                                   </tbody>
                                   <tfoot className="bg-slate-50 border-t border-slate-200">
                                     <tr>
                                       <td colSpan={3} className="px-3 py-2 text-right font-black text-slate-500 uppercase tracking-widest">TOTAL ALOKASI OPERASI:</td>
                                       <td className="px-3 py-2 text-center font-black text-blue-600">{totalOpWaktu} Min</td>
                                       <td className="px-3 py-2 text-right">
                                         <MoneyText variant="mesin" className="font-black">Rp {formatIDR(totalOpMesin)}</MoneyText>
                                       </td>
                                       <td className="px-3 py-2 text-right font-black text-emerald-700">Rp {formatIDR(totalOpPekerja)}</td>
                                       <td className="px-3 py-2 border-r border-slate-100" />
                                       <td className="px-3 py-2 text-right font-black text-indigo-700">Rp {formatIDR(totalOpCost)}</td>
                                     </tr>
                                   </tfoot>
                                 </table>
                               </div>
                             ) : (
                               <div className={`flex items-center justify-center ${summaryPartsOnly ? 'px-3 py-2' : 'p-4'}`}>
                                 <span
                                   className="text-[10px] text-slate-400 font-medium flex items-center gap-1"
                                   title="Belum ada data operasi produksi"
                                 >
                                   <AlertTriangle className="w-3 h-3 shrink-0" />
                                   {summaryPartsOnly ? 'Tanpa operasi' : 'Belum ada data operasi manufaktur yang didaftarkan'}
                                 </span>
                               </div>
                             )}
                           </td>

                           <td className="px-4 py-3 text-right font-black text-indigo-700 bg-indigo-50/30 text-sm align-middle">
                             {isPart ? (
                               <MoneyText variant="total">Rp {formatIDR(grandTotalRow)}</MoneyText>
                             ) : (
                               <span className="text-slate-300">—</span>
                             )}
                           </td>
                         </tr>
                       )
                     })}
                   </tbody>
                 </table>
              </div>
            </div>
          )}

          {/* TAB 6: ERP REFERENSI (JURNAL) */}
          {editorTab === 'erp' && (() => {
            // KALKULASI DATA ERP BASE DARI BOM
            let countModul = 0, countSubmodul = 0, countSubmodul2 = 0, countPart = 0;
            let basePartCost = 0;
            
            flatNodes.forEach(n => {
              const t = n.data.tipe;
              if (t === 'MODUL') countModul++;
              else if (t === 'SUBMODUL') countSubmodul++;
              else if (t === 'SUBMODUL 2') countSubmodul2++;
              else if (t === 'PART') {
                countPart++;
                basePartCost += (n.data.biaya || 0) * (n.data.qty || 1);
              }
            });

            let baseMachineCost = 0;
            let baseMachineTime = 0;
            let baseWorkerCost = 0;
            let baseWorkerTime = 0;

            allProses.forEach(p => {
              const c = calcProsesCosts(p);
              baseMachineTime += c.waktu;
              baseMachineCost += c.mesin;
              baseWorkerTime += c.waktu;
              baseWorkerCost += c.pekerja;
            });

            const totalProsesCount = allProses.length;

            // KALKULASI DATA CUSTOM
            const customPartCost = (customErp.parts || []).reduce((sum, item) => sum + ((Number(item.qty)||0) * (Number(item.rate)||0)), 0);
            const customMachineCost = (customErp.machines || []).reduce((sum, item) => sum + ((Number(item.waktu)||0) * (Number(item.rate)||0)), 0);
            const customWorkerCost = (customErp.workers || []).reduce((sum, item) => sum + ((Number(item.waktu)||0) * (Number(item.person)||0) * (Number(item.rate)||0)), 0);

            // GRAND TOTAL
            const grandPart = basePartCost + customPartCost;
            const grandMachine = baseMachineCost + customMachineCost;
            const grandWorker = baseWorkerCost + customWorkerCost;
            const grandTotalErp = grandPart + grandMachine + grandWorker;

            return (
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f1f5f9] flex flex-col gap-6 scrollbar-hide">
                
                {/* Header ERP */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-indigo-600"/> ERP Referensi Jurnal Produksi
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Rekapitulasi total hirarki BOM, kebutuhan material, beban mesin, dan proyeksi beban gaji karyawan (Man Power). Anda dapat menambahkan entri *custom* sebagai penyesuaian aktual.</p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-xl flex flex-col justify-center text-right shrink-0">
                    <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest mb-0.5">Grand Total Estimasi (HPP)</span>
                    <span className="text-2xl font-black text-indigo-700 leading-none">Rp {formatIDR(grandTotalErp)}</span>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                      <Network className="w-4 h-4 text-slate-500"/> Hirarki BOM
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-2xl font-black text-slate-700">{flatNodes.length}</span>
                        <span className="text-[10px] font-bold text-slate-500">Total Nodes</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm hover:border-amber-300 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-500 uppercase tracking-widest mb-3">
                      <div className="flex items-center gap-2"><Package className="w-4 h-4"/> Material Part</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-black text-amber-700">Rp {formatIDR(grandPart)}</span>
                      <span className="text-[10px] font-bold text-amber-600/70">Base: Rp {formatIDR(basePartCost)} | Custom: Rp {formatIDR(customPartCost)}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-blue-500 uppercase tracking-widest mb-3">
                      <div className="flex items-center gap-2"><Server className="w-4 h-4"/> Beban Mesin</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-black text-blue-700">Rp {formatIDR(grandMachine)}</span>
                      <span className="text-[10px] font-bold text-blue-600/70">Base: Rp {formatIDR(baseMachineCost)} | Custom: Rp {formatIDR(customMachineCost)}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest mb-3">
                      <div className="flex items-center gap-2"><Users className="w-4 h-4"/> Gaji Karyawan</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-black text-emerald-700">Rp {formatIDR(grandWorker)}</span>
                      <span className="text-[10px] font-bold text-emerald-600/70">Base: Rp {formatIDR(baseWorkerCost)} | Custom: Rp {formatIDR(customWorkerCost)}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-purple-200 p-5 shadow-sm hover:border-purple-300 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-purple-500 uppercase tracking-widest mb-3">
                      <div className="flex items-center gap-2"><Activity className="w-4 h-4"/> Work Proses</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-black text-purple-700">{totalProsesCount + customErp.machines.length + customErp.workers.length}</span>
                      <span className="text-[10px] font-bold text-purple-600/70">Total Registrasi Operasi & Custom</span>
                    </div>
                  </div>
                </div>

                {/* DETAIL SECTIONS */}
                <div className="flex flex-col gap-6">
                  
                  {/* SECTION 1: HIRARKI */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">1. Rincian Hirarki Struktur (BOM)</h4>
                    </div>
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Modul Utama</span>
                        <span className="text-3xl font-black text-blue-700">{countModul}</span>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Submodul</span>
                        <span className="text-3xl font-black text-amber-700">{countSubmodul}</span>
                      </div>
                      <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-4 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Submodul 2</span>
                        <span className="text-3xl font-black text-purple-700">{countSubmodul2}</span>
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Part / Material Dasar</span>
                        <span className="text-3xl font-black text-emerald-700">{countPart}</span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: KEBUTUHAN PART */}
                  <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/30 flex justify-between items-center">
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-2"><Package className="w-4 h-4"/> 2. Rincian Kebutuhan Part & Material</h4>
                      <button onClick={() => handleAddCustomErp('parts')} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                        <Plus className="w-3.5 h-3.5"/> Tambah Custom Part
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-6 py-3 w-16 text-center">Tipe</th>
                            <th className="px-6 py-3">Deskripsi / Nama Part</th>
                            <th className="px-6 py-3 text-center">Qty</th>
                            <th className="px-6 py-3 text-right">Harga Satuan (IDR)</th>
                            <th className="px-6 py-3 text-right">Subtotal (IDR)</th>
                            <th className="px-6 py-3 w-16 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="font-medium text-slate-700">
                          {/* BASE PARTS */}
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <td className="px-6 py-3 text-center"><span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold">SYSTEM</span></td>
                            <td className="px-6 py-3 font-bold text-slate-600 italic">Akumulasi Seluruh Part BOM ({countPart} Item)</td>
                            <td className="px-6 py-3 text-center text-slate-400">-</td>
                            <td className="px-6 py-3 text-right text-slate-400">-</td>
                            <td className="px-6 py-3 text-right font-black text-amber-600">Rp {formatIDR(basePartCost)}</td>
                            <td className="px-6 py-3 text-center">-</td>
                          </tr>
                          {/* CUSTOM PARTS */}
                          {customErp.parts.map((c, idx) => (
                            <tr key={c.id} className="border-b border-slate-100 bg-amber-50/10">
                              <td className="px-6 py-3 text-center"><span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded text-[9px] font-bold">CUSTOM</span></td>
                              <td className="px-6 py-2">
                                <input type="text" value={c.nama} onChange={e => handleUpdateCustomErp('parts', c.id, 'nama', e.target.value)} placeholder="Nama Part / Material Tambahan" className="w-full border border-slate-200 rounded px-2 py-1.5 focus:border-amber-400 outline-none text-xs font-bold" />
                              </td>
                              <td className="px-6 py-2 text-center">
                                <input type="number" value={c.qty} onChange={e => handleUpdateCustomErp('parts', c.id, 'qty', e.target.value)} className="w-20 border border-slate-200 rounded px-2 py-1.5 focus:border-amber-400 outline-none text-xs font-bold text-center" />
                              </td>
                              <td className="px-6 py-2 text-right">
                                <input type="number" value={c.rate} onChange={e => handleUpdateCustomErp('parts', c.id, 'rate', e.target.value)} placeholder="0" className="w-32 border border-slate-200 rounded px-2 py-1.5 focus:border-amber-400 outline-none text-xs font-bold text-right" />
                              </td>
                              <td className="px-6 py-3 text-right font-black text-amber-700">Rp {formatIDR((Number(c.qty)||0) * (Number(c.rate)||0))}</td>
                              <td className="px-6 py-2 text-center">
                                <button onClick={() => handleDeleteCustomErp('parts', c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-amber-50 border-t-2 border-amber-200">
                          <tr>
                            <td colSpan={4} className="px-6 py-3 text-right font-black text-amber-800 uppercase text-[10px] tracking-widest">TOTAL KEBUTUHAN PART:</td>
                            <td className="px-6 py-3 text-right font-black text-amber-700 text-sm">Rp {formatIDR(grandPart)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* SECTION 3: BEBAN MESIN */}
                  <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-blue-100 bg-blue-50/30 flex justify-between items-center">
                      <h4 className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-2"><Server className="w-4 h-4"/> 3. Rincian Beban Work Center (Mesin)</h4>
                      <button onClick={() => handleAddCustomErp('machines')} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                        <Plus className="w-3.5 h-3.5"/> Tambah Custom Mesin
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-6 py-3 w-16 text-center">Tipe</th>
                            <th className="px-6 py-3">Deskripsi Operasi Mesin</th>
                            <th className="px-6 py-3 text-center">Waktu (Mnt)</th>
                            <th className="px-6 py-3 text-right">Rate/Mnt (IDR)</th>
                            <th className="px-6 py-3 text-right">Subtotal Biaya (IDR)</th>
                            <th className="px-6 py-3 w-16 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="font-medium text-slate-700">
                          {/* BASE MACHINE */}
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <td className="px-6 py-3 text-center"><span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold">SYSTEM</span></td>
                            <td className="px-6 py-3 font-bold text-slate-600 italic">Akumulasi Proses Mesin BOM ({totalProsesCount} Operasi)</td>
                            <td className="px-6 py-3 text-center font-bold text-slate-600">{baseMachineTime} Mnt</td>
                            <td className="px-6 py-3 text-right text-slate-400">Fixed/System</td>
                            <td className="px-6 py-3 text-right font-black text-blue-600">Rp {formatIDR(baseMachineCost)}</td>
                            <td className="px-6 py-3 text-center">-</td>
                          </tr>
                          {/* CUSTOM MACHINE */}
                          {customErp.machines.map((c, idx) => (
                            <tr key={c.id} className="border-b border-slate-100 bg-blue-50/10">
                              <td className="px-6 py-3 text-center"><span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-[9px] font-bold">CUSTOM</span></td>
                              <td className="px-6 py-2">
                                <input type="text" value={c.nama} onChange={e => handleUpdateCustomErp('machines', c.id, 'nama', e.target.value)} placeholder="Nama Operasi Tambahan" className="w-full border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 outline-none text-xs font-bold" />
                              </td>
                              <td className="px-6 py-2 text-center">
                                <input type="number" value={c.waktu} onChange={e => handleUpdateCustomErp('machines', c.id, 'waktu', e.target.value)} className="w-20 border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 outline-none text-xs font-bold text-center" />
                              </td>
                              <td className="px-6 py-2 text-right">
                                <input type="number" value={c.rate} onChange={e => handleUpdateCustomErp('machines', c.id, 'rate', e.target.value)} placeholder="0" className="w-32 border border-slate-200 rounded px-2 py-1.5 focus:border-blue-400 outline-none text-xs font-bold text-right" />
                              </td>
                              <td className="px-6 py-3 text-right font-black text-blue-700">Rp {formatIDR((Number(c.waktu)||0) * (Number(c.rate)||0))}</td>
                              <td className="px-6 py-2 text-center">
                                <button onClick={() => handleDeleteCustomErp('machines', c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                          <tr>
                            <td colSpan={4} className="px-6 py-3 text-right font-black text-blue-800 uppercase text-[10px] tracking-widest">TOTAL BEBAN MESIN:</td>
                            <td className="px-6 py-3 text-right font-black text-blue-700 text-sm">Rp {formatIDR(grandMachine)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* SECTION 4: GAJI KARYAWAN */}
                  <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/30 flex justify-between items-center">
                      <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2"><Briefcase className="w-4 h-4"/> 4. Rincian Beban Karyawan (Man Power)</h4>
                      <button onClick={() => handleAddCustomErp('workers')} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                        <Plus className="w-3.5 h-3.5"/> Tambah Custom Karyawan
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-6 py-3 w-16 text-center">Tipe</th>
                            <th className="px-6 py-3">Deskripsi Pekerjaan / Lembur</th>
                            <th className="px-6 py-3 text-center">Jumlah Org</th>
                            <th className="px-6 py-3 text-center">Waktu (Mnt)</th>
                            <th className="px-6 py-3 text-right">Rate/Org/Mnt (IDR)</th>
                            <th className="px-6 py-3 text-right">Subtotal Biaya (IDR)</th>
                            <th className="px-6 py-3 w-16 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="font-medium text-slate-700">
                          {/* BASE WORKER */}
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <td className="px-6 py-3 text-center"><span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold">SYSTEM</span></td>
                            <td className="px-6 py-3 font-bold text-slate-600 italic">Akumulasi Proses Karyawan BOM</td>
                            <td className="px-6 py-3 text-center text-slate-400">Variatif</td>
                            <td className="px-6 py-3 text-center font-bold text-slate-600">{baseWorkerTime} Mnt</td>
                            <td className="px-6 py-3 text-right text-slate-400">Fixed/System</td>
                            <td className="px-6 py-3 text-right font-black text-emerald-600">Rp {formatIDR(baseWorkerCost)}</td>
                            <td className="px-6 py-3 text-center">-</td>
                          </tr>
                          {/* CUSTOM WORKER */}
                          {customErp.workers.map((c, idx) => (
                            <tr key={c.id} className="border-b border-slate-100 bg-emerald-50/10">
                              <td className="px-6 py-3 text-center"><span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-bold">CUSTOM</span></td>
                              <td className="px-6 py-2">
                                <input type="text" value={c.nama} onChange={e => handleUpdateCustomErp('workers', c.id, 'nama', e.target.value)} placeholder="Misal: Lembur / Pekerja Lepas" className="w-full border border-slate-200 rounded px-2 py-1.5 focus:border-emerald-400 outline-none text-xs font-bold" />
                              </td>
                              <td className="px-6 py-2 text-center">
                                <input type="number" value={c.person} onChange={e => handleUpdateCustomErp('workers', c.id, 'person', e.target.value)} className="w-16 border border-slate-200 rounded px-2 py-1.5 focus:border-emerald-400 outline-none text-xs font-bold text-center" />
                              </td>
                              <td className="px-6 py-2 text-center">
                                <input type="number" value={c.waktu} onChange={e => handleUpdateCustomErp('workers', c.id, 'waktu', e.target.value)} className="w-20 border border-slate-200 rounded px-2 py-1.5 focus:border-emerald-400 outline-none text-xs font-bold text-center" />
                              </td>
                              <td className="px-6 py-2 text-right">
                                <input type="number" value={c.rate} onChange={e => handleUpdateCustomErp('workers', c.id, 'rate', e.target.value)} placeholder="0" className="w-32 border border-slate-200 rounded px-2 py-1.5 focus:border-emerald-400 outline-none text-xs font-bold text-right" />
                              </td>
                              <td className="px-6 py-3 text-right font-black text-emerald-700">Rp {formatIDR((Number(c.waktu)||0) * (Number(c.person)||0) * (Number(c.rate)||0))}</td>
                              <td className="px-6 py-2 text-center">
                                <button onClick={() => handleDeleteCustomErp('workers', c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
                          <tr>
                            <td colSpan={5} className="px-6 py-3 text-right font-black text-emerald-800 uppercase text-[10px] tracking-widest">TOTAL GAJI KARYAWAN:</td>
                            <td className="px-6 py-3 text-right font-black text-emerald-700 text-sm">Rp {formatIDR(grandWorker)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* TAB 7: DETAIL COGS & PRICING */}
          {editorTab === 'cogs' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 bg-page gap-4 scrollbar-hide">
              {/* Konfigurasi — bisa dilipat agar checklist/waterfall lebih tinggi di viewport */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCogsConfigOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80 text-left transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {cogsConfigOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-black text-slate-800 uppercase tracking-wide truncate">
                      Pembentukan COGS & Harga Jual
                    </span>
                  </span>
                  <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-2 shadow-sm shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] font-black uppercase tracking-wider">FOB</span>
                      <span className="text-base font-black leading-none tabular-nums">
                        Rp {formatIDR(Math.floor(cogsData.sellingPrice / 1000) * 1000)}
                      </span>
                    </div>
                  </div>
                </button>

                {cogsConfigOpen && (
                <div className="px-4 pb-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-500 mt-3 mb-3 font-medium">
                  Packing, overhead, dan markup — mempengaruhi waterfall & deviasi di bawah.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {/* Packing Selector */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Jalur Packing (Fisik)</label>
                    <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                      <button 
                        onClick={() => setCogsConfig(p => ({ ...p, packingJalur: 'BOX' }))} 
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${cogsConfig.packingJalur === 'BOX' ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        Karton / BOX
                      </button>
                      <button 
                        onClick={() => setCogsConfig(p => ({ ...p, packingJalur: 'SF' }))} 
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${cogsConfig.packingJalur === 'SF' ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        Single Face (Inner)
                      </button>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 leading-tight">Mempengaruhi komponen biaya packing di level Production Cost.</div>
                  </div>

                  {/* Packing Costs Input */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Biaya Packing (Material + Tenaga)</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <span className="bg-slate-100 px-2 py-1.5 border-r border-slate-200 w-12 text-center text-[10px]">BOX</span>
                        <input type="text" value={`Rp ${formatIDR(packBoxMat + packBoxLab)}`} disabled className="w-full px-3 py-1.5 text-right bg-slate-50 cursor-not-allowed text-blue-700 font-black" title="Terakumulasi otomatis dari tab Spesifikasi Packing" />
                      </div>
                      <div className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <span className="bg-slate-100 px-2 py-1.5 border-r border-slate-200 w-12 text-center text-[10px]">INNER</span>
                        <input type="text" value={`Rp ${formatIDR(packSfMat + packSfLab)}`} disabled className="w-full px-3 py-1.5 text-right bg-slate-50 cursor-not-allowed text-emerald-700 font-black" title="Terakumulasi otomatis dari tab Spesifikasi Packing" />
                      </div>
                    </div>
                  </div>

                  {/* Overheads */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">2. Overhead Produksi</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100">
                        <span className="bg-slate-100 px-2 py-1.5 border-r border-slate-200 flex-1 text-[10px]">Factory OH (%)</span>
                        <input type="number" value={cogsConfig.factoryOhPct} onChange={e => setCogsConfig(p => ({ ...p, factoryOhPct: e.target.value }))} className="w-16 px-2 py-1.5 text-center outline-none text-blue-700 font-black" />
                      </div>
                      <div className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100">
                        <span className="bg-slate-100 px-2 py-1.5 border-r border-slate-200 flex-1 text-[10px]">Mgmt OH (%)</span>
                        <input type="number" value={cogsConfig.managementOhPct} onChange={e => setCogsConfig(p => ({ ...p, managementOhPct: e.target.value }))} className="w-16 px-2 py-1.5 text-center outline-none text-blue-700 font-black" />
                      </div>
                    </div>
                  </div>

                  {/* FOB Export */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FOB Export (DATA BASE)</label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cogsConfig.includeFobExport === true || cogsConfig.includeFobExport === 'true'}
                        onChange={(e) =>
                          setCogsConfig((p) => ({ ...p, includeFobExport: e.target.checked }))
                        }
                        className="rounded border-slate-300"
                      />
                      Aktifkan biaya FOB
                    </label>
                    <select
                      value={cogsConfig.exportContainer || '20foot'}
                      disabled={!(cogsConfig.includeFobExport === true || cogsConfig.includeFobExport === 'true')}
                      onChange={(e) => setCogsConfig((p) => ({ ...p, exportContainer: e.target.value }))}
                      className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                    >
                      <option value="20foot">20 FT — Rp 500.000/m³</option>
                      <option value="40foot">40 FT — Rp 300.000/m³</option>
                      <option value="40hc">40 HC — Rp 300.000/m³</option>
                    </select>
                    <div className="text-[9px] text-slate-400 leading-tight">
                      Vol packing: {volBoxPacking.toFixed(4)} m³
                      {cogsData.fobExportCost > 0 && (
                        <span className="block text-violet-600 font-bold">
                          FOB: Rp {formatIDR(cogsData.fobExportCost)} ({formatIDR(cogsData.fobDetail?.fobPerM3)}/m³)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing / Markup */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">3. Pricing / Markup</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex flex-1 items-center text-xs font-bold text-slate-600 bg-emerald-50 border border-emerald-200 rounded-lg overflow-hidden shadow-sm focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-100">
                        <span className="bg-emerald-100 px-3 py-2 border-r border-emerald-200 flex-1 text-[11px] text-emerald-800">Target Markup (%)</span>
                        <input
                          type="number"
                          value={cogsConfig.markupPct}
                          onChange={(e) => setCogsConfig((p) => ({ ...p, markupPct: e.target.value }))}
                          className="w-20 px-2 py-2 text-center outline-none text-emerald-700 font-black bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMarkupPreview(true)}
                        className="shrink-0 px-3 py-2 rounded-lg border border-emerald-200 bg-white text-emerald-700 text-[10px] font-black uppercase tracking-wide hover:bg-emerald-50 flex items-center gap-1.5 shadow-sm"
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> Preview
                      </button>
                    </div>
                  </div>
                </div>
                </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowExcelChecklistModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 text-xs font-black uppercase tracking-wide hover:bg-indigo-100 shadow-sm transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Detail
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] tabular-nums ${
                      excelParityAudit.summary.fail === 0 && excelParityAudit.summary.score >= 85
                        ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                        : 'bg-amber-100 border-amber-200 text-amber-900'
                    }`}
                  >
                    {excelParityAudit.summary.score}%
                  </span>
                  {excelParityAudit.summary.fail > 0 && (
                    <span className="text-[10px] font-bold text-red-600 normal-case tracking-normal">
                      {excelParityAudit.summary.fail} belum
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCogsInsightModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-800 text-xs font-black uppercase tracking-wide hover:bg-violet-100 shadow-sm transition-colors"
                >
                  <PieChart className="w-4 h-4" />
                  View Deviasi
                  {cogsInsight?.excelCompare?.totalCogs?.status ? (
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] uppercase ${
                        cogsInsight.excelCompare.totalCogs.status === 'pass'
                          ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                          : cogsInsight.excelCompare.totalCogs.status === 'warn'
                            ? 'bg-amber-100 border-amber-200 text-amber-900'
                            : cogsInsight.excelCompare.totalCogs.status === 'fail'
                              ? 'bg-red-100 border-red-200 text-red-800'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      {cogsInsight.excelCompare.totalCogs.status}
                    </span>
                  ) : null}
                </button>
                <span className="text-[10px] text-slate-500 font-medium">
                  Checklist pengganti Excel — verifikasi parity SUMMARY COST
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 max-h-[min(420px,50vh)] xl:max-h-[min(520px,58vh)] shrink-0">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center gap-2 shrink-0">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Langkah Demi Langkah Pembentukan COGS
                  </h3>
                </div>
                <div className="overflow-auto flex-1 min-h-0 scrollbar-hide">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold tracking-widest">
                      <tr>
                        <th className="px-6 py-3 w-16 text-center">Step</th>
                        <th className="px-6 py-3 min-w-[200px]">Komponen Cost</th>
                        <th className="px-6 py-3 min-w-[250px]">Sumber & Referensi (Formula)</th>
                        <th className="px-6 py-3 text-right text-indigo-700">Nilai Akumulasi (IDR)</th>
                        <th className="px-6 py-3 text-right">Running Total (IDR)</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-medium text-slate-700">
                      {/* Step 1: Raw Material */}
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-center font-black text-slate-400">1</td>
                        <td className="px-6 py-4 font-bold text-slate-800">Bahan Baku & Material (RAW)</td>
                        <td className="px-6 py-4 text-[10px] text-slate-500 leading-tight">Harga Part × Qty + Penyesuaian SF/WF<br/><span className="text-blue-500 font-bold">Engine BOM Rollup</span></td>
                        <td className="px-6 py-4 text-right">
                          <MoneyText variant="matIdr" className="font-black">Rp {formatIDR(cogsData.totalMaterial)}</MoneyText>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <MoneyText variant="matIdr" className="font-semibold opacity-80">Rp {formatIDR(cogsData.totalMaterial)}</MoneyText>
                        </td>
                      </tr>

                      {/* Step 2: Factory Processing */}
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-center font-black text-slate-400">2</td>
                        <td className="px-6 py-4 font-bold text-slate-800">Proses Pabrik (Work Center & Labor)</td>
                        <td className="px-6 py-4 text-[10px] text-slate-500 leading-tight">Total Waktu × (Tarif Mesin + Upah Karyawan)<br/><span className="text-blue-500 font-bold">Costing Studio (Proses)</span></td>
                        <td className="px-6 py-4 text-right">
                          <MoneyText variant="prodIdr" className="font-black">+ Rp {formatIDR(cogsData.totalProcess)}</MoneyText>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <MoneyText variant="prodIdr" className="font-semibold opacity-80">Rp {formatIDR(cogsData.totalMaterial + cogsData.totalProcess)}</MoneyText>
                        </td>
                      </tr>

                      {/* Step 3: Packing */}
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50 bg-blue-50/10">
                        <td className="px-6 py-4 text-center font-black text-blue-400">3</td>
                        <td className="px-6 py-4 font-bold text-blue-900">
                          Biaya Packing <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] ml-2 tracking-wider">{cogsConfig.packingJalur}</span>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-slate-500 leading-tight">
                          Material {cogsConfig.packingJalur === 'BOX' ? 'Karton Luar' : 'Single Face'} + Tenaga Packing<br/>
                          <span className="text-blue-500 font-bold text-[9px]">Material: Rp {formatIDR(cogsData.packingMat)} | Labor: Rp {formatIDR(cogsData.packingLab)}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-blue-700">+ Rp {formatIDR(cogsData.packingCost)}</td>
                        <td className="px-6 py-4 text-right font-bold text-blue-400">Rp {formatIDR(cogsData.productionCost)}</td>
                      </tr>

                      {cogsData.fobExportCost > 0 && (
                        <tr className="border-b border-slate-100 hover:bg-slate-50/50 bg-violet-50/10">
                          <td className="px-6 py-4 text-center font-black text-violet-400">3b</td>
                          <td className="px-6 py-4 font-bold text-violet-900">
                            Biaya FOB Export{' '}
                            <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-[9px] ml-2">
                              {cogsData.fobDetail?.containerLabel || cogsConfig.exportContainer}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[10px] text-slate-500 leading-tight">
                            {formatIDR(cogsData.fobDetail?.fobPerM3)}/m³ × vol packing {volBoxPacking.toFixed(4)} m³
                            <br />
                            <span className="text-violet-600 font-bold text-[9px]">DATA BASE FOB COST — rounded per m³</span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-violet-700">
                            + Rp {formatIDR(cogsData.fobExportCost)}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-violet-400">
                            Rp {formatIDR(cogsData.productionCost)}
                          </td>
                        </tr>
                      )}

                      {/* Step 4: PRODUCTION COST SUBTOTAL */}
                      <tr className="border-b-2 border-slate-200 bg-slate-100/50">
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4 font-black text-slate-800 text-sm uppercase tracking-wide">RAW Production Cost</td>
                        <td className="px-6 py-4 text-[10px] text-slate-500">
                          Material + Proses + Packing ({cogsConfig.packingJalur})
                          {cogsData.fobExportCost > 0 ? ' + FOB Export' : ''}
                        </td>
                        <td className="px-6 py-4 text-right"></td>
                        <td className="px-6 py-4 text-right text-sm">
                          <MoneyText variant="total">Rp {formatIDR(cogsData.productionCost)}</MoneyText>
                        </td>
                      </tr>

                      {/* Step 5: Factory Overhead */}
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50 bg-amber-50/10">
                        <td className="px-6 py-4 text-center font-black text-amber-400">4</td>
                        <td className="px-6 py-4 font-bold text-amber-900">Factory Overhead</td>
                        <td className="px-6 py-4 text-[10px] text-slate-500 leading-tight">
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            Production Cost ×
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={cogsConfig.factoryOhPct}
                              onChange={(e) =>
                                setCogsConfig((p) => ({ ...p, factoryOhPct: parseFloat(e.target.value) || 0 }))
                              }
                              className="w-14 border border-amber-200 rounded px-1.5 py-0.5 text-center font-bold text-amber-800 bg-white"
                            />
                            %
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-amber-700">+ Rp {formatIDR(cogsData.factoryOh)}</td>
                        <td className="px-6 py-4 text-right font-bold text-amber-400">Rp {formatIDR(cogsData.productionCost + cogsData.factoryOh)}</td>
                      </tr>

                      {/* Step 6: Management Overhead */}
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50 bg-amber-50/10">
                        <td className="px-6 py-4 text-center font-black text-amber-400">5</td>
                        <td className="px-6 py-4 font-bold text-amber-900">Management Overhead</td>
                        <td className="px-6 py-4 text-[10px] text-slate-500 leading-tight">
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            Production Cost ×
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={cogsConfig.managementOhPct}
                              onChange={(e) =>
                                setCogsConfig((p) => ({ ...p, managementOhPct: parseFloat(e.target.value) || 0 }))
                              }
                              className="w-14 border border-amber-200 rounded px-1.5 py-0.5 text-center font-bold text-amber-800 bg-white"
                            />
                            %
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-amber-700">+ Rp {formatIDR(cogsData.managementOh)}</td>
                        <td className="px-6 py-4 text-right font-bold text-amber-400">Rp {formatIDR(cogsData.totalCogs)}</td>
                      </tr>

                      {/* Step 7: TOTAL COGS */}
                      <tr className="border-b-[3px] border-indigo-200 bg-indigo-50/40">
                        <td className="px-6 py-5 text-center font-black text-indigo-500"><Activity className="w-5 h-5 mx-auto"/></td>
                        <td className="px-6 py-5 font-black text-indigo-900 text-base uppercase tracking-widest">TOTAL COGS ({cogsConfig.packingJalur})</td>
                        <td className="px-6 py-5 text-[10px] text-indigo-600/80 leading-tight font-bold">Production Cost + Factory OH ({EXCEL_FACTORY_OH_PCT}%) + Management OH<br/><span className="text-indigo-400 italic">Struktur SUMMARY COST — ELB-555-98</span></td>
                        <td className="px-6 py-5 text-right font-black text-indigo-800 text-lg" colSpan={2}>Rp {formatIDR(cogsData.totalCogs)}</td>
                      </tr>

                      {/* Step 8: Harga Jual */}
                      <tr className="bg-emerald-50/40">
                        <td className="px-6 py-5 text-center font-black text-emerald-500"><DollarSign className="w-5 h-5 mx-auto"/></td>
                        <td className="px-6 py-5 font-black text-emerald-900 text-base uppercase tracking-widest">Harga Jual FOB</td>
                        <td className="px-6 py-5 text-[10px] text-emerald-600/80 leading-tight font-bold">COGS × (1 + <span className="text-emerald-700">{cogsConfig.markupPct}%</span> Markup) <br/><span className="text-emerald-500 italic">Dibulatkan ke ribuan (ROUNDDOWN -3)</span></td>
                        <td className="px-6 py-5 text-right font-black text-emerald-700 text-xl" colSpan={2}>Rp {formatIDR(Math.floor(cogsData.sellingPrice / 1000) * 1000)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
