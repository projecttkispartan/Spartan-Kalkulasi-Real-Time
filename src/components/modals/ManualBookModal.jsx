import { useState, useEffect, useMemo } from 'react';
import { BookOpen, List, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import FullPageShell from '../ui/FullPageShell.jsx';
import { MANUAL_BOOK_SECTIONS, MANUAL_SCENARIOS } from '../../data/manualBookSections.js';
import { MANUAL_FLOW_REGISTRY } from '../manual/manualBookFlows.jsx';
import {
  FlowPreviewModal,
  ImagePreviewModal,
  FlowChartCard,
  ManualFigurePreview,
} from '../manual/ManualBookPreview.jsx';

function StepList({ steps, variant = 'scenario' }) {
  if (!steps?.length) return null;
  return (
    <ol className="space-y-3 mt-4">
      {steps.map((s) => (
        <li key={s.n || s.problem} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-black">
            {variant === 'troubleshoot' ? '!' : s.n}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800">
              {variant === 'troubleshoot' ? s.problem : s.action}
            </p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {variant === 'troubleshoot' ? s.fix : s.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ScenarioCard({ scenario, onPreviewFlow }) {
  const flowMeta = scenario.flow ? MANUAL_FLOW_REGISTRY[scenario.flow] : null;
  const FlowComp = flowMeta?.Component;
  return (
    <article className="rounded-2xl border border-brand-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-4 bg-brand-50/80 border-b border-brand-100">
        <h3 className="text-sm font-black text-brand-900">{scenario.title}</h3>
      </div>
      <div className="p-5 space-y-4">
        {FlowComp && (
          <FlowChartCard
            title={flowMeta.title}
            flowId={scenario.flow}
            FlowComponent={FlowComp}
            onPreview={onPreviewFlow}
          />
        )}
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2">Langkah demi langkah</p>
          <StepList steps={scenario.steps} />
        </div>
      </div>
    </article>
  );
}

function SectionContent({ section, scenarios, onPreviewFlow, onPreviewImage }) {
  const flowMeta = section.flow ? MANUAL_FLOW_REGISTRY[section.flow] : null;
  const FlowComp = flowMeta?.Component;
  const isTroubleshoot = section.id === 'troubleshoot';

  return (
    <article className="space-y-6 pb-16">
      <header className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{section.title}</h2>
        {section.summary && <p className="text-sm text-slate-500 mt-2 font-medium">{section.summary}</p>}
      </header>

      {section.body?.map((para) => (
        <p key={para.slice(0, 48)} className="text-sm text-slate-700 leading-relaxed">
          {para}
        </p>
      ))}

      {section.tips?.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
          <p className="text-xs font-black text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Tips
          </p>
          <ul className="space-y-1">
            {section.tips.map((t) => (
              <li key={t} className="text-xs text-amber-900/90 flex gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {FlowComp && (
        <FlowChartCard
          title={flowMeta.title}
          flowId={section.flow}
          FlowComponent={FlowComp}
          onPreview={onPreviewFlow}
        />
      )}

      {isTroubleshoot && section.steps && (
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2">Masalah & solusi</p>
          <StepList steps={section.steps} variant="troubleshoot" />
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <List className="w-5 h-5 text-brand-600" /> Skenario step-by-step
          </h3>
          {scenarios.map((sc) => (
            <ScenarioCard key={sc.id} scenario={sc} onPreviewFlow={onPreviewFlow} />
          ))}
        </div>
      )}

      {section.images?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3">Gambar referensi</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {section.images.map((img) => (
              <ManualFigurePreview key={img.src} {...img} onPreview={onPreviewImage} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function ManualBookModal({ isOpen, onClose }) {
  const [activeSectionId, setActiveSectionId] = useState('intro');
  const [previewFlowId, setPreviewFlowId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const scenariosBySection = useMemo(() => {
    const map = {};
    for (const sc of MANUAL_SCENARIOS) {
      if (!map[sc.sectionId]) map[sc.sectionId] = [];
      map[sc.sectionId].push(sc);
    }
    return map;
  }, []);

  const activeSection = MANUAL_BOOK_SECTIONS.find((s) => s.id === activeSectionId) || MANUAL_BOOK_SECTIONS[0];
  const previewFlow = previewFlowId ? MANUAL_FLOW_REGISTRY[previewFlowId] : null;
  const PreviewFlowComp = previewFlow?.Component;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
          return;
        }
        if (previewFlowId) {
          setPreviewFlowId(null);
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, previewImage, previewFlowId]);

  const handleClose = () => {
    if (previewImage) {
      setPreviewImage(null);
      return;
    }
    if (previewFlowId) {
      setPreviewFlowId(null);
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <FullPageShell
        isOpen={isOpen}
        onClose={handleClose}
        title="Manual Book — Manufaktur BOM v1.0"
        icon={BookOpen}
        subtitle="Panduan lengkap step-by-step · migrasi Excel · COGS parity · master data"
        accent="emerald"
        headerLabel="Panduan"
        contentClassName="flex flex-col flex-1 min-h-0 h-full w-full py-2 md:py-3 px-1 md:px-2 overflow-hidden"
        headerActions={
          <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest text-white/80 px-2">
            {MANUAL_BOOK_SECTIONS.length} bab · {MANUAL_SCENARIOS.length} skenario
          </span>
        }
      >
        <div className="flex flex-1 min-h-0 h-full gap-0 md:gap-4 overflow-hidden">
          {/* Sidebar TOC — full height scroll */}
          <nav
            className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm"
            aria-label="Daftar isi manual book"
          >
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Daftar isi</p>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin p-2 space-y-0.5">
              {MANUAL_BOOK_SECTIONS.map((sec) => {
                const active = sec.id === activeSectionId;
                const scCount = scenariosBySection[sec.id]?.length || 0;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-start gap-2 ${
                      active
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${active ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>
                      {sec.title}
                      {scCount > 0 && (
                        <span className="block text-[9px] font-medium text-slate-400 mt-0.5">{scCount} skenario</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-[9px] text-slate-500">
              Klik flowchart → <strong>Preview fullscreen</strong>
            </div>
          </nav>

          {/* Mobile section picker */}
          <div className="md:hidden shrink-0 w-full mb-2">
            <select
              value={activeSectionId}
              onChange={(e) => setActiveSectionId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 bg-white"
            >
              {MANUAL_BOOK_SECTIONS.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          {/* Main content — full width scroll */}
          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto scroll-thin bg-white md:rounded-xl md:border md:border-slate-200 md:shadow-sm">
            <div className="max-w-4xl mx-auto px-5 md:px-10 py-6 md:py-8">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3 text-xs text-emerald-900 mb-8">
                <strong>Manufaktur BOM v1.0</strong> — Manual operasional untuk tim costing. Setiap bab punya
                flowchart (klik <em>Preview fullscreen</em>) dan skenario langkah demi langkah.
              </div>
              <SectionContent
                section={activeSection}
                scenarios={scenariosBySection[activeSectionId] || []}
                onPreviewFlow={setPreviewFlowId}
                onPreviewImage={setPreviewImage}
              />
            </div>
          </div>
        </div>
      </FullPageShell>

      <FlowPreviewModal
        open={!!previewFlowId && !!PreviewFlowComp}
        title={previewFlow?.title}
        onClose={() => setPreviewFlowId(null)}
      >
        {PreviewFlowComp && <PreviewFlowComp large />}
      </FlowPreviewModal>

      <ImagePreviewModal
        open={!!previewImage}
        src={previewImage?.src}
        alt={previewImage?.alt}
        caption={previewImage?.caption}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
}
