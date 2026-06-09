import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = 'C:/Users/Mustafa\'s PC/.gemini/antigravity-ide/brain/2b2731ae-631c-48d1-9908-2ba1a5392e0d';
fs.mkdirSync(outDir, { recursive: true });

const routes = [
  ['02-dashboard', '/'],
  ['03-inventory', '/inventory'],
  ['04-customers', '/customers'],
  ['05-sales', '/sales'],
  ['06-accounting', '/accounting'],
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
  localStorage.setItem('dashboardTheme', 'dark');
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
});
const page = await context.newPage();
page.setDefaultTimeout(20000);

console.log('Navigating to login page...');
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Capture Login Page in Dark Theme
console.log('Capturing Login screen...');
await page.screenshot({ path: path.join(outDir, '01-login.png'), fullPage: false });

console.log('Performing login...');
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
  console.log(`Navigating to ${route}...`);
  await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000); // Allow data to load
  
  const currentUrl = page.url();
  const title = await page.title();
  const textLength = await page.evaluate(() => document.body.innerText.length);
  console.log(`Successfully navigated to: ${currentUrl} | Title: "${title}" | Text length: ${textLength}`);
  
  console.log(`Capturing ${name}...`);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
}

await browser.close();
console.log('Screenshots captured successfully to: ', outDir);
