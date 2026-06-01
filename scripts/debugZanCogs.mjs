import { zanStoolGraph } from '../src/data/zanStoolGraph.js';
import { computePartCostRow, computePartsTotals } from '../src/utils/bomCostRollup.js';
import { computeCogs, computePackingTotals } from '../src/services/bomCalculations.js';
const cogsConfig = { packingJalur: 'BOX', factoryOhPct: 5, managementOhPct: 2.5, markupPct: 20 };

const packingSpec = {
  materialsBox: [
    { id: 1, nama: 'Karton', qty: 1, unit: 'Pcs', harga: 45726 },
    { id: 2, nama: 'Lakban', qty: 0.5, unit: 'Roll', harga: 12000 },
  ],
  materialsSF: [],
  routingBox: [
    { id: 1, nama: 'Melipat', waktu: 5, pekerja: 1, rate: 500 },
    { id: 2, nama: 'Segel', waktu: 8, pekerja: 2, rate: 500 },
  ],
  routingSF: [],
};

function walk(node, depth = 0) {
  if (node.tipe === 'PART') {
    const r = computePartCostRow(node);
    console.log(
      `${node.kode} qty=${node.qty} biaya=${node.biaya} wf=${node.wf}%`,
      `mat=${r.matAdjusted} proses=${r.prosesTotal} total=${r.biayaProduksi}`,
    );
    return;
  }
  node.children?.forEach((c) => walk(c, depth + 1));
}

walk(zanStoolGraph);
const parts = computePartsTotals(zanStoolGraph);
const packing = computePackingTotals(packingSpec);
const cogs = computeCogs({
  bomData: zanStoolGraph,
  cogsConfig,
  packingTotals: packing,
});

console.log('\n--- AGGREGATE ---');
console.log('material:', parts.matAdjusted);
console.log('process:', parts.prosesTotal);
console.log('packing:', packing.packGrand);
console.log('production:', cogs.productionCost);
console.log('factory OH 5%:', cogs.factoryOh);
console.log('mgmt OH 2.5%:', cogs.managementOh);
console.log('TOTAL COGS:', cogs.totalCogs);
console.log('selling +20%:', cogs.sellingPrice);

// Excel HPP line totals (reference)
const excelHppLines = [49736.808, 27951, 51877.056, 23766.336, 268329.6];
console.log('\nExcel HPP kayu sum:', excelHppLines.reduce((a, b) => a + b, 0));
