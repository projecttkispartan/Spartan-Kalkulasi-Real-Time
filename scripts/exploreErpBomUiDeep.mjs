/**
 * Eksplorasi mendalam ERP BOM staging — editor tabs & tabel.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'https://erp.stg.solusiuntuknegeri.com';
const USER = 'nrw';
const PASS = 'Pass*1234';
const BOM_LIST = `${BASE}/manufacture/bill-of-materials`;

mkdirSync('docs/qa/evidence', { recursive: true });

const report = {
  timestamp: new Date().toISOString(),
  environment: { base: BASE, user: USER },
  listPage: {},
  detailPages: [],
  createPage: {},
};

async function snap(page, name) {
  const path = `docs/qa/evidence/${name}.png`;
  await page.screenshot({ path, fullPage: true }).catch(() => {});
  return path;
}

async function scrape(page) {
  return {
    url: page.url(),
    title: await page.title(),
    headings: await page.$$eval('h1,h2,h3,h4,h5', (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean).slice(0, 40),
    ),
    navLinks: await page.$$eval('a[href*="/manufacture"]', (els) =>
      [...new Set(els.map((e) => e.textContent?.trim() + ' | ' + e.getAttribute('href')))].slice(0, 30),
    ),
    tabLike: await page.$$eval(
      '[role="tab"], button[data-state], [class*="TabsTrigger"], nav [class*="tab"]',
      (els) => [...new Set(els.map((e) => e.textContent?.trim()).filter(Boolean))].slice(0, 50),
    ),
    buttons: await page.$$eval('button', (els) =>
      [...new Set(els.map((e) => e.textContent?.trim()).filter((t) => t && t.length < 60))].slice(0, 60),
    ),
    tableHeaders: await page.$$eval('table thead th, table th', (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean),
    ),
    labels: await page.$$eval('label', (els) =>
      [...new Set(els.map((e) => e.textContent?.trim()).filter(Boolean))].slice(0, 60),
    ),
  };
}

async function login(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const user = page.locator('input[type="text"], input[name="username"], input[name="email"]').first();
  const pass = page.locator('input[type="password"]').first();
  if (await user.count()) {
    await user.fill(USER);
    await pass.fill(PASS);
    const btn = page.locator('button[type="submit"], button:has-text("Masuk"), button:has-text("Login")');
    if (await btn.count()) await btn.first().click();
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

try {
  await login(page);
  await page.goto(BOM_LIST, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  report.listPage = await scrape(page);
  report.listPage.screenshot = await snap(page, 'erp-01-bom-list');

  // BOM Baru
  const newLink = page.locator('a[href*="/bill-of-materials/new"], button:has-text("BOM Baru")');
  if (await newLink.count()) {
    await newLink.first().click();
    await page.waitForTimeout(4000);
    report.createPage = await scrape(page);
    report.createPage.screenshot = await snap(page, 'erp-02-bom-new');
  }

  // Buka BOM pertama dari tabel
  await page.goto(BOM_LIST, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const firstLink = page.locator('table tbody tr a, table tbody tr td:nth-child(3) a, table tbody tr').first();
  if (await firstLink.count()) {
    await firstLink.click();
    await page.waitForTimeout(5000);
    let detail = await scrape(page);
    detail.screenshot = await snap(page, 'erp-03-bom-detail');
    report.detailPages.push({ step: 'initial', ...detail });

    // Klik semua tab-like buttons yang relevan
    const tabTexts = [
      'Produk',
      'Struktur',
      'Container',
      'Material',
      'Proses',
      'Summary',
      'COGS',
      'FOB',
      'Kalkulasi',
      'Packing',
      'Routing',
      'Informasi',
    ];
    for (const t of tabTexts) {
      const tab = page.locator(`button:has-text("${t}"), a:has-text("${t}"), [role="tab"]:has-text("${t}")`);
      if (await tab.count()) {
        await tab.first().click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(2500);
        const s = await scrape(page);
        s.screenshot = await snap(page, `erp-tab-${t.toLowerCase().replace(/\s+/g, '-')}`);
        report.detailPages.push({ step: `tab:${t}`, ...s });
      }
    }
  }
} catch (e) {
  report.error = String(e.message || e);
} finally {
  await browser.close();
}

writeFileSync('docs/qa/erp-ui-probe-full.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  listHeaders: report.listPage?.tableHeaders,
  createHeadings: report.createPage?.headings,
  detailSteps: report.detailPages?.map((d) => ({ step: d.step, url: d.url, headers: d.tableHeaders?.slice(0, 15), tabs: d.tabLike?.slice(0, 15) })),
}, null, 2));
