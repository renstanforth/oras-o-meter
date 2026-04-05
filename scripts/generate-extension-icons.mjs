import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = join(root, 'assets/img/icon.svg')
const outDir = join(root, 'assets/img/extension-icons')

mkdirSync(outDir, { recursive: true })
const svgBuf = readFileSync(svgPath)
const svgDimStr = svgBuf.toString('utf8').replace(/#07E092/g, '#b8e8d4')

for (const size of [16, 32, 48, 128]) {
  const resvg = new Resvg(svgBuf, { fitTo: { mode: 'width', width: size } })
  writeFileSync(join(outDir, `icon-${size}.png`), resvg.render().asPng())

  const resvgDim = new Resvg(Buffer.from(svgDimStr), { fitTo: { mode: 'width', width: size } })
  writeFileSync(join(outDir, `icon-${size}-dim.png`), resvgDim.render().asPng())
}
