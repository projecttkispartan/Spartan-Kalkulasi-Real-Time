import { PanelsTopLeft } from 'lucide-react';

export default function AppHeader({ title = 'Manufaktur BOM', children }) {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        <PanelsTopLeft className="w-6 h-6 text-brand-600" />
        <h1 className="text-xl font-black tracking-tight text-slate-800">{title}</h1>
      </div>
      <div className="flex items-center gap-4">{children}</div>
    </header>
  );
}
