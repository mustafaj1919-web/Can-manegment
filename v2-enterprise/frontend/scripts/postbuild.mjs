import { cpSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root     = join(dirname(fileURLToPath(import.meta.url)), '..')
const standalone = join(root, '.next', 'standalone')

if (!existsSync(standalone)) {
  console.log('postbuild: standalone folder not found, skipping asset copy.')
  process.exit(0)
}

cpSync(join(root, '.next', 'static'),  join(standalone, '.next', 'static'),  { recursive: true, force: true })
cpSync(join(root, 'public'),           join(standalone, 'public'),           { recursive: true, force: true })
console.log('postbuild: static assets copied to standalone ✓')
