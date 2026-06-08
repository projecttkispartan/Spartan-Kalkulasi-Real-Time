import FullPageShell from '../ui/FullPageShell.jsx';
import { PieChart } from 'lucide-react';
import CogsProductionPieCard from '../cogs/CogsProductionPieCard.jsx';
import ExcelDeviationCard from '../cogs/ExcelDeviationCard.jsx';

export default function CogsInsightModal({ isOpen, onClose, insight, productInfo }) {
  return (
    <FullPageShell
      isOpen={isOpen}
      onClose={onClose}
      accent="indigo"
      headerLabel="COGS Insight"
      title="Ringkasan biaya produksi & deviasi Excel"
      subtitle={
        productInfo?.nama
          ? `${productInfo.nama} · ${productInfo.kode || '—'}`
          : 'Perbandingan app vs SUMMARY COST Excel'
      }
      icon={PieChart}
      contentClassName="page-inner-full w-full py-4 md:py-6 overflow-y-auto scroll-thin flex-1 min-h-0"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
        <CogsProductionPieCard insight={insight} />
        <ExcelDeviationCard insight={insight} />
      </div>
    </FullPageShell>
  );
}
