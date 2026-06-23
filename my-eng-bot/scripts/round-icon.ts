import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { squircleMaskSvg } from '../lib/squircleMask'

const ALPHA_CUTOFF = 16

const RESIZE_OPTIONS = { kernel: 'lanczos3' as const }

type RawRgba = { data: Uint8Array; width: number; height: number }

function applyAlphaCutoff(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data)
  for (let i = 0; i < out.length; i += 4) {
    if ((out[i + 3] as number) < ALPHA_CUTOFF) {
      out[i + 3] = 0
    }
  }
  return out
}

async function toRawRgba(buffer: Buffer): Promise<RawRgba> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data: new Uint8Array(data), width: info.width, height: info.height }
}

async function applySquircleMask(buffer: Buffer, size: number): Promise<Buffer> {
  const svg = squircleMaskSvg(size)
  const maskPngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()

  return sharp(buffer)
    .ensureAlpha()
    .composite([{ input: maskPngBuffer, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

/** iOS / desktop: squircle with transparent corners. */
async function buildSquircleIcon(sourceBuffer: Buffer, size: number): Promise<Buffer> {
  const resized = await sharp(sourceBuffer).resize(size, size, RESIZE_OPTIONS).png().toBuffer()
  const masked = await applySquircleMask(resized, size)
  const raw = await toRawRgba(masked)
  const cleaned = applyAlphaCutoff(raw.data)

  return sharp(Buffer.from(cleaned), {
    raw: { width: raw.width, height: raw.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

/** Android maskable: square full-bleed, no corner rounding (launcher applies its own mask). */
async function buildMaskableIcon(sourceBuffer: Buffer, size: number): Promise<Buffer> {
  return sharp(sourceBuffer).resize(size, size, RESIZE_OPTIONS).png().toBuffer()
}

function countLightFringePixels(data: Uint8Array, width: number, height: number, ringPx: number): number {
  let count = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.min(x, y, width - 1 - x, height - 1 - y)
      if (dist >= ringPx) continue

      const offset = (y * width + x) * 4
      const alpha = data[offset + 3] as number
      if (alpha === 0) continue

      const r = data[offset] as number
      const g = data[offset + 1] as number
      const b = data[offset + 2] as number
      if (r + g + b > 700) count++
    }
  }
  return count
}

async function main() {
  const cwd = process.cwd()
  const sourcePath = path.join(cwd, 'assets', 'icon-source.png')
  const publicDir = path.join(cwd, 'public')

  const input = await fs.readFile(sourcePath)
  const meta = await sharp(input).metadata()
  if (!meta.width || !meta.height) {
    throw new Error('Не удалось определить размеры изображения assets/icon-source.png')
  }

  const cropSize = Math.min(meta.width, meta.height)
  const left = Math.floor((meta.width - cropSize) / 2)
  const top = Math.floor((meta.height - cropSize) / 2)

  const sourceBuffer = await sharp(input)
    .extract({ left, top, width: cropSize, height: cropSize })
    .png()
    .toBuffer()

  const squircleOutputs: { file: string; size: number }[] = [
    { file: 'icon-32.png', size: 32 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-512.png', size: 512 },
  ]

  const maskableOutputs: { file: string; size: number }[] = [
    { file: 'icon-192-maskable.png', size: 192 },
    { file: 'icon-512-maskable.png', size: 512 },
  ]

  await fs.mkdir(publicDir, { recursive: true })

  for (const { file, size } of squircleOutputs) {
    const out = await buildSquircleIcon(sourceBuffer, size)
    await fs.writeFile(path.join(publicDir, file), out)

    const raw = await toRawRgba(out)
    const fringe = countLightFringePixels(raw.data, size, size, 10)
    const fringeLimit = size <= 32 ? 40 : 20
    if (fringe > fringeLimit) {
      console.warn(`${file}: светлая кайма на краях — ${fringe} px (лимит ${fringeLimit})`)
    }
  }

  for (const { file, size } of maskableOutputs) {
    const out = await buildMaskableIcon(sourceBuffer, size)
    await fs.writeFile(path.join(publicDir, file), out)
  }

  const icon512Path = path.join(publicDir, 'icon-512.png')
  await fs.copyFile(icon512Path, path.join(publicDir, 'icon.png'))

  const largest = await toRawRgba(await fs.readFile(icon512Path))
  const w = largest.width
  const h = largest.height
  const alphaAt = (x: number, y: number) => largest.data[(y * w + x) * 4 + 3] as number

  const cornerAlpha = alphaAt(0, 0)
  const centerAlpha = alphaAt(Math.floor(w / 2), Math.floor(h / 2))

  if (cornerAlpha !== 0) {
    console.warn(`Похоже, угол не полностью прозрачный: alpha(0,0)=${cornerAlpha}`)
  }
  if (centerAlpha === 0) {
    console.warn(`Похоже, центр стал прозрачным: alpha(center)=${centerAlpha}`)
  }
}

main().catch((e: unknown) => {
  console.error(e)
  process.exitCode = 1
})
