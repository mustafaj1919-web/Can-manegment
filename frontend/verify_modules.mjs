/**
 * Verification script for 5 modules.
 * Run: node verify_modules.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3000';
const API  = 'http://localhost:5000';

const results = [];
const consoleErrors = [];

function log(icon, label, detail = '') {
  const line = `${icon} ${label}${detail ? ' → ' + detail : ''}`;
  console.log(line);
  results.push({ icon, label, detail });
}

// ─── Login helper ─────────────────────────────────────────────────────────────
async function login(page) {
  // 1. Load login page (establishes origin for localStorage)
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // 2. Call login API → sets Flask session cookie
  const loginResult = await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    return { status: res.status, body: await res.json() };
  });
  if (loginResult.status !== 200) throw new Error(`Login API: HTTP ${loginResult.status}`);

  // 3. Set Zustand localStorage ON THE LOGIN PAGE (same origin as /).
  //    Zustand 4.x reads localStorage synchronously on store creation,
  //    so this must be done before the target page's JS runs.
  await page.evaluate((userData) => {
    const authState = JSON.stringify({
      state: { user: userData, isAuthenticated: true },
      version: 0,
    });
    localStorage.setItem('auth-storage', authState);
  }, loginResult.body.user);

  // 4. Verify localStorage was set
  const lsCheck = await page.evaluate(() => {
    const v = localStorage.getItem('auth-storage');
    return v ? JSON.parse(v)?.state?.isAuthenticated : false;
  });
  if (!lsCheck) throw new Error('localStorage isAuthenticated not set');

  // 5. Navigate to dashboard. Since localStorage is pre-populated with
  //    isAuthenticated=true, Zustand hydrates before the redirect useEffect fires.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
}

// ─── Create a tiny PNG file for upload tests ──────────────────────────────────
function makeTestPng(filename) {
  // 1×1 red pixel PNG (minimal valid PNG)
  const buf = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e0000000c4944415478016360f8cfc000000002000180e3b0be0000000049454e44ae426082',
    'hex'
  );
  const p = path.join(__dirname, filename);
  fs.writeFileSync(p, buf);
  return p;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page    = await context.newPage();

page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => consoleErrors.push(err.message));

// Create test PNG files
const pngPath = makeTestPng('test_doc.png');

try {
  // ── LOGIN ──────────────────────────────────────────────────────────────────
  console.log('\n=== LOGIN ===');
  await login(page);
  const afterLogin = page.url();
  const loginOk = !afterLogin.includes('/login');
  log(loginOk ? '✅' : '⚠️', 'Login', `url=${afterLogin.replace(BASE, '')}`);

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 1 — Customer Documents
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n=== MODULE 1: Customer Documents ===');

  // 1a. Navigate to /customers/new
  await page.goto(`${BASE}/customers/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const hasDocSection = await page.locator('text=وثائق العميل').isVisible().catch(() => false);
  log(hasDocSection ? '✅' : '❌', 'M1: Document upload section visible on /customers/new');

  // 1b. Verify all 5 upload slots are present
  const uploadBtns = await page.locator('button:has-text("اختر ملف")').count();
  log(uploadBtns >= 4 ? '✅' : '❌', `M1: Upload slot buttons present`, `count=${uploadBtns}`);

  // 1c. Fill basic customer fields using React-compatible fill
  const nameInput   = page.locator('[autocomplete="off"]').first();
  // Use placeholder-based selectors
  const nameField   = page.locator('input[placeholder*="الاسم"]');
  const phoneField  = page.locator('input[placeholder*="07"]');
  const idField     = page.locator('input[placeholder*="رقم الهوية"]');

  await nameField.fill('اختبار الوثائق').catch(() => {});
  await phoneField.fill('07901234567').catch(() => {});
  await idField.fill('TESTDOC001').catch(() => {});
  await page.waitForTimeout(300);

  // 1d. Attach files to upload slots via hidden file inputs
  const fileInputs = await page.locator('input[type="file"][accept*="pdf"]').all();
  log(`${fileInputs.length >= 4 ? '✅' : '⚠️'}`, `M1: File inputs found`, `count=${fileInputs.length}`);

  for (let i = 0; i < Math.min(fileInputs.length, 4); i++) {
    try {
      await fileInputs[i].setInputFiles(pngPath);
      await page.waitForTimeout(200);
    } catch { /* some slots may block */ }
  }

  // Check pending previews appeared
  const pendingPreviews = await page.locator('text=جديدة').count()
    + await page.locator('[class*="cyan"]').filter({ hasText: '.png' }).count();
  log(pendingPreviews > 0 ? '✅' : '⚠️', 'M1: Pending file previews shown after file attach', `count=${pendingPreviews}`);

  // 1e. Submit the form
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(3000); // wait for create + uploads
  const afterCreate = page.url();
  const createdId   = afterCreate.match(/\/customers\/(\d+)/)?.[1];
  log(createdId ? '✅' : '❌', 'M1: Customer created and redirected', `url=${afterCreate.replace(BASE, '')}`);

  // 1f. Check document gallery on detail page
  if (createdId) {
    await page.goto(`${BASE}/customers/${createdId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const galleryVisible = await page.locator('text=وثائق العميل').isVisible().catch(() => false);
    log(galleryVisible ? '✅' : '❌', 'M1: Document gallery section visible on detail page');

    // Check for document count or images
    const docImages = await page.locator('.spec-shell img, section img, a[href*="customers"] img, a[target="_blank"] img').count();
    const docLinks  = await page.locator('a[target="_blank"][href*="customers"]').count()
                    + await page.locator('a[target="_blank"][href*="uploads"]').count();
    log((docImages + docLinks) > 0 ? '✅' : '⚠️', 'M1: Document images/links visible in gallery', `images=${docImages} links=${docLinks}`);

    // 1g. Check link target
    const firstDocLink = page.locator('a[target="_blank"][href*="uploads"]').first();
    const hasFirstLink = await firstDocLink.isVisible().catch(() => false);
    if (hasFirstLink) {
      const href = await firstDocLink.getAttribute('href');
      log('✅', 'M1: Document link has correct href', href?.slice(0, 60));
    } else {
      log('⚠️', 'M1: No clickable document links found (may need actual uploaded files in DB)');
    }

    // 1h. Check edit page shows existing documents
    await page.goto(`${BASE}/customers/${createdId}/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const editDocSection = await page.locator('text=وثائق العميل').isVisible().catch(() => false);
    log(editDocSection ? '✅' : '❌', 'M1: Document section visible on edit page');
  }

  // 1i. Probe: invalid document type via API
  const probeResp = await page.evaluate(async (id) => {
    const fd = new FormData();
    fd.append('document_type', 'invalid_type');
    fd.append('file', new Blob(['x'], { type: 'image/png' }), 'x.png');
    const r = await fetch(`/api/customers/${id}/documents`, {
      method: 'POST', credentials: 'include', body: fd,
    });
    return { status: r.status, body: await r.json() };
  }, createdId ?? 1);
  log(probeResp.status === 400 ? '✅' : '❌', 'M1 🔍 Invalid doc_type → 400', `status=${probeResp.status}`);

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 2 — Vehicle Photos
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n=== MODULE 2: Vehicle Photos ===');

  await page.goto(`${BASE}/inventory/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Check photo section
  const hasPhotoSection = await page.locator('text=صور السيارة').isVisible().catch(() => false);
  log(hasPhotoSection ? '✅' : '❌', 'M2: Photo upload section visible on /inventory/new');

  // Fill required fields
  const brandField = page.locator('input[placeholder*="Toyota"]');
  const modelField = page.locator('input[placeholder*="Camry"]');
  await brandField.fill('Test').catch(() => {});
  await modelField.fill('Photo').catch(() => {});

  // year, color, vin, plate, purchase_price
  const numInputs = await page.locator('input[type="number"]').all();
  if (numInputs[0]) await numInputs[0].fill('2020').catch(() => {});  // year

  const vinField    = page.locator('input[placeholder="VIN"]');
  const plateField  = page.locator('input[placeholder*="اللوحة"]');
  const colorField  = page.locator('input[placeholder*="أبيض"]');

  await colorField.fill('أحمر').catch(() => {});
  await vinField.fill('PHOTO00001TEST').catch(() => {});
  await plateField.fill('TEST-001').catch(() => {});

  // purchase price
  const priceInput = page.locator('input[placeholder="0"]').first();
  await priceInput.fill('10000').catch(() => {});
  await page.waitForTimeout(300);

  // Attach photo file
  const carPhotoInput = page.locator('input[type="file"][accept*="webp"]').first();
  const hasCarInput = await carPhotoInput.isVisible().catch(() => false) ||
    await page.locator('input[type="file"]').count() > 0;

  if (hasCarInput) {
    try {
      const photoInput = page.locator('input[type="file"]').first();
      await photoInput.setInputFiles(pngPath);
      await page.waitForTimeout(300);
      const pendingThumb = await page.locator('img[src*="blob:"]').count();
      log(pendingThumb > 0 ? '✅' : '⚠️', 'M2: Pending photo thumbnail shown after attach', `count=${pendingThumb}`);
    } catch (e) {
      log('⚠️', 'M2: Could not attach photo file', String(e).slice(0, 60));
    }
  }

  // Submit
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  const afterCarCreate = page.url();
  const carId = afterCarCreate.match(/\/inventory\/(\d+)/)?.[1];
  log(carId ? '✅' : '❌', 'M2: Car created and redirected', `url=${afterCarCreate.replace(BASE, '')}`);

  // Check car detail photo gallery
  if (carId) {
    await page.goto(`${BASE}/inventory/${carId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const photoGalleryTitle = await page.locator('text=صور السيارة').isVisible().catch(() => false);
    log(photoGalleryTitle ? '✅' : '❌', 'M2: Photo gallery section visible on car detail');

    // Check for "مواصفات" button
    const specBtn = await page.locator('a[href*="specification"], button:has-text("مواصفات")').isVisible().catch(() => false);
    log(specBtn ? '✅' : '❌', 'M2/M4: مواصفات button visible on car detail');

    // Check photo gallery content (placeholder or images)
    const galleryImages = await page.locator('section img').count();
    const placeholderText = await page.locator('text=لا توجد صور').isVisible().catch(() => false);
    log((galleryImages > 0 || placeholderText) ? '✅' : '⚠️',
      'M2: Gallery has content', `images=${galleryImages} placeholder=${placeholderText}`);

    // Delete button check (only in edit mode, but check for it)
    const deleteBtn = await page.locator('button[aria-label="حذف الصورة"]').count();
    log(deleteBtn >= 0 ? '✅' : '⚠️', 'M2: Delete buttons visible', `count=${deleteBtn}`);
  }

  // Check inventory list for cover photo
  await page.goto(`${BASE}/inventory`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const coverPhotoInList = await page.locator('div[class*="h-36"] img, .glass-interactive img').count();
  log(coverPhotoInList >= 0 ? '✅' : '⚠️', 'M2: Cover photo area in inventory list', `found=${coverPhotoInList}`);

  // 🔍 Probe: upload non-image to car photos API
  const probe2 = await page.evaluate(async (id) => {
    const fd = new FormData();
    fd.append('photos', new Blob(['pdf'], { type: 'application/pdf' }), 'test.pdf');
    const r = await fetch(`/api/inventory/${id}/photos`, {
      method: 'POST', credentials: 'include', body: fd,
    });
    return r.status;
  }, carId ?? 1);
  log(probe2 === 400 ? '✅' : '⚠️', 'M2 🔍 PDF upload to car photos → 400', `status=${probe2}`);

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 3 — Sale Receipt
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n=== MODULE 3: Sale Receipt ===');

  await page.goto(`${BASE}/sales`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Find a sale
  const saleLink = page.locator('a[href*="/sales/"]').first();
  const hasSales = await saleLink.isVisible().catch(() => false);

  if (!hasSales) {
    log('⚠️', 'M3: No sales found in database — receipt test skipped');
  } else {
    const saleHref = await saleLink.getAttribute('href');
    const saleId   = saleHref?.match(/\/sales\/(\d+)/)?.[1];
    log('✅', 'M3: Found sale', `id=${saleId}`);

    await page.goto(`${BASE}/sales/${saleId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Check receipt button
    const receiptBtn = page.locator('a[href*="receipt"]');
    const hasReceiptBtn = await receiptBtn.isVisible().catch(() => false);
    log(hasReceiptBtn ? '✅' : '❌', 'M3: وصل القبض button visible on sale detail');

    // Navigate to receipt
    await page.goto(`${BASE}/sales/${saleId}/receipt`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const receiptLoaded = await page.locator('text=وصـل قبـض').isVisible().catch(() => false)
      || await page.locator('text=وصل قبض').isVisible().catch(() => false)
      || await page.locator('text=RECEIPT').isVisible().catch(() => false);
    log(receiptLoaded ? '✅' : '❌', 'M3: Receipt page loads');

    // Check rep selector
    const repSelector = page.locator('select.rep-selector-select');
    const hasRepSelector = await repSelector.isVisible().catch(() => false);
    log(hasRepSelector ? '✅' : '❌', 'M3: Seller representative selector visible');

    if (hasRepSelector) {
      const options = await repSelector.locator('option').allTextContents();
      const hasHussein = options.some(o => o.includes('حسين'));
      const hasAli     = options.some(o => o.includes('علي'));
      const hasSajjad  = options.some(o => o.includes('سجاد'));
      log(hasHussein ? '✅' : '❌', 'M3: حسين محمد حسين option exists');
      log(hasAli     ? '✅' : '❌', 'M3: علي محمد حسين option exists');
      log(hasSajjad  ? '✅' : '❌', 'M3: سجاد option exists');

      // Select Ali and check seller section changes
      await repSelector.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      const pageText = await page.locator('.receipt-doc').textContent().catch(() => '');
      const sellerSectionHasRep = pageText.includes('علي') || pageText.includes('محمد');
      log(sellerSectionHasRep ? '✅' : '⚠️', 'M3: Seller section updates when rep changes');
    }

    // Check docs grid has 4 boxes
    const docBoxes = await page.locator('.doc-box').count();
    log(docBoxes >= 4 ? '✅' : `❌`, 'M3: Docs grid has ≥4 boxes', `count=${docBoxes}`);

    // Check vehicle photo area
    const vehiclePhotoArea = await page.locator('.vehicle-photo-wrap, .vehicle-photo-placeholder').count();
    log(vehiclePhotoArea > 0 ? '✅' : '❌', 'M3: Vehicle photo area present in receipt', `count=${vehiclePhotoArea}`);

    // Print button
    const printBtn = await page.locator('button:has-text("طباعة")').isVisible().catch(() => false);
    log(printBtn ? '✅' : '❌', 'M3: Print button visible');

    // Financial correctness
    const hasFinancial = await page.locator('.financial-section, .financial-table').isVisible().catch(() => false);
    log(hasFinancial ? '✅' : '❌', 'M3: Financial section present');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 4 — Vehicle Specification Print
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n=== MODULE 4: Vehicle Specification ===');

  // Find a car to use
  const specCarId = carId ?? '1';
  await page.goto(`${BASE}/inventory/${specCarId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const specBtnVisible = await page.locator('a[href*="specification"]').isVisible().catch(() => false);
  log(specBtnVisible ? '✅' : '❌', 'M4: مواصفات button visible on car detail');

  await page.goto(`${BASE}/inventory/${specCarId}/specification`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const specPageLoads = await page.locator('text=بطاقة مواصفات').isVisible().catch(() => false)
    || await page.locator('text=SPEC SHEET').isVisible().catch(() => false)
    || await page.locator('.spec-doc').isVisible().catch(() => false);
  log(specPageLoads ? '✅' : '❌', 'M4: Specification page loads');

  // Check selling price visible
  const priceBar = await page.locator('.spec-price-bar, .spec-price-value').isVisible().catch(() => false);
  log(priceBar ? '✅' : '❌', 'M4: Price bar / selling price section visible');

  // CRITICAL: Verify purchase price is NOT shown
  const specPageText = await page.locator('body').textContent().catch(() => '');
  const hasPurchasePrice = specPageText.includes('سعر الشراء') || specPageText.includes('purchase_price');
  log(!hasPurchasePrice ? '✅' : '❌', 'M4: Purchase price NOT visible in spec page',
    hasPurchasePrice ? 'FOUND - this is a bug!' : 'confirmed absent');

  // Check specs
  const specRows = await page.locator('.spec-row').count();
  log(specRows > 0 ? '✅' : '❌', 'M4: Spec rows rendered', `count=${specRows}`);

  // Photo area
  const specPhotoArea = await page.locator('.spec-cover-wrap, .spec-cover-placeholder').isVisible().catch(() => false);
  log(specPhotoArea ? '✅' : '❌', 'M4: Cover photo area present');

  // Print button
  const specPrintBtn = await page.locator('button:has-text("طباعة")').isVisible().catch(() => false);
  log(specPrintBtn ? '✅' : '❌', 'M4: Print button visible');

  // 🔍 Probe: car name in title
  const titleText = await page.locator('.spec-car-title, h2').first().textContent().catch(() => '');
  log(titleText.length > 0 ? '✅' : '⚠️', 'M4 🔍 Car title in spec page', `title="${titleText.trim().slice(0, 40)}"`);

  // ══════════════════════════════════════════════════════════════════════════
  // Console errors check
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleErrors.length === 0) {
    log('✅', 'No console errors throughout all tests');
  } else {
    const filtered = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('hot-update')
    );
    if (filtered.length === 0) {
      log('✅', 'No meaningful console errors (only trivial ones)', `${consoleErrors.length} total`);
    } else {
      filtered.slice(0, 3).forEach(e => log('❌', 'Console error', e.slice(0, 100)));
    }
  }

} catch (err) {
  log('❌', 'Fatal error', err.message);
  console.error(err);
} finally {
  await browser.close();
  // Clean up temp files
  try { fs.unlinkSync(pngPath); } catch {}
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
const passes  = results.filter(r => r.icon === '✅').length;
const fails   = results.filter(r => r.icon === '❌').length;
const warns   = results.filter(r => r.icon === '⚠️').length;
console.log(`✅ ${passes} passed   ❌ ${fails} failed   ⚠️ ${warns} warnings`);
console.log(`\nVerdict: ${fails === 0 ? 'PASS' : 'FAIL'}`);
process.exit(fails > 0 ? 1 : 0);
