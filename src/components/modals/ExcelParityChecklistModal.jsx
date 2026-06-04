import { createPortal } from 'react-dom';
import ExcelParityChecklistPanel from '../cogs/ExcelParityChecklistPanel';

export default function ExcelParityChecklistModal({
  isOpen,
  onClose,
  bomData,
  productMeta,
  productInfo,
  dimensi,
  packingSpec,
  packingDimensions,
  cogsConfig,
  cogsData,
  excelMirror,
  importedFromExcel,
  kursUsd,
  kursEur,
  mastersReady,
}) {
  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="excel-checklist-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <ExcelParityChecklistPanel
          bomData={bomData}
          productMeta={productMeta}
          productInfo={productInfo}
          dimensi={dimensi}
          packingSpec={packingSpec}
          packingDimensions={packingDimensions}
          cogsConfig={cogsConfig}
          cogsData={cogsData}
          excelMirror={excelMirror}
          importedFromExcel={importedFromExcel}
          kursUsd={kursUsd}
          kursEur={kursEur}
          mastersReady={mastersReady}
          onClose={onClose}
          listMaxHeight="max-h-[min(65vh,560px)]"
          className="border-0 shadow-none rounded-none flex-1 min-h-0"
        />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
