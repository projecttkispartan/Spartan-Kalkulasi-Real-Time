import https from 'https';

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(d));
      })
      .on('error', reject);
  });
}

const base = 'https://erp.stg.solusiuntuknegeri.com';
const html = await get(`${base}/manufacture/bill-of-materials`);
const scripts = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]);

const keys = [
  'bill-of-material',
  'BillOfMaterial',
  'manufacture',
  'routing',
  'container',
  'cogs',
  'COGS',
  'work-center',
  'master',
  'packing',
  'FOB',
  'summary',
];

const found = new Set();
for (const s of scripts.slice(0, 25)) {
  try {
    const js = await get(base + s);
    for (const k of keys) {
      if (js.includes(k)) found.add(k);
    }
  } catch {
    /* skip */
  }
}

console.log(JSON.stringify({ scriptCount: scripts.length, keysFound: [...found].sort() }, null, 2));
