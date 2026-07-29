/**
 * Print ownership + safe-print orchestration for InstallmentReceiptA5Document.
 *
 * Ownership: #print-root is a single shared DOM node (mounted once in the root layout).
 * If more than one <InstallmentReceiptA5Document> is mounted at the same time (e.g. two
 * open workflows), only the most-recently-mounted instance is allowed to portal its
 * content into it — otherwise both would stack up in the print output. This is a plain
 * module-level singleton (one JS module instance per browser tab, which is all a client
 * SPA ever has), read reactively via useSyncExternalStore so every mounted instance
 * re-renders when ownership changes hands.
 */

type Listener = () => void

let activeOwnerId: string | null = null
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function claimPrintOwnership(id: string): void {
  if (activeOwnerId === id) return
  activeOwnerId = id
  notify()
}

export function releasePrintOwnership(id: string): void {
  if (activeOwnerId !== id) return
  activeOwnerId = null
  notify()
}

export function subscribePrintOwnership(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPrintOwnerSnapshot(): string | null {
  return activeOwnerId
}

/** No ownership claim can have happened before hydration, so server and initial client
 *  render must agree on `null` — claiming only ever happens client-side in an effect. */
export function getPrintOwnerServerSnapshot(): string | null {
  return null
}

/** Resolves once every <img> under `root` has finished loading (or failed — a broken
 *  image must never hang printing indefinitely), bounded by `timeoutMs` as a hard backstop. */
function waitForImages(root: ParentNode, timeoutMs: number): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'))
  const pending = images.filter((img) => !img.complete)
  if (pending.length === 0) return Promise.resolve()

  const allLoaded = Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        })
    )
  ).then(() => undefined)

  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
  return Promise.race([allLoaded, timeout])
}

/**
 * Safe entry point for printing the receipt: waits for web fonts to finish loading
 * (so Arabic text doesn't fall back to a system font mid-render) and for every image
 * inside the print target (the company logo) to finish loading, before invoking the
 * browser's native print dialog. Every call site that prints this receipt should use
 * this instead of calling window.print() directly.
 */
export async function printInstallmentReceipt(): Promise<void> {
  if (typeof window === 'undefined') return

  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined)
  }

  const printRoot = document.getElementById('print-root')
  if (printRoot) {
    await waitForImages(printRoot, 2000)
  }

  window.print()
}
