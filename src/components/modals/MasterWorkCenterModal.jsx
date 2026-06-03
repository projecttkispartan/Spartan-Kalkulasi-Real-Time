import { useState, useEffect } from 'react';
import { Plus, Server, HelpCircle } from 'lucide-react';
import { getWorkCenters, saveWorkCenters } from '../../services/masterStorage';
import FullPageShell from '../ui/FullPageShell.jsx';
import MasterUsageGuideModal from './MasterUsageGuideModal.jsx';
import { MasterPanel, MasterLoading, MasterTabHint, MasterDataBody } from '../master/MasterTable.jsx';
import { WorkCenterTable } from '../master/MasterDataTables.jsx';
import { MASTER_TAB_META } from '../master/masterTabMeta.js';

export default function MasterWorkCenterModal({ isOpen, onClose }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const wcMeta = MASTER_TAB_META.workCenters;

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSearch('');
    getWorkCenters().then((data) => {
      setList(data);
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    await saveWorkCenters(list);
    setSaving(false);
    onClose();
  };

  const addRow = () => {
    const id = `WC-${Date.now()}`;
    setList((prev) => [
      ...prev,
      {
        id,
        kode: id,
        nama: 'Work Center Baru',
        ratePerMin: 500,
        mesin: '—',
        category: 'ROUTING',
        aktif: true,
        source: 'manual',
      },
    ]);
  };

  const removeRow = (id) => {
    setList((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <>
      <FullPageShell
        isOpen={isOpen}
        onClose={onClose}
        title="Master Work Center"
        icon={Server}
        subtitle={`${list.length} work center · rate/menit untuk kalkulasi operasi BOM`}
        accent="indigo"
        headerActions={
          <>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="text-xs font-bold text-white border border-white/30 px-3 py-2 rounded-lg hover:bg-white/15 flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Panduan
            </button>
            <button
              type="button"
              onClick={addRow}
              className="text-xs font-bold text-indigo-900 border border-white/40 bg-white/90 px-3 py-2 rounded-lg hover:bg-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tambah WC
            </button>
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Menyimpan…' : 'Simpan Master WC'}
            </button>
          </div>
        }
      >
        <MasterPanel className="flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 sm:p-5">
            <MasterDataBody
              hint={<MasterTabHint sheet={wcMeta.sheet}>{wcMeta.hint}</MasterTabHint>}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={wcMeta.searchPlaceholder}
            >
              {loading ? (
                <MasterLoading />
              ) : (
                <WorkCenterTable rows={list} setWorkCenters={setList} search={search} onRemove={removeRow} />
              )}
            </MasterDataBody>
          </div>
        </MasterPanel>
      </FullPageShell>

      <MasterUsageGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}
