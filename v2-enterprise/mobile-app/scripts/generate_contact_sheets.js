const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

const REVIEW_DIR = path.join(__dirname, '../../docs/mobile-ui-review')
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const ALL_SCREENS = [
  { file: '01-login.png', label: '01 Login' },
  { file: '02-owner-home.png', label: '02 Owner Home' },
  { file: '03-inventory.png', label: '03 Inventory' },
  { file: '04-vehicle-detail.png', label: '04 Vehicle Detail' },
  { file: '05-scanner.png', label: '05 Scanner' },
  { file: '06-leads.png', label: '06 CRM Leads' },
  { file: '07-lead-detail.png', label: '07 Lead Detail' },
  { file: '08-cashier-home.png', label: '08 Cashier Home' },
  { file: '09-contracts.png', label: '09 Contracts' },
  { file: '10-contract-detail.png', label: '10 Contract Detail' },
  { file: '11-customer-home.png', label: '11 Customer Home' },
  { file: '12-customer-contracts.png', label: '12 Customer Contracts' },
  { file: '13-customer-installments.png', label: '13 Customer Installments' },
  { file: '14-customer-payments.png', label: '14 Customer Payments' },
  { file: '15-profile.png', label: '15 Customer Profile' },
]

const CORE_SCREENS = [
  { file: '02-owner-home.png', label: '02 Owner Home' },
  { file: '03-inventory.png', label: '03 Inventory' },
  { file: '06-leads.png', label: '06 CRM Leads' },
  { file: '08-cashier-home.png', label: '08 Cashier Home' },
  { file: '10-contract-detail.png', label: '10 Contract Detail' },
  { file: '11-customer-home.png', label: '11 Customer Home' },
]

function buildHtml(screens, title, subtitle, columns = 3) {
  const cardsHtml = screens
    .map((s) => {
      const imgPath = path.join(REVIEW_DIR, s.file)
      const base64Img = fs.readFileSync(imgPath).toString('base64')
      const imgSrc = `data:image/png;base64,${base64Img}`

      return `
      <div class="card">
        <div class="img-wrapper">
          <img src="${imgSrc}" alt="${s.label}" />
        </div>
        <div class="label">${s.label}</div>
      </div>
    `
    })
    .join('')

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #F1F5F9;
        color: #0F172A;
        padding: 48px;
        width: 1440px;
      }
      .header {
        margin-bottom: 36px;
        text-align: center;
      }
      .header h1 {
        font-size: 28px;
        font-weight: 800;
        color: #0F172A;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
      }
      .header p {
        font-size: 15px;
        color: #64748B;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(${columns}, 1fr);
        gap: 32px;
      }
      .card {
        background: #FFFFFF;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        border: 1px solid #E2E8F0;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .img-wrapper {
        width: 100%;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #CBD5E1;
        background-color: #0F172A;
      }
      .img-wrapper img {
        width: 100%;
        height: auto;
        display: block;
      }
      .label {
        margin-top: 14px;
        font-size: 15px;
        font-weight: 700;
        color: #334155;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="grid">
      ${cardsHtml}
    </div>
  </body>
  </html>
  `
}

async function run() {
  console.log('Generating Contact Sheets using Chrome...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()

  // 1. Full Contact Sheet (3x5)
  console.log('Building 3x5 full contact sheet...')
  const fullHtml = buildHtml(
    ALL_SCREENS,
    'v2-enterprise Mobile Suite — Visual UI Review Contact Sheet',
    'Full 15 Mobile Screens Overview (3 Columns × 5 Rows)',
    3
  )
  await page.setViewport({ width: 1440, height: 100, deviceScaleFactor: 2 })
  await page.setContent(fullHtml, { waitUntil: 'load' })
  const fullBodyHandle = await page.$('body')
  const fullBoundingBox = await fullBodyHandle.boundingBox()
  await page.setViewport({
    width: Math.ceil(fullBoundingBox.width),
    height: Math.ceil(fullBoundingBox.height),
    deviceScaleFactor: 2,
  })

  const fullSheetPath = path.join(REVIEW_DIR, 'MOBILE_UI_CONTACT_SHEET.png')
  await page.screenshot({ path: fullSheetPath, fullPage: true })
  console.log(`[Generated] Full Contact Sheet => ${fullSheetPath}`)

  // 2. Core Screens Sheet (3x2)
  console.log('Building 3x2 core screens sheet...')
  const coreHtml = buildHtml(
    CORE_SCREENS,
    'v2-enterprise Mobile Suite — Core Mobile Screens Overview',
    'Key Operations & Customer Banking-Grade Experience (3 Columns × 2 Rows)',
    3
  )
  await page.setContent(coreHtml, { waitUntil: 'load' })
  const coreBodyHandle = await page.$('body')
  const coreBoundingBox = await coreBodyHandle.boundingBox()
  await page.setViewport({
    width: Math.ceil(coreBoundingBox.width),
    height: Math.ceil(coreBoundingBox.height),
    deviceScaleFactor: 2,
  })

  const coreSheetPath = path.join(REVIEW_DIR, 'MOBILE_UI_CORE_SCREENS.png')
  await page.screenshot({ path: coreSheetPath, fullPage: true })
  console.log(`[Generated] Core Screens Sheet => ${coreSheetPath}`)

  await browser.close()
  console.log('ALL CONTACT SHEETS GENERATED SUCCESSFULLY!')
}

run()
