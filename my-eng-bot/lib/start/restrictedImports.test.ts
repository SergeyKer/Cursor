import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const guardedFiles = [
  'app/page.tsx',
  'components/app/AppShell.tsx',
  ...fs
    .readdirSync(path.join(ROOT, 'components/start'))
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => `components/start/${name}`),
]

const forbidden = [
  '@/components/Chat',
  '@/components/MenuSectionPanels',
  '@/components/LessonStepRenderer',
  '@/lib/lessons/its-time-to',
]

describe('restrictedImports audit', () => {
  it.each(guardedFiles)('%s avoids direct heavy imports', (relativePath) => {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
    for (const token of forbidden) {
      expect(source.includes(`from '${token}'`), `${relativePath} must not import ${token}`).toBe(false)
    }
  })
})
