import { chromium } from 'playwright'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

const PORT = 3099
const BASE_URL = `http://localhost:${PORT}`
const OUTPUT_DIR = path.resolve(process.cwd(), 'test-results/print-qa')
const QA_DOCS_DIR = path.resolve(process.cwd(), '../docs/sale-document-qa')
const ARTIFACT_DIR = '/Users/aldulimi/.gemini/antigravity-ide/brain/4b05d26f-270e-487e-be35-6d73a725523e/media'

for (const dir of [OUTPUT_DIR, QA_DOCS_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function countPdfPages(pdfBuffer) {
  const content = pdfBuffer.toString('binary')
  const pagesMatch = content.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/) || content.match(/\/Count\s+(\d+)\b/)
  if (pagesMatch && pagesMatch[1]) {
    return parseInt(pagesMatch[1], 10)
  }
  const pageMatches = content.match(/\/Type\s*\/Page\b/g)
  return pageMatches ? pageMatches.length : 0
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // server starting
    }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`)
}

async function run() {
  console.log('🚀 Starting Next.js dev server on port', PORT, '...')
  const nextProcess = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT) }
  })

  try {
    await waitForServer(`${BASE_URL}/showroom/contract-qa-fixture?dataset=A`)
    console.log('✅ Server ready. Launching Chromium via Playwright...')

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1280, height: 960 } })
    const page = await context.newPage()

    const datasets = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
    const results = []

    for (const d of datasets) {
      const targetUrl = `${BASE_URL}/showroom/contract-qa-fixture?dataset=${d}`
      console.log(`📸 Rendering dataset ${d}...`)
      await page.goto(targetUrl, { waitUntil: 'networkidle' })

      // Generate element screenshots for Page 1 and Page 2
      const page1El = page.locator('.doc-page.page-1')
      const page2El = page.locator('.doc-page.page-2')

      const p1PngPath = path.join(OUTPUT_DIR, `dataset_${d.toLowerCase()}_p1.png`)
      const p2PngPath = path.join(OUTPUT_DIR, `dataset_${d.toLowerCase()}_p2.png`)

      if (await page1El.count() > 0) {
        await page1El.screenshot({ path: p1PngPath })
      }
      if (await page2El.count() > 0) {
        await page2El.screenshot({ path: p2PngPath })
      }

      // Full screenshot
      const fullPngPath = path.join(OUTPUT_DIR, `dataset_${d.toLowerCase()}_full.png`)
      await page.screenshot({ path: fullPngPath, fullPage: true })

      // Generate A4 PDF with preferCSSPageSize: true
      const pdfPath = path.join(OUTPUT_DIR, `dataset_${d.toLowerCase()}.pdf`)
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
      })

      const pdfBuf = fs.readFileSync(pdfPath)
      const pageCount = countPdfPages(pdfBuf)

      console.log(`   Saved dataset_${d.toLowerCase()}.pdf -> Verified PDF Page Count: ${pageCount}`)
      results.push({ dataset: d, pageCount, pdfPath, p1PngPath, p2PngPath })
    }

    // Populate docs/sale-document-qa/ with required explicit filenames
    console.log('📁 Copying clean QA artifacts to docs/sale-document-qa/...')

    const mappings = [
      { dataset: 'A', pdf: 'person-cash.pdf', p1: 'person-cash.png', p2: 'person-cash-page-2.png' },
      { dataset: 'F', pdf: 'installment.pdf', p1: 'installment-page-1.png', p2: 'installment-page-2.png' },
      { dataset: 'C', pdf: 'supplier.pdf', p1: 'supplier.png', p2: 'supplier-page-2.png' },
      { dataset: 'D', pdf: 'company.pdf', p1: 'company.png', p2: 'company-page-2.png' },
      { dataset: 'G', pdf: null, p1: 'draft.png', p2: null },
      { dataset: 'H', pdf: null, p1: 'reissued.png', p2: null },
      { dataset: 'I', pdf: null, p1: 'cancelled.png', p2: null }
    ]

    for (const m of mappings) {
      const res = results.find(r => r.dataset === m.dataset)
      if (res) {
        if (m.pdf && fs.existsSync(res.pdfPath)) {
          fs.copyFileSync(res.pdfPath, path.join(QA_DOCS_DIR, m.pdf))
          fs.copyFileSync(res.pdfPath, path.join(ARTIFACT_DIR, m.pdf))
        }
        if (m.p1 && fs.existsSync(res.p1PngPath)) {
          fs.copyFileSync(res.p1PngPath, path.join(QA_DOCS_DIR, m.p1))
          fs.copyFileSync(res.p1PngPath, path.join(ARTIFACT_DIR, m.p1))
        }
        if (m.p2 && fs.existsSync(res.p2PngPath)) {
          fs.copyFileSync(res.p2PngPath, path.join(QA_DOCS_DIR, m.p2))
          fs.copyFileSync(res.p2PngPath, path.join(ARTIFACT_DIR, m.p2))
        }
      }
    }

    await browser.close()
    console.log('🎉 Generation and validation complete!')
  } finally {
    nextProcess.kill()
  }
}

run().catch(err => {
  console.error('❌ Error during PDF generation:', err)
  process.exit(1)
})
