import { posisiGambarMap } from '../data/mockData.js';

/** Gambar default per tipe hierarki — wireframe selalu punya visual */
export const defaultImagesByTipe = {
  MODUL: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=200&h=200&fit=crop&q=80',
  SUBMODUL: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=200&h=200&fit=crop&q=80',
  'SUBMODUL 2': 'https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?w=200&h=200&fit=crop&q=80',
  PART: 'https://images.unsplash.com/photo-1611078813350-0a149c40fd3b?w=200&h=200&fit=crop&q=80',
  operasi: 'https://images.unsplash.com/photo-1563283995-1f9f2bce4302?w=200&h=200&fit=crop&q=80',
  produk: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop&q=80',
};

export function resolveNodeFoto(data) {
  if (data?.foto) return data.foto;
  return defaultImagesByTipe[data?.tipe] || defaultImagesByTipe.PART;
}

export function resolveProsesGambar(proses) {
  if (proses?.gambar) return proses.gambar;
  const pos = proses?.posisiOperasi;
  if (pos && posisiGambarMap[pos]) return posisiGambarMap[pos];
  return defaultImagesByTipe.operasi;
}
