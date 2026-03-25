/**
 * Заменяет почти чёрный фон header-robot.png на цвет фона хедера (--bg: #f0f0f0).
 * Запуск: node scripts/header-robot-match-bg.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HEADER_BG = { r: 0xf0, g: 0xf0, b: 0xf0 }
/** Пиксели не темнее этого считаем фоном (чистый чёрный и антиалиасинг). */
const BG_THRESHOLD = 32

async function main() {
  const pngPath = path.join(__dirname, '..', 'public', 'header-robot.png')
  const buf = await fs.readFile(pngPath)
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const channels = 4
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r <= BG_THRESHOLD && g <= BG_THRESHOLD && b <= BG_THRESHOLD) {
      data[i] = HEADER_BG.r
      data[i + 1] = HEADER_BG.g
      data[i + 2] = HEADER_BG.b
      data[i + 3] = 255
    }
  }
  const out = await sharp(Buffer.from(data), {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer()
  await fs.writeFile(pngPath, out)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
