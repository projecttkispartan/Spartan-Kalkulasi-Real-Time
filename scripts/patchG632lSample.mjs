/**
 * Patch sample G632L — dedupe EXCEL-SUMMARY, kayu labor part, cogsMode.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.join(__dirname, '../src/data/samples/projects/g632l-ro.json');

const doc = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
doc.cogsMode = 'excel-fixed';
doc.importedFromExcel = true;

const kayuLine = doc.excelMirror?.summaryCost?.lines?.find(
  (ln) => String(ln.label || '').trim().toUpperCase() === 'KAYU',
);

function dedupeExcelSummary(bom) {
  if (!bom?.children) return;
  for (const child of bom.children) {
    if (String(child.kode || '').trim() === 'EXCEL-SUMMARY' && child.children?.length) {
      const seen = new Set();
      child.children = child.children.filter((part) => {
        const key = String(part.kode || part.nama || '')
          .trim()
          .toUpperCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (kayuLine && !child.children.some((p) => p.kode === 'EXCEL-kayu_labor')) {
        const labor = kayuLine.labor || 0;
        const machine = kayuLine.machine || 0;
        if (labor + machine > 0) {
          child.children.unshift({
            id: 'excel-proc-kayu-labor',
            no: 899,
            nama: 'KAYU — proses (SUMMARY)',
            kode: 'EXCEL-kayu_labor',
            tipe: 'PART',
            qty: 1,
            unit: 'SET',
            p: 0,
            l: 0,
            t: 0,
            vol: 0,
            biaya: 0,
            materialType: 'kayu',
            sf: 0,
            wf: 0,
            catatan: 'Impor SUMMARY KAYU labor+mesin (material dari CALCULATION)',
            proses_count: 1,
            proses: [
              {
                nama: 'KAYU — proses SUMMARY',
                mfgProcess: 'Woodworking',
                summaryKey: 'kayu',
                waktuOperasi: 0,
                totalPerson: 1,
                biayaMesin: Math.round(machine),
                biayaPekerja: Math.round(labor),
              },
            ],
            children: [],
          });
        }
      }
    }
    dedupeExcelSummary(child);
  }
}

dedupeExcelSummary(doc.bomData);

fs.writeFileSync(SAMPLE, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
console.log('Patched g632l-ro.json');
