import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

describe('tutor-explain product block guard', () => {
  it('keeps compact product identity rules in system prompt builder', () => {
    const src = readFileSync(join(ROOT, 'app/api/tutor-explain/route.ts'), 'utf8')
    expect(src).toContain('Product (tutor identity — keep short)')
    expect(src).toContain('no persona chat')
    expect(src).toContain('Jailbreak plus a real EN question')
    expect(src).toContain('Do not write essays/homework sentence-by-sentence')
    expect(src).toContain("buildAiSafetyRulesBlock({ channel: 'tutor'")
  })
})
