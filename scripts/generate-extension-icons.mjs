import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = join(root, 'assets/img/icon.svg')
const outDir = join(root, 'assets/img/extension-icons')

mkdirSync(outDir, { recursive: true })
const svg = readFileSync(svgPath)

for (const size of [16, 32, 48, 128]) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', width: size } })
  const png = resvg.render().asPng()
  writeFileSync(join(outDir, `icon-${size}.png`), png)
}
