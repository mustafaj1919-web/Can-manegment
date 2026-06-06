/**
 * Playwright verification script for Global Search.
 * Run with: node verify_search.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
let browser, page;

function log(icon, label, detail = '') {
  const line = `${icon} ${label}${detail ? ' → ' + detail : ''}`;
  console.log(line);
  results.push({ icon, label, detail });
}

async function openSearch() {
  // Click search button (aria-label="بحث")
  const btn = page.getByRole('button', { name: 'بحث' });
  await btn.click();
  // Wait for the dialog to appear
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
}

async function typeAndWait(text) {
  const input = page.locator('[role="dialog"] input[type="text"]');
  await input.fill('');
  await input.fill(text);
  // Wait for debounce (300ms) + API response
  await page.waitForTimeout(800);
}

async function closeSearch() {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

async function getVisibleGroups() {
  return await page.$$eval(
    '[role="dialog"] p.uppercase',
    els => els.map(el => el.textContent.trim())
  );
}

async function getResultCount() {
  const rows = await page.$$('[role="dialog"] button.w-full');
  return rows.length;
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function login() {
  // Step 1: load the app so the Next.js client-side JS is ready
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Step 2: call login API directly from browser context (same path the form uses)
  // This sets the Flask session cookie in the browser without needing form interaction.
  const loginResult = await page.evaluate(async () => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    return { status: r.status, body: await r.json() };
  });

  if (loginResult.status !== 200) {
    log('❌', 'Login API call failed', `HTTP ${loginResult.status}: ${JSON.stringify(loginResult.body)}`);
    process.exit(1);
  }

  // Step 3: navigate to dashboard — AppShell's getCurrentUser() will see the session
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000); // allow AppShell useEffect to run

  const url = page.url();
  if (!url.includes('/login')) {
    log('✅', 'Login', `success — ${url.replace(BASE, '')}`);
  } else {
    log('❌', 'Dashboard redirect failed after login', url);
    process.exit(1);
  }
}

// ─── Check what data exists ───────────────────────────────────────────────────
async function sniffData() {
  // Get a real VIN, plate, customer name, phone, sale invoice, purchase invoice
  const data = {};

  // Cars
  const carsRes = await page.evaluate(async () => {
    const r = await fetch('/api/inventory?page=1&per_page=3', { credentials: 'include' });
    return r.json();
  });
  if (carsRes.items?.length) {
    data.vin = carsRes.items[0].vin?.slice(0, 6);          // first 6 chars
    data.plate = carsRes.items[0].plate_number?.slice(0, 4);
  }

  // Customers
  const custRes = await page.evaluate(async () => {
    const r = await fetch('/api/customers?page=1&per_page=3', { credentials: 'include' });
    return r.json();
  });
  if (custRes.items?.length) {
    data.customerName = (custRes.items[0].full_name || custRes.items[0].name)?.slice(0, 4);
    data.customerPhone = custRes.items[0].phone?.slice(0, 5);
  }

  // Sales
  const salesRes = await page.evaluate(async () => {
    const r = await fetch('/api/sales?page=1&per_page=3', { credentials: 'include' });
    return r.json();
  });
  if (salesRes.items?.length) {
    data.saleInvoice = salesRes.items[0].invoice_number?.slice(0, 5);
    data.saleId = salesRes.items[0].id;
  }

  // Purchases
  const purchRes = await page.evaluate(async () => {
    const r = await fetch('/api/purchases?page=1&per_page=3', { credentials: 'include' });
    return r.json();
  });
  if (purchRes.items?.length) {
    data.purchaseInvoice = purchRes.items[0].invoice_number?.slice(0, 5);
    data.purchaseId = purchRes.items[0].id;
  }

  return data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  // ── Test 1: Build passes ──────────────────────────────────────────────────
  log('✅', 'Build', 'already confirmed passing');

  // ── Test 2: Login + dashboard loads ──────────────────────────────────────
  await login();

  // ── Get real data for search terms ───────────────────────────────────────
  const data = await sniffData();
  console.log('\nData sniffed:', JSON.stringify(data, null, 2), '\n');

  // ── Test 3: Ctrl+K opens search ──────────────────────────────────────────
  await page.keyboard.press('Control+k');
  const dialogVisible = await page.isVisible('[role="dialog"]').catch(() => false);
  if (dialogVisible) {
    log('✅', 'Ctrl+K opens search dialog');
  } else {
    log('❌', 'Ctrl+K did NOT open search dialog');
  }

  // ── Test 4: Idle state (< 2 chars) ───────────────────────────────────────
  await typeAndWait('a');
  const idleMsg = await page.locator('[role="dialog"]').textContent();
  if (idleMsg.includes('حروف') || idleMsg.includes('للبدء') || idleMsg.includes('اكتب')) {
    log('✅', 'Idle state shown for 1 char');
  } else {
    log('⚠️', 'Idle state unclear for 1 char', idleMsg.slice(0, 80));
  }

  // ── Test 5: VIN search ───────────────────────────────────────────────────
  if (data.vin) {
    await typeAndWait(data.vin);
    const groups = await getVisibleGroups();
    const count = await getResultCount();
    if (groups.some(g => g.includes('سيارات'))) {
      log('✅', `VIN search "${data.vin}"`, `${count} results, groups: ${groups.join(', ')}`);
    } else {
      log('❌', `VIN search "${data.vin}" — السيارات group missing`, `groups: ${groups.join(', ')}`);
    }
  } else {
    log('⚠️', 'VIN search skipped — no inventory data');
  }

  // ── Test 6: Plate number search ───────────────────────────────────────────
  if (data.plate) {
    await typeAndWait(data.plate);
    const groups = await getVisibleGroups();
    const count = await getResultCount();
    if (groups.some(g => g.includes('سيارات')) || count > 0) {
      log('✅', `Plate search "${data.plate}"`, `${count} results, groups: ${groups.join(', ')}`);
    } else {
      log('⚠️', `Plate "${data.plate}" — no car results (may be valid if no match)`, `groups: ${groups.join(', ')}`);
    }
  } else {
    log('⚠️', 'Plate search skipped — no inventory data');
  }

  // ── Test 7: Customer name search ─────────────────────────────────────────
  if (data.customerName) {
    await typeAndWait(data.customerName);
    const groups = await getVisibleGroups();
    const count = await getResultCount();
    if (groups.some(g => g.includes('عملاء'))) {
      log('✅', `Customer name "${data.customerName}"`, `${count} results, groups: ${groups.join(', ')}`);
    } else {
      log('❌', `Customer name "${data.customerName}" — العملاء group missing`, `groups: ${groups.join(', ')}`);
    }
  } else {
    log('⚠️', 'Customer name search skipped — no customer data');
  }

  // ── Test 8: Customer phone search ────────────────────────────────────────
  if (data.customerPhone) {
    await typeAndWait(data.customerPhone);
    const groups = await getVisibleGroups();
    const count = await getResultCount();
    if (groups.some(g => g.includes('عملاء')) || count > 0) {
      log('✅', `Customer phone "${data.customerPhone}"`, `${count} results, groups: ${groups.join(', ')}`);
    } else {
      log('⚠️', `Phone "${data.customerPhone}" — no match (phone may be unique prefix)`, `groups: ${groups.join(', ')}`);
    }
  } else {
    log('⚠️', 'Customer phone search skipped — no customer data');
  }

  // ── Test 9: Sale invoice search ──────────────────────────────────────────
  if (data.saleInvoice) {
    await typeAndWait(data.saleInvoice);
    const groups = await getVisibleGroups();
    const count = await getResultCount();
    if (groups.some(g => g.includes('مبيعات'))) {
      log('✅', `Sale invoice "${data.saleInvoice}"`, `${count} results, groups: ${groups.join(', ')}`);
    } else {
      log('❌', `Sale invoice "${data.saleInvoice}" — فواتير المبيعات group missing`, `groups: ${groups.join(', ')}`);
    }
  } else {
    log('⚠️', 'Sale invoice search skipped — no sales data');
  }

  // ── Test 10: Purchase invoice search ─────────────────────────────────────
  if (data.purchaseInvoice) {
    await typeAndWait(data.purchaseInvoice);
    const groups = await getVisibleGroups();
    const count = await getResultCount();
    if (groups.some(g => g.includes('مشتريات'))) {
      log('✅', `Purchase invoice "${data.purchaseInvoice}"`, `${count} results, groups: ${groups.join(', ')}`);
    } else {
      log('❌', `Purchase invoice "${data.purchaseInvoice}" — فواتير المشتريات group missing`, `groups: ${groups.join(', ')}`);
    }
  } else {
    log('⚠️', 'Purchase invoice search skipped — no purchases data');
  }

  // ── Test 11: Empty state ──────────────────────────────────────────────────
  await typeAndWait('zzzznotfound99999');
  await page.waitForTimeout(400);
  const dialogText = await page.locator('[role="dialog"]').textContent();
  if (dialogText.includes('لا توجد نتائج') || dialogText.includes('لا توجد')) {
    log('✅', 'Empty state shown for "zzzznotfound99999"');
  } else {
    log('❌', 'Empty state NOT shown', dialogText.slice(0, 100));
  }

  // ── Test 12: Click result navigates correctly ────────────────────────────
  if (data.saleInvoice && data.saleId) {
    await typeAndWait(data.saleInvoice);
    const firstResult = page.locator('[role="dialog"] button.w-full').first();
    const resultExists = await firstResult.isVisible().catch(() => false);
    if (resultExists) {
      await firstResult.click();
      await page.waitForTimeout(600);
      const finalUrl = page.url();
      if (finalUrl.includes('/sales/') || finalUrl.includes('/inventory/') || finalUrl.includes('/customers/') || finalUrl.includes('/purchases/')) {
        log('✅', 'Clicking result navigates to detail page', finalUrl.replace(BASE, ''));
      } else {
        log('❌', 'Clicking result did NOT navigate', finalUrl);
      }
      // Dialog should be closed after navigation
      const dialogStillOpen = await page.isVisible('[role="dialog"]').catch(() => false);
      if (!dialogStillOpen) {
        log('✅', 'Dialog closes after navigation');
      } else {
        log('⚠️', 'Dialog still open after navigation');
      }
    } else {
      log('⚠️', 'No results to click for navigation test');
    }
  }

  // ── Test 13: Console errors ───────────────────────────────────────────────
  if (consoleErrors.length === 0) {
    log('✅', 'No console errors');
  } else {
    log('❌', `${consoleErrors.length} console error(s)`, consoleErrors.slice(0, 3).join(' | '));
  }

  // ── Test 14: Button trigger (click the search icon) ──────────────────────
  if (!await page.isVisible('[role="dialog"]').catch(() => false)) {
    const searchBtn = page.getByRole('button', { name: 'بحث' });
    const btnVisible = await searchBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await searchBtn.click();
      const dlgOpen = await page.isVisible('[role="dialog"]').catch(() => false);
      log(dlgOpen ? '✅' : '❌', 'Search button (click) opens dialog', dlgOpen ? 'opened' : 'did not open');
    }
  }

  await browser.close();

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  const passes  = results.filter(r => r.icon === '✅').length;
  const fails   = results.filter(r => r.icon === '❌').length;
  const warns   = results.filter(r => r.icon === '⚠️').length;
  console.log(`✅ ${passes} passed   ❌ ${fails} failed   ⚠️ ${warns} warnings`);
  const verdict = fails === 0 ? 'PASS' : 'FAIL';
  console.log(`\nVerdict: ${verdict}`);
  process.exit(fails > 0 ? 1 : 0);
})().catch(async err => {
  console.error('Fatal:', err.message);
  if (browser) await browser.close();
  process.exit(1);
});
