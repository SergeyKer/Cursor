import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AI_SAFETY_MARKERS } from '@/lib/ai/safetyPolicy'

const ROOT = process.cwd()

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
}

describe('safetyPolicy code guards', () => {
  it('injects buildAiSafetyRulesBlock at the four channel call sites', () => {
    const chat = read('app/api/chat/route.ts')
    const instructions = read('lib/engvo/instructions.ts')
    const teacher = read('lib/engvo/teacherPrompts.ts')
    expect(chat).toContain("buildAiSafetyRulesBlock({ channel: 'communication'")
    expect(chat).toContain("buildAiSafetyRulesBlock({ channel: 'dialogue'")
    expect(instructions).toContain("buildAiSafetyRulesBlock({ channel: 'free_call'")
    expect(teacher).toContain("buildAiSafetyRulesBlock({ channel: 'teacher'")
  })

  it('does not duplicate sensitive/child policy body into engvo pedagogy files', () => {
    const instructions = read('lib/engvo/instructions.ts')
    const teacher = read('lib/engvo/teacherPrompts.ts')
    for (const src of [instructions, teacher]) {
      expect(src).not.toMatch(/parent-pressure|disordered-eating|motorcycle buy-now/i)
      expect(src).not.toContain(AI_SAFETY_MARKERS.sensitiveNoInterview)
      expect(src).not.toContain(AI_SAFETY_MARKERS.childTeenHardening)
    }
  })

  it('does not pull safetyPolicy into AppShell', () => {
    const appShell = read('components/app/AppShell.tsx')
    expect(appShell).not.toContain('buildAiSafetyRulesBlock')
    expect(appShell).not.toContain(AI_SAFETY_MARKERS.sensitiveNoInterview)
    expect(appShell).not.toContain('lib/ai/safetyPolicy')
  })

  it('does not introduce new engvo *Safety* modules', () => {
    const engvoDir = join(ROOT, 'lib', 'engvo')
    const names = readdirSync(engvoDir).filter((n) => /safety/i.test(n))
    expect(names).toEqual([])
    expect(existsSync(join(engvoDir, 'xaiListenPolicy.ts'))).toBe(false)
  })

  it('keeps a single communication priority line and intact personalization helper', () => {
    const chat = read('app/api/chat/route.ts')
    const priorityHits = chat.match(/AI_SAFETY:sensitive_no_interview[\s\S]{0,120}follow-up/gi) ?? []
    expect(priorityHits.length).toBe(1)
    expect(chat).toContain('function buildCommunicationPersonalizationRule')
    const personalization = chat.match(
      /function buildCommunicationPersonalizationRule\([\s\S]*?\n\}/
    )?.[0]
    expect(personalization).toBeTruthy()
    expect(personalization).not.toContain('AI_SAFETY:')
    expect(personalization).not.toMatch(/suicide|motorcycle|grooming/i)
  })
})
