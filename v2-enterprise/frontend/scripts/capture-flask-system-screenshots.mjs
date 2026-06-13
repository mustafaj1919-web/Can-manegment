import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = 'D:/System/car_showroom_management/delivery/system_screenshots_flask';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: 'ar-IQ',
});

await page.goto('http://127.0.0.1:5000/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outDir, '01-login.png'), fullPage: false });

await page.evaluate(async () => {
  const form = new FormData();
  form.append('username', 'owner');
  form.append('password', 'Owner@12345');
  const response = await fetch('/login', { method: 'POST', body: form, redirect: 'follow' });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
});

const routes = [
  ['02-dashboard', '/'],
  ['03-inventory', '/inventory'],
  ['04-purchases', '/purchases'],
  ['05-sales', '/sales'],
  ['06-installments', '/installments'],
  ['07-expenses-cashbox', '/expenses'],
  ['08-chart-of-accounts', '/chart-of-accounts'],
  ['09-trial-balance', '/trial-balance'],
  ['10-journal-entries', '/journal-entries'],
  ['11-backups', '/backups'],
];

for (const [name, route] of routes) {
  await page.goto(`http://127.0.0.1:5000${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
}

await browser.close();
console.log(outDir);
