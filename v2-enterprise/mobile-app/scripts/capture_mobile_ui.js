const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

const OUTPUT_DIR = path.join(__dirname, '../../docs/mobile-ui-review')
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const BASE_URL = 'http://127.0.0.1:8085'
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function run() {
  console.log('Launching Google Chrome for Mobile UI Review...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  
  // Set iPhone 14 Pro Mobile Viewport (390px x 844px)
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })

  async function takeSnap(filename, title) {
    const filePath = path.join(OUTPUT_DIR, filename)
    await page.screenshot({ path: filePath, fullPage: false })
    console.log(`[Captured] ${title} => ${filePath}`)
  }

  try {
    // 1. Login Screen
    await page.goto(`${BASE_URL}/(auth)/login`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('01-login.png', 'Employee Login Screen')

    // 2. Owner Home
    await page.goto(`${BASE_URL}/(owner)`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('02-owner-home.png', 'Owner Home Screen')

    // 3. Inventory List
    await page.goto(`${BASE_URL}/(owner)/inventory`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('03-inventory.png', 'Inventory List Screen')

    // 4. Vehicle Detail
    await page.goto(`${BASE_URL}/(owner)/inventory/v1`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('04-vehicle-detail.png', 'Vehicle Detail Screen')

    // 5. VIN Scanner
    await page.goto(`${BASE_URL}/(owner)/scanner`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('05-scanner.png', 'VIN Scanner Screen')

    // 6. CRM Leads
    await page.goto(`${BASE_URL}/(sales)/crm`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('06-leads.png', 'CRM Leads Screen')

    // 7. Lead Detail
    await page.goto(`${BASE_URL}/(sales)/crm/l1`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('07-lead-detail.png', 'Lead Detail Screen')

    // 8. Cashier Home
    await page.goto(`${BASE_URL}/(cashier)`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('08-cashier-home.png', 'Cashier Home Screen')

    // 9. Contracts List
    await page.goto(`${BASE_URL}/(cashier)/contracts`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('09-contracts.png', 'Contracts List Screen')

    // 10. Contract Detail
    await page.goto(`${BASE_URL}/(cashier)/contracts/c1`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('10-contract-detail.png', 'Contract Detail Screen')

    // 11. Customer Home
    await page.goto(`${BASE_URL}/(customer)`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('11-customer-home.png', 'Customer Hero Home Screen')

    // 12. Customer Contracts
    await page.goto(`${BASE_URL}/(customer)/contracts`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('12-customer-contracts.png', 'Customer Contracts Screen')

    // 13. Customer Installments
    await page.goto(`${BASE_URL}/(customer)/installments`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('13-customer-installments.png', 'Customer Installments Screen')

    // 14. Customer Payments
    await page.goto(`${BASE_URL}/(customer)/payments`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('14-customer-payments.png', 'Customer Payments Screen')

    // 15. Customer Profile
    await page.goto(`${BASE_URL}/(customer)/profile`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))
    await takeSnap('15-profile.png', 'Customer Profile Screen')

    console.log('SUCCESS: All mobile screenshots captured into docs/mobile-ui-review/')
  } catch (err) {
    console.error('Error taking screenshots:', err)
  } finally {
    await browser.close()
  }
}

run()
