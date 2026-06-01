import { CONTAINER_NET_VOLUME_M3 } from '../data/excelReference.js';
import { evalFormula } from './formulaEngine.js';

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

export function calcPartVolume(p, l, t) {
  return evalFormula('vol_part_mm', { p, l, t }) ?? 0;
}

export function calcPackingVolume(dimensi, packingItem, options = {}) {
  if (!packingItem || !dimensi) return 0;
  const ctx = {
    w: dimensi.w,
    d: dimensi.d,
    h: dimensi.h,
    tolW: packingItem.tolW,
    tolD: packingItem.tolD,
    tolH: packingItem.tolH,
    itemType: options.itemType ?? '',
    chairFactor: packingItem.chairFactor,
  };
  if (packingItem.chairFactor && String(ctx.itemType).toUpperCase() === 'CHAIR') {
    return evalFormula('vol_packing_sf', ctx) ?? 0;
  }
  return evalFormula('vol_packing_box', ctx) ?? 0;
}

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
  return {
    netCapBox: evalFormula('container_pcs', { containerNetM3: containerM3, volPacking: boxVol }) ?? 0,
    netCapSF: sfVol
      ? evalFormula('container_pcs', { containerNetM3: containerM3, volPacking: sfVol }) ?? 0
      : 0,
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
