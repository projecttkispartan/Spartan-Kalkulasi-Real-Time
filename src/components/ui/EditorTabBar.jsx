import {
  Network, Package, Grid3x3, Wrench, Calculator, DollarSign, BookOpen,
} from 'lucide-react';
import { editorTabs } from '../../design/tokens';

const iconMap = {
  Network,
  Package,
  Grid: Grid3x3,
  Wrench,
  Calculator,
  DollarSign,
  BookOpen,
};

export default function EditorTabBar({ activeTab, onTabChange }) {
  return (
    <div className="px-8 flex border-b border-slate-200 bg-page shrink-0 overflow-x-auto scrollbar-hide pt-2">
      {editorTabs.map((tab) => {
        const Icon = iconMap[tab.icon];
        const isActive = activeTab === tab.id;
        const activeBorder =
          tab.accent === 'emerald'
            ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
            : tab.accent === 'indigo'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-brand-600 text-brand-700 bg-brand-50/50';

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3.5 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap flex items-center gap-2 ${
              isActive ? activeBorder : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
