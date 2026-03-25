import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

function roundToInt(n: number) {
  return Math.round(n)
}

function radiusForSize(size: number) {
  return Math.min(roundToInt(size * 0.1), Math.max(0, Math.floor(size / 2) - 1))
}

async function applyRoundedCorners(squarePngBuffer: Buffer, size: number): Promise<Buffer> {
  const radius = radiusForSize(size)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
</svg>`

  const maskPngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()

  return sharp(squarePngBuffer)
    .ensureAlpha()
    .composite([{ input: maskPngBuffer, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function main() {
  const cwd = process.cwd()
  const sourcePath = path.join(cwd, 'assets', 'icon-source.png')
  const publicDir = path.join(cwd, 'public')

  const input = await fs.readFile(sourcePath)
  const img = sharp(input)

  const meta = await img.metadata()
  if (!meta.width || !meta.height) {
    throw new Error('Не удалось определить размеры изображения assets/icon-source.png')
  }

  const cropSize = Math.min(meta.width, meta.height)
  const left = Math.floor((meta.width - cropSize) / 2)
  const top = Math.floor((meta.height - cropSize) / 2)

  const squarePngBuffer = await img
    .extract({ left, top, width: cropSize, height: cropSize })
    .png()
    .toBuffer()

  const outputs: { file: string; size: number }[] = [
    { file: 'icon-32.png', size: 32 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-512.png', size: 512 },
  ]

  await fs.mkdir(publicDir, { recursive: true })

  for (const { file, size } of outputs) {
    const resized = await sharp(squarePngBuffer).resize(size, size).png().toBuffer()
    const out = await applyRoundedCorners(resized, size)
    await fs.writeFile(path.join(publicDir, file), out)
  }

  const icon512Path = path.join(publicDir, 'icon-512.png')
  await fs.copyFile(icon512Path, path.join(publicDir, 'icon.png'))

  const largest = await fs.readFile(icon512Path)
  const raw = (await sharp(largest).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  })) as { data: Uint8Array; info: { width: number; height: number } }
  const { data, info } = raw
  const w = info.width
  const h = info.height
  const alphaAt = (x: number, y: number) => {
    const idx = (y * w + x) * 4 + 3
    return data[idx] as number
  }

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
