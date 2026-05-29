import { defaultImagesByTipe } from './images';

export function createEmptyBom() {
  return {
    id: 'root-new',
    no: 1,
    nama: '',
    kode: '',
    tipe: 'MODUL',
    qty: 1,
    unit: 'SET',
    p: 0,
    l: 0,
    t: 0,
    vol: 0,
    biaya: 0,
    catatan: '',
    proses_count: 0,
    foto: defaultImagesByTipe.produk,
    children: [],
  };
}

export function createEmptyProductInfo() {
  return {
    kode: '',
    nama: '',
    varian: '',
    customer: '',
    kodeBom: '',
    namaBom: '',
    versi: '',
  };
}

export function createEmptyProductMeta() {
  return { itemType: '' };
}

export function createDefaultPackingDimensions() {
  return [
    { id: 1, type: 'BOX KARTON', tolW: 40, tolD: 40, tolH: 50 },
    { id: 2, type: 'SINGLE FACE', tolW: 10, tolD: 10, tolH: 20, chairFactor: true },
  ];
}

export function createEmptyPackingSpec() {
  return {
    materialsBox: [],
    materialsSF: [],
    routingBox: [],
    routingSF: [],
  };
}
