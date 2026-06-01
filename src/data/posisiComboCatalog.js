/**
 * Katalog gambar posisi combo — template Excel Spartan (INPUTING).
 * File: assets/excel-images/calculation-template-2014/media/image{N}.jpeg
 *
 * Pemetaan (74 gambar, image30–image103):
 * - FINISHING CODE A–L      → image30–41
 * - ASSEMBLING CODE A–K     → image42–52
 * - LAMINATING CODE A–K     → image53–63
 * - GLUING / surface combo  → image64–76
 * - Referensi / duplikat    → image77–103
 */

const MEDIA_BASE = '/assets/excel-images/calculation-template-2014/media';

export function comboImageUrl(imageNumber) {
  return `${MEDIA_BASE}/image${imageNumber}.jpeg`;
}

function letterRange(startImage, letters, groupId, groupLabel, valuePrefix) {
  return letters.split('').map((code, i) => {
    const imageNumber = startImage + i;
    const value = valuePrefix ? `${valuePrefix}:${code}` : code;
    return {
      value,
      code,
      groupId,
      groupLabel,
      label: `${groupLabel} ${code}`,
      shortLabel: code,
      imageNumber,
      src: comboImageUrl(imageNumber),
    };
  });
}

/** @type {import('./posisiComboCatalog.js').PosisiComboGroup[]} */
export const POSISI_COMBO_GROUPS = [
  {
    id: 'finishing',
    label: 'FINISHING CODE',
    items: letterRange(30, 'ABCDEFGHIJKL', 'finishing', 'Finishing', 'F'),
  },
  {
    id: 'assembling',
    label: 'ASSEMBLING CODE',
    items: letterRange(42, 'ABCDEFGHIJK', 'assembling', 'Assembling', 'ASM'),
  },
  {
    id: 'laminating',
    label: 'LAMINATING CODE',
    items: letterRange(53, 'ABCDEFGHIJK', 'laminating', 'Laminating', 'LAM'),
  },
  {
    id: 'gluing',
    label: 'GLUING SURFACE',
    items: Array.from({ length: 13 }, (_, i) => {
      const imageNumber = 64 + i;
      const n = i + 1;
      return {
        value: `GLU:${n}`,
        code: String(n),
        groupId: 'gluing',
        groupLabel: 'GLUING SURFACE',
        label: `Gluing ${n}`,
        shortLabel: `G${n}`,
        imageNumber,
        src: comboImageUrl(imageNumber),
      };
    }),
  },
  {
    id: 'reference',
    label: 'REFERENSI',
    items: Array.from({ length: 27 }, (_, i) => {
      const imageNumber = 77 + i;
      return {
        value: `REF:${imageNumber}`,
        code: String(imageNumber),
        groupId: 'reference',
        groupLabel: 'REFERENSI',
        label: `Ref ${imageNumber}`,
        shortLabel: `#${imageNumber}`,
        imageNumber,
        src: comboImageUrl(imageNumber),
      };
    }),
  },
];

export const POSISI_COMBO_ALL = POSISI_COMBO_GROUPS.flatMap((g) => g.items);

const byValue = new Map(POSISI_COMBO_ALL.map((item) => [item.value, item]));
const byImageNumber = new Map(POSISI_COMBO_ALL.map((item) => [item.imageNumber, item]));

/** Huruf tunggal A–L (kolom FINISHING di BOM) → gambar finishing */
const finishingByLetter = Object.fromEntries(
  POSISI_COMBO_GROUPS.find((g) => g.id === 'finishing')?.items.map((it) => [it.code, it.src]) ?? [],
);

/** Legacy posisi spatial + kode finishing Spartan */
export const posisiComboGambarMap = {
  ...finishingByLetter,
  ...Object.fromEntries(POSISI_COMBO_ALL.map((it) => [it.value, it.src])),
};

export function getPosisiComboItem(value) {
  if (!value) return null;
  const direct = byValue.get(value);
  if (direct) return direct;
  const letter = String(value).trim().toUpperCase();
  if (letter.length === 1 && finishingByLetter[letter]) {
    return POSISI_COMBO_GROUPS[0].items.find((it) => it.code === letter) ?? null;
  }
  return null;
}

export function resolveComboGambar(posisiOperasi) {
  const item = getPosisiComboItem(posisiOperasi);
  return item?.src ?? null;
}

/** Opsi dropdown routing — termasuk posisi spatial lama jika masih dipakai */
export function getPosisiComboOptions({ includeLegacy = true } = {}) {
  const legacy = includeLegacy
    ? [
        { value: 'Depan', label: 'Depan (legacy)', groupId: 'legacy', src: null },
        { value: 'Belakang', label: 'Belakang (legacy)', groupId: 'legacy', src: null },
        { value: 'Atas', label: 'Atas (legacy)', groupId: 'legacy', src: null },
        { value: 'Bawah', label: 'Bawah (legacy)', groupId: 'legacy', src: null },
        { value: 'Samping Kiri', label: 'Samping Kiri (legacy)', groupId: 'legacy', src: null },
        { value: 'Samping Kanan', label: 'Samping Kanan (legacy)', groupId: 'legacy', src: null },
      ]
    : [];

  return [...legacy, ...POSISI_COMBO_ALL];
}

export const DEFAULT_POSISI_COMBO = POSISI_COMBO_GROUPS[0]?.items[0]?.value ?? 'F:A';
