/**
 * Приводит фон `header-robot.png` к цвету хедера (`bg-[var(--bg)]`):
 * находим фон по углам, делаем его прозрачным (alpha=0), чтобы не было “квадрата”
 * при ресайзе через `next/image`.
 * Запуск: node scripts/header-robot-match-bg.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_HEADER_BG = { r: 0xf0, g: 0xf0, b: 0xf0 }

function hexToRgb(hex) {
  const normalized = hex.replace('#', '').trim()
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16)
    const g = parseInt(normalized[1] + normalized[1], 16)
    const b = parseInt(normalized[2] + normalized[2], 16)
    return { r, g, b }
  }
  const value = normalized.length === 6 ? normalized : normalized.slice(0, 6)
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return { r, g, b }
}

async function resolveHeaderBg() {
  // Хедер использует `bg-[var(--bg)]`, поэтому закрашиваем фон робота в тот же цвет.
  try {
    const globalsCssPath = path.join(__dirname, '..', 'app', 'globals.css')
    const css = await fs.readFile(globalsCssPath, 'utf8')
    const match = css.match(/--bg:\s*(#[0-9a-fA-F]{3,8})\s*;/)
    if (match?.[1]) return hexToRgb(match[1])
  } catch {
    // fallthrough
  }
  return DEFAULT_HEADER_BG
}

// Новый подход:
// 1) оценим цвет “исходного фона” по углам картинки,
// 2) сделаем flood fill по связной области этого фона,
// 3) закрасим только её в цвет фона хедера.
const BG_TOLERANCE = 90
const CORNER_SAMPLE = 18
const SEED_CORNER = 10

async function main() {
  const HEADER_BG = await resolveHeaderBg()
  const pngPath = path.join(__dirname, '..', 'public', 'header-robot.png')
  const buf = await fs.readFile(pngPath)
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const channels = 4

  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

  // 1) Оценка “источника” фона по углам.
  // Важно: скрипт может запускаться повторно (например, после правок),
  // и фон уже может быть не тёмным. Поэтому берём подмножество самых “тёмных”
  // по яркости пикселей из углов и усредняем их.
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let cnt = 0
  const corner = Math.max(1, Math.min(CORNER_SAMPLE, Math.min(width, height)))
  const corners = [
    [0, 0],
    [width - corner, 0],
    [0, height - corner],
    [width - corner, height - corner],
  ]
  const cornerSamples = []
  for (const [ox, oy] of corners) {
    for (let y = oy; y < oy + corner && y < height; y++) {
      for (let x = ox; x < ox + corner && x < width; x++) {
        const idx = (y * width + x) * channels
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const L = luma(r, g, b)
        cornerSamples.push({ r, g, b, L })
      }
    }
  }

  cornerSamples.sort((a, b) => a.L - b.L)
  const keepCount = Math.max(1, Math.floor(cornerSamples.length * 0.3))
  const cutoffIdx = keepCount - 1
  const cutoffL = cornerSamples[cutoffIdx]?.L ?? 0
  for (const s of cornerSamples) {
    if (s.L > cutoffL) continue
    sumR += s.r
    sumG += s.g
    sumB += s.b
    cnt++
  }

  const bgSrc = cnt
    ? { r: Math.round(sumR / cnt), g: Math.round(sumG / cnt), b: Math.round(sumB / cnt) }
    : { r: 0, g: 0, b: 0 }

  // 2) Flood fill по связной области “фоновых” пикселей.
  const tol2 = BG_TOLERANCE * BG_TOLERANCE
  const visited = new Uint8Array(width * height)
  const inFill = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let qh = 0
  let qt = 0

  const isCandidate = (x, y) => {
    const idx = (y * width + x) * channels
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const dr = r - bgSrc.r
    const dg = g - bgSrc.g
    const db = b - bgSrc.b
    const dist2 = dr * dr + dg * dg + db * db
    return dist2 <= tol2
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
    const candidates = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]
    for (const [nx, ny] of candidates) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const np = ny * width + nx
      if (visited[np]) continue
      visited[np] = 1
      if (!isCandidate(nx, ny)) continue
      inFill[np] = 1
      queue[qt++] = np
    }
  }

  // 3) Делам найденную область фоном: цвет = цвет хедера, альфа = 0.
  // Это убирает “квадрат”/фринг при ресайзе через `next/image`, т.к. прозрачный фон
  // начинает смешиваться уже с реальным фоном хедера.
  for (let p = 0; p < inFill.length; p++) {
    if (!inFill[p]) continue
    const i = p * channels
    data[i] = HEADER_BG.r
    data[i + 1] = HEADER_BG.g
    data[i + 2] = HEADER_BG.b
    data[i + 3] = 0
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
