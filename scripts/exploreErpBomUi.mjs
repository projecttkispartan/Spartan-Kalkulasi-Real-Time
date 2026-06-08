/**
 * Eksplorasi UI ERP Staging BOM — hasil untuk dokumen QA.
 * node scripts/exploreErpBomUi.mjs
 */
import { chromium } from 'playwright';

const BASE = 'https://erp.stg.solusiuntuknegeri.com';
const USER = 'nrw';
const PASS = 'Pass*1234';
const BOM_URL = `${BASE}/manufacture/bill-of-materials`;

const out = {
  timestamp: new Date().toISOString(),
  url: BOM_URL,
  login: { ok: false, note: '' },
  pageTitle: '',
  headings: [],
  tabs: [],
  buttons: [],
  tableHeaders: [],
  links: [],
  screenshots: [],
  errors: [],
};

async function collectPage(page) {
  out.pageTitle = await page.title();
  out.headings = await page.$$eval('h1,h2,h3,h4', (els) =>
    els.map((e) => e.textContent?.trim()).filter(Boolean).slice(0, 30),
  );
  out.tabs = await page.$$eval(
    '[role="tab"], [data-state="active"], nav a, .tab, button[class*="tab"]',
    (els) => [...new Set(els.map((e) => e.textContent?.trim()).filter(Boolean))].slice(0, 40),
  );
  out.buttons = await page.$$eval('button', (els) =>
    [...new Set(els.map((e) => e.textContent?.trim()).filter(Boolean))].slice(0, 50),
  );
  out.tableHeaders = await page.$$eval('table thead th, table th', (els) =>
    [...new Set(els.map((e) => e.textContent?.trim()).filter(Boolean))].slice(0, 80),
  );
  out.links = await page.$$eval('a[href]', (els) =>
    [...new Set(els.map((e) => `${e.textContent?.trim()} → ${e.getAttribute('href')}`))]
      .filter((s) => /manufacture|bill|bom|material|proses|cogs|container|fob/i.test(s))
      .slice(0, 40),
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });

  // Login form heuristics
  const userSel = ['input[name="username"]', 'input[name="email"]', 'input[type="text"]', '#username'];
  const passSel = ['input[name="password"]', 'input[type="password"]', '#password'];
  let loggedIn = false;

  for (const u of userSel) {
    if (await page.locator(u).count()) {
      await page.locator(u).first().fill(USER);
      for (const p of passSel) {
        if (await page.locator(p).count()) {
          await page.locator(p).first().fill(PASS);
          const submit = page.locator(
            'button[type="submit"], button:has-text("Login"), button:has-text("Masuk")',
          );
          if (await submit.count()) await submit.first().click();
          else await page.keyboard.press('Enter');
          await page.waitForTimeout(4000);
          loggedIn = true;
          break;
        }
      }
      break;
    }
  }

  out.login.ok = loggedIn || !page.url().includes('login');
  out.login.note = page.url();

  await page.goto(BOM_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await collectPage(page);

  await page.screenshot({ path: 'docs/qa/evidence/erp-bom-list.png', fullPage: true }).catch(() => {});
  out.screenshots.push('docs/qa/evidence/erp-bom-list.png');

  // Try open first row / create button
  const createBtn = page.locator(
    'button:has-text("Buat"), button:has-text("Tambah"), button:has-text("Create"), button:has-text("New")',
  );
  if (await createBtn.count()) {
    await createBtn.first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await collectPage(page);
    await page.screenshot({ path: 'docs/qa/evidence/erp-bom-create.png', fullPage: true }).catch(() => {});
    out.screenshots.push('docs/qa/evidence/erp-bom-create.png');
  }

  // Click table row if any
  const row = page.locator('table tbody tr').first();
  if (await row.count()) {
    await row.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await collectPage(page);
    await page.screenshot({ path: 'docs/qa/evidence/erp-bom-detail.png', fullPage: true }).catch(() => {});
    out.screenshots.push('docs/qa/evidence/erp-bom-detail.png');
  }
} catch (e) {
  out.errors.push(String(e.message || e));
} finally {
  await browser.close();
}

console.log(JSON.stringify(out, null, 2));
