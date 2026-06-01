/**
 * Ekstrak gambar embedded dari workbook .xlsx (OOXML / zip).
 * SheetJS (xlsx) tidak membaca gambar — file gambar ada di xl/media/.
 */
import JSZip from 'jszip';

const BROWSER_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

function normalizePath(target) {
  const t = String(target || '').replace(/\\/g, '/');
  if (t.startsWith('/')) return t.slice(1);
  if (t.startsWith('../')) return `xl/${t.replace(/^\.\.\//, '')}`;
  if (t.startsWith('xl/')) return t;
  return `xl/${t}`;
}

function parseRelationships(xml) {
  const map = {};
  if (!xml) return map;
  const re = /Id="(rId\d+)"[^>]*Target="([^"]+)"/g;
  let m;
  while ((m = re.exec(xml))) {
    map[m[1]] = normalizePath(m[2]);
  }
  return map;
}

function parseWorkbookSheets(workbookXml) {
  const sheets = [];
  const re = /<sheet[^>]*\bname="([^"]*)"[^>]*\br:id="(rId\d+)"/g;
  let m;
  while ((m = re.exec(workbookXml))) {
    sheets.push({ name: m[1], rId: m[2] });
  }
  return sheets;
}

function parseDrawingAnchors(drawingXml, drawingRels) {
  const anchors = [];
  if (!drawingXml) return anchors;
  const re = /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?r:embed="(rId\d+)"/g;
  let m;
  while ((m = re.exec(drawingXml))) {
    const excelRow = parseInt(m[1], 10) + 1;
    const mediaPath = drawingRels[m[2]];
    if (mediaPath) anchors.push({ excelRow, mediaPath });
  }
  return anchors;
}

function bufferToBase64(buffer) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function extFromPath(path) {
  const m = String(path).match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : '';
}

/**
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {Promise<{ imagesBySheetRow: Map<string, Map<number, string>>, stats: object, allMedia: object[] }>}
 */
export async function extractExcelImages(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const stats = {
    mediaFiles: 0,
    browserReady: 0,
    skippedEmf: 0,
    skippedWmf: 0,
    skippedOther: 0,
    anchors: 0,
    mapped: 0,
  };

  const mediaDataUrl = new Map();

  for (const [path, entry] of Object.entries(zip.files)) {
    if (!path.startsWith('xl/media/') || entry.dir) continue;
    stats.mediaFiles += 1;
    const ext = extFromPath(path);
    const mime = BROWSER_MIME[ext];
    if (!mime) {
      if (ext === 'emf') stats.skippedEmf += 1;
      else if (ext === 'wmf') stats.skippedWmf += 1;
      else stats.skippedOther += 1;
      continue;
    }
    const raw = await entry.async('arraybuffer');
    const b64 = bufferToBase64(raw);
    const dataUrl = `data:${mime};base64,${b64}`;
    mediaDataUrl.set(path, dataUrl);
    stats.browserReady += 1;
  }

  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const workbookRelsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !workbookRelsXml) {
    return { imagesBySheetRow: new Map(), stats, allMedia: [] };
  }

  const workbookRels = parseRelationships(workbookRelsXml);
  const sheets = parseWorkbookSheets(workbookXml);
  const imagesBySheetRow = new Map();

  for (const sheet of sheets) {
    const sheetPath = workbookRels[sheet.rId];
    if (!sheetPath) continue;
    const sheetFile = sheetPath.split('/').pop();
    const sheetRelsPath = `xl/worksheets/_rels/${sheetFile}.rels`;
    const sheetRelsXml = await zip.file(sheetRelsPath)?.async('string');
    if (!sheetRelsXml) continue;

    const sheetRels = parseRelationships(sheetRelsXml);
    const rowMap = new Map();

    for (const [, target] of Object.entries(sheetRels)) {
      if (!target.includes('/drawings/drawing') || !target.endsWith('.xml')) continue;

      const drawingXml = await zip.file(target)?.async('string');
      const drawingFile = target.split('/').pop();
      const drawingRelsPath = `xl/drawings/_rels/${drawingFile}.rels`;
      const drawingRelsXml = await zip.file(drawingRelsPath)?.async('string');
      const drawingRels = parseRelationships(drawingRelsXml);
      const anchors = parseDrawingAnchors(drawingXml, drawingRels);

      for (const { excelRow, mediaPath } of anchors) {
        stats.anchors += 1;
        const dataUrl = mediaDataUrl.get(mediaPath);
        if (!dataUrl) continue;
        if (!rowMap.has(excelRow)) {
          rowMap.set(excelRow, dataUrl);
          stats.mapped += 1;
        }
      }
    }

    if (rowMap.size) imagesBySheetRow.set(sheet.name, rowMap);
  }

  const mediaByNumber = {};
  for (const [path, dataUrl] of mediaDataUrl) {
    const m = path.match(/image(\d+)\./i);
    if (m) mediaByNumber[parseInt(m[1], 10)] = dataUrl;
  }

  const allMedia = [...mediaDataUrl.entries()].map(([path, dataUrl]) => ({ path, dataUrl }));

  return { imagesBySheetRow, stats, allMedia, mediaByNumber };
}

