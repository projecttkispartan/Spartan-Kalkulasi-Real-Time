import { CONTAINER_NET_VOLUME_M3 } from '../data/excelReference';

export const CONTAINER_PRESETS = [
  {
    id: '1piece',
    type: '1 piece',
    boxFromVolume: true,
    sfFromVolume: true,
    unitBox: 'm³',
    unitSF: 'm³',
  },
  {
    id: '20foot',
    type: '20 foot',
    containerNetM3: CONTAINER_NET_VOLUME_M3['20foot'],
    unitBox: 'Pcs',
    unitSF: 'Pcs',
  },
  {
    id: '40foot',
    type: '40 foot',
    containerNetM3: CONTAINER_NET_VOLUME_M3['40foot'],
    unitBox: 'Pcs',
    unitSF: 'Pcs',
  },
  {
    id: '40hc',
    type: '40 foot HC',
    containerNetM3: CONTAINER_NET_VOLUME_M3['40hc'],
    unitBox: 'Pcs',
    unitSF: 'Pcs',
  },
];

/**
 * Volume packing (m³) — BOM TEMPLATE:
 * Box: (W+tolW)×(D+tolD)×(H+tolH) / 10⁹
 * SF + CHAIR: … / 10⁹ × 0.6
 */
export function calcPackingVolume(dimensi, packingItem, options = {}) {
  if (!packingItem || !dimensi) return 0;
  const w = (Number(dimensi.w) || 0) + (Number(packingItem.tolW) || 0);
  const d = (Number(dimensi.d) || 0) + (Number(packingItem.tolD) || 0);
  const h = (Number(dimensi.h) || 0) + (Number(packingItem.tolH) || 0);
  let vol = (w * d * h) / 1_000_000_000;
  const itemType = options.itemType ?? '';
  if (packingItem.chairFactor && String(itemType).toUpperCase() === 'CHAIR') {
    vol *= 0.6;
  }
  return Number(vol.toFixed(6));
}

/**
 * Kapasitas net kontainer (referensi Excel SUMMARY COST):
 * - 1 piece → volume packing (m³)
 * - 20'/40'/40' HC → floor(volumeMuatanKontainer_m³ / volumePacking_m³) → Pcs
 */
export function calcContainerNetCapacity(preset, volBox, volSF) {
  const boxVol = Number(volBox) || 0;
  const sfVol = Number(volSF) || 0;

  if (preset.boxFromVolume) {
    return {
      netCapBox: Number(boxVol.toFixed(6)),
      netCapSF: Number(sfVol.toFixed(6)),
    };
  }

  const containerM3 = Number(preset.containerNetM3) || 0;
  const pcsFromVol = (pieceVol) => {
    if (!pieceVol || !containerM3) return 0;
    return Math.floor(containerM3 / pieceVol);
  };

  return {
    netCapBox: pcsFromVol(boxVol),
    netCapSF: sfVol ? pcsFromVol(sfVol) : 0,
  };
}

export function buildDefaultContainerRows(volBox = 0, volSF = 0) {
  return CONTAINER_PRESETS.map((p) => {
    const caps = calcContainerNetCapacity(p, volBox, volSF);
    return {
      presetId: p.id,
      type: p.type,
      netCapBox: caps.netCapBox,
      netCapSF: caps.netCapSF,
      matCostBox: 0,
      matCostSF: 0,
      routCostBox: 0,
      routCostSF: 0,
      mgtOvBox: 0,
      mgtOvSF: 0,
      totalBox: 0,
      totalSF: 0,
      hidden: false,
    };
  });
}

export function findPackingByType(packingDimensions, keyword) {
  const key = keyword.toLowerCase();
  return packingDimensions.find((p) => p.type?.toLowerCase().includes(key));
}
