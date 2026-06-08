import { FlowStep, FlowArrow, FlowRow, FlowColumn } from '../ui/FlowDiagram.jsx';

export function DashboardFlow({ large = false }) {
  const sz = large ? 'scale-110' : '';
  return (
    <div className={sz}>
      <FlowRow>
        <FlowStep label="Dashboard" sub="Daftar BOM" tone="slate" />
        <FlowArrow />
        <FlowColumn>
          <FlowStep label="Buat Baru" sub="Project kosong · Live Master" tone="brand" />
          <FlowArrow dir="down" />
          <FlowStep label="Import Excel" sub=".xlsx · Excel Fixed" tone="violet" />
        </FlowColumn>
        <FlowArrow />
        <FlowStep label="Editor" sub="Tab Struktur terbuka" tone="emerald" />
        <FlowArrow />
        <FlowStep label="Tab COGS" sub="Deviasi vs mirror" tone="amber" />
        <FlowArrow />
        <FlowStep label="Simpan" sub="IndexedDB" tone="slate" />
      </FlowRow>
    </div>
  );
}

export function EditorFlow({ large = false }) {
  const sz = large ? 'scale-110' : '';
  return (
    <div className={sz}>
      <FlowColumn>
        <FlowRow wrap={false}>
          <FlowStep label="Inline bar" sub="Kode · dimensi · kayu" tone="brand" />
          <FlowArrow />
          <FlowStep label="Struktur" sub="MODUL→PART" tone="emerald" />
          <FlowArrow />
          <FlowStep label="Material" sub="DATA BASE" tone="emerald" />
          <FlowArrow />
          <FlowStep label="Proses" sub="Routing WC" tone="emerald" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowRow wrap={false}>
          <FlowStep label="Container" sub="Packing BOX/SF" tone="slate" />
          <FlowArrow />
          <FlowStep label="Summary" sub="Rollup per part" tone="slate" />
          <FlowArrow />
          <FlowStep label="COGS" sub="OH + markup" tone="amber" />
          <FlowArrow />
          <FlowStep label="Export" sub="PDF" tone="violet" />
        </FlowRow>
      </FlowColumn>
    </div>
  );
}

export function BomFlow({ large = false }) {
  const sz = large ? 'scale-110' : '';
  return (
    <div className={sz}>
      <FlowColumn>
        <FlowRow>
          <FlowStep label="MODUL" sub="Root BOM · SET" tone="brand" />
          <FlowArrow />
          <FlowStep label="SUBMODUL" sub="Kelompok komponen" tone="slate" />
          <FlowArrow />
          <FlowStep label="PART" sub="Material + routing" tone="emerald" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowRow>
          <FlowStep label="Picker DATA BASE" sub="SKU master" tone="brand" />
          <FlowArrow />
          <FlowStep label="P×L×T → vol" sub="Kayu m³" tone="emerald" />
          <FlowArrow />
          <FlowStep label="SF + WF" sub="MASTER RATIO" tone="amber" />
          <FlowArrow />
          <FlowStep label="Rollup" sub="Σ ke parent" tone="violet" />
        </FlowRow>
      </FlowColumn>
    </div>
  );
}

export function CogsFlow({ large = false }) {
  const sz = large ? 'scale-110' : '';
  return (
    <div className={sz}>
      <FlowColumn>
        <FlowRow>
          <FlowStep label="Material" tone="emerald" />
          <FlowStep label="Proses" tone="emerald" />
          <FlowStep label="Packing" tone="emerald" />
          <FlowStep label="Coating" sub="opsional" tone="slate" />
          <FlowStep label="FOB" sub="opsional" tone="slate" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowStep label="Production Cost" tone="brand" />
        <FlowArrow dir="down" />
        <FlowRow>
          <FlowStep label="+ Factory OH %" tone="slate" />
          <FlowStep label="+ Mgmt OH %" tone="slate" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowStep label="Total COGS" tone="amber" />
        <FlowArrow dir="down" />
        <FlowStep label="Harga Jual" sub="Markup %" tone="violet" />
      </FlowColumn>
    </div>
  );
}

export function MasterFlow({ large = false }) {
  const sz = large ? 'scale-110' : '';
  return (
    <div className={sz}>
      <FlowColumn>
        <FlowRow>
          <FlowStep label="npm run import:masters" sub="Seed JSON" tone="slate" />
          <FlowArrow />
          <FlowStep label="hydrateAllMasters" sub="IndexedDB cache" tone="brand" />
          <FlowArrow />
          <FlowStep label="Picker UI" sub="Struktur · Material" tone="emerald" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowRow>
          <FlowStep label="DATABASE" sub="Material" tone="emerald" />
          <FlowStep label="FOB COST" sub="Kontainer" tone="violet" />
          <FlowStep label="WORK CENTER" sub="Rate/menit" tone="amber" />
        </FlowRow>
      </FlowColumn>
    </div>
  );
}

