/**
 * Nama MODUL / SUBMODUL tidak boleh di-overwrite oleh enrichNodeFromMaster.
 */
import { enrichNodeFromMaster } from '../src/utils/masterLookup.js';
import { enrichBomFromMasters } from '../src/utils/linkProjectToMasters.js';

const productInfo = {
  kode: 'WAB-TAB-3',
  nama: 'WABI DINING TABLE NATURAL',
  namaBom: 'WABI DINING TABLE NATURAL',
};

const productMeta = { wood: 'TEAK KAMPUNG - 40 UP 300' };

const submodul = {
  id: 'sm-0',
  tipe: 'SUBMODUL',
  nama: 'TOP MEJA',
  kode: '1.2',
};

const enrichedSub = enrichNodeFromMaster(structuredClone(submodul), { productInfo, productMeta });
if (enrichedSub.nama !== 'TOP MEJA') {
  console.error('FAIL: SUBMODUL nama overwritten:', enrichedSub.nama);
  process.exit(1);
}
if (enrichedSub.woodGradeId || enrichedSub.materialMasterId) {
  console.error('FAIL: SUBMODUL linked to material master');
  process.exit(1);
}

const rootModul = {
  id: 'root-import',
  tipe: 'MODUL',
  nama: '',
  kode: 'WAB-TAB-3',
  children: [{ ...submodul, nama: 'TOP' }],
};

const enrichedRoot = enrichNodeFromMaster(structuredClone(rootModul), { productInfo, productMeta });
if (enrichedRoot.nama) {
  console.error('FAIL: root MODUL nama filled from product:', enrichedRoot.nama);
  process.exit(1);
}

const bom = enrichBomFromMasters(structuredClone(rootModul), { productInfo, productMeta });
if (bom.children[0].nama !== 'TOP') {
  console.error('FAIL: enrichBomFromMasters changed SUBMODUL nama:', bom.children[0].nama);
  process.exit(1);
}

console.log('PASS: hierarchy rename — enrich preserves MODUL/SUBMODUL names');
