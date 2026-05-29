import { DollarSign, Euro } from 'lucide-react';

export function CurrencyInput({ type, value, onChange }) {
  const isUsd = type === 'USD';
  return (
    <div
      className={`flex items-center border rounded-lg overflow-hidden h-9 shadow-sm ${
        isUsd ? 'border-amber-300 bg-amber-50/30' : 'border-brand-300 bg-brand-50/30'
      }`}
    >
      <div
        className={`flex items-center gap-1.5 px-3 border-r h-full text-xs font-bold ${
          isUsd ? 'border-amber-200 text-amber-600 bg-amber-100/50' : 'border-brand-200 text-brand-600 bg-brand-100/50'
        }`}
      >
        {isUsd ? <DollarSign className="w-3.5 h-3.5" /> : <Euro className="w-3.5 h-3.5" />}
        {type}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-20 px-3 py-2 text-sm font-bold bg-transparent focus:outline-none text-right ${
          isUsd ? 'text-amber-700' : 'text-brand-700'
        }`}
      />
    </div>
  );
}

export function CurrencyGroup({ kursUsd, setKursUsd, kursEur, setKursEur, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CurrencyInput type="USD" value={kursUsd} onChange={setKursUsd} />
      <CurrencyInput type="EUR" value={kursEur} onChange={setKursEur} />
    </div>
  );
}