/** Indeks foto di kolom BOM TEMPLATE (1,2,3…) → image7.jpeg, image8.jpeg, … */
const SPARTAN_PHOTO_INDEX_OFFSET = 6;

export function resolvePhotoIndexUrl(photoIndex, mediaByNumber) {
  const idx = Number(photoIndex) || 0;
  if (idx <= 0) return null;
  return (
    mediaByNumber[idx + SPARTAN_PHOTO_INDEX_OFFSET]
    || mediaByNumber[idx]
    || null
  );
}

function walkBom(node, fn) {
  if (!node) return;
  fn(node);
  (node.children || []).forEach((c) => walkBom(c, fn));
}

/**
 * Pasang foto ke node BOM dari peta baris sheet BOM TEMPLATE.
 */
export function applyExcelImagesToBom(bomData, imagesBySheetRow, mediaByNumber = {}) {
  const bomRows = imagesBySheetRow.get('BOM TEMPLATE');
  const hasRowMap = bomRows?.size > 0;
  const hasIndexPool = Object.keys(mediaByNumber).length > 0;
  if (!hasRowMap && !hasIndexPool) return { applied: 0, productFoto: false, appliedByIndex: 0 };

  let applied = 0;
  let appliedByIndex = 0;
  let productFoto = false;

  const headerImages = bomRows
    ? [...bomRows.entries()].filter(([row]) => row < 20).sort((a, b) => a[0] - b[0])
    : [];

  if (headerImages.length && bomData && !bomData.foto) {
    bomData.foto = headerImages[0][1];
    productFoto = true;
  }

  walkBom(bomData, (node) => {
    if (node.excelRow && bomRows?.has(node.excelRow) && !node.foto) {
      node.foto = bomRows.get(node.excelRow);
      applied += 1;
    }
    if (!node.foto && node.photoIndex) {
      const url = resolvePhotoIndexUrl(node.photoIndex, mediaByNumber);
      if (url) {
        node.foto = url;
        appliedByIndex += 1;
      }
    }
  });

  return { applied, appliedByIndex, productFoto };
}

export async function attachExcelImagesToProject(project, buffer) {
  const { imagesBySheetRow, stats, allMedia, mediaByNumber } = await extractExcelImages(buffer);
  const { applied, appliedByIndex, productFoto } = applyExcelImagesToBom(
    project.bomData,
    imagesBySheetRow,
    mediaByNumber,
  );

  project.excelImages = {
    bySheet: Object.fromEntries(
      [...imagesBySheetRow.entries()].map(([name, m]) => [name, Object.fromEntries(m)]),
    ),
    mediaPaths: allMedia.map((x) => x.path),
  };
  project.importImageStats = {
    ...stats,
    applied,
    appliedByIndex,
    appliedTotal: applied + appliedByIndex,
    productFoto,
    note:
      stats.skippedEmf > 0
        ? `${stats.skippedEmf} gambar format EMF (diagram proses) tidak bisa ditampilkan di browser.`
        : undefined,
  };

  return project;
}