export function ModesFlow({ large = false }) {
  const sz = large ? 'scale-110' : '';
  return (
    <div className={sz}>
      <FlowColumn>
        <FlowRow>
          <FlowStep label="Import .xlsx" tone="violet" />
          <FlowArrow />
          <FlowStep label="Excel Fixed" sub="biayaFromExcel · mirror" tone="violet" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowRow>
          <FlowStep label="Buat Baru" tone="brand" />
          <FlowArrow />
          <FlowStep label="Live Master" sub="hitung dari DATA BASE" tone="emerald" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowStep label="Hybrid?" sub="FAIL checklist" tone="amber" />
      </FlowColumn>
    </div>
  );
}

export function ImportExcelFlow({ large = false }) {
  const sz = large ? 'scale-110' : '';
  return (
    <div className={sz}>
      <FlowRow wrap={false}>
        <FlowStep label="Pilih .xlsx" tone="slate" />
        <FlowArrow />
        <FlowStep label="Parse sheets" sub="BOM · SUMMARY" tone="brand" />
        <FlowArrow />
        <FlowStep label="excelMirror" sub="summaryCost" tone="violet" />
        <FlowArrow />
        <FlowStep label="cogsMode" sub="excel-fixed" tone="violet" />
        <FlowArrow />
        <FlowStep label="Tab COGS" sub="PASS/WARN/FAIL" tone="amber" />
      </FlowRow>
    </div>
  );
}

export function ManualFromZeroFlow({ large = false }) {
  const sz = large ? 'scale-110' : '';
  return (
    <div className={sz}>
      <FlowColumn>
        <FlowRow wrap={false}>
          <FlowStep label="Buat Baru" tone="brand" />
          <FlowArrow />
          <FlowStep label="Inline bar" sub="Header produk" tone="brand" />
          <FlowArrow />
          <FlowStep label="Tambah SUBMODUL" tone="emerald" />
          <FlowArrow />
          <FlowStep label="Tambah PART" tone="emerald" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowRow wrap={false}>
          <FlowStep label="Material tab" tone="emerald" />
          <FlowArrow />
          <FlowStep label="Proses tab" tone="emerald" />
          <FlowArrow />
          <FlowStep label="Packing" tone="slate" />
          <FlowArrow />
          <FlowStep label="COGS config" tone="amber" />
        </FlowRow>
      </FlowColumn>
    </div>
  );
}

export function MaterialManualModeFlow({ large = false }) {
  const sz = large ? 'scale-110' : '';
  return (
    <div className={sz}>
      <FlowColumn>
        <FlowRow wrap={false}>
          <FlowStep label="PART" sub="Tab Struktur/Material" tone="brand" />
          <FlowArrow />
          <FlowStep label="Toggle Manual" sub="materialSourceMode" tone="amber" />
          <FlowArrow />
          <FlowStep label="Isi spec" sub="woodSpecification" tone="emerald" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowRow wrap={false}>
          <FlowStep label="Tab Proses" sub="routing WC" tone="slate" />
          <FlowArrow />
          <FlowStep label="Kembali Material" sub="mode tetap Manual" tone="emerald" />
          <FlowArrow />
          <FlowStep label="enrich skip" sub="no auto-link master" tone="violet" />
        </FlowRow>
        <FlowArrow dir="down" />
        <FlowRow wrap={false}>
          <FlowStep label="Switch DATA BASE" sub="opsional" tone="brand" />
          <FlowArrow />
          <FlowStep label="Picker master" sub="harga dari DATABASE" tone="emerald" />
        </FlowRow>
      </FlowColumn>
    </div>
  );
}

export const MANUAL_FLOW_REGISTRY = {
  dashboard: { Component: DashboardFlow, title: 'Alur Dashboard → Editor' },
  editor: { Component: EditorFlow, title: 'Alur 7 Tab Editor' },
  bom: { Component: BomFlow, title: 'Hierarki BOM & Material' },
  cogs: { Component: CogsFlow, title: 'Waterfall COGS' },
  master: { Component: MasterFlow, title: 'Alur Master Data' },
  modes: { Component: ModesFlow, title: 'Mode Excel Fixed vs Live Master' },
  importExcel: { Component: ImportExcelFlow, title: 'Alur Import Excel' },
  manualFromZero: { Component: ManualFromZeroFlow, title: 'Input Manual dari Nol' },
  materialManualMode: { Component: MaterialManualModeFlow, title: 'Material Manual vs DATA BASE' },
};
