export const formatIDR = (value) =>
  new Intl.NumberFormat('id-ID').format(value || 0);

/** Tampilkan nilai sesuai mode mata uang (IDR / USD / EUR) */
export function formatPrice(value, mode, kursUsd = 16004, kursEur = 17500) {
  const n = Number(value) || 0;
  if (mode === 'USD') return `$ ${(n / kursUsd).toFixed(2)}`;
  if (mode === 'EUR') return `€ ${(n / kursEur).toFixed(2)}`;
  return `Rp ${formatIDR(n)}`;
}
