import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

function roundToInt(n: number) {
  return Math.round(n)
}

async function main() {
  const iconPath = path.join(process.cwd(), 'public', 'icon.png')

  const input = await fs.readFile(iconPath)
  const img = sharp(input)

  const meta = await img.metadata()
  if (!meta.width || !meta.height) {
    throw new Error('Не удалось определить размеры изображения public/icon.png')
  }

  const size = Math.min(meta.width, meta.height)
  const left = Math.floor((meta.width - size) / 2)
  const top = Math.floor((meta.height - size) / 2)

  // "Чуть закруглённые" углы: ~8-10% радиуса, но не больше половины.
  const radius = Math.min(roundToInt(size * 0.1), Math.max(0, Math.floor(size / 2) - 1))

  const squarePngBuffer = await img
    .extract({ left, top, width: size, height: size })
    .png()
    .toBuffer()

  // Маска: белый прямоугольник с rounded corners на прозрачном фоне.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
</svg>`

  const maskPngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()

  const output = await sharp(squarePngBuffer)
    .ensureAlpha()
    .composite([{ input: maskPngBuffer, blend: 'dest-in' }])
    .png()
    .toBuffer()

  await fs.writeFile(iconPath, output)

  // Мини-проверка: угол (0,0) должен быть прозрачным, центр — не полностью.
  const raw = (await sharp(output).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  })) as any
  const data: Uint8Array = raw.data
  const w: number = raw.info.width
  const h: number = raw.info.height
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

