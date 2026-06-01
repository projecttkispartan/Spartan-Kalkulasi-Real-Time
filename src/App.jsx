import { useState, useLayoutEffect, useCallback } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import BOMEditor from './pages/BOMEditor.jsx';
import { readStoredFontCase, FONT_CASE_STORAGE_KEY } from './components/ui/FontCaseToggle.jsx';
import {
  createProject,
  getProject,
  saveProject,
} from './services/projectStorage.js';
import { hydrateWorkCentersFromMaster } from './data/routingCatalog.js';
import { hydrateAllMasters } from './services/masterStorage.js';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [loadedProject, setLoadedProject] = useState(null);
  const [kursUsd, setKursUsd] = useState(16004);
  const [kursEur, setKursEur] = useState(17500);
  const [fontCase, setFontCase] = useState(readStoredFontCase);
  const [mastersReady, setMastersReady] = useState(false);

  useLayoutEffect(() => {
    hydrateWorkCentersFromMaster();
    hydrateAllMasters().then(() => setMastersReady(true));
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-case-uppercase', 'font-case-normal');
    root.classList.add(fontCase === 'normal' ? 'font-case-normal' : 'font-case-uppercase');
    try {
      localStorage.setItem(FONT_CASE_STORAGE_KEY, fontCase);
    } catch {
      /* ignore */
    }
  }, [fontCase]);

  const openEditorWithProject = useCallback((doc) => {
    setLoadedProject(doc);
    setActiveProjectId(doc.id);
    setKursUsd(doc.kursUsd ?? 16004);
    setKursEur(doc.kursEur ?? 17500);
    setCurrentRoute('editor');
  }, []);

  const handleOpenProject = useCallback(async (id) => {
    const doc = await getProject(id);
    if (doc) {
      openEditorWithProject(doc);
      return;
    }
    window.alert('Project tidak ditemukan atau datanya rusak. Coba refresh halaman atau hapus baris kosong di dashboard.');
  }, [openEditorWithProject]);

  const handleNewProject = useCallback(async () => {
    const doc = await createProject();
    openEditorWithProject(doc);
  }, [openEditorWithProject]);

  const handleSaveProject = useCallback(async (doc) => {
    const saved = await saveProject({ ...doc, kursUsd: doc.kursUsd ?? kursUsd, kursEur: doc.kursEur ?? kursEur });
    setLoadedProject(saved);
    return saved;
  }, [kursUsd, kursEur]);

  const handleBackToDashboard = useCallback(() => {
    setCurrentRoute('dashboard');
    setActiveProjectId(null);
    setLoadedProject(null);
  }, []);

  return (
    <div className="viewport-shell flex flex-col">
      {!mastersReady && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs font-bold text-amber-800">
          Memuat master DATA BASE / FORMULA / COATING… Jika combo kosong, jalankan{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">npm run import:masters</code> lalu refresh.
        </div>
      )}
      {currentRoute === 'editor' && loadedProject ? (
        <BOMEditor
          projectId={activeProjectId}
          initialProject={loadedProject}
          onSaveProject={handleSaveProject}
          onBack={handleBackToDashboard}
          kursUsd={kursUsd}
          setKursUsd={setKursUsd}
          kursEur={kursEur}
          setKursEur={setKursEur}
          fontCase={fontCase}
          setFontCase={setFontCase}
        />
      ) : (
        <Dashboard
          onOpenProject={handleOpenProject}
          onNewProject={handleNewProject}
          kursUsd={kursUsd}
          setKursUsd={setKursUsd}
          kursEur={kursEur}
          setKursEur={setKursEur}
          fontCase={fontCase}
          setFontCase={setFontCase}
        />
      )}
    </div>
  );
}
