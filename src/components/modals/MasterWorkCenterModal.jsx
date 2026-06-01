import { useState, useEffect } from 'react';
import { Plus, Trash2, Server } from 'lucide-react';
import { getWorkCenters, saveWorkCenters } from '../../services/masterStorage';
import FullPageShell from '../ui/FullPageShell.jsx';
import {
  CellInput,
  RpInput,
  MasterPanel,
  MasterTableWrap,
  MasterThead,
  MasterTh,
  MasterTr,
  MasterTd,
  MasterLoading,
} from '../master/MasterTable.jsx';

export default function MasterWorkCenterModal({ isOpen, onClose }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
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

  const updateRow = (id, field, value) => {
    setList((prev) => prev.map((w) => (w.id === id ? { ...w, [field]: value } : w)));
  };

  const addRow = () => {
    const id = `WC-${Date.now()}`;
    setList((prev) => [
      ...prev,
      { id, kode: id, nama: 'Work Center Baru', ratePerMin: 500, mesin: '—', aktif: true },
    ]);
  };

  const removeRow = (id) => {
    setList((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <FullPageShell
      isOpen={isOpen}
      onClose={onClose}
      title="Master Work Center"
      icon={Server}
      subtitle={`${list.length} work center · rate/menit & mesin untuk kalkulasi proses`}
      accent="indigo"
      headerActions={
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 bg-white shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah WC
        </button>
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
            {saving ? 'Menyimpan…' : 'Simpan Master'}
          </button>
        </div>
      }
    >
      <MasterPanel className="min-h-[calc(100vh-12rem)]">
        {loading ? (
          <MasterLoading />
        ) : (
          <div className="overflow-auto p-4 sm:p-5">
            <MasterTableWrap minWidth="800px">
              <MasterThead>
                <tr>
                  <MasterTh>Kode</MasterTh>
                  <MasterTh>Nama work center</MasterTh>
                  <MasterTh align="right" money>Rate / menit</MasterTh>
                  <MasterTh>Mesin / section</MasterTh>
                  <MasterTh>Kategori</MasterTh>
                  <MasterTh align="right" money>Labor / m³</MasterTh>
                  <MasterTh className="w-14" />
                </tr>
              </MasterThead>
              <tbody>
                {list.map((wc, i) => (
                  <MasterTr key={wc.id} index={i} className="hover:bg-indigo-50/50">
                    <MasterTd mono className="text-slate-600">
                      {wc.kode}
                    </MasterTd>
                    <MasterTd>
                      <CellInput value={wc.nama} onChange={(v) => updateRow(wc.id, 'nama', v)} />
                    </MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        value={wc.ratePerMin}
                        onChange={(v) => updateRow(wc.id, 'ratePerMin', v)}
                        emphasize
                        suffix="menit"
                      />
                    </MasterTd>
                    <MasterTd>
                      <CellInput value={wc.mesin || ''} onChange={(v) => updateRow(wc.id, 'mesin', v)} />
                    </MasterTd>
                    <MasterTd className="text-xs text-slate-500">{wc.category || '—'}</MasterTd>
                    <MasterTd align="right">
                      <RpInput
                        value={wc.laborCostPerM3 ?? 0}
                        onChange={(v) => updateRow(wc.id, 'laborCostPerM3', v)}
                        suffix="m³"
                      />
                    </MasterTd>
                    <MasterTd align="center">
                      <button
                        type="button"
                        onClick={() => removeRow(wc.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </MasterTd>
                  </MasterTr>
                ))}
              </tbody>
            </MasterTableWrap>
          </div>
        )}
      </MasterPanel>
    </FullPageShell>
  );
}
