import { createWriteStream } from 'node:fs'
import { readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const outName = `orasometer-${pkg.version}.zip`
const outPath = join(root, outName)

try {
  statSync(distDir)
} catch {
  console.error('Missing dist/: run npm run build first.')
  process.exit(1)
}

await new Promise((resolve, reject) => {
  const output = createWriteStream(outPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  output.on('close', () => {
    console.log(`${outName} (${archive.pointer()} bytes)`)
    resolve()
  })
  archive.on('error', reject)
  archive.on('warning', (err) => {
    if (err.code !== 'ENOENT') reject(err)
  })

  archive.pipe(output)
  // Contents of dist/ at zip root (manifest.json at top level when extracted)
  archive.directory(distDir, false)
  void archive.finalize()
})
