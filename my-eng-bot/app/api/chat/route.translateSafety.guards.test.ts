import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

describe('chat communication bare translate safety guard', () => {
  it('injects safety block and dual-mode refuse override into translate path', () => {
    const src = readFileSync(join(ROOT, 'app/api/chat/route.ts'), 'utf8')
    const translateIdx = src.indexOf('mode === \'communication\' && explicitTranslateTarget')
    expect(translateIdx).toBeGreaterThan(-1)
    const translateChunk = src.slice(translateIdx, translateIdx + 900)
    expect(translateChunk).toContain("buildAiSafetyRulesBlock({ channel: 'communication'")
    expect(translateChunk).toContain('Do not translate the harmful payload')
    expect(translateChunk).toContain('Translate path dual-mode')
    expect(translateChunk).toContain('Output ONLY the translated English text')
  })
})
