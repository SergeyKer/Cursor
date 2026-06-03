/**
 * Убирает однотонный фон у assets/footer-robot-source.png:
 * - public/footer-robot.png — прозрачный фон (alpha=0)
 * - public/footer-robot-opaque.png — фон под --app-header-bg (белый)
 * Запуск: npm run build:footer-robot
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_FOOTER_BG = { r: 255, g: 255, b: 255 }

const BG_TOLERANCE = 105
const CORNER_SAMPLE = 18
const SEED_CORNER = 10
const FOOTER_ICON_PX = 128

async function resolveAppHeaderBg() {
  try {
    const globalsCssPath = path.join(__dirname, '..', 'app', 'globals.css')
    const css = await fs.readFile(globalsCssPath, 'utf8')
    const match = css.match(/--app-header-bg:\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/i)
    if (match) {
      return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3]),
      }
    }
  } catch {
    // fallthrough
  }
  return DEFAULT_FOOTER_BG
}

function estimateBgFromCorners(data, width, height, channels) {
  const corner = Math.max(1, Math.min(CORNER_SAMPLE, Math.min(width, height)))
  const corners = [
    [0, 0],
    [width - corner, 0],
    [0, height - corner],
    [width - corner, height - corner],
  ]

  let sumR = 0
  let sumG = 0
  let sumB = 0
  let cnt = 0

  for (const [ox, oy] of corners) {
    for (let y = oy; y < oy + corner && y < height; y++) {
      for (let x = ox; x < ox + corner && x < width; x++) {
        const idx = (y * width + x) * channels
        sumR += data[idx]
        sumG += data[idx + 1]
        sumB += data[idx + 2]
        cnt++
      }
    }
  }

  return cnt
    ? { r: Math.round(sumR / cnt), g: Math.round(sumG / cnt), b: Math.round(sumB / cnt) }
    : { r: 0, g: 0, b: 0 }
}

function buildBackgroundMask(data, width, height, channels, bgSrc) {
  const tol2 = BG_TOLERANCE * BG_TOLERANCE
  const visited = new Uint8Array(width * height)
  const inFill = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let qh = 0
  let qt = 0

  const isCandidate = (x, y) => {
    const idx = (y * width + x) * channels
    const dr = data[idx] - bgSrc.r
    const dg = data[idx + 1] - bgSrc.g
    const db = data[idx + 2] - bgSrc.b
    return dr * dr + dg * dg + db * db <= tol2
  }

  const trySeed = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const p = y * width + x
    if (visited[p]) return
    visited[p] = 1
    if (!isCandidate(x, y)) return
    inFill[p] = 1
    queue[qt++] = p
  }

  const seed = Math.max(1, Math.min(SEED_CORNER, Math.min(width, height)))
  const seedCorners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]
  for (const [sx, sy] of seedCorners) {
    for (let dy = 0; dy < seed; dy++) {
      for (let dx = 0; dx < seed; dx++) {
        const x = sx === 0 ? dx : sx - dx
        const y = sy === 0 ? dy : sy - dy
        trySeed(x, y)
      }
    }
  }

  while (qh < qt) {
    const p = queue[qh++]
    const x = p % width
    const y = (p / width) | 0
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const np = ny * width + nx
      if (visited[np]) continue
      visited[np] = 1
      if (!isCandidate(nx, ny)) continue
      inFill[np] = 1
      queue[qt++] = np
    }
  }

  return inFill
}

async function encodePng(data, width, height, channels) {
  return sharp(Buffer.from(data), {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer()
}

async function main() {
  const footerBg = await resolveAppHeaderBg()
  const rootDir = path.join(__dirname, '..')
  const sourcePath = path.join(rootDir, 'assets', 'footer-robot-source.png')
  const transparentPath = path.join(rootDir, 'public', 'footer-robot.png')
  const opaquePath = path.join(rootDir, 'public', 'footer-robot-opaque.png')

  const resized = await sharp(await fs.readFile(sourcePath))
    .resize(FOOTER_ICON_PX, FOOTER_ICON_PX, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .png()
    .toBuffer()

  const { data, info } = await sharp(resized).raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const channels = 4

  const bgSrc = estimateBgFromCorners(data, width, height, channels)
  const inFill = buildBackgroundMask(data, width, height, channels, bgSrc)

  const transparentData = Buffer.from(data)
  const opaqueData = Buffer.from(data)

  for (let p = 0; p < inFill.length; p++) {
    if (!inFill[p]) continue
    const i = p * channels
    transparentData[i] = 0
    transparentData[i + 1] = 0
    transparentData[i + 2] = 0
    transparentData[i + 3] = 0
    opaqueData[i] = footerBg.r
    opaqueData[i + 1] = footerBg.g
    opaqueData[i + 2] = footerBg.b
    opaqueData[i + 3] = 255
  }

  await fs.writeFile(transparentPath, await encodePng(transparentData, width, height, channels))
  await fs.writeFile(opaquePath, await encodePng(opaqueData, width, height, channels))

  console.log(`Wrote ${transparentPath}`)
  console.log(`Wrote ${opaquePath}`)
  console.log(`Background sample: rgb(${bgSrc.r}, ${bgSrc.g}, ${bgSrc.b}), footer fill: rgb(${footerBg.r}, ${footerBg.g}, ${footerBg.b})`)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
