import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'https://erp.stg.solusiuntuknegeri.com';
const out = { wizardSteps: [] };

async function login(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  if (await page.locator('input[type="text"]').count()) {
    await page.locator('input[type="text"]').first().fill('nrw');
    await page.locator('input[type="password"]').first().fill('Pass*1234');
    await page.locator('button[type="submit"], button:has-text("Masuk")').first().click().catch(() => {});
    await page.waitForTimeout(4000);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await login(page);
await page.goto(`${BASE}/manufacture/bill-of-materials/new`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

const tabs = page.locator('[role="tab"]');
const n = await tabs.count();
for (let i = 0; i < n; i++) {
  const label = (await tabs.nth(i).textContent())?.trim();
  await tabs.nth(i).click();
  await page.waitForTimeout(2500);
  out.wizardSteps.push({
    tab: label,
    url: page.url(),
    headings: await page.$$eval('h1,h2,h3,h4', (els) => els.map((e) => e.textContent?.trim()).filter(Boolean)),
    labels: await page.$$eval('label', (els) => [...new Set(els.map((e) => e.textContent?.trim()).filter(Boolean))].slice(0, 40)),
    th: await page.$$eval('table th', (els) => els.map((e) => e.textContent?.trim()).filter(Boolean)),
    inputs: await page.$$eval('input,select,textarea', (els) =>
      els.slice(0, 30).map((e) => ({ tag: e.tagName, name: e.getAttribute('name'), placeholder: e.getAttribute('placeholder'), type: e.getAttribute('type') })),
    ),
    btns: await page.$$eval('button', (els) => [...new Set(els.map((e) => e.textContent?.trim()).filter((t) => t && t.length < 40))].slice(0, 30)),
  });
}

// Expand first row on list if Perluas works
await page.goto(`${BASE}/manufacture/bill-of-materials`, { waitUntil: 'networkidle' });
const expand = page.locator('table tbody tr button').first();
if (await expand.count()) {
  await expand.click();
  await page.waitForTimeout(2000);
  out.expandedRow = {
    th: await page.$$eval('table th', (els) => els.map((e) => e.textContent?.trim()).filter(Boolean)),
    text: await page.locator('table tbody').first().innerText().catch(() => ''),
  };
}

await browser.close();
writeFileSync('docs/qa/erp-wizard-steps.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
