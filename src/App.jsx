import { useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import BOMEditor from './pages/BOMEditor.jsx';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [kursUsd, setKursUsd] = useState(16004);
  const [kursEur, setKursEur] = useState(17500);

  if (currentRoute === 'editor') {
    return (
      <BOMEditor
        onBack={() => setCurrentRoute('dashboard')}
        kursUsd={kursUsd}
        setKursUsd={setKursUsd}
        kursEur={kursEur}
        setKursEur={setKursEur}
      />
    );
  }

  return (
    <Dashboard
      onNewProject={() => setCurrentRoute('editor')}
      kursUsd={kursUsd}
      setKursUsd={setKursUsd}
      kursEur={kursEur}
      setKursEur={setKursEur}
    />
  );
}
