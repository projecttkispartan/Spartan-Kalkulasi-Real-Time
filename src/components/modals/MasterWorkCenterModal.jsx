import { useState, useEffect, useCallback } from 'react';
import { Plus, Server, BookOpen } from 'lucide-react';
import { getWorkCenters, saveWorkCenters, reimportMastersFromSeedFiles } from '../../services/masterStorage';
import FullPageShell from '../ui/FullPageShell.jsx';
import ManualBookModal from './ManualBookModal.jsx';
import { MasterPanel, MasterLoading, MasterTabHint, MasterDataBody } from '../master/MasterTable.jsx';
import { WorkCenterTable } from '../master/MasterDataTables.jsx';
import { MASTER_TAB_META } from '../master/masterTabMeta.js';
import MasterAddProcessPanel from '../master/MasterAddProcessPanel.jsx';
import { createMasterRow } from '../master/masterAddProcess.js';
import {
  MasterDataLoadError,
  MasterDataEmptyBanner,
  MasterDataRowCount,
} from '../master/MasterDataStatus.jsx';

export default function MasterWorkCenterModal({ isOpen, onClose }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const wcMeta = MASTER_TAB_META.workCenters;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getWorkCenters();
      setList(data);
    } catch (e) {
      console.error('WC load failed:', e);
      setLoadError(e?.message || 'Gagal memuat work center');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    load();
  }, [isOpen, load]);

  const handleResetImport = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await reimportMastersFromSeedFiles();
      const data = await getWorkCenters();
      setList(data);
    } catch (e) {
      setLoadError(e?.message || 'Gagal reset import');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await saveWorkCenters(list);
    setSaving(false);
    onClose();
  };

  const addRow = () => {
    const row = createMasterRow('workCenters', list);
    if (row) setList((prev) => [...prev, row]);
  };

  const removeRow = (id) => {
    setList((prev) => prev.filter((w) => w.id !== id));
  };

  if (!isOpen) return null;

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
              onClick={() => setShowManual(true)}
              className="text-xs font-bold text-white border border-white/30 px-3 py-2 rounded-lg hover:bg-white/15 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> Manual Book
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
        <div className="flex flex-col flex-1 min-h-0 w-full h-full">
          <MasterPanel className="flex-1 min-h-0 h-full">
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 sm:p-5 gap-3">
              <MasterAddProcessPanel
                tabId="workCenters"
                tabLabel={wcMeta.label}
                canAdd
                onAddRow={addRow}
              />
              <MasterDataBody
                banners={
                  <>
                    {loadError && <MasterDataLoadError message={loadError} onRetry={load} />}
                    {!loadError && !loading && list.length === 0 && (
                      <MasterDataEmptyBanner
                        tabLabel={wcMeta.label}
                        rowCount={0}
                        totalKayu={0}
                        totalKatalog={0}
                        onReload={load}
                        onResetImport={handleResetImport}
                      />
                    )}
                  </>
                }
                statusBar={
                  <MasterDataRowCount tabLabel={wcMeta.label} count={list.length} loading={loading} />
                }
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
        </div>
      </FullPageShell>

      <ManualBookModal isOpen={showManual} onClose={() => setShowManual(false)} />
    </>
  );
}
