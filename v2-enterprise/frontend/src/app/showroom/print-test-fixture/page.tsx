import { notFound } from 'next/navigation'
import { PrintTestFixtureClient } from './PrintTestFixtureClient'

/**
 * Test-only fixture for the receipt print-isolation regression suite
 * (tests/e2e/receipt-print.spec.ts). Reproduces the real bug shape — a Dialog with its
 * own header + a fake workflow stepper, sitting on top of a long underlying page — so the
 * print isolation system (#print-root + ownership) can be asserted against automatically.
 *
 * Gated behind ENABLE_PRINT_TEST_FIXTURE so this route 404s outside of test runs; it is
 * never reachable in a normal production deployment.
 */
export default function PrintTestFixturePage() {
  if (process.env.ENABLE_PRINT_TEST_FIXTURE !== 'true') {
    notFound()
  }

  return <PrintTestFixtureClient />
}
