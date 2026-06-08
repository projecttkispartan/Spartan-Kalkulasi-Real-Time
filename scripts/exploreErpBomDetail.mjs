/**
 * Buka detail BOM ERP via aksi baris / link edit.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('docs/qa/evidence', { recursive: true });
const BASE = 'https://erp.stg.solusiuntuknegeri.com';
const report = { rows: [], pages: [] };

async function login(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  const user = page.locator('input[type="text"]').first();
  if (await user.count()) {
    await user.fill('nrw');
    await page.locator('input[type="password"]').first().fill('Pass*1234');
    await page.locator('button[type="submit"], button:has-text("Masuk")').first().click().catch(() => page.keyboard.press('Enter'));
    await page.waitForTimeout(4000);
  }
}

async function scrape(page) {
  return {
    url: page.url(),
    headings: await page.$$eval('h1,h2,h3,h4', (els) => els.map((e) => e.textContent?.trim()).filter(Boolean)),
    tabs: await page.$$eval('[role="tab"]', (els) => els.map((e) => e.textContent?.trim()).filter(Boolean)),
    th: await page.$$eval('table th', (els) => els.map((e) => e.textContent?.trim()).filter(Boolean)),
    btns: await page.$$eval('button', (els) => [...new Set(els.map((e) => e.textContent?.trim()).filter((t) => t && t.length < 50))].slice(0, 40)),
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

try {
  await login(page);
  await page.goto(`${BASE}/manufacture/bill-of-materials`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Collect row action links
  report.rows = await page.$$eval('table tbody tr', (rows) =>
    rows.slice(0, 5).map((tr) => {
      const tds = [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim());
      const links = [...tr.querySelectorAll('a')].map((a) => ({ text: a.textContent?.trim(), href: a.getAttribute('href') }));
      const btns = [...tr.querySelectorAll('button')].map((b) => b.textContent?.trim());
      return { tds, links, btns };
    }),
  );

  // Try /new page fully
  await page.goto(`${BASE}/manufacture/bill-of-materials/new`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  let s = await scrape(page);
  await page.screenshot({ path: 'docs/qa/evidence/erp-new-page.png', fullPage: true });
  report.pages.push({ name: 'new', ...s });

  // Try first href in table containing bill-of-materials/
  await page.goto(`${BASE}/manufacture/bill-of-materials`, { waitUntil: 'networkidle' });
  const hrefs = await page.$$eval('table a[href*="bill-of-materials/"]', (as) =>
    as.map((a) => a.getAttribute('href')).filter((h) => h && !h.endsWith('/new')),
  );
  report.detailHrefs = [...new Set(hrefs)].slice(0, 5);

  if (report.detailHrefs?.length) {
    await page.goto(BASE + report.detailHrefs[0], { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);
    s = await scrape(page);
    await page.screenshot({ path: 'docs/qa/evidence/erp-detail-page.png', fullPage: true });
    report.pages.push({ name: 'detail', ...s });

    // role=tab clicks only within main content
    const tabs = page.locator('[role="tab"]');
    const n = await tabs.count();
    for (let i = 0; i < Math.min(n, 12); i++) {
      const label = (await tabs.nth(i).textContent())?.trim();
      await tabs.nth(i).click().catch(() => {});
      await page.waitForTimeout(2000);
      const tabScrape = await scrape(page);
      report.pages.push({ name: `tab-${label}`, ...tabScrape });
    }
  }

  // Row action menu (three dots)
  await page.goto(`${BASE}/manufacture/bill-of-materials`, { waitUntil: 'networkidle' });
  const actionBtn = page.locator('table tbody tr').first().locator('button').last();
  if (await actionBtn.count()) {
    await actionBtn.click();
    await page.waitForTimeout(1000);
    report.actionMenu = await page.$$eval('[role="menuitem"], [role="menu"] button, [data-radix-collection-item]', (els) =>
      els.map((e) => e.textContent?.trim()).filter(Boolean),
    );
  }
} catch (e) {
  report.error = String(e.message || e);
} finally {
  await browser.close();
}

writeFileSync('docs/qa/erp-bom-structure.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
