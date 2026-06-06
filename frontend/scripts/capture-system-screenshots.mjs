import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = 'D:/System/car_showroom_management/delivery/system_screenshots';
fs.mkdirSync(outDir, { recursive: true });

const routes = [
  ['02-dashboard', '/'],
  ['03-inventory', '/inventory'],
  ['04-purchases', '/purchases'],
  ['05-sales', '/sales'],
  ['06-chart-of-accounts', '/chart-of-accounts'],
  ['07-cashbox', '/cashbox'],
  ['08-backup', '/backup'],
  ['09-system-health', '/system-health'],
];

const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage',
    '--use-angle=swiftshader',
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: 'ar-IQ',
});
await context.addInitScript(() => {
  localStorage.setItem('dashboardTheme', 'light');
  document.documentElement.classList.add('light');
});
const page = await context.newPage();
page.setDefaultTimeout(20000);

async function applyCaptureStyles() {
  await page.addStyleTag({ content: `
    * {
      opacity: 1 !important;
      visibility: visible !important;
      text-shadow: none !important;
      filter: none !important;
      backdrop-filter: none !important;
    }
    html, body, .app-shell-root, .app-shell-main, .app-shell-content, .page-container {
      background: #f8fafc !important;
      color: #111827 !important;
    }
    .glass,
    .app-card,
    .app-card-flat,
    .app-topnav,
    aside,
    form,
    table,
    thead,
    tbody,
    tr,
    input,
    select,
    textarea,
    [class*="bg-card"],
    [class*="bg-background"],
    [class*="bg-white"] {
      background-color: #ffffff !important;
    }
    button {
      border-color: #d1d5db !important;
    }
    h1, h2, h3, h4, h5, h6, p, span, label, div, td, th, a {
      color: #111827 !important;
    }
    svg {
      color: #374151 !important;
    }
  ` });
}

await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
await page.emulateMedia({ colorScheme: 'light' });
await page.waitForTimeout(1500);
await applyCaptureStyles();
await page.screenshot({ path: path.join(outDir, '01-login.png'), fullPage: false });

const loginPayload = await page.evaluate(async () => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: 'Owner@12345' }),
  });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  return response.json();
});

await page.evaluate((payload) => {
  sessionStorage.setItem('auth-storage', JSON.stringify({
    state: {
      user: payload.user,
      isAuthenticated: true,
    },
    version: 0,
  }));
  localStorage.setItem('branch-storage', JSON.stringify({
    state: {
      branches: payload.branches,
      activeBranch: payload.active_branch,
    },
    version: 0,
  }));
}, loginPayload);

for (const [name, route] of routes) {
  await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(900);
  await applyCaptureStyles();
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
}

await browser.close();
console.log(outDir);
