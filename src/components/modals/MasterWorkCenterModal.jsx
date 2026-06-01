import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Server } from 'lucide-react';
import { getWorkCenters, saveWorkCenters } from '../../services/masterStorage';

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
    <div className="fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" /> Master Work Center
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <p className="text-center text-slate-400 text-sm py-8">Memuat…</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 pr-2">Kode</th>
                  <th className="py-2 pr-2">Nama</th>
                  <th className="py-2 pr-2 text-right">Rate / menit</th>
                  <th className="py-2 pr-2">Mesin</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((wc) => (
                  <tr key={wc.id}>
                    <td className="py-2 pr-2 font-mono text-slate-600">{wc.kode}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={wc.nama}
                        onChange={(e) => updateRow(wc.id, 'nama', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={wc.ratePerMin}
                        onChange={(e) => updateRow(wc.id, 'ratePerMin', Number(e.target.value))}
                        className="w-full border border-slate-200 rounded px-2 py-1 text-right"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={wc.mesin || ''}
                        onChange={(e) => updateRow(wc.id, 'mesin', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(wc.id)}
                        className="p-1 text-red-400 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={addRow}
            className="text-xs font-bold text-indigo-600 flex items-center gap-1 px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50"
          >
            <Plus className="w-4 h-4" /> Tambah WC
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg">
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Menyimpan…' : 'Simpan Master'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
